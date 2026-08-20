import type { Metadata } from "next";
import { TeacherWorkspace } from "@/components/workspace/TeacherWorkspace";

export const metadata: Metadata = {
  title: "Teacher Workspace | The ESL Architect",
  description: "Plan, version, adapt and distribute ESL units by class.",
};

export default function WorkspacePage() {
  return <TeacherWorkspace />;
}

