export interface VocabularyItem {
    english: string;
    french?: string;
    category: 'House' | 'Furniture' | 'Food' | 'Party';
}

export interface Activity {
    id: string;
    title: string;
    duration: number;
    goal: string;
    description: string;
    type: 'flashcard' | 'boardgame' | 'groupwork' | 'survey' | 'domino' | 'supplementary';
}

export interface TimeCard {
    have: string;
    whoHas: string;
}

export interface Domino {
    leftVisual: string;
    rightText: string;
}

export interface GridPrompt {
    text: string;
    type: 'positive' | 'negative' | 'question';
}
