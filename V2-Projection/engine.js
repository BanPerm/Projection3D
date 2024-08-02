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


class Vector2D{
    constructor(u=0, v=0) {
        this.u = u;
        this.v = v;
    }
}

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

    static intersectPlane(plane_p, plane_n, lineStart, lineEnd) {
        plane_n.normalise();
        let plane_d = -Vector3D.dotProductVector(plane_n, plane_p);
        let ad = Vector3D.dotProductVector(lineStart, plane_n);
        let bd = Vector3D.dotProductVector(lineEnd, plane_n);
        let t = (-plane_d - ad) / (bd - ad);
        let lineStartToEnd = Vector3D.substractVector(lineEnd, lineStart);
        let lineToIntersect = Vector3D.multiplyVector(lineStartToEnd, t);
        let intersectionPoint = Vector3D.addVector3D(lineStart, lineToIntersect);
        return { point: intersectionPoint, t: t };
    }


    static clipAgainstPlane(plane_p, plane_n, in_tri, out_tri1, out_tri2){
        plane_n.normalise();

        function dist(p) {
            //p.normalise();
            return (plane_n.x * p.x + plane_n.y * p.y + plane_n.z * p.z - Vector3D.dotProductVector(plane_n, plane_p));
        }

        let inside_points = [];
        let outside_points = [];
        let inside_tex = [];
        let outside_tex = [];

        let d0 = dist(in_tri.pos[0]);
        let d1 = dist(in_tri.pos[1]);
        let d2 = dist(in_tri.pos[2]);

        if (d0 >= 0) { inside_points.push(in_tri.pos[0]); inside_tex.push(in_tri.texture[0]); } else { outside_points.push(in_tri.pos[0]); outside_tex.push(in_tri.texture[0]); }
        if (d1 >= 0) { inside_points.push(in_tri.pos[1]); inside_tex.push(in_tri.texture[1]); } else { outside_points.push(in_tri.pos[1]); outside_tex.push(in_tri.texture[1]);}
        if (d2 >= 0) { inside_points.push(in_tri.pos[2]); inside_tex.push(in_tri.texture[2]);} else { outside_points.push(in_tri.pos[2]); outside_tex.push(in_tri.texture[2]);}

        console.log(in_tri.texture);

        if (inside_points.length === 0) {
            return 0;
        }

        if (inside_points.length === 3) {
            out_tri1.pos = in_tri.pos;
            out_tri1.color = in_tri.color;
            return 1;
        }

        if (inside_points.length === 1 && outside_points.length === 2) {
            out_tri1.pos[0] = inside_points[0];
            out_tri1.color = in_tri.color;

            out_tri1.texture[0] = inside_tex[0];

            let t;
            let result;

            result = Vector3D.intersectPlane(plane_p, plane_n, inside_points[0], outside_points[0]);
            out_tri1.pos[1] = result.point;
            t = result.t;

            out_tri1.texture[1].u = t * (outside_tex[0].u - inside_tex[0].u) + inside_tex[0].u;
            out_tri1.texture[1].v = t * (outside_tex[0].v - inside_tex[0].v) + inside_tex[0].v;

            result = Vector3D.intersectPlane(plane_p, plane_n, inside_points[0], outside_points[1],t);
            out_tri1.pos[2] =  result.point;
            t = result.t;

            out_tri1.texture[2].u = t * (outside_tex[1].u - inside_tex[0].u) + inside_tex[0].u;
            out_tri1.texture[2].v = t * (outside_tex[1].v - inside_tex[0].v) + inside_tex[0].v;

            return 1;
        }

        if (inside_points.length === 2 && outside_points.length === 1) {
            out_tri1.color = in_tri.color;
            out_tri2.color = in_tri.color;

            out_tri1.pos[0] = inside_points[0];
            out_tri1.pos[1] = inside_points[1];

            out_tri1.texture[0] = inside_tex[0];
            out_tri1.texture[1] = inside_tex[1];

            let result;
            let t;

            result = Vector3D.intersectPlane(plane_p, plane_n, inside_points[0], outside_points[0]);

            out_tri1.pos[2] = result.point;
            t = result.t;

            out_tri2.pos[0] = inside_points[1];
            out_tri2.pos[1] = out_tri1.pos[2];

            out_tri2.texture[0] = inside_tex[1];
            out_tri2.texture[1] = out_tri1.texture[2];


            result = Vector3D.intersectPlane(plane_p, plane_n, inside_points[1], outside_points[0]);
            out_tri2.pos[2] = result.point;
            t = result.t;

            return 2;
        }

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

    static matriceAtPoint(pos,target,up){

        let forward = Vector3D.substractVector(target,pos);
        forward.normalise();

        let u = Vector3D.multiplyVector(forward, Vector3D.dotProductVector(up, forward));
        let newUp = Vector3D.substractVector(up, u);
        newUp.normalise();

        let right = Vector3D.crossProduct(newUp,forward);

        return [[right.x, right.y, right.z, 0],
            [newUp.x, newUp.y, newUp.z, 0],
            [forward.x, forward.y, forward.z, 0],
            [pos.x, pos.y, pos.z, 1]];
    }

    static matriceQuickInverse(m){
        let f = -(m[3][0] * m[0][0] + m[3][1] * m[0][1] + m[3][2] * m[0][2]);
        let s = -(m[3][0] * m[1][0] + m[3][1] * m[1][1] + m[3][2] * m[1][2]);
        let t = -(m[3][0] * m[2][0] + m[3][1] * m[2][1] + m[3][2] * m[2][2]);
        return [[m[0][0], m[1][0], m[2][0], 0],
            [m[0][1], m[1][1], m[2][1], 0],
            [m[0][2], m[1][2], m[2][2], 0],
            [f, s, t, 1]];
    }


}

