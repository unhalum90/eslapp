import type { ImageAgentId } from "@/lib/ai/catalog";

export type ImageGenerationMode = ImageAgentId | "compare";

export interface ImageGenerationVariant {
  provider: ImageAgentId;
  providerLabel: string;
  model: string;
  dataUrl: string | null;
  error: string | null;
}
