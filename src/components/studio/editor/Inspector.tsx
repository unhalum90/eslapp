"use client";

import { useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ChevronsDown, ChevronsUp, Copy, Plus, Trash2 } from "lucide-react";
import { createId, createInteraction, defaultAction, duplicateElement } from "@/lib/studio/document";
import { FONT_LABELS, FONT_STACKS } from "@/lib/studio/icons";
import { backgroundCss, GRADIENT_PRESETS, SHAPE_LABELS } from "@/lib/studio/shapes";
import type { BackgroundPattern, CanvasElement, FontFamily, HotspotIcon, Id, InteractionTrigger, PageBackground, StudioAction, StudioActionType, StudioDocument, StudioLevel, VerticalAlign } from "@/lib/studio/types";
import { STUDIO_LEVELS } from "@/lib/studio/types";
import { selectCurrentPage, selectSelectedElement, useStudioEditorStore, type InspectorTab } from "@/lib/store/useStudioEditorStore";
import { IconPicker, ShapePicker } from "./InsertPickers";

const TABS: { id: InspectorTab; label: string }[] = [
  { id: "content", label: "Contenu" },
  { id: "interaction", label: "Interaction" },
  { id: "appearance", label: "Apparence" },
  { id: "accessibility", label: "Accessibilité" },
];

const ACTION_LABELS: Record<StudioActionType, string> = {
  tooltip: "Étiquette",
  modal: "Fenêtre",
  navigate: "Aller à la page",
  playAudio: "Audio",
  stopAudio: "Arrêter l'audio",
  setVisibility: "Afficher / masquer",
  externalLink: "Lien externe",
};

const HOTSPOT_ICONS: { id: HotspotIcon; label: string }[] = [
  { id: "audio", label: "Haut-parleur" },
  { id: "info", label: "Info" },
  { id: "question", label: "Question" },
  { id: "pin", label: "Repère" },
  { id: "eye", label: "Œil" },
  { id: "arrow", label: "Flèche" },
  { id: "star", label: "Étoile" },
  { id: "number", label: "Numéro" },
  { id: "none", label: "Aucune" },
];

const input = "teacher-input !mt-1";
const label = "field-label mt-3";
const small = "text-xs text-slate-500 mt-1";

function mutateElement(elementId: Id, mutator: (element: CanvasElement, doc: StudioDocument) => void, history = true) {
  useStudioEditorStore.getState().update((doc) => {
    for (const page of doc.pages) {
      const element = page.elements.find((candidate) => candidate.id === elementId);
      if (element) mutator(element, doc);
    }
  }, { history });
}

export function Inspector() {
  const document = useStudioEditorStore((state) => state.document);
  const page = useStudioEditorStore(selectCurrentPage);
  const element = useStudioEditorStore(selectSelectedElement);
  const tab = useStudioEditorStore((state) => state.inspectorTab);
  const setTab = useStudioEditorStore((state) => state.setInspectorTab);
  if (!document || !page) return null;

  return (
    <aside className="flex h-full w-80 shrink-0 flex-col border-l border-[#d8d5ca] bg-white" aria-label="Inspecteur">
      {element ? (
        <>
          <div className="border-b border-[#d8d5ca] px-3 py-2">
            <p className="truncate text-sm font-black text-[#18282b]">{element.name}</p>
            <p className="text-xs text-slate-500">{typeLabel(element)}</p>
          </div>
          <div role="tablist" className="grid grid-cols-4 border-b border-[#d8d5ca]">
            {TABS.map((candidate) => (
              <button
                key={candidate.id}
                role="tab"
                type="button"
                aria-selected={tab === candidate.id}
                onClick={() => setTab(candidate.id)}
                className={`border-b-2 px-1 py-2 text-[11px] font-bold ${tab === candidate.id ? "border-[#285d68] text-[#285d68]" : "border-transparent text-slate-500 hover:text-[#18282b]"}`}
              >
                {candidate.label}
              </button>
            ))}
          </div>
          <div className="min-h-0 flex-1 overflow-auto px-3 pb-6 text-sm">
            {tab === "content" ? <ContentTab element={element} document={document} /> : null}
            {tab === "interaction" ? <InteractionTab element={element} document={document} /> : null}
            {tab === "appearance" ? <AppearanceTab element={element} page={page} /> : null}
            {tab === "accessibility" ? <AccessibilityTab element={element} /> : null}
          </div>
        </>
      ) : (
        <div className="min-h-0 flex-1 overflow-auto px-3 pb-6 text-sm">
          <PageSettings document={document} pageId={page.id} />
          <DocumentSettings document={document} />
        </div>
      )}
    </aside>
  );
}

function typeLabel(element: CanvasElement): string {
  const labels: Record<CanvasElement["content"]["type"], string> = {
    text: "Texte",
    image: "Image",
    shape: "Forme",
    icon: "Icône",
    button: "Bouton",
    line: "Ligne",
    hotspot: "Zone cliquable",
    audio: "Lecteur audio",
    singleChoice: "Question à choix unique",
  };
  return labels[element.content.type];
}

// ---------------------------------------------------------------------------
// Content
// ---------------------------------------------------------------------------

