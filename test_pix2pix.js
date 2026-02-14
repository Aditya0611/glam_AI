import { HfInference } from "@huggingface/inference";
import dotenv from 'dotenv';
dotenv.config();

const token = process.env.VITE_HF_API_TOKEN;
const hf = new HfInference(token);

async function test() {
    console.log("Testing Instruct-Pix2Pix...");
    try {
        // Simple test to see if model accepts requests
        await hf.textToImage({
            model: "timbrooks/instruct-pix2pix",
            inputs: "test",
            parameters: { num_inference_steps: 1 }
        });
        console.log("✅ Instruct-Pix2Pix is WORKING");
    } catch (err) {
        console.error("❌ Instruct-Pix2Pix FAILED:");
        console.error(err.message);

        if (err.message.includes("401")) console.log("-> Token Invalid");
        else if (err.message.includes("503") || err.message.includes("Provider")) console.log("-> Model Unavailable (Free Tier limitation)");
    }
}

test();