class Triangle {
    constructor(p1=new Vector3D(), p2=new Vector3D(), p3=new Vector3D(), t1=new Vector2D(), t2=new Vector2D(), t3=new Vector2D()) {
        this.pos = [p1, p2, p3];
        this.color = 'white';
        this.texture = [t1, t2, t3];
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
        // try {
        //     //await this.mesh.loadFromObjectFile("object/VideoShip.obj");
        //     await this.mesh.loadFromObjectFile("object/mountains.obj");
        //     this.initialMesh.pos = this.mesh.pos.map(tri =>
        //         new Triangle(
        //             new Vector3D(tri.pos[0].x, tri.pos[0].y, tri.pos[0].z),
        //             new Vector3D(tri.pos[1].x, tri.pos[1].y, tri.pos[1].z),
        //             new Vector3D(tri.pos[2].x, tri.pos[2].y, tri.pos[2].z)
        //         )
        //     );
        //
        //     console.log(this.mesh.pos);
        // } catch (error) {
        //     console.error('Failed to create mesh:', error);
        // }

        this.initialMesh.pos = [
            // SOUTH
            new Triangle(
                new Vector3D(0, 0, 0, 1),
                new Vector3D(0, 1, 0, 1),
                new Vector3D(1, 1, 0, 1),
                new Vector2D(0, 1),
                new Vector2D(0, 0),
                new Vector2D(1, 0)
            ),
            new Triangle(
                new Vector3D(0, 0, 0, 1),
                new Vector3D(1, 1, 0, 1),
                new Vector3D(1, 0, 0, 1),
                new Vector2D(0, 1),
                new Vector2D(1, 0),
                new Vector2D(1, 1)
            ),

            // EAST
            new Triangle(
                new Vector3D(1, 0, 0, 1),
                new Vector3D(1, 1, 0, 1),
                new Vector3D(1, 1, 1, 1),
                new Vector2D(0, 1),
                new Vector2D(0, 0),
                new Vector2D(1, 0)
            ),
            new Triangle(
                new Vector3D(1, 0, 0, 1),
                new Vector3D(1, 1, 1, 1),
                new Vector3D(1, 0, 1, 1),
                new Vector2D(0, 1),
                new Vector2D(1, 0),
                new Vector2D(1, 1)
            ),

            // NORTH
            new Triangle(
                new Vector3D(1, 0, 1, 1),
                new Vector3D(1, 1, 1, 1),
                new Vector3D(0, 1, 1, 1),
                new Vector2D(0, 1),
                new Vector2D(0, 0),
                new Vector2D(1, 0)
            ),
            new Triangle(
                new Vector3D(1, 0, 1, 1),
                new Vector3D(0, 1, 1, 1),
                new Vector3D(0, 0, 1, 1),
                new Vector2D(0, 1),
                new Vector2D(1, 0),
                new Vector2D(1, 1)
            ),

            // WEST
            new Triangle(
                new Vector3D(0, 0, 1, 1),
                new Vector3D(0, 1, 1, 1),
                new Vector3D(0, 1, 0, 1),
                new Vector2D(0, 1),
                new Vector2D(0, 0),
                new Vector2D(1, 0)
            ),
            new Triangle(
                new Vector3D(0, 0, 1, 1),
                new Vector3D(0, 1, 0, 1),
                new Vector3D(0, 0, 0, 1),
                new Vector2D(0, 1),
                new Vector2D(1, 0),
                new Vector2D(1, 1)
            ),

            // TOP
            new Triangle(
                new Vector3D(0, 1, 0, 1),
                new Vector3D(0, 1, 1, 1),
                new Vector3D(1, 1, 1, 1),
                new Vector2D(0, 1),
                new Vector2D(0, 0),
                new Vector2D(1, 0)
            ),
            new Triangle(
                new Vector3D(0, 1, 0, 1),
                new Vector3D(1, 1, 1, 1),
                new Vector3D(1, 1, 0, 1),
                new Vector2D(0, 1),
                new Vector2D(1, 0),
                new Vector2D(1, 1)
            ),

            // BOTTOM
            new Triangle(
                new Vector3D(1, 0, 1, 1),
                new Vector3D(0, 0, 1, 1),
                new Vector3D(0, 0, 0, 1),
                new Vector2D(0, 1),
                new Vector2D(0, 0),
                new Vector2D(1, 0)
            ),
            new Triangle(
                new Vector3D(1, 0, 1, 1),
                new Vector3D(0, 0, 0, 1),
                new Vector3D(1, 0, 0, 1),
                new Vector2D(0, 1),
                new Vector2D(1, 0),
                new Vector2D(1, 1)
            )
        ];

    }

