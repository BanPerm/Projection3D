import { isSphereVisible, computeEntityModelView, projectAndStoreTriangle } from "../geometry.js";
import { Mesh } from "./mesh.js";
import { Matrice } from "../math.js";
import { Transform } from "../entity.js";

// Cache par chemin de fichier : deux instances pointant vers le même .obj
// partagent les mêmes triangles/sous-meshes en mémoire (pas de duplication).
const meshCache = new Map();

async function getOrLoadMesh(objPath) {
    if (meshCache.has(objPath)) {
        return meshCache.get(objPath);
    }
    const loadPromise = (async () => {
        const mesh = new Mesh();
        await mesh.loadFromObjectFile(objPath);
        return mesh;
    })();
    meshCache.set(objPath, loadPromise);
    return loadPromise;
}

export class MeshInstance {
    constructor(objPath) {
        this.objPath = objPath;
        this.mesh = null;
        this.transform = new Transform();
        this.matModel = Matrice.create();
        this.matModelView = Matrice.create();
        Matrice.matriceMakeIdentity(this.matModel);
        this.isInitialized = false;
    }

    async create() {
        try {
            this.mesh = await getOrLoadMesh(this.objPath);
            this.isInitialized = true;
        } catch (error) {
            console.error(`Failed to create mesh instance for ${this.objPath}:`, error);
        }
    }

    draw() {
        if (!this.isInitialized) return;

        // Une seule matrice combinée model-view pour toute l'instance,
        // reconstruite seulement si la transform a changé (voir Transform.updateModelMatrix)
        computeEntityModelView(this);

        if (!isSphereVisible(this.mesh.boundingSphere.center, this.mesh.boundingSphere.radius, this.matModelView)) {
            return;
        }

        for (const subMesh of this.mesh.subMeshes) {
            if (isSphereVisible(subMesh.boundingSphere.center, subMesh.boundingSphere.radius, this.matModelView)) {
                projectAndStoreTriangle(subMesh.triangles, this.matModelView);
            }
        }
    }
}
