require('dotenv').config({ path: '.env.local' });

async function listModels() {
    try {
        const key = process.env.GOOGLE_API_KEY ?? process.env.GEMINI_API_KEY;
        if (!key) throw new Error("GOOGLE_API_KEY not found in .env.local");

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
        const data = await response.json();

        if (data.models) {
            console.log("Available Google image models:");
            data.models
                .filter((model) => model.name.includes("image"))
                .forEach((model) => console.log(`- ${model.name} (${model.displayName})`));
        } else {
            console.log("No models found or error:", data);
        }

    } catch (error) {
        console.error("Error listing models:", error);
    }
}

listModels();
