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

    create(base=new Vector3D(0,0,0), longueur=1, largeur=1, profondeur=1) {
        let x = base.x;
        let y = base.y;
        let z = base.z;
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
        for (let triangle of this.mesh.pos) {
            drawTriangle(triangle);
        }
    }
}

function multiplication(matrice, triangle){
    let o= new Vector3D(0,0,0);
    o.x = triangle.x * matrice[0][0] + triangle.y * matrice[1][0] + triangle.z * matrice[2][0] + matrice[3][0];
    o.y = triangle.x * matrice[0][1] + triangle.y * matrice[1][1] + triangle.z * matrice[2][1] + matrice[3][1];
    o.z = triangle.x * matrice[0][2] + triangle.y * matrice[1][2] + triangle.z * matrice[2][2] + matrice[3][2];
    let w = triangle.x * matrice[0][3] + triangle.y * matrice[1][3] + triangle.z * matrice[2][3] + matrice[3][3];

    if (w !==0.0){
        o.x /= w; o.y /= w; o.z /=w;
    }

    return o;
}

function drawCube(triangles) {
    for (let triangle of triangles) {
        drawTriangle(triangle);
    }
}

//Matrice de rotation
function rotation_x(angle=0.1) {
    return [
        [1, 0, 0, 0],
        [0, Math.cos(angle), Math.sin(angle),0],
        [0, -Math.sin(angle), Math.cos(angle),0],
        [0, 0, 0, 1]
    ];
}

function drawTriangle(triangle) {

    let projectionMatrix = [
        [aspectRatio*fovRad,0,0,0],
        [0,fovRad,0,0],
        [0,0,zfar/(zfar-znear),1],
        [0,0,(-zfar*znear)/(zfar-znear),0]
    ];

    //@TODO Y'a un problème avec ma matrice de rotation
    triangle.pos[0] = multiplication(rotation_x(), triangle.pos[0]);
    triangle.pos[1] = multiplication(rotation_x(), triangle.pos[1]);
    triangle.pos[2] = multiplication(rotation_x(), triangle.pos[2]);

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

    if(true) {
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

            ctx.strokeStyle = 'rgba(68,255,0,0.5)';
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
        }
    }
}

let cube = new CubeMesh;
cube.create(new Vector3D(0,0,3), 1,1,2);