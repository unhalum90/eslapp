import type { Metadata } from "next";
import { StudioEditor } from "@/components/studio/editor/StudioEditor";

export const metadata: Metadata = {
  title: "Éditeur | Interactive Studio",
};

export default async function StudioEditorPage({ params }: { params: Promise<{ lessonId: string }> }) {
  const { lessonId } = await params;
  return <StudioEditor lessonId={lessonId} />;
}
