import OpenAI from 'openai';

// Replace with your OpenAI API key
// Get it from: https://platform.openai.com/api-keys
// IMPORTANT: In production, never expose this key in client-side code.
// Use a backend proxy or Firebase Cloud Functions to protect your key.
const OPENAI_API_KEY = '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';

const openaiClient = new OpenAI({
  apiKey: OPENAI_API_KEY,
  // dangerouslyAllowBrowser is needed for React Native environments
  dangerouslyAllowBrowser: true,
});

export const MODEL = 'gpt-4o-mini';

export const MAX_TOKENS = 2048;

export default openaiClient;
