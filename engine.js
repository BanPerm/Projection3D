//!!!!!!!! Commande à lancer avant de lancer le site !!!!!!!!!!\\
// python -m http.server 8000
import {Vector3D} from './math.js';
import {Triangle} from './triangle.js';
import {Matrice} from './math.js';
import {Ray} from './geometry.js';
import * as Renderer from './renderer.js';


const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// Initialisation de la fenêtre
const width = window.innerWidth;
const height = window.innerHeight;
canvas.width = width - 50;
canvas.height = height - 50;

// Variable pour la projection
const zfar = 1000;
const znear = 1;
const fov = 90;
const aspectRatio = height / width;
const fovRad = 1 / Math.tan((fov * 0.5) / 180 * Math.PI);

//Variable globale
let triangleToShow = [];

//Paramètre (pour éco des ressources)
let ombrage = false;
let clipping = false;



// Matrice de rotation
function rotation_x(angle) {
    return [
        [1, 0, 0, 0],
        [0, Math.cos(angle), -Math.sin(angle), 0],
        [0, Math.sin(angle), Math.cos(angle), 0],
        [0, 0, 0, 1]
    ];
}

function rotation_y(angle){
    return [
        [Math.cos(angle), 0, Math.sin(angle), 0],
        [0, 1, 0, 0],
        [-Math.sin(angle), 0, Math.cos(angle), 0],
        [0, 0, 0, 1]
    ];
}

function rotation_z(angle) {
    return [
        [Math.cos(angle), -Math.sin(angle), 0, 0],
        [Math.sin(angle), Math.cos(angle), 0, 0],
        [0, 0, 1, 0],
        [0, 0, 0, 1]
    ];
}

function getColour(lum) {
    let grey = Math.floor(255 * lum);
    return `rgb(${grey}, ${grey}, ${grey})`;
}

function multiplication(matrice, vector) {
    let x = vector.x * matrice[0][0] + vector.y * matrice[1][0] + vector.z * matrice[2][0] + matrice[3][0];
    let y = vector.x * matrice[0][1] + vector.y * matrice[1][1] + vector.z * matrice[2][1] + matrice[3][1];
    let z = vector.x * matrice[0][2] + vector.y * matrice[1][2] + vector.z * matrice[2][2] + matrice[3][2];
    let w = vector.x * matrice[0][3] + vector.y * matrice[1][3] + vector.z * matrice[2][3] + matrice[3][3];

    if (w !== 0.0) {
        x /= w;
        y /= w;
        z /= w;
    }

    return new Vector3D(x, y, z);
}

