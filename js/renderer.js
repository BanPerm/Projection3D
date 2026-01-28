import { Triangle } from './geometry.js';
import {Vector3D} from './math.js';
import { engineState } from './state.js';

export function sortTriangles(ctx, trianglesToRender, width, height) {
    engineState.triangleToShow.sort((t1, t2) => {
        const z1 = (t1.pos[0].z + t1.pos[1].z + t1.pos[2].z) / 3.0;
        const z2 = (t2.pos[0].z + t2.pos[1].z + t2.pos[2].z) / 3.0;
        return z2 - z1;
    });
    drawTriangles(ctx, trianglesToRender, width, height);
}


function drawTriangles(ctx, trianglesToRender, width, height) {
    for(let projected_triangle of engineState.triangleToShow) {
        let listTriangles = [];
        listTriangles.push(projected_triangle);

        let nNewTriangles = 1;

        // Clipping against four edges of the screen
        for (let p = 0; p < 4; p++) {
            let nTrisToAdd = 0;
            let newListTriangles = [];

            while (nNewTriangles > 0) {
                let test = listTriangles.shift();
                nNewTriangles--;

                let clipped = [new Triangle(), new Triangle()];
                switch (p) {
                    case 0: // Top
                        nTrisToAdd = Vector3D.clipAgainstPlane(new Vector3D(0, 0, 0), new Vector3D(0, 1, 0), test, clipped[0], clipped[1]);
                        break;
                    case 1: // Bottom
                        nTrisToAdd = Vector3D.clipAgainstPlane(new Vector3D(0, (height-50)-1, 0), new Vector3D(0, -1, 0), test, clipped[0], clipped[1]);
                        break;
                    case 2: // Left
                        nTrisToAdd = Vector3D.clipAgainstPlane(new Vector3D(0, 0, 0), new Vector3D(1, 0, 0), test, clipped[0], clipped[1]);
                        break;
                    case 3: // Right
                        nTrisToAdd = Vector3D.clipAgainstPlane(new Vector3D((width-50)-1, 0, 0), new Vector3D(-1, 0, 0), test, clipped[0], clipped[1]);
                        break;
                }

                for (let w = 0; w < nTrisToAdd; w++) {
                    if(clipped[w].color==='white'){
                        clipped[w].color = projected_triangle.color;
                    }
                    newListTriangles.push(clipped[w]);
                }
            }

            listTriangles = newListTriangles;
            nNewTriangles = listTriangles.length;
        }

        // Draw each triangle
        for (let t of listTriangles) {
            fillTriangle(ctx, t);
        }
    }
}

// Exemple de fonction pour remplir un triangle
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