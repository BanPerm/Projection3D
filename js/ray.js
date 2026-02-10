import { Vector3D } from "./math.js";

let edge1 = new Vector3D();
let edge2 = new Vector3D();
let h = new Vector3D();
let s = new Vector3D();
let q = new Vector3D();

export class Ray {
    constructor(origin, direction) {
        this.origin = origin;
        this.direction = direction;
    }

    //Algo de Möller-Trumbore
    intersectTriangle(triangle){
        let vertex0 = triangle.pos[0];
        let vertex1 = triangle.pos[1];
        let vertex2 = triangle.pos[2];
        Vector3D.sub(vertex1, vertex0, edge1);
        Vector3D.sub(vertex2, vertex0, edge2);
        Vector3D.crossProduct(this.direction, edge2, h);
        let a = Vector3D.dotProduct(edge1, h);
        if (a > -Number.EPSILON && a<Number.EPSILON){
            return false;
        }
        let f = 1/a;
        Vector3D.sub(this.origin, vertex0, s);
        let u = f* Vector3D.dotProduct(s,h);
        if (u<0 || u >1){
            return false;
        }
        Vector3D.crossProduct(s, edge1, q);
        let v = f* Vector3D.dotProduct(this.direction, q);
        if (v<0 || u+v>1){
            return false;
        }
        let t = f* Vector3D.dotProduct(edge2,q);
        return t > Number.EPSILON;
    }
}