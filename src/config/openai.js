import firebase from 'firebase/compat/app';
import 'firebase/compat/functions';

// Call the Cloud Function proxy — no API key on the client
const functions = firebase.functions();

// Connect to local emulator in development
if (__DEV__) {
  functions.useEmulator('127.0.0.1', 5001);
}

const chatCompletionFn = functions.httpsCallable('chatCompletion');

/**
 * Send a chat completion request through the Firebase Cloud Function proxy.
 *
 * @param {Object} params
 * @param {Array}  params.messages     - OpenAI-style messages array
 * @param {number} [params.temperature] - Sampling temperature (default 0.7)
 * @param {number} [params.maxTokens]   - Max tokens (default/max 2048)
 * @returns {Promise<string|null>} The assistant's response text
 */
export async function chatCompletion({ messages, temperature, maxTokens }) {
  const result = await chatCompletionFn({ messages, temperature, maxTokens });
  return result.data.content;
}

export const MODEL = 'gpt-4o-mini';
export const MAX_TOKENS = 2048;
