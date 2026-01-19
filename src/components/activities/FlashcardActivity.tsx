"use client";

import React, { useMemo } from 'react';
import { VOCABULARY } from '@/lib/activities/constants';
import { Printer } from 'lucide-react';
import { GeneratedVocabulary } from '@/app/actions/generateActivities';

interface FlashcardActivityProps {
    customVocabulary?: GeneratedVocabulary[];
}

export function FlashcardActivity({ customVocabulary }: FlashcardActivityProps) {
    // Use custom vocabulary or fall back to default
    const vocabulary = useMemo(() => {
        if (customVocabulary && customVocabulary.length > 0) {
            return customVocabulary.map(v => ({
                english: v.english,
                category: v.category,
                emoji: v.emoji
            }));
        }
        return VOCABULARY.map(v => ({ ...v, emoji: '' }));
    }, [customVocabulary]);

    // Generate the loop of cards
    const cards = useMemo(() => {
        const items = [...vocabulary].sort(() => 0.5 - Math.random()).slice(0, 16);

        return items.map((item, index) => {
            const nextItem = items[(index + 1) % items.length];
            return {
                have: item.english,
                haveEmoji: item.emoji,
                whoHas: nextItem.english
            };
        });
    }, [vocabulary]);

    const getVisual = (text: string, emoji?: string) => {
        if (emoji) return emoji;
        // Fallback emoji mapping for default vocabulary
        const t = text.toLowerCase();
        if (t.includes('bathroom')) return '🛁';
        if (t.includes('garage')) return '🚗';
        if (t.includes('living')) return '🛋️';
        if (t.includes('kitchen')) return '🍳';
        if (t.includes('bedroom')) return '🛏️';
        if (t.includes('burger')) return '🍔';
        if (t.includes('pizza')) return '🍕';
        if (t.includes('balloon')) return '🎈';
        if (t.includes('cake')) return '🎂';
        return '✨';
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="space-y-8">
            <style dangerouslySetInnerHTML={{
                __html: `
        @media print {
          @page { size: A4 portrait; margin: 1cm; }
          .no-print, header, footer, nav, button, aside { display: none !important; }
          body { background: white !important; }
          .print-grid { display: grid !important; grid-template-columns: repeat(2, 1fr) !important; gap: 15px !important; }
          .flashcard-item { break-inside: avoid; height: 160px !important; print-color-adjust: exact !important; -webkit-print-color-adjust: exact !important; border-width: 3px !important; }
        }
      `}} />

            <div className="bg-white p-10 rounded-2xl border-l-[12px] border-indigo-500 shadow-sm no-print">
                <div className="flex flex-col md:flex-row justify-between items-start gap-6">
                    <div className="flex-grow">
                        <h2 className="text-3xl font-black text-indigo-900 mb-3 tracking-tighter uppercase">
                            I Have, Who Has?
                        </h2>
                        <p className="text-xl text-slate-600 font-medium max-w-2xl leading-relaxed">
                            A looping card game. The student with the <strong>Start</strong> card reads &quot;I have [Item], who has [Item]?&quot;.
                        </p>
                    </div>
                    <button
                        onClick={handlePrint}
                        className="flex items-center gap-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black px-10 py-5 rounded-3xl shadow-2xl shadow-indigo-100 transition-all hover:scale-105 active:scale-95 shrink-0"
                    >
                        <Printer size={24} strokeWidth={3} />
                        Print Flashcards
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print-grid">
                {cards.map((card, idx) => (
                    <div
                        key={idx}
                        className="flashcard-item bg-white border-[3px] border-slate-900 rounded-2xl flex h-40 overflow-hidden shadow-sm group hover:border-indigo-600 transition-all cursor-default"
                    >
                        <div className="w-1/2 flex flex-col items-center justify-center bg-slate-50 border-r-[3px] border-slate-900 group-hover:bg-indigo-50 group-hover:border-indigo-600 transition-colors p-2">
                            <span className="text-lg font-black text-slate-400 uppercase tracking-widest mb-1">I Have</span>
                            <div className="text-7xl filter drop-shadow-sm">{getVisual(card.have, card.haveEmoji)}</div>
                        </div>
                        <div className="w-1/2 flex flex-col items-center justify-center p-4 text-center bg-white relative">
                            <span className="text-lg font-black text-slate-400 uppercase tracking-widest mb-2">Who Has?</span>
                            <h4 className="text-xl sm:text-2xl font-black text-slate-900 uppercase leading-tight tracking-tighter group-hover:text-indigo-700 transition-colors">
                                {card.whoHas}?
                            </h4>
                            <div className="absolute top-2 right-3 text-[10px] font-bold text-slate-300 no-print">#{idx + 1}</div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="bg-slate-900 text-slate-100 p-8 rounded-3xl flex items-center gap-8 no-print shadow-xl">
                <div className="bg-indigo-500 w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-inner shadow-indigo-700/50">🗣️</div>
                <div>
                    <h4 className="font-black text-xl uppercase tracking-tight mb-1">Teacher Instructions</h4>
                    <p className="text-slate-400 text-lg leading-relaxed">
                        Distribute all cards. Any student can start. They say <span className="text-indigo-400 font-bold italic">&quot;I have X, who has Y?&quot;</span>
                    </p>
                </div>
            </div>
        </div>
    );
}
