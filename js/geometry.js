import { Matrice, Vector3D } from "./math.js";
import { CONFIG, engineState, PROJECTION } from "./state.js";

export class Triangle {
    constructor(p1, p2, p3) {
        this.pos = [p1, p2, p3];
        this.color = 'white';
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
            //await this.mesh.loadFromObjectFile("object/VideoShip.obj");
            await this.mesh.loadFromObjectFile("object/mountains.obj");
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
        let edge1 = Vector3D.substractVector(vertex1, vertex0);
        let edge2 = Vector3D.substractVector(vertex2, vertex0);
        let h = Vector3D.crossProduct(this.direction, edge2);
        let a = Vector3D.dotProductVector(edge1, h);
        if (a > -Number.EPSILON && a<Number.EPSILON){
            return false;
        }
        let f = 1/a;
        let s = Vector3D.substractVector(this.origin, vertex0);
        let u = f* Vector3D.dotProductVector(s,h);
        if (u<0 || u >1){
            return false;
        }
        let q = Vector3D.crossProduct(s, edge1);
        let v = f* Vector3D.dotProductVector(this.direction, q);
        if (v<0 || u+v>1){
            return false;
        }
        let t = f* Vector3D.dotProductVector(edge2,q);
        return t > Number.EPSILON;
    }
}

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

    let up = new Vector3D(0,-1,0);
    let target = new Vector3D(0,0,1);
    let cameraRot = rotation_y(engineState.yaw);
    updateLookDirection();
    target = Vector3D.addVector3D(engineState.camera, engineState.lookDirection);

    let matCamera = Matrice.matriceAtPoint(engineState.camera,target,up);
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

        let vCameraRay = Vector3D.substractVector(triangle.pos[0], engineState.camera);

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

                if(engineState.shadowsEnabled){
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