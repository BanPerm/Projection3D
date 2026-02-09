import { Triangle } from './geometry.js';
import {Vector3D} from './math.js';
import { engineState } from './state.js';

//Le but va d'être d'éviter de faire trop d'allocation à chaque frame, donc on va réutiliser des objets pour le clipping et le tri des triangles
let buffer1 = [];
let buffer2 = [];

const triangleSorter = (t1, t2) => {
    const z1 = t1.pos[0].z + t1.pos[1].z + t1.pos[2].z;
    const z2 = t2.pos[0].z + t2.pos[1].z + t2.pos[2].z;
    return z2 - z1;
};

export function sortTriangles(ctx, trianglesToRender, width, height) {
    engineState.triangleToShow.sort(triangleSorter);

    Triangle.resetPool();
    drawTriangles(ctx, trianglesToRender, width, height);
}


const clipPlanePoint = new Vector3D();
const clipPlaneNormal = new Vector3D();
let lastAppliedColor = null;

function drawTriangles(ctx, trianglesToRender, width, height) {
    for(let projected_triangle of engineState.triangleToShow) {
        let listTriangles = buffer1;
        listTriangles.length = 0;
        listTriangles.push(projected_triangle);

        // Clipping against four edges of the screen
        for (let p = 0; p < 4; p++) {
            let targetList = (listTriangles === buffer1) ? buffer2 : buffer1;
            targetList.length = 0;

            switch (p) {
                case 0: clipPlanePoint.set(0, 0, 0); clipPlaneNormal.set(0, 1, 0); break; // Top
                case 1: clipPlanePoint.set(0, height - 1, 0); clipPlaneNormal.set(0, -1, 0); break; // Bottom
                case 2: clipPlanePoint.set(0, 0, 0); clipPlaneNormal.set(1, 0, 0); break; // Left
                case 3: clipPlanePoint.set(width - 1, 0, 0); clipPlaneNormal.set(-1, 0, 0); break; // Right
            }

            for (let i = 0; i < listTriangles.length; i++) {
                const testTriangle = listTriangles[i];
                
                // On récupère des triangles du pool au lieu d'en créer
                const tri1 = Triangle.getFromPool();
                const tri2 = Triangle.getFromPool();

                const nTrisToAdd = Vector3D.clipAgainstPlane(
                    clipPlanePoint, clipPlaneNormal, testTriangle, tri1, tri2
                );

                for (let w = 0; w < nTrisToAdd; w++) {
                    const toAdd = (w === 0) ? tri1 : tri2;
                    targetList.push(toAdd);
                }
            }
            listTriangles = targetList;
        }

        // Draw each triangle
        lastAppliedColor = null;

        for (let t of listTriangles) {
            if (t.color !== lastAppliedColor) {
                ctx.fillStyle = t.color;
                lastAppliedColor = t.color;
            }

            ctx.beginPath();
            ctx.moveTo(t.pos[0].x, t.pos[0].y);
            ctx.lineTo(t.pos[1].x, t.pos[1].y);
            ctx.lineTo(t.pos[2].x, t.pos[2].y);
            ctx.closePath();

            ctx.fill();
        }
    }
}

function fillTriangle(ctx, triangle) {
    ctx.beginPath();
    ctx.moveTo(triangle.pos[0].x, triangle.pos[0].y);
    ctx.lineTo(triangle.pos[1].x, triangle.pos[1].y);
    ctx.lineTo(triangle.pos[2].x, triangle.pos[2].y);
    ctx.closePath();
    ctx.fillStyle = triangle.color;
    ctx.fill();
    ctx.strokeStyle = triangle.color;
    ctx.stroke();
}