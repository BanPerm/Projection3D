const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// Initialisation de la fenêtre
const width = window.innerWidth;
const height = window.innerHeight;
canvas.width = width - 50;
canvas.height = height - 50;

//Definition de mes classes de base


//Le triangle est la forme 2D la plus simple permetant donc de représenter n'importe quelle forme
class Triangle {
    constructor(p1, p2, p3) {
        this.p = [p1, p2, p3];
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

    create(base=[0,0,0], longueur=1, largeur=1, profondeur=1) {
        let cube = new Mesh();
        let x = base[0];
        let y = base[1];
        let z = base[2];
        longueur = x + longueur;
        largeur = y + largeur;
        profondeur = z + profondeur;
        cube.pos = [
            //Devant
            new Triangle([x, y, z], [x, largeur, z], [longueur, largeur, z]),
            new Triangle([x, y, z], [longueur, largeur, z], [longueur, y, z]),

            //Derrière
            new Triangle([longueur, y, profondeur], [longueur, largeur, profondeur], [x, largeur, profondeur]),
            new Triangle([longueur, y, profondeur], [x, largeur, profondeur], [x, y, profondeur]),

            //Gauche
            new Triangle([longueur, y, z], [longueur, largeur, z], [longueur, largeur, profondeur]),
            new Triangle([longueur, y, z], [longueur, largeur, profondeur], [longueur, y, profondeur]),

            //Droite
            new Triangle([x, y, profondeur], [x, largeur, profondeur], [x, largeur, z]),
            new Triangle([x, y, profondeur], [x, largeur, z], [x, y, z]),

            //Haut
            new Triangle([x, largeur, z], [x, largeur, profondeur], [longueur, largeur, profondeur]),
            new Triangle([x, largeur, z], [longueur, largeur, profondeur], [longueur, largeur, z]),

            //Bas
            new Triangle([longueur, y, profondeur], [x, y, profondeur], [x, y, z]),
            new Triangle([longueur, y, profondeur], [x, y, z], [longueur, y, z]),
        ];
        this.mesh = cube;
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

function drawCube(triangles) {
    for (let triangle of triangles) {
        drawTriangle(triangle);
    }
}

function drawTriangle(triangle) {
    for (let i = 0; i < 3; i++) {
        let p1 = triangle.pos[i];
        let p2 = triangle.pos[(i + 1) % 3];

        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
    }
}
