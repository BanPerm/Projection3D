const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// Initialisation de la caméra
const camera = {
    position: { x: 0, y: 0, z: 5 },
    rotation: { angle_x: 0, angle_y: 0, angle_z: 0 },
    direction: { x: 0, y: 0, z: -1 } // Vecteur direction initial
};

// Initialisation de la fenêtre
const width = window.innerWidth;
const height = window.innerHeight;
canvas.width = width - 50;
canvas.height = height - 50;

// Variables de mouvement
let avancer = false;
let reculer = false;
let gauche = false;
let droite = false;
let up = false;
let down = false;

// Mouvement de la souris
let mouseX = 0;
let mouseY = 0;

// Facteur de grossissement
const scale = 300;
angle_x = 0
angle_y = 0
angle_z = 0

//Savoir si le souris est lock
let locked = false;


//Afficher Information Camera
const infoDiv = document.getElementById('info');

function updateCameraInfo() {
    const positionText = `Position: x=${camera.position.x.toFixed(2)}, y=${camera.position.y.toFixed(2)}, z=${camera.position.z.toFixed(2)}`;
    const rotationText = `Rotation: x=${camera.rotation.angle_x.toFixed(2)}, y=${camera.rotation.angle_y.toFixed(2)}, z=${camera.rotation.angle_z.toFixed(2)}`;
    infoDiv.innerHTML = `${positionText}<br>${rotationText}`;
}

// Positionnement de mon objet de base
const base = [(width / 2), (height / 2)];

// Création de mes objets de test
const points = [
    [[-1], [-1], [1]],
    [[1], [-1], [1]],
    [[1], [1], [1]],
    [[-1], [1], [1]],
    [[-1], [-1], [-1]],
    [[1], [-1], [-1]],
    [[1], [1], [-1]],
    [[-1], [1], [-1]]
];

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

function rotation(points, angle_x, angle_y, angle_z, camera) {
    const projected_points = [];

    points.forEach(point => {
        // Convertir le point en coordonnées homogènes pour la translation
        const translated_point = [
            [point[0][0] - camera.position.x],
            [point[1][0] - camera.position.y],
            [point[2][0] - camera.position.z]
        ];

        let rotated_2d = translated_point;

        // Appliquer les rotations inverses des angles de la caméra
        rotated_2d = matrixProduct(rotation_z(-camera.rotation.angle_z), rotated_2d);
        rotated_2d = matrixProduct(rotation_y(-camera.rotation.angle_y), rotated_2d);
        rotated_2d = matrixProduct(rotation_x(-camera.rotation.angle_x), rotated_2d);

        // Appliquer ensuite les rotations locales du cube
        rotated_2d = matrixProduct(rotation_x(angle_x), rotated_2d);
        rotated_2d = matrixProduct(rotation_y(angle_y), rotated_2d);
        rotated_2d = matrixProduct(rotation_z(angle_z), rotated_2d);

        // Vérifier si le point est devant la caméra
        if (rotated_2d[2][0] < camera.position.z) {
            // Calculer la projection en perspective
            const z = 1 / (camera.position.z - rotated_2d[2][0]);
            const projection_matrix = [
                [z, 0, 0],
                [0, z, 0]
            ];
            const homogeneous_point = matrixProduct(projection_matrix, rotated_2d);

            const x = Math.floor(homogeneous_point[0][0] * scale) + base[0];
            const y = Math.floor(homogeneous_point[1][0] * scale) + base[1];

            projected_points.push([x, y]);
        } else {
            // Si le point est derrière la caméra, pousser une valeur non définie
            projected_points.push(undefined);
        }
    });

    return projected_points;
}

function drawFace(points, indices, color) {
    // Vérifier que tous les indices sont valides
    if (indices.every(index => points[index] !== undefined)) {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(points[indices[0]][0], points[indices[0]][1]);
        indices.slice(1).forEach(index => {
            ctx.lineTo(points[index][0], points[index][1]);
        });
        ctx.closePath();
        ctx.fill();
    }
}

function drawLine(point1, point2, color) {
    // Vérifier que les points sont valides
    if (point1 !== undefined && point2 !== undefined) {
        ctx.strokeStyle = color;
        ctx.beginPath();
        ctx.moveTo(point1[0], point1[1]);
        ctx.lineTo(point2[0], point2[1]);
        ctx.stroke();
    }
}

function drawPoint(points, angle_x, angle_y, angle_z) {
    ctx.clearRect(0, 0, canvas.width, canvas.height); // Effacer le canvas

    // Rotation et projection des points
    const projected_points = rotation(points, angle_x, angle_y, angle_z, camera);

    // Dessiner les faces du cube
    const faces = [
        [0, 1, 2, 3], // front face
        [4, 5, 6, 7], // back face
        [0, 1, 5, 4], // bottom face
        [2, 3, 7, 6], // top face
        [0, 3, 7, 4], // left face
        [1, 2, 6, 5]  // right face
    ];

    const colors = ['rgba(255, 0, 0, 0.5)', 'rgba(0, 255, 0, 0.5)', 'rgba(0, 0, 255, 0.5)',
                    'rgba(255, 255, 0, 0.5)', 'rgba(0, 255, 255, 0.5)', 'rgba(255, 0, 255, 0.5)'];

    faces.forEach((face, index) => {
        drawFace(projected_points, face, colors[index]);
    });

    // Dessiner les arêtes du cube
    for (let m = 0; m < 4; m++) {
        drawLine(projected_points[m], projected_points[(m + 1) % 4], 'black');
        drawLine(projected_points[m + 4], projected_points[(m + 1) % 4 + 4], 'black');
        drawLine(projected_points[m], projected_points[m + 4], 'black');
    }
}

