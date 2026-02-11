import { Vector3D } from "../math.js";
import { Triangle } from "../triangle.js";

export class Mesh {
    constructor() {
        this.pos = [];
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
            const tris = [];

            lines.forEach(line => {
                const tokens = line.trim().split(/\s+/);
                if (tokens[0] === 'v') {
                    const x = parseFloat(tokens[1]);
                    const y = parseFloat(tokens[2]);
                    const z = parseFloat(tokens[3]);
                    verts.push(new Vector3D(x, y, z));
                } else if (tokens[0] === 'f') {
                    const faceVerts = tokens.slice(1);

                    for (let i = 1; i < faceVerts.length - 1; i++) {
                        const v1Index = parseInt(faceVerts[0].split('/')[0]) - 1;
                        const v2Index = parseInt(faceVerts[i].split('/')[0]) - 1;
                        const v3Index = parseInt(faceVerts[i + 1].split('/')[0]) - 1;

                        tris.push(new Triangle(
                            verts[v1Index],
                            verts[v2Index],
                            verts[v3Index]
                        ));
                    }
                }
            });

            this.pos = tris;
            return this.pos;
        } catch (error) {
            console.error('Failed to fetch or parse file:', error);
            throw error;
        }
    }
}