function projectAndStoreTriangle(triangles, angleX, angleY, angleZ) {

    // Pré-calculer les matrices de rotation
    const rotationMatrixX = rotation_x(angleX);
    const rotationMatrixY = rotation_y(angleY);
    const rotationMatrixZ = rotation_z(angleZ);
    const projectionMatrix = Matrice.matriceMakeProjection(fovRad, aspectRatio, znear, zfar);


    const matTrans = Matrice.matriceMakeTranslation(0,0,10);

    let matWorld;
    matWorld = Matrice.matriceMultiplyMatrix(rotationMatrixZ, rotationMatrixX);
    matWorld = Matrice.matriceMultiplyMatrix(matWorld, matTrans);

    let up = new Vector3D(0,-1,0);
    let target = new Vector3D(0,0,1);
    let cameraRot = rotation_y(yaw);
    updateLookDirection();
    target = Vector3D.addVector3D(camera, lookDirection);

    let matCamera = Matrice.matriceAtPoint(camera,target,up);
    let matView = Matrice.matriceQuickInverse(matCamera);

    for (let triangle of triangles) {
        // Rotation
        triangle.pos[0] = Matrice.matriceMultiplyVector(matWorld, triangle.pos[0]);
        triangle.pos[1] = Matrice.matriceMultiplyVector(matWorld, triangle.pos[1]);
        triangle.pos[2] = Matrice.matriceMultiplyVector(matWorld, triangle.pos[2]);

        let line1 = Vector3D.substractVector(triangle.pos[1], triangle.pos[0]);
        let line2 = Vector3D.substractVector(triangle.pos[2], triangle.pos[0]);

        let normal = Vector3D.crossProduct(line1,line2);

        normal.normalise()

        let vCameraRay = Vector3D.substractVector(triangle.pos[0], camera);

        // Product Dot pour vérifier si le triangle est bien visible
        if (Vector3D.dotProductVector(normal, vCameraRay) < 0) {

            // Ajout d'un système de light
            let light_direction = new Vector3D(0, 0, -1);
            light_direction.normalise();

            let ambientLight = 0.2;

            let dp = Math.max(0.1,Vector3D.dotProductVector(light_direction, normal));

            triangle.pos[0] = Matrice.matriceMultiplyVector(matView, triangle.pos[0]);
            triangle.pos[1] = Matrice.matriceMultiplyVector(matView, triangle.pos[1]);
            triangle.pos[2] = Matrice.matriceMultiplyVector(matView, triangle.pos[2]);

            let clippedTriangles = 0;
            let clipped = [new Triangle(), new Triangle()];
            clippedTriangles = Vector3D.clipAgainstPlane(new Vector3D(0,0,0.1), new Vector3D(0,0,1), triangle, clipped[0], clipped[1]);

            for (let n = 0; n < clippedTriangles; n++)
            {
                // Projection 3D -> 2D
                let projected_triangle = new Triangle(
                    Matrice.matriceMultiplyVector(projectionMatrix, clipped[n].pos[0]),
                    Matrice.matriceMultiplyVector(projectionMatrix, clipped[n].pos[1]),
                    Matrice.matriceMultiplyVector(projectionMatrix, clipped[n].pos[2])
                );

                projected_triangle.pos[0] = Vector3D.divideVector(projected_triangle.pos[0], projected_triangle.pos[0].w);
                projected_triangle.pos[1] = Vector3D.divideVector(projected_triangle.pos[1], projected_triangle.pos[1].w);
                projected_triangle.pos[2] = Vector3D.divideVector(projected_triangle.pos[2], projected_triangle.pos[2].w);

                if(ombrage){
                    const samplePoints = [
                        projected_triangle.pos[0],
                        projected_triangle.pos[1],
                        projected_triangle.pos[2]
                    ];
                    let shadowCount = 0;

                    for (let point of samplePoints) {
                        const rayOrigin = Vector3D.addVector3D(point, Vector3D.multiplyVector(light_direction, 0.1));
                        const rayDirection = Vector3D.multiplyVector(light_direction, 1);

                        const shadowRay = new Ray(rayOrigin, rayDirection);

                        let inShadow = false;
                        for (let otherTriangle of triangles) {
                            if (otherTriangle === triangle) continue;

                            if (shadowRay.intersectTriangle(otherTriangle)) {
                                inShadow = true;
                                break;
                            }
                        }

                        if (inShadow) {
                            shadowCount++;
                        }
                    }

                    const totalSamples = samplePoints.length;
                    const shadowIntensity = (totalSamples - shadowCount) / totalSamples;
                    let finalIntensity = ambientLight + (1 - ambientLight) * dp * shadowIntensity;
                    let grey = Math.floor(255 * finalIntensity);
                    projected_triangle.color = `rgb(${grey}, ${grey}, ${grey})`;
                }
                else{
                    if(clipped[n].color!=='white'){
                        projected_triangle.color = clipped[n].color;
                    }
                    else{
                        projected_triangle.color = getColour(dp);
                    }
                }


                let offset = new Vector3D(0, 0, 0);

                projected_triangle.pos[0] = Vector3D.addVector3D(projected_triangle.pos[0], offset);
                projected_triangle.pos[1] = Vector3D.addVector3D(projected_triangle.pos[1], offset);
                projected_triangle.pos[2] = Vector3D.addVector3D(projected_triangle.pos[2], offset);

                // Scale into view
                projected_triangle.pos[0].x += 1.0;
                projected_triangle.pos[0].y += 1.0;
                projected_triangle.pos[1].x += 1.0;
                projected_triangle.pos[1].y += 1.0;
                projected_triangle.pos[2].x += 1.0;
                projected_triangle.pos[2].y += 1.0;

                projected_triangle.pos[0].x *= 0.5 * width;
                projected_triangle.pos[0].y *= 0.5 * height;
                projected_triangle.pos[1].x *= 0.5 * width;
                projected_triangle.pos[1].y *= 0.5 * height;
                projected_triangle.pos[2].x *= 0.5 * width;
                projected_triangle.pos[2].y *= 0.5 * height;

                triangleToShow.push(projected_triangle);
            }
        }
    }
}



// function drawTriangles() {
//     for(let projected_triangle of triangleToShow) {
//         ctx.beginPath();
//         ctx.moveTo(projected_triangle.pos[0].x, projected_triangle.pos[0].y);
//         ctx.lineTo(projected_triangle.pos[1].x, projected_triangle.pos[1].y);
//         ctx.lineTo(projected_triangle.pos[2].x, projected_triangle.pos[2].y);
//         ctx.closePath();
//
//         ctx.fillStyle = projected_triangle.color;
//         ctx.strokeStyle = projected_triangle.color;
//         ctx.fill();
//         ctx.stroke();
//     }
// }


var camera = new Vector3D();
var lookDirection = new Vector3D();
var yaw=0;
var pitch = 0;

// FPS variables
let frameCount = 0;
let lastTime = performance.now();
let lastTimeFPS = performance.now();
let fps = 0;

let normalSpeed = 16;
let boostedSpeed = 64;
let speed = normalSpeed;
let keys = {};

