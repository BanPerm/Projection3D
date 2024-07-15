//!!!!!!!! Commande à lancer avant de lancer le site !!!!!!!!!!\\
// python -m http.server 8000

let gpu = new window.GPU.GPU();

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

// Définition de mes classes de base
class Vector3D {
    constructor(x=0, y=0, z=0,w=1) {
        this.x = x;
        this.y = y;
        this.z = z;
        this.w = w;
    }

    toArray() {
        return [this.x, this.y, this.z];
    }

    lengthVector(){
        return Math.sqrt(Vector3D.dotProductVector(this,this));
    }

    normalise(){
        let l = this.lengthVector();
        this.x = this.x / l;
        this.y = this.y / l;
        this.z = this.z / l;
    }

    static fromArray(array) {
        return new Vector3D(array[0], array[1], array[2]);
    }

    static addVector3D(vector, vector2) {
        return new Vector3D(vector2.x + vector.x, vector2.y + vector.y, vector2.z + vector.z);
    }

    static substractVector(v1, v2) {
        return new Vector3D( v1.x - v2.x, v1.y - v2.y, v1.z - v2.z );
    }

    static divideVector(v1, divider) {
        return new Vector3D( v1.x/divider, v1.y/divider, v1.z/divider);
    }

    static multiplyVector(v1, m) {
        return new Vector3D( v1.x*m, v1.y*m, v1.z*m);
    }

    static dotProductVector(v1, v2) {
        return v1.x*v2.x + v1.y*v2.y + v1.z*v2.z;
    }

    static crossProduct(v1, v2) {
        let v = new Vector3D();
        v.x = v1.y * v2.z - v1.z * v2.y;
        v.y = v1.z * v2.x - v1.x * v2.z;
        v.z = v1.x * v2.y - v1.y * v2.x;
        return v;
    }


}

//Sert juste pour simplifier les opération sur les différentes matrices dans le code
class Matrice{
    constructor(){}

    static matriceMultiplyVector(matrice, vector) {
        let v = new Vector3D();
        v.x = vector.x * matrice[0][0] + vector.y * matrice[1][0] + vector.z * matrice[2][0] + vector.w * matrice[3][0];
        v.y = vector.x * matrice[0][1] + vector.y * matrice[1][1] + vector.z * matrice[2][1] + vector.w * matrice[3][1];
        v.z = vector.x * matrice[0][2] + vector.y * matrice[1][2] + vector.z * matrice[2][2] + vector.w * matrice[3][2];
        v.w = vector.x * matrice[0][3] + vector.y * matrice[1][3] + vector.z * matrice[2][3] + vector.w * matrice[3][3];
        return v;
    }

    static matriceMakeIdentity()
    {
        return [[1, 0, 0, 0],
            [0, 1, 0, 0],
            [0, 0, 1, 0],
            [0, 0, 0, 1]];
    }

    static matriceMakeTranslation(x,y,z) {
        return [[1, 0, 0, 0],
            [0, 1, 0, 0],
            [0, 0, 1, 0],
            [x, y, z, 1]];
    }

    static matriceMakeProjection(fovRad, aspectRatio, znear, zfar) {
        return [[aspectRatio * fovRad, 0, 0, 0],
            [0, fovRad, 0, 0],
            [0, 0, zfar / (zfar - znear), 1],
            [0, 0, (-zfar * znear) / (zfar - znear), 0]];
    }

    static matriceMultiplyMatrix(m1, m2) {
        let matrice = Array.from({ length: 4 }, () => Array(4).fill(0));
        for (let c = 0; c < 4; c++) {
            for (let r = 0; r < 4; r++) {
                matrice[r][c] = m1[r][0] * m2[0][c] + m1[r][1] * m2[1][c] + m1[r][2] * m2[2][c] + m1[r][3] * m2[3][c];
            }
        }
        return matrice;
    }
}

class Triangle {
    constructor(p1, p2, p3) {
        this.pos = [p1, p2, p3];
        this.color = 'white';
    }
}

