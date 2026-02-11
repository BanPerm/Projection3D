import { isSphereVisible, prepareMatrices, projectAndStoreTriangle } from "../geometry.js";
import { Vector3D } from "../math.js";
import { Triangle } from "../triangle.js";
import { Mesh } from "./mesh.js";

export class CubeMesh {
    constructor() {
        this.mesh = new Mesh();
        this.initialMesh = new Mesh();
        this.isInitialized = false;
    }

    async create() {
        try {
            await this.mesh.loadFromObjectFile("object/voiture.obj");
            //await this.mesh.loadFromObjectFile("object/mountains.obj");

            this.initialMesh.copy(this.mesh);

            // 3. PRÉ-ALLOCATION du Working Buffer
            this.mesh.subMeshes = this.initialMesh.subMeshes.map(sub => {
                return {
                    name: sub.name,
                    boundingSphere: sub.boundingSphere,
                    triangles: sub.triangles.map(() => new Triangle())
                };
            });

            this.isInitialized = true;
        } catch (error) {
            console.error('Failed to create mesh:', error);
        }
    }

    reset() {
        if (!this.isInitialized) return;

        for (let s = 0; s < this.initialMesh.subMeshes.length; s++) {
            const sourceTriangles = this.initialMesh.subMeshes[s].triangles;
            const targetTriangles = this.mesh.subMeshes[s].triangles;
            
            for (let i = 0; i < sourceTriangles.length; i++) {
                targetTriangles[i].copy(sourceTriangles[i]);
            }
        }
    }

    draw(angleX = 0, angleY=0, angleZ = 0) {
        if (!this.isInitialized) return;

        this.reset();

        const matrices = prepareMatrices(angleX, angleY, angleZ);

        if (!isSphereVisible(
            this.mesh.boundingSphere.center, 
            this.mesh.boundingSphere.radius, 
            matrices.matWorld, 
            matrices.matView
        )) {
            return; 
        }

        for (const subMesh of this.mesh.subMeshes) {
            // 3. Envoyer uniquement les triangles de ce composant à la pipeline
            if (isSphereVisible(subMesh.boundingSphere.center, subMesh.boundingSphere.radius, matrices.matWorld, matrices.matView)) {
                
                // 4. Si OUI, on traite ses triangles
                projectAndStoreTriangle(subMesh.triangles, matrices);
            }
        }

    }
}
