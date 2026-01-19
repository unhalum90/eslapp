"use server";

import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY || "" });

export async function generateImage(prompt: string): Promise<string> {
    try {
        // Use Imagen 4 for image generation (available in v1beta)
        const response = await ai.models.generateImages({
            model: "imagen-4.0-generate-001",
            prompt: `Educational illustration for ESL classroom: ${prompt}. Clean, colorful clipart style suitable for printing.`,
            config: {
                numberOfImages: 1,
                outputMimeType: "image/png",
            },
        });

        // Get the generated image as base64
        if (response.generatedImages && response.generatedImages.length > 0) {
            const imageData = response.generatedImages[0].image?.imageBytes;
            if (imageData) {
                return `data:image/png;base64,${imageData}`;
            }
        }

        throw new Error("No image generated");
    } catch (error) {
        console.error("Image Generation Error:", error);
        throw new Error("Failed to generate image");
    }
}
