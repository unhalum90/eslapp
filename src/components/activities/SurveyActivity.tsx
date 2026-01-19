"use client";

import React, { useMemo } from 'react';
import { VOCABULARY, SNAKE_LADDER_COLORS, LADDERS, SNAKES } from '@/lib/activities/constants';
import { Printer } from 'lucide-react';
import { GeneratedVocabulary } from '@/app/actions/generateActivities';

interface SurveyActivityProps {
    customVocabulary?: GeneratedVocabulary[];
}

export function SurveyActivity({ customVocabulary }: SurveyActivityProps) {
    const items = useMemo(() => {
        if (customVocabulary && customVocabulary.length > 0) {
            return customVocabulary.slice(0, 23).map(v => ({ english: v.english, category: v.category, emoji: v.emoji }));
        }
        return [...VOCABULARY].sort(() => Math.random() - 0.5).slice(0, 23).map(v => ({ ...v, emoji: '' }));
    }, [customVocabulary]);

    const getVisual = (text: string, emoji?: string) => {
        if (emoji) return emoji;
        const t = text.toLowerCase();
        if (t.includes('bathroom')) return '🛁';
        if (t.includes('pizza')) return '🍕';
        return '✨';
    };

    const handlePrint = () => window.print();

    return (
        <div className="space-y-6">
            <style dangerouslySetInnerHTML={{
                __html: `
        @media print {
          @page { size: A4 landscape; margin: 0.5cm; }
          .no-print, header, footer, nav, button, aside { display: none !important; }
          body { background: white !important; }
          .board-grid { display: grid !important; grid-template-columns: repeat(5, 1fr) !important; gap: 8px !important; }
          .square { height: 200px !important; print-color-adjust: exact !important; -webkit-print-color-adjust: exact !important; }
        }
      `}} />

            <div className="bg-white p-8 rounded-xl border-l-8 border-fuchsia-500 shadow-sm no-print">
                <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                    <div className="flex-grow">
                        <h3 className="text-2xl font-black text-fuchsia-900 mb-2">Snakes &amp; Ladders Q&amp;A</h3>
                        <p className="text-lg text-slate-600 mb-4"><strong>Activity:</strong> Question Practice (15 Minutes)</p>
                        <p className="text-base text-slate-600">Roll dice, ask a question about the picture. <em className="text-fuchsia-700 font-black">&quot;Do you like...?&quot;</em></p>
                    </div>
                    <button onClick={handlePrint} className="flex items-center gap-3 bg-fuchsia-600 hover:bg-fuchsia-700 text-white font-black px-8 py-4 rounded-2xl shadow-xl shadow-fuchsia-200 transition-all hover:scale-105 active:scale-95 shrink-0">
                        <Printer size={24} strokeWidth={3} />
                        Print Board Game
                    </button>
                </div>
            </div>

            <div className="print-container bg-white p-4 rounded-3xl shadow-lg border-2 border-slate-100">
                <div className="grid grid-cols-5 gap-3 board-grid">
                    <div className="square flex flex-col items-center justify-center bg-slate-900 text-white rounded-2xl p-2 h-52 relative overflow-hidden">
                        <span className="text-8xl mb-2">🏁</span>
                        <span className="font-black text-2xl uppercase tracking-tighter">Start</span>
                    </div>

                    {items.map((v, i) => {
                        const squareNum = i + 1;
                        const color = SNAKE_LADDER_COLORS[i % SNAKE_LADDER_COLORS.length];
                        const hasLadder = LADDERS[squareNum];
                        const hasSnake = SNAKES[squareNum];

                        return (
                            <div key={i} className="square flex flex-col items-center justify-center rounded-2xl border-4 p-2 h-52 relative transition-transform hover:scale-105"
                                style={{ backgroundColor: color.bg, borderColor: color.border, color: color.text }}>
                                <div className="absolute top-1 right-2 font-black text-sm opacity-40">#{squareNum}</div>
                                {hasLadder && <div className="absolute -top-2 -left-2 bg-emerald-500 text-white text-sm px-3 py-1 rounded-full font-black shadow-sm z-10">🪜 UP TO {hasLadder}</div>}
                                {hasSnake && <div className="absolute -top-2 -left-2 bg-rose-500 text-white text-sm px-3 py-1 rounded-full font-black shadow-sm z-10">🐍 DOWN TO {hasSnake}</div>}
                                <span className="text-8xl mb-4 drop-shadow-sm">{getVisual(v.english, v.emoji)}</span>
                                <span className="font-black text-xl uppercase leading-tight text-center px-1 tracking-tight">{v.english}</span>
                            </div>
                        );
                    })}

                    <div className="square flex flex-col items-center justify-center bg-fuchsia-600 text-white rounded-2xl p-2 h-52 border-4 border-fuchsia-900 relative">
                        <span className="text-8xl mb-2">🏆</span>
                        <span className="font-black text-2xl uppercase tracking-tighter">Winner!</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
