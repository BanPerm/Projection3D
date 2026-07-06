import { isSphereVisible, computeEntityModelView, projectAndStoreTriangle } from "../geometry.js";
import { Mesh } from "./mesh.js";
import { Matrice } from "../math.js";
import { Transform } from "../entity.js";
import { Texture } from "../texture.js";
import { engineState } from "../state.js";

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

// Cache texture par chemin, même logique que meshCache : deux instances avec
// la même texturePath partagent l'image chargée (et son buffer de pixels).
const textureCache = new Map();

function getOrLoadTexture(texturePath) {
    if (textureCache.has(texturePath)) return textureCache.get(texturePath);
    const promise = new Texture().load(texturePath).catch(error => {
        console.warn(`Texture "${texturePath}" introuvable, repli sur un damier de secours.`, error);
        return new Texture().generateCheckerboard();
    });
    textureCache.set(texturePath, promise);
    return promise;
}

export class MeshInstance {
    constructor(objPath, texturePath = null) {
        this.objPath = objPath;
        this.texturePath = texturePath;
        this.mesh = null;
        this.texture = null;
        this.transform = new Transform();
        this.matModel = Matrice.create();
        this.matModelView = Matrice.create();
        Matrice.matriceMakeIdentity(this.matModel);
        this.isInitialized = false;
    }

    async create() {
        try {
            this.mesh = await getOrLoadMesh(this.objPath);
            if (this.texturePath) {
                this.texture = await getOrLoadTexture(this.texturePath);
            }
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

        const meshVisible = isSphereVisible(this.mesh.boundingSphere.center, this.mesh.boundingSphere.radius, this.matModelView);
        //console.log('mesh visible:', meshVisible, '| pitch:', engineState.pitch.toFixed(3)); // ajoute l'import de engineState

        if (!meshVisible) return;

        for (const subMesh of this.mesh.subMeshes) {
            const subVisible = isSphereVisible(subMesh.boundingSphere.center, subMesh.boundingSphere.radius, this.matModelView);
        //console.log('  submesh', subMesh.name, 'visible:', subVisible);
        if (subVisible) {
            projectAndStoreTriangle(subMesh.triangles, this.matModelView, this.texture);
        }
        }
    }
}
