import Link from "next/link";

export default function Home() {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Welcome to The ESL Architect</h1>
        <p className="text-slate-600">
          This is your new workspace. Start by creating a new document or ingesting a PDF.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Link href="/editor" className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:border-indigo-300 transition-colors cursor-pointer group">
          <h2 className="font-semibold text-lg mb-2 text-slate-900 group-hover:text-indigo-600">New Document</h2>
          <p className="text-sm text-slate-500">Start from a blank canvas</p>
        </Link>
        <Link href="/ingest" className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:border-indigo-300 transition-colors cursor-pointer group">
          <h2 className="font-semibold text-lg mb-2 text-slate-900 group-hover:text-indigo-600">Ingest PDF</h2>
          <p className="text-sm text-slate-500">Upload and convert an existing resource</p>
        </Link>
        <Link href="/activities" className="bg-gradient-to-br from-indigo-500 to-purple-600 p-6 rounded-xl shadow-lg border border-transparent hover:shadow-xl transition-all cursor-pointer group text-white">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">🎮</span>
            <h2 className="font-semibold text-lg">Activity Builder</h2>
          </div>
          <p className="text-sm text-indigo-100">Generate printable classroom games</p>
        </Link>
      </div>
    </div>
  );
}

