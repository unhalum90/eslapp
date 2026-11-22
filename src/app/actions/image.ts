"use server";

import { GoogleGenAI } from "@google/genai";
import { createOpenAI } from "@ai-sdk/openai";
import { generateImage as generateImageWithModel } from "ai";
import { requireAiIdentity } from "@/lib/ai/authorization";
import {
  IMAGE_AGENT,
  IMAGE_AGENTS,
  isImageAgentId,
  OPENAI_IMAGE_AGENT,
  type ImageAgentId,
} from "@/lib/ai/catalog";
import type { ImageGenerationVariant } from "@/lib/image-generation/types";

interface GoogleImagePart {
  type?: string;
  data?: string;
  mime_type?: string;
}

function educationalPrompt(prompt: string): string {
  return `Create a clean educational illustration for an ESL classroom worksheet. ${prompt.trim()} High contrast, uncluttered composition, no border, suitable for screen and A4 printing.`;
}

async function generateGeminiImage(prompt: string): Promise<string> {
  const apiKey = process.env.GOOGLE_API_KEY ?? process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_API_KEY is not configured for Nano Banana 2.");
  }

  const ai = new GoogleGenAI({ apiKey });
  const interaction = await ai.interactions.create({
    model: IMAGE_AGENT.model,
    input: educationalPrompt(prompt),
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

async function generateOpenAiImage(prompt: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured for GPT Image 2.");

  const openai = createOpenAI({ apiKey });
  const { image } = await generateImageWithModel({
    model: openai.image(OPENAI_IMAGE_AGENT.model),
    prompt: educationalPrompt(prompt),
    size: "1024x1024",
  });

  return `data:${image.mediaType};base64,${image.base64}`;
}

export async function generateImageVariants(
  prompt: string,
  requestedProviders: ImageAgentId[],
): Promise<ImageGenerationVariant[]> {
  if (!prompt.trim()) throw new Error("Describe an image before generating it.");

  const providers = Array.from(new Set(requestedProviders.filter(isImageAgentId))).slice(0, 2);
  if (providers.length === 0) throw new Error("Choose at least one image provider.");

  try {
    await requireAiIdentity();
  } catch (error) {
    const requiresSignIn =
      error instanceof Error && error.message.toLowerCase().includes("sign in");
    return providers.map((provider) => ({
      provider,
      providerLabel: IMAGE_AGENTS[provider].label,
      model: IMAGE_AGENTS[provider].model,
      dataUrl: null,
      error: requiresSignIn
        ? "Sign in with a teacher account to generate images."
        : "Image generation is not available for this account.",
    }));
  }

  return Promise.all(
    providers.map(async (provider): Promise<ImageGenerationVariant> => {
      const definition = IMAGE_AGENTS[provider];
      try {
        const dataUrl =
          provider === "gemini"
            ? await generateGeminiImage(prompt)
            : await generateOpenAiImage(prompt);
        return {
          provider,
          providerLabel: definition.label,
          model: definition.model,
          dataUrl,
          error: null,
        };
      } catch (error) {
        const detail = error instanceof Error ? error.message.toLowerCase() : "";
        return {
          provider,
          providerLabel: definition.label,
          model: definition.model,
          dataUrl: null,
          error: detail.includes("not configured")
            ? `${definition.label} is not configured on this server.`
            : `${definition.label} could not generate this image. Try again.`,
        };
      }
    }),
  );
}

export async function generateImage(prompt: string): Promise<string> {
  const [variant] = await generateImageVariants(prompt, ["gemini"]);
  if (!variant?.dataUrl) throw new Error(variant?.error ?? "Nano Banana 2 returned no image.");
  return variant.dataUrl;
}