class Mesh {
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

class CubeMesh {
    constructor() {
        this.mesh = new Mesh();
        this.initialMesh = new Mesh();
    }

    async create() {
        try {
            //await this.mesh.loadFromObjectFile("object/VideoShip.obj");
            await this.mesh.loadFromObjectFile("object/axis.obj");
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

// Matrice de rotation
function rotation_x(angle) {
    return [
        [1, 0, 0, 0],
        [0, Math.cos(angle), Math.sin(angle), 0],
        [0, -Math.sin(angle), Math.cos(angle), 0],
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
        [Math.cos(angle), Math.sin(angle), 0, 0],
        [-Math.sin(angle), Math.cos(angle), 0, 0],
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

            let dp = Math.max(0.1,Vector3D.dotProductVector(light_direction, normal));

            // Projection 3D -> 2D
            let projected_triangle = new Triangle(
                Matrice.matriceMultiplyVector(projectionMatrix, triangle.pos[0]),
                Matrice.matriceMultiplyVector(projectionMatrix, triangle.pos[1]),
                Matrice.matriceMultiplyVector(projectionMatrix, triangle.pos[2])
            );

            projected_triangle.pos[0] = Vector3D.divideVector(projected_triangle.pos[0], projected_triangle.pos[0].w);
            projected_triangle.pos[1] = Vector3D.divideVector(projected_triangle.pos[1], projected_triangle.pos[1].w);
            projected_triangle.pos[2] = Vector3D.divideVector(projected_triangle.pos[2], projected_triangle.pos[2].w);

            projected_triangle.color = getColour(dp);

            let offset = new Vector3D(0,0,0);

            projected_triangle.pos[0] = Vector3D.addVector3D(projected_triangle.pos[0], offset);
            projected_triangle.pos[1] = Vector3D.addVector3D(projected_triangle.pos[1], offset);
            projected_triangle.pos[2] = Vector3D.addVector3D(projected_triangle.pos[2], offset);

            // Scale into view
            projected_triangle.pos[0].x += 1.0; projected_triangle.pos[0].y += 1.0;
            projected_triangle.pos[1].x += 1.0; projected_triangle.pos[1].y += 1.0;
            projected_triangle.pos[2].x += 1.0; projected_triangle.pos[2].y += 1.0;

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

function sortTriangles() {
    triangleToShow.sort((t1, t2) => {
        const z1 = (t1.pos[0].z + t1.pos[1].z + t1.pos[2].z) / 3.0;
        const z2 = (t2.pos[0].z + t2.pos[1].z + t2.pos[2].z) / 3.0;
        return z2 - z1;
    });
}

function drawTriangles() {
    for(let projected_triangle of triangleToShow) {
        ctx.beginPath();
        ctx.moveTo(projected_triangle.pos[0].x, projected_triangle.pos[0].y);
        ctx.lineTo(projected_triangle.pos[1].x, projected_triangle.pos[1].y);
        ctx.lineTo(projected_triangle.pos[2].x, projected_triangle.pos[2].y);
        ctx.closePath();

        ctx.fillStyle = projected_triangle.color;
        ctx.strokeStyle = projected_triangle.color;
        ctx.fill();
        ctx.stroke();
    }
}

const camera = new Vector3D();
// FPS variables
let frameCount = 0;
let lastTime = performance.now();
let fps = 0;

function animate() {
    ctx.clearRect(0, 0, width, height);
    triangleToShow = [];

    const angleX = performance.now() / 1000;
    const angleY = performance.now() / 1000;
    const angleZ = performance.now() / 1000;

    mesh.draw(angleX,0, angleZ);

    sortTriangles();
    drawTriangles();

    // Calcul des FPS
    const currentTime = performance.now();
    frameCount++;
    if (currentTime > lastTime + 1000) {
        fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
        frameCount = 0;
        lastTime = currentTime;
    }

    // Affichage des FPS en haut à droite du canvas
    ctx.fillStyle = 'white';
    ctx.font = '16px Arial';
    ctx.textAlign = 'right';
    ctx.fillText(`FPS: ${fps}`, canvas.width - 10, 20);

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

