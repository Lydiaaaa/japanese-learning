
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { ScenarioContent, Language, TargetLanguage, ProgressCallback, VoiceEngine, VocabularyItem, DialogueSection, DialogueLine, ExpressionItem } from "../types";

// Helper to safely get the API Key in both Vite (production) and AI Studio (preview) environments
const getSystemApiKey = () => {
  // 1. Check Vite environment variable
  // @ts-ignore
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_KEY) {
    // @ts-ignore
    return import.meta.env.VITE_API_KEY;
  }
  
  // 2. Check process.env safely (Prevents "process is not defined" error in browsers)
  if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
    return process.env.API_KEY;
  }

  return undefined;
};

// Map target language codes to full names for Prompting
const LANGUAGE_NAMES: Record<TargetLanguage, string> = {
  zh: 'Mandarin Chinese (Simplified)',
  en: 'English',
  ja: 'Japanese',
  ko: 'Korean',
  es: 'Spanish',
  fr: 'French',
  de: 'German'
};

// ---------------------------------------------------------------------------
// AUDIO SYSTEM OPTIMIZATIONS
// ---------------------------------------------------------------------------

// 1. Singleton AudioContext (prevents cold-start latency)
let audioContext: AudioContext | null = null;

// 2. In-Memory Audio Cache (key: "VoiceName-Text" -> AudioBuffer)
const audioCache = new Map<string, AudioBuffer>();

function getAudioContext(): AudioContext {
  if (!audioContext) {
    const AudioContextStr = window.AudioContext || (window as any).webkitAudioContext;
    // Gemini TTS is 24kHz
    audioContext = new AudioContextStr({ sampleRate: 24000 });
  }
  // Always resume if suspended (browser autoplay policy)
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }
  return audioContext;
}

// Helper: Convert Base64 PCM (Int16) to Float32Audio
function processAudioChunk(base64: string): Float32Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  const dataInt16 = new Int16Array(bytes.buffer);
  const float32Data = new Float32Array(dataInt16.length);
  for (let i = 0; i < dataInt16.length; i++) {
    // Normalize Int16 to Float32 [-1.0, 1.0]
    float32Data[i] = dataInt16[i] / 32768.0;
  }
  return float32Data;
}

// Helper to get AI instance with dynamic key
const getAiInstance = (customKey?: string) => {
  const key = customKey || getSystemApiKey();
  if (!key) throw new Error("API Key is missing! Please check your configuration.");
  return new GoogleGenAI({ apiKey: key });
};

// Helper: Log Token Usage
const logTokenUsage = (label: string, response: any) => {
  if (response?.usageMetadata) {
    const { promptTokenCount, candidatesTokenCount, totalTokenCount } = response.usageMetadata;
    console.groupCollapsed(`[Gemini Cost] ${label}`);
    console.log(`Input Tokens: ${promptTokenCount}`);
    console.log(`Output Tokens: ${candidatesTokenCount}`);
    console.log(`Total Tokens: ${totalTokenCount}`);
    console.groupEnd();
  }
};

// ---------------------------------------------------------------------------
// ROBUST PARSING HELPERS
// ---------------------------------------------------------------------------

// 1. Clean Markdown from JSON string
const cleanJsonText = (text: string): string => {
  let cleaned = text.trim();
  // Remove markdown code blocks if present
  if (cleaned.includes('```')) {
     const match = cleaned.match(/```(?:json)?([\s\S]*?)```/);
     if (match && match[1]) {
       cleaned = match[1].trim();
     }
  }
  return cleaned;
};

// 2. Recursively find an array that looks like dialogue lines
const findDialogueLines = (obj: any): any[] | null => {
  if (!obj || typeof obj !== 'object') return null;

  // If the object itself is an array, check if it looks like lines
  if (Array.isArray(obj)) {
    if (obj.length > 0 && (obj[0].speaker || obj[0].japanese || obj[0].text)) {
      return obj;
    }
    return null; 
  }

  // Check common keys first
  if (Array.isArray(obj.lines)) return obj.lines;
  if (Array.isArray(obj.dialogue)) return obj.dialogue;
  if (Array.isArray(obj.script)) return obj.script;
  if (Array.isArray(obj.conversation)) return obj.conversation;

  // Deep search
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const result = findDialogueLines(obj[key]);
      if (result) return result;
    }
  }

  return null;
};

