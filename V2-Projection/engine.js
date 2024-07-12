//!!!!!!!! Commande à lancer avant de lancer le site !!!!!!!!!!\\
// python -m http.server 8000


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
    constructor(x, y, z) {
        this.x = x;
        this.y = y;
        this.z = z;
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
            await this.mesh.loadFromObjectFile("object/VideoShip.obj");
            //await this.mesh.loadFromObjectFile("object/character.obj");
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

    draw(angleX = 0, angleZ = 0) {
        this.reset();
        // Pré-calculer les matrices de rotation
        const rotationMatrixX = rotation_x(angleX);
        const rotationMatrixZ = rotation_z(angleZ);

        for (let triangle of this.mesh.pos) {
            projectAndStoreTriangle(triangle, rotationMatrixX, rotationMatrixZ);
        }
    }
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

// Matrice de rotation
function rotation_x(angle) {
    return [
        [1, 0, 0, 0],
        [0, Math.cos(angle), Math.sin(angle), 0],
        [0, -Math.sin(angle), Math.cos(angle), 0],
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

function projectAndStoreTriangle(triangle, rotationMatrixX, rotationMatrixZ) {
    const projectionMatrix = [
        [aspectRatio * fovRad, 0, 0, 0],
        [0, fovRad, 0, 0],
        [0, 0, zfar / (zfar - znear), 1],
        [0, 0, (-zfar * znear) / (zfar - znear), 0]
    ];

    // Rotation sur l'axe z
    triangle.pos[0] = multiplication(rotationMatrixZ, triangle.pos[0]);
    triangle.pos[1] = multiplication(rotationMatrixZ, triangle.pos[1]);
    triangle.pos[2] = multiplication(rotationMatrixZ, triangle.pos[2]);

    // Rotation sur l'axe x
    triangle.pos[0] = multiplication(rotationMatrixX, triangle.pos[0]);
    triangle.pos[1] = multiplication(rotationMatrixX, triangle.pos[1]);
    triangle.pos[2] = multiplication(rotationMatrixX, triangle.pos[2]);

    triangle.pos[0].z += 10;
    triangle.pos[1].z += 10;
    triangle.pos[2].z += 10;

    let line1 = new Vector3D(
        triangle.pos[1].x - triangle.pos[0].x,
        triangle.pos[1].y - triangle.pos[0].y,
        triangle.pos[1].z - triangle.pos[0].z
    );

    let line2 = new Vector3D(
        triangle.pos[2].x - triangle.pos[0].x,
        triangle.pos[2].y - triangle.pos[0].y,
        triangle.pos[2].z - triangle.pos[0].z
    );

    let normal = new Vector3D(
        line1.y * line2.z - line1.z * line2.y,
        line1.z * line2.x - line1.x * line2.z,
        line1.x * line2.y - line1.y * line2.x
    );

    let l = Math.sqrt(normal.x * normal.x + normal.y * normal.y + normal.z * normal.z);
    normal.x /= l;
    normal.y /= l;
    normal.z /= l;

    // Product Dot pour vérifier si le triangle est bien visible
    if (normal.x * (triangle.pos[0].x - camera.x) +
        normal.y * (triangle.pos[0].y - camera.y) +
        normal.z * (triangle.pos[0].z - camera.z) < 0) {

        // Ajout d'un système de light
        let light_direction = new Vector3D(0, 0, -1);
        let l = Math.sqrt(light_direction.x * light_direction.x + light_direction.y * light_direction.y + light_direction.z * light_direction.z);
        light_direction.x /= l;
        light_direction.y /= l;
        light_direction.z /= l;

        let dp = normal.x * light_direction.x + normal.y * light_direction.y + normal.z * light_direction.z;

        // Projection 3D -> 2D
        let projected_triangle = new Triangle(
            multiplication(projectionMatrix, triangle.pos[0]),
            multiplication(projectionMatrix, triangle.pos[1]),
            multiplication(projectionMatrix, triangle.pos[2])
        );

        projected_triangle.color = getColour(dp);

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

const camera = { x: 0, y: 0, z: 0 };
// FPS variables
let frameCount = 0;
let lastTime = performance.now();
let fps = 0;

function animate() {
    ctx.clearRect(0, 0, width, height);
    triangleToShow = [];

    const angleX = performance.now() / 1000;
    const angleZ = performance.now() / 1000;

    mesh.draw(angleX, angleZ);

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
