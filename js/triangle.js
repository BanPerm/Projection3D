import { Vector3D } from "./math.js";

export class Triangle {
    constructor(p1, p2, p3) {
        this.pos = [
            p1 || new Vector3D(),
            p2 || new Vector3D(),
            p3 || new Vector3D()
        ];
        this.color = 'white';
    }

    //Systeme de pooling
    static pool = [];
    static poolIndex = 0;

    static getFromPool() {
        if (this.poolIndex >= this.pool.length) {
            this.pool.push(new Triangle());
        }
        return this.pool[this.poolIndex++];
    }

    static resetPool() {
        this.poolIndex = 0;
    }

    //Outil pour la mémoire
    copy(triangle) {
        this.pos[0].copy(triangle.pos[0]);
        this.pos[1].copy(triangle.pos[1]);
        this.pos[2].copy(triangle.pos[2]);
        this.color = triangle.color;
        return this;
    }

    set(p1, p2, p3) {
        this.pos[0].copy(p1);
        this.pos[1].copy(p2);
        this.pos[2].copy(p3);
        return this;
    }
}