// 3. Find title recursively
const findTitle = (obj: any, defaultTitle: string): string => {
  if (!obj || typeof obj !== 'object') return defaultTitle;
  if (typeof obj.title === 'string') return obj.title;
  if (typeof obj.sceneName === 'string') return obj.sceneName;
  
  // Shallow check next level
  for (const key in obj) {
    if (obj[key] && typeof obj[key] === 'object' && typeof obj[key].title === 'string') {
      return obj[key].title;
    }
  }
  return defaultTitle;
};

// --- NEW SPLIT GENERATION FUNCTIONS ---

// STEP 1: Generate Vocabulary, Expressions AND ROLES (FAST)
export const generateVocabularyAndExpressions = async (
  scenario: string, 
  language: Language = 'zh', 
  targetLanguage: TargetLanguage = 'ja',
  customApiKey?: string
): Promise<Partial<ScenarioContent> & { roles?: { user: string, partner: string } }> => {
  const ai = getAiInstance(customApiKey);
  const uiLangName = language === 'zh' ? 'Simplified Chinese' : 'English';
  const targetLangName = LANGUAGE_NAMES[targetLanguage];

  // Logic for Script/Phonetics
  let scriptInstruction = "";
  if (targetLanguage === 'ja') {
      scriptInstruction = "For 'kana', use Hiragana/Katakana. For 'romaji', use Romaji.";
  } else if (targetLanguage === 'zh') {
      scriptInstruction = "For 'kana', return empty string (or Hanzi if appropriate). For 'romaji', use Pinyin.";
  } else if (targetLanguage === 'ko') {
      scriptInstruction = "For 'kana', use Hangul. For 'romaji', use Romanization.";
  } else {
      scriptInstruction = "For 'kana', return empty string. For 'romaji', return empty string (or IPA if useful).";
  }

  // --- SUB-REQUEST 1: SETUP & VOCABULARY ---
  const vocabPrompt = `
    Analyze the scenario: "${scenario}".
    Target Language to Learn: ${targetLangName}.
    User's Native Language (for meanings): ${uiLangName}.
    
    Task 1: Define the two specific roles for this roleplay conversation.
    - userRole: The learner/protagonist (e.g., "International Student", "Tourist"). Name MUST be in ${uiLangName}.
    - partnerRole: The person they are talking to (e.g., "Waiter", "Doctor"). Name MUST be in ${uiLangName}.
    
    Task 2: Create a study list of 12-15 essential Vocabulary words in ${targetLangName}.
    ${scriptInstruction}
    
    Output strictly in JSON.
  `;

  const vocabSchema = {
    type: Type.OBJECT,
    properties: {
      setup: {
          type: Type.OBJECT,
          properties: {
            userRole: { type: Type.STRING, description: `The user's role name in ${uiLangName}` },
            partnerRole: { type: Type.STRING, description: `The partner's role name in ${uiLangName}` }
          },
          required: ["userRole", "partnerRole"]
      },
      vocabulary: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            term: { type: Type.STRING, description: `Word in ${targetLangName}` },
            kana: { type: Type.STRING },
            romaji: { type: Type.STRING },
            meaning: { 
              type: Type.OBJECT, 
              properties: {
                en: { type: Type.STRING },
                zh: { type: Type.STRING }
              },
              required: ["en", "zh"]
            },
            type: { type: Type.STRING }
          }
        }
      }
    }
  };

  // --- SUB-REQUEST 2: EXPRESSIONS ---
  const expressionPrompt = `
    Context: Learning ${targetLangName} scenario "${scenario}".
    User's Native Language: ${uiLangName}.
    Task: Create a list of 6-8 common useful Expressions/Phrases for this scenario in ${targetLangName}.
    ${scriptInstruction}
    
    Output strictly in JSON.
  `;

  const expressionSchema = {
    type: Type.OBJECT,
    properties: {
      expressions: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            phrase: { type: Type.STRING, description: `Phrase in ${targetLangName}` },
            kana: { type: Type.STRING },
            romaji: { type: Type.STRING },
            meaning: { 
              type: Type.OBJECT, 
              properties: {
                en: { type: Type.STRING },
                zh: { type: Type.STRING }
              },
              required: ["en", "zh"]
            },
            nuance: { type: Type.STRING }
          }
        }
      }
    }
  };

  try {
    const [vocabResponse, exprResponse] = await Promise.all([
      ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: vocabPrompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: vocabSchema,
          thinkingConfig: { thinkingBudget: 0 }
        }
      }),
      ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: expressionPrompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: expressionSchema,
          thinkingConfig: { thinkingBudget: 0 }
        }
      })
    ]);

    logTokenUsage('Vocab Generation', vocabResponse);
    logTokenUsage('Expression Generation', exprResponse);

    let vocabData: any = {};
    let exprData: any = {};

    if (vocabResponse.text) {
      const cleanVocab = cleanJsonText(vocabResponse.text);
      try {
         vocabData = JSON.parse(cleanVocab);
      } catch (e) { console.error("Vocab JSON parse failed", e); }
    }

    if (exprResponse.text) {
      const cleanExpr = cleanJsonText(exprResponse.text);
      try {
         exprData = JSON.parse(cleanExpr);
      } catch (e) { console.error("Expression JSON parse failed", e); }
    }
      
    return {
      scenarioName: scenario,
      vocabulary: vocabData.vocabulary || [],
      expressions: exprData.expressions || [],
      dialogues: [],
      // Return the determined roles to be passed to step 2
      roles: vocabData.setup ? { user: vocabData.setup.userRole, partner: vocabData.setup.partnerRole } : undefined
    };

  } catch (e) {
    console.error("Vocab generation error", e);
  }
  
  // Fallback
  return {
    scenarioName: scenario,
    vocabulary: [],
    expressions: [],
    dialogues: [],
    roles: { user: language === 'zh' ? '我' : 'Me', partner: language === 'zh' ? '对方' : 'Partner' }
  };
};

