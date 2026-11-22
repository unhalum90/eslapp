import type { Metadata } from "next";
import { SpeakingWorkspace } from "@/components/speaking/SpeakingWorkspace";

export const metadata: Metadata = {
  title: "Oral des élèves | Atelier de séquences",
  description: "Transcrire un enregistrement MP3 par locuteur et préparer un retour linguistique.",
};

export default function SpeakingPage() {
  return <SpeakingWorkspace />;
}
