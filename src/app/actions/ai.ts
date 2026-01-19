"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || "");

export async function generateText(prompt: string, context: string = "") {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

        const systemInstruction = `You are "The ESL Architect", an AI assistant that helps French ESL teachers create educational content.

**OUTPUT RULES:**
1. Return ONLY plain text content.
2. DO NOT return JSON, code blocks, or structured data.
3. DO NOT include "action", "thought", or any meta-commentary.
4. If asked for an image, describe it in text (e.g., "[Image: Birthday cake illustration]").
5. For document edits: return the complete modified text.
6. For new content: return ready-to-use educational text.`;

        const fullPrompt = context
            ? `${systemInstruction}\n\nExisting Text:\n${context}\n\nUser Request: ${prompt}\n\nReturn only the plain text result:`
            : `${systemInstruction}\n\nUser Request: ${prompt}\n\nReturn only the plain text result:`;

        const result = await model.generateContent(fullPrompt);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error("AI Generation Error:", error);
        throw new Error("Failed to generate content");
    }
}
