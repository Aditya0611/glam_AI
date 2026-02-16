class CanvasMakeupService {
    constructor() {
        this.canvas = null;
        this.ctx = null;
    }

    /**
     * Apply makeup to an image using canvas-based pixel manipulation
     * @param {HTMLImageElement} imageElement - Original image
     * @param {Object} masks - Face masks (lips, cheeks, eyes, full)
     * @param {Object} makeupPlan - Makeup plan with layers
     * @returns {Promise<HTMLCanvasElement>} - Canvas with makeup applied
     */
    async applyMakeup(imageElement, masks, makeupPlan) {
        console.log("🎨 Starting Canvas-Based Makeup Application...");

        // Create canvas with image dimensions
        this.canvas = document.createElement('canvas');
        this.canvas.width = imageElement.naturalWidth || imageElement.width;
        this.canvas.height = imageElement.naturalHeight || imageElement.height;
        this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });

        // Draw original image
        this.ctx.drawImage(imageElement, 0, 0);

        // Apply each makeup layer
        for (let i = 0; i < makeupPlan.layers.length; i++) {
            const layer = makeupPlan.layers[i];
            console.log(`🎨 Applying layer ${i + 1}: ${layer.name}`);
            console.log(`   Color: ${layer.color}, Intensity: ${layer.intensity}, BlendMode: ${layer.blendMode || 'multiply'}`);

            const maskData = masks[layer.mask];
            if (!maskData) {
                console.warn(`⚠️ Mask "${layer.mask}" not found, skipping layer`);
                continue;
            }

            await this.applyLayer(maskData, layer.color, layer.intensity, layer.blendMode || 'multiply');
        }

        console.log("✅ Canvas makeup application complete!");
        return this.canvas;
    }

    /**
     * Apply a single makeup layer
     * @param {string} maskDataUrl - Base64 mask image
     * @param {string} color - Hex color (e.g., "#FF6B9D")
     * @param {number} intensity - Intensity (0-100 from Gemini, will be converted to 0-1)
     * @param {string} blendMode - Blend mode ('multiply', 'overlay', 'screen', 'normal')
     */
    async applyLayer(maskDataUrl, color, intensity, blendMode) {
        // Convert intensity from 0-100 scale to 0-1 scale
        const normalizedIntensity = intensity / 100;
        console.log(`   📊 Intensity: ${intensity} → Normalized: ${normalizedIntensity.toFixed(3)}`);

        // Load mask image
        const maskImage = await this.loadImage(maskDataUrl);

        // Create temporary canvas for mask
        const maskCanvas = document.createElement('canvas');
        maskCanvas.width = this.canvas.width;
        maskCanvas.height = this.canvas.height;
        const maskCtx = maskCanvas.getContext('2d', { willReadFrequently: true });
        maskCtx.drawImage(maskImage, 0, 0, maskCanvas.width, maskCanvas.height);

        // Get pixel data
        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        const maskData = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
        const pixels = imageData.data;
        const maskPixels = maskData.data;

        // Parse makeup color
        const makeupColor = this.hexToRgb(color);
        console.log(`   🎨 Makeup Color RGB: (${makeupColor.r}, ${makeupColor.g}, ${makeupColor.b})`);

        // Apply makeup to each pixel
        let pixelsModified = 0;
        for (let i = 0; i < pixels.length; i += 4) {
            const maskAlpha = maskPixels[i] / 255; // Use red channel as mask (grayscale)

            if (maskAlpha > 0.01) { // Only apply where mask is white
                const baseColor = {
                    r: pixels[i],
                    g: pixels[i + 1],
                    b: pixels[i + 2]
                };

                const blendedColor = this.blendColors(baseColor, makeupColor, blendMode);
                const finalAlpha = maskAlpha * normalizedIntensity;

                // Mix blended color with original based on intensity
                pixels[i] = blendedColor.r * finalAlpha + baseColor.r * (1 - finalAlpha);
                pixels[i + 1] = blendedColor.g * finalAlpha + baseColor.g * (1 - finalAlpha);
                pixels[i + 2] = blendedColor.b * finalAlpha + baseColor.b * (1 - finalAlpha);

                pixelsModified++;
            }
        }

        console.log(`   ✅ Modified ${pixelsModified} pixels`);

        // Put modified pixels back
        this.ctx.putImageData(imageData, 0, 0);
    }

    /**
     * Blend two colors using specified blend mode
     * @param {Object} base - Base color {r, g, b}
     * @param {Object} overlay - Overlay color {r, g, b}
     * @param {string} mode - Blend mode
     * @returns {Object} - Blended color {r, g, b}
     */
    blendColors(base, overlay, mode) {
        let blended;
        switch (mode) {
            case 'multiply':
                blended = this.blendMultiply(base, overlay);
                break;
            case 'overlay':
                blended = this.blendOverlay(base, overlay);
                break;
            case 'screen':
                blended = this.blendScreen(base, overlay);
                break;
            case 'normal':
            default:
                blended = overlay;
                break;
        }

        // Preserve underlying luminosity to maintain skin texture
        const baseLum = (base.r * 0.299 + base.g * 0.587 + base.b * 0.114);
        const blendedLum = (blended.r * 0.299 + blended.g * 0.587 + blended.b * 0.114);
        const lumFactor = baseLum / (blendedLum || 1);

        return {
            r: Math.min(255, blended.r * (0.8 + 0.2 * lumFactor)),
            g: Math.min(255, blended.g * (0.8 + 0.2 * lumFactor)),
            b: Math.min(255, blended.b * (0.8 + 0.2 * lumFactor))
        };
    }

    /**
     * Multiply blend mode (darkens)
     */
    blendMultiply(base, overlay) {
        return {
            r: (base.r * overlay.r) / 255,
            g: (base.g * overlay.g) / 255,
            b: (base.b * overlay.b) / 255
        };
    }

    /**
     * Overlay blend mode (enhances)
     */
    blendOverlay(base, overlay) {
        const blendChannel = (b, o) => {
            b = b / 255;
            o = o / 255;
            return (b < 0.5 ? 2 * b * o : 1 - 2 * (1 - b) * (1 - o)) * 255;
        };

        return {
            r: blendChannel(base.r, overlay.r),
            g: blendChannel(base.g, overlay.g),
            b: blendChannel(base.b, overlay.b)
        };
    }

    /**
     * Screen blend mode (lightens)
     */
    blendScreen(base, overlay) {
        return {
            r: 255 - ((255 - base.r) * (255 - overlay.r)) / 255,
            g: 255 - ((255 - base.g) * (255 - overlay.g)) / 255,
            b: 255 - ((255 - base.b) * (255 - overlay.b)) / 255
        };
    }

    /**
     * Convert hex color to RGB
     * @param {string} hex - Hex color (e.g., "#FF6B9D")
     * @returns {Object} - RGB color {r, g, b}
     */
    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 0, g: 0, b: 0 };
    }

    /**
     * Load image from data URL
     * @param {string} dataUrl - Base64 data URL
     * @returns {Promise<HTMLImageElement>}
     */
    loadImage(dataUrl) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = dataUrl;
        });
    }

    /**
     * Convert canvas to blob
     * @param {HTMLCanvasElement} canvas
     * @returns {Promise<Blob>}
     */
    canvasToBlob(canvas) {
        return new Promise((resolve) => {
            canvas.toBlob(resolve, 'image/png');
        });
    }
}

export const canvasMakeupService = new CanvasMakeupService();
