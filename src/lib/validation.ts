import { inGroup } from './item-groups';
import { meetsSignupPasswordPolicy, SIGNUP_PASSWORD_HINT } from './password';
import {
  categories,
  fits,
  type ItemInput,
  type ItemFilters,
  type WardrobeItem,
} from '@/types/domain';
export function normalizeItem(input: ItemInput): ItemInput {
  const result = {
    ...input,
    name: input.name.trim(),
    color: input.color.trim(),
    size: input.size.trim(),
    brand: input.brand?.trim() || null,
    fit: input.category === 'tenis' ? null : input.fit,
  };
  if (!result.name || result.name.length > 100)
    throw new Error('Informe um nome com até 100 caracteres.');
  if (!(result.category in categories)) throw new Error('Escolha uma categoria.');
  if (!result.color || result.color.length > 50)
    throw new Error('Informe a cor da peça, com até 50 caracteres.');
  if (!result.size || result.size.length > 30) throw new Error('Informe o tamanho ou a numeração.');
  if (result.brand && result.brand.length > 80)
    throw new Error('A marca deve ter até 80 caracteres.');
  if (result.fit && !(result.fit in fits)) throw new Error('Escolha um caimento válido.');
  return result;
}
export function validateSelection(ids: string[]): void {
  if (ids.length < 1 || ids.length > 30) throw new Error('Selecione entre 1 e 30 peças.');
  if (new Set(ids).size !== ids.length) throw new Error('Uma peça não pode aparecer duas vezes.');
}
export function validateAuth(email: string, password: string, signup: boolean): void {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
    throw new Error('Informe um e-mail válido.');
  if (signup && !meetsSignupPasswordPolicy(password)) throw new Error(SIGNUP_PASSWORD_HINT);
  if (!password.length) throw new Error('Informe sua senha.');
}
export function filterCachedItems(items: WardrobeItem[], filter: ItemFilters): WardrobeItem[] {
  const query = filter.search.trim().toLocaleLowerCase('pt-BR');
  return items.filter(
    (item) =>
      (filter.archived || !item.archived_at) &&
      (!filter.category || item.category === filter.category) &&
      inGroup(item.category, filter.group) &&
      (!query || `${item.name} ${item.color}`.toLocaleLowerCase('pt-BR').includes(query)),
  );
}
// Quote PostgREST string values; escape LIKE wildcards so input stays literal.
export function searchExpression(query: string): string {
  const escaped = query.trim().replace(/\\/g, '\\\\').replace(/[%_]/g, '\\$&').replace(/"/g, '\\"');
  return `name.ilike."%${escaped}%",color.ilike."%${escaped}%"`;
}
