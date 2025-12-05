import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { google } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { MODEL_CONFIG } from '../types';

// Grok uses OpenAI-compatible API, so we create a custom OpenAI provider instance
const grokOpenAI = createOpenAI({
  baseURL: 'https://api.x.ai/v1',
  apiKey: process.env.GROK_API_KEY || process.env.XAI_API_KEY || '',
});

// Grok provider function that takes a model name
const grokProvider = (modelName: string) => {
  return grokOpenAI(modelName);
};

// Note: Meta models may need different provider setup
// For now, we'll handle them separately if needed

export function getProvider(modelKey: 'openai' | 'anthropic' | 'google' | 'grok' | 'meta') {
  switch (modelKey) {
    case 'openai':
      return openai;
    case 'anthropic':
      return anthropic;
    case 'google':
      return google;
    case 'grok':
      return grokProvider;
    case 'meta':
      // Meta models may need custom provider
      // For now, fallback to OpenAI structure
      throw new Error('Meta provider not yet configured');
    default:
      throw new Error(`Unknown provider: ${modelKey}`);
  }
}

export function getModelName(mode: 'fast' | 'smart', provider: string) {
  return MODEL_CONFIG[mode][provider as keyof typeof MODEL_CONFIG.fast];
}

