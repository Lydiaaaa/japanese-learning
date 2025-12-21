
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { ScenarioContent, Language, LearningLanguage, ProgressCallback, VoiceEngine, VocabularyItem, DialogueSection, DialogueLine, ExpressionItem } from "../types";
import { LEARNING_LANGUAGES } from "../constants";

// Manual decoding helper as per Gemini API guidelines for raw PCM data
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Manual audio buffer creation from raw PCM bytes
async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

// ---------------------------------------------------------------------------
// AUDIO SYSTEM CONFIGURATION
// ---------------------------------------------------------------------------

let audioContext: AudioContext | null = null;
const audioCache = new Map<string, AudioBuffer>();

function getAudioContext(): AudioContext {
  if (!audioContext) {
    const AudioContextStr = window.AudioContext || (window as any).webkitAudioContext;
    audioContext = new AudioContextStr({ sampleRate: 24000 });
  }
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }
  return audioContext;
}

// Clean JSON text returned by the model if wrapped in markdown code blocks
const cleanJsonText = (text: string): string => {
  let cleaned = text.trim();
  if (cleaned.includes('```')) {
     const match = cleaned.match(/```(?:json)?([\s\S]*?)```/);
     if (match && match[1]) {
       cleaned = match[1].trim();
     }
  }
  return cleaned;
};

// Response data extractors
const findDialogueLines = (obj: any): any[] | null => {
  if (!obj || typeof obj !== 'object') return null;
  if (Array.isArray(obj)) {
    if (obj.length > 0 && (obj[0].speaker || obj[0].japanese || obj[0].text)) return obj;
    return null; 
  }
  if (Array.isArray(obj.lines)) return obj.lines;
  if (Array.isArray(obj.dialogue)) return obj.dialogue;
  for (const key in obj) {
    const result = findDialogueLines(obj[key]);
    if (result) return result;
  }
  return null;
};

const findTitle = (obj: any, defaultTitle: string): string => {
  if (!obj || typeof obj !== 'object') return defaultTitle;
  if (typeof obj.title === 'string') return obj.title;
  if (typeof obj.sceneName === 'string') return obj.sceneName;
  return defaultTitle;
};

// --- SCENARIO GENERATION ---

export const generateVocabularyAndExpressions = async (
  scenario: string, 
  targetLang: LearningLanguage = 'ja',
  uiLang: Language = 'zh'
): Promise<Partial<ScenarioContent> & { roles?: { user: string, partner: string } }> => {
  // Use process.env.API_KEY directly as per guidelines
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const targetLangName = LEARNING_LANGUAGES.find(l => l.id === targetLang)?.name.en || 'Japanese';
  const uiLangName = uiLang === 'zh' ? 'Simplified Chinese' : 'English';

  const vocabPrompt = `
    Analyze the scenario: "${scenario}" in the context of learning ${targetLangName}.
    
    Task 1: Define two specific roles for a conversation.
    - userRole: The learner (e.g., "International Student", "Tourist"). Name MUST be in ${uiLangName}.
    - partnerRole: The person they are talking to. Name MUST be in ${uiLangName}.
    
    Task 2: Create a ${targetLangName} language study list of 12-15 essential Vocabulary words.
    - IMPORTANT: Include phonetic reading (like Pinyin for Chinese, Romaji for Japanese) in the 'romaji' field.
    
    Output strictly in JSON.
  `;

  const vocabSchema = {
    type: Type.OBJECT,
    properties: {
      setup: {
          type: Type.OBJECT,
          properties: {
            userRole: { type: Type.STRING },
            partnerRole: { type: Type.STRING }
          },
          required: ["userRole", "partnerRole"]
      },
      vocabulary: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            term: { type: Type.STRING },
            kana: { type: Type.STRING, description: "Phonetic script like Kana or Pinyin" },
            romaji: { type: Type.STRING, description: "Romanized reading" },
            meaning: { 
              type: Type.OBJECT, 
              properties: { en: { type: Type.STRING }, zh: { type: Type.STRING } },
              required: ["en", "zh"]
            },
            type: { type: Type.STRING }
          }
        }
      }
    }
  };

  const expressionPrompt = `
    Context: Learning ${targetLangName} for scenario "${scenario}".
    Task: Create 6-8 common useful Expressions/Phrases.
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
            phrase: { type: Type.STRING },
            kana: { type: Type.STRING },
            romaji: { type: Type.STRING },
            meaning: { 
              type: Type.OBJECT, 
              properties: { en: { type: Type.STRING }, zh: { type: Type.STRING } },
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
        config: { responseMimeType: "application/json", responseSchema: vocabSchema }
      }),
      ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: expressionPrompt,
        config: { responseMimeType: "application/json", responseSchema: expressionSchema }
      })
    ]);

    let vocabData: any = {};
    let exprData: any = {};
    if (vocabResponse.text) vocabData = JSON.parse(cleanJsonText(vocabResponse.text));
    if (exprResponse.text) exprData = JSON.parse(cleanJsonText(exprResponse.text));
      
    return {
      scenarioName: scenario,
      targetLanguage: targetLang,
      vocabulary: vocabData.vocabulary || [],
      expressions: exprData.expressions || [],
      dialogues: [],
      roles: vocabData.setup ? { user: vocabData.setup.userRole, partner: vocabData.setup.partnerRole } : undefined
    };
  } catch (e) {
    console.error(e);
    return { scenarioName: scenario, targetLanguage: targetLang, vocabulary: [], expressions: [], dialogues: [] };
  }
};

export const regenerateSection = async (
  scenario: string,
  targetLang: LearningLanguage,
  type: 'vocab' | 'expression',
  uiLang: Language = 'zh'
): Promise<(VocabularyItem | ExpressionItem)[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const targetLangName = LEARNING_LANGUAGES.find(l => l.id === targetLang)?.name.en || 'Japanese';
  
  const isVocab = type === 'vocab';
  const count = isVocab ? 12 : 8; 
  const prompt = `Learning ${targetLangName} scenario: "${scenario}". Generate ${count} ${isVocab ? 'words' : 'expressions'}. Output JSON.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });
    if (response.text) {
      const result = JSON.parse(cleanJsonText(response.text));
      return Array.isArray(result) ? result : (result.vocabulary || result.expressions || []);
    }
  } catch (e) { console.error(e); }
  return [];
};

