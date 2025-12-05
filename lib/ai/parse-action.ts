import type { Action } from '../types';

export function parseActionResponse(response: string): Action {
  // Try to extract JSON from response
  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('No JSON found in response');
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]);
    
    if (!parsed.action || typeof parsed.action !== 'string') {
      throw new Error('Invalid action field');
    }

    const validActions = ['fold', 'check', 'call', 'raise', 'all-in'];
    if (!validActions.includes(parsed.action)) {
      throw new Error(`Invalid action: ${parsed.action}`);
    }

    if (parsed.action === 'raise') {
      if (typeof parsed.amount !== 'number' || parsed.amount <= 0) {
        throw new Error('Raise requires valid amount');
      }
      return { type: parsed.action, amount: parsed.amount };
    }

    return { type: parsed.action };
  } catch (error) {
    throw new Error(`Failed to parse action: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

