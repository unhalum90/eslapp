"use client";

import React from 'react';
import { GRID_PROMPTS, DICE_ICONS } from '@/lib/activities/constants';
import { Printer } from 'lucide-react';
import { GeneratedGridPrompt } from '@/app/actions/generateActivities';

interface SupplementaryActivityProps {
    customGridPrompts?: GeneratedGridPrompt[];
}

export function SupplementaryActivity({ customGridPrompts }: SupplementaryActivityProps) {
    const gridPrompts = React.useMemo(() => {
        if (customGridPrompts && customGridPrompts.length >= 36) {
            return customGridPrompts.slice(0, 36);
        }
        return GRID_PROMPTS;
    }, [customGridPrompts]);

    const handlePrint = () => window.print();

    return (
        <div className="space-y-6">
            <style dangerouslySetInnerHTML={{
                __html: `
        @media print {
          @page { size: A4 landscape; margin: 0.5cm; }
          .no-print, header, footer, nav, button, aside { display: none !important; }
          body { background: white !important; }
          .print-container { width: 100% !important; margin: 0 !important; }
          .grid-layout { display: grid !important; grid-template-columns: 90px repeat(6, 1fr) !important; gap: 6px !important; }
          .square-cell { height: 120px !important; print-color-adjust: exact !important; -webkit-print-color-adjust: exact !important; }
          .cell-text { font-size: 14pt !important; }
          .dice-text { font-size: 40pt !important; }
        }
      `}} />

            <div className="bg-white p-8 rounded-xl border-l-8 border-indigo-600 shadow-sm no-print">
                <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                    <div className="flex-grow">
                        <h3 className="text-2xl font-black text-indigo-900 mb-2">Roll-a-Sentence Grid</h3>
                        <p className="text-lg text-slate-600 mb-4"><strong>Activity:</strong> Grammar Practice (15 Minutes)</p>
                        <div className="flex gap-2 flex-wrap">
                            <span className="px-2 py-1 bg-green-100 text-green-700 rounded font-bold text-sm">Green = Affirmative (+)</span>
                            <span className="px-2 py-1 bg-red-100 text-red-700 rounded font-bold text-sm">Red = Negative (-)</span>
                            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded font-bold text-sm">Blue = Question (?)</span>
                        </div>
                    </div>
                    <button onClick={handlePrint} className="flex items-center gap-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black px-8 py-4 rounded-2xl shadow-xl transition-all hover:scale-105 active:scale-95 shrink-0">
                        <Printer size={24} strokeWidth={3} />
                        Print Grid Game
                    </button>
                </div>
            </div>

            <div className="print-container bg-slate-50 p-4 rounded-3xl shadow-inner border-4 border-white overflow-x-auto">
                <div className="grid grid-cols-[90px_repeat(6,1fr)] gap-3 min-w-[800px] grid-layout">
                    <div className="h-24 flex items-center justify-center text-5xl text-slate-300">🎲</div>

                    {DICE_ICONS.map((dice, i) => (
                        <div key={`th-${i}`} className="h-24 flex items-center justify-center text-7xl dice-text text-indigo-600 bg-white rounded-xl shadow-sm border-2 border-indigo-50 font-black">
                            {dice}
                        </div>
                    ))}

                    {DICE_ICONS.map((rowDice, rowIndex) => (
                        <React.Fragment key={`row-${rowIndex}`}>
                            <div className="h-32 md:h-40 flex items-center justify-center text-7xl dice-text text-indigo-600 bg-white rounded-xl shadow-sm border-2 border-indigo-50 font-black square-cell">
                                {rowDice}
                            </div>

                            {[0, 1, 2, 3, 4, 5].map((colIndex) => {
                                const item = gridPrompts[rowIndex * 6 + colIndex];
                                let bgColor = 'bg-white';
                                let textColor = 'text-slate-800';
                                let borderColor = 'border-slate-200';

                                if (item.type === 'positive') {
                                    bgColor = 'bg-green-500'; textColor = 'text-white'; borderColor = 'border-green-600';
                                } else if (item.type === 'negative') {
                                    bgColor = 'bg-red-500'; textColor = 'text-white'; borderColor = 'border-red-600';
                                } else {
                                    bgColor = 'bg-blue-600'; textColor = 'text-white'; borderColor = 'border-blue-700';
                                }

                                return (
                                    <div key={`cell-${rowIndex}-${colIndex}`}
                                        className={`${bgColor} ${textColor} ${borderColor} border-4 rounded-2xl p-2 flex flex-col items-center justify-center text-center shadow-md h-32 md:h-40 relative overflow-hidden square-cell transition-transform hover:scale-105 group`}>
                                        {item.type === 'question' && <div className="absolute -top-4 -right-4 text-8xl opacity-20 font-black rotate-12 group-hover:scale-150 transition-transform">?</div>}
                                        {item.type === 'positive' && <div className="absolute -bottom-4 -left-4 text-6xl opacity-20 font-black group-hover:scale-125 transition-transform">+</div>}
                                        {item.type === 'negative' && <div className="absolute -bottom-4 -left-4 text-6xl opacity-20 font-black group-hover:scale-125 transition-transform">-</div>}
                                        <span className="font-black uppercase text-base md:text-xl lg:text-2xl leading-tight z-10 cell-text">{item.text}</span>
                                    </div>
                                );
                            })}
                        </React.Fragment>
                    ))}
                </div>
            </div>
        </div>
    );
}
