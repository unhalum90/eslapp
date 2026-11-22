import { PublishedActivity } from "@/components/interactive/PublishedActivity";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Group Assignment | ESL Architect",
  robots: { index: false, follow: false },
};
export default async function GroupPlayPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  return <PublishedActivity code={code} />;
}