let sensitivity = 0.01;
let isPointerLocked = false;

function handleMouseMove(event) {
    if (isPointerLocked) {
        const deltaX = event.movementX || event.mozMovementX || 0;
        const deltaY = event.movementY || event.mozMovementY || 0;

        yaw += deltaX * sensitivity;
        pitch -= deltaY * sensitivity;

        const maxPitch = Math.PI / 2;
        const minPitch = -Math.PI / 2;

        pitch = Math.max(minPitch, Math.min(maxPitch, pitch));
    }
}

canvas.addEventListener('click', () => {
    canvas.requestPointerLock = canvas.requestPointerLock || canvas.mozRequestPointerLock;
    canvas.requestPointerLock();
});

// Écouter les événements de changement d'état du verrouillage du curseur
document.addEventListener('pointerlockchange', () => {
    isPointerLocked = (document.pointerLockElement === canvas || document.mozPointerLockElement === canvas);
});

// Écouter les mouvements de la souris lorsque le curseur est verrouillé
document.addEventListener('mousemove', handleMouseMove);

window.addEventListener('keydown', function(e) {
    keys[e.key.toLowerCase()] = true;
    e.preventDefault();
});

window.addEventListener('keyup', function(e) {
    keys[e.key.toLowerCase()] = false;
    e.preventDefault();
});

function updateCamera(fElapsedTime) {
    if (keys['shift']) {
        speed = boostedSpeed;
    } else {
        speed = normalSpeed;
    }

    let upVector = new Vector3D(0, 1, 0);
    let forward = Vector3D.multiplyVector(lookDirection, speed * fElapsedTime);
    let right = Vector3D.crossProduct(lookDirection, upVector);
    right.normalise();

    // Mouvement vertical
    if (keys[' ']) {
        camera.y += speed * fElapsedTime; // Déplace vers le haut
    }
    if (keys['control']) {
        camera.y -= speed * fElapsedTime; // Déplace vers le bas
    }

    // Mouvement avant/arrière
    if (keys['z']) {
        camera = Vector3D.addVector3D(camera, forward);
    }
    if (keys['s']) {
        camera = Vector3D.substractVector(camera, forward);
    }

    // Mouvement gauche/droite
    if (keys['d']) {
        camera.add(right.scale(speed * fElapsedTime));
    }
    if (keys['q']) {
        camera.add(right.scale(-speed * fElapsedTime));
    }

}


function animate() {
    const currentTime = performance.now();
    const deltaTime = (currentTime - lastTime) / 1000;
    lastTime = currentTime;
    ctx.clearRect(0, 0, width, height);
    triangleToShow = [];

    mesh.draw(0,0, 0);

    updateCamera(deltaTime);

    sortTriangles();


    // Calcul des FPS
    frameCount++;
    if (currentTime > lastTimeFPS + 1000) {
        fps = Math.round((frameCount * 1000) / (currentTime - lastTimeFPS));
        frameCount = 0;
        lastTimeFPS = currentTime;
    }

    // Affichage des FPS en haut à droite du canvas
    ctx.fillStyle = 'white';
    ctx.font = '16px Arial';
    ctx.textAlign = 'right';
    ctx.fillText(`FPS: ${fps}`, canvas.width - 10, 20);

    requestAnimationFrame(animate);
}

function updateLookDirection() {
    lookDirection.x = Math.cos(pitch) * Math.cos(yaw);
    lookDirection.y = Math.sin(pitch);
    lookDirection.z = Math.cos(pitch) * Math.sin(yaw);
    lookDirection.normalise();
}


const mesh = new CubeMesh();
mesh.create().then(() => {
    animate();
});

//!!!!!!!! Marche pas (voir à implémenter plus tard) !!!!!!!!\\

// const multiplyMatrixVector = gpu.createKernel(function(matrice, vector) {
//     const x = vector[0] * matrice[0][0] + vector[1] * matrice[1][0] + vector[2] * matrice[2][0] + matrice[3][0];
//     const y = vector[0] * matrice[0][1] + vector[1] * matrice[1][1] + vector[2] * matrice[2][1] + matrice[3][1];
//     const z = vector[0] * matrice[0][2] + vector[1] * matrice[1][2] + vector[2] * matrice[2][2] + matrice[3][2];
//     const w = vector[0] * matrice[0][3] + vector[1] * matrice[1][3] + vector[2] * matrice[2][3] + matrice[3][3];
//
//     if (w !== 0.0) {
//         return [x / w, y / w, z / w];
//     } else {
//         return [x, y, z];
//     }
// }, {
//     dynamicArguments: true

// }).setOutput([3]);
//
// function multiplication(matrice, vector) {
//     const result = multiplyMatrixVector(matrice, vector.toArray());
//     return Vector3D.fromArray(result);
// }