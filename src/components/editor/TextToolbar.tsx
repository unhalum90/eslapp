"use client";

import { Bold, Italic, AlignLeft, AlignCenter, AlignRight, Type } from "lucide-react";

interface TextToolbarProps {
    onBold: () => void;
    onItalic: () => void;
    onAlignLeft: () => void;
    onAlignCenter: () => void;
    onAlignRight: () => void;
    onFontSizeChange: (size: number) => void;
    onFontFamilyChange: (font: string) => void;
    currentFontSize: number;
    currentFontFamily: string;
}

// Common fonts for classroom/educational use
const FONTS = [
    { name: "Arial", family: "Arial, sans-serif" },
    { name: "Comic Sans", family: "'Comic Sans MS', cursive" },
    { name: "Georgia", family: "Georgia, serif" },
    { name: "Times New Roman", family: "'Times New Roman', serif" },
    { name: "Verdana", family: "Verdana, sans-serif" },
    { name: "Trebuchet", family: "'Trebuchet MS', sans-serif" },
    { name: "Courier", family: "'Courier New', monospace" },
];

export function TextToolbar({
    onBold,
    onItalic,
    onAlignLeft,
    onAlignCenter,
    onAlignRight,
    onFontSizeChange,
    onFontFamilyChange,
    currentFontSize,
    currentFontFamily,
}: TextToolbarProps) {
    return (
        <div className="flex items-center gap-1 bg-white border rounded-lg shadow-lg p-2 text-slate-700">
            {/* Font family selector */}
            <select
                value={currentFontFamily}
                onChange={(e) => onFontFamilyChange(e.target.value)}
                className="border rounded px-2 py-1 text-sm max-w-[100px]"
                title="Font"
            >
                {FONTS.map((font) => (
                    <option key={font.family} value={font.family} style={{ fontFamily: font.family }}>
                        {font.name}
                    </option>
                ))}
            </select>

            <div className="w-px h-6 bg-slate-200 mx-1" />

            <button
                onClick={onBold}
                className="p-2 hover:bg-slate-100 rounded"
                title="Bold"
            >
                <Bold size={16} />
            </button>
            <button
                onClick={onItalic}
                className="p-2 hover:bg-slate-100 rounded"
                title="Italic"
            >
                <Italic size={16} />
            </button>

            <div className="w-px h-6 bg-slate-200 mx-1" />

            <button
                onClick={onAlignLeft}
                className="p-2 hover:bg-slate-100 rounded"
                title="Align Left"
            >
                <AlignLeft size={16} />
            </button>
            <button
                onClick={onAlignCenter}
                className="p-2 hover:bg-slate-100 rounded"
                title="Align Center"
            >
                <AlignCenter size={16} />
            </button>
            <button
                onClick={onAlignRight}
                className="p-2 hover:bg-slate-100 rounded"
                title="Align Right"
            >
                <AlignRight size={16} />
            </button>

            <div className="w-px h-6 bg-slate-200 mx-1" />

            <div className="flex items-center gap-1">
                <Type size={14} className="text-slate-500" />
                <select
                    value={currentFontSize}
                    onChange={(e) => onFontSizeChange(Number(e.target.value))}
                    className="border rounded px-2 py-1 text-sm w-14"
                >
                    {[12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 64, 72].map((size) => (
                        <option key={size} value={size}>
                            {size}
                        </option>
                    ))}
                </select>
            </div>
        </div>
    );
}
