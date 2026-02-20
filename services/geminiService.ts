import { GoogleGenAI, Type } from "@google/genai";
import { Song } from "../types";

export const parseSongListImage = async (base64Image: string): Promise<Partial<Song>[]> => {
  // Use process.env.API_KEY directly as per guidelines
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Robustly extract MIME type and base64 data
  const matches = base64Image.match(/^data:(.+);base64,(.+)$/);
  const mimeType = matches ? matches[1] : 'image/jpeg';
  const cleanBase64 = matches ? matches[2] : base64Image.replace(/^data:image\/\w+;base64,/, "");

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
            { 
              inlineData: {
                mimeType: mimeType, 
                data: cleanBase64 
              } 
            },
            { text: `Analyze this image of a KTV song list. 
                     Extract the song information into a JSON array.
                     If a column is missing, make a best guess or leave it empty.` 
            }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING, description: "Song number/code. Empty if not visible." },
              title: { type: Type.STRING, description: "Song title" },
              artist: { type: Type.STRING, description: "Artist name" },
              language: { type: Type.STRING, description: "Language (Mandarin, Taiwanese, English, etc)" }
            },
            required: ["title", "artist"]
          }
        }
      }
    });

    const text = response.text;
    if (!text) return [];
    
    return JSON.parse(text);
  } catch (error) {
    console.error("OCR Error:", error);
    throw new Error("Failed to analyze image. Please check API Key or try a clearer image.");
  }
};