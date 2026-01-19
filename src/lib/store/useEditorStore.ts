import { create } from 'zustand'

interface SelectedObject {
    id: string
    content: string
    type: 'text' | 'shape' | 'image'
}

interface EditorState {
    // Legacy Tiptap state (kept for backward compatibility)
    heading: string
    content: string
    setHeading: (heading: string) => void
    setContent: (content: string) => void

    // Canvas state
    canvasJSON: object | null
    setCanvasJSON: (json: object) => void
    selectedObject: SelectedObject | null
    setSelectedObject: (obj: SelectedObject | null) => void
}

export const useEditorStore = create<EditorState>((set) => ({
    // Legacy
    heading: 'Untitled Document',
    content: '',
    setHeading: (heading) => set({ heading }),
    setContent: (content) => set({ content }),

    // Canvas
    canvasJSON: null,
    setCanvasJSON: (canvasJSON) => set({ canvasJSON }),
    selectedObject: null,
    setSelectedObject: (selectedObject) => set({ selectedObject }),
}))