export const regenerateSection = async (
  scenario: string,
  type: 'vocab' | 'expression',
  language: Language = 'zh',
  targetLanguage: TargetLanguage = 'ja',
  customApiKey?: string
): Promise<(VocabularyItem | ExpressionItem)[]> => {
  const ai = getAiInstance(customApiKey);
  const uiLangName = language === 'zh' ? 'Simplified Chinese' : 'English';
  const targetLangName = LANGUAGE_NAMES[targetLanguage];
  
  const isVocab = type === 'vocab';
  const label = isVocab ? 'vocabulary words' : 'common phrases/expressions';
  const count = isVocab ? 12 : 8; 

  let scriptInstruction = "";
  if (targetLanguage === 'ja') {
      scriptInstruction = "For 'kana', use Hiragana/Katakana. For 'romaji', use Romaji.";
  } else if (targetLanguage === 'zh') {
      scriptInstruction = "For 'kana', use empty string. For 'romaji', use Pinyin.";
  } else if (targetLanguage === 'ko') {
      scriptInstruction = "For 'kana', use Hangul. For 'romaji', use Romanization.";
  } else {
      scriptInstruction = "For 'kana', return empty string. For 'romaji', return empty string.";
  }
  
  const prompt = `
    Context: Learning ${targetLangName} scenario "${scenario}".
    Task: Create a study list of ${count} essential ${label} in ${targetLangName}.
    
    Requirements:
    - Highly relevant to the scenario.
    - Definitions in English and ${uiLangName}.
    ${scriptInstruction}
    
    Output strictly in JSON.
  `;

  // Define Schema based on type
  const vocabSchema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        term: { type: Type.STRING },
        kana: { type: Type.STRING },
        romaji: { type: Type.STRING },
        meaning: { 
          type: Type.OBJECT, 
          properties: {
            en: { type: Type.STRING },
            zh: { type: Type.STRING }
          },
          required: ["en", "zh"]
        },
        type: { type: Type.STRING }
      }
    }
  };

  const exprSchema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        phrase: { type: Type.STRING },
        kana: { type: Type.STRING },
        romaji: { type: Type.STRING },
        meaning: { 
          type: Type.OBJECT, 
          properties: {
            en: { type: Type.STRING },
            zh: { type: Type.STRING }
          },
          required: ["en", "zh"]
        },
        nuance: { type: Type.STRING }
      }
    }
  };

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: isVocab ? vocabSchema : exprSchema,
        thinkingConfig: { thinkingBudget: 0 }
      }
    });

    logTokenUsage(`Regenerate ${type}`, response);

    if (response.text) {
      const cleanText = cleanJsonText(response.text);
      const result = JSON.parse(cleanText);
      return Array.isArray(result) ? result : [];
    }
  } catch (e) {
    console.error(`Regenerate ${type} error`, e);
  }

  return [];
};


