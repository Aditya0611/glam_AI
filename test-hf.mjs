import { HfInference } from "@huggingface/inference";
import dotenv from 'dotenv';
dotenv.config();

const token = process.env.VITE_HF_API_TOKEN;
console.log("Testing Token:", token ? token.substring(0, 5) + "..." : "MISSING");

const hf = new HfInference(token);

async function test() {
    try {
        console.log("Attempting generation with CompVis/stable-diffusion-v1-4...");
        // Minimal test request
        await hf.request({
            model: "CompVis/stable-diffusion-v1-4",
            method: "POST",
            data: {
                inputs: "test image",
            }
        });
        console.log("SUCCESS! Token is valid.");
    } catch (error) {
        console.error("FAILURE:", error.message);
        if (error.response) {
            console.error("Status:", error.response.status);
            console.error("Data:", await error.response.text());
        }
    }
}

test();
