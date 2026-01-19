"use client";

import { useState } from "react";
import { Send, Sparkles, PlusCircle, Edit3, Image as ImageIcon, GraduationCap, Loader2 } from "lucide-react";
import { generateText } from "@/app/actions/ai";
import { generateImage } from "@/app/actions/image";
import { adjustLevel, LevelAdjustmentResult } from "@/app/actions/adjustLevel";
import { useEditorStore } from "@/lib/store/useEditorStore";

type Mode = "edit" | "text" | "image" | "level";

const LEVELS = ["A1", "A2", "B1", "B2"];

export function ChatSidebar() {
    const [input, setInput] = useState("");
    const [messages, setMessages] = useState<{ role: 'user' | 'assistant', content: string }[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [mode, setMode] = useState<Mode>("text");
    const [targetLevel, setTargetLevel] = useState("A2");
    const [levelResult, setLevelResult] = useState<LevelAdjustmentResult | null>(null);
    const { selectedObject } = useEditorStore();

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage = input;
        setInput("");
        setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
        setIsLoading(true);

        try {
            if (mode === "edit" && selectedObject) {
                const response = await generateText(userMessage, selectedObject.content);
                if ((window as any).canvasEditor) {
                    (window as any).canvasEditor.updateSelectedText(response);
                    setMessages(prev => [...prev, { role: 'assistant', content: "✅ Text updated." }]);
                }
            } else if (mode === "image") {
                setMessages(prev => [...prev, { role: 'assistant', content: "🎨 Generating image..." }]);
                const imageDataUrl = await generateImage(userMessage);
                if ((window as any).canvasEditor) {
                    (window as any).canvasEditor.addImage(imageDataUrl);
                    setMessages(prev => {
                        const newMsgs = [...prev];
                        newMsgs[newMsgs.length - 1] = { role: 'assistant', content: "✅ Image added to canvas." };
                        return newMsgs;
                    });
                }
            } else {
                const response = await generateText(userMessage, "");
                if ((window as any).canvasEditor) {
                    (window as any).canvasEditor.addGeneratedText(response);
                    setMessages(prev => [...prev, { role: 'assistant', content: "✅ New text box created." }]);
                }
            }
        } catch (error) {
            setMessages(prev => [...prev, { role: 'assistant', content: "❌ Sorry, I encountered an error." }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleLevelAdjust = async () => {
        if (!selectedObject || isLoading) return;

        setIsLoading(true);
        setLevelResult(null);

        try {
            const result = await adjustLevel(selectedObject.content, targetLevel);
            setLevelResult(result);

            // Automatically update the canvas
            if ((window as any).canvasEditor) {
                (window as any).canvasEditor.updateSelectedText(result.adjustedText);
            }

            setMessages(prev => [...prev, {
                role: 'assistant',
                content: `✅ Adjusted from ${result.originalLevel} → ${result.targetLevel}\n📊 ${result.wordCount.original} → ${result.wordCount.adjusted} words\n💡 ${result.complexity}`
            }]);
        } catch (error) {
            setMessages(prev => [...prev, { role: 'assistant', content: "❌ Failed to adjust level." }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="w-80 border-l bg-white flex flex-col h-[calc(100vh-4rem)]">
            <div className="p-4 border-b flex items-center gap-2">
                <Sparkles size={18} className="text-indigo-600" />
                <h2 className="font-semibold text-slate-800">AI Assistant</h2>
            </div>

            {/* Mode switcher */}
            <div className="p-3 border-b flex gap-1 flex-wrap">
                <button
                    onClick={() => setMode("edit")}
                    className={`flex-1 flex items-center justify-center gap-1 py-2 text-xs rounded-md transition-colors ${mode === "edit"
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                >
                    <Edit3 size={12} />
                    Edit
                </button>
                <button
                    onClick={() => setMode("text")}
                    className={`flex-1 flex items-center justify-center gap-1 py-2 text-xs rounded-md transition-colors ${mode === "text"
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                >
                    <PlusCircle size={12} />
                    Text
                </button>
                <button
                    onClick={() => setMode("image")}
                    className={`flex-1 flex items-center justify-center gap-1 py-2 text-xs rounded-md transition-colors ${mode === "image"
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                >
                    <ImageIcon size={12} />
                    Image
                </button>
                <button
                    onClick={() => setMode("level")}
                    className={`flex-1 flex items-center justify-center gap-1 py-2 text-xs rounded-md transition-colors ${mode === "level"
                        ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                >
                    <GraduationCap size={12} />
                    Level
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Level Adjuster UI */}
                {mode === "level" && (
                    <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-4 space-y-4">
                        <div className="flex items-center gap-2 text-purple-900 font-bold">
                            <GraduationCap size={18} />
                            CECRL Level Adjuster
                        </div>

                        {selectedObject ? (
                            <>
                                <div className="text-xs text-slate-600 bg-white p-3 rounded-lg border">
                                    <span className="font-semibold text-purple-700">Selected:</span>{" "}
                                    {selectedObject.content.substring(0, 80)}...
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700">Target Level:</label>
                                    <div className="flex gap-2">
                                        {LEVELS.map(level => (
                                            <button
                                                key={level}
                                                onClick={() => setTargetLevel(level)}
                                                className={`flex-1 py-3 rounded-lg font-black text-lg transition-all ${targetLevel === level
                                                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg scale-105'
                                                        : 'bg-white text-slate-600 hover:bg-slate-50 border'
                                                    }`}
                                            >
                                                {level}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <button
                                    onClick={handleLevelAdjust}
                                    disabled={isLoading}
                                    className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50 transition-all shadow-lg"
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2 size={18} className="animate-spin" />
                                            Adjusting...
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles size={18} />
                                            Adjust to {targetLevel}
                                        </>
                                    )}
                                </button>

                                {levelResult && (
                                    <div className="text-xs space-y-2 bg-white p-3 rounded-lg border border-green-200">
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">Original Level:</span>
                                            <span className="font-bold text-slate-700">{levelResult.originalLevel}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">Word Count:</span>
                                            <span className="font-bold text-slate-700">
                                                {levelResult.wordCount.original} → {levelResult.wordCount.adjusted}
                                            </span>
                                        </div>
                                        <div className="pt-2 border-t text-slate-600">
                                            💡 {levelResult.complexity}
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-200 text-sm">
                                ⚠️ Select a text box on the canvas to adjust its level
                            </div>
                        )}
                    </div>
                )}

                {/* Context indicator for other modes */}
                {mode === "edit" && selectedObject ? (
                    <div className="text-xs bg-indigo-50 text-indigo-700 p-2 rounded border border-indigo-200">
                        <span className="font-semibold">Editing:</span> {selectedObject.content.substring(0, 50)}...
                    </div>
                ) : mode === "edit" && !selectedObject ? (
                    <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded border border-amber-200">
                        Select a text box to edit.
                    </div>
                ) : mode === "image" ? (
                    <div className="text-xs text-purple-600 bg-purple-50 p-2 rounded border border-purple-200">
                        Describe an image to generate.
                    </div>
                ) : mode === "text" ? (
                    <div className="text-xs text-slate-500 bg-slate-50 p-2 rounded">
                        Describe text content to generate.
                    </div>
                ) : null}

                {messages.map((msg, i) => (
                    <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                        <div className={`max-w-[85%] rounded-lg p-3 text-sm whitespace-pre-wrap ${msg.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700'}`}>
                            {msg.content}
                        </div>
                    </div>
                ))}
                {isLoading && mode !== "level" && (
                    <div className="text-xs text-slate-400 italic">Thinking...</div>
                )}
            </div>

            {mode !== "level" && (
                <div className="p-4 border-t">
                    <div className="flex gap-2">
                        <input
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                            placeholder={
                                mode === "edit" ? "Describe changes..." :
                                    mode === "image" ? "Describe the image..." :
                                        "Describe text to create..."
                            }
                            className="flex-1 border rounded-md px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            disabled={mode === "edit" && !selectedObject}
                        />
                        <button
                            onClick={handleSend}
                            disabled={isLoading || (mode === "edit" && !selectedObject)}
                            className="p-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
                        >
                            <Send size={16} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
