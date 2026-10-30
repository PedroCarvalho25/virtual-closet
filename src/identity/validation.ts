import type { ProfileDraft } from './types';
export const profileTags = [
  'Conforto',
  'Minimal',
  'Cor',
  'Textura',
  'Vintage',
  'Urbano',
  'Clássico',
  'Criativo',
];
const reserved = new Set([
  'admin',
  'administrador',
  'suporte',
  'support',
  'virtualcloset',
  'virtual_closet',
  'login',
  'signup',
  'api',
  'account',
  'settings',
  'moderador',
]);
export function normalizeUsername(value: string) {
  return value.trim().replace(/^@/, '').toLowerCase();
}
export function usernameError(value: string): string | null {
  const name = normalizeUsername(value);
  if (!/^[a-z0-9][a-z0-9._]{1,22}[a-z0-9]$/.test(name) || name.includes('..'))
    return 'Use de 3 a 24 letras, números, pontos ou _. Comece e termine com letra ou número.';
  if (reserved.has(name)) return 'Esse nome é reservado. Escolha um @ que seja seu.';
  return null;
}
export function normalizeProfile(draft: ProfileDraft): ProfileDraft {
  const result = {
    ...draft,
    username: normalizeUsername(draft.username),
    firstName: draft.firstName.trim(),
    lastName: draft.lastName.trim(),
    bio: draft.bio.trim(),
  };
  const invalid = usernameError(result.username);
  if (invalid) throw new Error(invalid);
  if (
    !result.firstName ||
    result.firstName.length > 50 ||
    !result.lastName ||
    result.lastName.length > 80 ||
    /[\u0000-\u001f\u007f]/.test(result.firstName + result.lastName)
  )
    throw new Error('Informe seu nome e sobrenome, com até 50 e 80 caracteres.');
  if (result.bio.length > 160) throw new Error('Sua apresentação pode ter até 160 caracteres.');
  if (
    !['olive', 'clay', 'lemon'].includes(result.tone) ||
    result.tags.length > 3 ||
    new Set(result.tags).size !== result.tags.length ||
    result.tags.some((tag) => !profileTags.includes(tag))
  )
    throw new Error('Escolha uma cor e até três detalhes do seu estilo.');
  return result;
}
export function profileDraft(metadata: Record<string, unknown> = {}): ProfileDraft {
  return {
    firstName: typeof metadata.first_name === 'string' ? metadata.first_name : '',
    lastName: typeof metadata.last_name === 'string' ? metadata.last_name : '',
    username: typeof metadata.username === 'string' ? metadata.username : '',
    bio: '',
    tone: 'olive',
    tags: [],
    discoverable: true,
  };
}
export function normalizeCode(value: string) {
  return value.replace(/\D/g, '').slice(0, 6);
}
export function shareProfileText(
  username: string,
  configuredOrigin?: string,
): { message: string; url?: string } {
  const label = `Encontre meu estilo no Virtual Closet: @${normalizeUsername(username)}`;
  if (configuredOrigin) {
    try {
      const base = new URL(configuredOrigin);
      if (
        base.protocol === 'https:' &&
        !base.username &&
        !base.password &&
        !/^(localhost|127\.|0\.|\[::1\])/.test(base.hostname)
      ) {
        const url = new URL(`/u/${encodeURIComponent(normalizeUsername(username))}`, base.origin)
          .href;
        return { message: label, url };
      }
    } catch {
      /* Share the searchable handle when no public address is configured. */
    }
  }
  return {
    message: `${label}\nNo aplicativo, abra Minha conta → Encontrar pessoas e procure esse @.`,
  };
}
