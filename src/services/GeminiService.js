import { GoogleGenerativeAI } from "@google/generative-ai";

class GeminiService {
    constructor() {
        // Initialize later to allow .env to load
        this.genAI = null;
        this.model = null;
    }

    initialize(apiKey) {
        if (!apiKey) {
            console.warn("Gemini API Key is missing!");
            return;
        }
        this.genAI = new GoogleGenerativeAI(apiKey);
        this.model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    }

    async blobToBase64(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64data = reader.result.split(',')[1];
                resolve(base64data);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    /**
     * Analyzes the image and user prompt to generate a highly detailed description for Stable Diffusion.
     */
    async enhancePrompt(imageBlob, userPrompt) {
        if (!this.model) {
            throw new Error("Gemini Service not initialized. Missing API Key?");
        }

        try {
            const base64Image = await this.blobToBase64(imageBlob);

            const prompt = `
            You are an expert prompt engineer for Stable Diffusion AI art.
            Look at this image of a person.
            The user wants to apply this edit: "${userPrompt}".
            
            Write a detailed, high-quality text-to-image prompt that describes:
            1. The physical appearance of the person in the image (hair, eyes, skin tone, gender) based on what you see.
            2. The requested style/edit applied perfectly. **EMPHASIZE this part.** Use strong, descriptive color words (e.g. "vibrant green lipstick" instead of just "green lipstick").
            3. Professional photography keywords (e.g., "cinematic lighting", "8k", "photorealistic", "vogue editorial").
            
            IMPORTANT: Return ONLY the prompt text. Do not add explanations.
            The prompt should follow this structure: "portrait of [detailed description of person], wearing [STRONG description of makeup/style], [technical quality keywords]"
            `;

            const imagePart = {
                inlineData: {
                    data: base64Image,
                    mimeType: imageBlob.type
                },
            };

            const result = await this.model.generateContent([prompt, imagePart]);
            const response = await result.response;
            const enhancedText = response.text();

            console.log("Gemini Generated Prompt:", enhancedText);
            return enhancedText.trim();
        } catch (error) {
            console.error("Gemini Analysis Failed:", error);
            // Fallback to basic prompt if Gemini fails
            return `portrait of a person, ${userPrompt}, photorealistic, 8k, high quality`;
        }
    }

    /**
     * Extracts precise makeup attributes from a reference image for YouCam integration.
     */
    async extractMakeupAttributes(imageBlob) {
        if (!this.model) {
            throw new Error("Gemini Service not initialized.");
        }

        try {
            const base64Image = await this.blobToBase64(imageBlob);

            const prompt = `
            You are a professional makeup artist and computer vision expert.
            Analyze the makeup in this reference image and extract the attributes in a structured JSON format.
            
            Look for:
            1. Lipstick: Primary HEX color, texture (matte, gloss, shimmer, satin).
            2. Eyeshadow: Primary HEX color, secondary/crease HEX color, texture (matte, shimmer, metallic).
            3. Blush: HEX color, intensity (0-100).
            4. Eyeliner: Color (usually black/brown), style (cat-eye, thin, bold).
            
            IMPORTANT: Return ONLY a valid JSON object. No markdown, no triple backticks, no text before or after.
            
            Required Format:
            {
              "lipstick": { "color": "#HEX", "texture": "matte|gloss|shimmer|satin" },
              "eyeshadow": { "color": "#HEX", "creaseColor": "#HEX", "texture": "matte|shimmer|metallic" },
              "blush": { "color": "#HEX", "intensity": 60 },
              "eyeliner": { "color": "#000000", "style": "cat-eye" }
            }
            `;

            const imagePart = {
                inlineData: {
                    data: base64Image,
                    mimeType: imageBlob.type
                },
            };

            const result = await this.model.generateContent([prompt, imagePart]);
            const response = await result.response;
            const text = response.text().trim();

            // Basic cleanup in case Gemini adds markdown
            const jsonStr = text.replace(/```json|```/g, "").trim();
            console.log("Gemini Extracted Attributes:", jsonStr);

            return JSON.parse(jsonStr);
        } catch (error) {
            console.error("Gemini Extraction Failed:", error);
            // Return defaults if failed
            return {
                lipstick: { color: "#FF0000", texture: "matte" },
                eyeshadow: { color: "#4A3728", texture: "matte" },
                blush: { color: "#E2725B", intensity: 40 },
                eyeliner: { color: "#000000", style: "thin" }
            };
        }
    }

    /**
     * Generate a complete makeup plan based on photo analysis and preset style
     * @param {Blob} imageBlob - User's photo
     * @param {string} presetStyle - Style description from preset
     * @param {Array} presetLayers - Layers to include (e.g., ['foundation', 'blush', 'lipstick'])
     * @returns {Promise<Object>} - Structured makeup plan with analysis and layers
     */
    async generateMakeupPlan(imageBlob, presetStyle = 'natural makeup', presetLayers = ['foundation', 'blush', 'lipstick']) {
        if (!this.model) {
            throw new Error("Gemini Service not initialized.");
        }

        try {
            const base64Image = await this.blobToBase64(imageBlob);

            const prompt = `
            You are a professional makeup artist and AI vision expert.
            Analyze this person's photo and create a detailed, layer-by-layer makeup application plan.
            
            STYLE REQUESTED: ${presetStyle}
            LAYERS TO INCLUDE: ${presetLayers.join(', ')}
            
            Analyze the person's features:
            1. Skin tone (fair, light, medium, tan, deep, rich)
            2. Face shape (oval, round, square, heart, long)
            3. Eye color (if visible)
            4. Hair color (if visible)
            
            Then create a makeup plan with these layers IN ORDER:
            ${presetLayers.map((layer, i) => `${i + 1}. ${layer}`).join('\n')}
            
            For EACH layer, provide:
            - name: layer name (foundation/blush/lipstick/eyes)
            - mask: which facial region (full/cheeks/lips/eyes)
            - color: HEX color code that complements their features
            - intensity: 0-100 (IMPORTANT: use 50-80 for natural looks, 80-100 for dramatic looks)
            - texture: matte/gloss/shimmer/satin/metallic
            - prompt: A HIGHLY SPECIFIC prompt for THIS LAYER ONLY that describes the exact makeup effect.
              CRITICAL RULES:
              1. Use makeup-specific keywords: "glossy", "matte", "shimmer", "metallic", "cream", "powder"
              2. Include color descriptors: "coral pink", "deep burgundy", "warm bronze", "cool taupe"
              3. Describe the finish: "dewy glow", "velvety matte", "high shine", "subtle shimmer"
              4. DO NOT mention face shape, bone structure, or identity
              5. Focus ONLY on the makeup product and its application
              
              GOOD EXAMPLES:
              - Lipstick: "glossy coral pink lipstick with high shine finish, creamy texture, vibrant color"
              - Blush: "warm peachy blush with subtle shimmer, natural flush on cheeks, soft glow"
              - Eyeshadow: "shimmery bronze eyeshadow with metallic finish, warm tones, professional application"
              - Foundation: "smooth matte foundation, even coverage, natural skin finish, flawless base"
              
              BAD EXAMPLES (too vague):
              - "natural makeup"
              - "pretty eyes"
              - "beautiful face"
            
            
            CRITICAL: Return ONLY valid JSON. No markdown, no backticks, no explanations.
            
            Required Format:
            {
              "analysis": {
                "skinTone": "medium",
                "faceShape": "oval",
                "eyeColor": "brown",
                "hairColor": "dark brown"
              },
              "layers": [
                {
                  "name": "foundation",
                  "mask": "full",
                  "color": "#F5D0C5",
                  "intensity": 50,
                  "texture": "matte",
                  "prompt": "smooth matte foundation with medium coverage, natural skin finish, flawless even tone, professional makeup base"
                },
                {
                  "name": "blush",
                  "mask": "cheeks",
                  "color": "#E2725B",
                  "intensity": 60,
                  "texture": "satin",
                  "prompt": "warm peachy blush with satin finish, natural flush on apple of cheeks, subtle glow, soft color"
                },
                {
                  "name": "lipstick",
                  "mask": "lips",
                  "color": "#C74747",
                  "intensity": 80,
                  "texture": "gloss",
                  "prompt": "glossy red lipstick with high shine finish, vibrant color, creamy texture, full coverage"
                },
                {
                  "name": "eyes",
                  "mask": "eyes",
                  "color": "#8B6F47",
                  "intensity": 70,
                  "texture": "shimmer",
                  "prompt": "shimmery bronze eyeshadow with metallic finish, warm golden tones, professional blended application"
                }
              ]
            }
            `;

            const imagePart = {
                inlineData: {
                    data: base64Image,
                    mimeType: imageBlob.type
                },
            };

            const result = await this.model.generateContent([prompt, imagePart]);
            const response = await result.response;
            const text = response.text().trim();

            // Clean up markdown if present
            const jsonStr = text.replace(/```json|```/g, "").trim();
            console.log("🎨 Gemini Makeup Plan:", jsonStr);

            const plan = JSON.parse(jsonStr);

            // Validate the plan structure
            if (!plan.analysis || !plan.layers || !Array.isArray(plan.layers)) {
                throw new Error("Invalid plan structure from Gemini");
            }

            return plan;
        } catch (error) {
            console.error("❌ Gemini Makeup Plan Failed:", error);

            // Return a safe fallback plan
            return this.getFallbackPlan(presetLayers);
        }
    }

    /**
     * Fallback makeup plan if Gemini fails
     */
    getFallbackPlan(layers) {
        const layerDefaults = {
            foundation: {
                name: 'foundation',
                mask: 'full',
                color: '#F5D0C5',
                intensity: 50,
                blendMode: 'normal',
                texture: 'matte',
                prompt: 'even skin tone, flawless foundation, natural finish, professional makeup base, 8k, photorealistic'
            },

            blush: {
                name: 'blush',
                mask: 'cheeks',
                color: '#FF6B9D',
                intensity: 70,
                blendMode: 'multiply',
                texture: 'matte',
                prompt: 'rosy pink blush on cheeks, natural flush, visible color, 8k, photorealistic'
            },
            lipstick: {
                name: 'lipstick',
                mask: 'lips',
                color: '#C70039', // Use TRUE RED instead of pink
                intensity: 80,
                blendMode: 'overlay',
                texture: 'matte',
                prompt: 'intense true red lipstick, defined lips, matte finish, professional makeup, bold red color'
            },
            eyes: {
                name: 'eyes',
                mask: 'eyes',
                color: '#8B6F47',
                intensity: 65,
                blendMode: 'multiply',
                texture: 'shimmer',
                prompt: 'brown eyeshadow, defined eyes, natural eye makeup, professional look'
            }
        };

        return {
            analysis: {
                skinTone: 'Natural',
                faceShape: 'Oval',
                eyeColor: 'Unknown',
                hairColor: 'Unknown'
            },
            layers: layers.map(layerName => layerDefaults[layerName] || layerDefaults.foundation)
        };
    }
}

export const geminiService = new GeminiService();
