"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import * as fabric from "fabric";
import { useEditorStore } from "@/lib/store/useEditorStore";
import { TextToolbar } from "./TextToolbar";
import { Undo2, Redo2, Copy, Trash2, Download } from "lucide-react";
import { jsPDF } from "jspdf";

export function CanvasEditor() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fabricRef = useRef<fabric.Canvas | null>(null);
    const { setSelectedObject, canvasJSON, setCanvasJSON } = useEditorStore();
    const [isReady, setIsReady] = useState(false);
    const [showTextToolbar, setShowTextToolbar] = useState(false);
    const [showImageToolbar, setShowImageToolbar] = useState(false);
    const [currentFontSize, setCurrentFontSize] = useState(18);
    const [currentFontFamily, setCurrentFontFamily] = useState("Arial, sans-serif");

    // Undo/Redo history
    const historyRef = useRef<string[]>([]);
    const historyIndexRef = useRef(-1);
    const [canUndo, setCanUndo] = useState(false);
    const [canRedo, setCanRedo] = useState(false);

    // Clipboard
    const clipboardRef = useRef<fabric.FabricObject | null>(null);

    // Canvas dimensions
    const CANVAS_WIDTH = 800;
    const CANVAS_HEIGHT = 1000;

    // Save state to history
    const saveToHistory = useCallback(() => {
        if (!fabricRef.current) return;
        const json = JSON.stringify(fabricRef.current.toJSON());

        // Remove any forward history if we're not at the end
        if (historyIndexRef.current < historyRef.current.length - 1) {
            historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
        }

        historyRef.current.push(json);
        historyIndexRef.current = historyRef.current.length - 1;

        // Limit history to 50 states
        if (historyRef.current.length > 50) {
            historyRef.current.shift();
            historyIndexRef.current--;
        }

        setCanUndo(historyIndexRef.current > 0);
        setCanRedo(false);
        setCanvasJSON(fabricRef.current.toJSON());
    }, [setCanvasJSON]);

    // Undo
    const handleUndo = useCallback(() => {
        if (!fabricRef.current || historyIndexRef.current <= 0) return;
        historyIndexRef.current--;
        const prevState = historyRef.current[historyIndexRef.current];
        fabricRef.current.loadFromJSON(JSON.parse(prevState)).then(() => {
            fabricRef.current!.renderAll();
            setCanUndo(historyIndexRef.current > 0);
            setCanRedo(true);
        });
    }, []);

    // Redo
    const handleRedo = useCallback(() => {
        if (!fabricRef.current || historyIndexRef.current >= historyRef.current.length - 1) return;
        historyIndexRef.current++;
        const nextState = historyRef.current[historyIndexRef.current];
        fabricRef.current.loadFromJSON(JSON.parse(nextState)).then(() => {
            fabricRef.current!.renderAll();
            setCanUndo(true);
            setCanRedo(historyIndexRef.current < historyRef.current.length - 1);
        });
    }, []);

    // Copy selected object
    const handleCopy = useCallback(() => {
        if (!fabricRef.current) return;
        const active = fabricRef.current.getActiveObject();
        if (active) {
            active.clone().then((cloned: fabric.FabricObject) => {
                clipboardRef.current = cloned;
            });
        }
    }, []);

    // Paste from clipboard
    const handlePaste = useCallback(() => {
        if (!fabricRef.current || !clipboardRef.current) return;
        clipboardRef.current.clone().then((cloned: fabric.FabricObject) => {
            cloned.set({
                left: (cloned.left || 0) + 20,
                top: (cloned.top || 0) + 20,
            });
            (cloned as any).id = `${cloned.type}_${Date.now()}`;
            fabricRef.current!.add(cloned);
            fabricRef.current!.setActiveObject(cloned);
            fabricRef.current!.renderAll();
            saveToHistory();
        });
    }, [saveToHistory]);

    // Duplicate selected object
    const handleDuplicate = useCallback(() => {
        if (!fabricRef.current) return;
        const active = fabricRef.current.getActiveObject();
        if (active) {
            active.clone().then((cloned: fabric.FabricObject) => {
                cloned.set({
                    left: (cloned.left || 0) + 20,
                    top: (cloned.top || 0) + 20,
                });
                (cloned as any).id = `${cloned.type}_${Date.now()}`;
                fabricRef.current!.add(cloned);
                fabricRef.current!.setActiveObject(cloned);
                fabricRef.current!.renderAll();
                saveToHistory();
            });
        }
    }, [saveToHistory]);

    // Delete selected object
    const handleDelete = useCallback(() => {
        if (!fabricRef.current) return;
        const active = fabricRef.current.getActiveObject();
        if (active) {
            fabricRef.current.remove(active);
            fabricRef.current.renderAll();
            saveToHistory();
        }
    }, [saveToHistory]);

    // Initialize Fabric.js canvas
    useEffect(() => {
        if (canvasRef.current && !fabricRef.current) {
            const canvas = new fabric.Canvas(canvasRef.current, {
                width: CANVAS_WIDTH,
                height: CANVAS_HEIGHT,
                backgroundColor: "#ffffff",
                selection: true,
            });
            fabricRef.current = canvas;
            setIsReady(true);

            // Load existing canvas state if available
            if (canvasJSON) {
                canvas.loadFromJSON(canvasJSON).then(() => {
                    canvas.renderAll();
                    // Initialize history with current state
                    historyRef.current = [JSON.stringify(canvas.toJSON())];
                    historyIndexRef.current = 0;
                });
            } else {
                // Initialize history with empty canvas
                historyRef.current = [JSON.stringify(canvas.toJSON())];
                historyIndexRef.current = 0;
            }

            // Selection handler
            canvas.on("selection:created", (e) => {
                const selected = e.selected?.[0];
                if (selected && selected.type === "textbox") {
                    setSelectedObject({
                        id: (selected as any).id || "",
                        content: (selected as fabric.Textbox).text || "",
                        type: "text",
                    });
                    setShowTextToolbar(true);
                    setShowImageToolbar(false);
                    setCurrentFontSize((selected as fabric.Textbox).fontSize || 18);
                } else if (selected && selected.type === "image") {
                    setShowTextToolbar(false);
                    setShowImageToolbar(true);
                } else {
                    setShowTextToolbar(false);
                    setShowImageToolbar(false);
                }
            });

            canvas.on("selection:updated", (e) => {
                const selected = e.selected?.[0];
                if (selected && selected.type === "textbox") {
                    setSelectedObject({
                        id: (selected as any).id || "",
                        content: (selected as fabric.Textbox).text || "",
                        type: "text",
                    });
                    setShowTextToolbar(true);
                    setShowImageToolbar(false);
                    setCurrentFontSize((selected as fabric.Textbox).fontSize || 18);
                } else if (selected && selected.type === "image") {
                    setShowTextToolbar(false);
                    setShowImageToolbar(true);
                } else {
                    setShowTextToolbar(false);
                    setShowImageToolbar(false);
                }
            });

            canvas.on("selection:cleared", () => {
                setSelectedObject(null);
                setShowTextToolbar(false);
                setShowImageToolbar(false);
            });

            // Save to history on object modification
            canvas.on("object:modified", () => {
                saveToHistory();
            });

            canvas.on("object:added", () => {
                // Only save if not loading from history
                if (historyRef.current.length > 0) {
                    saveToHistory();
                }
            });

            return () => {
                canvas.dispose();
                fabricRef.current = null;
            };
        }
    }, [canvasJSON, setCanvasJSON, setSelectedObject, saveToHistory]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Don't trigger if user is typing in an input
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

            if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
                e.preventDefault();
                handleUndo();
            } else if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
                e.preventDefault();
                handleRedo();
            } else if ((e.ctrlKey || e.metaKey) && e.key === "c") {
                e.preventDefault();
                handleCopy();
            } else if ((e.ctrlKey || e.metaKey) && e.key === "v") {
                e.preventDefault();
                handlePaste();
            } else if ((e.ctrlKey || e.metaKey) && e.key === "d") {
                e.preventDefault();
                handleDuplicate();
            } else if (e.key === "Delete" || e.key === "Backspace") {
                // Only delete if not editing text
                const active = fabricRef.current?.getActiveObject();
                if (active && active.type !== "textbox") {
                    e.preventDefault();
                    handleDelete();
                } else if (active && active.type === "textbox" && !(active as fabric.Textbox).isEditing) {
                    e.preventDefault();
                    handleDelete();
                }
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [handleUndo, handleRedo, handleCopy, handlePaste, handleDuplicate, handleDelete]);

    // Text formatting handlers
    const handleBold = useCallback(() => {
        if (!fabricRef.current) return;
        const active = fabricRef.current.getActiveObject();
        if (active && active.type === "textbox") {
            const textbox = active as fabric.Textbox;
            const isBold = textbox.fontWeight === "bold";
            textbox.set("fontWeight", isBold ? "normal" : "bold");
            fabricRef.current.renderAll();
            saveToHistory();
        }
    }, [saveToHistory]);

    const handleItalic = useCallback(() => {
        if (!fabricRef.current) return;
        const active = fabricRef.current.getActiveObject();
        if (active && active.type === "textbox") {
            const textbox = active as fabric.Textbox;
            const isItalic = textbox.fontStyle === "italic";
            textbox.set("fontStyle", isItalic ? "normal" : "italic");
            fabricRef.current.renderAll();
            saveToHistory();
        }
    }, [saveToHistory]);

    const handleAlign = useCallback((align: "left" | "center" | "right") => {
        if (!fabricRef.current) return;
        const active = fabricRef.current.getActiveObject();
        if (active && active.type === "textbox") {
            (active as fabric.Textbox).set("textAlign", align);
            fabricRef.current.renderAll();
            saveToHistory();
        }
    }, [saveToHistory]);

    const handleFontSize = useCallback((size: number) => {
        if (!fabricRef.current) return;
        const active = fabricRef.current.getActiveObject();
        if (active && active.type === "textbox") {
            (active as fabric.Textbox).set("fontSize", size);
            setCurrentFontSize(size);
            fabricRef.current.renderAll();
            saveToHistory();
        }
    }, [saveToHistory]);

    const handleFontFamily = useCallback((font: string) => {
        if (!fabricRef.current) return;
        const active = fabricRef.current.getActiveObject();
        if (active && active.type === "textbox") {
            (active as fabric.Textbox).set("fontFamily", font);
            setCurrentFontFamily(font);
            fabricRef.current.renderAll();
            saveToHistory();
        }
    }, [saveToHistory]);

    // Add text box - CENTERED
    const addTextBox = useCallback(() => {
        if (!fabricRef.current) return;
        const textWidth = 300;
        const textbox = new fabric.Textbox("Type here...", {
            left: (CANVAS_WIDTH - textWidth) / 2,
            top: CANVAS_HEIGHT / 2 - 50,
            width: textWidth,
            fontSize: 18,
            fontFamily: "Arial",
            fill: "#1e293b",
        });
        (textbox as any).id = `text_${Date.now()}`;
        fabricRef.current.add(textbox);
        fabricRef.current.setActiveObject(textbox);
        fabricRef.current.renderAll();
    }, []);

    // Add rectangle - CENTERED
    const addRectangle = useCallback(() => {
        if (!fabricRef.current) return;
        const rectWidth = 200;
        const rectHeight = 100;
        const rect = new fabric.Rect({
            left: (CANVAS_WIDTH - rectWidth) / 2,
            top: (CANVAS_HEIGHT - rectHeight) / 2,
            width: rectWidth,
            height: rectHeight,
            fill: "#c7d2fe",
            stroke: "#6366f1",
            strokeWidth: 2,
            rx: 8,
            ry: 8,
        });
        (rect as any).id = `rect_${Date.now()}`;
        fabricRef.current.add(rect);
        fabricRef.current.setActiveObject(rect);
        fabricRef.current.renderAll();
    }, []);

    // Add line - CENTERED
    const addLine = useCallback(() => {
        if (!fabricRef.current) return;
        const line = new fabric.Line([CANVAS_WIDTH / 2 - 150, CANVAS_HEIGHT / 2, CANVAS_WIDTH / 2 + 150, CANVAS_HEIGHT / 2], {
            stroke: "#1e293b",
            strokeWidth: 2,
        });
        (line as any).id = `line_${Date.now()}`;
        fabricRef.current.add(line);
        fabricRef.current.setActiveObject(line);
        fabricRef.current.renderAll();
    }, []);

    // Add dashed line - CENTERED
    const addDashedLine = useCallback(() => {
        if (!fabricRef.current) return;
        const line = new fabric.Line([CANVAS_WIDTH / 2 - 150, CANVAS_HEIGHT / 2, CANVAS_WIDTH / 2 + 150, CANVAS_HEIGHT / 2], {
            stroke: "#1e293b",
            strokeWidth: 2,
            strokeDashArray: [10, 5],
        });
        (line as any).id = `dashed_${Date.now()}`;
        fabricRef.current.add(line);
        fabricRef.current.setActiveObject(line);
        fabricRef.current.renderAll();
    }, []);

    // Add answer lines (set of lines for writing) - CENTERED
    const addAnswerLines = useCallback(() => {
        if (!fabricRef.current) return;
        const lineCount = 4;
        const lineWidth = 500;
        const lineSpacing = 35;
        const startY = CANVAS_HEIGHT / 2 - ((lineCount - 1) * lineSpacing) / 2;
        const startX = (CANVAS_WIDTH - lineWidth) / 2;

        const lines: fabric.FabricObject[] = [];
        for (let i = 0; i < lineCount; i++) {
            const line = new fabric.Line([startX, startY + i * lineSpacing, startX + lineWidth, startY + i * lineSpacing], {
                stroke: "#94a3b8",
                strokeWidth: 1,
            });
            lines.push(line);
        }

        const group = new fabric.Group(lines, {
            left: startX,
            top: startY - 10,
        });
        (group as any).id = `answerlines_${Date.now()}`;
        fabricRef.current.add(group);
        fabricRef.current.setActiveObject(group);
        fabricRef.current.renderAll();
    }, []);

    // Add table/grid - CENTERED
    const addTable = useCallback((rows: number = 3, cols: number = 3) => {
        if (!fabricRef.current) return;
        const cellWidth = 100;
        const cellHeight = 40;
        const tableWidth = cols * cellWidth;
        const tableHeight = rows * cellHeight;
        const startX = (CANVAS_WIDTH - tableWidth) / 2;
        const startY = (CANVAS_HEIGHT - tableHeight) / 2;

        const lines: fabric.FabricObject[] = [];

        // Horizontal lines
        for (let i = 0; i <= rows; i++) {
            const line = new fabric.Line([startX, startY + i * cellHeight, startX + tableWidth, startY + i * cellHeight], {
                stroke: "#1e293b",
                strokeWidth: 1,
            });
            lines.push(line);
        }

        // Vertical lines
        for (let j = 0; j <= cols; j++) {
            const line = new fabric.Line([startX + j * cellWidth, startY, startX + j * cellWidth, startY + tableHeight], {
                stroke: "#1e293b",
                strokeWidth: 1,
            });
            lines.push(line);
        }

        const group = new fabric.Group(lines, {
            left: startX,
            top: startY,
        });
        (group as any).id = `table_${Date.now()}`;
        fabricRef.current.add(group);
        fabricRef.current.setActiveObject(group);
        fabricRef.current.renderAll();
    }, []);

    // Add circle - CENTERED
    const addCircle = useCallback(() => {
        if (!fabricRef.current) return;
        const circle = new fabric.Circle({
            left: CANVAS_WIDTH / 2 - 50,
            top: CANVAS_HEIGHT / 2 - 50,
            radius: 50,
            fill: "transparent",
            stroke: "#6366f1",
            strokeWidth: 2,
        });
        (circle as any).id = `circle_${Date.now()}`;
        fabricRef.current.add(circle);
        fabricRef.current.setActiveObject(circle);
        fabricRef.current.renderAll();
    }, []);

    // Add bullet list
    const addBulletList = useCallback(() => {
        if (!fabricRef.current) return;
        const text = "• Item 1\n• Item 2\n• Item 3\n• Item 4";
        const textbox = new fabric.Textbox(text, {
            left: (CANVAS_WIDTH - 300) / 2,
            top: CANVAS_HEIGHT / 2 - 60,
            width: 300,
            fontSize: 16,
            fontFamily: "Arial",
            fill: "#1e293b",
            lineHeight: 1.5,
        });
        (textbox as any).id = `bulletlist_${Date.now()}`;
        fabricRef.current.add(textbox);
        fabricRef.current.setActiveObject(textbox);
        fabricRef.current.renderAll();
    }, []);

    // Add numbered list
    const addNumberedList = useCallback(() => {
        if (!fabricRef.current) return;
        const text = "1. First item\n2. Second item\n3. Third item\n4. Fourth item";
        const textbox = new fabric.Textbox(text, {
            left: (CANVAS_WIDTH - 300) / 2,
            top: CANVAS_HEIGHT / 2 - 60,
            width: 300,
            fontSize: 16,
            fontFamily: "Arial",
            fill: "#1e293b",
            lineHeight: 1.5,
        });
        (textbox as any).id = `numlist_${Date.now()}`;
        fabricRef.current.add(textbox);
        fabricRef.current.setActiveObject(textbox);
        fabricRef.current.renderAll();
    }, []);

    // Add checkbox list
    const addCheckboxList = useCallback(() => {
        if (!fabricRef.current) return;
        const text = "☐ Task 1\n☐ Task 2\n☐ Task 3\n☐ Task 4";
        const textbox = new fabric.Textbox(text, {
            left: (CANVAS_WIDTH - 300) / 2,
            top: CANVAS_HEIGHT / 2 - 60,
            width: 300,
            fontSize: 16,
            fontFamily: "Arial",
            fill: "#1e293b",
            lineHeight: 1.5,
        });
        (textbox as any).id = `checklist_${Date.now()}`;
        fabricRef.current.add(textbox);
        fabricRef.current.setActiveObject(textbox);
        fabricRef.current.renderAll();
    }, []);

    // Apply grayscale filter to selected image
    const handleGrayscale = useCallback(() => {
        if (!fabricRef.current) return;
        const active = fabricRef.current.getActiveObject();
        if (active && active.type === "image") {
            const img = active as fabric.FabricImage;
            // Toggle grayscale
            if (img.filters && img.filters.length > 0) {
                img.filters = [];
            } else {
                img.filters = [new fabric.filters.Grayscale()];
            }
            img.applyFilters();
            fabricRef.current.renderAll();
            saveToHistory();
        }
    }, [saveToHistory]);

    // Add vocabulary matching template
    const addVocabTemplate = useCallback(() => {
        if (!fabricRef.current) return;

        // Title
        const title = new fabric.Textbox("Vocabulary Matching", {
            left: CANVAS_WIDTH / 2 - 150,
            top: 50,
            width: 300,
            fontSize: 24,
            fontFamily: "Arial",
            fontWeight: "bold",
            fill: "#1e293b",
            textAlign: "center",
        });
        (title as any).id = `title_${Date.now()}`;

        // Instructions
        const instructions = new fabric.Textbox("Draw a line to match each word with its definition.", {
            left: 50,
            top: 100,
            width: 700,
            fontSize: 14,
            fontFamily: "Arial",
            fill: "#64748b",
        });
        (instructions as any).id = `instr_${Date.now()}`;

        // Left column (words)
        const words = new fabric.Textbox("1. Word A\n\n2. Word B\n\n3. Word C\n\n4. Word D", {
            left: 80,
            top: 180,
            width: 200,
            fontSize: 16,
            fontFamily: "Arial",
            fill: "#1e293b",
            lineHeight: 1.8,
        });
        (words as any).id = `words_${Date.now()}`;

        // Right column (definitions)
        const defs = new fabric.Textbox("__ Definition 1\n\n__ Definition 2\n\n__ Definition 3\n\n__ Definition 4", {
            left: 500,
            top: 180,
            width: 250,
            fontSize: 16,
            fontFamily: "Arial",
            fill: "#1e293b",
            lineHeight: 1.8,
        });
        (defs as any).id = `defs_${Date.now()}`;

        fabricRef.current.add(title, instructions, words, defs);
        fabricRef.current.renderAll();
        saveToHistory();
    }, [saveToHistory]);

    // Add fill-in-the-blank template
    const addFillBlankTemplate = useCallback(() => {
        if (!fabricRef.current) return;

        const title = new fabric.Textbox("Fill in the Blanks", {
            left: CANVAS_WIDTH / 2 - 150,
            top: 50,
            width: 300,
            fontSize: 24,
            fontFamily: "Arial",
            fontWeight: "bold",
            fill: "#1e293b",
            textAlign: "center",
        });
        (title as any).id = `title_${Date.now()}`;

        const instructions = new fabric.Textbox("Complete each sentence with the correct word from the box.", {
            left: 50,
            top: 100,
            width: 700,
            fontSize: 14,
            fontFamily: "Arial",
            fill: "#64748b",
        });
        (instructions as any).id = `instr_${Date.now()}`;

        // Word bank box
        const wordBank = new fabric.Rect({
            left: 100,
            top: 150,
            width: 600,
            height: 50,
            fill: "#f1f5f9",
            stroke: "#cbd5e1",
            strokeWidth: 1,
            rx: 4,
            ry: 4,
        });
        (wordBank as any).id = `wordbank_${Date.now()}`;

        const bankWords = new fabric.Textbox("happy    sad    excited    tired    hungry", {
            left: 120,
            top: 165,
            width: 560,
            fontSize: 16,
            fontFamily: "Arial",
            fill: "#1e293b",
            textAlign: "center",
        });
        (bankWords as any).id = `bankwords_${Date.now()}`;

        // Sentences
        const sentences = new fabric.Textbox(
            "1. She was very ____________ after running the marathon.\n\n" +
            "2. The children felt ____________ on Christmas morning.\n\n" +
            "3. He looked ____________ when he heard the bad news.\n\n" +
            "4. I am ____________ because I skipped lunch.",
            {
                left: 80,
                top: 240,
                width: 640,
                fontSize: 16,
                fontFamily: "Arial",
                fill: "#1e293b",
                lineHeight: 1.8,
            }
        );
        (sentences as any).id = `sentences_${Date.now()}`;

        fabricRef.current.add(title, instructions, wordBank, bankWords, sentences);
        fabricRef.current.renderAll();
        saveToHistory();
    }, [saveToHistory]);

    // Update selected text (called from AI sidebar)
    const updateSelectedText = useCallback((newText: string) => {
        if (!fabricRef.current) return;
        const active = fabricRef.current.getActiveObject();
        if (active && active.type === "textbox") {
            (active as fabric.Textbox).set("text", newText);
            fabricRef.current.renderAll();
            saveToHistory();
        }
    }, [saveToHistory]);

    // Add new text (for AI generation without selection) - CENTERED
    const addGeneratedText = useCallback((text: string) => {
        if (!fabricRef.current) return;
        const textWidth = 400;
        const textbox = new fabric.Textbox(text, {
            left: (CANVAS_WIDTH - textWidth) / 2,
            top: CANVAS_HEIGHT / 2 - 50,
            width: textWidth,
            fontSize: 16,
            fontFamily: "Arial",
            fill: "#1e293b",
        });
        (textbox as any).id = `text_${Date.now()}`;
        fabricRef.current.add(textbox);
        fabricRef.current.setActiveObject(textbox);
        fabricRef.current.renderAll();
    }, []);

    // Add image to canvas - CENTERED
    const addImage = useCallback((imageDataUrl: string) => {
        if (!fabricRef.current) return;
        fabric.FabricImage.fromURL(imageDataUrl).then((img) => {
            img.scaleToWidth(300);
            const scaledHeight = img.getScaledHeight();
            img.set({
                left: (CANVAS_WIDTH - 300) / 2,
                top: (CANVAS_HEIGHT - scaledHeight) / 2
            });
            (img as any).id = `img_${Date.now()}`;
            fabricRef.current!.add(img);
            fabricRef.current!.setActiveObject(img);
            fabricRef.current!.renderAll();
        });
    }, []);

    // Crop image
    const handleCropImage = useCallback(() => {
        if (!fabricRef.current) return;
        const active = fabricRef.current.getActiveObject();
        if (active && active.type === "image") {
            alert("To crop: drag the corner handles while holding Shift to resize, or use an external tool to pre-crop your image.");
        }
    }, []);

    // Export to PDF
    const exportToPDF = useCallback(() => {
        if (!fabricRef.current) return;

        // Get canvas as image
        const dataUrl = fabricRef.current.toDataURL({
            format: "png",
            quality: 1,
            multiplier: 2, // Higher quality
        });

        // Create PDF (A4 size)
        const pdf = new jsPDF({
            orientation: "portrait",
            unit: "mm",
            format: "a4",
        });

        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();

        // Calculate aspect ratio to fit canvas in PDF
        const canvasAspect = CANVAS_WIDTH / CANVAS_HEIGHT;
        const pdfAspect = pdfWidth / pdfHeight;

        let imgWidth, imgHeight, offsetX, offsetY;

        if (canvasAspect > pdfAspect) {
            imgWidth = pdfWidth - 20; // 10mm margins
            imgHeight = imgWidth / canvasAspect;
            offsetX = 10;
            offsetY = (pdfHeight - imgHeight) / 2;
        } else {
            imgHeight = pdfHeight - 20;
            imgWidth = imgHeight * canvasAspect;
            offsetX = (pdfWidth - imgWidth) / 2;
            offsetY = 10;
        }

        pdf.addImage(dataUrl, "PNG", offsetX, offsetY, imgWidth, imgHeight);
        pdf.save("worksheet.pdf");
    }, []);

    // Expose methods via window for ChatSidebar to call
    useEffect(() => {
        (window as any).canvasEditor = {
            addTextBox,
            addRectangle,
            updateSelectedText,
            addGeneratedText,
            addImage,
        };
    }, [addTextBox, addRectangle, updateSelectedText, addGeneratedText, addImage]);

    return (
        <div className="flex-1 flex flex-col bg-slate-100 rounded-lg overflow-hidden">
            <div className="flex gap-2 p-3 bg-white border-b items-center flex-wrap">
                {/* Undo/Redo */}
                <button
                    onClick={handleUndo}
                    disabled={!canUndo}
                    className="p-2 text-slate-600 hover:bg-slate-100 rounded disabled:opacity-30"
                    title="Undo (Ctrl+Z)"
                >
                    <Undo2 size={18} />
                </button>
                <button
                    onClick={handleRedo}
                    disabled={!canRedo}
                    className="p-2 text-slate-600 hover:bg-slate-100 rounded disabled:opacity-30"
                    title="Redo (Ctrl+Y)"
                >
                    <Redo2 size={18} />
                </button>

                <div className="w-px h-6 bg-slate-300 mx-1" />

                {/* Element buttons */}
                <button
                    onClick={addTextBox}
                    className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700"
                >
                    + Text
                </button>

                {/* Shapes dropdown-style buttons */}
                <button
                    onClick={addRectangle}
                    className="px-3 py-1.5 text-sm bg-slate-600 text-white rounded hover:bg-slate-700"
                    title="Rectangle"
                >
                    ▢ Rect
                </button>
                <button
                    onClick={addCircle}
                    className="px-3 py-1.5 text-sm bg-slate-600 text-white rounded hover:bg-slate-700"
                    title="Circle"
                >
                    ○ Circle
                </button>

                {/* Lines */}
                <button
                    onClick={addLine}
                    className="px-3 py-1.5 text-sm bg-slate-600 text-white rounded hover:bg-slate-700"
                    title="Solid Line"
                >
                    ─ Line
                </button>
                <button
                    onClick={addDashedLine}
                    className="px-3 py-1.5 text-sm bg-slate-600 text-white rounded hover:bg-slate-700"
                    title="Dashed Line"
                >
                    ┄ Dash
                </button>

                {/* Worksheet-specific elements */}
                <button
                    onClick={addAnswerLines}
                    className="px-3 py-1.5 text-sm bg-emerald-600 text-white rounded hover:bg-emerald-700"
                    title="Answer Lines for writing"
                >
                    ☰ Lines
                </button>
                <button
                    onClick={() => addTable(3, 3)}
                    className="px-3 py-1.5 text-sm bg-emerald-600 text-white rounded hover:bg-emerald-700"
                    title="3×3 Table"
                >
                    ⊞ Table
                </button>

                {/* Lists */}
                <button
                    onClick={addBulletList}
                    className="px-3 py-1.5 text-sm bg-amber-600 text-white rounded hover:bg-amber-700"
                    title="Bullet List"
                >
                    • List
                </button>
                <button
                    onClick={addNumberedList}
                    className="px-3 py-1.5 text-sm bg-amber-600 text-white rounded hover:bg-amber-700"
                    title="Numbered List"
                >
                    1. List
                </button>
                <button
                    onClick={addCheckboxList}
                    className="px-3 py-1.5 text-sm bg-amber-600 text-white rounded hover:bg-amber-700"
                    title="Checkbox List"
                >
                    ☐ Check
                </button>

                <div className="w-px h-6 bg-slate-300 mx-1" />

                {/* Templates */}
                <button
                    onClick={addVocabTemplate}
                    className="px-3 py-1.5 text-sm bg-pink-600 text-white rounded hover:bg-pink-700"
                    title="Vocabulary Matching Template"
                >
                    📝 Vocab
                </button>
                <button
                    onClick={addFillBlankTemplate}
                    className="px-3 py-1.5 text-sm bg-pink-600 text-white rounded hover:bg-pink-700"
                    title="Fill-in-the-Blank Template"
                >
                    📋 Fill-in
                </button>

                <div className="w-px h-6 bg-slate-300 mx-1" />

                {/* Copy/Duplicate/Delete */}
                <button
                    onClick={handleDuplicate}
                    className="p-2 text-slate-600 hover:bg-slate-100 rounded"
                    title="Duplicate (Ctrl+D)"
                >
                    <Copy size={18} />
                </button>
                <button
                    onClick={handleDelete}
                    className="p-2 text-slate-600 hover:bg-slate-100 rounded"
                    title="Delete (Del)"
                >
                    <Trash2 size={18} />
                </button>

                <div className="w-px h-6 bg-slate-300 mx-1" />

                {/* Export */}
                <button
                    onClick={exportToPDF}
                    className="px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700 flex items-center gap-1"
                    title="Export to PDF"
                >
                    <Download size={14} />
                    PDF
                </button>

                {/* Text formatting toolbar */}
                {showTextToolbar && (
                    <>
                        <div className="w-px h-6 bg-slate-300 mx-2" />
                        <TextToolbar
                            onBold={handleBold}
                            onItalic={handleItalic}
                            onAlignLeft={() => handleAlign("left")}
                            onAlignCenter={() => handleAlign("center")}
                            onAlignRight={() => handleAlign("right")}
                            onFontSizeChange={handleFontSize}
                            onFontFamilyChange={handleFontFamily}
                            currentFontSize={currentFontSize}
                            currentFontFamily={currentFontFamily}
                        />
                    </>
                )}

                {/* Image toolbar */}
                {showImageToolbar && (
                    <>
                        <div className="w-px h-6 bg-slate-300 mx-2" />
                        <button
                            onClick={handleCropImage}
                            className="px-3 py-1.5 text-sm bg-purple-600 text-white rounded hover:bg-purple-700"
                        >
                            ✂️ Crop Info
                        </button>
                        <button
                            onClick={handleGrayscale}
                            className="px-3 py-1.5 text-sm bg-purple-600 text-white rounded hover:bg-purple-700"
                            title="Toggle Grayscale (for B/W printing)"
                        >
                            ◐ B/W
                        </button>
                    </>
                )}
            </div>
            <div className="flex-1 flex items-center justify-center p-4 overflow-auto">
                <div className="shadow-lg">
                    <canvas ref={canvasRef} />
                </div>
            </div>
        </div>
    );
}
