import type { Metadata } from "next";
import { TeacherWorkspace } from "@/components/workspace/TeacherWorkspace";

export const metadata: Metadata = {
  title: "Mes séquences | Atelier de séquences",
  description: "Planifier une séquence et produire un dossier coordonné pour la classe.",
};

export default async function WorkspacePage({
  searchParams,
}: {
  searchParams: Promise<{ driveMaterial?: string }>;
}) {
  const { driveMaterial } = await searchParams;
  return <TeacherWorkspace initialTab={driveMaterial ? "materials" : "plan"} />;
}
