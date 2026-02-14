import { HfInference } from "@huggingface/inference";
import dotenv from 'dotenv';
dotenv.config();

const token = process.env.VITE_HF_API_TOKEN;
const hf = new HfInference(token);

async function test() {
    console.log("Testing SDXL...");
    try {
        await hf.textToImage({
            model: "stabilityai/stable-diffusion-xl-base-1.0",
            inputs: "test",
            parameters: { num_inference_steps: 1 }
        });
        console.log("✅ SDXL is WORKING");
    } catch (err) {
        console.error("❌ SDXL FAILED: " + err.message);
    }
}

test();
