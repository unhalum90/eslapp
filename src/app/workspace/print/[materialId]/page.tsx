import type { Metadata } from "next";
import { MaterialPrintPreview } from "@/components/workspace/MaterialPrintPreview";

export const metadata: Metadata = {
  title: "Aperçu du document | Atelier de séquences",
  description: "Aperçu A4 prêt à imprimer.",
};

export default async function MaterialPrintPage({
  params,
}: {
  params: Promise<{ materialId: string }>;
}) {
  const { materialId } = await params;
  return <MaterialPrintPreview materialId={materialId} />;
}
