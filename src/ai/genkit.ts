import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

const googleApiKey =
  process.env.GOOGLE_API_KEY ||
  process.env.GEMINI_API_KEY ||
  process.env.GOOGLE_GENAI_API_KEY;

export const ai = genkit({
  plugins: [googleAI(googleApiKey ? { apiKey: googleApiKey } : {})],
  model: 'googleai/gemini-2.0-flash',
});