export const generateMoreItems = async (
  scenario: string,
  type: 'vocab' | 'expression',
  existingItems: string[],
  language: Language = 'zh',
  targetLanguage: TargetLanguage = 'ja',
  customApiKey?: string
): Promise<(VocabularyItem | ExpressionItem)[]> => {
  const ai = getAiInstance(customApiKey);
  const targetLangName = LANGUAGE_NAMES[targetLanguage];
  const uiLangName = language === 'zh' ? 'Simplified Chinese' : 'English';
  
  const isVocab = type === 'vocab';
  const label = isVocab ? 'vocabulary words' : 'common phrases/expressions';
  const count = isVocab ? 10 : 5;
  
  // To keep prompt short, only send last 30 existing items if list is huge
  const excludeList = existingItems.slice(-30).join('", "');

  let scriptInstruction = "";
  if (targetLanguage === 'ja') {
      scriptInstruction = "For 'kana', use Hiragana/Katakana. For 'romaji', use Romaji.";
  } else if (targetLanguage === 'zh') {
      scriptInstruction = "For 'kana', use empty string. For 'romaji', use Pinyin.";
  } else if (targetLanguage === 'ko') {
      scriptInstruction = "For 'kana', use Hangul. For 'romaji', use Romanization.";
  } else {
      scriptInstruction = "For 'kana', return empty string. For 'romaji', return empty string.";
  }

  const prompt = `
    Context: Learning ${targetLangName} scenario "${scenario}".
    Task: Generate ${count} NEW ${label} related to this scenario in ${targetLangName}.
    User's Native Language: ${uiLangName}.
    
    CRITICAL CONSTRAINT: 
    - DO NOT include these items already generated: "${excludeList}".
    - Provide strictly unique, new items.
    ${scriptInstruction}
    
    Output strictly in JSON.
  `;

  // Define Schema based on type
  const vocabSchema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        term: { type: Type.STRING },
        kana: { type: Type.STRING },
        romaji: { type: Type.STRING },
        meaning: { 
          type: Type.OBJECT, 
          properties: {
            en: { type: Type.STRING },
            zh: { type: Type.STRING }
          },
          required: ["en", "zh"]
        },
        type: { type: Type.STRING }
      }
    }
  };

  const exprSchema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        phrase: { type: Type.STRING },
        kana: { type: Type.STRING },
        romaji: { type: Type.STRING },
        meaning: { 
          type: Type.OBJECT, 
          properties: {
            en: { type: Type.STRING },
            zh: { type: Type.STRING }
          },
          required: ["en", "zh"]
        },
        nuance: { type: Type.STRING }
      }
    }
  };

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: isVocab ? vocabSchema : exprSchema,
        thinkingConfig: { thinkingBudget: 0 }
      }
    });

    logTokenUsage(`Generate More ${type}`, response);

    if (response.text) {
      const cleanText = cleanJsonText(response.text);
      const result = JSON.parse(cleanText);
      return Array.isArray(result) ? result : [];
    }
  } catch (e) {
    console.error(`Generate more ${type} error`, e);
  }

  return [];
};

