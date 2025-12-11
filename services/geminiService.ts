
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { ScenarioContent, Language, ProgressCallback, VoiceEngine } from "../types";

// Helper to safely get the API Key in both Vite (production) and AI Studio (preview) environments
const getDefaultApiKey = () => {
  // @ts-ignore - Vite environment
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_KEY) {
    // @ts-ignore
    return import.meta.env.VITE_API_KEY;
  }
  // Fallback for AI Studio or Node environment
  return process.env.API_KEY;
};

// Initialize Gemini Client dynamically
const getAIClient = (customKey?: string) => {
  const keyToUse = customKey || getDefaultApiKey();
  if (!keyToUse) {
    throw new Error("API Key is missing! Please configure it in settings.");
  }
  return new GoogleGenAI({ apiKey: keyToUse });
};

// ---------------------------------------------------------------------------
// AUDIO SYSTEM OPTIMIZATIONS
// ---------------------------------------------------------------------------

// 1. Singleton AudioContext (prevents cold-start latency)
let audioContext: AudioContext | null = null;

// 2. In-Memory Audio Cache (key: "VoiceName-Text" -> AudioBuffer)
// This ensures 0ms latency for any repeated playback (especially vocabulary).
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

export const generateScenarioContent = async (
  scenario: string, 
  language: Language = 'zh', 
  customApiKey?: string,
  onStatusUpdate?: (status: 'init' | 'vocab' | 'expr' | 'dialogue' | 'finalizing') => void
): Promise<ScenarioContent> => {
  const ai = getAIClient(customApiKey);

  // Updated Prompt to explicitly request full pronunciation data AND bilingual translations
  const prompt = `
    Create a comprehensive Japanese language study guide for the specific scenario: "${scenario}".
    
    Requirements:
    1. Vocabulary: 30-35 essential words specific to this scenario. Include Kana (Hiragana/Katakana) and Romaji. Provide meanings in BOTH English and Simplified Chinese.
    2. Expressions: 15-20 common useful phrases/sentence patterns. Include full reading in Kana and Romaji. Provide meanings in BOTH English and Simplified Chinese.
    3. Dialogues: Create a realistic conversation flow broken down into 3 distinct chronological sub-scenes. Include full reading in Kana and Romaji for every line. Provide translations in BOTH English and Simplified Chinese.
    
    Ensure natural Japanese suitable for daily life.
  `;

  // Use generateContentStream to allow real-time progress updates
  const responseStream = await ai.models.generateContentStream({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          scenarioName: { type: Type.STRING },
          vocabulary: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                term: { type: Type.STRING, description: "Kanji or main word" },
                kana: { type: Type.STRING, description: "Furigana/Reading in Kana" },
                romaji: { type: Type.STRING, description: "Reading in Romaji" },
                meaning: { 
                  type: Type.OBJECT, 
                  properties: {
                    en: { type: Type.STRING, description: "English meaning" },
                    zh: { type: Type.STRING, description: "Chinese meaning" }
                  },
                  required: ["en", "zh"]
                },
                type: { type: Type.STRING, description: "Noun, Verb, etc." }
              }
            }
          },
          expressions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                phrase: { type: Type.STRING },
                kana: { type: Type.STRING, description: "Reading in Kana" },
                romaji: { type: Type.STRING, description: "Reading in Romaji" },
                meaning: { 
                  type: Type.OBJECT, 
                  properties: {
                    en: { type: Type.STRING, description: "English meaning" },
                    zh: { type: Type.STRING, description: "Chinese meaning" }
                  },
                  required: ["en", "zh"]
                },
                nuance: { type: Type.STRING, description: "e.g., Polite, Casual" }
              }
            }
          },
          dialogues: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING, description: "Sub-scene title" },
                lines: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      speaker: { type: Type.STRING, enum: ["A", "B"] },
                      roleName: { type: Type.STRING, description: "e.g. Staff, Customer" },
                      japanese: { type: Type.STRING },
                      kana: { type: Type.STRING, description: "Reading in Kana" },
                      romaji: { type: Type.STRING, description: "Reading in Romaji" },
                      translation: { 
                        type: Type.OBJECT, 
                        properties: {
                          en: { type: Type.STRING, description: "English translation" },
                          zh: { type: Type.STRING, description: "Chinese translation" }
                        },
                        required: ["en", "zh"]
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  });

  let fullText = '';
  // State flags to ensure we only trigger updates once per section
  let hasNotifiedVocab = false;
  let hasNotifiedExpr = false;
  let hasNotifiedDialogue = false;

  for await (const chunk of responseStream) {
    const text = chunk.text;
    if (text) {
      fullText += text;
      
      if (onStatusUpdate) {
        // Detect progress based on JSON keys appearing in the stream
        if (!hasNotifiedVocab && fullText.includes('"vocabulary"')) {
          onStatusUpdate('vocab');
          hasNotifiedVocab = true;
        }
        if (!hasNotifiedExpr && fullText.includes('"expressions"')) {
          onStatusUpdate('expr');
          hasNotifiedExpr = true;
        }
        if (!hasNotifiedDialogue && fullText.includes('"dialogues"')) {
          onStatusUpdate('dialogue');
          hasNotifiedDialogue = true;
        }
      }
    }
  }

  if (onStatusUpdate) {
    onStatusUpdate('finalizing');
  }

  if (fullText) {
    let result: ScenarioContent;
    try {
      result = JSON.parse(fullText) as ScenarioContent;
    } catch (e) {
      // Fallback: try to clean markdown code blocks if present (though schema usually prevents this)
      const cleanText = fullText.replace(/```json/g, '').replace(/```/g, '').trim();
      result = JSON.parse(cleanText) as ScenarioContent;
    }
    
    // SANITIZATION: Deep clean to prevent UI crashes
    
    // 1. Ensure arrays exist
    if (!result.vocabulary) result.vocabulary = [];
    if (!result.expressions) result.expressions = [];
    if (!result.dialogues) result.dialogues = [];

    // 2. Filter out corrupt items (missing essential fields)
    result.vocabulary = result.vocabulary.filter(item => 
      item && 
      item.term && 
      item.meaning && // Ensure meaning object exists
      (typeof item.meaning === 'string' || (item.meaning.en || item.meaning.zh))
    );

    result.expressions = result.expressions.filter(item => 
      item && 
      item.phrase && 
      item.meaning &&
      (typeof item.meaning === 'string' || (item.meaning.en || item.meaning.zh))
    );

    result.dialogues = result.dialogues.filter(d => d && d.lines && Array.isArray(d.lines));
    
    // 3. Clean dialogue lines
    result.dialogues.forEach(d => {
       d.lines = d.lines.filter(l => 
         l && 
         l.japanese && 
         l.translation &&
         (typeof l.translation === 'string' || (l.translation.en || l.translation.zh))
       );
    });

    // FORCE the scenario name to match the requested input to prevent ID drift in history
    result.scenarioName = scenario;
    return result;
  }
  throw new Error("Failed to generate content");
};

// Retrieve AudioBuffer for text (from Cache or Network)
export const getAudioBuffer = async (text: string, voiceName: string, customApiKey?: string): Promise<AudioBuffer> => {
  const ctx = getAudioContext();
  const cacheKey = `${voiceName}-${text}`;

  if (audioCache.has(cacheKey)) {
    return audioCache.get(cacheKey)!;
  }

  const ai = getAIClient(customApiKey);

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

  const ai = getAIClient(customApiKey);

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
