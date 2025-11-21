import { GoogleGenAI, Type, Modality } from "@google/genai";
import { ScenarioContent, Language } from "../types";

const API_KEY = process.env.API_KEY || '';

// Initialize Gemini
const ai = new GoogleGenAI({ apiKey: API_KEY });

export const generateScenarioContent = async (scenario: string, language: Language = 'zh'): Promise<ScenarioContent> => {
  if (!API_KEY) throw new Error("API Key missing");

  const langInstruction = language === 'zh' 
    ? "All 'meaning' and 'translation' fields MUST be in Simplified Chinese." 
    : "All 'meaning' and 'translation' fields MUST be in English.";

  const prompt = `
    Create a comprehensive Japanese language study guide for the specific scenario: "${scenario}".
    
    Requirements:
    1. Vocabulary: 20-25 essential words specific to this scenario.
    2. Expressions: 10-15 common useful phrases/sentence patterns (grammar points or set phrases).
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
    return JSON.parse(response.text) as ScenarioContent;
  }
  throw new Error("Failed to generate content");
};

export const generateSpeech = async (text: string, voiceName: 'Puck' | 'Kore' = 'Puck'): Promise<string> => {
  if (!API_KEY) throw new Error("API Key missing");

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

  return `data:audio/mp3;base64,${base64Audio}`;
};
