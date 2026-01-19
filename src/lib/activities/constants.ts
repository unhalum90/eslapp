import { VocabularyItem, GridPrompt } from '@/types/activities';

export const VOCABULARY: VocabularyItem[] = [
    // House Parts
    { english: 'bathroom', category: 'House' },
    { english: 'garage', category: 'House' },
    { english: 'living room', category: 'House' },
    { english: 'kitchen', category: 'House' },
    { english: 'attic', category: 'House' },
    { english: 'upstairs', category: 'House' },
    { english: 'bedroom', category: 'House' },
    { english: 'downstairs', category: 'House' },
    { english: 'roof', category: 'House' },
    { english: 'porch', category: 'House' },
    { english: 'front yard', category: 'House' },
    { english: 'window', category: 'House' },
    { english: 'backyard', category: 'House' },
    { english: 'door', category: 'House' },

    // Furniture
    { english: 'bed', category: 'Furniture' },
    { english: 'closet', category: 'Furniture' },
    { english: 'desk', category: 'Furniture' },
    { english: 'bookshelf', category: 'Furniture' },
    { english: 'sofa', category: 'Furniture' },
    { english: 'chair', category: 'Furniture' },
    { english: 'table', category: 'Furniture' },

    // Food
    { english: 'burger', category: 'Food' },
    { english: 'hot dog', category: 'Food' },
    { english: 'salad', category: 'Food' },
    { english: 'candy', category: 'Food' },
    { english: 'chips', category: 'Food' },
    { english: 'pizza', category: 'Food' },
    { english: 'taco', category: 'Food' },
    { english: 'cookies', category: 'Food' },
    { english: 'fries', category: 'Food' },
    { english: 'popcorn', category: 'Food' },
    { english: 'cake', category: 'Food' },
    { english: 'ice cream', category: 'Food' },

    // Party & Decorations
    { english: 'balloons', category: 'Party' },
    { english: 'flags', category: 'Party' },
    { english: 'party hats', category: 'Party' },
    { english: 'candles', category: 'Party' },
    { english: 'give a gift', category: 'Party' },
    { english: 'invitation', category: 'Party' },
    { english: 'decorate', category: 'Party' },
    { english: 'bake', category: 'Party' },
    { english: 'bring a dish', category: 'Party' },
    { english: 'have a barbecue', category: 'Party' },
    { english: 'sleepover', category: 'Party' },
    { english: 'guest', category: 'Party' },
];

export const TIME_CONNECTORS = ['first', 'then', 'next', 'after that', 'finally'];
export const TIME_EXPRESSIONS = ['at the weekend', 'in the evening', 'at lunchtime', 'every day', 'in the morning'];

export const DICE_ICONS = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

export const GRID_PROMPTS: GridPrompt[] = [
    { text: 'decorate', type: 'positive' },
    { text: 'eat pizza', type: 'negative' },
    { text: 'bring a dish', type: 'question' },
    { text: 'bake a cake', type: 'positive' },
    { text: 'send invite', type: 'negative' },
    { text: 'have a party', type: 'question' },

    { text: 'be early', type: 'negative' },
    { text: 'be late', type: 'question' },
    { text: 'give a gift', type: 'positive' },
    { text: 'eat salad', type: 'negative' },
    { text: 'have bbq', type: 'question' },
    { text: 'sleepover', type: 'positive' },

    { text: 'beautiful', type: 'question' },
    { text: 'comfortable', type: 'positive' },
    { text: 'messy', type: 'negative' },
    { text: 'modern', type: 'question' },
    { text: 'nice', type: 'positive' },
    { text: 'small', type: 'negative' },

    { text: 'in kitchen', type: 'positive' },
    { text: 'in garage', type: 'negative' },
    { text: 'upstairs', type: 'question' },
    { text: 'downstairs', type: 'positive' },
    { text: 'in attic', type: 'negative' },
    { text: 'on porch', type: 'question' },

    { text: 'balloons', type: 'negative' },
    { text: 'candles', type: 'question' },
    { text: 'flags', type: 'positive' },
    { text: 'guest', type: 'negative' },
    { text: 'host', type: 'question' },
    { text: 'music', type: 'positive' },

    { text: 'burgers', type: 'question' },
    { text: 'tacos', type: 'positive' },
    { text: 'ice cream', type: 'negative' },
    { text: 'popcorn', type: 'question' },
    { text: 'fries', type: 'positive' },
    { text: 'cookies', type: 'negative' },
];

export const BOARD_COLORS = [
    { bg: '#dbeafe', border: '#3b82f6', text: '#1e3a8a' }, // blue
    { bg: '#d1fae5', border: '#10b981', text: '#064e3b' }, // green
    { bg: '#fef3c7', border: '#f59e0b', text: '#78350f' }, // amber
    { bg: '#f3e8ff', border: '#a855f7', text: '#581c87' }, // purple
    { bg: '#ffe4e6', border: '#f43f5e', text: '#881337' }, // rose
    { bg: '#e0e7ff', border: '#4f46e5', text: '#312e81' }, // indigo
];

export const SNAKE_LADDER_COLORS = [
    { bg: '#fdf2f8', border: '#f472b6', text: '#831843' }, // Pink
    { bg: '#f0f9ff', border: '#38bdf8', text: '#0c4a6e' }, // Sky
    { bg: '#f0fdf4', border: '#4ade80', text: '#064e3b' }, // Green
    { bg: '#fffbeb', border: '#fbbf24', text: '#78350f' }, // Amber
    { bg: '#f5f3ff', border: '#a78bfa', text: '#4c1d95' }, // Purple
];

export const CARD_COLORS = [
    { bg: '#fff7ed', border: '#fb923c', text: '#7c2d12' }, // Orange
    { bg: '#fdf2f8', border: '#f472b6', text: '#831843' }, // Pink
    { bg: '#f0f9ff', border: '#38bdf8', text: '#0c4a6e' }, // Sky
];

// Snakes and Ladders board definitions
export const LADDERS: Record<number, number> = { 3: 11, 8: 18, 10: 22 };
export const SNAKES: Record<number, number> = { 15: 5, 21: 9, 24: 12 };
