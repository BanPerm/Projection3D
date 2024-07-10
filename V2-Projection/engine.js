//!!!!!!!! Commande à lancer avant de lancer le site !!!!!!!!!!\\
// python -m http.server 8000



const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// Initialisation de la fenêtre
const width = window.innerWidth;
const height = window.innerHeight;
canvas.width = width - 50;
canvas.height = height - 50;


//Variable pour la projection
const zfar = 1;
const znear = 1000;
const fov = 90;
const aspectRatio = height/width;
const fovRad = 1/Math.tan(fov*0.5/180*Math.PI);


//Definition de mes classes de base

class Vector3D{
    constructor(x, y, z) {
       this.x = x;
       this.y = y;
       this.z = z;
    }
}

//Le triangle est la forme 2D la plus simple permetant donc de représenter n'importe quelle forme
class Triangle {
    constructor(p1, p2, p3) {
        this.pos = [p1, p2, p3];
        this.color = 'white'
    }
}

//Un mesh est un forme composé d'un ensemble de triangle
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
        this.initialMesh = new Mesh();  // Copie des positions initiales
    }

    async create() {
        try {
            await this.mesh.loadFromObjectFile("object/VideoShip.obj");

            this.initialMesh.pos = this.mesh.pos.map(tri =>
                    new Triangle(
                        new Vector3D(tri.pos[0].x, tri.pos[0].y, tri.pos[0].z),
                        new Vector3D(tri.pos[1].x, tri.pos[1].y, tri.pos[1].z),
                        new Vector3D(tri.pos[2].x, tri.pos[2].y, tri.pos[2].z)
                    )
                );

            console.log(this.mesh.pos);
        }
        catch (error) {
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
        for (let triangle of this.mesh.pos) {
            drawTriangle(triangle, angleX, angleZ);
        }
    }
}


function multiplication(matrice, vector) {
    let x = vector.x * matrice[0][0] + vector.y * matrice[1][0] + vector.z * matrice[2][0] + matrice[3][0];
    let y = vector.x * matrice[0][1] + vector.y * matrice[1][1] + vector.z * matrice[2][1] + matrice[3][1];
    let z = vector.x * matrice[0][2] + vector.y * matrice[1][2] + vector.z * matrice[2][2] + matrice[3][2];
    let w = vector.x * matrice[0][3] + vector.y * matrice[1][3] + vector.z * matrice[2][3] + matrice[3][3];

    if (w !== 0.0) {
        x /= w; y /= w; z /= w;
    }

    return new Vector3D(x, y, z);
}

//Matrice de rotation
function rotation_x(angle) {
    return [
        [1, 0, 0, 0],
        [0, Math.cos(angle), Math.sin(angle),0],
        [0, -Math.sin(angle), Math.cos(angle),0],
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

function drawTriangle(triangle, angleX, angleZ) {

    let projectionMatrix = [
        [aspectRatio*fovRad,0,0,0],
        [0,fovRad,0,0],
        [0,0,zfar/(zfar-znear),1],
        [0,0,(-zfar*znear)/(zfar-znear),0]
    ];

    //Rotation sur l'axe z
    triangle.pos[0] = multiplication(rotation_z(angleZ), triangle.pos[0]);
    triangle.pos[1] = multiplication(rotation_z(angleZ), triangle.pos[1]);
    triangle.pos[2] = multiplication(rotation_z(angleZ), triangle.pos[2]);

    //Rotation sur l'axe x
    triangle.pos[0] = multiplication(rotation_x(angleX), triangle.pos[0]);
    triangle.pos[1] = multiplication(rotation_x(angleX), triangle.pos[1]);
    triangle.pos[2] = multiplication(rotation_x(angleX), triangle.pos[2]);

    triangle.pos[0].z += 10
    triangle.pos[1].z += 10
    triangle.pos[2].z += 10

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
    normal.x /= l;normal.y/=l;normal.z /= l;

    //Product Dot pour vérifier si le triangle est bien visible
    if(normal.x* (triangle.pos[0].x - camera.x)+
    normal.y* (triangle.pos[0].y - camera.y)+
    normal.z* (triangle.pos[0].z - camera.z) <0)
    {
        //Ajout d'un système de light
        let light_direction = new Vector3D(0,0,-1);
        let l = Math.sqrt(light_direction.x*light_direction.x+ light_direction.y * light_direction.y + light_direction.z*light_direction.z);
        light_direction.x /= l;normal.x /= l;normal.z /= l;

        let dotProduct = normal.x*light_direction.x + light_direction.y * normal.y + normal.z * light_direction.z;

        triangle.color = getColour(dotProduct);


        triangle.pos[0] = multiplication(projectionMatrix, triangle.pos[0]);
        triangle.pos[1] = multiplication(projectionMatrix, triangle.pos[1]);
        triangle.pos[2] = multiplication(projectionMatrix, triangle.pos[2]);

        triangle.pos[0].x = (triangle.pos[0].x + 1.0) * 0.5 * width;
        triangle.pos[0].y = (triangle.pos[0].y + 1.0) * 0.5 * height;
        triangle.pos[1].x = (triangle.pos[1].x + 1.0) * 0.5 * width;
        triangle.pos[1].y = (triangle.pos[1].y + 1.0) * 0.5 * height;
        triangle.pos[2].x = (triangle.pos[2].x + 1.0) * 0.5 * width;
        triangle.pos[2].y = (triangle.pos[2].y + 1.0) * 0.5 * height;

        for (let i = 0; i < 3; i++) {
            let p1 = triangle.pos[i];
            let p2 = triangle.pos[(i + 1) % 3];

            ctx.fillStyle = triangle.color;
            ctx.strokeStyle = triangle.color;
            ctx.beginPath();
            ctx.moveTo(triangle.pos[0].x, triangle.pos[0].y);
            ctx.lineTo(triangle.pos[1].x, triangle.pos[1].y);
            ctx.lineTo(triangle.pos[2].x, triangle.pos[2].y);
            ctx.closePath();
            ctx.stroke();
            ctx.fill();

        }
    }
}

let angle_x = 0;
let angle_z = 0;
let camera = new Vector3D(0,0,0);
let cube = new CubeMesh;
cube.create();
cube.draw(angle_x,angle_z);

function cubeDraw(){
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    cube.draw(angle_x, angle_z);
    angle_z += 0.02;
    angle_x+=0.01;
}

setInterval(cubeDraw, 1000/60);