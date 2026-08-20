import type { Metadata } from "next";
import { PracticeView } from "@/components/practice/PracticeView";

export const metadata: Metadata = {
  title: "Practice | The ESL Architect",
  description: "Anonymous pair practice. No score or student profile is recorded.",
};

export default async function PracticePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  return <PracticeView code={code} />;
}

