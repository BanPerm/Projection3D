import { Matrice, Vector3D } from "./math.js";
import {rasterizeTriangle} from "./renderer.js";
import { CONFIG, engineState, PROJECTION } from "./state.js";
import { Triangle } from "./triangle.js";

// Matrices de travail
const matRotX = Matrice.create();
const matRotY = Matrice.create();
const matRotZ = Matrice.create();
const matTrans = Matrice.create();
const matWorld = Matrice.create();
const matTemp = Matrice.create();
const matProj = Matrice.create();
const matCamera = Matrice.create();
const matView = Matrice.create();

// Triangles de travail
const triTransformed = new Triangle();
const triViewed = new Triangle(); 
const clippedPool = [new Triangle(), new Triangle()];

// Vecteurs de travail
const vUp = new Vector3D(0, -1, 0);
const vTarget = new Vector3D(0, 0, 1);
const vLightDir = new Vector3D(0, 0, -1);
const vNormal = new Vector3D();
const vLine1 = new Vector3D();
const vLine2 = new Vector3D();
const vCameraRay = new Vector3D();
const vNearPlanePoint = new Vector3D(0, 0, 0.1);
const vNearPlaneNormal = new Vector3D(0, 0, 1);

export function projectAndStoreTriangle(triangles, angleX, angleY, angleZ) {

    // Pré-calculer les matrices de rotation
    Matrice.matriceMakeRotationX(angleX, matRotX);
    Matrice.matriceMakeRotationY(angleY, matRotY);
    Matrice.matriceMakeRotationZ(angleZ, matRotZ);
    Matrice.matriceMakeTranslation(0, 0, 10, matTrans);
    Matrice.matriceMakeProjection(PROJECTION.fovRad, PROJECTION.aspectRatio, CONFIG.znear, CONFIG.zfar, matProj);


    Matrice.matriceMultiplyMatrix(matRotX, matRotY, matTemp);
    Matrice.matriceMultiplyMatrix(matTemp, matRotZ, matWorld);
    Matrice.matriceMultiplyMatrix(matWorld, matTrans, matWorld);
    
    // Caméra
    vUp.set(0, -1, 0);
    vTarget.set(0, 0, 1);
    updateLookDirection();
    Vector3D.add(engineState.camera, engineState.lookDirection, vTarget);

    Matrice.matriceAtPoint(engineState.camera, vTarget, vUp, matCamera);
    Matrice.matriceQuickInverse(matCamera, matView);

    for (let i = 0; i < triangles.length; i++) {
        const tri = triangles[i];

        // Transformation World
        Matrice.matriceMultiplyVector(matWorld, tri.pos[0], triTransformed.pos[0]);
        Matrice.matriceMultiplyVector(matWorld, tri.pos[1], triTransformed.pos[1]);
        Matrice.matriceMultiplyVector(matWorld, tri.pos[2], triTransformed.pos[2]);

        // Calcul de la normale pour le Culling
        Vector3D.sub(triTransformed.pos[1], triTransformed.pos[0], vLine1);
        Vector3D.sub(triTransformed.pos[2], triTransformed.pos[0], vLine2);
        Vector3D.crossProduct(vLine1, vLine2, vNormal);
        vNormal.normalise();

        Vector3D.sub(triTransformed.pos[0], engineState.camera, vCameraRay);

        // Product Dot pour vérifier si le triangle est bien visible
        if (Vector3D.dotProduct(vNormal, vCameraRay) < 0) {

            // Illumination
            vLightDir.set(0, 0, -1);
            vLightDir.normalise();
            const dp = Math.max(0.1, Vector3D.dotProduct(vLightDir, vNormal));

            // Transformation View (Caméra)
            Matrice.matriceMultiplyVector(matView, triTransformed.pos[0], triViewed.pos[0]);
            Matrice.matriceMultiplyVector(matView, triTransformed.pos[1], triViewed.pos[1]);
            Matrice.matriceMultiplyVector(matView, triTransformed.pos[2], triViewed.pos[2]);
            triViewed.color = (tri.color === 'white') ? getColour(dp) : tri.color;


            // Clipping contre le plan Z-Near
            const nClippedTriangles = Vector3D.clipAgainstPlane(
                vNearPlanePoint, 
                vNearPlaneNormal, 
                triViewed, 
                clippedPool[0], 
                clippedPool[1]
            );

            for (let n = 0; n < nClippedTriangles; n++){
                const clippedTri = clippedPool[n];

                let projectedTri = new Triangle(new Vector3D(), new Vector3D(), new Vector3D());
                projectedTri.color = clippedTri.color;

                // Projection
                Matrice.matriceMultiplyVector(matProj, clippedTri.pos[0], projectedTri.pos[0]);
                Matrice.matriceMultiplyVector(matProj, clippedTri.pos[1], projectedTri.pos[1]);
                Matrice.matriceMultiplyVector(matProj, clippedTri.pos[2], projectedTri.pos[2]);

                // Division perspective et Scale
                for (let p = 0; p < 3; p++) {
                    const v = projectedTri.pos[p];

                    if (Math.abs(v.w) > 0.0001) {
                        v.divide(v.w);
                    }
                    
                    // Scale into view
                    v.x = (v.x + 1.0) * 0.5 * PROJECTION.width;
                    v.y = (v.y + 1.0) * 0.5 * PROJECTION.height;
                }

                const p0 = projectedTri.pos[0];
                const p1 = projectedTri.pos[1];
                const p2 = projectedTri.pos[2];

                rasterizeTriangle(
                    p0.x, p0.y, p0.z, 
                    p1.x, p1.y, p1.z, 
                    p2.x, p2.y, p2.z,
                    clippedTri.color,
                    dp
                );
            }
        }
    }
}


function getColour(lum) {
    let grey = Math.floor(255 * lum);
    return `rgb(${grey}, ${grey}, ${grey})`;
}

function updateLookDirection() {
    engineState.lookDirection.x = Math.cos(engineState.pitch) * Math.cos(engineState.yaw);
    engineState.lookDirection.y = Math.sin(engineState.pitch);
    engineState.lookDirection.z = Math.cos(engineState.pitch) * Math.sin(engineState.yaw);
    engineState.lookDirection.normalise();
}