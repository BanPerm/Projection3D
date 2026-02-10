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

    for(let y = minY; y <= maxY; y++) {
        let index = y * width + minX;
        
        for(let x = minX; x <= maxX; x++) {
            // 2. Coordonées barycentriques : On calcule les coordonnées barycentriques du point (x, y) par rapport au triangle
            const w1 = ((x2 - x1) * (y - y1) - (y2 - y1) * (x - x1)) * invArea;
            const w2 = ((x3 - x2) * (y - y2) - (y3 - y2) * (x - x2)) * invArea;
            const w3 = 1 - w1 - w2;

            // 3. Test d'appartenance : Si les coordonnées barycentriques sont toutes positives, le point est à l'intérieur du triangle
            if (w1 >= 0 && w2 >= 0 && w3 >= 0) {
                // 4. Interpolation de la profondeur : On calcule la profondeur du point (x, y) en interpolant les profondeurs des sommets du triangle
                const z = w1 * z1 + w2 * z2 + w3 * z3;

                // 5. Test de profondeur : Si la profondeur calculée est inférieure à celle stockée dans le z-buffer, on met à jour le pixel et le z-buffer
                const index = y * width + x;
                if (z < depth[index]) {
                    depth[index] = z;
                    pixels[index] = colorInt;
                }
            }
            index ++
        }
    }
}