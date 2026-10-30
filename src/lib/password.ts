export const SIGNUP_PASSWORD_HINT = '8+ caracteres: maiúscula, minúscula, número e símbolo.';

// Match Supabase's strongest required-character setting. Whitespace and emoji
// may be present, but do not replace a required symbol.
// https://supabase.com/docs/guides/auth/password-security
const symbols = '!@#$%^&*()_+-=[]{};\'\\:"|<>?,./`~';

export function meetsSignupPasswordPolicy(password: string): boolean {
  return (
    password.length >= 8 &&
    /[a-z]/.test(password) &&
    /[A-Z]/.test(password) &&
    /[0-9]/.test(password) &&
    [...password].some((character) => symbols.includes(character))
  );
}
