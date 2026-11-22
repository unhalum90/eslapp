import { PublishedMatching } from "@/components/matching/PublishedMatching";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Matching Pairs | ESL Architect",
  robots: { index: false, follow: false },
};
export default async function MatchingPlayPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  return <PublishedMatching code={code} />;
}
