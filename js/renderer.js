export const RENDER_BUFFER = {
    width: 0,
    height: 0,
    imageData: null,
    pixelBuffer: null, // Uint32Array (Rapide)
    zBuffer: null      // Float32Array (Profondeur)
};

export function initRenderer(ctx, width, height) {
    RENDER_BUFFER.width = width;
    RENDER_BUFFER.height = height;
    
    // Création de l'image data
    RENDER_BUFFER.imageData = ctx.createImageData(width, height);
    
    // Création des vues typées pour la vitesse
    RENDER_BUFFER.pixelBuffer = new Uint32Array(RENDER_BUFFER.imageData.data.buffer);
    RENDER_BUFFER.zBuffer = new Float32Array(width * height);
}

const DEBUG_COLORS = {
    'blue':   { r: 0,   g: 0,   b: 255 },
    'yellow': { r: 255, g: 255, b: 0   },
    'green':  { r: 0,   g: 255, b: 0   },
    'white':  { r: 255, g: 255, b: 255 },
    'red':    { r: 255, g: 0,   b: 0   }
};

function colorToInt(colorInput, lum = 1.0) {
    let r, g, b;

    if (typeof colorInput === 'string' && DEBUG_COLORS[colorInput]) {
        ({ r, g, b } = DEBUG_COLORS[colorInput]);
    } 
    else if (typeof colorInput === 'number') {
        const val = Math.floor(255 * colorInput);
        r = g = b = val;
    } 
    else {
        const val = Math.floor(255 * lum);
        r = g = b = val;
    }

    // Format Little Endian pour Uint32Array : 0xAABBGGRR
    return (255 << 24) | (b << 16) | (g << 8) | r;
}

export function clearBuffers() {
    RENDER_BUFFER.pixelBuffer.fill(0xFF000000); // Remplit le buffer avec du noir opaque
    RENDER_BUFFER.zBuffer.fill(Infinity); // Remplit le z-buffer avec des valeurs infinies
}

export function drawBufferToCanvas(ctx) {
    ctx.putImageData(RENDER_BUFFER.imageData, 0, 0);
}


const CULLING_SENS = 1;

export function rasterizeTriangle(x1, y1, z1, x2, y2, z2, x3, y3, z3, colorData, lum = 1.0) {
    if (isNaN(x1) || isNaN(x2) || isNaN(x3) || isNaN(y1) || isNaN(y2) || isNaN(y3)) return;

    const width = RENDER_BUFFER.width;
    const height = RENDER_BUFFER.height;
    const pixels = RENDER_BUFFER.pixelBuffer;
    const depth = RENDER_BUFFER.zBuffer;

    // Pré-calculs pour les coordonnées barycentriques (aire du triangle)
    const area = (x2 - x1) * (y3 - y1) - (y2 - y1) * (x3 - x1);
    if (Math.abs(area) < 0.0001) return;

    // Si le triangle est orienté dans le mauvais sens, on peut l'ignorer (back-face culling)
    //if (area * CULLING_SENS > 0) return;

    // 1. Bounding Box : On ne scanne que le rectangle autour du triangle
    let minX = Math.floor(Math.min(x1, x2, x3));
    let maxX = Math.ceil(Math.max(x1, x2, x3));
    let minY = Math.floor(Math.min(y1, y2, y3));
    let maxY = Math.ceil(Math.max(y1, y2, y3));

    // Clipping de la Bounding Box (ne pas dessiner hors écran)
    minX = Math.max(0, minX);
    minY = Math.max(0, minY);
    maxX = Math.min(width - 1, maxX);
    maxY = Math.min(height - 1, maxY);

    if (minX > maxX || minY > maxY) return;

    const invArea = 1.0 / area;
    const colorInt = colorToInt(colorData, lum);

    // Utilisation de  PINEDA

    // 1. Évaluation des fonctions d'arêtes au pixel de départ (minX, minY)
    let w1_row = ((x2 - x1) * (minY - y1) - (y2 - y1) * (minX - x1)) * invArea;
    let w2_row = ((x3 - x2) * (minY - y2) - (y3 - y2) * (minX - x2)) * invArea;

    // 2. Dérivées par rapport à X (pas de 1 pixel à droite)
    const dw1_dx = -(y2 - y1) * invArea;
    const dw2_dx = -(y3 - y2) * invArea;

    // 3. Dérivées par rapport à Y (pas de 1 pixel en bas)
    const dw1_dy = (x2 - x1) * invArea;
    const dw2_dy = (x3 - x2) * invArea;

    for (let y = minY; y <= maxY; y++) {
        let index = y * width + minX;
        let w1 = w1_row;
        let w2 = w2_row;
        
        for (let x = minX; x <= maxX; x++) {
            const w3 = 1.0 - w1 - w2;

            // Test d'appartenance
            if (w1 >= 0 && w2 >= 0 && w3 >= 0) {
                // Interpolation linéaire de la profondeur
                const z = w1 * z1 + w2 * z2 + w3 * z3;

                // Test de profondeur (Early Z)
                if (z < depth[index]) {
                    depth[index] = z;
                    pixels[index] = colorInt;
                }
            }
            
            // Progression incrémentale en X
            w1 += dw1_dx;
            w2 += dw2_dx;
            index++;
        }
        
        // Progression incrémentale en Y
        w1_row += dw1_dy;
        w2_row += dw2_dy;
    }
}