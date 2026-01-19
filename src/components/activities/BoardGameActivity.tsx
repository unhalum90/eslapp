"use client";

import React from 'react';
import { VOCABULARY, BOARD_COLORS } from '@/lib/activities/constants';
import { Printer } from 'lucide-react';
import { GeneratedVocabulary } from '@/app/actions/generateActivities';

interface BoardGameActivityProps {
    customVocabulary?: GeneratedVocabulary[];
}

export function BoardGameActivity({ customVocabulary }: BoardGameActivityProps) {
    const gameVocab = React.useMemo(() => {
        if (customVocabulary && customVocabulary.length > 0) {
            return customVocabulary.slice(0, 24).map(v => ({ english: v.english, category: v.category, emoji: v.emoji }));
        }
        return VOCABULARY.filter(v => v.category === 'House' || v.category === 'Furniture').slice(0, 24).map(v => ({ ...v, emoji: '' }));
    }, [customVocabulary]);

    const getVisual = (text: string, emoji?: string) => {
        if (emoji) return emoji;
        const t = text.toLowerCase();
        if (t.includes('bathroom')) return '🛁';
        if (t.includes('kitchen')) return '🍳';
        if (t.includes('bedroom')) return '🛏️';
        return '✨';
    };

    const handlePrint = () => window.print();

    return (
        <div className="space-y-6">
            <style dangerouslySetInnerHTML={{
                __html: `
        @media print {
          @page { size: A4 landscape; margin: 1cm; }
          .no-print, header, footer, nav, button, aside { display: none !important; }
          body { background: white !important; }
          .board-grid { display: grid !important; grid-template-columns: repeat(5, 1fr) !important; gap: 12px !important; }
          .square-item { height: 180px !important; break-inside: avoid; print-color-adjust: exact !important; -webkit-print-color-adjust: exact !important; }
        }
      `}} />

            <div className="bg-white p-8 rounded-xl border-l-8 border-emerald-500 shadow-sm no-print">
                <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                    <div className="flex-grow">
                        <h3 className="text-2xl font-black text-emerald-900 mb-2">Vocabulary Board Game</h3>
                        <p className="text-lg text-slate-600 mb-4"><strong>Activity:</strong> Roll & Describe (15 Minutes)</p>
                        <p className="text-base text-slate-600">Use dice to move. Make a sentence about each square you land on!</p>
                    </div>
                    <button onClick={handlePrint} className="flex items-center gap-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black px-8 py-4 rounded-2xl shadow-xl shadow-emerald-200 transition-all hover:scale-105 active:scale-95 shrink-0">
                        <Printer size={24} strokeWidth={3} />
                        Print Board Game
                    </button>
                </div>
            </div>

            <div className="print-container">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 board-grid">
                    {gameVocab.map((v, idx) => {
                        const color = BOARD_COLORS[idx % BOARD_COLORS.length];
                        return (
                            <div key={idx} className="square-item rounded-2xl border-4 p-4 flex flex-col items-center justify-center text-center shadow-sm transition-transform hover:scale-[1.02] min-h-[180px]"
                                style={{ backgroundColor: color.bg, borderColor: color.border, color: color.text }}>
                                <span className="text-6xl mb-4 drop-shadow-sm">{getVisual(v.english, v.emoji)}</span>
                                <span className="font-black text-xl uppercase leading-tight tracking-tighter">{v.english}</span>
                                <span className="mt-2 text-xs font-bold opacity-60">#{idx + 1}</span>
                            </div>
                        );
                    })}
                    <div className="square-item rounded-2xl border-4 border-emerald-500 bg-emerald-50 p-4 flex flex-col items-center justify-center text-center shadow-sm min-h-[180px]">
                        <span className="text-6xl mb-4">🎲</span>
                        <span className="font-black text-xl text-emerald-900 uppercase">ROLL AGAIN!</span>
                    </div>
                </div>
            </div>

            <div className="bg-white p-6 rounded-xl text-sm text-slate-600 flex items-center gap-4 border border-slate-200 shadow-sm no-print">
                <span className="bg-emerald-600 px-3 py-1.5 rounded text-white italic font-black shrink-0">TEACHER TIP</span>
                <span className="text-base font-medium">Encourage full sentences: &quot;I like...&quot; or &quot;I see...&quot;</span>
            </div>
        </div>
    );
}
