/**
 * GeminiService — Frontend wrapper for the Python backend's Gemini routes.
 * All Gemini API calls are now proxied through http://localhost:8000/api/gemini/*
 * API keys are stored server-side only.
 */
class GeminiService {

    async _postWithImage(endpoint, imageBlob, fields = {}) {
        const formData = new FormData();
        formData.append("image", imageBlob, "photo.jpg");
        for (const [key, value] of Object.entries(fields)) {
            formData.append(key, value);
        }
        const baseUrl = import.meta.env.VITE_API_URL || '';
        const response = await fetch(`${baseUrl}/api/gemini/${endpoint}`, {
            method: "POST",
            body: formData,
        });
        if (!response.ok) {
            const err = await response.json().catch(() => ({ detail: response.statusText }));
            throw new Error(`Backend error [${endpoint}]: ${err.detail || response.statusText}`);
        }
        return response.json();
    }

    /**
     * Fetches all makeup presets from the backend.
     */
    async getPresets() {
        const baseUrl = import.meta.env.VITE_API_URL || '';
        const response = await fetch(`${baseUrl}/api/presets`);
        if (!response.ok) {
            throw new Error(`Failed to fetch presets: ${response.statusText}`);
        }
        return response.json();
    }

    /**
     * Analyzes the image and user prompt to generate a detailed Stable Diffusion prompt.
     * Calls: POST /api/gemini/enhance-prompt
     */
    async enhancePrompt(imageBlob, userPrompt) {
        try {
            const data = await this._postWithImage("enhance-prompt", imageBlob, {
                user_prompt: userPrompt,
            });
            console.log("Gemini Generated Prompt:", data.enhanced_prompt);
            return data.enhanced_prompt;
        } catch (error) {
            console.error("Gemini Analysis Failed:", error);
            return `portrait of a person, ${userPrompt}, photorealistic, 8k, high quality`;
        }
    }

    /**
     * Extracts precise makeup attributes from a reference image.
     * Calls: POST /api/gemini/extract-makeup
     */
    async extractMakeupAttributes(imageBlob) {
        try {
            const data = await this._postWithImage("extract-makeup", imageBlob);
            console.log("Gemini Extracted Attributes:", data);
            return data;
        } catch (error) {
            console.error("Gemini Extraction Failed:", error);
            return {
                lipstick: { color: "#FF0000", texture: "matte" },
                eyeshadow: { color: "#4A3728", texture: "matte" },
                blush: { color: "#E2725B", intensity: 40 },
                eyeliner: { color: "#000000", style: "thin" },
            };
        }
    }

    /**
     * Generate a complete makeup plan based on photo analysis and preset style.
     * Calls: POST /api/gemini/makeup-plan
     * @param {Blob} imageBlob - User's photo
     * @param {string} presetStyle - Style description from preset
     * @param {Array} presetLayers - Layers to include (e.g., ['foundation', 'blush', 'lipstick'])
     * @returns {Promise<Object>} - Structured makeup plan with analysis and layers
     */
    async generateMakeupPlan(imageBlob, presetStyle = "natural makeup", presetLayers = ["foundation", "blush", "lipstick"]) {
        try {
            const plan = await this._postWithImage("makeup-plan", imageBlob, {
                preset_style: presetStyle,
                preset_layers: presetLayers.join(","),
            });

            if (!plan.analysis || !plan.layers || !Array.isArray(plan.layers)) {
                throw new Error("Invalid plan structure from server");
            }

            console.log("🎨 Makeup Plan Generated:", plan);
            return plan;
        } catch (error) {
            console.error("❌ Gemini Makeup Plan Failed:", error);
            return this.getFallbackPlan(presetLayers);
        }
    }

    /**
     * Fallback makeup plan if backend fails
     */
    getFallbackPlan(layers) {
        const layerDefaults = {
            foundation: {
                name: "foundation", mask: "full", color: "#F5D0C5",
                intensity: 50, blendMode: "normal", texture: "matte",
                prompt: "even skin tone, flawless foundation, natural finish, professional makeup base, 8k, photorealistic",
            },
            blush: {
                name: "blush", mask: "cheeks", color: "#FF6B9D",
                intensity: 70, blendMode: "multiply", texture: "matte",
                prompt: "rosy pink blush on cheeks, natural flush, visible color, 8k, photorealistic",
            },
            lipstick: {
                name: "lipstick", mask: "lips", color: "#C70039",
                intensity: 80, blendMode: "overlay", texture: "matte",
                prompt: "intense true red lipstick, defined lips, matte finish, professional makeup, bold red color",
            },
            eyes: {
                name: "eyes", mask: "eyes", color: "#8B6F47",
                intensity: 65, blendMode: "multiply", texture: "shimmer",
                prompt: "brown eyeshadow, defined eyes, natural eye makeup, professional look",
            },
        };
        return {
            analysis: { skinTone: "Natural", faceShape: "Oval", eyeColor: "Unknown", hairColor: "Unknown" },
            layers: layers.map((name) => layerDefaults[name] || layerDefaults.foundation),
        };
    }
}

export const geminiService = new GeminiService();
