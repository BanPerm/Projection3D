//!!!!!!!! Commande à lancer avant de lancer le site !!!!!!!!!!\\
// python -m http.server 8000
import { CubeMesh } from './geometry.js';
import {Vector3D} from './math.js';
import { clearBuffers, drawBufferToCanvas, initRenderer } from './renderer.js';
import { clearTriangles, engineState, initialisationCamera, PROJECTION, updateDimensions } from './state.js';


const canvas = document.getElementById('canvas');
// @ts-ignore
const ctx = canvas.getContext('2d', { alpha: false });

// Initialisation de la fenêtre
updateDimensions(window.innerWidth, window.innerHeight);
// @ts-ignore
canvas.width = PROJECTION.width;
// @ts-ignore
canvas.height = PROJECTION.height;

initRenderer(ctx, PROJECTION.width, PROJECTION.height);
initialisationCamera(new Vector3D(), new Vector3D());

// FPS variables
let frameCount = 0;
let lastTime = performance.now();
let lastTimeFPS = performance.now();
let fps = 0;

const normalSpeed = 16;
const boostedSpeed = 64;
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
    // @ts-ignore
    canvas.requestPointerLock = canvas.requestPointerLock || canvas.mozRequestPointerLock;
    canvas.requestPointerLock();
});

// Écouter les événements de changement d'état du verrouillage du curseur
document.addEventListener('pointerlockchange', () => {
    // @ts-ignore
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
    if (keys['shift']) speed = boostedSpeed;
    else speed = normalSpeed;

    upVector.set(0, 1, 0);

    Vector3D.multiply(engineState.lookDirection, speed * fElapsedTime, forward);
    Vector3D.crossProduct(engineState.lookDirection, upVector, right);
    right.normalise();

    // Mouvement vertical
    if (keys[' ']) {engineState.camera.y += speed * fElapsedTime;}
    if (keys['control']) {engineState.camera.y -= speed * fElapsedTime;}
    // Mouvement avant/arrière
    if (keys['z']) {Vector3D.add(engineState.camera, forward, engineState.camera);}
    if (keys['s']) {Vector3D.sub(engineState.camera, forward, engineState.camera);}
    // Mouvement gauche/droite
    if (keys['d']) {Vector3D.add(engineState.camera, right.multiply(speed * fElapsedTime), engineState.camera);}
    if (keys['q']) {Vector3D.add(engineState.camera, right.multiply(-speed * fElapsedTime), engineState.camera);}

}


function animate() {
    const currentTime = performance.now();
    const deltaTime = (currentTime - lastTime) / 1000;
    lastTime = currentTime;

    clearBuffers();
    clearTriangles();

    updateCamera(deltaTime);

    mesh.draw(0,0,0);

    drawBufferToCanvas(ctx);

    // Calcul des FPS
    frameCount++;
    displayFPS(currentTime);

    requestAnimationFrame(animate);
}

function displayFPS(currentTime) {
    if (currentTime > lastTimeFPS + 1000) {
        fps = Math.round((frameCount * 1000) / (currentTime - lastTimeFPS));
        frameCount = 0;
        lastTimeFPS = currentTime;
    }

    ctx.fillStyle = 'white';
    ctx.font = '16px Arial';
    ctx.textAlign = 'right';
    ctx.fillText(`FPS: ${fps}`, PROJECTION.width - 10, 20);
}


const mesh = new CubeMesh();
mesh.create().then(() => {
    animate();
});