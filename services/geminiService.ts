
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { ScenarioContent, Language } from "../types";

// Helper to safely get the API Key in both Vite (production) and AI Studio (preview) environments
const getApiKey = () => {
  // @ts-ignore - Vite environment
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_KEY) {
    // @ts-ignore
    return import.meta.env.VITE_API_KEY;
  }
  // Fallback for AI Studio or Node environment
  return process.env.API_KEY;
};

const apiKey = getApiKey();
if (!apiKey) {
  console.error("API Key is missing! Please check your .env configuration.");
}

// Initialize Gemini directly
const ai = new GoogleGenAI({ apiKey: apiKey || '' });

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

export const generateScenarioContent = async (scenario: string, language: Language = 'zh'): Promise<ScenarioContent> => {
  const currentKey = getApiKey();
  if (!currentKey) throw new Error("API Key missing");

  // Updated Prompt to explicitly request full pronunciation data AND bilingual translations
  const prompt = `
    Create a comprehensive Japanese language study guide for the specific scenario: "${scenario}".
    
    Requirements:
    1. Vocabulary: 30-35 essential words specific to this scenario. Include Kana (Hiragana/Katakana) and Romaji. Provide meanings in BOTH English and Simplified Chinese.
    2. Expressions: 15-20 common useful phrases/sentence patterns. Include full reading in Kana and Romaji. Provide meanings in BOTH English and Simplified Chinese.
    3. Dialogues: Create a realistic conversation flow broken down into 3 distinct chronological sub-scenes. Include full reading in Kana and Romaji for every line. Provide translations in BOTH English and Simplified Chinese.
    
    Ensure natural Japanese suitable for daily life.
  `;

  const response = await ai.models.generateContent({
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

  if (response.text) {
    const result = JSON.parse(response.text) as ScenarioContent;
    // FORCE the scenario name to match the requested input to prevent ID drift in history
    result.scenarioName = scenario;
    return result;
  }
  throw new Error("Failed to generate content");
};

// Retrieve AudioBuffer for text (from Cache or Network)
export const getAudioBuffer = async (text: string, voiceName: string): Promise<AudioBuffer> => {
  const currentKey = getApiKey();
  if (!currentKey) throw new Error("API Key missing");

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

// Stitch dialogue lines into a single WAV Blob
export const generateDialogueAudio = async (lines: {text: string, speaker: string}[]): Promise<Blob> => {
   const ctx = getAudioContext();
   const buffers: AudioBuffer[] = [];
   
   // 1. Fetch all buffers
   for (const line of lines) {
     const voice = line.speaker === 'A' ? 'Puck' : 'Kore';
     const buffer = await getAudioBuffer(line.text, voice);
     buffers.push(buffer);
   }

   // 2. Calculate total length (adding 0.5s silence gap between lines)
   const gapSeconds = 0.5;
   const gapSamples = Math.floor(gapSeconds * 24000);
   const totalLength = buffers.reduce((acc, buf) => acc + buf.length + gapSamples, 0);

   // 3. Create output buffer
   const outputBuffer = ctx.createBuffer(1, totalLength, 24000);
   const outputData = outputBuffer.getChannelData(0);
   
   let offset = 0;
   for (const buf of buffers) {
     // cast to any for Vercel build compatibility
     outputData.set(buf.getChannelData(0) as any, offset);
     offset += buf.length + gapSamples;
   }

   // 4. Encode to WAV
   return encodeWAV(outputData, 24000);
};

// Optimized Play TTS using Streaming + Caching
export const playTTS = async (text: string, voiceName: 'Puck' | 'Kore' = 'Puck'): Promise<void> => {
  const currentKey = getApiKey();
  if (!currentKey) throw new Error("API Key missing");

  const ctx = getAudioContext();
  const cacheKey = `${voiceName}-${text}`;

  // 1. HIT CACHE? Play immediately with Zero Latency.
  if (audioCache.has(cacheKey)) {
    const buffer = audioCache.get(cacheKey)!;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start();
    return;
  }

  // 2. MISS CACHE? Stream from API.
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
    // We collect all chunks to build a cache entry after playback
    const collectedChunks: Float32Array[] = [];
    let totalLength = 0;

    for await (const chunk of stream) {
      const base64Audio = chunk.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      
      if (base64Audio) {
        const float32Data = processAudioChunk(base64Audio);
        
        // A. Store for Cache
        collectedChunks.push(float32Data);
        totalLength += float32Data.length;

        // B. Play Immediately (Gapless)
        const buffer = ctx.createBuffer(1, float32Data.length, 24000);
        
        // Use 'any' cast to bypass strict ArrayBuffer vs SharedArrayBuffer mismatch in Vercel environment
        buffer.copyToChannel(float32Data as any, 0);

        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);

        // Schedule playback: max(now, end of previous chunk)
        const startAt = Math.max(ctx.currentTime, nextStartTime);
        source.start(startAt);
        
        nextStartTime = startAt + buffer.duration;
      }
    }

    // 3. BUILD CACHE (Construct full buffer for next time)
    if (totalLength > 0) {
      const fullBuffer = ctx.createBuffer(1, totalLength, 24000);
      const channelData = fullBuffer.getChannelData(0);
      let offset = 0;
      for (const chunk of collectedChunks) {
        // Use 'any' cast
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

  /* RIFF identifier */
  writeString(view, 0, 'RIFF');
  /* RIFF chunk length */
  view.setUint32(4, 36 + samples.length * 2, true);
  /* RIFF type */
  writeString(view, 8, 'WAVE');
  /* format chunk identifier */
  writeString(view, 12, 'fmt ');
  /* format chunk length */
  view.setUint32(16, 16, true);
  /* sample format (raw) */
  view.setUint16(20, 1, true);
  /* channel count */
  view.setUint16(22, 1, true);
  /* sample rate */
  view.setUint32(24, sampleRate, true);
  /* byte rate (sample rate * block align) */
  view.setUint32(28, sampleRate * 2, true);
  /* block align (channel count * bytes per sample) */
  view.setUint16(32, 2, true);
  /* bits per sample */
  view.setUint16(34, 16, true);
  /* data chunk identifier */
  writeString(view, 36, 'data');
  /* data chunk length */
  view.setUint32(40, samples.length * 2, true);

  // Write PCM samples
  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    // Clamp values to -1.0 to 1.0 range
    const s = Math.max(-1, Math.min(1, samples[i]));
    // Convert to 16-bit PCM
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }

  return new Blob([view], { type: 'audio/wav' });
}
