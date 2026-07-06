/**
 * Charge une image et expose un accès pixel rapide compatible avec le format
 * packé du renderer (0xAABBGGRR, little-endian) — pas de conversion à la volée
 * pendant la rasterisation.
 */
export class Texture {
    constructor() {
        this.width = 0;
        this.height = 0;
        this.pixels = null; // Uint32Array
        this.isLoaded = false;
    }

    async load(path) {
        const img = new Image();
        img.src = path;
        await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
        });

        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(0, 0, img.width, img.height);
        this.width = img.width;
        this.height = img.height;
        this.pixels = new Uint32Array(imageData.data.buffer);
        this.isLoaded = true;
        return this;
    }

    /**
     * Génère un damier procédural (utile pour tester le mapping UV sans
     * assets externes, ou comme texture de secours "manquante").
     */
    generateCheckerboard(size = 64, tiles = 8, colorA = [220, 60, 200], colorB = [30, 30, 30]) {
        this.width = size;
        this.height = size;
        this.pixels = new Uint32Array(size * size);
        const tileSize = size / tiles;

        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const tx = Math.floor(x / tileSize);
                const ty = Math.floor(y / tileSize);
                const useA = (tx + ty) % 2 === 0;
                const [r, g, b] = useA ? colorA : colorB;
                this.pixels[y * size + x] = (255 << 24) | (b << 16) | (g << 8) | r;
            }
        }
        this.isLoaded = true;
        return this;
    }

    /**
     * Échantillonne la texture en (u,v) avec wrap (répétition), pas de filtrage
     * (nearest-neighbor) pour rester cohérent avec le style "logiciel" du moteur.
     */
    sample(u, v) {
        // Wrap : ramène u,v dans [0,1) même si hors bornes (répétition de la texture)
        u = u - Math.floor(u);
        v = v - Math.floor(v);

        const x = Math.min(this.width - 1, (u * this.width) | 0);
        const y = Math.min(this.height - 1, (v * this.height) | 0);

        return this.pixels[y * this.width + x];
    }
}
