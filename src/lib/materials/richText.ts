import { marked } from "marked";
import type {
  DocumentAdaptation,
  DocumentRole,
  PrintProfile,
} from "@/lib/phase-one/types";

const HTML_TAG = /<\/?[a-z][\s\S]*>/i;

export function toRichHtml(value: string): string {
  const content = value.trim();
  if (!content) return "<p></p>";
  if (HTML_TAG.test(content)) return content;
  return marked.parse(content, { breaks: true, gfm: true }) as string;
}

export function sanitizeRichHtml(value: string): string {
  const html = toRichHtml(value)
    .replace(/<\/?(?:script|style|iframe|object|embed|form|input|button)\b[^>]*>/gi, "")
    .replace(/\s(?:on\w+|style)\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/\s(?:href|src)\s*=\s*(["'])\s*javascript:[\s\S]*?\1/gi, "");
  if (typeof document === "undefined") return html;

  const template = document.createElement("template");
  template.innerHTML = html;
  template.content
    .querySelectorAll("script, style, iframe, object, embed, form, input, button")
    .forEach((node) => node.remove());

  template.content.querySelectorAll("*").forEach((node) => {
    for (const attribute of Array.from(node.attributes)) {
      const name = attribute.name.toLowerCase();
      const value = attribute.value.trim().toLowerCase();
      if (
        name.startsWith("on") ||
        name === "style" ||
        ((name === "href" || name === "src") && value.startsWith("javascript:"))
      ) {
        node.removeAttribute(attribute.name);
      }
    }
  });

  return template.innerHTML;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

interface GoogleDocumentInput {
  title: string;
  purpose: string;
  instructions: string;
  studentHtml: string;
  teacherNotesHtml?: string;
  imageUrls?: string[];
  role?: DocumentRole;
  adaptation?: DocumentAdaptation;
  printProfile?: PrintProfile;
}

export function buildGoogleDocumentHtml(input: GoogleDocumentInput): string {
  const orientation = input.printProfile?.orientation ?? "portrait";
  const paper = input.printProfile?.paper ?? "A4";
  const variantLabel = input.adaptation === "pap" ? " · Version PAP" : "";
  const visuals = (input.imageUrls ?? [])
    .map(
      (url, index) =>
        `<figure><img src="${escapeHtml(url)}" alt="Visual ${index + 1}" /><figcaption>Visual ${index + 1}</figcaption></figure>`,
    )
    .join("");
  const teacherNotes = input.teacherNotesHtml?.trim()
    ? `<hr /><section class="teacher-notes"><h2>Teacher notes / answer key</h2>${sanitizeRichHtml(input.teacherNotesHtml)}</section>`
    : "";

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(input.title)}${variantLabel}</title>
    <style>
      @page { size: ${paper} ${orientation}; margin: 14mm; }
      body { color: #18282b; font-family: Arial, sans-serif; font-size: 11pt; line-height: 1.42; margin: 34pt; }
      h1 { border-bottom: 1.5pt solid #285d68; color: #173b45; font-size: 18pt; margin: 0 0 10pt; padding-bottom: 7pt; text-align: center; }
      h2 { border-left: 3pt solid #285d68; color: #173b45; font-size: 13pt; margin-top: 18pt; padding-left: 7pt; }
      h3 { color: #285d68; font-size: 11pt; margin-top: 13pt; }
      p { margin: 7pt 0; }
      blockquote { background: #e8f3f1; border-left: 4px solid #78aeb2; color: #253c42; margin-left: 0; padding: 8pt 10pt; }
      table { border-collapse: collapse; width: 100%; }
      td, th { border: 1px solid #aeb8b9; padding: 5pt; text-align: left; vertical-align: top; }
      th { background: #e8f3f1; color: #173b45; }
      img { height: auto; max-width: 100%; }
      .purpose { color: #475569; }
      .instructions { background: #e8f3f1; border-radius: 5pt; padding: 8pt 11pt; }
      .teacher-notes { background: #fffbeb; padding: 10pt 14pt; }
      .boost-box, .homework-box { background: #edf5e9; border: 1px solid #a9c69c; padding: 7pt 10pt; }
      .answer { color: #b42318; }
      .student-fields { font-size: 9pt; }
    </style>
  </head>
  <body class="${escapeHtml(input.role ?? "document")} ${input.adaptation === "pap" ? "pap" : "standard"}">
    <h1>${escapeHtml(input.title)}</h1>
    <p class="purpose">${escapeHtml(input.purpose)}</p>
    <section class="instructions"><h2>Student instructions</h2>${sanitizeRichHtml(input.instructions)}</section>
    ${visuals}
    <main>${sanitizeRichHtml(input.studentHtml)}</main>
    ${teacherNotes}
  </body>
</html>`;
}
