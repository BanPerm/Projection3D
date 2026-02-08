export const CONFIG = {
    zfar: 1000,
    znear: 1,
    fov: 90,
    get aspectRatio() { return window.innerHeight / window.innerWidth; },
    get fovRad() { return 1 / Math.tan((this.fov * 0.5) / 180 * Math.PI); }
};

export let engineState = {
    triangleToShow: [],
    ombrage: false,
    clipping: false,
    camera: null,
    lookDirection: null,
    yaw: 0,
    pitch: 0
};

export function clearTriangles() {
    engineState.triangleToShow = [];
}

export let PROJECTION = {
    width: 0,
    height: 0,
    aspectRatio: 0,
    fovRad: 0
};

export function updateDimensions(w, h) {
    const scale = 0.5;
    PROJECTION.width = w - 50;
    PROJECTION.height = h - 50;
    PROJECTION.aspectRatio = PROJECTION.height / PROJECTION.width;
    PROJECTION.fovRad = 1 / Math.tan((90 * 0.5) / 180 * Math.PI);
}

export function initialisationCamera(camera, lookDirection) {
    engineState.camera = camera;
    engineState.lookDirection = lookDirection;
}