/**
 * Curated icon registry for the Studio. Only these icons ship to the player,
 * so the bundle stays small. Names are lucide component names.
 */
import { createElement, type ReactNode } from "react";
import {
  Ambulance, Anchor, Apple, ArrowDown, ArrowLeft, ArrowRight, ArrowUp, ArrowUpRight, Award, Baby, Backpack, BadgeCheck, Banana, Banknote, Bath, Battery, Bed, Beef, Bell, Bike, Bird, Bomb, Bone, Book, BookOpen, Bookmark, Brain, Brush, Bug, Building2, Bus, Cake, Calculator, Calendar, Camera, Car, Carrot, Castle, Cat, Cherry, ChevronLeft, ChevronRight, Church, Clapperboard, ClipboardList, Clock, Cloud, CloudLightning, CloudRain, CloudSun, Coffee, Coins, Compass, CornerDownRight, CreditCard, Crown, Dice5, Dog, Drama, Droplet, Droplets, Ear, Earth, Egg, ExternalLink, Eye, EyeOff, FileText, Film, Fish, Flag, Flame, Flower2, Folder, Footprints, Frown, Gamepad2, Gem, Ghost, Gift, Glasses, Globe, GraduationCap, Grape, Guitar, Hand, Headphones, Heart, HelpCircle, Highlighter, Home, Hospital, Hourglass, House, IceCreamCone, Image, Info, Key, Keyboard, Lamp, Landmark, Laptop, Leaf, Library, Lightbulb, Link, Lock, Mail, Map, MapPin, Medal, Megaphone, Meh, Menu, MessageCircle, MessageSquare, Mic, Milk, Minus, Monitor, Moon, Mountain, Mouse, MoveRight, Music, NotebookPen, Paperclip, PartyPopper, Pause, PawPrint, PenTool, Pencil, Phone, Piano, Pill, Pizza, Plane, Play, Plus, Printer, Puzzle, Rabbit, Radio, Rainbow, Repeat, Rocket, RotateCcw, Ruler, Sailboat, Sandwich, School, Scissors, Search, Settings, Share2, Shell, Shield, Ship, Shirt, ShoppingCart, Skull, Smartphone, Smile, Snail, Snowflake, Sofa, Soup, Sparkles, Speaker, Sprout, Squirrel, Star, Stethoscope, Store, Sun, Sunrise, Sunset, Swords, Syringe, Tag, Target, Tent, Thermometer, ThumbsDown, ThumbsUp, Ticket, Timer, Tractor, Train, TrainFront, TreePine, Trees, Trophy, Turtle, Tv, Umbrella, Undo2, Unlock, Upload, User, Users, Utensils, Video, Volume2, VolumeX, Wand2, Watch, Waves, Wifi, Wind, X, Zap,
  type LucideIcon,
} from "lucide-react";

export interface IconCategory {
  id: string;
  label: string;
  icons: string[];
}

const REGISTRY: Record<string, LucideIcon> = {
  Ambulance, Anchor, Apple, ArrowDown, ArrowLeft, ArrowRight, ArrowUp, ArrowUpRight, Award, Baby, Backpack, BadgeCheck, Banana, Banknote, Bath, Battery, Bed, Beef, Bell, Bike, Bird, Bomb, Bone, Book, BookOpen, Bookmark, Brain, Brush, Bug, Building2, Bus, Cake, Calculator, Calendar, Camera, Car, Carrot, Castle, Cat, Cherry, ChevronLeft, ChevronRight, Church, Clapperboard, ClipboardList, Clock, Cloud, CloudLightning, CloudRain, CloudSun, Coffee, Coins, Compass, CornerDownRight, CreditCard, Crown, Dice5, Dog, Drama, Droplet, Droplets, Ear, Earth, Egg, ExternalLink, Eye, EyeOff, FileText, Film, Fish, Flag, Flame, Flower2, Folder, Footprints, Frown, Gamepad2, Gem, Ghost, Gift, Glasses, Globe, GraduationCap, Grape, Guitar, Hand, Headphones, Heart, HelpCircle, Highlighter, Home, Hospital, Hourglass, House, IceCreamCone, Image, Info, Key, Keyboard, Lamp, Landmark, Laptop, Leaf, Library, Lightbulb, Link, Lock, Mail, Map, MapPin, Medal, Megaphone, Meh, Menu, MessageCircle, MessageSquare, Mic, Milk, Minus, Monitor, Moon, Mountain, Mouse, MoveRight, Music, NotebookPen, Paperclip, PartyPopper, Pause, PawPrint, PenTool, Pencil, Phone, Piano, Pill, Pizza, Plane, Play, Plus, Printer, Puzzle, Rabbit, Radio, Rainbow, Repeat, Rocket, RotateCcw, Ruler, Sailboat, Sandwich, School, Scissors, Search, Settings, Share2, Shell, Shield, Ship, Shirt, ShoppingCart, Skull, Smartphone, Smile, Snail, Snowflake, Sofa, Soup, Sparkles, Speaker, Sprout, Squirrel, Star, Stethoscope, Store, Sun, Sunrise, Sunset, Swords, Syringe, Tag, Target, Tent, Thermometer, ThumbsDown, ThumbsUp, Ticket, Timer, Tractor, Train, TrainFront, TreePine, Trees, Trophy, Turtle, Tv, Umbrella, Undo2, Unlock, Upload, User, Users, Utensils, Video, Volume2, VolumeX, Wand2, Watch, Waves, Wifi, Wind, X, Zap,
};

