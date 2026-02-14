import { HfInference } from "@huggingface/inference";
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();

const token = process.env.VITE_HF_API_TOKEN;
const hf = new HfInference(token);

async function diagnose() {
    console.log("=== FULL DIAGNOSTIC ===");
    console.log("Token:", token ? token.substring(0, 10) + "..." : "MISSING");

    // Test 1: Token validity
    console.log("\n1. Testing Token Validity...");
    try {
        const models = await hf.listModels({ limit: 1 });
        console.log("✅ Token is VALID");
    } catch (err) {
        console.log("❌ Token is INVALID:", err.message);
        return;
    }

    // Test 2: SDXL availability
    console.log("\n2. Testing SDXL...");
    try {
        await hf.textToImage({
            model: "stabilityai/stable-diffusion-xl-base-1.0",
            inputs: "test",
            parameters: { num_inference_steps: 1 }
        });
        console.log("✅ SDXL is AVAILABLE");
    } catch (err) {
        console.log("❌ SDXL FAILED:", err.message);
    }

    // Test 3: Alternative models
    console.log("\n3. Testing Alternatives...");
    const alternatives = [
        "black-forest-labs/FLUX.1-schnell",
        "stabilityai/stable-diffusion-2-1",
        "runwayml/stable-diffusion-v1-5"
    ];

    for (const model of alternatives) {
        try {
            await hf.textToImage({
                model: model,
                inputs: "test",
                parameters: { num_inference_steps: 1 }
            });
            console.log(`✅ ${model} WORKS`);
        } catch (err) {
            console.log(`❌ ${model} FAILED`);
        }
    }

    console.log("\n=== DIAGNOSTIC COMPLETE ===");
}

diagnose();
