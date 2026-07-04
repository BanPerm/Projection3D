import { Vector3D } from "./math.js";
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

const bufA = makeVertexBuffer(MAX_CLIP_VERTICES);
const bufB = makeVertexBuffer(MAX_CLIP_VERTICES);

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
 * Clippe le polygone `inBuf[0..inLen)` contre un plan, écrit le résultat
 * dans `outBuf` (préalloué), retourne la nouvelle longueur.
 * Aucune allocation : on mute les Vector3D déjà présents dans outBuf.
 */
function clipPolygonAgainstPlane(inBuf, inLen, planeP, planeN, outBuf) {
    let outLen = 0;

    for (let i = 0; i < inLen; i++) {
        const curr = inBuf[i];
        const next = inBuf[(i + 1) % inLen];

        const dCurr = planeN.x * (curr.x - planeP.x) + planeN.y * (curr.y - planeP.y) + planeN.z * (curr.z - planeP.z);
        const dNext = planeN.x * (next.x - planeP.x) + planeN.y * (next.y - planeP.y) + planeN.z * (next.z - planeP.z);

        const currInside = dCurr >= 0;
        const nextInside = dNext >= 0;

        if (currInside) {
            if (outLen >= outBuf.length) { console.warn('clipPolygonAgainstPlane: buffer plein, sommet ignoré'); }
            else outBuf[outLen++].copy(curr);
        }

        if (currInside !== nextInside) {
            if (outLen >= outBuf.length) { console.warn('clipPolygonAgainstPlane: buffer plein, intersection ignorée'); }
            else Vector3D.intersectPlane(planeP, planeN, curr, next, outBuf[outLen++]);
        }
    }

    return outLen;
}

/**
 * Clippe un triangle (3 Vector3D) contre les 6 plans du frustum.
 * Retourne { buf, len } : buf est l'un des deux buffers internes (bufA/bufB),
 * valide UNIQUEMENT jusqu'au prochain appel (comme les autres scratch du moteur).
 * len === 0 signifie "entièrement en dehors, rien à dessiner".
 */
export function clipTriangleAgainstFrustum(p0, p1, p2) {
    bufA[0].copy(p0);
    bufA[1].copy(p1);
    bufA[2].copy(p2);

    let curBuf = bufA, curLen = 3;
    let nextBuf = bufB;

    for (let i = 0; i < planes.length; i++) {
        const plane = planes[i];
        const newLen = clipPolygonAgainstPlane(curBuf, curLen, plane.p, plane.n, nextBuf);
        if (newLen === 0) return { buf: curBuf, len: 0 };

        const tmp = curBuf;
        curBuf = nextBuf;
        nextBuf = tmp;
        curLen = newLen;
    }

    return { buf: curBuf, len: curLen };
}
