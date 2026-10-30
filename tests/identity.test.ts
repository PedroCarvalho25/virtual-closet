import { describe, expect, it } from 'vitest';
import {
  normalizeCode,
  normalizeProfile,
  normalizeUsername,
  profileDraft,
  shareProfileText,
  usernameError,
} from '@/identity/validation';
describe('profile identity boundaries', () => {
  it('normalizes handles without stripping valid separators or altering real names', () => {
    expect(normalizeUsername(' @Pedro.Silva ')).toBe('pedro.silva');
    expect(
      normalizeProfile({
        ...profileDraft(),
        firstName: ' José ',
        lastName: ' da Silva ',
        username: '@Jose.Silva',
      }),
    ).toMatchObject({ firstName: 'José', lastName: 'da Silva', username: 'jose.silva' });
  });
  it('rejects reserved, ambiguous, too short and overlong handles', () => {
    for (const name of [
      'a',
      'ab',
      'admin',
      '_pedro',
      'pedro.',
      'pedro..silva',
      'pedro silva',
      'ábc',
      'a'.repeat(25),
    ])
      expect(usernameError(name)).toBeTruthy();
    for (const name of ['abc', 'pedro_silva', 'a'.repeat(24)])
      expect(usernameError(name)).toBeNull();
  });
  it('bounds names, biography and user-selected tags', () => {
    const draft = {
      ...profileDraft(),
      firstName: 'Lia',
      lastName: 'Oliveira',
      username: 'lia.oliveira',
    };
    for (const invalid of [
      { lastName: '' },
      { firstName: 'a'.repeat(51) },
      { bio: 'a'.repeat(161) },
      { tags: ['Conforto', 'Conforto'] },
      { tags: ['unknown'] },
    ])
      expect(() => normalizeProfile({ ...draft, ...invalid })).toThrow();
  });
  it('accepts pasted six-digit codes and never shares local development origins', () => {
    expect(normalizeCode('12 34-56 extra7')).toBe('123456');
    for (const url of [
      undefined,
      'http://example.com',
      'https://localhost:4180',
      'https://127.0.0.1',
      'https://[::1]',
      'https://user:password@example.com',
      'invalid',
    ]) {
      const result = shareProfileText('lia.oliveira', url);
      expect(result.url).toBeUndefined();
      expect(result.message).toContain('@lia.oliveira');
    }
    expect(shareProfileText('lia.oliveira', 'https://closet.example/path?query=1').url).toBe(
      'https://closet.example/u/lia.oliveira',
    );
  });
});
