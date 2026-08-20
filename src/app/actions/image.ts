"use server";

import { GoogleGenAI } from "@google/genai";
import { requireAiIdentity } from "@/lib/ai/authorization";
import { IMAGE_AGENT } from "@/lib/ai/catalog";

interface GoogleImagePart {
  type?: string;
  data?: string;
  mime_type?: string;
}

export async function generateImage(prompt: string): Promise<string> {
  await requireAiIdentity();
  const apiKey = process.env.GOOGLE_API_KEY ?? process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_API_KEY is not configured for Nano Banana 2.");
  }
  if (!prompt.trim()) throw new Error("Describe an image before generating it.");

  const ai = new GoogleGenAI({ apiKey });
  const interaction = await ai.interactions.create({
    model: IMAGE_AGENT.model,
    input: `Create a clean educational illustration for an ESL classroom worksheet. ${prompt.trim()} High contrast, uncluttered composition, suitable for screen and A4 printing.`,
    response_modalities: ["image"],
    response_format: {
      type: "image",
      aspect_ratio: "1:1",
      image_size: "1K",
    },
  });

  const directImage = interaction.outputs?.find(
    (output) => output.type === "image",
  ) as GoogleImagePart | undefined;
  const steppedImage = (
    interaction as typeof interaction & {
      steps?: Array<{ content?: GoogleImagePart[] }>;
    }
  ).steps
    ?.flatMap((step) => step.content ?? [])
    .find((output) => output.type === "image");
  const image = directImage ?? steppedImage;

  if (!image?.data) throw new Error("Nano Banana 2 returned no image.");

  return `data:${image.mime_type ?? "image/png"};base64,${image.data}`;
}
