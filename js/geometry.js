import { Matrice, Vector3D } from "./math.js";
import { rasterizeTriangle, rasterizeTriangleTextured } from "./renderer.js";
import { CONFIG, engineState, PROJECTION } from "./state.js";
import { Triangle } from "./triangle.js";
import { clipTriangleAgainstFrustum, updateFrustumPlanes } from "./clipping.js";

// --- Matrices partagées, communes à toutes les entités d'une frame ---
const matCamera = Matrice.create();
const matView = Matrice.create();
const matProj = Matrice.create();

// --- Triangles de travail (scratch, partagés : le rendu est séquentiel) ---
const triViewed = new Triangle();

// --- Vecteurs de travail ---
const vUp = new Vector3D(0, -1, 0);
const vTarget = new Vector3D(0, 0, 1);

// Direction de lumière exprimée dans le MONDE, w=0 => c'est une direction,
// pas un point : la translation de matView ne doit pas l'affecter.
const vLightDirWorld = new Vector3D(100, -10, 100, 0);
const vLightDirView = new Vector3D(0, 0, 0, 0);

const vNormal = new Vector3D();
const vLine1 = new Vector3D();
const vLine2 = new Vector3D();
const invWScratch = [0, 0, 0]; // réutilisé à chaque sous-triangle, pas de new Array par frame
const lumScratch = [0, 0, 0];
// Normales de sommet transformées en espace vue (Gouraud) + intensité résultante
const vNormalView = [new Vector3D(), new Vector3D(), new Vector3D()];

/**
 * À appeler UNE FOIS PAR FRAME (pas par entité).
 * Calcule matView/matProj (dépendent seulement de la caméra) et
 * pré-transforme la direction de lumière en espace vue.
 */
export function updateCameraMatrices() {
    updateLookDirection();

    vUp.set(0, -1, 0);
    vTarget.set(0, 0, 1);
    Vector3D.add(engineState.camera, engineState.lookDirection, vTarget);

    Matrice.matriceAtPoint(engineState.camera, vTarget, vUp, matCamera);
    Matrice.matriceQuickInverse(matCamera, matView);

    Matrice.matriceMakeProjection(
        PROJECTION.fovRad, PROJECTION.aspectRatio, CONFIG.znear, CONFIG.zfar, matProj
    );

    // Pas de recalcul si fovRad/aspectRatio n'ont pas changé depuis la dernière frame
    updateFrustumPlanes();

    // Direction de lumière : on ignore la translation grâce à w=0
    vLightDirWorld.set(100, -10, 100, 0);
    vLightDirWorld.normalise();
    Matrice.matriceMultiplyVector(matView, vLightDirWorld, vLightDirView);

    return { matView, matProj };
}

/**
 * À appeler une fois par entité et par frame : combine sa matrice modèle
 * (reconstruite seulement si "dirty") avec la vue caméra courante.
 * Une seule multiplication 4x4 par entité, indépendamment du nombre
 * de triangles qu'elle contient.
 */
export function computeEntityModelView(entity) {
    entity.transform.updateModelMatrix(entity.matModel);
    // multiplyMatrix(A, B) applique B PUIS A : on veut model d'abord, view ensuite
    // => multiplyMatrix(matView, entity.matModel, ...)
    Matrice.matriceMultiplyMatrix(matView, entity.matModel, entity.matModelView);
    return entity.matModelView;
}

/**
 * @param {Triangle[]} triangles
 * @param {Float32Array} matModelView
 * @param {Texture|null} texture - si fourni, les triangles sont texturés
 *        (perspective-correcte) au lieu d'être rendus en couleur plate.
 */