export const generateMoreItems = async (
  scenario: string,
  targetLang: LearningLanguage,
  type: 'vocab' | 'expression',
  existingItems: string[]
): Promise<(VocabularyItem | ExpressionItem)[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const targetLangName = LEARNING_LANGUAGES.find(l => l.id === targetLang)?.name.en || 'Japanese';
  const prompt = `Learning ${targetLangName} scenario: "${scenario}". Generate more items, excluding: ${existingItems.slice(-20).join(', ')}. JSON.`;
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });
    if (response.text) {
      const result = JSON.parse(cleanJsonText(response.text));
      return Array.isArray(result) ? result : (result.vocabulary || result.expressions || []);
    }
  } catch (e) { console.error(e); }
  return [];
};

const generateSingleScene = async (
  scenario: string,
  targetLang: LearningLanguage,
  sceneIndex: number,
  sceneType: string,
  contextVocab: string,
  roles: { user: string, partner: string },
  uiLang: Language,
  attempt: number = 1,
  customPrompt?: string
): Promise<DialogueSection> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const targetLangName = LEARNING_LANGUAGES.find(l => l.id === targetLang)?.name.en || 'Japanese';
  const uiLangName = uiLang === 'zh' ? 'Simplified Chinese' : 'English';

  const goal = customPrompt || (sceneIndex === 1 ? "Opening" : sceneIndex === 2 ? "Interaction" : "Closing");

  const prompt = `
    Write a ${targetLangName} Dialogue for learning.
    Scenario: "${scenario}".
    Scene Type: ${sceneType}. Goal: ${goal}.
    Roles: A (User - "${roles.user}"), B (Partner - "${roles.partner}").
    
    Requirements:
    - Language: Use natural, spoken ${targetLangName}.
    - Include Phonetic readings (Romaji/Pinyin) for ALL lines in 'romaji' and 'kana' fields.
    - Provide translations in English and ${uiLangName}.
    
    Output JSON:
    { "title": "...", "lines": [ { "speaker": "A", "roleName": "...", "japanese": "...", "kana": "...", "romaji": "...", "translation": { "en": "...", "zh": "..." } } ] }
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });

    if (response.text) {
      const parsed = JSON.parse(cleanJsonText(response.text));
      const lines = findDialogueLines(parsed) || [];
      return {
          title: findTitle(parsed, `Scene ${sceneIndex}`),
          lines: lines.map((l: any) => ({
            speaker: l.speaker === 'B' || l.speaker === 'b' ? 'B' : 'A',
            roleName: (l.speaker === 'B' || l.speaker === 'b') ? roles.partner : roles.user,
            japanese: l.japanese || l.text || '...',
            kana: l.kana || '',
            romaji: l.romaji || '',
            translation: l.translation || { en: '', zh: '' }
          }))
      };
    }
    throw new Error("Empty response");
  } catch (error) {
    if (attempt < 2) return generateSingleScene(scenario, targetLang, sceneIndex, sceneType, contextVocab, roles, uiLang, attempt + 1, customPrompt);
    return { title: `Scene ${sceneIndex}`, lines: [] };
  }
};

export const generateDialoguesWithCallback = async (
  scenario: string, 
  targetLang: LearningLanguage,
  contextVocabulary: VocabularyItem[], 
  roles: { user: string, partner: string },
  onSceneComplete: (index: number, scene: DialogueSection) => void,
  uiLang: Language = 'zh'
): Promise<void> => {
  const vocabList = contextVocabulary.slice(0, 8).map(v => v.term).join(", ");
  const p1 = generateSingleScene(scenario, targetLang, 1, "Intro", vocabList, roles, uiLang).then(s => onSceneComplete(0, s));
  const p2 = generateSingleScene(scenario, targetLang, 2, "Process", vocabList, roles, uiLang).then(s => onSceneComplete(1, s));
  const p3 = generateSingleScene(scenario, targetLang, 3, "Conclusion", vocabList, roles, uiLang).then(s => onSceneComplete(2, s));
  await Promise.all([p1, p2, p3]);
};

export const regenerateSingleDialogue = async (
  scenario: string,
  targetLang: LearningLanguage,
  sceneIndex: number,
  contextVocabulary: VocabularyItem[], 
  roles: { user: string, partner: string },
  uiLang: Language = 'zh'
): Promise<DialogueSection> => {
    const vocabList = contextVocabulary.slice(0, 8).map(v => v.term).join(", ");
    return await generateSingleScene(scenario, targetLang, sceneIndex + 1, "Dialogue", vocabList, roles, uiLang);
};

export const generateCustomScene = async (
  scenario: string,
  targetLang: LearningLanguage,
  userPrompt: string,
  contextVocabulary: VocabularyItem[], 
  roles: { user: string, partner: string },
  uiLang: Language = 'zh'
): Promise<DialogueSection> => {
    const vocabList = contextVocabulary.slice(0, 8).map(v => v.term).join(", ");
    return await generateSingleScene(scenario, targetLang, 99, "Custom", vocabList, roles, uiLang, 1, userPrompt);
};

// --- AUDIO FUNCTIONS ---

export const getAudioBuffer = async (text: string, voiceName: string): Promise<AudioBuffer> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const ctx = getAudioContext();
  const cacheKey = `${voiceName}-${text}`;
  if (audioCache.has(cacheKey)) return audioCache.get(cacheKey)!;

  // Use generateContent for speech generation as per single-speaker example
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } },
    },
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64Audio) throw new Error("No audio data returned");

  // Manual decoding logic using the helper defined above
  const audioBuffer = await decodeAudioData(
    decode(base64Audio),
    ctx,
    24000,
    1,
  );

  audioCache.set(cacheKey, audioBuffer);
  return audioBuffer;
};

export const playSystemTTS = (text: string, langCode: string = 'ja-JP'): Promise<void> => {
    return new Promise((resolve) => {
        if (!window.speechSynthesis) { resolve(); return; }
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = langCode;
        utterance.rate = 1.0; 
        const voices = window.speechSynthesis.getVoices();
        const voice = voices.find(v => v.lang === langCode || v.lang.startsWith(langCode.split('-')[0]));
        if (voice) utterance.voice = voice;
        utterance.onend = () => resolve();
        utterance.onerror = () => resolve();
        window.speechSynthesis.speak(utterance);
    });
};

export const playTTS = async (
  text: string, 
  voiceName: 'Puck' | 'Kore' = 'Puck', 
  engine: VoiceEngine = 'system',
  langCode: string = 'ja-JP'
): Promise<void> => {
  if (engine === 'system') return playSystemTTS(text, langCode);
  const ctx = getAudioContext();
  const cacheKey = `${voiceName}-${text}`;
  
  if (audioCache.has(cacheKey)) {
    const source = ctx.createBufferSource();
    source.buffer = audioCache.get(cacheKey)!;
    source.connect(ctx.destination);
    source.start();
    return;
  }
  
  try {
    const buffer = await getAudioBuffer(text, voiceName);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start();
  } catch (err) {
    playSystemTTS(text, langCode);
  }
};

export const generateDialogueAudioWithProgress = async (
    lines: {text: string, speaker: string}[],
    onProgress?: ProgressCallback
): Promise<Blob> => {
   const ctx = getAudioContext();
   const buffers: AudioBuffer[] = [];
   for (let i = 0; i < lines.length; i++) {
       const voice = lines[i].speaker === 'A' ? 'Puck' : 'Kore';
       const buf = await getAudioBuffer(lines[i].text, voice);
       buffers.push(buf);
       if (onProgress) onProgress(i + 1, lines.length);
   }
   const gapSamples = Math.floor(0.5 * 24000);
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

function encodeWAV(samples: Float32Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const writeString = (v: DataView, o: number, s: string) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
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