function ContentTab({ element, document }: { element: CanvasElement; document: StudioDocument }) {
  const content = element.content;
  const openDrawer = useStudioEditorStore((state) => state.openDrawer);
  const set = (mutator: (el: CanvasElement) => void, history = true) => mutateElement(element.id, mutator, history);

  if (content.type === "text") {
    return (
      <div>
        <label className={label} htmlFor="text-value">Texte</label>
        <textarea id="text-value" className={`${input} min-h-28`} value={content.text} onChange={(event) => set((el) => { if (el.content.type === "text") el.content.text = event.target.value; })} />
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div>
            <label className="field-label" htmlFor="text-size">Taille</label>
            <input id="text-size" type="number" min={8} max={200} className={input} value={content.style.fontSize} onChange={(event) => set((el) => { if (el.content.type === "text") el.content.style.fontSize = Number(event.target.value) || 12; })} />
          </div>
          <div>
            <label className="field-label" htmlFor="text-align">Alignement</label>
            <select id="text-align" className={input} value={content.style.align} onChange={(event) => set((el) => { if (el.content.type === "text") el.content.style.align = event.target.value as "left" | "center" | "right"; })}>
              <option value="left">Gauche</option>
              <option value="center">Centre</option>
              <option value="right">Droite</option>
            </select>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Toggle checked={content.style.bold} onChange={(value) => set((el) => { if (el.content.type === "text") el.content.style.bold = value; })}>Gras</Toggle>
          <Toggle checked={content.style.italic} onChange={(value) => set((el) => { if (el.content.type === "text") el.content.style.italic = value; })}>Italique</Toggle>
          <Toggle checked={Boolean(content.style.shadow)} onChange={(value) => set((el) => { if (el.content.type === "text") el.content.style.shadow = value; })}>Ombre (sur image)</Toggle>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div>
            <label className="field-label" htmlFor="text-font">Police</label>
            <select id="text-font" className={input} value={content.style.fontFamily ?? "sans"} style={{ fontFamily: FONT_STACKS[content.style.fontFamily ?? "sans"] }} onChange={(event) => set((el) => { if (el.content.type === "text") el.content.style.fontFamily = event.target.value as FontFamily; })}>
              {(Object.keys(FONT_LABELS) as FontFamily[]).map((family) => <option key={family} value={family} style={{ fontFamily: FONT_STACKS[family] }}>{FONT_LABELS[family]}</option>)}
            </select>
          </div>
          <div>
            <label className="field-label" htmlFor="text-valign">Position verticale</label>
            <select id="text-valign" className={input} value={content.style.verticalAlign ?? "top"} onChange={(event) => set((el) => { if (el.content.type === "text") el.content.style.verticalAlign = event.target.value as VerticalAlign; })}>
              <option value="top">Haut</option>
              <option value="middle">Milieu</option>
              <option value="bottom">Bas</option>
            </select>
          </div>
          <div>
            <label className="field-label" htmlFor="text-lh">Interligne</label>
            <input id="text-lh" type="number" step={0.1} min={0.8} max={3} className={input} value={content.style.lineHeight ?? 1.3} onChange={(event) => set((el) => { if (el.content.type === "text") el.content.style.lineHeight = Math.max(0.8, Math.min(3, Number(event.target.value) || 1.3)); })} />
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <ColorField id="text-color" label="Couleur" value={content.style.color} onChange={(value) => set((el) => { if (el.content.type === "text") el.content.style.color = value; }, false)} />
          <ColorField id="text-bg" label="Fond" value={content.style.background ?? ""} allowNone onChange={(value) => set((el) => { if (el.content.type === "text") el.content.style.background = value || null; }, false)} />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div>
            <label className="field-label" htmlFor="text-padding">Marge interne</label>
            <input id="text-padding" type="number" min={0} max={200} className={input} value={content.style.padding} onChange={(event) => set((el) => { if (el.content.type === "text") el.content.style.padding = Number(event.target.value) || 0; })} />
          </div>
          <div>
            <label className="field-label" htmlFor="text-radius">Arrondi</label>
            <input id="text-radius" type="number" min={0} max={400} className={input} value={content.style.radius} onChange={(event) => set((el) => { if (el.content.type === "text") el.content.style.radius = Number(event.target.value) || 0; })} />
          </div>
        </div>
      </div>
    );
  }

  if (content.type === "image") {
    const asset = content.assetId ? document.assets[content.assetId] : null;
    return (
      <div>
        <p className={label}>Image</p>
        <p className="mt-1 truncate text-slate-700">{asset ? asset.name : "Aucune image"}</p>
        <button type="button" className="mt-2 rounded-lg border border-[#285d68] px-3 py-1.5 text-sm font-bold text-[#285d68]" onClick={() => openDrawer("image", (assetId) => set((el) => { if (el.content.type === "image") el.content.assetId = assetId; }))}>
          {asset ? "Changer l'image" : "Choisir une image"}
        </button>
        <label className={label} htmlFor="image-alt">Texte alternatif</label>
        <input id="image-alt" className={input} value={content.alt} onChange={(event) => set((el) => { if (el.content.type === "image") el.content.alt = event.target.value; })} placeholder="Ce que montre l'image" />
        <p className={small}>Lu par les lecteurs d&apos;écran et affiché dans la version texte.</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div>
            <label className="field-label" htmlFor="image-fit">Ajustement</label>
            <select id="image-fit" className={input} value={content.fit} onChange={(event) => set((el) => { if (el.content.type === "image") el.content.fit = event.target.value as "contain" | "cover" | "fill"; })}>
              <option value="contain">Contenir</option>
              <option value="cover">Couvrir</option>
              <option value="fill">Étirer</option>
            </select>
          </div>
          <div>
            <label className="field-label" htmlFor="image-radius">Arrondi</label>
            <input id="image-radius" type="number" min={0} max={400} className={input} value={content.radius} onChange={(event) => set((el) => { if (el.content.type === "image") el.content.radius = Number(event.target.value) || 0; })} />
          </div>
        </div>
      </div>
    );
  }

  if (content.type === "shape") {
    return (
      <div>
        <p className={label}>Forme : {SHAPE_LABELS[content.shape]}</p>
        <div className="mt-1">
          <ShapePicker compact value={content.shape} onPick={(kind) => set((el) => { if (el.content.type === "shape") el.content.shape = kind; })} />
        </div>
        <div className="mt-3">
          <Toggle checked={Boolean(content.shadow)} onChange={(value) => set((el) => { if (el.content.type === "shape") el.content.shadow = value; })}>Ombre portée</Toggle>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <ColorField id="shape-fill" label="Remplissage" value={content.fill} allowNone onChange={(value) => set((el) => { if (el.content.type === "shape") el.content.fill = value || "transparent"; }, false)} />
          <ColorField id="shape-stroke" label="Contour" value={content.stroke} allowNone onChange={(value) => set((el) => { if (el.content.type === "shape") el.content.stroke = value || "transparent"; }, false)} />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div>
            <label className="field-label" htmlFor="shape-stroke-width">Épaisseur</label>
            <input id="shape-stroke-width" type="number" min={0} max={60} className={input} value={content.strokeWidth} onChange={(event) => set((el) => { if (el.content.type === "shape") el.content.strokeWidth = Number(event.target.value) || 0; })} />
          </div>
          {content.shape === "rectangle" ? (
            <div>
              <label className="field-label" htmlFor="shape-radius">Arrondi</label>
              <input id="shape-radius" type="number" min={0} max={400} className={input} value={content.radius} onChange={(event) => set((el) => { if (el.content.type === "shape") el.content.radius = Number(event.target.value) || 0; })} />
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  if (content.type === "icon") {
    return (
      <div>
        <p className={label}>Icône : {content.name}</p>
        <div className="mt-1">
          <IconPicker value={content.name} onPick={(name) => set((el) => { if (el.content.type === "icon" && name) el.content.name = name; })} />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <ColorField id="icon-color" label="Couleur" value={content.color} onChange={(value) => set((el) => { if (el.content.type === "icon") el.content.color = value; }, false)} />
          <ColorField id="icon-bg" label="Fond" value={content.background ?? ""} allowNone onChange={(value) => set((el) => { if (el.content.type === "icon") el.content.background = value || null; }, false)} />
          <div>
            <label className="field-label" htmlFor="icon-bg-shape">Forme du fond</label>
            <select id="icon-bg-shape" className={input} value={content.backgroundShape} onChange={(event) => set((el) => { if (el.content.type === "icon") el.content.backgroundShape = event.target.value as "circle" | "rounded" | "none"; })}>
              <option value="circle">Cercle</option>
              <option value="rounded">Carré arrondi</option>
              <option value="none">Aucun</option>
            </select>
          </div>
          <div>
            <label className="field-label" htmlFor="icon-stroke">Épaisseur du trait</label>
            <input id="icon-stroke" type="number" step={0.5} min={0.5} max={4} className={input} value={content.strokeWidth} onChange={(event) => set((el) => { if (el.content.type === "icon") el.content.strokeWidth = Math.max(0.5, Math.min(4, Number(event.target.value) || 2)); })} />
          </div>
        </div>
        <p className={small}>Une icône est décorative par défaut. Donnez-lui une étiquette (onglet Accessibilité) si elle porte un sens.</p>
      </div>
    );
  }

  if (content.type === "button") {
    return (
      <div>
        <label className={label} htmlFor="button-label">Texte du bouton</label>
        <input id="button-label" className={input} value={content.label} onChange={(event) => set((el) => { if (el.content.type === "button") el.content.label = event.target.value; })} />
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div>
            <label className="field-label" htmlFor="button-variant">Style</label>
            <select id="button-variant" className={input} value={content.variant} onChange={(event) => set((el) => { if (el.content.type === "button") el.content.variant = event.target.value as "filled" | "outline" | "soft"; })}>
              <option value="filled">Plein</option>
              <option value="outline">Contour</option>
              <option value="soft">Doux</option>
            </select>
          </div>
          <div>
            <label className="field-label" htmlFor="button-shape">Coins</label>
            <select id="button-shape" className={input} value={content.shape} onChange={(event) => set((el) => { if (el.content.type === "button") el.content.shape = event.target.value as "pill" | "rounded" | "square"; })}>
              <option value="pill">Pilule</option>
              <option value="rounded">Arrondis</option>
              <option value="square">Carrés</option>
            </select>
          </div>
          <ColorField id="button-color" label="Couleur" value={content.color} onChange={(value) => set((el) => { if (el.content.type === "button") el.content.color = value; }, false)} />
          <ColorField id="button-text" label="Texte" value={content.textColor} onChange={(value) => set((el) => { if (el.content.type === "button") el.content.textColor = value; }, false)} />
          <div>
            <label className="field-label" htmlFor="button-size">Taille du texte</label>
            <input id="button-size" type="number" min={8} max={120} className={input} value={content.fontSize} onChange={(event) => set((el) => { if (el.content.type === "button") el.content.fontSize = Number(event.target.value) || 24; })} />
          </div>
        </div>
        <p className={label}>Icône : {content.icon ?? "aucune"}</p>
        <div className="mt-1">
          <IconPicker value={content.icon} allowNone onPick={(name) => set((el) => { if (el.content.type === "button") el.content.icon = name; })} />
        </div>
        <p className={small}>Les actions du bouton se règlent dans l&apos;onglet Interaction.</p>
      </div>
    );
  }

  if (content.type === "line") {
    return (
      <div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <ColorField id="line-color" label="Couleur" value={content.stroke} onChange={(value) => set((el) => { if (el.content.type === "line") el.content.stroke = value; }, false)} />
          <div>
            <label className="field-label" htmlFor="line-width">Épaisseur</label>
            <input id="line-width" type="number" min={1} max={60} className={input} value={content.strokeWidth} onChange={(event) => set((el) => { if (el.content.type === "line") el.content.strokeWidth = Math.max(1, Number(event.target.value) || 4); })} />
          </div>
          <div>
            <label className="field-label" htmlFor="line-dash">Trait</label>
            <select id="line-dash" className={input} value={content.dash} onChange={(event) => set((el) => { if (el.content.type === "line") el.content.dash = event.target.value as "solid" | "dashed" | "dotted"; })}>
              <option value="solid">Continu</option>
              <option value="dashed">Tirets</option>
              <option value="dotted">Pointillés</option>
            </select>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Toggle checked={content.startArrow} onChange={(value) => set((el) => { if (el.content.type === "line") el.content.startArrow = value; })}>Flèche au début</Toggle>
          <Toggle checked={content.endArrow} onChange={(value) => set((el) => { if (el.content.type === "line") el.content.endArrow = value; })}>Flèche à la fin</Toggle>
        </div>
        <p className={small}>Tournez la ligne avec le champ Rotation (onglet Apparence).</p>
      </div>
    );
  }

  if (content.type === "hotspot") {
    return (
      <div>
        <label className={label} htmlFor="hotspot-label">Étiquette (lue aux élèves)</label>
        <input id="hotspot-label" className={input} value={content.label} onChange={(event) => set((el) => { if (el.content.type === "hotspot") el.content.label = event.target.value; })} placeholder="Ex. : Directions 1" />
        <p className={small}>Affichée dans la zone si elle est large, et toujours annoncée aux lecteurs d&apos;écran.</p>
        <label className={label} htmlFor="hotspot-icon">Icône</label>
        <select id="hotspot-icon" className={input} value={content.icon} onChange={(event) => set((el) => { if (el.content.type === "hotspot") el.content.icon = event.target.value as HotspotIcon; })}>
          {HOTSPOT_ICONS.map((icon) => <option key={icon.id} value={icon.id}>{icon.label}</option>)}
        </select>
        {content.icon === "number" ? (
          <>
            <label className={label} htmlFor="hotspot-number">Numéro</label>
            <input id="hotspot-number" type="number" min={0} max={99} className={input} value={content.number ?? 1} onChange={(event) => set((el) => { if (el.content.type === "hotspot") el.content.number = Number(event.target.value) || 0; })} />
          </>
        ) : null}
        <div className="mt-3 grid grid-cols-2 gap-2">
          <ColorField id="hotspot-color" label="Couleur" value={content.color} onChange={(value) => set((el) => { if (el.content.type === "hotspot") el.content.color = value; }, false)} />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Toggle checked={content.transparent} onChange={(value) => set((el) => { if (el.content.type === "hotspot") el.content.transparent = value; })}>Invisible (sur une image)</Toggle>
          <Toggle checked={content.showHint} onChange={(value) => set((el) => { if (el.content.type === "hotspot") el.content.showHint = value; })}>Indice animé</Toggle>
        </div>
        <p className={small}>Les actions se règlent dans l&apos;onglet Interaction.</p>
      </div>
    );
  }

  if (content.type === "audio") {
    const asset = content.assetId ? document.assets[content.assetId] : null;
    return (
      <div>
        <p className={label}>Fichier audio</p>
        <p className="mt-1 truncate text-slate-700">{asset ? asset.name : "Aucun fichier"}</p>
        <button type="button" className="mt-2 rounded-lg border border-[#285d68] px-3 py-1.5 text-sm font-bold text-[#285d68]" onClick={() => openDrawer("audio", (assetId) => set((el) => { if (el.content.type === "audio") el.content.assetId = assetId; }))}>
          {asset ? "Changer le fichier" : "Choisir un fichier"}
        </button>
        <label className={label} htmlFor="audio-label">Titre</label>
        <input id="audio-label" className={input} value={content.label} onChange={(event) => set((el) => { if (el.content.type === "audio") el.content.label = event.target.value; })} />
        <label className={label} htmlFor="audio-transcript">Transcription</label>
        <textarea id="audio-transcript" className={`${input} min-h-28`} value={content.transcript} onChange={(event) => set((el) => { if (el.content.type === "audio") el.content.transcript = event.target.value; })} />
        <div className="mt-3">
          <Toggle checked={content.showTranscript} onChange={(value) => set((el) => { if (el.content.type === "audio") el.content.showTranscript = value; })}>Transcription visible d&apos;emblée</Toggle>
        </div>
        <p className={small}>Sinon, un bouton « Texte » permet de l&apos;afficher (accommodation).</p>
      </div>
    );
  }

  if (content.type === "singleChoice") {
    return (
      <div>
        <label className={label} htmlFor="q-prompt">Question</label>
        <textarea id="q-prompt" className={`${input} min-h-20`} value={content.prompt} onChange={(event) => set((el) => { if (el.content.type === "singleChoice") el.content.prompt = event.target.value; })} />
        <p className={label}>Réponses (cochez la bonne)</p>
        <ul className="mt-1 space-y-2">
          {content.options.map((option, index) => (
            <li key={option.id} className="flex items-center gap-2">
              <input
                type="radio"
                name={`correct-${element.id}`}
                aria-label={`Réponse ${index + 1} correcte`}
                checked={content.correctOptionId === option.id}
                onChange={() => set((el) => { if (el.content.type === "singleChoice") el.content.correctOptionId = option.id; })}
                className="h-4 w-4 accent-[#285d68]"
              />
              <input
                aria-label={`Réponse ${index + 1}`}
                className="teacher-input !mt-0"
                value={option.label}
                onChange={(event) => set((el) => { if (el.content.type === "singleChoice") { const found = el.content.options.find((item) => item.id === option.id); if (found) found.label = event.target.value; } })}
              />
              <button
                type="button"
                aria-label={`Supprimer la réponse ${index + 1}`}
                disabled={content.options.length <= 2}
                className="rounded p-1 text-slate-500 hover:text-[#d45b3f] disabled:opacity-30"
                onClick={() => set((el) => { if (el.content.type === "singleChoice") { el.content.options = el.content.options.filter((item) => item.id !== option.id); if (el.content.correctOptionId === option.id) el.content.correctOptionId = el.content.options[0]?.id ?? ""; } })}
              >
                <Trash2 size={16} />
              </button>
            </li>
          ))}
        </ul>
        <button
          type="button"
          disabled={content.options.length >= 8}
          className="mt-2 inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-bold text-slate-700 disabled:opacity-40"
          onClick={() => set((el) => { if (el.content.type === "singleChoice") el.content.options.push({ id: createId("opt"), label: "" }); })}
        >
          <Plus size={14} /> Ajouter une réponse
        </button>
        <label className={label} htmlFor="q-correct">Feedback si correct</label>
        <textarea id="q-correct" className={`${input} min-h-16`} value={content.correctFeedback} onChange={(event) => set((el) => { if (el.content.type === "singleChoice") el.content.correctFeedback = event.target.value; })} />
        <label className={label} htmlFor="q-retry">Feedback si incorrect (indice)</label>
        <textarea id="q-retry" className={`${input} min-h-16`} value={content.retryFeedback} onChange={(event) => set((el) => { if (el.content.type === "singleChoice") el.content.retryFeedback = event.target.value; })} />
        <div className="mt-3">
          <Toggle checked={content.allowRetry} onChange={(value) => set((el) => { if (el.content.type === "singleChoice") el.content.allowRetry = value; })}>Autoriser une nouvelle tentative</Toggle>
        </div>
        <p className={label}>Actions quand la réponse est correcte</p>
        <ActionsList
          document={document}
          elementId={element.id}
          actions={content.onCorrect}
          onChange={(actions) => set((el) => { if (el.content.type === "singleChoice") el.content.onCorrect = actions; })}
        />
      </div>
    );
  }

  return null;
}

// ---------------------------------------------------------------------------
// Interaction
// ---------------------------------------------------------------------------

function InteractionTab({ element, document }: { element: CanvasElement; document: StudioDocument }) {
  const set = (mutator: (el: CanvasElement) => void) => mutateElement(element.id, mutator);
  if (element.content.type === "singleChoice") {
    return <p className="mt-3 text-slate-600">Les actions d&apos;une question se règlent dans l&apos;onglet Contenu (« quand la réponse est correcte »).</p>;
  }
  if (element.content.type === "line") {
    return <p className="mt-3 text-slate-600">Une ligne est décorative et n&apos;a pas d&apos;interaction.</p>;
  }
  return (
    <div>
      {element.interactions.map((interaction, index) => (
        <section key={interaction.id} className="mt-3 rounded-xl border border-slate-200 p-2">
          <div className="flex items-center justify-between gap-2">
            <label className="field-label" htmlFor={`trigger-${interaction.id}`}>Déclencheur {element.interactions.length > 1 ? index + 1 : ""}</label>
            <button type="button" aria-label="Supprimer ce déclencheur" className="rounded p-1 text-slate-500 hover:text-[#d45b3f]" onClick={() => set((el) => { el.interactions = el.interactions.filter((item) => item.id !== interaction.id); })}>
              <Trash2 size={16} />
            </button>
          </div>
          <select
            id={`trigger-${interaction.id}`}
            className={input}
            value={interaction.trigger}
            onChange={(event) => set((el) => { const found = el.interactions.find((item) => item.id === interaction.id); if (found) found.trigger = event.target.value as InteractionTrigger; })}
          >
            <option value="activate">Clic / touche Entrée</option>
            <option value="hoverOrFocus">Survol ou focus (indice complémentaire)</option>
          </select>
          {interaction.trigger === "hoverOrFocus" ? <p className={small}>Le survol ne peut pas être le seul chemin vers un contenu essentiel.</p> : null}
          <ActionsList
            document={document}
            elementId={element.id}
            actions={interaction.actions}
            onChange={(actions) => set((el) => { const found = el.interactions.find((item) => item.id === interaction.id); if (found) found.actions = actions; })}
          />
        </section>
      ))}
      <button
        type="button"
        disabled={element.interactions.length >= 4}
        className="mt-3 inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-bold text-slate-700 disabled:opacity-40"
        onClick={() => set((el) => { el.interactions.push(createInteraction()); })}
      >
        <Plus size={14} /> Ajouter un déclencheur
      </button>
      {element.interactions.length === 0 ? <p className={small}>Cet élément n&apos;a pas encore d&apos;interaction.</p> : null}
    </div>
  );
}

function ActionsList({ document, elementId, actions, onChange }: { document: StudioDocument; elementId: Id; actions: StudioAction[]; onChange: (actions: StudioAction[]) => void }) {
  const [adding, setAdding] = useState(false);
  const replace = (index: number, next: StudioAction) => onChange(actions.map((action, i) => (i === index ? next : action)));
  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= actions.length) return;
    const next = [...actions];
    const [moved] = next.splice(index, 1);
    next.splice(target, 0, moved);
    onChange(next);
  };
  return (
    <div className="mt-2 space-y-2">
      {actions.map((action, index) => (
        <div key={index} className="rounded-lg bg-[#f4f2eb] p-2">
          <div className="flex items-center gap-1">
            <span className="flex-1 text-xs font-black uppercase tracking-wide text-[#285d68]">{index + 1}. {ACTION_LABELS[action.type]}</span>
            <button type="button" aria-label="Monter l'action" className="rounded p-1 text-slate-500 disabled:opacity-30" disabled={index === 0} onClick={() => move(index, -1)}><ArrowUp size={14} /></button>
            <button type="button" aria-label="Descendre l'action" className="rounded p-1 text-slate-500 disabled:opacity-30" disabled={index === actions.length - 1} onClick={() => move(index, 1)}><ArrowDown size={14} /></button>
            <button type="button" aria-label="Supprimer l'action" className="rounded p-1 text-slate-500 hover:text-[#d45b3f]" onClick={() => onChange(actions.filter((_, i) => i !== index))}><Trash2 size={14} /></button>
          </div>
          <ActionForm document={document} elementId={elementId} action={action} onChange={(next) => replace(index, next)} />
        </div>
      ))}
      {adding ? (
        <div className="grid grid-cols-2 gap-1">
          {(Object.keys(ACTION_LABELS) as StudioActionType[]).map((type) => (
            <button key={type} type="button" className="rounded-lg border border-slate-300 px-2 py-1.5 text-left text-xs font-bold hover:border-[#285d68] hover:bg-[#e8f3f1]" onClick={() => { onChange([...actions, defaultAction(type)]); setAdding(false); }}>
              {ACTION_LABELS[type]}
            </button>
          ))}
          <button type="button" className="rounded-lg px-2 py-1.5 text-left text-xs font-bold text-slate-500" onClick={() => setAdding(false)}>Annuler</button>
        </div>
      ) : (
        <button type="button" disabled={actions.length >= 12} className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-bold text-slate-700 disabled:opacity-40" onClick={() => setAdding(true)}>
          <Plus size={14} /> Ajouter une action
        </button>
      )}
    </div>
  );
}

function ActionForm({ document, elementId, action, onChange }: { document: StudioDocument; elementId: Id; action: StudioAction; onChange: (action: StudioAction) => void }) {
  const images = Object.values(document.assets).filter((asset) => asset.kind === "image");
  const audios = Object.values(document.assets).filter((asset) => asset.kind === "audio");
  const openDrawer = useStudioEditorStore((state) => state.openDrawer);

  switch (action.type) {
    case "tooltip":
    case "modal":
      return (
        <div>
          {action.type === "modal" ? (
            <>
              <label className="field-label mt-2">Titre</label>
              <input className={input} value={action.title} onChange={(event) => onChange({ ...action, title: event.target.value })} />
            </>
          ) : null}
          <label className="field-label mt-2">Texte</label>
          <textarea className={`${input} min-h-20`} value={action.text} onChange={(event) => onChange({ ...action, text: event.target.value })} />
          {action.type === "modal" ? (
            <>
              <label className="field-label mt-2">Taille</label>
              <select className={input} value={action.size} onChange={(event) => onChange({ ...action, size: event.target.value as "small" | "medium" | "large" })}>
                <option value="small">Petite</option>
                <option value="medium">Moyenne</option>
                <option value="large">Grande</option>
              </select>
            </>
          ) : null}
          <label className="field-label mt-2">Image (optionnel)</label>
          <div className="flex gap-1">
            <select className={`${input} flex-1`} value={action.imageAssetId ?? ""} onChange={(event) => onChange({ ...action, imageAssetId: event.target.value || null })}>
              <option value="">Aucune</option>
              {images.map((asset) => <option key={asset.id} value={asset.id}>{asset.name}</option>)}
            </select>
            <button type="button" className="mt-1 rounded-lg border border-slate-300 px-2 text-xs font-bold" onClick={() => openDrawer("image", (assetId) => onChange({ ...action, imageAssetId: assetId }))}>Importer</button>
          </div>
          <label className="field-label mt-2">Audio (optionnel)</label>
          <div className="flex gap-1">
            <select className={`${input} flex-1`} value={action.audioAssetId ?? ""} onChange={(event) => onChange({ ...action, audioAssetId: event.target.value || null })}>
              <option value="">Aucun</option>
              {audios.map((asset) => <option key={asset.id} value={asset.id}>{asset.name}</option>)}
            </select>
            <button type="button" className="mt-1 rounded-lg border border-slate-300 px-2 text-xs font-bold" onClick={() => openDrawer("audio", (assetId) => onChange({ ...action, audioAssetId: assetId }))}>Importer</button>
          </div>
        </div>
      );
    case "navigate":
      return (
        <div>
          <label className="field-label mt-2">Page cible</label>
          <select className={input} value={action.target} onChange={(event) => onChange({ ...action, target: event.target.value })}>
            <option value="next">Page suivante</option>
            <option value="previous">Page précédente</option>
            {document.pages.map((page, index) => <option key={page.id} value={page.id}>{index + 1}. {page.name}</option>)}
          </select>
        </div>
      );
    case "playAudio":
      return (
        <div>
          <label className="field-label mt-2">Fichier audio</label>
          <div className="flex gap-1">
            <select className={`${input} flex-1`} value={action.assetId ?? ""} onChange={(event) => onChange({ ...action, assetId: event.target.value || null })}>
              <option value="">Choisir…</option>
              {audios.map((asset) => <option key={asset.id} value={asset.id}>{asset.name}</option>)}
            </select>
            <button type="button" className="mt-1 rounded-lg border border-slate-300 px-2 text-xs font-bold" onClick={() => openDrawer("audio", (assetId) => onChange({ ...action, assetId }))}>Importer</button>
          </div>
          <p className={small}>Démarrer un clip arrête le précédent. Pensez à la transcription dans une étiquette ou un lecteur audio.</p>
        </div>
      );
    case "stopAudio":
      return <p className={small}>Arrête la narration en cours.</p>;
    case "setVisibility":
      return (
        <div>
          <label className="field-label mt-2">Mode</label>
          <select className={input} value={action.mode} onChange={(event) => onChange({ ...action, mode: event.target.value as "show" | "hide" | "toggle" })}>
            <option value="show">Afficher</option>
            <option value="hide">Masquer</option>
            <option value="toggle">Basculer</option>
          </select>
          <p className="field-label mt-2">Éléments ciblés</p>
          <div className="mt-1 max-h-48 space-y-1 overflow-auto rounded-lg border border-slate-200 bg-white p-2">
            {document.pages.map((page) => (
              <div key={page.id}>
                <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">{page.name}</p>
                {page.elements.filter((candidate) => candidate.id !== elementId).map((candidate) => (
                  <label key={candidate.id} className="flex items-center gap-2 py-0.5 text-xs">
                    <input
                      type="checkbox"
                      className="accent-[#285d68]"
                      checked={action.elementIds.includes(candidate.id)}
                      onChange={(event) => onChange({ ...action, elementIds: event.target.checked ? [...action.elementIds, candidate.id] : action.elementIds.filter((id) => id !== candidate.id) })}
                    />
                    <span className="truncate">{candidate.name}</span>
                  </label>
                ))}
              </div>
            ))}
          </div>
        </div>
      );
    case "externalLink":
      return (
        <div>
          <label className="field-label mt-2">Adresse https://</label>
          <input className={input} value={action.url} onChange={(event) => onChange({ ...action, url: event.target.value })} placeholder="https://" />
          <p className={small}>S&apos;ouvre dans un nouvel onglet.</p>
        </div>
      );
  }
}

// ---------------------------------------------------------------------------
// Appearance
// ---------------------------------------------------------------------------

function AppearanceTab({ element, page }: { element: CanvasElement; page: StudioDocument["pages"][number] }) {
  const set = (mutator: (el: CanvasElement) => void, history = true) => mutateElement(element.id, mutator, history);
  const update = useStudioEditorStore((state) => state.update);
  const select = useStudioEditorStore((state) => state.select);
  const index = page.elements.findIndex((candidate) => candidate.id === element.id);
  const reorder = (to: number) => {
    update((doc) => {
      const target = doc.pages.find((candidate) => candidate.id === page.id);
      if (!target) return;
      const from = target.elements.findIndex((candidate) => candidate.id === element.id);
      const clamped = Math.max(0, Math.min(to, target.elements.length - 1));
      const [moved] = target.elements.splice(from, 1);
      target.elements.splice(clamped, 0, moved);
    });
  };
  const numberField = (id: string, title: string, key: keyof CanvasElement["frame"]) => (
    <div>
      <label className="field-label" htmlFor={id}>{title}</label>
      <input id={id} type="number" className={input} value={Math.round(element.frame[key])} onChange={(event) => set((el) => { el.frame[key] = Number(event.target.value) || 0; })} />
    </div>
  );
  return (
    <div>
      <label className={label} htmlFor="el-name">Nom du calque</label>
      <input id="el-name" className={input} value={element.name} onChange={(event) => set((el) => { el.name = event.target.value; })} />
      <div className="mt-3 grid grid-cols-2 gap-2">
        {numberField("el-x", "X", "x")}
        {numberField("el-y", "Y", "y")}
        {numberField("el-w", "Largeur", "width")}
        {numberField("el-h", "Hauteur", "height")}
        {numberField("el-rot", "Rotation (°)", "rotation")}
        <div>
          <label className="field-label" htmlFor="el-opacity">Opacité (%)</label>
          <input id="el-opacity" type="number" min={0} max={100} className={input} value={Math.round(element.opacity * 100)} onChange={(event) => set((el) => { el.opacity = Math.max(0, Math.min(1, Number(event.target.value) / 100)); })} />
        </div>
      </div>
      <p className={label}>Ordre des calques</p>
      <div className="mt-1 flex flex-wrap gap-1">
        <button type="button" className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2 py-1 text-xs font-bold" onClick={() => reorder(page.elements.length - 1)}><ChevronsUp size={14} /> Premier plan</button>
        <button type="button" className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2 py-1 text-xs font-bold" onClick={() => reorder(index + 1)}><ArrowUp size={14} /> Avancer</button>
        <button type="button" className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2 py-1 text-xs font-bold" onClick={() => reorder(index - 1)}><ArrowDown size={14} /> Reculer</button>
        <button type="button" className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2 py-1 text-xs font-bold" onClick={() => reorder(0)}><ChevronsDown size={14} /> Arrière-plan</button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Toggle checked={element.lockedInEditor} onChange={(value) => set((el) => { el.lockedInEditor = value; })}>Verrouillé dans l&apos;éditeur</Toggle>
        <Toggle checked={element.initiallyVisible} onChange={(value) => set((el) => { el.initiallyVisible = value; })}>Visible au départ</Toggle>
      </div>
      <p className={small}>Un élément masqué au départ peut être révélé par une action « Afficher / masquer ».</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-bold"
          onClick={() => {
            const copy = duplicateElement(element);
            update((doc) => {
              const target = doc.pages.find((candidate) => candidate.id === page.id);
              target?.elements.push(copy);
            });
            select(copy.id);
          }}
        >
          <Copy size={14} /> Dupliquer
        </button>
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-lg border border-[#d45b3f] px-3 py-1.5 text-sm font-bold text-[#a33d25]"
          onClick={() => {
            update((doc) => {
              const target = doc.pages.find((candidate) => candidate.id === page.id);
              if (target) target.elements = target.elements.filter((candidate) => candidate.id !== element.id);
            });
            select(null);
          }}
        >
          <Trash2 size={14} /> Supprimer
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Accessibility
// ---------------------------------------------------------------------------

function AccessibilityTab({ element }: { element: CanvasElement }) {
  const set = (mutator: (el: CanvasElement) => void) => mutateElement(element.id, mutator);
  return (
    <div>
      <label className={label} htmlFor="a11y-label">Étiquette accessible</label>
      <input id="a11y-label" className={input} value={element.accessibility.label} onChange={(event) => set((el) => { el.accessibility.label = event.target.value; })} placeholder="Nom annoncé au lecteur d'écran" />
      <p className={small}>Si vide, l&apos;étiquette de la zone, le texte alternatif ou le nom du calque est utilisé.</p>
      <label className={label} htmlFor="a11y-order">Ordre de lecture</label>
      <input id="a11y-order" type="number" min={0} className={input} value={element.accessibility.readingOrder} onChange={(event) => set((el) => { el.accessibility.readingOrder = Number(event.target.value) || 0; })} />
      <p className={small}>Utilisé par la « Version texte » du lecteur.</p>
      <div className="mt-3">
        <Toggle checked={element.accessibility.decorative} onChange={(value) => set((el) => { el.accessibility.decorative = value; })}>Décoratif (ignoré par la version texte)</Toggle>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page and document settings
// ---------------------------------------------------------------------------

function PageSettings({ document, pageId }: { document: StudioDocument; pageId: Id }) {
  const update = useStudioEditorStore((state) => state.update);
  const openDrawer = useStudioEditorStore((state) => state.openDrawer);
  const page = document.pages.find((candidate) => candidate.id === pageId);
  if (!page) return null;
  const set = (mutator: (target: StudioDocument["pages"][number]) => void, history = true) => update((doc) => { const target = doc.pages.find((candidate) => candidate.id === pageId); if (target) mutator(target); }, { history });
  const asset = page.background.type === "image" ? document.assets[page.background.assetId] : null;
  return (
    <section>
      <h2 className="mt-3 text-xs font-black uppercase tracking-wide text-slate-500">Page</h2>
      <label className={label} htmlFor="page-name">Nom</label>
      <input id="page-name" className={input} value={page.name} onChange={(event) => set((target) => { target.name = event.target.value; })} />
      <p className={label}>Fond</p>
      <div className="mt-1 flex gap-1" role="tablist" aria-label="Type de fond">
        {([
          ["color", "Couleur"],
          ["gradient", "Dégradé"],
          ["image", "Image"],
        ] as const).map(([kind, title]) => (
          <button
            key={kind}
            type="button"
            role="tab"
            aria-selected={page.background.type === kind}
            className={`rounded-lg px-2 py-1 text-xs font-bold ${page.background.type === kind ? "bg-[#285d68] text-white" : "border border-slate-200 text-slate-600"}`}
            onClick={() => {
              if (kind === page.background.type) return;
              if (kind === "color") set((target) => { target.background = { type: "color", value: target.background.type === "image" ? target.background.color : target.background.type === "gradient" ? target.background.from : "#ffffff" }; });
              if (kind === "gradient") set((target) => { target.background = { type: "gradient", ...GRADIENT_PRESETS[10] }; });
              if (kind === "image") openDrawer("background", (assetId) => set((target) => { target.background = { type: "image", assetId, fit: "contain", color: backgroundCss(target.background) }; }));
            }}
          >
            {title}
          </button>
        ))}
      </div>
      {page.background.type === "color" ? (
        <div className="mt-2">
          <ColorField id="page-color" label="Couleur" value={page.background.value} onChange={(value) => set((target) => { if (target.background.type === "color") target.background.value = value; }, false)} />
        </div>
      ) : null}
      {page.background.type === "gradient" ? (
        <div className="mt-2">
          <div className="grid grid-cols-6 gap-1" role="listbox" aria-label="Dégradés">
            {GRADIENT_PRESETS.map((preset, index) => (
              <button key={index} type="button" role="option" aria-selected={page.background.type === "gradient" && page.background.from === preset.from && page.background.to === preset.to} aria-label={`Dégradé ${index + 1}`} className="aspect-square rounded-lg border border-slate-200 hover:border-[#285d68]" style={{ background: backgroundCss({ type: "gradient", ...preset }) }} onClick={() => set((target) => { target.background = { type: "gradient", ...preset }; })} />
            ))}
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <ColorField id="grad-from" label="Début" value={page.background.from} onChange={(value) => set((target) => { if (target.background.type === "gradient") target.background.from = value; }, false)} />
            <ColorField id="grad-to" label="Fin" value={page.background.to} onChange={(value) => set((target) => { if (target.background.type === "gradient") target.background.to = value; }, false)} />
          </div>
          <label className="field-label mt-2" htmlFor="grad-angle">Angle (°)</label>
          <input id="grad-angle" type="range" min={0} max={360} className="mt-1 w-full accent-[#285d68]" value={page.background.angle} onChange={(event) => set((target) => { if (target.background.type === "gradient") target.background.angle = Number(event.target.value) || 0; }, false)} />
        </div>
      ) : null}
      {page.background.type === "image" ? (
        <div className="mt-2">
          <p className="truncate text-xs text-slate-600">{asset ? asset.name : "Aucune image"}</p>
          <div className="mt-1 flex gap-1">
            <button type="button" className="rounded-lg border border-[#285d68] px-2 py-1 text-xs font-bold text-[#285d68]" onClick={() => openDrawer("background", (assetId) => set((target) => { if (target.background.type === "image") target.background.assetId = assetId; }))}>
              Changer
            </button>
            <button type="button" className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-bold" onClick={() => set((target) => { if (target.background.type === "image") target.background = { type: "color", value: target.background.color }; })}>Retirer</button>
          </div>
          <label className={label} htmlFor="bg-fit">Ajustement du fond</label>
          <select id="bg-fit" className={input} value={page.background.fit} onChange={(event) => set((target) => { if (target.background.type === "image") target.background.fit = event.target.value as "contain" | "cover" | "fill"; })}>
            <option value="contain">Contenir</option>
            <option value="cover">Couvrir</option>
            <option value="fill">Étirer</option>
          </select>
          <div className="mt-2">
            <ColorField id="page-color-behind" label="Couleur derrière l'image" value={page.background.color} onChange={(value) => set((target) => { if (target.background.type === "image") target.background.color = value; }, false)} />
          </div>
        </div>
      ) : null}
      <label className={label} htmlFor="page-pattern">Motif</label>
      <select id="page-pattern" className={input} value={page.pattern ?? "none"} onChange={(event) => set((target) => { target.pattern = event.target.value as BackgroundPattern; })}>
        <option value="none">Aucun</option>
        <option value="dots">Points</option>
        <option value="grid">Grille</option>
        <option value="lines">Lignes</option>
      </select>
      <button
        type="button"
        className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-700 hover:border-[#285d68] hover:bg-[#e8f3f1]"
        onClick={() => update((doc) => {
          const source = doc.pages.find((candidate) => candidate.id === pageId);
          if (!source) return;
          const background: PageBackground = JSON.parse(JSON.stringify(source.background));
          for (const target of doc.pages) {
            target.background = JSON.parse(JSON.stringify(background));
            target.pattern = source.pattern;
          }
        })}
      >
        Appliquer ce fond à toutes les pages
      </button>
      <div className="mt-3">
        <Toggle checked={page.hiddenFromNavigation} onChange={(value) => set((target) => { target.hiddenFromNavigation = value; })}>Cachée du menu des pages</Toggle>
      </div>
      <p className={small}>Une page cachée reste accessible par une action « Aller à la page ». Ce n&apos;est pas une protection.</p>
      <label className={label} htmlFor="page-notes">Notes enseignant (privées)</label>
      <textarea id="page-notes" className={`${input} min-h-20`} value={page.notes} onChange={(event) => set((target) => { target.notes = event.target.value; })} />
    </section>
  );
}

function DocumentSettings({ document }: { document: StudioDocument }) {
  const update = useStudioEditorStore((state) => state.update);
  const set = (mutator: (doc: StudioDocument) => void) => update(mutator);
  return (
    <section className="mt-6 border-t border-[#d8d5ca] pt-2">
      <h2 className="mt-2 text-xs font-black uppercase tracking-wide text-slate-500">Leçon</h2>
      <label className={label} htmlFor="doc-level">Niveau</label>
      <select id="doc-level" className={input} value={document.level ?? ""} onChange={(event) => set((doc) => { doc.level = (event.target.value || null) as StudioLevel | null; })}>
        <option value="">—</option>
        {STUDIO_LEVELS.map((level) => <option key={level} value={level}>{level}</option>)}
      </select>
      <label className={label} htmlFor="doc-nav">Navigation</label>
      <select id="doc-nav" className={input} value={document.settings.navigationMode} onChange={(event) => set((doc) => { doc.settings.navigationMode = event.target.value as "linear" | "exploration"; })}>
        <option value="linear">Linéaire (Précédent / Suivant)</option>
        <option value="exploration">Exploration (liens et menu des pages)</option>
      </select>
      <div className="mt-3">
        <Toggle checked={document.settings.showInteractiveHints} onChange={(value) => set((doc) => { doc.settings.showInteractiveHints = value; })}>Indices animés activés par défaut</Toggle>
      </div>
      <label className={label} htmlFor="doc-instructions">Consigne affichée au départ</label>
      <textarea id="doc-instructions" className={`${input} min-h-20`} value={document.settings.instructions} onChange={(event) => set((doc) => { doc.settings.instructions = event.target.value; })} />
      <label className={label} htmlFor="doc-completion">Message de fin</label>
      <input id="doc-completion" className={input} value={document.settings.completionMessage} onChange={(event) => set((doc) => { doc.settings.completionMessage = event.target.value; })} />
    </section>
  );
}

// ---------------------------------------------------------------------------
// Small controls
// ---------------------------------------------------------------------------

function Toggle({ checked, onChange, children }: { checked: boolean; onChange: (value: boolean) => void; children: ReactNode }) {
  return (
    <label className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border px-2 py-1 text-xs font-bold ${checked ? "border-[#285d68] bg-[#e8f3f1] text-[#285d68]" : "border-slate-300 text-slate-600"}`}>
      <input type="checkbox" className="accent-[#285d68]" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      {children}
    </label>
  );
}

function ColorField({ id, label: title, value, onChange, allowNone = false }: { id: string; label: string; value: string; onChange: (value: string) => void; allowNone?: boolean }) {
  const isHex = /^#[0-9a-fA-F]{6}$/.test(value);
  return (
    <div>
      <label className="field-label" htmlFor={id}>{title}</label>
      <div className="mt-1 flex items-center gap-1">
        <input id={id} type="color" className="h-9 w-10 cursor-pointer rounded border border-slate-300 bg-white p-0.5" value={isHex ? value : "#ffffff"} onChange={(event) => onChange(event.target.value)} />
        <input aria-label={`${title} (code)`} className="teacher-input !mt-0 !px-2 !py-1.5 text-xs" value={value === "transparent" ? "" : value} placeholder={allowNone ? "aucun" : "#000000"} onChange={(event) => onChange(event.target.value.trim())} />
      </div>
    </div>
  );
}
