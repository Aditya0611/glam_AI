import { HfInference } from "@huggingface/inference";
import dotenv from 'dotenv';
dotenv.config();

const token = process.env.VITE_HF_API_TOKEN;
const hf = new HfInference(token);

const models = [
    "timbrooks/instruct-pix2pix",
    "lllyasviel/control_v11p_sd15_canny",
    "runwayml/stable-diffusion-v1-5",
    "CompVis/stable-diffusion-v1-4",
    "stabilityai/stable-diffusion-2-1",
    "stabilityai/stable-diffusion-xl-base-1.0",
    "prompthero/openjourney"
];

async function probe() {
    console.log("Probing models with token:", token ? token.substring(0, 5) + "..." : "MISSING");

    for (const model of models) {
        try {
            console.log(`Testing ${model}...`);
            // We use a small text-to-image request as a ping
            await hf.textToImage({
                model: model,
                inputs: "test",
                parameters: { num_inference_steps: 1 }
            });
            console.log(`✅ [AVAILABLE] ${model}`);
        } catch (err) {
            console.log(`❌ [FAILED] ${model}: ${err.message}`);
        }
    }
}

probe();
