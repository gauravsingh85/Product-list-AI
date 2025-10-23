import { GoogleGenAI, Modality, Type } from "@google/genai";
import type { LogLevel } from '../types';

const API_KEY = process.env.API_KEY;
if (!API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

/**
 * Strips the base64 prefix from a data URL.
 * e.g., "data:image/jpeg;base64,/9j/4AAQSkZ..." -> "/9j/4AAQSkZ..."
 */
const stripBase64Prefix = (base64: string): string => {
  return base64.split(',')[1] || base64;
};

// Type for the logging function
type LogFn = (level: LogLevel, message: string) => void;

/**
 * Generates a single professional product image from a series of captured photos.
 * @param images An array of base64 encoded image strings.
 * @param log A function to log debug messages.
 * @returns A promise that resolves to a new base64 encoded image string.
 */
export const generateProductImage = async (images: string[], log: LogFn): Promise<string> => {
  log('DEBUG', 'Starting product image generation.');
  const imageParts = images.map((img) => ({
    inlineData: {
      data: stripBase64Prefix(img),
      mimeType: 'image/jpeg',
    },
  }));

  const requestPayload = {
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        { text: 'From these 3 product photos, create one high-quality, professional, e-commerce-ready product image with a clean, neutral background. Focus on making the product look appealing for online sales.' },
        ...imageParts,
      ],
    },
    config: {
      responseModalities: [Modality.IMAGE],
    },
  };

  log('DEBUG', `Image generation request: ${JSON.stringify(requestPayload.contents.parts[0])}`);

  const response = await ai.models.generateContent(requestPayload);
  
  log('DEBUG', `Image generation response received.`);
  
  const generatedPart = response.candidates?.[0]?.content?.parts?.[0];
  if (generatedPart && generatedPart.inlineData) {
    log('INFO', 'Successfully generated product image.');
    return `data:image/jpeg;base64,${generatedPart.inlineData.data}`;
  }
  log('ERROR', 'Failed to generate product image from API response.');
  throw new Error('Failed to generate product image.');
};

/**
 * Extracts structured product information from a seller's spoken description and product photos.
 * @param transcription The transcribed text from the seller's audio.
 * @param images An array of base64 encoded image strings.
 * @param log A function to log debug messages.
 * @returns A promise that resolves to a JSON string of product details.
 */
export const extractProductInfo = async (transcription: string, images: string[], log: LogFn): Promise<string> => {
  log('DEBUG', 'Starting product info extraction.');
  const prompt = `A seller described their product. The description might be in Hindi, English, or a mix of languages ("Hinglish"). Analyze the following text and images to identify the product. Then, extract the product details into a JSON object. Based on the product, determine the most likely GST percentage and HSN code applicable in India. If a piece of information is not mentioned or cannot be determined, use null for its value.

  Text: "${transcription}"
  `;

  const imageParts = images.map((img) => ({
    inlineData: {
      data: stripBase64Prefix(img),
      mimeType: 'image/jpeg',
    },
  }));
  
  const requestPayload = {
    model: 'gemini-2.5-flash',
    contents: {
      parts: [
        { text: prompt },
        ...imageParts,
      ]
    },
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          productName: { type: Type.STRING, description: 'The name of the product.' },
          category: { type: Type.STRING, description: 'The product category (e.g., "clothing", "electronics").' },
          features: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: 'A list of key features or selling points.',
          },
          description: { type: Type.STRING, description: 'A brief summary of the product.' },
          price: { type: Type.NUMBER, description: 'The price of the product, if mentioned.' },
          language: { type: Type.STRING, description: 'The primary language detected (e.g., "English", "Hindi", "Hinglish").' },
          gstPercentage: { type: Type.NUMBER, description: 'The estimated GST percentage applicable in India.' },
          hsnCode: { type: Type.STRING, description: 'The estimated HSN code for the product in India.' }
        },
        required: ['productName', 'category', 'features', 'description', 'price', 'language', 'gstPercentage', 'hsnCode']
      },
    },
  };

  log('DEBUG', `Product info request: ${JSON.stringify({ prompt: requestPayload.contents.parts[0] })}`);

  const response = await ai.models.generateContent(requestPayload);
  
  log('DEBUG', `Product info response received: ${response.text}`);
  log('INFO', 'Successfully extracted product info.');

  return response.text;
};