
import { GoogleGenAI } from "@google/genai";
import { TranscriptionPart, ReportData } from "../types";

// Safety check for Vite/Browser environment where process might not be defined
const API_KEY = (typeof process !== 'undefined' && process.env?.API_KEY) 
  ? process.env.API_KEY 
  : (window as any).VITE_API_KEY || "";

const ai = new GoogleGenAI({ apiKey: API_KEY });

export const transcribeAudio = async (
  audioBase64: string, 
  mimeType: string,
  spotlights: string[],
  rangeContext: string = "Full Audio",
  timeOffset: number = 0
): Promise<{ transcription: TranscriptionPart[], report: ReportData }> => {
  
  const validSpotlights = spotlights.filter(s => s.trim().length > 0).map(s => s.trim());
  const spotlightString = validSpotlights.join(", ");

  const prompt = `
    You are a professional Bengali audio transcriber.
    Task: Transcribe the audio into Bengali.
    Context: [${rangeContext}]
    Spotlights: [${spotlightString}]

    FORMAT RULES:
    1. Output strictly line-by-line using Pipe delimiter.
    2. Format: "SPEAKER|TIME|SENTIMENT|TEXT"
    3. Sentiment options: positive, negative, neutral.
    4. Time format: MM:SS.
    5. Do NOT use Markdown, Bold, or Code blocks.
    6. Translate immediately to Bengali text.
  `;

  try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: {
          parts: [
            { inlineData: { data: audioBase64, mimeType } },
            { text: prompt }
          ]
        }
      });

      const text = response.text || "";
      const lines = text.split("\n");
      const parts: TranscriptionPart[] = [];

      for (const line of lines) {
          if (line.trim().length < 5) continue;
          const segments = line.split("|");
          if (segments.length >= 4) {
              const speaker = segments[0].trim();
              const timeStr = segments[1].trim();
              const timeParts = timeStr.split(':').map(Number);
              let seconds = 0;
              if (timeParts.length === 3) seconds = timeParts[0] * 3600 + timeParts[1] * 60 + timeParts[2];
              else if (timeParts.length === 2) seconds = timeParts[0] * 60 + timeParts[1];
              
              const totalSeconds = seconds + timeOffset;
              const h = Math.floor(totalSeconds / 3600);
              const m = Math.floor((totalSeconds % 3600) / 60);
              const s = Math.floor(totalSeconds % 60);
              const formattedTime = h > 0 
                 ? `${h}:${m < 10 ? '0'+m : m}:${s < 10 ? '0'+s : s}`
                 : `${m < 10 ? '0'+m : m}:${s < 10 ? '0'+s : s}`;

              const sentimentRaw = segments[2].trim().toLowerCase();
              const content = segments.slice(3).join("|").trim(); 
              let sentiment: 'positive' | 'negative' | 'neutral' = 'neutral';
              if (sentimentRaw.includes('positive')) sentiment = 'positive';
              else if (sentimentRaw.includes('negative')) sentiment = 'negative';

              parts.push({ speaker, time: formattedTime, sentiment, text: content });
          }
      }

      return { 
        transcription: parts, 
        report: { 
          summary: { totalDuration: parts.length > 0 ? parts[parts.length - 1].time : "00:00", spotlightCount: 0, spotlightTimestamps: [] }, 
          details: [] 
        } 
      };
  } catch (e) {
    console.error("Gemini Batch Error", e);
    throw e;
  }
};

export const translateBatch = async (parts: TranscriptionPart[], targetLang: 'bn' | 'en'): Promise<string[]> => {
    const texts = parts.map(p => p.text);
    const prompt = `Translate the following JSON array of strings into ${targetLang === 'bn' ? 'Bengali' : 'English'}. Return ONLY the JSON array. \n\n ${JSON.stringify(texts)}`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt, 
            config: { responseMimeType: "application/json" }
        });
        let jsonStr = (response.text || "[]").trim();
        const translatedArray = JSON.parse(jsonStr);
        return Array.isArray(translatedArray) ? translatedArray : texts;
    } catch (e) {
        console.error("Translation error", e);
        return texts;
    }
};
