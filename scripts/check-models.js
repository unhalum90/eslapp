const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config({ path: '.env.local' });

async function listModels() {
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
    try {
        // Note: listModels is on the genAI instance or model manager depending on SDK version.
        // For @google/generative-ai, it is often via genAI.getGenerativeModel but list might not be directly exposed in helper
        // We might need to use the rest API or check SDK docs. 
        // Actually validation: for the node SDK, it is not always direct. 
        // Let's try to fetch a model and if it fails (like before), we can't list.
        // BUT, the error message said: "Call ListModels to see the list".
        // Let's assume we can't easily list with the *basic* SDK import without looking up the specific method.
        // A better check is to try 'gemini-2.0-flash' or 'gemini-3.0-flash' which the user implies exist.
        // However, let's try to raw fetch the API endpoint if SDK doesn't expose it easily.

        const key = process.env.GOOGLE_API_KEY;
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
        const data = await response.json();

        if (data.models) {
            console.log("Available Models:");
            data.models.forEach(m => console.log(`- ${m.name} (${m.displayName})`));
        } else {
            console.log("No models found or error:", data);
        }

    } catch (error) {
        console.error("Error listing models:", error);
    }
}

listModels();
