import { CONFIG_OPTIONAL } from "./state.js";

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
        const plane_dot = Vector3D.dotProduct(plane_n, plane_p);
        const ad = Vector3D.dotProduct(lineStart, plane_n);
        const bd = Vector3D.dotProduct(lineEnd, plane_n);

        const t = (plane_dot - ad) / (bd - ad);

        const lineStartToEnd = Vector3D.sub(lineEnd, lineStart);
        const lineToIntersect = Vector3D.multiply(lineStartToEnd, t);

        out.x = lineStart.x + lineToIntersect.x;
        out.y = lineStart.y + lineToIntersect.y;
        out.z = lineStart.z + lineToIntersect.z;
        out.w = lineStart.w + (lineEnd.w - lineStart.w) * t;
    
        return out;
    }

    static clipAgainstPlane(plane_p, plane_n, in_tri, out_tri1, out_tri2) {
        const plane_dot = Vector3D.dotProduct(plane_n, plane_p);

        let inside_points = [];
        let outside_points = [];

        // On teste chaque point du triangle
        for (let i = 0; i < 3; i++) {
            const d = (plane_n.x * in_tri.pos[i].x + plane_n.y * in_tri.pos[i].y + plane_n.z * in_tri.pos[i].z - plane_dot);
            if (d >= 0) inside_points.push(in_tri.pos[i]);
            else outside_points.push(in_tri.pos[i]);
        }

        if (inside_points.length === 3) {
            out_tri1.copy(in_tri);
            return 1;
        }

        if (inside_points.length === 1 && outside_points.length === 2) {
            out_tri1.color = in_tri.color;

            if (CONFIG_OPTIONAL.color_is_activate){
                out_tri1.color = CONFIG_OPTIONAL.color_clipping_1;
            }
        
            out_tri1.pos[0].copy(inside_points[0]);
            Vector3D.intersectPlane(plane_p, plane_n, inside_points[0], outside_points[0], out_tri1.pos[1]);
            Vector3D.intersectPlane(plane_p, plane_n, inside_points[0], outside_points[1], out_tri1.pos[2]);
            return 1;
        }

        if (inside_points.length === 2 && outside_points.length === 1) {
            out_tri1.color = in_tri.color;
            out_tri2.color = in_tri.color;

            if (CONFIG_OPTIONAL.color_is_activate){
                out_tri1.color = CONFIG_OPTIONAL.color_clipping_2;
                out_tri2.color = CONFIG_OPTIONAL.color_clipping_3;
            }

            out_tri1.pos[0].copy(inside_points[0]);
            out_tri1.pos[1].copy(inside_points[1]);
            Vector3D.intersectPlane(plane_p, plane_n, inside_points[0], outside_points[0], out_tri1.pos[2]);

            out_tri2.pos[0].copy(inside_points[1]);
            out_tri2.pos[1].copy(out_tri1.pos[2]);
            Vector3D.intersectPlane(plane_p, plane_n, inside_points[1], outside_points[0], out_tri2.pos[2]);
            return 2;
        }
        return 0;
    }

}

const vForward = new Vector3D();
const vUp = new Vector3D();
const vRight = new Vector3D();
const vTemp = new Vector3D();

//Sert juste pour simplifier les opération sur les différentes matrices dans le code
export class Matrice{
    static create() {
        return new Float32Array(16);
    }

    static matriceMakeIdentity(out = new Float32Array(16)) {
        out.fill(0);
        out[0] = 1; out[5] = 1; out[10] = 1; out[15] = 1;
        return out;
    }

    static matriceMakeTranslation(x, y, z, out = new Float32Array(16)) {
        this.matriceMakeIdentity(out);
        out[12] = x;
        out[13] = y;
        out[14] = z;
        return out;
    }

    static matriceMultiplyVector(m, v, out = new Vector3D()) {
        const x = v.x, y = v.y, z = v.z, w = v.w;
        out.x = x * m[0] + y * m[4] + z * m[8]  + w * m[12];
        out.y = x * m[1] + y * m[5] + z * m[9]  + w * m[13];
        out.z = x * m[2] + y * m[6] + z * m[10] + w * m[14];
        out.w = x * m[3] + y * m[7] + z * m[11] + w * m[15];
        return out;
    }

