import { describe, expect, it } from 'vitest';
import { SIGNUP_PASSWORD_HINT } from '@/lib/password';
import { validateAuth } from '@/lib/validation';
import { friendlyError } from '@/lib/errors';

describe('signup password policy', () => {
  it.each([
    ['empty', ''],
    ['too short', 'Abc12!'],
    ['no uppercase', 'test-password1!'],
    ['no lowercase', 'TEST-PASSWORD1!'],
    ['no number', 'Test-password!'],
    ['no symbol', 'Testpassword1'],
    ['space instead of a symbol', 'Testpassword1 '],
    ['emoji instead of a symbol', 'Testpassword1✨'],
  ])('rejects %s before signup', (_reason, password) => {
    expect(() => validateAuth('teste@example.com', password, true)).toThrow(SIGNUP_PASSWORD_HINT);
  });

  it('accepts a valid minimum-length password and the documented symbols', () => {
    for (const symbol of '!@#$%^&*()_+-=[]{};\'\\:"|<>?,./`~')
      expect(() => validateAuth('teste@example.com', `Abcdef1${symbol}`, true)).not.toThrow();
  });

  it('does not impose signup requirements on existing-account login', () => {
    for (const password of ['short', 'test-password', '123456'])
      expect(() => validateAuth('teste@example.com', password, false)).not.toThrow();
    expect(() => validateAuth('teste@example.com', '', false)).toThrow('Informe sua senha.');
  });

  it('still requires a valid email', () => {
    expect(() => validateAuth('invalid', 'Test-password1!', true)).toThrow(
      'Informe um e-mail válido.',
    );
  });

  it('explains server-side weak-password rejection in the same language as local validation', () => {
    expect(
      friendlyError({ code: 'weak_password', status: 422, message: 'Password is too weak' }),
    ).toBe(SIGNUP_PASSWORD_HINT);
  });
});
