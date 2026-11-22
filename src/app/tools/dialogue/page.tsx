import { AgentSelector } from "@/components/ai/AgentSelector";
import { DialogueBuilder } from "@/components/dialogue/DialogueBuilder";

export default function DialogueBuilderPage() {
  return (
    <div className="mx-auto w-full max-w-5xl">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="mb-2 text-3xl font-bold">Dialogue Builder</h1>
          <p className="max-w-2xl text-slate-500">
            Write or generate a two-voice conversation, listen to it, download it as an MP3 and keep
            it in your library.
          </p>
        </div>
        <AgentSelector />
      </header>

      <DialogueBuilder />
    </div>
  );
}
