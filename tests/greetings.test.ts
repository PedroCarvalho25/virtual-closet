import { expect, it } from 'vitest';
import { greetingFor, greetingCount, readGreeting } from '../src/identity/greetings';
it('uses the selected article and never guesses sex from a name', () => {
  expect(greetingFor(readGreeting({ closet_greeting: { sex: 'male' } }), 'Armando')).toBe(
    'Ora, ora... se não é o Armando.',
  );
  expect(greetingFor(readGreeting({ closet_greeting: { sex: 'female' } }), 'Luísa')).toBe(
    'Ora, ora... se não é a Luísa.',
  );
  expect(greetingFor(readGreeting(), 'Armando')).toBe('Ora, ora... Armando por aqui.');
  expect(
    readGreeting({
      closet_greeting: { sex: 'invalid', preferredName: 35, usePreferredName: 'true' },
    }),
  ).toEqual({ sex: 'unspecified', preferredName: '', usePreferredName: false });
});
it('preserves unrestricted chosen names and falls back only when disabled or empty', () => {
  const name = '☆ Lua / d’Água <3 🌈 ' + 'A'.repeat(240);
  const preferences = readGreeting({
    closet_greeting: { sex: 'female', preferredName: name, usePreferredName: true },
  });
  for (let i = 0; i < greetingCount; i++)
    expect(greetingFor(preferences, 'Maria', i)).toContain(name);
  expect(greetingFor({ ...preferences, usePreferredName: false }, 'Maria')).toBe(
    'Ora, ora... se não é a Maria.',
  );
  expect(greetingFor({ ...preferences, preferredName: '   ' }, 'Maria')).toContain('a Maria.');
  expect(
    new Set(Array.from({ length: greetingCount }, (_, i) => greetingFor(preferences, 'Maria', i)))
      .size,
  ).toBe(greetingCount);
});
