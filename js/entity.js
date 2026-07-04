import { Matrice, Vector3D } from "./math.js";

// Matrices de travail réutilisées pour construire une matrice modèle
// (évite toute allocation lors de la reconstruction d'une transform "dirty")
const matRotX = Matrice.create();
const matRotY = Matrice.create();
const matRotZ = Matrice.create();
const matTrans = Matrice.create();
const matTemp = Matrice.create();

/**
 * Position + rotation (+ scale uniforme) d'un objet dans le monde.
 * Ne reconstruit sa matrice modèle que si elle a été modifiée depuis
 * la dernière frame (flag "dirty"), pour ne pas payer le coût de
 * reconstruction des matrices de rotation pour les objets statiques.
 */
export class Transform {
    constructor() {
        this.position = new Vector3D(0, 0, 0);
        this.rotation = new Vector3D(0, 0, 0); // angles d'Euler (radians)
        this.scale = 1;
        this._dirty = true;
    }

    setPosition(x, y, z) {
        this.position.set(x, y, z);
        this._dirty = true;
        return this;
    }

    setRotation(x, y, z) {
        this.rotation.set(x, y, z);
        this._dirty = true;
        return this;
    }

    setScale(s) {
        this.scale = s;
        this._dirty = true;
        return this;
    }

    markDirty() {
        this._dirty = true;
    }

    /**
     * Reconstruit `out` (Float32Array(16)) uniquement si nécessaire.
     * Retourne true si la matrice a été recalculée.
     */
    updateModelMatrix(out) {
        if (!this._dirty) return false;

        Matrice.matriceMakeRotationX(this.rotation.x, matRotX);
        Matrice.matriceMakeRotationY(this.rotation.y, matRotY);
        Matrice.matriceMakeRotationZ(this.rotation.z, matRotZ);
        Matrice.matriceMakeTranslation(
            this.position.x, this.position.y, this.position.z, matTrans
        );

        // multiplyMatrix(A, B) applique B PUIS A (v*résultat = (v*B)*A).
        // On veut : rotX, puis rotY, puis rotZ, puis translation.
        Matrice.matriceMultiplyMatrix(matRotY, matRotX, matTemp);   // rotX puis rotY
        Matrice.matriceMultiplyMatrix(matRotZ, matTemp, out);       // + rotZ

        if (this.scale !== 1) {
            // Application d'une échelle uniforme sur la partie rotation
            // (colonnes 0,1,2 du bloc 3x3, avant la translation)
            for (let i = 0; i < 11; i++) {
                if (i % 4 !== 3) out[i] *= this.scale;
            }
        }

        Matrice.matriceMultiplyMatrix(matTrans, out, out);          // + translation, en dernier

        this._dirty = false;
        return true;
    }
}

/**
 * Une entité = un mesh (données géométriques, potentiellement partagées
 * entre plusieurs instances) + une transform propre + ses matrices
 * précalculées (jamais réallouées).
 */
export class Entity {
    constructor(mesh) {
        this.mesh = mesh;
        this.transform = new Transform();
        this.matModel = Matrice.create();
        this.matModelView = Matrice.create();
        Matrice.matriceMakeIdentity(this.matModel);
    }
}
