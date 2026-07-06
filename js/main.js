//!!!!!!!! Commande à lancer avant de lancer le site !!!!!!!!!!\\
// python -m http.server 8000
import {Vector3D} from './math.js';
import { MeshInstance } from './mesh/meshInstance.js';
import { updateCameraMatrices } from './geometry.js';
import { clearBuffers, drawBufferToCanvas, initRenderer } from './renderer.js';
import { clearTriangles, engineState, initialisationCamera, PROJECTION, updateDimensions } from './state.js';


const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d', { alpha: false });

// Initialisation de la fenêtre
updateDimensions(window.innerWidth, window.innerHeight);
canvas.width = PROJECTION.width;
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

        const maxPitch = Math.PI / 2 - 0.001;
        const minPitch = -Math.PI / 2 + 0.001;

        engineState.pitch = Math.max(minPitch, Math.min(maxPitch, engineState.pitch));
    }
}

canvas.addEventListener('click', () => {
    // @ts-ignore
    canvas.requestPointerLock = canvas.requestPointerLock || canvas.mozRequestPointerLock;
    canvas.requestPointerLock();
});

window.addEventListener('resize', () => {
    updateDimensions(window.innerWidth, window.innerHeight);
    canvas.width = PROJECTION.width;
    canvas.height = PROJECTION.height;
    initRenderer(ctx, PROJECTION.width, PROJECTION.height);
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

    // matView/matProj + direction de lumière en espace vue : une fois par frame,
    // partagé par toutes les entités (pas recalculé par objet).
    updateCameraMatrices();

    for (const entity of entities) {
        entity.draw();
    }

    drawBufferToCanvas(ctx);

    // Calcul des FPS
    displayFPS();

    requestAnimationFrame(animate);
}


let frameTimes = [];
const maxFrameHistory = 60;

function displayFPS() {
    const currentTime = performance.now();
    const dt = currentTime - lastTime;
    
    frameTimes.push(dt);
    
    if (frameTimes.length > maxFrameHistory) {
        frameTimes.shift();
    }

    const averageStep = frameTimes.reduce((a, b) => a + b) / frameTimes.length;
    const fps = Math.round(1000 / averageStep);

    ctx.fillStyle = "white";
    ctx.font = "16px Monospace";
    ctx.fillText(`FPS: ${fps} (${averageStep.toFixed(2)}ms)`, 10, 20);
}


// Plusieurs instances, partageant le même .obj chargé une seule fois,
// chacune avec sa propre position/rotation.
const entities = [
    new MeshInstance("object/voiture.obj"),
    new MeshInstance("object/voiture.obj"),
    new MeshInstance("object/voiture.obj"),
];

/*
const entities = [
    new MeshInstance("object/house_texture.obj"),
    new MeshInstance("object/house_texture.obj"),
    new MeshInstance("object/house_texture.obj"),
    new MeshInstance("object/house_texture.obj"),
    new MeshInstance("object/house_texture.obj"),
    new MeshInstance("object/house_texture.obj"),
    new MeshInstance("object/house_texture.obj"),
    new MeshInstance("object/house_texture.obj"),
    new MeshInstance("object/voiture.obj"),
];
*/


entities[0].transform.setPosition(0, 0, 10);
entities[1].transform.setPosition(20, 0, 10);
entities[2].transform.setPosition(-20, 0, 25).setRotation(0, Math.PI / 4, 0);

/*
entities[0].transform.setPosition(0, 0, 0);
for(let i=1;i<entities.length-1;i++){
    let x = 150*i
    entities[i].transform.setPosition(x, 0, 0);
}

entities[0].texturePath = "texture/cottage_diffuse.png";
entities[1].texturePath = "texture/test.png";
entities[8].transform.setPosition(50, 3, 5)
*/

Promise.all(entities.map(e => e.create())).then(() => {
    animate();
});