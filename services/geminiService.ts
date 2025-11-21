import { GoogleGenAI, Type, Modality } from "@google/genai";
import { ScenarioContent, Language } from "../types";

// Initialize Gemini directly
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateScenarioContent = async (scenario: string, language: Language = 'zh'): Promise<ScenarioContent> => {
  if (!process.env.API_KEY) throw new Error("API Key missing");

  const langInstruction = language === 'zh' 
    ? "All 'meaning' and 'translation' fields MUST be in Simplified Chinese. The 'scenarioName' field MUST be exactly: " + scenario
    : "All 'meaning' and 'translation' fields MUST be in English. The 'scenarioName' field MUST be exactly: " + scenario;

  // Increased counts as requested: Vocab 30-35, Expressions 15-20
  const prompt = `
    Create a comprehensive Japanese language study guide for the specific scenario: "${scenario}".
    
    Requirements:
    1. Vocabulary: 30-35 essential words specific to this scenario.
    2. Expressions: 15-20 common useful phrases/sentence patterns (grammar points or set phrases).
    3. Dialogues: Create a realistic conversation flow broken down into 3 distinct chronological sub-scenes (e.g., "Start", "Middle", "End" but named appropriately for the context).
    4. Language: ${langInstruction}
    
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
                kana: { type: Type.STRING, description: "Furigana/Reading" },
                meaning: { type: Type.STRING, description: "Meaning in user language" },
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
                meaning: { type: Type.STRING, description: "Meaning in user language" },
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
                      translation: { type: Type.STRING, description: "Translation in user language" }
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

// Helper to decode base64 to Uint8Array
function decodeBase64(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Plays TTS audio directly using AudioContext to handle raw PCM data
export const playTTS = async (text: string, voiceName: 'Puck' | 'Kore' = 'Puck'): Promise<void> => {
  if (!process.env.API_KEY) throw new Error("API Key missing");

  const response = await ai.models.generateContent({
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

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64Audio) {
    throw new Error("No audio data generated");
  }

  // Initialize AudioContext (standard or webkit)
  const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
  const ctx = new AudioContext({ sampleRate: 24000 }); // TTS model uses 24kHz

  const pcmBytes = decodeBase64(base64Audio);
  
  // Convert Int16 PCM to Float32
  // Data from API is 16-bit integer PCM
  const dataInt16 = new Int16Array(pcmBytes.buffer);
  const float32Data = new Float32Array(dataInt16.length);
  
  for (let i = 0; i < dataInt16.length; i++) {
    // Normalize to [-1.0, 1.0]
    float32Data[i] = dataInt16[i] / 32768.0;
  }

  const buffer = ctx.createBuffer(1, float32Data.length, 24000);
  buffer.copyToChannel(float32Data, 0);

  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.connect(ctx.destination);
  source.start(0);

  return new Promise((resolve) => {
    source.onended = () => {
      source.disconnect();
      ctx.close(); 
      resolve();
    };
  });
};