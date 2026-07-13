import { Vector3D } from "../math.js";
import { Triangle, UV } from "../triangle.js";

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
            const uvs = [];
            const normals = [];   // 'vn' du fichier, si présentes
            let hasFileNormals = false;
            let count = 0;

            // On ne construit pas les Triangle tout de suite : on ne sait
            // qu'à la toute fin du fichier si des 'vn' existent ou non, donc
            // on stocke d'abord juste les indices de chaque face.
            let currentSubMesh = new SubMesh("default");
            this.subMeshes.push(currentSubMesh);
            const pendingFaces = []; // { subMesh, a:{vIndex,vtIndex,vnIndex}, b:{...}, c:{...} }
            const subMeshBoundaries = []; // pour recréer les bounding sphere par sous-mesh à la fin

            lines.forEach(line => {
                const tokens = line.trim().split(/\s+/);
                if (tokens[0] === 'v') {
                    const x = parseFloat(tokens[1]);
                    const y = parseFloat(tokens[2]);
                    const z = parseFloat(tokens[3]);
                    verts.push(new Vector3D(x, y, z));
                } else if (tokens[0] === 'vt') {
                    const u = parseFloat(tokens[1]);
                    // Convention OBJ : v=0 en bas de la texture. Les buffers image
                    // (canvas/ImageData) ont, eux, la ligne 0 en haut -> on flip.
                    const v = 1.0 - parseFloat(tokens[2] ?? 0);
                    uvs.push(new UV(u, v));
                } else if (tokens[0] === 'vn') {
                    hasFileNormals = true;
                    normals.push(new Vector3D(parseFloat(tokens[1]), parseFloat(tokens[2]), parseFloat(tokens[3])));
                } else if (tokens[0] === 'f') {
                    count++;
                    const faceVerts = tokens.slice(1);

                    for (let i = 1; i < faceVerts.length - 1; i++) {
                        const parseIndices = (tok) => {
                            const parts = tok.split('/');
                            const vIndex = parseInt(parts[0]) - 1;
                            // "f v//vn" (pas de vt) ou "f v" (pas de vt ni vn) : on retombe sur -1
                            const vtIndex = (parts[1] && parts[1] !== '') ? parseInt(parts[1]) - 1 : -1;
                            const vnIndex = (parts[2] && parts[2] !== '') ? parseInt(parts[2]) - 1 : -1;
                            return { vIndex, vtIndex, vnIndex };
                        };

                        pendingFaces.push({
                            subMesh: currentSubMesh,
                            a: parseIndices(faceVerts[0]),
                            b: parseIndices(faceVerts[i]),
                            c: parseIndices(faceVerts[i + 1])
                        });
                    }
                } else if (tokens[0] === 'o' || tokens[0] === 'g') {
                    currentSubMesh = new SubMesh(line.split(' ')[1]);
                    this.subMeshes.push(currentSubMesh);
                }

            });

            // Si le fichier ne fournit pas de normales, on les calcule :
            // moyenne (non normalisée, donc naturellement pondérée par l'aire)
            // des normales de toutes les faces adjacentes à chaque sommet.
            let computedVertexNormals = null;
            if (!hasFileNormals) {
                computedVertexNormals = verts.map(() => new Vector3D(0, 0, 0));
                const edge1 = new Vector3D(), edge2 = new Vector3D(), faceNormal = new Vector3D();
                for (const face of pendingFaces) {
                    const pa = verts[face.a.vIndex], pb = verts[face.b.vIndex], pc = verts[face.c.vIndex];
                    Vector3D.sub(pb, pa, edge1);
                    Vector3D.sub(pc, pa, edge2);
                    Vector3D.crossProduct(edge1, edge2, faceNormal); // pas de normalise() : aire = poids naturel
                    Vector3D.add(computedVertexNormals[face.a.vIndex], faceNormal, computedVertexNormals[face.a.vIndex]);
                    Vector3D.add(computedVertexNormals[face.b.vIndex], faceNormal, computedVertexNormals[face.b.vIndex]);
                    Vector3D.add(computedVertexNormals[face.c.vIndex], faceNormal, computedVertexNormals[face.c.vIndex]);
                }
                for (const n of computedVertexNormals) {
                    if (n.lengthVector() > 0) n.normalise();
                    else n.set(0, 0, -1); // sommet isolé (ne devrait pas arriver) : valeur de repli sûre
                }
            }

            const getNormal = (idx) => {
                if (hasFileNormals && idx.vnIndex >= 0) return normals[idx.vnIndex];
                return computedVertexNormals[idx.vIndex]; // repli : normale de sommet calculée
            };

            for (const face of pendingFaces) {
                const tri = new Triangle(
                    verts[face.a.vIndex], verts[face.b.vIndex], verts[face.c.vIndex]
                );
                tri.setUV(
                    face.a.vtIndex >= 0 ? uvs[face.a.vtIndex] : new UV(0, 0),
                    face.b.vtIndex >= 0 ? uvs[face.b.vtIndex] : new UV(0, 0),
                    face.c.vtIndex >= 0 ? uvs[face.c.vtIndex] : new UV(0, 0)
                );
                tri.setNormals(getNormal(face.a), getNormal(face.b), getNormal(face.c));
                face.subMesh.triangles.push(tri);
            }

            for (const sub of this.subMeshes) {
                sub.computeBoundingSphere();
            }
            console.log(`Loaded ${count} faces from ${filePath} (normales : ${hasFileNormals ? 'fichier' : 'calculées'})`);

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