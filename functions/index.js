const functions = require('firebase-functions');
const OpenAI = require('openai');

const MODEL = 'gpt-4o-mini';
const MAX_TOKENS = 2048;

/**
 * Chat completion proxy — callable from the client via Firebase SDK.
 * Only authenticated users can call this function.
 */
exports.chatCompletion = functions.https.onCall(async (data, context) => {
  // Require authentication
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'You must be signed in to use AI features.');
  }

  // API key from .env file
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new functions.https.HttpsError('internal', 'AI service not configured.');
  }

  const { messages, temperature = 0.7, maxTokens = MAX_TOKENS } = data;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    throw new functions.https.HttpsError('invalid-argument', 'messages array is required.');
  }

  // Cap max tokens to prevent abuse
  const safeMaxTokens = Math.min(maxTokens, MAX_TOKENS);

  try {
    const client = new OpenAI({ apiKey });

    const response = await client.chat.completions.create({
      model: MODEL,
      max_tokens: safeMaxTokens,
      temperature,
      messages,
    });

    return {
      content: response.choices[0]?.message?.content || null,
      usage: response.usage,
    };
  } catch (error) {
    console.error('OpenAI API error:', error);

    if (error.status === 429) {
      throw new functions.https.HttpsError('resource-exhausted', 'AI rate limit reached. Please wait and try again.');
    }
    if (error.status === 401) {
      throw new functions.https.HttpsError('internal', 'AI service configuration error.');
    }

    throw new functions.https.HttpsError('internal', 'Failed to generate AI response.');
  }
});