// INTERNAL HELPER: Generate a SINGLE scene with Retry & Timeout logic
const generateSingleScene = async (
  scenario: string,
  sceneIndex: number, // 1, 2, or 3
  sceneType: string, // "Intro", "Process", "Conclusion" OR "Custom"
  contextVocab: string,
  roles: { user: string, partner: string },
  language: Language,
  targetLanguage: TargetLanguage,
  customApiKey?: string,
  attempt: number = 1,
  customPrompt?: string // For custom scenes
): Promise<DialogueSection> => {
  const ai = getAiInstance(customApiKey);

  let goalInstruction = "";
  if (sceneType === "Custom" && customPrompt) {
      goalInstruction = `Custom Scene Goal: ${customPrompt}. Write a conversation focusing on this specific topic within the larger scenario.`;
  } else {
      goalInstruction = {
        1: "Scene 1: Opening. Establish the goal.",
        2: "Scene 2: Interaction. Details/complication.",
        3: "Scene 3: Closing. Completion/Farewell. NO trailing questions."
      }[sceneIndex] || "";
  }

  const uiLangName = language === 'zh' ? "Simplified Chinese" : "English";
  const targetLangName = LANGUAGE_NAMES[targetLanguage];

  let scriptInstruction = "";
  if (targetLanguage === 'ja') {
      scriptInstruction = "For 'kana', use Hiragana/Katakana. For 'romaji', use Romaji.";
  } else if (targetLanguage === 'zh') {
      scriptInstruction = "For 'kana', return empty string. For 'romaji', use Pinyin.";
  } else if (targetLanguage === 'ko') {
      scriptInstruction = "For 'kana', use Hangul. For 'romaji', use Romanization.";
  } else {
      scriptInstruction = "For 'kana', return empty string. For 'romaji', return empty string.";
  }

  // Strict instructions for consistency
  const prompt = `
    Write a Dialogue Scene for: "${scenario}".
    Type: ${sceneType}.
    Goal: ${goalInstruction}.
    Context: ${contextVocab}.
    Target Language: ${targetLangName}.
    
    DEFINED ROLES (STRICTLY ENFORCE):
    - Speaker A (User/Protagonist): "${roles.user}"
    - Speaker B (Partner/Native): "${roles.partner}"
    
    Output strictly valid JSON (No Markdown).
    
    CRITICAL RULES:
    1. "title": Short, specific title for this scene in ${uiLangName}. DO NOT include the scenario name "${scenario}" in the title.
    2. "lines": Array of dialogue turns.
    3. "speaker": MUST be strictly "A" or "B". 
    4. "roleName":
       - If speaker is "A", set roleName to "${roles.user}".
       - If speaker is "B", set roleName to "${roles.partner}".
    5. "japanese": The dialogue text in ${targetLangName} (using standard script).
    6. "translation": Translate meaning to ${uiLangName}.
    ${scriptInstruction}

    Structure:
    {
      "title": "Title in ${uiLangName}",
      "lines": [
        {
          "speaker": "A",
          "roleName": "${roles.user}",
          "japanese": "...",
          "kana": "...",
          "romaji": "...",
          "translation": { "en": "...", "zh": "..." }
        }
      ]
    }

    Requirements:
    - 4-6 concise dialogue turns.
    - Natural spoken style in ${targetLangName}.
  `;

  try {
    // Timeout 50s
    const TIMEOUT_MS = 50000; 

    const fetchPromise = ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        thinkingConfig: { thinkingBudget: 0 }
      }
    });

    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error("Timeout")), TIMEOUT_MS)
    );

    const response = await Promise.race([fetchPromise, timeoutPromise]);

    if (response.text) {
      logTokenUsage(`Scene ${sceneIndex} (${sceneType})`, response);

      const cleanText = cleanJsonText(response.text);
      let parsed: any;
      
      try {
        parsed = JSON.parse(cleanText);
      } catch (e) {
        console.warn(`JSON Parse failed for Scene ${sceneIndex}:`, cleanText.substring(0, 100));
        throw new Error("Invalid JSON structure");
      }
      
      // Robust Parsing: recursively search for lines
      const lines = findDialogueLines(parsed);
      let title = findTitle(parsed, sceneType === "Custom" ? "Custom Scene" : `Scene ${sceneIndex}`);

      if (!lines) {
         console.warn("Parsed object missing lines array:", parsed);
         throw new Error("Response format missing dialogue lines");
      }

      // --- TITLE CLEANING LOGIC ---
      try {
        const scenarioNamePattern = new RegExp(`^${scenario.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*[:\\-]?\\s*`, 'i');
        title = title.replace(scenarioNamePattern, '');
        title = title.replace(/^(Scene|场景)\s*\d+\s*[:\\-]?\s*/i, '');
      } catch (err) {
        // Fallback
      }
      
      // Sanitize lines to match interface and enforce UI alignment
      const sanitizedLines: DialogueLine[] = lines.map((l: any) => {
          // Normalize speaker to strictly A or B
          let cleanSpeaker: 'A' | 'B' = 'A';
          if (l.speaker === 'B' || l.speaker === 'b') cleanSpeaker = 'B';
          
          // Fallback heuristic if Model fails strict A/B (rare now with prompt fix)
          if (!l.speaker) {
             const r = (l.roleName || '').toLowerCase();
             // Check if role name matches the user role defined
             if (r === roles.user.toLowerCase() || r.includes('me') || r.includes('user') || r.includes('我')) {
                 cleanSpeaker = 'A';
             } else {
                 cleanSpeaker = 'B';
             }
          }

          return {
            speaker: cleanSpeaker,
            // Force the consistent role name from params, ignore hallucinations if any
            roleName: cleanSpeaker === 'A' ? roles.user : roles.partner,
            japanese: l.japanese || l.text || '...',
            kana: l.kana || '',
            romaji: l.romaji || '',
            translation: l.translation || { en: '', zh: '' }
          };
      });

      return {
          title,
          lines: sanitizedLines
      };
    }
    throw new Error("Empty response body");

  } catch (error) {
    console.warn(`Scene ${sceneIndex} attempt ${attempt} failed:`, error);
    if (attempt < 2) {
      // Retry once with backoff
      await new Promise(r => setTimeout(r, 2000));
      return generateSingleScene(scenario, sceneIndex, sceneType, contextVocab, roles, language, targetLanguage, customApiKey, attempt + 1, customPrompt);
    }
    
    // FALLBACK OBJECT
    return {
      title: sceneType === "Custom" ? "Custom Scene (Unavailable)" : `Scene ${sceneIndex} (Unavailable)`,
      lines: [{
        speaker: "B",
        roleName: roles.partner || "System",
        japanese: targetLanguage === 'ja' ? "申し訳ありません。生成に時間がかかりすぎました。" : "Sorry, generation timed out.",
        kana: "",
        romaji: "",
        translation: { 
            en: "Sorry, generation timed out. Please try again.", 
            zh: "抱歉，生成超时。请尝试重新生成。" 
        }
      }]
    };
  }
};

