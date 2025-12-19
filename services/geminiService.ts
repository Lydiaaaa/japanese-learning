
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { ScenarioContent, Language, ProgressCallback, VoiceEngine, VocabularyItem, DialogueSection } from "../types";

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

// --- NEW SPLIT GENERATION FUNCTIONS ---

// STEP 1: Generate Vocabulary and Expressions (FAST)
export const generateVocabularyAndExpressions = async (scenario: string, language: Language = 'zh', customApiKey?: string): Promise<Partial<ScenarioContent>> => {
  const ai = getAiInstance(customApiKey);

  const prompt = `
    Create a Japanese language study list for the scenario: "${scenario}".
    
    Requirements:
    1. Vocabulary: 25-30 essential words. Kana, Romaji, Meanings (English & Simplified Chinese).
    2. Expressions: 10-15 common useful phrases. Kana, Romaji, Meanings (English & Simplified Chinese).
    
    Output strictly in JSON.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          vocabulary: {
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
          },
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
      }
    }
  });

  if (response.text) {
    const result = JSON.parse(response.text) as Partial<ScenarioContent>;
    result.scenarioName = scenario;
    result.dialogues = []; // Initialize empty
    return result;
  }
  throw new Error("Failed to generate vocabulary");
};

// INTERNAL HELPER: Generate a SINGLE scene with Retry & Timeout logic
const generateSingleScene = async (
  scenario: string,
  sceneIndex: number, // 1, 2, or 3
  sceneType: string, // "Intro", "Process", "Conclusion"
  contextVocab: string,
  language: Language,
  customApiKey?: string,
  attempt: number = 1
): Promise<DialogueSection> => {
  const ai = getAiInstance(customApiKey);

  const specificInstructions = {
    1: "Scene 1: Opening. Establish the goal.",
    2: "Scene 2: Interaction. Details/complication.",
    3: "Scene 3: Closing. Completion/Farewell. NO trailing questions."
  }[sceneIndex] || "";

  const titleLanguage = language === 'zh' ? "Simplified Chinese (简体中文)" : "English";

  // More explicit prompt with JSON example to improve model compliance
  const prompt = `
    Write Scene ${sceneIndex}/3 for: "${scenario}".
    Type: ${sceneType}.
    Goal: ${specificInstructions}.
    Context: ${contextVocab}.
    
    Output strictly valid JSON.
    Structure Example:
    {
      "title": "Title in ${titleLanguage}",
      "lines": [
        {
          "speaker": "A",
          "roleName": "Student",
          "japanese": "こんにちは",
          "kana": "こんにちは",
          "romaji": "Konnichiwa",
          "translation": { "en": "Hello", "zh": "你好" }
        }
      ]
    }

    Requirements:
    1. Title MUST be in ${titleLanguage}.
    2. 6-8 dialogue turns.
  `;

  try {
    // Increased timeout to 55 seconds to allow for creative writing latency
    const TIMEOUT_MS = 55000; 

    const fetchPromise = ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: `The title of the scene in ${titleLanguage}` },
            lines: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  speaker: { type: Type.STRING, enum: ["A", "B"] },
                  roleName: { type: Type.STRING },
                  japanese: { type: Type.STRING },
                  kana: { type: Type.STRING },
                  romaji: { type: Type.STRING },
                  translation: { 
                    type: Type.OBJECT, 
                    properties: {
                      en: { type: Type.STRING },
                      zh: { type: Type.STRING }
                    },
                    required: ["en", "zh"]
                  }
                }
              }
            }
          }
        }
      }
    });

    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error("Timeout")), TIMEOUT_MS)
    );

    const response = await Promise.race([fetchPromise, timeoutPromise]);

    if (response.text) {
      let parsed: any;
      try {
        parsed = JSON.parse(response.text);
      } catch (e) {
        throw new Error("Invalid JSON");
      }
      
      // Robust Parsing Logic: Find the lines array wherever it might be
      let lines = parsed.lines;
      let title = parsed.title || `Scene ${sceneIndex}`;

      if (!lines || !Array.isArray(lines)) {
        // Fallback: Check common alternatives key names
        if (Array.isArray(parsed.dialogue)) lines = parsed.dialogue;
        else if (Array.isArray(parsed.script)) lines = parsed.script;
        else if (Array.isArray(parsed.conversation)) lines = parsed.conversation;
        // Fallback: Check if the root object itself is the array
        else if (Array.isArray(parsed)) lines = parsed;
      }

      if (!lines || !Array.isArray(lines)) {
         console.warn("Missing lines in response:", parsed);
         throw new Error("Invalid response format: 'lines' array is missing");
      }
      
      // Sanitize lines to match interface
      const sanitizedLines = lines.map((l: any) => ({
          speaker: l.speaker || 'A',
          roleName: l.roleName || (l.speaker === 'A' ? 'User' : 'Partner'),
          japanese: l.japanese || l.text || '...',
          kana: l.kana || '',
          romaji: l.romaji || '',
          translation: l.translation || { en: '', zh: '' }
      }));

      return {
          title,
          lines: sanitizedLines
      };
    }
    throw new Error("Empty response");

  } catch (error) {
    console.warn(`Scene ${sceneIndex} attempt ${attempt} failed:`, error);
    if (attempt < 2) {
      // Retry once
      return generateSingleScene(scenario, sceneIndex, sceneType, contextVocab, language, customApiKey, attempt + 1);
    }
    
    // FALLBACK OBJECT: Return a valid object so the UI doesn't crash or show "Unavailable"
    // This allows the user to at least see an error message in the dialogue bubble.
    return {
      title: `Scene ${sceneIndex} (Error)`,
      lines: [{
        speaker: "A",
        roleName: "System",
        japanese: "すみません、生成に失敗しました。",
        kana: "すみません、せいせいにしっぱいしました。",
        romaji: "Sumimasen, seisei ni shippai shimashita.",
        translation: { 
            en: "Sorry, generation failed. Please try regenerating.", 
            zh: "抱歉，生成失败。请尝试重新生成。" 
        }
      }]
    };
  }
};

// STEP 2: Generate Dialogues (OPTIMIZED: INCREMENTAL STREAMING)
export const generateDialoguesWithCallback = async (
  scenario: string, 
  contextVocabulary: VocabularyItem[], 
  onSceneComplete: (index: number, scene: DialogueSection) => void,
  language: Language = 'zh', 
  customApiKey?: string
): Promise<void> => {
  
  const vocabList = contextVocabulary.slice(0, 8).map(v => v.term).join(", ");

  // Fire requests. We do NOT await Promise.all here because we want to trigger callbacks individually.
  // However, we track them to ensure the function keeps running.
  
  const p1 = generateSingleScene(scenario, 1, "Intro", vocabList, language, customApiKey)
    .then(scene => onSceneComplete(0, scene));
    
  const p2 = generateSingleScene(scenario, 2, "Process", vocabList, language, customApiKey)
    .then(scene => onSceneComplete(1, scene));
    
  const p3 = generateSingleScene(scenario, 3, "Conclusion", vocabList, language, customApiKey)
    .then(scene => onSceneComplete(2, scene));

  await Promise.all([p1, p2, p3]);
};

// Kept for backward compatibility if needed, but App.tsx should use the callback version now
export const generateDialoguesOnly = async (
  scenario: string, 
  contextVocabulary: VocabularyItem[], 
  language: Language = 'zh', 
  customApiKey?: string
): Promise<DialogueSection[]> => {
    const results: DialogueSection[] = [];
    await generateDialoguesWithCallback(
        scenario, 
        contextVocabulary, 
        (idx, scene) => { results[idx] = scene; },
        language, 
        customApiKey
    );
    return results;
};


// Keep the old full generation function for fallback/regenerate all if needed
export const generateScenarioContent = async (scenario: string, language: Language = 'zh', customApiKey?: string): Promise<ScenarioContent> => {
   // Implementation reused for single-shot generation (e.g. from history regeneration)
   const part1 = await generateVocabularyAndExpressions(scenario, language, customApiKey);
   const part2 = await generateDialoguesOnly(scenario, part1.vocabulary || [], language, customApiKey);
   
   return {
     scenarioName: scenario,
     vocabulary: part1.vocabulary || [],
     expressions: part1.expressions || [],
     dialogues: part2,
     timestamp: Date.now()
   };
};

// Retrieve AudioBuffer for text (from Cache or Network)
export const getAudioBuffer = async (text: string, voiceName: string, customApiKey?: string): Promise<AudioBuffer> => {
  const ai = getAiInstance(customApiKey);
  const ctx = getAudioContext();
  const cacheKey = `${voiceName}-${text}`;

  if (audioCache.has(cacheKey)) {
    return audioCache.get(cacheKey)!;
  }

  // Fetch from API
  const stream = await ai.models.generateContentStream({
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

  for await (const chunk of stream) {
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
export const playSystemTTS = (text: string): Promise<void> => {
    return new Promise((resolve) => {
        if (!window.speechSynthesis) {
            console.error("Web Speech API not supported");
            resolve();
            return;
        }

        // Cancel previous utterances
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'ja-JP';
        utterance.rate = 1.0; 
        
        // Try to find a Japanese voice
        const voices = window.speechSynthesis.getVoices();
        const jaVoice = voices.find(v => v.lang.includes('ja') || v.name.includes('Japanese'));
        if (jaVoice) {
            utterance.voice = jaVoice;
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
  customApiKey?: string
): Promise<void> => {
  // If engine is system, use native browser TTS
  if (engine === 'system') {
    return playSystemTTS(text);
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
    const stream = await ai.models.generateContentStream({
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

    for await (const chunk of stream) {
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
