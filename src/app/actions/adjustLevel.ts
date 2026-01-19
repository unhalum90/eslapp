"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || "");

export interface LevelAdjustmentResult {
    adjustedText: string;
    originalLevel: string;
    targetLevel: string;
    wordCount: { original: number; adjusted: number };
    complexity: string;
}

export async function adjustLevel(
    text: string,
    targetLevel: string
): Promise<LevelAdjustmentResult> {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        const prompt = `You are an expert ESL text adapter. Rewrite the following text to match CECRL level ${targetLevel}.

ORIGINAL TEXT:
"""
${text}
"""

TARGET LEVEL: ${targetLevel}

LEVEL GUIDELINES:
- A1: Very simple sentences, basic vocabulary (50-100 common words), present tense only
- A2: Simple sentences, everyday vocabulary, present and past tenses
- B1: Connected sentences, broader vocabulary, all basic tenses
- B2: Complex sentences, abstract vocabulary, subjunctive and conditional

RULES:
1. Preserve the MEANING of the original text
2. Adjust vocabulary complexity to match ${targetLevel}
3. Adjust sentence structure to match ${targetLevel}
4. Keep the same topic and key information
5. For A1/A2: Use shorter sentences, simpler words
6. For B1/B2: Can use longer sentences, more sophisticated vocabulary

Return a JSON object with:
{
  "adjustedText": "the rewritten text",
  "originalLevel": "estimated original CECRL level (A1/A2/B1/B2)",
  "complexity": "brief description of changes made"
}

Return ONLY valid JSON, no markdown.`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        let responseText = response.text();

        // Clean up response
        responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

        const data = JSON.parse(responseText);

        return {
            adjustedText: data.adjustedText || text,
            originalLevel: data.originalLevel || 'Unknown',
            targetLevel,
            wordCount: {
                original: text.split(/\s+/).length,
                adjusted: (data.adjustedText || text).split(/\s+/).length,
            },
            complexity: data.complexity || 'Text adjusted',
        };
    } catch (error) {
        console.error("Level Adjustment Error:", error);
        throw new Error("Failed to adjust text level");
    }
}
