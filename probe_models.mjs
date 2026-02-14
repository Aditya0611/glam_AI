import { HfInference } from "@huggingface/inference";
import dotenv from 'dotenv';
dotenv.config();

const token = process.env.VITE_HF_API_TOKEN;
const hf = new HfInference(token);

const models = [
    "runwayml/stable-diffusion-v1-5",
    "CompVis/stable-diffusion-v1-4",
    "prompthero/openjourney",
    "stabilityai/stable-diffusion-2-1",
    "dreamlike-art/dreamlike-diffusion-1.0",
    "hakurei/waifu-diffusion",
    "Lykon/DreamShaper",
    "stabilityai/sdxl-turbo"
];

async function probe() {
    console.log("Starting Mass Probe (textToImage)...");

    for (const model of models) {
        try {
            process.stdout.write(`Testing ${model}... `);
            await hf.textToImage({
                model: model,
                inputs: "test"
            });
            console.log("✅ ONLINE");
        } catch (e) {
            // 503 = Overloaded, 401/403 = Auth, 404 = Not Found
            console.log("❌ FAIL: " + (e.statusCode || e.message));
        }
    }
}

probe();
