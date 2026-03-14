/**
 * ReplicateService — Frontend wrapper for the Python backend's Replicate routes.
 * All Replicate API calls are now proxied through http://localhost:8000/api/replicate/*
 * API key is stored server-side only (no Authorization header sent from browser).
 */
export class ReplicateService {
    constructor() {
        // No API key needed on the frontend — handled by Python backend
    }

    // Kept for backward compatibility (no-op)
    initialize(_apiKey) {
        // API key is now managed by the Python backend
    }

    blobToBase64(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    /**
     * Generate image using Flux Dev LoRA model via the Python backend.
     * Mirrors the original generateWithFluxLoRA() logic exactly.
     * @param {Blob} imageBlob - Reference image for inpainting
     * @param {string} prompt - Generation prompt
     * @param {string} loraUrl - Optional custom LoRA URL
     * @param {number} loraScale - LoRA strength (0-2)
     * @param {string} maskImage - Optional base64 or URL for the inpainting mask
     * @param {number} denoisingStrength - Denoising strength for inpainting (0-1)
     * @param {number|null} seed - Optional static seed
     * @param {Blob|null} controlImageBlob - Original photo for identity lock
     * @returns {Promise<Blob>} - Generated image as Blob
     */
    async generateWithFluxLoRA(
        imageBlob,
        prompt,
        loraUrl = "",
        loraScale = 0.8,
        maskImage = null,
        denoisingStrength = 0.40,
        seed = null,
        controlImageBlob = null
    ) {
        console.log("🎨 Using Flux Dev LoRA for generation (via Python backend)...");
        console.log(`LoRA URL: ${loraUrl || "None (base model)"}`);
        console.log(`LoRA Scale: ${loraScale}`);
        if (maskImage) console.log("🎭 Targeted Mask detected (Phase 3 active)");
        if (seed) console.log(`🌱 Using Static Seed: ${seed}`);
        if (controlImageBlob) console.log("🔒 Using Identity Reference Image");

        const base64 = imageBlob ? await this.blobToBase64(imageBlob) : null;
        const controlBase64 = controlImageBlob ? await this.blobToBase64(controlImageBlob) : null;

        const input = {
            prompt,
            num_inference_steps: 40,
            guidance: 4.0,
            num_outputs: 1,
            seed: seed || Math.floor(Math.random() * 1000000),
            prompt_strength: denoisingStrength,
            denoising_strength: denoisingStrength,
            id_weight: 1.0,
        };

        if (base64) {
            input.image = base64;
        }
        if (controlBase64) {
            input.pulid_control_image = controlBase64;
        }
        if (loraUrl && loraUrl.trim()) {
            input.hf_lora = loraUrl.trim();
        }
        if (maskImage) {
            const maskBase64 = maskImage.startsWith("data:") ? maskImage : `data:image/png;base64,${maskImage}`;
            input.mask = maskBase64;
            console.log(`🎭 Mask applied for precise targeting`);
        }

        const baseUrl = import.meta.env.VITE_API_URL || '';
        const url = `${baseUrl}/api/replicate/predictions`;
        console.log(`🔍 [ReplicateService] POST to: ${url}`);
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ input }),
        });

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(`Backend Replicate error: ${response.status} - ${errData.detail || JSON.stringify(errData)}`);
        }

        const prediction = await response.json();
        console.log("⏳ Prediction started:", prediction.id);

        const resultUrl = await this.pollForResult(prediction.id);
        console.log("✅ Generation complete!");

        const imageResponse = await fetch(resultUrl);
        return await imageResponse.blob();
    }

    /**
     * Poll the backend until the prediction is ready.
     * Calls: GET /api/replicate/predictions/{id}
     */
    async pollForResult(predictionId) {
        const maxAttempts = 60;

        for (let i = 0; i < maxAttempts; i++) {
            const baseUrl = import.meta.env.VITE_API_URL || '';
            const url = `${baseUrl}/api/replicate/predictions/${predictionId}`;
            console.log(`🔍 [ReplicateService] Polling: ${url}`);
            const response = await fetch(url);

            const prediction = await response.json();

            if (prediction.status === "succeeded") {
                return prediction.output[0];
            }
            if (prediction.status === "failed") {
                throw new Error("Replicate prediction failed");
            }

            await new Promise((resolve) => setTimeout(resolve, 1000));
        }

        throw new Error("Replicate timeout");
    }
}

export const replicateService = new ReplicateService();
