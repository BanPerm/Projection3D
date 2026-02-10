import { projectAndStoreTriangle } from "../geometry.js";
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
            this.initialMesh.pos = this.mesh.pos.map(tri =>
                new Triangle(
                    new Vector3D(tri.pos[0].x, tri.pos[0].y, tri.pos[0].z),
                    new Vector3D(tri.pos[1].x, tri.pos[1].y, tri.pos[1].z),
                    new Vector3D(tri.pos[2].x, tri.pos[2].y, tri.pos[2].z)
                )
            );

            // 3. PRÉ-ALLOCATION du Working Buffer
            this.mesh.pos = this.initialMesh.pos.map(() => new Triangle());

            this.isInitialized = true;
        } catch (error) {
            console.error('Failed to create mesh:', error);
        }
    }

    reset() {
        if (!this.isInitialized) return;

        const count = this.initialMesh.pos.length;
        for (let i = 0; i < count; i++) {
            this.mesh.pos[i].copy(this.initialMesh.pos[i]);
        }
    }

    draw(angleX = 0, angleY=0, angleZ = 0) {
        if (!this.isInitialized) return;

        this.reset();

        projectAndStoreTriangle(this.mesh.pos, angleX, angleY, angleZ);

    }
}
