import { Matrice, Vector3D } from "./math.js";
import { CONFIG, engineState, PROJECTION } from "./state.js";

export class Triangle {
    constructor(p1, p2, p3) {
        this.pos = [
            p1 || new Vector3D(),
            p2 || new Vector3D(),
            p3 || new Vector3D()
        ];
        this.color = 'white';
    }

    //Outil pour la mémoire
    copy(triangle) {
        this.pos[0].copy(triangle.pos[0]);
        this.pos[1].copy(triangle.pos[1]);
        this.pos[2].copy(triangle.pos[2]);
        this.color = triangle.color;
        return this;
    }

    set(p1, p2, p3) {
        this.pos[0].copy(p1);
        this.pos[1].copy(p2);
        this.pos[2].copy(p3);
        return this;
    }
}

export class Mesh {
    constructor() {
        this.pos = [];
    }

    async loadFromObjectFile(filePath) {
        try {
            const response = await fetch(filePath);
            if (!response.ok) {
                throw new Error('Failed to fetch file');
            }
            const text = await response.text();
            const lines = text.split('\n');
            const verts = [];
            const tris = [];

            lines.forEach(line => {
                const tokens = line.trim().split(/\s+/);
                if (tokens[0] === 'v') {
                    const x = parseFloat(tokens[1]);
                    const y = parseFloat(tokens[2]);
                    const z = parseFloat(tokens[3]);
                    verts.push(new Vector3D(x, y, z));
                } else if (tokens[0] === 'f') {
                    const f1 = parseInt(tokens[1]) - 1;
                    const f2 = parseInt(tokens[2]) - 1;
                    const f3 = parseInt(tokens[3]) - 1;
                    tris.push(new Triangle(verts[f1], verts[f2], verts[f3]));
                }
            });

            this.pos = tris;
            return this.pos;
        } catch (error) {
            console.error('Failed to fetch or parse file:', error);
            throw error;
        }
    }
}

export class CubeMesh {
    constructor() {
        this.mesh = new Mesh();
        this.initialMesh = new Mesh();
    }

    async create() {
        try {
            await this.mesh.loadFromObjectFile("object/voiture.obj");
            //await this.mesh.loadFromObjectFile("object/mountains.obj");
            this.initialMesh.pos = this.mesh.pos.map(tri =>
                new Triangle(
                    new Vector3D(tri.pos[0].x, tri.pos[0].y, tri.pos[0].z),
                    new Vector3D(tri.pos[1].x, tri.pos[1].y, tri.pos[1].z),
                    new Vector3D(tri.pos[2].x, tri.pos[2].y, tri.pos[2].z)
                )
            );

            console.log(this.mesh.pos);
        } catch (error) {
            console.error('Failed to create mesh:', error);
        }
    }

    reset() {
        this.mesh.pos = this.initialMesh.pos.map(tri =>
            new Triangle(
                new Vector3D(tri.pos[0].x, tri.pos[0].y, tri.pos[0].z),
                new Vector3D(tri.pos[1].x, tri.pos[1].y, tri.pos[1].z),
                new Vector3D(tri.pos[2].x, tri.pos[2].y, tri.pos[2].z)
            )
        );
    }

    draw(angleX = 0, angleY=0, angleZ = 0) {
        this.reset();

        projectAndStoreTriangle(this.mesh.pos, angleX, angleY, angleZ);

    }
}


let edge1 = new Vector3D();
let edge2 = new Vector3D();
let h = new Vector3D();
let s = new Vector3D();
let q = new Vector3D();

export class Ray {
    constructor(origin, direction) {
        this.origin = origin;
        this.direction = direction;
    }

    //Algo de Möller-Trumbore
    intersectTriangle(triangle){
        let vertex0 = triangle.pos[0];
        let vertex1 = triangle.pos[1];
        let vertex2 = triangle.pos[2];
        Vector3D.sub(vertex1, vertex0, edge1);
        Vector3D.sub(vertex2, vertex0, edge2);
        Vector3D.crossProduct(this.direction, edge2, h);
        let a = Vector3D.dotProduct(edge1, h);
        if (a > -Number.EPSILON && a<Number.EPSILON){
            return false;
        }
        let f = 1/a;
        Vector3D.sub(this.origin, vertex0, s);
        let u = f* Vector3D.dotProduct(s,h);
        if (u<0 || u >1){
            return false;
        }
        Vector3D.crossProduct(s, edge1, q);
        let v = f* Vector3D.dotProduct(this.direction, q);
        if (v<0 || u+v>1){
            return false;
        }
        let t = f* Vector3D.dotProduct(edge2,q);
        return t > Number.EPSILON;
    }
}

