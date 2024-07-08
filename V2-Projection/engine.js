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
    }
}

//Un mesh est un forme composé d'un ensemble de triangle
class Mesh {
    constructor() {
        this.pos = [];
    }
}

class CubeMesh {
    constructor() {
        this.mesh = new Mesh();
    }

    create(base=[0,0,0], longueur=100, largeur=100, profondeur=1) {
        let x = base[0];
        let y = base[1];
        let z = base[2];
        longueur = x + longueur;
        largeur = y + largeur;
        profondeur = z + profondeur;
        cube = [
            //Devant
            new Triangle(new Vector3D(x, y, z),new Vector3D(x, largeur, z), new Vector3D(longueur, largeur, z)),
            new Triangle(new Vector3D(x, y, z),new Vector3D(longueur, largeur, z),new Vector3D(longueur, y, z)),
        
            // Derrière
            new Triangle(new Vector3D(longueur, y, profondeur),new Vector3D(longueur, largeur, profondeur),new Vector3D(x, largeur, profondeur)),
            new Triangle(new Vector3D(longueur, y, profondeur),new Vector3D(x, largeur, profondeur),new Vector3D(x, y, profondeur)),
        
            // Gauche
            new Triangle(new Vector3D(longueur, y, z),new Vector3D(longueur, largeur, z),new Vector3D(longueur, largeur, profondeur)),
            new Triangle(new Vector3D(longueur, y, z),new Vector3D(longueur, largeur, profondeur),new Vector3D(longueur, y, profondeur)),
        
            // Droite
            new Triangle(new Vector3D(x, y, profondeur),new Vector3D(x, largeur, profondeur),new Vector3D(x, largeur, z)),
            new Triangle(new Vector3D(x, y, profondeur),new Vector3D(x, largeur, z),new Vector3D(x, y, z) ),
        
            // Haut
            new Triangle(new Vector3D(x, largeur, z),new Vector3D(x, largeur, profondeur),new Vector3D(longueur, largeur, profondeur)),
            new Triangle(new Vector3D(x, largeur, z),new Vector3D(longueur, largeur, profondeur),new Vector3D(longueur, largeur, z)),
        
            // Bas
            new Triangle(new Vector3D(longueur, y, profondeur),new Vector3D(x, y, profondeur),new Vector3D(x, y, z)),
            new Triangle(new Vector3D(longueur, y, profondeur),new Vector3D(x, y, z),new Vector3D(longueur, y, z))
        ];
        this.mesh.pos = cube;
        this.draw();
    }

    draw() {
        //@TODO Manque la projection
        for (let triangle of this.mesh.pos) {
            drawTriangle(triangle); 
        }
    }
}


//Fonction utile hors projection
function matrixProduct(m1, m2) {
    const h = m1.length;
    const w = m2[0].length;
    const matrix = Array.from({ length: h }, () => Array(w).fill(0));

    for (let i = 0; i < h; i++) {
        for (let j = 0; j < w; j++) {
            for (let k = 0; k < m2.length; k++) {
                matrix[i][j] += m1[i][k] * m2[k][j];
            }
        }
    }
    return matrix;
}


//Matrice de rotation
function rotation_x(angle) {
    return [
        [1, 0, 0],
        [0, Math.cos(angle), -Math.sin(angle)],
        [0, Math.sin(angle), Math.cos(angle)]
    ];
}

function rotation_y(angle) {
    return [
        [Math.cos(angle), 0, Math.sin(angle)],
        [0, 1, 0],
        [-Math.sin(angle), 0, Math.cos(angle)]
    ];
}

function rotation_z(angle) {
    return [
        [Math.cos(angle), -Math.sin(angle), 0],
        [Math.sin(angle), Math.cos(angle), 0],
        [0, 0, 1]
    ];
}

function projection(triangle){
    projectionMatrix = [
        [aspectRatio*fovRad,0,0,0],
        [0,fovRad,0,0],
        [0,0,zfar/(zfar-znear),1],
        [0,0,(-zfar*znear)/(zfar-znear),0]
    ];

    return projectionMatrix;

}

function multiplication(matrice, triangle){
    o.x = triangle.x * matrice[0][0] + triangle.y * matrice[1][0] + triangle.z * matrice[2][0] + matrice[3][0];
    o.y = triangle.x * matrice[0][1] + triangle.y * matrice[1][1] + triangle.z * matrice[2][1] + matrice[3][1];
    o.z = triangle.x * matrice[0][2] + triangle.y * matrice[1][2] + triangle.z * matrice[2][2] + matrice[3][2];
    w = triangle.x * matrice[0][3] + triangle.y * matrice[1][3] + triangle.z * matrice[2][3] + matrice[3][3];

    if (w !=0.0){
        o.x /= w; o.y /= w; o.z /w;
    }

    return o;
}

function drawCube(triangles) {
    for (let triangle of triangles) {
        drawTriangle(triangle);
    }
}

function drawTriangle(triangle) {
    console.log("Triangle: "+triangle.pos[0].x);
    for (let i = 0; i < 3; i++) {
        let p1 = triangle.pos[i];
        let p2 = triangle.pos[(i + 1) % 3];

        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();

    }
}

let cube = new CubeMesh;
cube.create();