// --- NEW EXPORTED WRAPPER FOR SINGLE SCENE REGENERATION ---
export const regenerateSingleDialogue = async (
  scenario: string,
  sceneIndex: number, // 0, 1, or 2 (0-based)
  contextVocabulary: VocabularyItem[], 
  roles: { user: string, partner: string },
  language: Language = 'zh', 
  targetLanguage: TargetLanguage = 'ja',
  customApiKey?: string
): Promise<DialogueSection> => {
    
    // Convert 0-based index to 1-based Logic
    const index = sceneIndex + 1;
    const type = index === 1 ? "Intro" : (index === 2 ? "Process" : (index === 3 ? "Conclusion" : "Custom"));
    
    const vocabList = contextVocabulary.slice(0, 8).map(v => v.term).join(", ");

    return await generateSingleScene(
        scenario, 
        index, 
        type, 
        vocabList, 
        roles, 
        language, 
        targetLanguage,
        customApiKey
    );
};

// --- NEW EXPORTED WRAPPER FOR CUSTOM SCENE GENERATION ---
export const generateCustomScene = async (
  scenario: string,
  userPrompt: string,
  contextVocabulary: VocabularyItem[], 
  roles: { user: string, partner: string },
  language: Language = 'zh', 
  targetLanguage: TargetLanguage = 'ja',
  customApiKey?: string
): Promise<DialogueSection> => {
    
    const vocabList = contextVocabulary.slice(0, 8).map(v => v.term).join(", ");

    // sceneIndex 99 to indicate custom
    return await generateSingleScene(
        scenario, 
        99, 
        "Custom", 
        vocabList, 
        roles, 
        language, 
        targetLanguage,
        customApiKey,
        1,
        userPrompt
    );
};