const target = new Vector3D();
const up = new Vector3D(0,1,0);
const line1 = new Vector3D();
const line2 = new Vector3D();
const vCameraRay = new Vector3D();
const lightDirection = new Vector3D(0, 0, -1);
const multiply = new Vector3D();
const rayOrigin = new Vector3D();
const rayDirection = new Vector3D();


function projectAndStoreTriangle(triangles, angleX, angleY, angleZ) {

    // Pré-calculer les matrices de rotation
    const rotationMatrixX = rotation_x(angleX);
    const rotationMatrixY = rotation_y(angleY);
    const rotationMatrixZ = rotation_z(angleZ);
    const projectionMatrix = Matrice.matriceMakeProjection(PROJECTION.fovRad, PROJECTION.aspectRatio, CONFIG.znear, CONFIG.zfar);


    const matTrans = Matrice.matriceMakeTranslation(0,0,10);

    let matWorld;
    matWorld = Matrice.matriceMultiplyMatrix(rotationMatrixZ, rotationMatrixX);
    matWorld = Matrice.matriceMultiplyMatrix(matWorld, matTrans);

    up.set(0, -1, 0);
    target.set(0,0,1);
    let cameraRot = rotation_y(engineState.yaw);
    updateLookDirection();
    Vector3D.add(engineState.camera, engineState.lookDirection, target);

    let matCamera = Matrice.matriceAtPoint(engineState.camera,target,up);
    let matView = Matrice.matriceQuickInverse(matCamera);

    for (let triangle of triangles) {
        // Rotation
        triangle.pos[0] = Matrice.matriceMultiplyVector(matWorld, triangle.pos[0]);
        triangle.pos[1] = Matrice.matriceMultiplyVector(matWorld, triangle.pos[1]);
        triangle.pos[2] = Matrice.matriceMultiplyVector(matWorld, triangle.pos[2]);

        Vector3D.sub(triangle.pos[1], triangle.pos[0], line1);
        Vector3D.sub(triangle.pos[2], triangle.pos[0], line2);

        let normal = Vector3D.crossProduct(line1,line2);

        normal.normalise()

        Vector3D.sub(triangle.pos[0], engineState.camera, vCameraRay);

        // Product Dot pour vérifier si le triangle est bien visible
        if (Vector3D.dotProduct(normal, vCameraRay) < 0) {

            // Ajout d'un système de light
            lightDirection.set(0, 0, -1);
            lightDirection.normalise();

            let ambientLight = 0.2;

            let dp = Math.max(0.1,Vector3D.dotProduct(lightDirection, normal));

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

                projected_triangle.pos[0].divide(projected_triangle.pos[0].w);
                projected_triangle.pos[1].divide(projected_triangle.pos[1].w);
                projected_triangle.pos[2].divide(projected_triangle.pos[2].w);

                if(engineState.shadowsEnabled){
                    const samplePoints = [
                        projected_triangle.pos[0],
                        projected_triangle.pos[1],
                        projected_triangle.pos[2]
                    ];
                    let shadowCount = 0;

                    for (let point of samplePoints) {
                        Vector3D.multiply(lightDirection, 0.1, multiply);
                        Vector3D.add(point, multiply, rayOrigin);
                        
                        Vector3D.multiply(lightDirection, 1, rayDirection);

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

                Vector3D.add(projected_triangle.pos[0], offset, projected_triangle.pos[0]);
                Vector3D.add(projected_triangle.pos[1], offset, projected_triangle.pos[1]);
                Vector3D.add(projected_triangle.pos[2], offset, projected_triangle.pos[2]);

                // Scale into view
                projected_triangle.pos[0].x += 1.0;
                projected_triangle.pos[0].y += 1.0;
                projected_triangle.pos[1].x += 1.0;
                projected_triangle.pos[1].y += 1.0;
                projected_triangle.pos[2].x += 1.0;
                projected_triangle.pos[2].y += 1.0;

                projected_triangle.pos[0].x *= 0.5 * PROJECTION.width;
                projected_triangle.pos[0].y *= 0.5 * PROJECTION.height;
                projected_triangle.pos[1].x *= 0.5 * PROJECTION.width;
                projected_triangle.pos[1].y *= 0.5 * PROJECTION.height;
                projected_triangle.pos[2].x *= 0.5 * PROJECTION.width;
                projected_triangle.pos[2].y *= 0.5 * PROJECTION.height;

                engineState.triangleToShow.push(projected_triangle);
            }
        }
    }
}


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

function updateLookDirection() {
    engineState.lookDirection.x = Math.cos(engineState.pitch) * Math.cos(engineState.yaw);
    engineState.lookDirection.y = Math.sin(engineState.pitch);
    engineState.lookDirection.z = Math.cos(engineState.pitch) * Math.sin(engineState.yaw);
    engineState.lookDirection.normalise();
}