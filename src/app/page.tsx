import Link from "next/link";

export default function Home() {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Welcome to The ESL Architect</h1>
        <p className="text-slate-600">
          Plan reusable teaching units, adapt them for each class, and distribute anonymous practice.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Link href="/workspace" className="bg-gradient-to-br from-indigo-600 to-violet-600 p-6 rounded-xl shadow-lg border border-transparent hover:shadow-xl transition-all cursor-pointer group text-white md:col-span-2 lg:col-span-2">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-100">Phase 1</p>
          <h2 className="mt-2 font-semibold text-xl">Open teacher workspace</h2>
          <p className="mt-2 text-sm leading-6 text-indigo-100">
            Build a unit from its final task, manage sessions and vocabulary, preserve decisions,
            fork for a class, and publish a permanent practice code.
          </p>
        </Link>
        <Link href="/editor" className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:border-indigo-300 transition-colors cursor-pointer group">
          <h2 className="font-semibold text-lg mb-2 text-slate-900 group-hover:text-indigo-600">Resource canvas</h2>
          <p className="text-sm text-slate-500">Create supporting classroom material</p>
        </Link>
        <Link href="/ingest" className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:border-indigo-300 transition-colors cursor-pointer group">
          <h2 className="font-semibold text-lg mb-2 text-slate-900 group-hover:text-indigo-600">Ingest PDF</h2>
          <p className="text-sm text-slate-500">Upload and convert an existing resource</p>
        </Link>
        <Link href="/activities" className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:border-indigo-300 transition-colors cursor-pointer group">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">🎮</span>
            <h2 className="font-semibold text-lg text-slate-900 group-hover:text-indigo-600">Activity Builder</h2>
          </div>
          <p className="text-sm text-slate-500">Generate printable classroom games</p>
        </Link>
      </div>
    </div>
  );
}