    static matriceMultiplyMatrix(m1, m2, out = new Float32Array(16)) {
        const res = new Float32Array(16);
        res[0] = m1[0] * m2[0] + m1[4] * m2[1] + m1[8]  * m2[2]  + m1[12] * m2[3];
        res[1] = m1[1] * m2[0] + m1[5] * m2[1] + m1[9]  * m2[2]  + m1[13] * m2[3];
        res[2] = m1[2] * m2[0] + m1[6] * m2[1] + m1[10] * m2[2]  + m1[14] * m2[3];
        res[3] = m1[3] * m2[0] + m1[7] * m2[1] + m1[11] * m2[2]  + m1[15] * m2[3];
        res[4] = m1[0] * m2[4] + m1[4] * m2[5] + m1[8]  * m2[6]  + m1[12] * m2[7];
        res[5] = m1[1] * m2[4] + m1[5] * m2[5] + m1[9]  * m2[6]  + m1[13] * m2[7];
        res[6] = m1[2] * m2[4] + m1[6] * m2[5] + m1[10] * m2[6]  + m1[14] * m2[7];
        res[7] = m1[3] * m2[4] + m1[7] * m2[5] + m1[11] * m2[6]  + m1[15] * m2[7];
        res[8] = m1[0] * m2[8] + m1[4] * m2[9] + m1[8]  * m2[10] + m1[12] * m2[11];
        res[9] = m1[1] * m2[8] + m1[5] * m2[9] + m1[9]  * m2[10] + m1[13] * m2[11];
        res[10] = m1[2] * m2[8] + m1[6] * m2[9] + m1[10] * m2[10] + m1[14] * m2[11];
        res[11] = m1[3] * m2[8] + m1[7] * m2[9] + m1[11] * m2[10] + m1[15] * m2[11];
        res[12] = m1[0] * m2[12]+ m1[4] * m2[13]+ m1[8]  * m2[14] + m1[12] * m2[15];
        res[13] = m1[1] * m2[12]+ m1[5] * m2[13]+ m1[9]  * m2[14] + m1[13] * m2[15];
        res[14] = m1[2] * m2[12]+ m1[6] * m2[13]+ m1[10] * m2[14] + m1[14] * m2[15];
        res[15] = m1[3] * m2[12]+ m1[7] * m2[13]+ m1[11] * m2[14] + m1[15] * m2[15];
        out.set(res);
        return out;
    }

    static matriceAtPoint(pos,target,up,out = new Float32Array(16)){

        Vector3D.sub(target, pos, vForward);
        vForward.normalise();

        const dot = Vector3D.dotProduct(up, vForward);
        Vector3D.multiply(vForward, dot, vTemp);
        Vector3D.sub(up, vTemp, vUp);
        vUp.normalise();

        Vector3D.crossProduct(vUp, vForward, vRight);

        out[0] = vRight.x;  out[1] = vRight.y;  out[2] = vRight.z;  out[3] = 0;
        out[4] = vUp.x;     out[5] = vUp.y;     out[6] = vUp.z;     out[7] = 0;
        out[8] = vForward.x; out[9] = vForward.y; out[10] = vForward.z; out[11] = 0;
        out[12] = pos.x;    out[13] = pos.y;    out[14] = pos.z;    out[15] = 1;

        return out;
    }

    static matriceQuickInverse(m, out = new Float32Array(16)) {
        out[0] = m[0]; out[1] = m[4]; out[2] = m[8];  out[3] = 0;
        out[4] = m[1]; out[5] = m[5]; out[6] = m[9];  out[7] = 0;
        out[8] = m[2]; out[9] = m[6]; out[10] = m[10]; out[11] = 0;

        out[12] = -(m[12] * out[0] + m[13] * out[4] + m[14] * out[8]);
        out[13] = -(m[12] * out[1] + m[13] * out[5] + m[14] * out[9]);
        out[14] = -(m[12] * out[2] + m[13] * out[6] + m[14] * out[10]);
        out[15] = 1.0;

        return out;
    }

    static matriceMakeProjection(fovRad, aspectRatio, znear, zfar, out = new Float32Array(16)) {
        out.fill(0);
        out[0] = aspectRatio * fovRad;
        out[5] = fovRad;
        out[10] = zfar / (zfar - znear);
        out[11] = 1.0;
        out[14] = (-zfar * znear) / (zfar - znear);
        out[15] = 0.0;
        return out;
    }

    static matriceMakeRotationX(angle, out = new Float32Array(16)) {
        out.fill(0);
        const c = Math.cos(angle), s = Math.sin(angle);
        out[0] = 1; out[15] = 1;
        out[5] = c;  out[6] = s;
        out[9] = -s; out[10] = c;
        return out;
    }

    static matriceMakeRotationY(angle, out = new Float32Array(16)) {
        out.fill(0);
        const c = Math.cos(angle), s = Math.sin(angle);
        out[5] = 1; out[15] = 1;
        out[0] = c;  out[2] = -s;
        out[8] = s;  out[10] = c;
        return out;
    }

    static matriceMakeRotationZ(angle, out = new Float32Array(16)) {
        out.fill(0);
        const c = Math.cos(angle), s = Math.sin(angle);
        out[10] = 1; out[15] = 1;
        out[0] = c;  out[1] = s;
        out[4] = -s; out[5] = c;
        return out;
    }

}