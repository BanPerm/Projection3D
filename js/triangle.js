import { Vector3D } from "./math.js";

// Coordonnées de texture d'un sommet. Classe séparée de Vector3D (pas besoin
// de z/w ici) mais avec la même logique de pooling/mutation en place.
export class UV {
    constructor(u = 0, v = 0) {
        this.u = u;
        this.v = v;
    }

    copy(uv) {
        this.u = uv.u;
        this.v = uv.v;
        return this;
    }

    set(u, v) {
        this.u = u;
        this.v = v;
        return this;
    }
}

export class Triangle {
    constructor(p1, p2, p3, uv1, uv2, uv3, n1, n2, n3) {
        this.pos = [
            p1 || new Vector3D(),
            p2 || new Vector3D(),
            p3 || new Vector3D()
        ];
        // UV par défaut à (0,0) : un mesh sans coordonnées de texture reste
        // valide, il utilisera simplement le rendu couleur plate existant.
        this.uv = [
            uv1 || new UV(),
            uv2 || new UV(),
            uv3 || new UV()
        ];
        // Normale par sommet (Gouraud). Par défaut (0,0,-1) : si jamais un
        // triangle est construit sans normales explicites, ça reste une
        // valeur unitaire valide plutôt qu'un vecteur nul qui casserait
        // le calcul de lumière (dot product avec un vecteur nul = 0 partout).
        this.normal = [
            n1 || new Vector3D(0, 0, -1),
            n2 || new Vector3D(0, 0, -1),
            n3 || new Vector3D(0, 0, -1)
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
        this.uv[0].copy(triangle.uv[0]);
        this.uv[1].copy(triangle.uv[1]);
        this.uv[2].copy(triangle.uv[2]);
        this.normal[0].copy(triangle.normal[0]);
        this.normal[1].copy(triangle.normal[1]);
        this.normal[2].copy(triangle.normal[2]);
        this.color = triangle.color;
        return this;
    }

    set(p1, p2, p3) {
        this.pos[0].copy(p1);
        this.pos[1].copy(p2);
        this.pos[2].copy(p3);
        return this;
    }

    setUV(uv1, uv2, uv3) {
        this.uv[0].copy(uv1);
        this.uv[1].copy(uv2);
        this.uv[2].copy(uv3);
        return this;
    }

    setNormals(n1, n2, n3) {
        this.normal[0].copy(n1);
        this.normal[1].copy(n2);
        this.normal[2].copy(n3);
        return this;
    }
}