// ... existing generateDialoguesWithCallback ...
// STEP 2: Generate Dialogues (OPTIMIZED: INCREMENTAL STREAMING)
export const generateDialoguesWithCallback = async (
  scenario: string, 
  contextVocabulary: VocabularyItem[], 
  roles: { user: string, partner: string },
  onSceneComplete: (index: number, scene: DialogueSection) => void,
  language: Language = 'zh', 
  targetLanguage: TargetLanguage = 'ja',
  customApiKey?: string
): Promise<void> => {
  
  const vocabList = contextVocabulary.slice(0, 8).map(v => v.term).join(", ");

  // Fire requests. We do NOT await Promise.all here because we want to trigger callbacks individually.
  
  const p1 = generateSingleScene(scenario, 1, "Intro", vocabList, roles, language, targetLanguage, customApiKey)
    .then(scene => onSceneComplete(0, scene));
    
  const p2 = generateSingleScene(scenario, 2, "Process", vocabList, roles, language, targetLanguage, customApiKey)
    .then(scene => onSceneComplete(1, scene));
    
  const p3 = generateSingleScene(scenario, 3, "Conclusion", vocabList, roles, language, targetLanguage, customApiKey)
    .then(scene => onSceneComplete(2, scene));

  await Promise.all([p1, p2, p3]);
};


// ... existing audio functions ...
// Retrieve AudioBuffer for text (from Cache or Network)
export const getAudioBuffer = async (text: string, voiceName: string, customApiKey?: string): Promise<AudioBuffer> => {
  const ai = getAiInstance(customApiKey);
  const ctx = getAudioContext();
  const cacheKey = `${voiceName}-${text}`;

  if (audioCache.has(cacheKey)) {
    return audioCache.get(cacheKey)!;
  }

  // Fetch from API
  const responseStream = await ai.models.generateContentStream({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName }
        },
      },
    },
  });

  const collectedChunks: Float32Array[] = [];
  let totalLength = 0;

  for await (const chunk of responseStream) {
    const base64Audio = chunk.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      const float32Data = processAudioChunk(base64Audio);
      collectedChunks.push(float32Data);
      totalLength += float32Data.length;
    }
  }

  const fullBuffer = ctx.createBuffer(1, totalLength, 24000);
  const channelData = fullBuffer.getChannelData(0);
  let offset = 0;
  for (const chunk of collectedChunks) {
    // cast chunk to any to bypass strict ArrayBuffer checks in some build environments
    channelData.set(chunk as any, offset);
    offset += chunk.length;
  }
  
  audioCache.set(cacheKey, fullBuffer);
  return fullBuffer;
};

// Generate Dialogue Audio with Concurrency Control and Progress Reporting
export const generateDialogueAudioWithProgress = async (
    lines: {text: string, speaker: string}[],
    onProgress?: ProgressCallback,
    customApiKey?: string
): Promise<Blob> => {
   const ctx = getAudioContext();
   const buffers: AudioBuffer[] = [];
   
   // BATCH PROCESSING
   const BATCH_SIZE = 3;
   
   for (let i = 0; i < lines.length; i += BATCH_SIZE) {
       const batch = lines.slice(i, i + BATCH_SIZE);
       
       const batchPromises = batch.map(async (line, batchIdx) => {
           // For simple multilingual support, we reuse Puck/Kore as generic male/female voices
           const voice = line.speaker === 'A' ? 'Puck' : 'Kore';
           let attempts = 0;
           while (attempts < 3) {
             try {
               return await getAudioBuffer(line.text, voice, customApiKey);
             } catch (e) {
               attempts++;
               await new Promise(r => setTimeout(r, 500 * attempts));
               if (attempts === 3) throw e;
             }
           }
           throw new Error("Failed to fetch audio");
       });

       const batchBuffers = await Promise.all(batchPromises);
       buffers.push(...batchBuffers);
       
       if (onProgress) {
           onProgress(Math.min(i + BATCH_SIZE, lines.length), lines.length);
       }
       await new Promise(r => setTimeout(r, 0));
   }

   const gapSeconds = 0.5;
   const gapSamples = Math.floor(gapSeconds * 24000);
   const totalLength = buffers.reduce((acc, buf) => acc + buf.length + gapSamples, 0);

   const outputBuffer = ctx.createBuffer(1, totalLength, 24000);
   const outputData = outputBuffer.getChannelData(0);
   
   let offset = 0;
   for (const buf of buffers) {
     outputData.set(buf.getChannelData(0) as any, offset);
     offset += buf.length + gapSamples;
   }

   return encodeWAV(outputData, 24000);
};

