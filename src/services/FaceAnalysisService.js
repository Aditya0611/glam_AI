import { FilesetResolver, FaceLandmarker } from "@mediapipe/tasks-vision";

class FaceAnalysisService {
    constructor() {
        this.faceLandmarker = null;
        this.initPromise = this.initialize();
    }

    async initialize() {
        try {
            console.log("🚀 Initializing FaceLandmarker...");
            const filesetResolver = await FilesetResolver.forVisionTasks(
                "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
            );
            this.faceLandmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
                baseOptions: {
                    modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
                    delegate: "GPU"
                },
                outputFaceBlendshapes: true,
                runningMode: "IMAGE",
                numFaces: 1
            });
            console.log("✅ FaceLandmarker initialized successfully");
        } catch (error) {
            console.error("❌ FaceLandmarker initialization failed:", error);
            throw error;
        }
    }

    async analyzeImage(imageElement) {
        await this.initPromise;
        if (!this.faceLandmarker) throw new Error("FaceLandmarker not initialized");

        const results = this.faceLandmarker.detect(imageElement);

        if (!results.faceLandmarks || results.faceLandmarks.length === 0) {
            throw new Error("No face detected");
        }

        const landmarks = results.faceLandmarks[0];
        const faceShape = this.determineFaceShape(landmarks);
        const skinTone = this.estimateSkinTone(imageElement, landmarks);

        // Phase 1: Generate Masks
        console.log("🎭 Generating Face Masks...");
        const masks = await this.generateMasks(imageElement, landmarks);

        return {
            faceShape,
            skinTone,
            masks,
            recommendedPrompt: this.generatePrompt(faceShape, skinTone)
        };
    }

    async generateMasks(imageElement, landmarks) {
        const canvas = document.createElement('canvas');
        // We use a temporary canvas to get correct dimensions
        const width = imageElement.naturalWidth || imageElement.width;
        const height = imageElement.naturalHeight || imageElement.height;

        // Landmark indices for regions (MediaPipe Face Mesh)
        const lipIndices = [61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291, 375, 321, 405, 314, 17, 84, 181, 91, 146];
        const leftEyeIndices = [33, 246, 161, 160, 159, 158, 157, 173, 133, 155, 154, 153, 145, 144, 163, 7];
        const rightEyeIndices = [362, 398, 384, 385, 386, 387, 388, 466, 263, 249, 390, 373, 374, 380, 381, 382];
        // Eyebrows (for eyeshadow/lid area)
        const leftEyebrowIndices = [70, 63, 105, 66, 107, 55, 65, 52, 53, 46];
        const rightEyebrowIndices = [336, 296, 334, 293, 300, 276, 283, 282, 295, 285];

        // Correct Blush Areas (Left and Right Cheeks - LOCALIZED TO APPLES)
        // Correct Blush Areas (Left and Right Cheeks - EXPANDED)
        // Expanded to cover apple and cheekbone for better visibility
        const leftCheekIndices = [330, 347, 348, 349, 350, 425, 426, 427, 435, 266, 329, 371, 355, 433, 280];
        const rightCheekIndices = [101, 118, 119, 120, 121, 205, 206, 207, 215, 36, 100, 142, 126, 213, 50];

        // Full face outline for foundation
        const faceOutlineIndices = [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109];

        return {
            full: await this.createFullFaceMask(width, height, landmarks, faceOutlineIndices),
            // Lips: Slight 3px blur for broader blending without losing shape
            lips: await this.createMask(width, height, landmarks, lipIndices, 3),
            // Eyes: Include eyebrows + 15px blur for soft eyeshadow edges
            eyes: await this.createMask(width, height, landmarks, [leftEyeIndices, rightEyeIndices, leftEyebrowIndices, rightEyebrowIndices], 15),
            // Cheeks: Use localized indices with large blur (25px) for a natural glow effect
            cheeks: await this.createMask(width, height, landmarks, [leftCheekIndices, rightCheekIndices], 25)
        };
    }

    /**
     * Creates a mask from landmarks.
     * @param {number} width 
     * @param {number} height 
     * @param {Array} landmarks 
     * @param {Array<number>|Array<Array<number>>} indices - Can be a single array of indices (polygon) OR an array of arrays (multipolygon)
     * @param {number} blurAmount - Optional blur amount
     */
    async createMask(width, height, landmarks, indices, blurAmount = 5) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        // Fill background black
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, width, height);

        // Draw white mask
        ctx.fillStyle = 'white';

        // Helper to draw a single polygon
        const drawPolygon = (polygonIndices) => {
            ctx.beginPath();
            polygonIndices.forEach((index, i) => {
                const landmark = landmarks[index];
                if (!landmark) return;
                const x = landmark.x * width;
                const y = landmark.y * height;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            });
            ctx.closePath();
            ctx.fill();
        };

        // Check if we have a single polygon or multiple
        if (indices.length > 0 && Array.isArray(indices[0])) {
            // Multi-polygon (e.g., eyes, cheeks)
            indices.forEach(polygon => drawPolygon(polygon));
        } else {
            // Single polygon
            drawPolygon(indices);
        }

        // Optional: Blur the mask slightly for smoother transitions
        ctx.filter = `blur(${blurAmount}px)`;
        ctx.drawImage(canvas, 0, 0);

        return canvas.toDataURL('image/png');
    }

    async createFullFaceMask(width, height, landmarks, indices) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        // Fill background black
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, width, height);

        // Draw white mask for full face
        ctx.fillStyle = 'white';
        ctx.beginPath();

        indices.forEach((index, i) => {
            const landmark = landmarks[index];
            if (!landmark) return;
            const x = landmark.x * width;
            const y = landmark.y * height;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });

        ctx.closePath();
        ctx.fill();

        // Apply stronger blur for smoother foundation application
        ctx.filter = 'blur(15px)';
        ctx.drawImage(canvas, 0, 0);

        return canvas.toDataURL('image/png');
    }

    // Simplified geometric calculations for Face Shape
    determineFaceShape(landmarks) {
        // Indexes for key landmarks (approximations)
        // 10: Top of forehead, 152: Chin
        // 234: Left cheekbone, 454: Right cheekbone
        // 162: Left jaw, 389: Right jaw

        const top = landmarks[10];
        const bottom = landmarks[152];
        const leftCheek = landmarks[234];
        const rightCheek = landmarks[454];
        const leftJaw = landmarks[162];
        const rightJaw = landmarks[389];

        const faceHeight = Math.abs(top.y - bottom.y);
        const cheekWidth = Math.abs(leftCheek.x - rightCheek.x);
        const jawWidth = Math.abs(leftJaw.x - rightJaw.x);

        const lengthToWidthRatio = faceHeight / cheekWidth;
        const jawToCheekRatio = jawWidth / cheekWidth;

        if (lengthToWidthRatio > 1.5) {
            return "Long";
        } else if (jawToCheekRatio > 0.9) {
            return "Square";
        } else if (lengthToWidthRatio < 1.15 && jawToCheekRatio < 0.8) {
            return "Round";
        } else if (jawWidth < cheekWidth * 0.7) {
            return "Heart";
        } else {
            return "Oval"; // Default/Balanced
        }
    }

    estimateSkinTone(imageElement, landmarks) {
        // This is a placeholder. Real skin tone detection requires canvas pixel sampling.
        // For now, we'll return a generic "Warm" or "Cool" based on random logic 
        // or just default to "Natural" to avoid blocking the MVP.
        // Implementing robust pixel sampling is computationally expensive for this step.
        return "Natural";
    }

    generatePrompt(faceShape, skinTone) {
        const shapeAdvice = {
            "Oval": "balanced application to enhance natural symmetry",
            "Round": "subtle highlighting to define cheekbones and lengthen the face",
            "Square": "softening blush and rounded highlighting to balance angles",
            "Heart": "highlighting the jawline and balancing the forehead width",
            "Long": "horizontal blush application to widen the face visually"
        };

        const basePrompt = `Professional glamour makeup, detailed, 8k, photorealistic.`;
        const specificAdvice = shapeAdvice[faceShape] || shapeAdvice["Oval"];

        return `${basePrompt} Apply ${specificAdvice}. ${skinTone} skin tone compatible colors. elegant evening look, soft lighting, high fashion style.`;
    }
}

export const faceAnalysisService = new FaceAnalysisService();
