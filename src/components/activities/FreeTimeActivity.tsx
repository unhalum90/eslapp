"use client";

import React from 'react';
import { VOCABULARY, CARD_COLORS } from '@/lib/activities/constants';
import { Printer } from 'lucide-react';
import { GeneratedVocabulary } from '@/app/actions/generateActivities';

interface FreeTimeActivityProps {
    customVocabulary?: GeneratedVocabulary[];
}

export function FreeTimeActivity({ customVocabulary }: FreeTimeActivityProps) {
    const items = React.useMemo(() => {
        if (customVocabulary && customVocabulary.length > 0) {
            return customVocabulary.map(v => ({ english: v.english, category: v.category, emoji: v.emoji }));
        }
        return VOCABULARY.filter(v => v.category === 'Food' || v.category === 'Party' || v.category === 'Furniture').map(v => ({ ...v, emoji: '' }));
    }, [customVocabulary]);

    const getVisual = (text: string, emoji?: string) => {
        if (emoji) return emoji;
        const t = text.toLowerCase();
        if (t.includes('burger')) return '🍔';
        if (t.includes('pizza')) return '🍕';
        if (t.includes('balloon')) return '🎈';
        return '✨';
    };

    const handlePrint = () => window.print();

    // Get unique categories from items
    const categories = [...new Set(items.map(item => item.category))];

    return (
        <div className="space-y-8">
            <style dangerouslySetInnerHTML={{
                __html: `
        @media print {
          @page { size: A4 portrait; margin: 1cm; }
          .no-print, header, footer, nav, button, aside { display: none !important; }
          body { background: white !important; }
          .print-grid { display: grid !important; grid-template-columns: repeat(2, 1fr) !important; gap: 20px !important; }
          .card-item { height: 320px !important; break-inside: avoid; print-color-adjust: exact !important; -webkit-print-color-adjust: exact !important; border-width: 4px !important; }
        }
      `}} />

            <div className="bg-white p-8 rounded-xl border-l-8 border-amber-500 shadow-sm no-print">
                <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                    <div className="flex-grow">
                        <h3 className="text-2xl font-black text-amber-900 mb-2">Category Sorting</h3>
                        <p className="text-lg text-slate-600 mb-4"><strong>Activity:</strong> Category Flashcards</p>
                        <p className="text-base text-slate-600">Print cards and have students sort them into categories!</p>
                    </div>
                    <button onClick={handlePrint} className="flex items-center gap-3 bg-amber-600 hover:bg-amber-700 text-white font-black px-8 py-4 rounded-2xl shadow-xl shadow-amber-200 transition-all hover:scale-105 active:scale-95 shrink-0">
                        <Printer size={24} strokeWidth={3} />
                        Print Flashcards
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 print-grid">
                {items.map((v, i) => {
                    const color = CARD_COLORS[i % CARD_COLORS.length];
                    return (
                        <div key={i} className="card-item bg-white border-4 rounded-3xl p-8 flex flex-col items-center justify-center text-center shadow-md hover:shadow-lg transition-all group min-h-[320px]"
                            style={{ backgroundColor: color.bg, borderColor: color.border, color: color.text }}>
                            <div className="text-9xl mb-6 group-hover:scale-110 transition-transform duration-300 drop-shadow-sm">
                                {getVisual(v.english, v.emoji)}
                            </div>
                            <h4 className="text-4xl font-black uppercase leading-tight tracking-tighter">{v.english}</h4>
                            <div className="mt-4 opacity-50 text-xl font-bold tracking-widest uppercase">{v.category}</div>
                        </div>
                    );
                })}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 no-print">
                {categories.slice(0, 2).map((cat, i) => (
                    <div key={cat} className={`${i === 0 ? 'bg-orange-50 border-orange-200' : 'bg-blue-50 border-blue-200'} p-8 rounded-2xl border-4 border-dashed`}>
                        <h4 className={`text-2xl font-black ${i === 0 ? 'text-orange-700' : 'text-blue-700'} mb-4 flex items-center gap-3`}>
                            <span className="text-3xl">{i === 0 ? '📦' : '📁'}</span> {cat}
                        </h4>
                        <div className={`mt-8 h-40 border-2 ${i === 0 ? 'border-orange-100' : 'border-blue-100'} rounded-xl bg-white/50 flex items-center justify-center ${i === 0 ? 'text-orange-300' : 'text-blue-300'} font-bold border-dashed`}>
                            Sort Cards Here
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