export const ICON_CATEGORIES: IconCategory[] = [
  { id: "arrows", label: "Flèches et navigation", icons: ["ArrowRight", "ArrowLeft", "ArrowUp", "ArrowDown", "ArrowUpRight", "ChevronRight", "ChevronLeft", "MoveRight", "CornerDownRight", "RotateCcw", "Repeat", "Undo2", "Home", "Menu", "ExternalLink", "Link", "Share2", "Upload"] },
  { id: "ui", label: "Symboles", icons: ["Check", "X", "Plus", "Minus", "Info", "HelpCircle", "Star", "Heart", "ThumbsUp", "ThumbsDown", "Eye", "EyeOff", "Lock", "Unlock", "Search", "Settings", "Flag", "Bell", "Lightbulb", "Zap", "Sparkles", "BadgeCheck", "Tag", "Bookmark", "Shield", "Target"] },
  { id: "school", label: "École", icons: ["BookOpen", "Book", "GraduationCap", "Pencil", "PenTool", "Highlighter", "Ruler", "Calculator", "Backpack", "School", "Library", "NotebookPen", "ClipboardList", "FileText", "Folder", "Scissors", "Paperclip", "Brain", "Puzzle", "Trophy", "Award", "Medal", "Crown", "Gem"] },
  { id: "media", label: "Médias et communication", icons: ["Play", "Pause", "Volume2", "VolumeX", "Headphones", "Music", "Mic", "Speaker", "Radio", "Video", "Camera", "Image", "Film", "Clapperboard", "Tv", "Monitor", "Laptop", "Smartphone", "Keyboard", "Mouse", "Printer", "Wifi", "Battery", "MessageCircle", "MessageSquare", "Mail", "Phone", "Megaphone"] },
  { id: "time", label: "Temps et jeux", icons: ["Clock", "Timer", "Hourglass", "Calendar", "Sunrise", "Sunset", "Gamepad2", "Dice5", "PartyPopper", "Ticket", "Wand2", "Ghost", "Skull", "Bomb", "Swords", "Castle", "Drama"] },
  { id: "people", label: "Personnes et corps", icons: ["User", "Users", "Baby", "Smile", "Meh", "Frown", "Hand", "Ear", "Footprints", "Stethoscope", "Syringe", "Pill", "Thermometer", "Glasses", "Shirt", "Watch"] },
  { id: "nature", label: "Nature et animaux", icons: ["Sun", "Moon", "Cloud", "CloudRain", "CloudSun", "CloudLightning", "Snowflake", "Rainbow", "Umbrella", "Wind", "Mountain", "Waves", "Leaf", "TreePine", "Trees", "Sprout", "Flower2", "Flame", "Droplet", "Droplets", "Earth", "Dog", "Cat", "Bird", "Fish", "Rabbit", "Turtle", "Bug", "Squirrel", "Snail", "Shell", "PawPrint", "Bone", "Egg"] },
  { id: "places", label: "Lieux et transports", icons: ["MapPin", "Map", "Compass", "Globe", "House", "Building2", "Store", "Hospital", "Church", "Landmark", "Tent", "Bed", "Lamp", "Sofa", "Bath", "Plane", "Car", "Bus", "Train", "TrainFront", "Bike", "Ship", "Sailboat", "Anchor", "Rocket", "Tractor", "Ambulance"] },
  { id: "food", label: "Nourriture et objets", icons: ["Apple", "Banana", "Cherry", "Grape", "Carrot", "Pizza", "Sandwich", "Soup", "Beef", "Milk", "Coffee", "Cake", "IceCreamCone", "Utensils", "ShoppingCart", "Gift", "Key", "Banknote", "Coins", "CreditCard", "Brush", "Guitar", "Piano"] },
];

export { ICON_NAMES } from "./iconNames";

export function getIcon(name: string | null | undefined): LucideIcon | null {
  if (!name) return null;
  return REGISTRY[name] ?? null;
}

/** Renders a registry icon by name without creating a component during render. */
export function renderIcon(name: string | null | undefined, props: { size?: number; color?: string; strokeWidth?: number; className?: string } = {}): ReactNode {
  const Icon = getIcon(name);
  return Icon ? createElement(Icon, props) : null;
}

export const FONT_STACKS: Record<"sans" | "serif" | "rounded" | "mono" | "hand" | "display", string> = {
  sans: "Arial, Helvetica, sans-serif",
  serif: "Georgia, 'Times New Roman', serif",
  rounded: "'Arial Rounded MT Bold', 'Nunito', ui-rounded, 'Segoe UI', sans-serif",
  mono: "'Courier New', Courier, monospace",
  hand: "'Bradley Hand', 'Comic Sans MS', 'Segoe Print', 'Chalkboard SE', cursive",
  display: "Impact, 'Arial Black', 'Franklin Gothic Bold', sans-serif",
};

export const FONT_LABELS: Record<keyof typeof FONT_STACKS, string> = {
  sans: "Sans (Arial)",
  serif: "Serif (Georgia)",
  rounded: "Arrondi",
  mono: "Machine à écrire",
  hand: "Manuscrit",
  display: "Affiche (Impact)",
};
