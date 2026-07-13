import { Vector3D } from "./math.js";
import { UV } from "./triangle.js";
import { CONFIG, PROJECTION } from "./state.js";

// Un triangle (3 sommets) clippé contre N plans convexes produit au plus
// 3 + N sommets (Sutherland-Hodgman : +1 sommet possible par plan, jamais plus).
// Avec 6 plans : 9 sommets maximum, garanti mathématiquement. On préalloue donc
// deux buffers de taille fixe, jamais redimensionnés, jamais réalloués.
const NUM_PLANES = 6;
const MAX_CLIP_VERTICES = 3 + NUM_PLANES; // = 9

function makeVertexBuffer(size) {
    const buf = new Array(size);
    for (let i = 0; i < size; i++) buf[i] = new Vector3D();
    return buf;
}

function makeUVBuffer(size) {
    const buf = new Array(size);
    for (let i = 0; i < size; i++) buf[i] = new UV();
    return buf;
}

const posBufA = makeVertexBuffer(MAX_CLIP_VERTICES);
const posBufB = makeVertexBuffer(MAX_CLIP_VERTICES);
const uvBufA = makeUVBuffer(MAX_CLIP_VERTICES);
const uvBufB = makeUVBuffer(MAX_CLIP_VERTICES);
// Intensité lumineuse par sommet (Gouraud)
const lumBufA = new Float64Array(MAX_CLIP_VERTICES);
const lumBufB = new Float64Array(MAX_CLIP_VERTICES);

// Réutilisé à chaque intersection pour récupérer le paramètre t sans allouer
const tHolder = { t: 0 };

// Les 6 plans, en espace VUE (caméra à l'origine, regard vers +Z).
// Recalculés seulement quand fovRad/aspectRatio changent (resize), pas par frame.
const planes = [
    { p: new Vector3D(0, 0, 0), n: new Vector3D(0, 0, 1) },  // near
    { p: new Vector3D(0, 0, 0), n: new Vector3D(0, 0, -1) }, // far
    { p: new Vector3D(0, 0, 0), n: new Vector3D(0, 0, 0) },  // right
    { p: new Vector3D(0, 0, 0), n: new Vector3D(0, 0, 0) },  // left
    { p: new Vector3D(0, 0, 0), n: new Vector3D(0, 0, 0) },  // top
    { p: new Vector3D(0, 0, 0), n: new Vector3D(0, 0, 0) },  // bottom
];

let cachedFovRad = null;
let cachedAspectRatio = null;

/**
 * Recalcule les 6 plans si le FOV ou l'aspect ratio a changé depuis la
 * dernière frame (resize de fenêtre). Sinon ne fait rien (juste 2 comparaisons).
 */
export function updateFrustumPlanes() {
    const { fovRad, aspectRatio } = PROJECTION;
    if (fovRad === cachedFovRad && aspectRatio === cachedAspectRatio) return;

    cachedFovRad = fovRad;
    cachedAspectRatio = aspectRatio;

    const halfV = Math.atan(1 / fovRad);
    const halfH = Math.atan(1 / (fovRad * aspectRatio));
    const cosV = Math.cos(halfV), sinV = Math.sin(halfV);
    const cosH = Math.cos(halfH), sinH = Math.sin(halfH);

    planes[0].p.set(0, 0, CONFIG.znear); planes[0].n.set(0, 0, 1);
    planes[1].p.set(0, 0, CONFIG.zfar);  planes[1].n.set(0, 0, -1);
    planes[2].p.set(0, 0, 0);            planes[2].n.set(-cosH, 0, sinH); // right
    planes[3].p.set(0, 0, 0);            planes[3].n.set(cosH, 0, sinH);  // left
    planes[4].p.set(0, 0, 0);            planes[4].n.set(0, -cosV, sinV); // top
    planes[5].p.set(0, 0, 0);            planes[5].n.set(0, cosV, sinV);  // bottom
}

