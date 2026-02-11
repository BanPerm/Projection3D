import { Vector3D } from "../math.js";
import { Triangle } from "../triangle.js";

export class SubMesh {
    constructor(name) {
        this.name = name;
        this.triangles = [];
        this.boundingSphere = {
            center: new Vector3D(),
            radius: 0
        };
    }

    computeBoundingSphere() {
        if (this.triangles.length === 0) return;

        // 1. Calculer le centre (Moyenne des positions)
        let sumX = 0, sumY = 0, sumZ = 0;
        let count = 0;

        for (let t of this.triangles) {
            for (let p of t.pos) {
                sumX += p.x; sumY += p.y; sumZ += p.z;
                count++;
            }
        }

        this.boundingSphere.center.set(sumX / count, sumY / count, sumZ / count);

        // 2. Calculer le rayon (Distance max au centre)
        let maxDistSq = 0;
        for (let t of this.triangles) {
            for (let p of t.pos) {
                const dx = p.x - this.boundingSphere.center.x;
                const dy = p.y - this.boundingSphere.center.y;
                const dz = p.z - this.boundingSphere.center.z;
                const distSq = dx*dx + dy*dy + dz*dz;
                if (distSq > maxDistSq) maxDistSq = distSq;
            }
        }
        this.boundingSphere.radius = Math.sqrt(maxDistSq);
    }
}

export class Mesh {
    constructor() {
        this.subMeshes = [];
        this.boundingSphere = { 
            center: new Vector3D(), 
            radius: 0 
        };
    }

    async loadFromObjectFile(filePath) {
        try {
            const response = await fetch(filePath);
            if (!response.ok) {
                throw new Error('Failed to fetch file');
            }
            const text = await response.text();
            const lines = text.split('\n');
            const verts = [];
            let count = 0;
            
            let currentSubMesh = new SubMesh("default");
            this.subMeshes.push(currentSubMesh);

            lines.forEach(line => {
                const tokens = line.trim().split(/\s+/);
                if (tokens[0] === 'v') {
                    const x = parseFloat(tokens[1]);
                    const y = parseFloat(tokens[2]);
                    const z = parseFloat(tokens[3]);
                    verts.push(new Vector3D(x, y, z));
                } else if (tokens[0] === 'f') {
                    count++;
                    const faceVerts = tokens.slice(1);

                    for (let i = 1; i < faceVerts.length - 1; i++) {
                        const v1Index = parseInt(faceVerts[0].split('/')[0]) - 1;
                        const v2Index = parseInt(faceVerts[i].split('/')[0]) - 1;
                        const v3Index = parseInt(faceVerts[i + 1].split('/')[0]) - 1;

                        currentSubMesh.triangles.push(new Triangle(
                            verts[v1Index],
                            verts[v2Index],
                            verts[v3Index]
                        ));
                    }
                } else if (tokens[0] === 'o' || tokens[0] === 'g') {
                    if (currentSubMesh.triangles.length > 0) {
                        currentSubMesh.computeBoundingSphere();
                    }
                    currentSubMesh = new SubMesh(line.split(' ')[1]);
                    this.subMeshes.push(currentSubMesh);
                }
                    
            });
            currentSubMesh.computeBoundingSphere();
            console.log(`Loaded ${count} faces from ${filePath}`);

            this.computeGlobalBoundingSphere();
        } catch (error) {
            console.error('Failed to fetch or parse file:', error);
            throw error;
        }
    }

    copy(mesh) {
        this.subMeshes = mesh.subMeshes.map(sub => {
            const newSub = new SubMesh(sub.name);
            newSub.triangles = sub.triangles.map(tri => {
                const newTri = new Triangle();
                newTri.copy(tri);
                return newTri;
            }
            );
            newSub.boundingSphere.center.copy(sub.boundingSphere.center);
            newSub.boundingSphere.radius = sub.boundingSphere.radius;
            return newSub;
        });
        this.boundingSphere.center.copy(mesh.boundingSphere.center);
        this.boundingSphere.radius = mesh.boundingSphere.radius;
    }


    computeGlobalBoundingSphere() {
        if (this.subMeshes.length === 0) return;

        let minX = Infinity, minY = Infinity, minZ = Infinity;
        let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

        for (const sub of this.subMeshes) {
            const c = sub.boundingSphere.center;
            const r = sub.boundingSphere.radius;

            if (c.x - r < minX) minX = c.x - r;
            if (c.x + r > maxX) maxX = c.x + r;
            if (c.y - r < minY) minY = c.y - r;
            if (c.y + r > maxY) maxY = c.y + r;
            if (c.z - r < minZ) minZ = c.z - r;
            if (c.z + r > maxZ) maxZ = c.z + r;
        }

        this.boundingSphere.center.set(
            (minX + maxX) * 0.5,
            (minY + maxY) * 0.5,
            (minZ + maxZ) * 0.5
        );

        let maxRadius = 0;
        
        for (const sub of this.subMeshes) {
            const subCenter = sub.boundingSphere.center;
            
            const dx = subCenter.x - this.boundingSphere.center.x;
            const dy = subCenter.y - this.boundingSphere.center.y;
            const dz = subCenter.z - this.boundingSphere.center.z;
            const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
            
            const neededRadius = dist + sub.boundingSphere.radius;
            
            if (neededRadius > maxRadius) {
                maxRadius = neededRadius;
            }
        }

        this.boundingSphere.radius = maxRadius;

    }
}