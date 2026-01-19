/**
 * Get an emoji visual representation for a vocabulary word
 */
export function getVisual(text: string): string {
    const t = text.toLowerCase();

    // House Parts
    if (t.includes('bathroom')) return '🛁';
    if (t.includes('garage')) return '🚗';
    if (t.includes('living')) return '🛋️';
    if (t.includes('kitchen')) return '🍳';
    if (t.includes('attic')) return '🕸️';
    if (t.includes('upstairs')) return '⬆️';
    if (t.includes('bedroom')) return '🛏️';
    if (t.includes('downstairs')) return '⬇️';
    if (t.includes('roof')) return '🏠';
    if (t.includes('porch')) return '🏡';
    if (t.includes('yard')) return '🌳';
    if (t.includes('garden')) return '🌻';
    if (t.includes('window')) return '🪟';
    if (t.includes('door')) return '🚪';

    // Furniture
    if (t.includes('bed')) return '🛏️';
    if (t.includes('closet')) return '🚪';
    if (t.includes('desk')) return '🖥️';
    if (t.includes('book')) return '📚';
    if (t.includes('sofa')) return '🛋️';
    if (t.includes('chair')) return '🪑';
    if (t.includes('table')) return '🪵';

    // Food
    if (t.includes('burger')) return '🍔';
    if (t.includes('hot dog')) return '🌭';
    if (t.includes('salad')) return '🥗';
    if (t.includes('candy')) return '🍬';
    if (t.includes('chips')) return '🥔';
    if (t.includes('pizza')) return '🍕';
    if (t.includes('taco')) return '🌮';
    if (t.includes('cookie')) return '🍪';
    if (t.includes('fries')) return '🍟';
    if (t.includes('popcorn')) return '🍿';
    if (t.includes('cake')) return '🎂';
    if (t.includes('cream')) return '🍦';

    // Party
    if (t.includes('balloon')) return '🎈';
    if (t.includes('flag')) return '🚩';
    if (t.includes('hat')) return '🥳';
    if (t.includes('candle')) return '🕯️';
    if (t.includes('gift')) return '🎁';
    if (t.includes('invitation')) return '📩';
    if (t.includes('decorate')) return '🎉';
    if (t.includes('bake')) return '🧁';
    if (t.includes('barbecue')) return '🍖';
    if (t.includes('sleepover')) return '🌙';
    if (t.includes('dish')) return '🍲';
    if (t.includes('guest')) return '👥';

    return '✨';
}
