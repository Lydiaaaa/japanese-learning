
export type Language = 'zh' | 'en'; // UI Language
export type LearningLanguage = 'ja' | 'en' | 'zh' | 'fr' | 'es' | 'de'; // Target Language
export type Notation = 'kana' | 'romaji' | 'none';
export type VoiceEngine = 'system' | 'ai';

export type ProgressCallback = (completed: number, total: number) => void;

export interface VocabularyItem {
  term: string;
  kana?: string; // Specific to Japanese/Chinese
  romaji?: string; // Reading/Phonetic
  meaning: string | { en: string; zh: string }; 
  type: string; 
}

export interface ExpressionItem {
  phrase: string;
  kana?: string;
  romaji?: string;
  meaning: string | { en: string; zh: string }; 
  nuance?: string; 
}

export interface DialogueLine {
  speaker: 'A' | 'B';
  roleName?: string; 
  japanese: string; // The text in target language
  kana?: string;
  romaji?: string;
  translation: string | { en: string; zh: string }; 
}

export interface DialogueSection {
  title: string; 
  lines: DialogueLine[];
}

export interface ScenarioContent {
  scenarioName: string;
  targetLanguage: LearningLanguage; // Track which language this was generated for
  vocabulary: VocabularyItem[];
  expressions: ExpressionItem[];
  dialogues: DialogueSection[];
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
  targetLanguage: LearningLanguage;
  content: VocabularyItem | ExpressionItem;
  timestamp: number;
}

export interface ScenarioHistoryItem {
  id: string; 
  name: string;
  targetLanguage: LearningLanguage;
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
