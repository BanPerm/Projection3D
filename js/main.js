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

let forward = new Vector3D();
let right = new Vector3D();
let upVector = new Vector3D(0, 1, 0);

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

    upVector.set(0, 1, 0);

    Vector3D.multiply(engineState.lookDirection, speed * fElapsedTime, forward);
    Vector3D.crossProduct(engineState.lookDirection, upVector, right);
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
        Vector3D.add(engineState.camera, forward, engineState.camera);
    }
    if (keys['s']) {
        Vector3D.sub(engineState.camera, forward, engineState.camera);
    }

    // Mouvement gauche/droite
    if (keys['d']) {
        Vector3D.add(engineState.camera, right.multiply(speed * fElapsedTime), engineState.camera);
    }
    if (keys['q']) {
        Vector3D.add(engineState.camera, right.multiply(-speed * fElapsedTime), engineState.camera);
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