import { describe, expect, it } from 'vitest';
import { authErrorMessage } from '@/lib/auth-errors';
import { friendlyError } from '@/lib/errors';

describe('Auth error guidance', () => {
  it.each(['confirmation', 'magic link', 'recovery'])(
    'explains a %s email failure without exposing the provider response',
    (kind) => {
      const message = friendlyError({
        code: 'unexpected_failure',
        status: 500,
        message: `Error sending ${kind} email: private provider diagnostic`,
      });
      expect(message).toBe(
        'Não conseguimos enviar o código por e-mail. Aguarde alguns minutos e tente novamente.',
      );
      expect(message).not.toContain('private provider diagnostic');
    },
  );

  it.each([
    ['email_address_invalid', 'Confira o endereço de e-mail e tente novamente.'],
    [
      'email_address_not_authorized',
      'O envio de e-mail ainda não está disponível para este endereço.',
    ],
    [
      'over_email_send_rate_limit',
      'O limite de envio de códigos foi atingido. Aguarde e tente novamente.',
    ],
    [
      'signup_disabled',
      'O cadastro está temporariamente indisponível. Tente novamente mais tarde.',
    ],
    ['email_provider_disabled', 'O acesso por e-mail está temporariamente indisponível.'],
  ])('handles %s even without an English message', (code, expected) => {
    expect(friendlyError({ code, status: 400 })).toBe(expected);
  });

  it('does not misdiagnose database or unknown failures as an email delivery issue', () => {
    const error = {
      code: 'unexpected_failure',
      status: 500,
      message: 'Database error saving new user',
    };
    expect(authErrorMessage(error)).toBeNull();
    expect(friendlyError(error)).toBe('Não foi possível concluir. Tente novamente em instantes.');
    expect(authErrorMessage(null)).toBeNull();
    expect(authErrorMessage({ code: 'toString' })).toBeNull();
  });
});
