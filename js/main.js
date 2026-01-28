//!!!!!!!! Commande à lancer avant de lancer le site !!!!!!!!!!\\
// python -m http.server 8000
import { CubeMesh } from './geometry.js';
import {Vector3D} from './math.js';
import { sortTriangles } from './renderer.js';
import { clearTriangles, engineState, initialisationCamera, PROJECTION, updateDimensions } from './state.js';


const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// Initialisation de la fenêtre
updateDimensions(window.innerWidth, window.innerHeight);
canvas.width = PROJECTION.width;
canvas.height = PROJECTION.height;

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


initialisationCamera(new Vector3D(), new Vector3D());

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

        engineState.yaw += deltaX * sensitivity;
        engineState.pitch -= deltaY * sensitivity;

        const maxPitch = Math.PI / 2;
        const minPitch = -Math.PI / 2;

        engineState.pitch = Math.max(minPitch, Math.min(maxPitch, engineState.pitch));
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
    let forward = Vector3D.multiplyVector(engineState.lookDirection, speed * fElapsedTime);
    let right = Vector3D.crossProduct(engineState.lookDirection, upVector);
    right.normalise();

    // Mouvement vertical
    if (keys[' ']) {
        engineState.camera.y += speed * fElapsedTime; // Déplace vers le haut
    }
    if (keys['control']) {
        engineState.camera.y -= speed * fElapsedTime; // Déplace vers le bas
    }

    // Mouvement avant/arrière
    if (keys['z']) {
        engineState.camera = Vector3D.addVector3D(engineState.camera, forward);
    }
    if (keys['s']) {
        engineState.camera = Vector3D.substractVector(engineState.camera, forward);
    }

    // Mouvement gauche/droite
    if (keys['d']) {
        engineState.camera = Vector3D.addVector3D(engineState.camera, right.scale(speed * fElapsedTime));
    }
    if (keys['q']) {
        engineState.camera = Vector3D.addVector3D(engineState.camera, right.scale(-speed * fElapsedTime));
    }

}


function animate() {
    const currentTime = performance.now();
    const deltaTime = (currentTime - lastTime) / 1000;
    lastTime = currentTime;
    ctx.clearRect(0, 0, PROJECTION.width, PROJECTION.height);
    clearTriangles();

    mesh.draw(0,0, 0);

    updateCamera(deltaTime);

    sortTriangles(ctx, engineState.triangleToShow, PROJECTION.width, PROJECTION.height);

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
    ctx.fillText(`FPS: ${fps}`, PROJECTION.width - 10, 20);

    requestAnimationFrame(animate);
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