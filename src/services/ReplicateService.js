export class ReplicateService {
    constructor() {
        this.apiKey = null;
    }

    initialize(apiKey) {
        this.apiKey = apiKey;
    }

    /**
     * Edit image using Replicate's InstantID model
     * @param {Blob} imageBlob - Original image
     * @param {string} instruction - User instruction
     * @param {string} description - Enhanced description
     * @returns {Promise<Blob>} - Edited image
     */
    async editImage(imageBlob, instruction, description) {
        // ... (existing code for InstantID)
    }

    /**
     * Generate image using Flux Dev LoRA model with custom LoRA support
     * @param {Blob} imageBlob - Reference image for IP-Adapter (face preservation)
     * @param {string} prompt - Generation prompt
     * @param {string} loraUrl - Optional custom LoRA URL
     * @param {number} loraScale - LoRA strength (0-2)
     * @param {string} maskImage - Optional base64 or URL for the inpainting mask (Phase 2/3)
     * @param {number} denoisingStrength - Optional denoising strength for inpainting (0-1)
     * @returns {Promise<Blob>} - Generated image
     */
    async generateWithFluxLoRA(imageBlob, prompt, loraUrl = '', loraScale = 0.8, maskImage = null, denoisingStrength = 0.45, seed = null, controlImageBlob = null) {
        if (!this.apiKey) {
            throw new Error("Replicate API key not configured");
        }

        try {
            console.log("🎨 Using Flux Dev LoRA for generation...");
            console.log(`LoRA URL: ${loraUrl || 'None (base model)'}`);
            console.log(`LoRA Scale: ${loraScale}`);
            if (maskImage) console.log("🎭 Targeted Mask detected (Phase 3 active)");
            if (seed) console.log(`🌱 Using Static Seed: ${seed}`);
            if (controlImageBlob) console.log("🔒 Using Identity Reference Image");

            const base64 = imageBlob ? await this.blobToBase64(imageBlob) : null;
            const controlBase64 = controlImageBlob ? await this.blobToBase64(controlImageBlob) : null;

            const input = {
                prompt: prompt,
                num_inference_steps: 30,
                guidance: 3.5, // Standard Flux guidance (30 was too high and caused distortion)
                num_outputs: 1,
                seed: seed || Math.floor(Math.random() * 1000000), // Use static seed if provided
                // prompt_strength is used for img2img influence, flux-fill uses it for 'denoising'
                prompt_strength: denoisingStrength,
                denoising_strength: denoisingStrength, // Send both keys to support custom PuLID models that might use this specific key
                id_weight: 1.0, // Maximum identity preservation
            };

            // If image is provided, use it as the main input (for inpainting/img2img)
            if (base64) {
                input.image = base64;
                // DO NOT overwrite prompt_strength here, it should remain the value of denoisingStrength
            }

            // Phase 4: CONSISTENCY - The ID Reference
            if (controlBase64) {
                input.pulid_control_image = controlBase64;
            } else if (base64 && !controlImageBlob) {
                // Fallback: If no separate control image is passed, and we have an input image,
                // but we are in a chain, we might ideally want the ORIGINAL.
                // For now, if not provided, we don't set it, or use input.image if appropriate for the model.
                // But the requirement is strict: "The ID Reference... must always be the Original Photo"
                // So we rely on the caller to pass controlImageBlob.
            }

            // If custom LoRA URL is provided, use it
            if (loraUrl && loraUrl.trim()) {
                input.hf_lora = loraUrl.trim();
            }

            // Use the mask if available for targeted editing
            if (maskImage) {
                input.mask = maskImage;
            }

            const response = await fetch("/api/replicate/v1/models/black-forest-labs/flux-fill-dev/predictions", {
                method: "POST",
                headers: {
                    "Authorization": `Token ${this.apiKey}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    // Version is implied by the URL
                    input: {
                        ...input,
                        // For flux-fill, the parameters might slightly differ, ensuring mask is used
                    }
                })
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(`Replicate API error: ${response.status} - ${errData.detail || JSON.stringify(errData)}`);
            }

            const prediction = await response.json();
            console.log("⏳ Prediction started:", prediction.id);

            const resultUrl = await this.pollForResult(prediction.id);
            console.log("✅ Generation complete!");

            const imageResponse = await fetch(resultUrl);
            return await imageResponse.blob();

        } catch (error) {
            console.error("❌ Flux LoRA generation failed:", error);
            throw error;
        }
    }

    async pollForResult(predictionId) {
        const maxAttempts = 60; // 60 seconds max

        for (let i = 0; i < maxAttempts; i++) {
            const response = await fetch(
                `/api/replicate/v1/predictions/${predictionId}`,
                {
                    headers: {
                        "Authorization": `Token ${this.apiKey}`,
                    }
                }
            );

            const prediction = await response.json();

            if (prediction.status === "succeeded") {
                return prediction.output[0]; // URL of generated image
            }

            if (prediction.status === "failed") {
                throw new Error("Replicate prediction failed");
            }

            // Wait 1 second before polling again
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        throw new Error("Replicate timeout");
    }

    blobToBase64(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }
}

export const replicateService = new ReplicateService();
