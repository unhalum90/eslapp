"use client";

import React, { useMemo } from 'react';
import { VOCABULARY } from '@/lib/activities/constants';
import { Printer } from 'lucide-react';
import { GeneratedVocabulary } from '@/app/actions/generateActivities';

interface DominoActivityProps {
    customVocabulary?: GeneratedVocabulary[];
}

export function DominoActivity({ customVocabulary }: DominoActivityProps) {
    const vocabulary = useMemo(() => {
        if (customVocabulary && customVocabulary.length > 0) {
            return customVocabulary.map(v => ({ english: v.english, category: v.category, emoji: v.emoji }));
        }
        return VOCABULARY.map(v => ({ ...v, emoji: '' }));
    }, [customVocabulary]);

    const dominoes = useMemo(() => {
        const items = [...vocabulary].sort(() => 0.5 - Math.random()).slice(0, 24);
        return items.map((item, index) => {
            const nextItem = items[(index + 1) % items.length];
            return { leftVisual: item.english, leftEmoji: item.emoji, rightText: nextItem.english };
        });
    }, [vocabulary]);

    const getVisual = (text: string, emoji?: string) => {
        if (emoji) return emoji;
        const t = text.toLowerCase();
        if (t.includes('bathroom')) return '🛁';
        if (t.includes('kitchen')) return '🍳';
        if (t.includes('bedroom')) return '🛏️';
        if (t.includes('burger')) return '🍔';
        if (t.includes('pizza')) return '🍕';
        return '✨';
    };

    const handlePrint = () => window.print();

    return (
        <div className="space-y-6">
            <style dangerouslySetInnerHTML={{
                __html: `
        @media print {
          @page { size: A4 portrait; margin: 1cm; }
          .no-print, header, footer, nav, button, aside { display: none !important; }
          body { background: white !important; }
          .print-grid { display: grid !important; grid-template-columns: repeat(3, 1fr) !important; gap: 15px !important; }
          .domino-piece { break-inside: avoid; height: 150px !important; print-color-adjust: exact !important; -webkit-print-color-adjust: exact !important; }
        }
      `}} />

            <div className="bg-white p-8 rounded-xl border-l-8 border-indigo-500 shadow-sm no-print">
                <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                    <div className="flex-grow">
                        <h3 className="text-2xl font-black text-indigo-900 mb-2">Word-Picture Dominoes</h3>
                        <p className="text-lg text-slate-600 mb-4"><strong>Activity:</strong> Vocabulary Chain (24 Pieces)</p>
                        <p className="text-base text-slate-600">Match the picture with the correct word. <em className="text-indigo-700 font-bold">Connect all 24 pieces!</em></p>
                    </div>
                    <button onClick={handlePrint} className="flex items-center gap-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black px-8 py-4 rounded-2xl shadow-xl transition-all hover:scale-105 active:scale-95 shrink-0">
                        <Printer size={24} strokeWidth={3} />
                        Print 24 Dominoes
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 print-grid">
                {dominoes.map((d, i) => (
                    <div key={i} className="domino-piece bg-white border-[3px] border-slate-800 rounded-xl flex h-40 overflow-hidden shadow-sm group hover:border-indigo-600 transition-all">
                        <div className="w-1/2 flex items-center justify-center bg-slate-50 border-r-[2px] border-slate-800 group-hover:bg-indigo-50 group-hover:border-indigo-600 transition-colors">
                            <span className="text-7xl drop-shadow-sm">{getVisual(d.leftVisual, d.leftEmoji)}</span>
                        </div>
                        <div className="w-1/2 flex items-center justify-center p-2 text-center bg-white">
                            <span className="text-2xl font-black uppercase tracking-tighter leading-none text-slate-900 break-words">{d.rightText}</span>
                        </div>
                    </div>
                ))}
            </div>

            <div className="bg-indigo-900 text-indigo-100 p-6 rounded-2xl no-print flex items-center gap-6">
                <div className="text-4xl">🎲</div>
                <div>
                    <h4 className="font-black uppercase tracking-tight">Large Class Tip</h4>
                    <p className="opacity-80">Students can work in teams to assemble the longest chain!</p>
                </div>
            </div>
        </div>
    );
}