export function projectAndStoreTriangle(triangles, matModelView, texture = null) {
    Triangle.resetPool();

    for (let i = 0; i < triangles.length; i++) {
        const tri = triangles[i];

        // Une seule transformation : directement Local -> Vue
        Matrice.matriceMultiplyVector(matModelView, tri.pos[0], triViewed.pos[0]);
        Matrice.matriceMultiplyVector(matModelView, tri.pos[1], triViewed.pos[1]);
        Matrice.matriceMultiplyVector(matModelView, tri.pos[2], triViewed.pos[2]);
        // Les UV ne dépendent pas de la transformation 3D : simple copie.
        triViewed.uv[0].copy(tri.uv[0]);
        triViewed.uv[1].copy(tri.uv[1]);
        triViewed.uv[2].copy(tri.uv[2]);

        // Normale de FACE (espace vue) : sert uniquement au test de face avant/arrière,
        // le shading utilise les normales par SOMMET ci-dessous (Gouraud).
        Vector3D.sub(triViewed.pos[1], triViewed.pos[0], vLine1);
        Vector3D.sub(triViewed.pos[2], triViewed.pos[0], vLine2);
        Vector3D.crossProduct(vLine1, vLine2, vNormal);
        vNormal.normalise();

        // La caméra est TOUJOURS à l'origine en espace vue :
        // le rayon caméra->point est donc simplement triViewed.pos[0].
        if (Vector3D.dotProduct(vNormal, triViewed.pos[0]) < 0) {

            // Normales de sommet : on ignore la translation (w=0, même astuce que
            // pour vLightDirView) puisqu'une normale est une DIRECTION, pas un point.
            // Valide tant que l'échelle reste uniforme (voir Transform.scale) : une
            // échelle non-uniforme demanderait la matrice normale (inverse-transposée).
            for (let p = 0; p < 3; p++) {
                tri.normal[p].w = 0;
                Matrice.matriceMultiplyVector(matModelView, tri.normal[p], vNormalView[p]);
                vNormalView[p].normalise();
                lumScratch[p] = Math.max(0.2, Vector3D.dotProduct(vLightDirView, vNormalView[p]));
            }

            // Couleur de BASE (non éclairée) : l'éclairage est maintenant appliqué
            // par pixel via l'intensité interpolée (Gouraud), plus par un lum
            // unique figé sur toute la face.
            const faceColor = tri.color;

            // Clipping complet contre les 6 plans du frustum (position + UV + intensité en parallèle).
            const { posBuf: clippedPos, uvBuf: clippedUV, lumBuf: clippedLum, len: clippedLen } = clipTriangleAgainstFrustum(
                triViewed.pos[0], triViewed.pos[1], triViewed.pos[2],
                triViewed.uv[0], triViewed.uv[1], triViewed.uv[2],
                lumScratch[0], lumScratch[1], lumScratch[2]
            );

            if (clippedLen < 3) continue; // entièrement hors du frustum

            // Triangulation en éventail du polygone (couleur/texture identiques pour tous les sous-triangles)
            for (let n = 1; n < clippedLen - 1; n++) {
                let projectedTri = Triangle.getFromPool();
                projectedTri.color = faceColor;

                Matrice.matriceMultiplyVector(matProj, clippedPos[0], projectedTri.pos[0]);
                Matrice.matriceMultiplyVector(matProj, clippedPos[n], projectedTri.pos[1]);
                Matrice.matriceMultiplyVector(matProj, clippedPos[n + 1], projectedTri.pos[2]);
                projectedTri.uv[0].copy(clippedUV[0]);
                projectedTri.uv[1].copy(clippedUV[n]);
                projectedTri.uv[2].copy(clippedUV[n + 1]);

                // invW : l'inverse du w AVANT division perspective, nécessaire à
                // l'interpolation perspective-correcte des UV. v.divide(v.w) ne
                // touche que x,y,z (voir math.js) : v.w reste donc le w original.
                const invW = invWScratch;
                for (let p = 0; p < 3; p++) {
                    const v = projectedTri.pos[p];
                    invW[p] = Math.abs(v.w) > 0.0001 ? 1 / v.w : 0;
                    if (invW[p] !== 0) v.divide(v.w);
                    v.x = (v.x + 1.0) * 0.5 * PROJECTION.width;
                    v.y = (v.y + 1.0) * 0.5 * PROJECTION.height;
                }

                const p0 = projectedTri.pos[0];
                const p1 = projectedTri.pos[1];
                const p2 = projectedTri.pos[2];
                const lumA = clippedLum[0], lumB = clippedLum[n], lumC = clippedLum[n + 1];

                if (texture && texture.isLoaded) {
                    rasterizeTriangleTextured(
                        p0.x, p0.y, p0.z, invW[0], projectedTri.uv[0].u, projectedTri.uv[0].v, lumA,
                        p1.x, p1.y, p1.z, invW[1], projectedTri.uv[1].u, projectedTri.uv[1].v, lumB,
                        p2.x, p2.y, p2.z, invW[2], projectedTri.uv[2].u, projectedTri.uv[2].v, lumC,
                        texture
                    );
                } else {
                    rasterizeTriangle(
                        p0.x, p0.y, p0.z, invW[0], lumA,
                        p1.x, p1.y, p1.z, invW[1], lumB,
                        p2.x, p2.y, p2.z, invW[2], lumC,
                        faceColor
                    );
                }
            }
        }
    }
}

function updateLookDirection() {
    engineState.lookDirection.x = Math.cos(engineState.pitch) * Math.cos(engineState.yaw);
    engineState.lookDirection.y = Math.sin(engineState.pitch);
    engineState.lookDirection.z = Math.cos(engineState.pitch) * Math.sin(engineState.yaw);
    engineState.lookDirection.normalise();
}

// Variable temporaire pour éviter l'allocation mémoire
const vSphereCenterView = new Vector3D();

/**
 * Test de visibilité par sphère englobante, désormais avec UNE SEULE
 * matrice combinée (model-view) au lieu de deux transformations séparées.
 */
export function isSphereVisible(centerLocal, radius, matModelView) {
    Matrice.matriceMultiplyVector(matModelView, centerLocal, vSphereCenterView);

    const z = vSphereCenterView.z;
    const x = vSphereCenterView.x;
    const y = vSphereCenterView.y;

    if (z + radius < CONFIG.znear) return false;
    if (z - radius > CONFIG.zfar) return false;

    const halfHeightAtZ = Math.abs(z) / PROJECTION.fovRad;
    const halfWidthAtZ = halfHeightAtZ / PROJECTION.aspectRatio;

    const limitX = halfWidthAtZ + radius;
    const limitY = halfHeightAtZ + radius;

    if (Math.abs(x) > limitX) return false;
    if (Math.abs(y) > limitY) return false;

    return true;
}
