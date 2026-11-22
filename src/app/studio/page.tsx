import type { Metadata } from "next";
import { StudioHome } from "@/components/studio/StudioHome";

export const metadata: Metadata = {
  title: "Interactive Studio | Atelier de séquences",
  description: "Créer des leçons interactives : zones cliquables, audio, fenêtres et questions, partagées par lien ou QR code.",
};

export default function StudioPage() {
  return <StudioHome />;
}