/**
 * Clippe le polygone `posIn[0..inLen)` (+ ses UV en parallèle dans `uvIn`)
 * contre un plan. Écrit le résultat dans `posOut`/`uvOut` (préalloués).
 * L'UV d'un point d'intersection est interpolée avec le MÊME t que la
 * position (linéaire en espace vue : correct ici, la perspective sera
 * gérée séparément au moment de la rasterisation).
 */
function clipPolygonAgainstPlane(posIn, uvIn, lumIn, inLen, planeP, planeN, posOut, uvOut, lumOut) {
    let outLen = 0;
    let anyOutside = false;

    for (let i = 0; i < inLen; i++) {
        const currPos = posIn[i], currUV = uvIn[i], currLum = lumIn[i];
        const nextIdx = (i + 1) % inLen;
        const nextPos = posIn[nextIdx], nextUV = uvIn[nextIdx], nextLum = lumIn[nextIdx];

        const dCurr = planeN.x * (currPos.x - planeP.x) + planeN.y * (currPos.y - planeP.y) + planeN.z * (currPos.z - planeP.z);
        const dNext = planeN.x * (nextPos.x - planeP.x) + planeN.y * (nextPos.y - planeP.y) + planeN.z * (nextPos.z - planeP.z);

        const currInside = dCurr >= 0;
        const nextInside = dNext >= 0;

        if (!currInside) anyOutside = true;

        if (currInside) {
            if (outLen >= posOut.length) { console.warn('clipPolygonAgainstPlane: buffer plein, sommet ignoré'); }
            else {
                posOut[outLen].copy(currPos);
                uvOut[outLen].copy(currUV);
                lumOut[outLen] = currLum;
                outLen++;
            }
        }

        if (currInside !== nextInside) {
            if (outLen >= posOut.length) { console.warn('clipPolygonAgainstPlane: buffer plein, intersection ignorée'); }
            else {
                Vector3D.intersectPlane(planeP, planeN, currPos, nextPos, posOut[outLen], tHolder);
                const t = tHolder.t;
                uvOut[outLen].set(
                    currUV.u + (nextUV.u - currUV.u) * t,
                    currUV.v + (nextUV.v - currUV.v) * t
                );
                lumOut[outLen] = currLum + (nextLum - currLum) * t;
                outLen++;
            }
        }
    }

    return { len: outLen, changed: anyOutside };
}

/**
 * Clippe un triangle (3 positions + 3 UV) contre les 6 plans du frustum.
 * Retourne { posBuf, uvBuf, len, wasClipped }. Les buffers sont internes
 * (posBufA/B, uvBufA/B), valides UNIQUEMENT jusqu'au prochain appel.
 * len === 0 signifie "entièrement en dehors, rien à dessiner".
 */
export function clipTriangleAgainstFrustum(p0, p1, p2, uv0, uv1, uv2, lum0, lum1, lum2) {
    posBufA[0].copy(p0); uvBufA[0].copy(uv0); lumBufA[0] = lum0;
    posBufA[1].copy(p1); uvBufA[1].copy(uv1); lumBufA[1] = lum1;
    posBufA[2].copy(p2); uvBufA[2].copy(uv2); lumBufA[2] = lum2;

    let curPos = posBufA, curUV = uvBufA, curLum = lumBufA, curLen = 3;
    let nextPos = posBufB, nextUV = uvBufB, nextLum = lumBufB;
    let wasClipped = false;

    for (let i = 0; i < planes.length; i++) {
        const plane = planes[i];
        const { len: newLen, changed } = clipPolygonAgainstPlane(curPos, curUV, curLum, curLen, plane.p, plane.n, nextPos, nextUV, nextLum);
        if (changed) wasClipped = true;
        if (newLen === 0) return { posBuf: curPos, uvBuf: curUV, lumBuf: curLum, len: 0, wasClipped: true };

        let tmp = curPos; curPos = nextPos; nextPos = tmp;
        tmp = curUV; curUV = nextUV; nextUV = tmp;
        tmp = curLum; curLum = nextLum; nextLum = tmp;
        curLen = newLen;
    }

    return { posBuf: curPos, uvBuf: curUV, lumBuf: curLum, len: curLen, wasClipped };
}
