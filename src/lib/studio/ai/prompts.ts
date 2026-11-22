import type { SlidePlan } from "./plan";
export const EXAMPLE_PLANS: SlidePlan[] = [
  { title: "Around town", level: "6e", contentLanguage: "en", theme: "ocean", instructions: "Explore the town. Read and answer.", pages: [
    { layout: "title", heading: "Around town", subheading: "Where is the library?", iconName: "Map" },
    { layout: "textImage", heading: "Find the library", body: "The library is next to the park. The school is opposite the library.", imageSide: "right", imagePrompt: "A simple town map with a library, school and park, flat illustration", hotspots: [{ label: "The library", purpose: "audio", anchor: "topLeft" }] },
    { layout: "question", prompt: "Where is the library?", options: ["Next to the park", "Behind the school"], correctIndex: 0, correctFeedback: "Yes, next to the park!", retryFeedback: "Read the first sentence again." },
    { layout: "ending", heading: "Well done!", body: "You can describe places in town." },
  ] },
  { title: "A British breakfast", level: "5e", contentLanguage: "en", theme: "paper", instructions: "Read about breakfast and check your understanding.", pages: [
    { layout: "title", heading: "A British breakfast", iconName: "Coffee" },
    { layout: "twoColumns", heading: "Breakfast choices", left: { title: "On weekdays", lines: ["Some people eat toast or cereal.", "They drink tea, milk or juice."] }, right: { title: "At the weekend", lines: ["Some families cook eggs and beans.", "Everyone has different habits."] } },
    { layout: "question", prompt: "Which drink is mentioned?", options: ["Tea", "Lemonade"], correctIndex: 0, correctFeedback: "Yes, tea is mentioned.", retryFeedback: "Look at the weekday column." },
    { layout: "ending", heading: "Your turn!", body: "Describe your favourite breakfast." },
  ] },
];
const levels = { "6e": "A1, présent simple, mots fréquents, phrases de 10 mots maximum", "5e": "A1+, présent simple et continu, phrases de 12 mots maximum", "4e": "A2, passé simple et modaux courants, phrases de 16 mots maximum", "3e": "A2+, passé et futur, connecteurs simples, phrases de 18 mots maximum" };
export function buildSystemPrompt(level: SlidePlan["level"], routine: string) {
  return `Tu es l'assistant d'un professeur d'anglais au collège français. Produis seulement un plan structuré, jamais du HTML, des coordonnées ou des couleurs libres.
Niveau : ${levels[level]}. Routine : ${routine}.
Langue : respecte contentLanguage pour tous les textes élèves et les feedbacks.
Layouts : title (introduction), menu (navigation, index à partir de zéro), textImage (texte et illustration suggérée), twoColumns (comparaison), vocabulary (4–8 mots), question (2–4 réponses, exactement une correcte), ending (bilan).
Commence par title, termine par question puis ending. Ajoute un menu seulement si le nombre de pages le permet. Les menus pointent uniquement vers des pages de contenu existantes.
Pour listen-locate-respond : propose des hotspots audio ; vocabulary : des cartes lexicales ; explore-read-check : exploration puis lecture ; notice-predict-reveal : observation et prédiction ; read-choose-explain : lecture, choix et justification.
Respecte strictement les plafonds du schéma. Texte brut uniquement. Aucun nom d'élève, paroles de chanson protégées, ou emoji sauf demande explicite. Ne prétends pas avoir créé un audio ou une image. Les hotspots restent à compléter par le professeur.
Exemples valides : ${JSON.stringify(EXAMPLE_PLANS)}`;
}
