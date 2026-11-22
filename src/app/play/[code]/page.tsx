import type { Metadata } from "next";
import Link from "next/link";
import { StudioPlayer } from "@/components/studio/player/StudioPlayer";
import { resolvePublication, StudioError, studioUserId } from "@/lib/studio/storage";

export const dynamic = "force-dynamic";

type Params = Promise<{ code: string }>;
type Search = Promise<{ v?: string; classroom?: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { code } = await params;
  try {
    const resolved = await resolvePublication(code);
    return {
      title: resolved ? `${resolved.snapshot.document.title} | Interactive Studio` : "Leçon indisponible | Interactive Studio",
      description: resolved?.snapshot.document.settings.instructions || "Activité interactive d'anglais.",
      robots: { index: false, follow: false },
    };
  } catch {
    return { title: "Leçon indisponible | Interactive Studio", robots: { index: false, follow: false } };
  }
}

export default async function PlayPage({ params, searchParams }: { params: Params; searchParams: Search }) {
  const { code } = await params;
  const query = await searchParams;
  const requestedVersion = query.v ? Number.parseInt(query.v, 10) : undefined;

  let resolved: Awaited<ReturnType<typeof resolvePublication>> = null;
  let failure: string | null = null;
  try {
    resolved = await resolvePublication(code, Number.isFinite(requestedVersion) ? requestedVersion : undefined);
  } catch (error) {
    failure = error instanceof StudioError ? error.message : "La leçon n'a pas pu être chargée.";
  }

  if (!resolved) {
    return (
      <main className="flex h-full items-center justify-center p-6">
        <div className="max-w-md rounded-3xl bg-white p-8 text-center shadow">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-[#758184]">Interactive Studio</p>
          <h1 className="mt-2 text-2xl font-black text-[#18282b]">{failure ? "Leçon indisponible" : "Cette leçon n'est pas (ou plus) publiée"}</h1>
          <p className="mt-3 text-sm text-slate-600">{failure ?? "Vérifiez le lien ou le code avec votre professeur."}</p>
          <Link href="/" className="mt-6 inline-flex rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold">Accueil</Link>
        </div>
      </main>
    );
  }

  const userId = await studioUserId();
  const teacher = Boolean(userId && userId === resolved.ownerId);

  return (
    <StudioPlayer
      document={resolved.snapshot.document}
      mode="player"
      teacher={teacher}
      initialClassroom={teacher && query.classroom === "1"}
      code={resolved.snapshot.code}
      version={resolved.snapshot.version}
      pinned={resolved.pinned}
    />
  );
}
