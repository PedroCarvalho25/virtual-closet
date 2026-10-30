export type GreetingSex = 'male' | 'female' | 'unspecified';
export type GreetingPreferences = {
  sex: GreetingSex;
  preferredName: string;
  usePreferredName: boolean;
};
export const greetingKey = 'closet_greeting';
export const greetingCount = 6;
export const sexOptions: Record<GreetingSex, string> = {
  male: 'Masculino',
  female: 'Feminino',
  unspecified: 'Prefiro não informar',
};
export function readGreeting(metadata: Record<string, unknown> = {}): GreetingPreferences {
  const raw = metadata[greetingKey];
  const value = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  return {
    sex: value.sex === 'male' || value.sex === 'female' ? value.sex : 'unspecified',
    preferredName: typeof value.preferredName === 'string' ? value.preferredName : '',
    usePreferredName: value.usePreferredName === true,
  };
}
export function greetingFor(preferences: GreetingPreferences, firstName: string, index = 0) {
  const name =
    preferences.usePreferredName && preferences.preferredName.trim()
      ? preferences.preferredName
      : firstName;
  if (!name.trim()) return 'Que bom ter você por aqui.';
  const article = preferences.sex === 'male' ? 'o' : preferences.sex === 'female' ? 'a' : '';
  const phrases = [
    article ? `Ora, ora... se não é ${article} ${name}.` : `Ora, ora... ${name} por aqui.`,
    `Que bom te ver, ${name}.`,
    `Qual vai ser a sua vibe hoje, ${name}?`,
    article ? `Olha quem chegou: ${article} ${name}.` : `Olha quem chegou: ${name}.`,
    `Vamos experimentar uma combinação, ${name}?`,
    `Seu closet estava te esperando, ${name}.`,
  ];
  return phrases[((index % greetingCount) + greetingCount) % greetingCount]!;
}