    reset() {
        this.mesh.pos = this.initialMesh.pos.map(tri =>
            new Triangle(
                new Vector3D(tri.pos[0].x, tri.pos[0].y, tri.pos[0].z),
                new Vector3D(tri.pos[1].x, tri.pos[1].y, tri.pos[1].z),
                new Vector3D(tri.pos[2].x, tri.pos[2].y, tri.pos[2].z),
                new Vector2D(tri.texture[0].u, tri.texture[0].v),
                new Vector2D(tri.texture[1].u, tri.texture[1].v),
                new Vector2D(tri.texture[2].u, tri.texture[2].v)
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

    let up = new Vector3D(0,-1,0);
    let target = new Vector3D(0,0,1);
    let cameraRot = rotation_y(yaw);
    lookDirection = Matrice.matriceMultiplyVector(cameraRot, target);
    target = Vector3D.addVector3D(camera, lookDirection);

    let matCamera = Matrice.matriceAtPoint(camera,target,up);
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

        let vCameraRay = Vector3D.substractVector(triangle.pos[0], camera);

        // Product Dot pour vérifier si le triangle est bien visible
        if (Vector3D.dotProductVector(normal, vCameraRay) < 0) {

            // Ajout d'un système de light
            let light_direction = new Vector3D(0, 0, -1);
            light_direction.normalise();

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
                    Matrice.matriceMultiplyVector(projectionMatrix, clipped[n].pos[2]),
                    clipped[n].texture[0],
                    clipped[n].texture[1],
                    clipped[n].texture[2]
                );

                projected_triangle.pos[0] = Vector3D.divideVector(projected_triangle.pos[0], projected_triangle.pos[0].w);
                projected_triangle.pos[1] = Vector3D.divideVector(projected_triangle.pos[1], projected_triangle.pos[1].w);
                projected_triangle.pos[2] = Vector3D.divideVector(projected_triangle.pos[2], projected_triangle.pos[2].w);

                if(clipped[n].color!=='white'){
                    projected_triangle.color = clipped[n].color;
                }
                else{
                    projected_triangle.color = getColour(dp);
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
}

function sortTriangles() {
    triangleToShow.sort((t1, t2) => {
        const z1 = (t1.pos[0].z + t1.pos[1].z + t1.pos[2].z) / 3.0;
        const z2 = (t2.pos[0].z + t2.pos[1].z + t2.pos[2].z) / 3.0;
        return z2 - z1;
    });
    drawTriangles();
}

// function drawTriangles() {
//     for(let projected_triangle of triangleToShow) {
//         ctx.beginPath();
//         ctx.moveTo(projected_triangle.pos[0].x, projected_triangle.pos[0].y);
//         ctx.lineTo(projected_triangle.pos[1].x, projected_triangle.pos[1].y);
//         ctx.lineTo(projected_triangle.pos[2].x, projected_triangle.pos[2].y);
//         ctx.closePath();
//
//         ctx.fillStyle = projected_triangle.color;
//         ctx.strokeStyle = projected_triangle.color;
//         ctx.fill();
//         ctx.stroke();
//     }
// }

function drawTriangles() {
    for(let projected_triangle of triangleToShow) {
        let listTriangles = [];
        listTriangles.push(projected_triangle);

        let nNewTriangles = 1;

        // Clipping against four edges of the screen
        for (let p = 0; p < 4; p++) {
            let nTrisToAdd = 0;
            let newListTriangles = [];

            while (nNewTriangles > 0) {
                let test = listTriangles.shift();
                nNewTriangles--;

                let clipped = [new Triangle(), new Triangle()];
                switch (p) {
                    case 0: // Top
                        nTrisToAdd = Vector3D.clipAgainstPlane(new Vector3D(0, 0, 0), new Vector3D(0, 1, 0), test, clipped[0], clipped[1]);
                        break;
                    case 1: // Bottom
                        nTrisToAdd = Vector3D.clipAgainstPlane(new Vector3D(0, (height-50)-1, 0), new Vector3D(0, -1, 0), test, clipped[0], clipped[1]);
                        break;
                    case 2: // Left
                        nTrisToAdd = Vector3D.clipAgainstPlane(new Vector3D(0, 0, 0), new Vector3D(1, 0, 0), test, clipped[0], clipped[1]);
                        break;
                    case 3: // Right
                        nTrisToAdd = Vector3D.clipAgainstPlane(new Vector3D((width-50)-1, 0, 0), new Vector3D(-1, 0, 0), test, clipped[0], clipped[1]);
                        break;
                }

                for (let w = 0; w < nTrisToAdd; w++) {
                    if(clipped[w].color==='white'){
                        clipped[w].color = projected_triangle.color;
                    }
                    newListTriangles.push(clipped[w]);
                }
            }

            listTriangles = newListTriangles;
            nNewTriangles = listTriangles.length;
        }

        // Draw each triangle
        for (let t of listTriangles) {
            fillTriangle(t);
        }
    }
}

// Exemple de fonction pour remplir un triangle
function fillTriangle(triangle) {
    ctx.beginPath();
    ctx.moveTo(triangle.pos[0].x, triangle.pos[0].y);
    ctx.lineTo(triangle.pos[1].x, triangle.pos[1].y);
    ctx.lineTo(triangle.pos[2].x, triangle.pos[2].y);
    ctx.closePath();
    // ctx.fillStyle = triangle.color;
    // ctx.fill();
    // ctx.strokeStyle = triangle.color;
    ctx.strokeStyle = 'white';
    ctx.stroke();
}

var camera = new Vector3D();
var lookDirection = new Vector3D();
var yaw=0

// FPS variables
let frameCount = 0;
let lastTime = performance.now();
let lastTimeFPS = performance.now();
let fps = 0;

let normalSpeed = 16;
let boostedSpeed = 64;
let speed = normalSpeed;
let keys = {};

let sensitivity = 0.01;
let isPointerLocked = false;

function handleMouseMove(event) {
    if (isPointerLocked) {
        const deltaX = event.movementX || event.mozMovementX || 0;

        yaw += deltaX * sensitivity;
    }
}

canvas.addEventListener('click', () => {
    canvas.requestPointerLock = canvas.requestPointerLock || canvas.mozRequestPointerLock;
    canvas.requestPointerLock();
});

// Écouter les événements de changement d'état du verrouillage du curseur
document.addEventListener('pointerlockchange', () => {
    isPointerLocked = (document.pointerLockElement === canvas || document.mozPointerLockElement === canvas);
});

// Écouter les mouvements de la souris lorsque le curseur est verrouillé
document.addEventListener('mousemove', handleMouseMove);

window.addEventListener('keydown', function(e) {
    keys[e.key.toLowerCase()] = true;
    e.preventDefault();
});

window.addEventListener('keyup', function(e) {
    keys[e.key.toLowerCase()] = false;
    e.preventDefault();
});

function updateCamera(fElapsedTime) {
    if (keys['shift']) {
        speed = boostedSpeed;
    } else {
        speed = normalSpeed;
    }

    let forward = Vector3D.multiplyVector(lookDirection, speed * fElapsedTime);

    // Mouvement vertical
    if (keys[' ']) {
        camera.y += speed * fElapsedTime; // Déplace vers le haut
    }
    if (keys['control']) {
        camera.y -= speed * fElapsedTime; // Déplace vers le bas
    }

    // Mouvement avant/arrière
    if (keys['z']) {
        camera = Vector3D.addVector3D(camera, forward);
    }
    if (keys['s']) {
        camera = Vector3D.substractVector(camera, forward);
    }

    // Mouvement gauche/droite
    if (keys['q']) {
        camera.x += speed * fElapsedTime; // Déplace à gauche
    }
    if (keys['d']) {
        camera.x -= speed * fElapsedTime; // Déplace à droite
    }
}


function animate() {
    const currentTime = performance.now();
    const deltaTime = (currentTime - lastTime) / 1000;
    lastTime = currentTime;
    ctx.clearRect(0, 0, width, height);
    triangleToShow = [];

    mesh.draw(0,0, 0);

    updateCamera(deltaTime);

    sortTriangles();


    // Calcul des FPS
    frameCount++;
    if (currentTime > lastTimeFPS + 1000) {
        fps = Math.round((frameCount * 1000) / (currentTime - lastTimeFPS));
        frameCount = 0;
        lastTimeFPS = currentTime;
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

