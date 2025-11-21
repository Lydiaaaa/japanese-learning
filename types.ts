export type Language = 'zh' | 'en';

export interface VocabularyItem {
  term: string;
  kana: string;
  meaning: string;
  type: string; // e.g., Noun, Verb
}

export interface ExpressionItem {
  phrase: string;
  meaning: string;
  nuance?: string; // Casual, Keigo, etc.
}

export interface DialogueLine {
  speaker: 'A' | 'B';
  roleName?: string; // e.g., "Staff", "Customer"
  japanese: string;
  romaji?: string;
  translation: string;
}

export interface DialogueSection {
  title: string; // e.g., "Getting a Queue Number"
  lines: DialogueLine[];
}

export interface ScenarioContent {
  scenarioName: string;
  vocabulary: VocabularyItem[];
  expressions: ExpressionItem[];
  dialogues: DialogueSection[];
}

export interface Category {
  id: string;
  name: {
    en: string;
    zh: string;
  };
  icon: string;
  presets: {
    en: string[];
    zh: string[];
  };
}

export interface SavedItem {
  id: string;
  type: 'vocab' | 'expression';
  content: VocabularyItem | ExpressionItem;
  timestamp: number;
}

export enum ViewState {
  HOME,
  GENERATING,
  STUDY,
  FAVORITES,
  ERROR
}