// Native Browser TTS (Fast & Free)
export const playSystemTTS = (text: string, langCode: string = 'ja-JP'): Promise<void> => {
    return new Promise((resolve) => {
        if (!window.speechSynthesis) {
            console.error("Web Speech API not supported");
            resolve();
            return;
        }

        // Cancel previous utterances
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        // Map target language code to TTS locale
        let locale = 'ja-JP';
        switch(langCode) {
            case 'en': locale = 'en-US'; break;
            case 'zh': locale = 'zh-CN'; break;
            case 'ko': locale = 'ko-KR'; break;
            case 'es': locale = 'es-ES'; break;
            case 'fr': locale = 'fr-FR'; break;
            case 'de': locale = 'de-DE'; break;
            default: locale = 'ja-JP';
        }
        utterance.lang = locale;
        utterance.rate = 1.0; 
        
        // Try to find a voice for this language
        const voices = window.speechSynthesis.getVoices();
        const targetVoice = voices.find(v => v.lang.includes(langCode) || v.lang.includes(locale));
        if (targetVoice) {
            utterance.voice = targetVoice;
        }

        utterance.onend = () => {
            resolve();
        };

        utterance.onerror = (e) => {
            console.error("System TTS Error", e);
            resolve(); // Resolve anyway to reset UI state
        };

        window.speechSynthesis.speak(utterance);
    });
};

// Unified Play TTS function
export const playTTS = async (
  text: string, 
  voiceName: 'Puck' | 'Kore' = 'Puck', 
  engine: VoiceEngine = 'system',
  customApiKey?: string,
  targetLanguage: TargetLanguage = 'ja'
): Promise<void> => {
  // If engine is system, use native browser TTS
  if (engine === 'system') {
    return playSystemTTS(text, targetLanguage);
  }

  // Otherwise, use Gemini AI
  const ai = getAiInstance(customApiKey);
  const ctx = getAudioContext();
  const cacheKey = `${voiceName}-${text}`;

  if (audioCache.has(cacheKey)) {
    const buffer = audioCache.get(cacheKey)!;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start();
    return;
  }

  try {
    const responseStream = await ai.models.generateContentStream({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName }
          },
        },
      },
    });

    let nextStartTime = ctx.currentTime;
    const collectedChunks: Float32Array[] = [];
    let totalLength = 0;

    for await (const chunk of responseStream) {
      const base64Audio = chunk.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      
      if (base64Audio) {
        const float32Data = processAudioChunk(base64Audio);
        collectedChunks.push(float32Data);
        totalLength += float32Data.length;

        const buffer = ctx.createBuffer(1, float32Data.length, 24000);
        buffer.copyToChannel(float32Data as any, 0);

        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);

        const startAt = Math.max(ctx.currentTime, nextStartTime);
        source.start(startAt);
        nextStartTime = startAt + buffer.duration;
      }
    }

    if (totalLength > 0) {
      const fullBuffer = ctx.createBuffer(1, totalLength, 24000);
      const channelData = fullBuffer.getChannelData(0);
      let offset = 0;
      for (const chunk of collectedChunks) {
        // cast to any to fix ts build error
        channelData.set(chunk as any, offset);
        offset += chunk.length;
      }
      audioCache.set(cacheKey, fullBuffer);
    }

  } catch (err) {
    console.error("TTS Streaming Error:", err);
    throw err;
  }
};

// WAV Encoder helper
function encodeWAV(samples: Float32Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  const writeString = (view: DataView, offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, 'data');
  view.setUint32(40, samples.length * 2, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }

  return new Blob([view], { type: 'audio/wav' });
}
