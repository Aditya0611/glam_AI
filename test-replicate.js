import dotenv from 'dotenv';
dotenv.config();

const token = process.env.VITE_REPLICATE_API_KEY;

async function testReplicate() {
    console.log("Testing Replicate API...");
    console.log("Token:", token ? token.substring(0, 10) + "..." : "MISSING");

    // Test 1: Simple text-to-image (should work)
    console.log("\n1. Testing basic text-to-image...");
    try {
        const response = await fetch("https://api.replicate.com/v1/predictions", {
            method: "POST",
            headers: {
                "Authorization": `Token ${token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                version: "39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b", // SDXL
                input: {
                    prompt: "a beautiful woman with green lipstick"
                }
            })
        });

        const data = await response.json();
        console.log("Status:", response.status);
        console.log("Response:", JSON.stringify(data, null, 2));
    } catch (err) {
        console.error("Error:", err.message);
    }
}

testReplicate();
