/**
 * Loose types for the JSON document embedded in a Genially HTML export
 * (`window.dataBase64` inside genially.html). Only the fields the importer
 * reads are typed; everything else is ignored.
 */

export interface GeniallyBox {
  Width?: string | number;
  Height?: string | number;
}

export interface GeniallyPosition {
  PositionTop?: string | number;
  PositionLeft?: string | number;
}

export interface GeniallyElementBase {
  Id: string;
  Name?: string | null;
  LayerTitle?: string | null;
  IdSlide: string;
  Size?: GeniallyBox;
  Position?: GeniallyPosition;
  Rotation?: { Rotatione?: string } | null;
  ZIndex?: number;
  BigZIndex?: string;
  Opacity?: string | number;
  IsHidden?: boolean;
  Background?: string | null;
  BackgroundColor?: string | null;
  interactivities?: Record<string, string | string[] | undefined> | null;
}

export interface GeniallyText extends GeniallyElementBase {
  TextMessage?: string;
  Color?: string;
  FontSize?: string;
  Padding?: string;
  BrandStyle?: string;
}

export interface GeniallyImage extends GeniallyElementBase {
  Source?: string;
  Transformations?: { flip?: { x?: boolean; y?: boolean }; innerRotation?: number };
}

export type GeniallyArea = GeniallyElementBase;

export interface GeniallyVideo extends GeniallyElementBase {
  Source?: string;
}

export interface GeniallyRichContent extends GeniallyElementBase {
  Source?: string;
}

export interface GeniallySlide {
  Id: string;
  Name?: string | null;
  Order?: number;
  Popup?: boolean;
  Hidden?: boolean;
  Size?: GeniallyBox;
  Background?: string | null;
  BackgroundColor?: string | null;
  SizeBackground?: GeniallyBox;
  PositionBackground?: GeniallyPosition;
}

export interface GeniallyAction {
  type: string;
  refId?: string;
  target?: { slideId?: string };
  targetSlideId?: string;
  html?: string;
  link?: string;
  source?: string;
  name?: string;
  interactivityActions?: (string | GeniallyAction)[];
  stagedAnimations?: { animations?: { targetItemId?: string }[] };
}

export interface GeniallyData {
  version?: number;
  Genially?: {
    Name?: string;
    Id?: string;
    SettingGenially?: { ShowPage?: boolean };
  };
  DocumentConfig?: { colors?: Record<string, string> };
  Slides?: GeniallySlide[];
  Texts?: GeniallyText[];
  Images?: GeniallyImage[];
  Areas?: GeniallyArea[];
  Videos?: GeniallyVideo[];
  RichContents?: GeniallyRichContent[];
  Audios?: GeniallyElementBase[];
  Svgs?: GeniallyImage[];
  Groups?: GeniallyElementBase[];
  Pins?: GeniallyElementBase[];
  Arrows?: GeniallyElementBase[];
  Charts?: GeniallyElementBase[];
  BaseWidgets?: GeniallyElementBase[];
  Activities?: GeniallyElementBase[];
  interactivityActions?: Record<string, GeniallyAction>;
}
