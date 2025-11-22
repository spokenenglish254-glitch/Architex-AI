
import { GoogleGenAI, Type, Modality } from "@google/genai";
import type { BriefAnalysis, MaterialSuggestion, ImageAnalysis, BillOfQuantitiesCategory } from '../types';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
    throw new Error("API_KEY environment variable is not set.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const parseJsonOrThrow = <T,>(text: string, context: string): T => {
    try {
        // The Gemini API might return the JSON wrapped in ```json ... ```
        const jsonString = text.replace(/^```json\n?/, '').replace(/```$/, '');
        return JSON.parse(jsonString) as T;
    } catch (e) {
        console.error(`Failed to parse JSON for ${context}:`, text);
        throw new Error(`The AI returned an invalid format for ${context}. Please try again.`);
    }
}

export const analyzeBrief = async (brief: string, language: string): Promise<BriefAnalysis> => {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: `Analyze the following architectural project brief and provide a summary. Extract key requirements, suggest 2-3 potential design styles, identify potential challenges, and list the primary rooms or spaces mentioned (e.g., "Living Room", "Kitchen", "Master Bedroom", "Washroom"). IMPORTANT: The entire response, including all keys and values in the JSON output, must be in ${language}.
        
        Brief: "${brief}"`,
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    summary: { type: Type.STRING, description: "A concise summary of the project goals." },
                    keyRequirements: { type: Type.ARRAY, items: { type: Type.STRING }, description: "A list of the main functional and aesthetic requirements." },
                    designStyles: { type: Type.ARRAY, items: { type: Type.STRING }, description: "A list of suitable architectural design styles." },
                    potentialChallenges: { type: Type.ARRAY, items: { type: Type.STRING }, description: "A list of potential design or construction challenges to consider." },
                    rooms: { type: Type.ARRAY, items: { type: Type.STRING }, description: "A list of the primary rooms and spaces mentioned in the brief, including washrooms." },
                },
                required: ['summary', 'keyRequirements', 'designStyles', 'potentialChallenges', 'rooms'],
            }
        }
    });
    
    return parseJsonOrThrow<BriefAnalysis>(response.text, "brief analysis");
};


export const suggestMaterials = async (criteria: string): Promise<MaterialSuggestion[]> => {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Based on the following criteria, suggest 3-4 suitable building materials. For each material, provide a brief description, 2-3 pros, and 2-3 cons.

        Criteria: "${criteria}"`,
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        name: { type: Type.STRING },
                        description: { type: Type.STRING },
                        pros: { type: Type.ARRAY, items: { type: Type.STRING } },
                        cons: { type: Type.ARRAY, items: { type: Type.STRING } },
                    },
                    required: ['name', 'description', 'pros', 'cons'],
                }
            }
        }
    });

    return parseJsonOrThrow<MaterialSuggestion[]>(response.text, "material suggestions");
};

export const analyzeImage = async (base64Image: string, mimeType: string): Promise<ImageAnalysis> => {
    const imagePart = {
      inlineData: {
        data: base64Image,
        mimeType: mimeType,
      },
    };
    const textPart = {
        text: 'Analyze this image of a building or interior space. Identify the primary architectural style, list key features or design elements, describe the color palette, and suggest potential materials used.'
    };
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [imagePart, textPart] },
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    architecturalStyle: { type: Type.STRING },
                    keyFeatures: { type: Type.ARRAY, items: { type: Type.STRING } },
                    colorPalette: { type: Type.ARRAY, items: { type: Type.STRING } },
                    potentialMaterials: { type: Type.ARRAY, items: { type: Type.STRING } },
                },
                required: ['architecturalStyle', 'keyFeatures', 'colorPalette', 'potentialMaterials'],
            }
        }
    });

    return parseJsonOrThrow<ImageAnalysis>(response.text, "image analysis");
};

export const redesignImage = async (base64Image: string, mimeType: string, prompt: string): Promise<string> => {
    const imagePart = {
      inlineData: {
        data: base64Image,
        mimeType: mimeType,
      },
    };
    const textPart = {
        text: `Redesign the architectural space shown in this image. Keep the structural layout and perspective but apply the following design changes: ${prompt}. Generate a high-quality, photorealistic result.`
    };
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [imagePart, textPart] },
    });

    const parts = response.candidates?.[0]?.content?.parts;
    if (parts) {
        for (const part of parts) {
            if (part.inlineData) {
                const base64ImageBytes: string = part.inlineData.data;
                return `data:${part.inlineData.mimeType || 'image/jpeg'};base64,${base64ImageBytes}`;
            }
        }
    }
    
    throw new Error('Failed to generate redesigned image. The AI did not return an image.');
};

export const generate3dModelImage = async (prompt: string): Promise<string> => {
    const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: prompt,
        config: {
          numberOfImages: 1,
          outputMimeType: 'image/jpeg',
          aspectRatio: '16:9',
        },
    });

    if (response.generatedImages && response.generatedImages.length > 0 && response.generatedImages[0].image.imageBytes) {
        const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
        return `data:image/jpeg;base64,${base64ImageBytes}`;
    } else {
        throw new Error('Failed to generate 3D model image. The AI did not return an image.');
    }
};

export const generateFloorPlanDiagram = async (prompt: string): Promise<string> => {
    const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: prompt,
        config: {
          numberOfImages: 1,
          outputMimeType: 'image/jpeg',
          aspectRatio: '16:9',
        },
    });

    if (response.generatedImages && response.generatedImages.length > 0 && response.generatedImages[0].image.imageBytes) {
        const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
        return `data:image/jpeg;base64,${base64ImageBytes}`;
    } else {
        throw new Error('Failed to generate floor plan diagram. The AI did not return an image.');
    }
};

export const generateElectricalDiagram = async (prompt: string, base64FloorPlan: string, mimeType: string): Promise<string> => {
    const imagePart = {
      inlineData: {
        data: base64FloorPlan,
        mimeType: mimeType,
      },
    };
    const textPart = {
        text: prompt
    };
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [imagePart, textPart] },
        config: {
            responseModalities: [Modality.IMAGE],
        },
    });

    const parts = response.candidates?.[0]?.content?.parts;
    if (parts) {
        for (const part of parts) {
            if (part.inlineData) {
                const base64ImageBytes: string = part.inlineData.data;
                return `data:${part.inlineData.mimeType};base64,${base64ImageBytes}`;
            }
        }
    }
    
    throw new Error('Failed to generate electrical diagram. The AI did not return an image.');
};


export const generateBillOfQuantities = async (brief: string, currency: string): Promise<BillOfQuantitiesCategory[]> => {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: `Based on the following architectural project brief, generate a detailed Bill of Quantities (BoQ). The BoQ should be broken down into standard construction categories (e.g., Substructure, Superstructure, Finishes, Services). For each item, provide a description, quantity, unit, and an estimated cost in ${currency}. Be as detailed and realistic as possible based on the brief.

        Project Brief: "${brief}"`,
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        category: { type: Type.STRING },
                        items: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    item: { type: Type.STRING },
                                    description: { type: Type.STRING },
                                    quantity: { type: Type.NUMBER },
                                    unit: { type: Type.STRING },
                                    estimatedCost: { type: Type.NUMBER, description: `The estimated cost in the requested currency (${currency})` },
                                },
                                required: ['item', 'description', 'quantity', 'unit', 'estimatedCost'],
                            }
                        }
                    },
                    required: ['category', 'items'],
                }
            }
        }
    });

    return parseJsonOrThrow<BillOfQuantitiesCategory[]>(response.text, "bill of quantities");
};
