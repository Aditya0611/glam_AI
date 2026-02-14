import dotenv from 'dotenv';
dotenv.config();

const token = process.env.VITE_REPLICATE_API_KEY;
const model = "black-forest-labs/flux-2-klein-4b";

async function listVersions() {
    console.log(`Checking versions for ${model}...`);
    try {
        const response = await fetch(`https://api.replicate.com/v1/models/${model}`, {
            headers: {
                "Authorization": `Token ${token}`,
            }
        });

        if (!response.ok) {
            throw new Error(`Replicate API error: ${response.status}`);
        }

        const data = await response.json();
        console.log("Model Name:", data.name);
        if (data.latest_version) {
            console.log("---HASH_START---");
            console.log(data.latest_version.id);
            console.log("---HASH_END---");
        } else {
            console.log("No version found for this model.");
        }
    } catch (err) {
        console.error("Error:", err.message);
    }
}

listVersions();
