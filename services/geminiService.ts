
import { GoogleGenAI, Type } from "@google/genai";

const apiKey = process.env.API_KEY || "";
const ai = new GoogleGenAI({ apiKey });

export const getTripSuggestions = async (destination: string) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Suggest 3 top places to visit or stay in ${destination}. Include title, category, location, and a short justification.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              category: { type: Type.STRING },
              location: { type: Type.STRING },
              justification: { type: Type.STRING },
              price: { type: Type.STRING }
            },
            required: ["title", "category", "location", "justification", "price"]
          }
        }
      }
    });
    
    return JSON.parse(response.text);
  } catch (error) {
    console.error("Gemini suggestion error:", error);
    return null;
  }
};
