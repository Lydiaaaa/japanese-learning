
export type Language = 'zh' | 'en';
export type Notation = 'kana' | 'romaji';
export type VoiceEngine = 'system' | 'ai';

export type ProgressCallback = (completed: number, total: number) => void;

export interface VocabularyItem {
  term: string;
  kana: string;
  romaji: string;
  meaning: string | { en: string; zh: string }; 
  type: string; 
}

export interface ExpressionItem {
  phrase: string;
  kana: string;
  romaji: string;
  meaning: string | { en: string; zh: string }; 
  nuance?: string; 
}

export interface DialogueLine {
  speaker: 'A' | 'B';
  roleName?: string; 
  japanese: string;
  kana: string;
  romaji: string;
  translation: string | { en: string; zh: string }; 
}

export interface DialogueSection {
  title: string; 
  lines: DialogueLine[];
}

export interface ScenarioContent {
  scenarioName: string;
  vocabulary: VocabularyItem[];
  expressions: ExpressionItem[];
  dialogues: DialogueSection[];
  // New: Store roles persistantly to ensure custom scenes use the same characters
  roles?: { user: string; partner: string };
  timestamp?: number; 
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

export interface ScenarioHistoryItem {
  id: string; 
  name: string;
  // We keep 'versions' for backward compatibility with existing localstorage data,
  // but the app will now logically treat versions[0] as the single source of truth.
  versions: ScenarioContent[]; 
  lastAccessed: number;
}

export enum ViewState {
  HOME,
  GENERATING,
  STUDY,
  FAVORITES,
  HISTORY,
  ERROR,
  LOADING_SHARE
}