function updateCameraView() {
    console.log(camera.position.x)
    updateCameraInfo();
    drawPoint(points, angle_x, angle_y, angle_z);
}

function moveCamera() {
    const speed = 0.1; // Vitesse de déplacement

    if (avancer) {
        camera.position.z += camera.direction.z * speed;
        camera.position.x += camera.direction.x * speed;
    }
    if (reculer) {
        camera.position.z -= camera.direction.z * speed;
        camera.position.x -= camera.direction.x * speed;
    }
    if (gauche) {
        camera.position.x -= Math.cos(camera.rotation.angle_y) * speed * 3;
        camera.position.z -= Math.sin(camera.rotation.angle_y) * speed * 3;
    }
    if (droite) {
        camera.position.x += Math.cos(camera.rotation.angle_y) * speed * 3;
        camera.position.z += Math.sin(camera.rotation.angle_y) * speed * 3;
    }
    if (up) camera.position.y += speed * 3;
    if (down) camera.position.y -= speed * 3;

    updateCameraView();
    requestAnimationFrame(moveCamera);
}

// Écouteur pour les touches de déplacement
document.addEventListener('keydown', (event) => {
    switch (event.key) {
        case 'z': // Avancer
            avancer = true;
            break;
        case 's': // Reculer
            reculer = true;
            break;
        case 'q': // Aller à gauche
            gauche = true;
            break;
        case 'd': // Aller à droite
            droite = true;
            break;
        case ' ': // Monter
            up = true;
            break;
        case 'Control': // Descendre
            down = true;
            break;
        }
    });
    
document.addEventListener('keyup', (event) => {
    switch (event.key) {
        case 'z': // Avancer
            avancer = false;
            break;
        case 's': // Reculer
            reculer = false;
            break;
        case 'q': // Aller à gauche
            gauche = false;
            break;
        case 'd': // Aller à droite
            droite = false;
            break;
        case ' ': // Monter
            up = false;
            break;
        case 'Control': // Descendre
            down = false;
            break;
    }
});


// Écouteur pour le mouvement de la souris
canvas.addEventListener('mousemove', (event) => {
    mouseX = event.clientX;
    mouseY = event.clientY;
});


// Fonction pour mettre à jour la position et la rotation des objets en fonction de la souris
function updateObjects() {
    // Utiliser movementX et movementY lorsque la souris est verrouillée
    const dx = locked ? movementX : mouseX - camera.position.x;
    const dy = locked ? movementY : mouseY - camera.position.y;

    // Calculer les angles de rotation pour orienter les objets autour de la caméra
    const angle_x = Math.atan2(dy, camera.position.z) + Math.PI / 2;
    const angle_y = Math.atan2(dx, camera.position.z) + Math.PI / 2;

    // Mettre à jour les rotations de la caméra
    camera.rotation.angle_x = angle_x;
    camera.rotation.angle_y = angle_y;

    // Mettre à jour la vue
    updateCameraView();

    // Requête pour animer en boucle
    requestAnimationFrame(updateObjects);
}



// Fonction pour gérer le verrouillage/déverrouillage de la souris
function toggleMouseLock() {
    const canvas = document.getElementById('canvas');

    // Verrouiller la souris quand on clique sur le canvas
    canvas.addEventListener('click', () => {
        canvas.requestPointerLock();
    });

    // Déverrouiller la souris quand la touche "Escape" est pressée
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            document.exitPointerLock();
        }
    });

    // Gestionnaire d'événement pour vérifier l'état de verrouillage de la souris
    document.addEventListener('pointerlockchange', () => {
        locked = document.pointerLockElement === canvas; // Met à jour l'état de verrouillage
        if (locked) {
            console.log('Mouse locked inside canvas.');
        } else {
            console.log('Mouse unlocked.');
        }
    });

    // Gestionnaire d'événement pour obtenir movementX et movementY lorsque la souris est verrouillée
    canvas.addEventListener('mousemove', (event) => {
        if (locked) {
            movementX = event.movementX || event.mozMovementX || event.webkitMovementX || 0;
            movementY = event.movementY || event.mozMovementY || event.webkitMovementY || 0;
        } else {
            mouseX = event.clientX;
            mouseY = event.clientY;
        }
    });
}

    
// Appel initial pour dessiner le cube
updateCameraView();
    
// Pour gérer les mouvements de la caméra
moveCamera();

//Gérer mouvement souris
updateObjects();

//Lock la souris
toggleMouseLock();
    