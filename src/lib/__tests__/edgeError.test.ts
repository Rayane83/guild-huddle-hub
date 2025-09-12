import { describe, it, expect, vi } from 'vitest';
import { extractEdgeError, mapEdgeErrorType } from '@/lib/edgeError';

function makeResponse(json: any) {
  const text = JSON.stringify(json);
  return {
    clone: () => ({ text: async () => text }),
    text: async () => text,
  } as any; // minimal Response-like
}

describe('mapEdgeErrorType', () => {
  it('mappe EMAIL_ALREADY_EXISTS', () => {
    expect(mapEdgeErrorType('EMAIL_ALREADY_EXISTS')).toContain('déjà enregistré');
  });

  it('retourne null pour type inconnu', () => {
    expect(mapEdgeErrorType('SOMETHING_ELSE')).toBeNull();
  });
});

describe('extractEdgeError', () => {
  it('prend le message depuis context.body string JSON', async () => {
    const err = {
      message: 'Edge Function returned a non-2xx status code',
      context: {
        body: JSON.stringify({ error: 'Message précis', type: 'INVALID_CODE' })
      }
    };
    const res = await extractEdgeError(err);
    expect(res.message).toBe('Code invalide ou expiré');
    expect(res.type).toBe('INVALID_CODE');
  });

  it('prend le message depuis context.response si body absent', async () => {
    const err = {
      message: 'generic',
      context: {
        response: makeResponse({ error: 'Cet email est déjà enregistré. Essayez de vous connecter à la place.', type: 'EMAIL_ALREADY_EXISTS' })
      }
    };
    const res = await extractEdgeError(err);
    expect(res.message).toContain('déjà enregistré');
    expect(res.type).toBe('EMAIL_ALREADY_EXISTS');
  });

  it('retombe sur message par défaut si rien à parser', async () => {
    const err = { message: 'Oups' };
    const res = await extractEdgeError(err);
    expect(res.message).toBe('Oups');
  });
});
