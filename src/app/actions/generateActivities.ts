"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || "");

export interface GeneratedVocabulary {
    english: string;
    category: string;
    emoji: string;
}

export interface GeneratedGridPrompt {
    text: string;
    type: 'positive' | 'negative' | 'question';
}

export interface GeneratedActivityPack {
    topic: string;
    level: string;
    vocabulary: GeneratedVocabulary[];
    gridPrompts: GeneratedGridPrompt[];
}

export async function generateActivities(topic: string, level: string = "A1-A2"): Promise<GeneratedActivityPack> {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        const prompt = `You are an ESL vocabulary generator. Generate vocabulary for ESL classroom activities.

TOPIC: "${topic}"
LEVEL: ${level} (CECRL)

Generate a JSON response with EXACTLY this structure:
{
  "vocabulary": [
    {"english": "word", "category": "Category Name", "emoji": "🎯"}
  ],
  "gridPrompts": [
    {"text": "action phrase", "type": "positive|negative|question"}
  ]
}

RULES:
1. Generate exactly 48 vocabulary items
2. Split vocabulary into 4 distinct categories related to "${topic}" (12 items each)
3. Each word MUST have an appropriate emoji
4. Generate exactly 36 grid prompts for the Roll-a-Sentence game
5. Grid prompts should be short phrases/verbs (2-4 words) related to ${topic}
6. Evenly distribute grid prompt types: 12 positive, 12 negative, 12 question
7. Keep vocabulary appropriate for ${level} level
8. Return ONLY valid JSON, no markdown code blocks

Example for "Weather":
{
  "vocabulary": [
    {"english": "sunny", "category": "Weather Types", "emoji": "☀️"},
    {"english": "umbrella", "category": "Weather Items", "emoji": "☂️"}
  ],
  "gridPrompts": [
    {"text": "go outside", "type": "positive"},
    {"text": "stay home", "type": "negative"},
    {"text": "rainy today", "type": "question"}
  ]
}`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        let text = response.text();

        // Clean up response - remove markdown code blocks if present
        text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

        const data = JSON.parse(text);

        return {
            topic,
            level,
            vocabulary: data.vocabulary || [],
            gridPrompts: data.gridPrompts || [],
        };
    } catch (error) {
        console.error("Activity Generation Error:", error);
        throw new Error("Failed to generate activities");
    }
}
