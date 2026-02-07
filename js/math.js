// Définition de mes classes de base

export class Vector3D {
    constructor(x=0, y=0, z=0,w=1) {
        this.x = x;
        this.y = y;
        this.z = z;
        this.w = w;
    }

    //Outil pour la mémoire
    copy(vector) {
        this.x = vector.x;
        this.y = vector.y;
        this.z = vector.z;
        this.w = vector.w;
        return this;
    }

    clone() {
        return new Vector3D(this.x, this.y, this.z, this.w);
    }

    set(x, y, z,w=1) {
        this.x = x;
        this.y = y;
        this.z = z;
        this.w = w;
        return this;
    }

    //Opération mathématique

    add(vector){
        this.x += vector.x;
        this.y += vector.y;
        this.z += vector.z;
        return this;
    }

    sub(vector){
        this.x -= vector.x;
        this.y -= vector.y;
        this.z -= vector.z;
        return this;
    }

    multiply(scalar){
        this.x *= scalar;
        this.y *= scalar;
        this.z *= scalar;
        return this;
    }

    divide(scalar){
        if (scalar !== 0) {
            const inv = 1 / scalar; // Multiplication est plus rapide que division
            this.x *= inv;
            this.y *= inv;
            this.z *= inv;
        }
        return this;
    }

    normalise(){
        let l = this.lengthVector();
        if (l > 0) {
            this.divide(l);
        }
        return this;
    }

    lengthVector() {
        return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
    }

    dotProduct(vector){
        return this.x * vector.x + this.y * vector.y + this.z * vector.z;
    }

    //Static Method

    static add(v1, v2, out = new Vector3D()) {
        out.x = v1.x + v2.x;
        out.y = v1.y + v2.y;
        out.z = v1.z + v2.z;
        return out;
    }

    static sub(v1, v2, out = new Vector3D()) {
        out.x = v1.x - v2.x;
        out.y = v1.y - v2.y;
        out.z = v1.z - v2.z;
        return out;
    }

    static multiply(v1, scalar, out = new Vector3D()) {
        out.x = v1.x * scalar;
        out.y = v1.y * scalar;
        out.z = v1.z * scalar;
        return out;
    }

    static crossProduct(v1, v2, out = new Vector3D()) {
        const x = v1.y * v2.z - v1.z * v2.y;
        const y = v1.z * v2.x - v1.x * v2.z;
        const z = v1.x * v2.y - v1.y * v2.x;
        
        out.x = x;
        out.y = y;
        out.z = z;
        return out;
    }

    static dotProduct(v1, v2) {
        return v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
    }

    static intersectPlane(plane_p, plane_n, lineStart, lineEnd, out = new Vector3D()) {
        plane_n.normalise();
        let plane_d = -Vector3D.dotProduct(plane_n, plane_p);
        let ad = Vector3D.dotProduct(lineStart, plane_n);
        let bd = Vector3D.dotProduct(lineEnd, plane_n);

        let t = (-plane_d - ad) / (bd - ad);


        Vector3D.sub(lineEnd, lineStart, tempLineStartToEnd);
        Vector3D.multiply(tempLineStartToEnd, t, tempLineToIntersect);
        Vector3D.add(lineStart, tempLineToIntersect, out);
    
        return out;
    }

    static clipAgainstPlane(plane_p, plane_n, in_tri, out_tri1, out_tri2){
        plane_n.normalise();

        function dist(p) {
            return (plane_n.x * p.x + plane_n.y * p.y + plane_n.z * p.z - Vector3D.dotProduct(plane_n, plane_p));
        }

        let inside_points = [];
        let outside_points = [];

        let d0 = dist(in_tri.pos[0]);
        let d1 = dist(in_tri.pos[1]);
        let d2 = dist(in_tri.pos[2]);

        if (d0 >= 0) { inside_points.push(in_tri.pos[0]); } else { outside_points.push(in_tri.pos[0]); }
        if (d1 >= 0) { inside_points.push(in_tri.pos[1]); } else { outside_points.push(in_tri.pos[1]); }
        if (d2 >= 0) { inside_points.push(in_tri.pos[2]); } else { outside_points.push(in_tri.pos[2]); }

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

            Vector3D.intersectPlane(plane_p, plane_n, inside_points[0], outside_points[0], out_tri1.pos[1]);
            Vector3D.intersectPlane(plane_p, plane_n, inside_points[0], outside_points[1], out_tri1.pos[2]);

            return 1;
        }

        if (inside_points.length === 2 && outside_points.length === 1) {
            out_tri1.color = in_tri.color;
            out_tri2.color = in_tri.color;

            out_tri1.pos[0] = inside_points[0];
            out_tri1.pos[1] = inside_points[1];
            Vector3D.intersectPlane(plane_p, plane_n, inside_points[0], outside_points[0], out_tri1.pos[2]);

            out_tri2.pos[0] = inside_points[1];
            out_tri2.pos[1] = out_tri1.pos[2];
            Vector3D.intersectPlane(plane_p, plane_n, inside_points[1], outside_points[0], out_tri2.pos[2]);

            return 2;
        }

    }

}

const tempLineStartToEnd = new Vector3D();
const tempLineToIntersect = new Vector3D();
const tempResult = new Vector3D();

//Sert juste pour simplifier les opération sur les différentes matrices dans le code
export class Matrice{
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

        let forward = Vector3D.sub(target,pos);
        forward.normalise();

        let u = Vector3D.multiply(forward, Vector3D.dotProduct(up, forward));
        let newUp = Vector3D.sub(up, u);
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