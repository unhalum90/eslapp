import { PublishedActivity } from "@/components/interactive/PublishedActivity";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Simple Order | ESL Architect",
  robots: { index: false, follow: false },
};
export default async function OrderingPlayPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  return <PublishedActivity code={code} />;
}
