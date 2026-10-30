import { civilDate, parseCivil } from '@/lib/dates';
import { inGroup } from '@/lib/item-groups';
import type { WardrobeItem } from '@/types/domain';
import type { Occasion, StudioData, WeatherMood } from './types';

export function money(cents: number) {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
export function inputDate(date: string) {
  parseCivil(date);
  return date.split('-').reverse().join('/');
}
export function planDate(value: string) {
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(value.trim()))
    throw new Error('Use a data no formato DD/MM/AAAA.');
  const result = value.trim().split('/').reverse().join('-');
  parseCivil(result);
  return result;
}
export function priceCents(input: string): number | null {
  const value = input.trim();
  if (!value) return null;
  if (!/^\d{1,7}(?:[.,]\d{1,2})?$/.test(value))
    throw new Error('Use um valor como 129,90, sem ponto de milhar.');
  const cents = Math.round(Number(value.replace(',', '.')) * 100);
  if (!Number.isSafeInteger(cents) || cents < 0 || cents > 100000000)
    throw new Error('Informe um valor entre 0 e 1.000.000.');
  return cents;
}
export function outfitCost(ids: string[], prices: Record<string, number>) {
  const unique = [...new Set(ids)];
  const known = unique.filter((id) => prices[id] !== undefined);
  return {
    total: known.reduce((sum, id) => sum + prices[id]!, 0),
    known: known.length,
    count: unique.length,
    complete: known.length === unique.length && unique.length > 0,
  };
}
export function studioStats(data: StudioData, today = civilDate()) {
  const itemUses: Record<string, number> = {},
    outfitUses: Record<string, number> = {};
  const weekStart = parseCivil(today);
  weekStart.setDate(weekStart.getDate() - 6);
  const week = new Set<string>();
  const seen = new Set<string>();
  for (const log of data.wear) {
    const key = `${log.outfit_id}:${log.worn_date}`;
    if (seen.has(key) || log.worn_date > today) continue;
    seen.add(key);
    outfitUses[log.outfit_id] = (outfitUses[log.outfit_id] || 0) + 1;
    const outfit = data.outfits.find((o) => o.id === log.outfit_id);
    for (const id of new Set(outfit?.items.map((i) => i.id) || []))
      itemUses[id] = (itemUses[id] || 0) + 1;
    if (log.worn_date >= civilDate(weekStart)) week.add(log.outfit_id);
  }
  const active = data.items.filter((i) => !i.archived_at);
  const rankItems = [...data.items]
    .filter((i) => (itemUses[i.id] || 0) > 0)
    .sort((a, b) => itemUses[b.id]! - itemUses[a.id]! || a.name.localeCompare(b.name));
  const rankOutfits = [...data.outfits]
    .filter((o) => (outfitUses[o.id] || 0) > 0)
    .sort((a, b) => outfitUses[b.id]! - outfitUses[a.id]! || a.id.localeCompare(b.id));
  const priced = active
    .filter((i) => data.prices[i.id] !== undefined)
    .sort((a, b) => data.prices[a.id]! - data.prices[b.id]!);
  return {
    itemUses,
    outfitUses,
    rankItems,
    rankOutfits,
    priced,
    active,
    weekCount: week.size,
    totalUses: seen.size,
    usedItems: active.filter((i) => itemUses[i.id]).length,
    unused: active.filter((i) => !itemUses[i.id]),
    value: priced.reduce((sum, i) => sum + data.prices[i.id]!, 0),
  };
}
export function suggestions(
  items: WardrobeItem[],
  mood: WeatherMood,
  occasion: Occasion,
  favorites: string[] = [],
) {
  const active = items.filter((i) => !i.archived_at);
  const rank = (item: WardrobeItem) =>
    (favorites.includes(item.id) ? 2 : 0) +
    (occasion === 'work' && ['camisa', 'polo'].includes(item.category) ? 5 : 0) +
    (occasion !== 'work' && ['camiseta', 'regata'].includes(item.category) ? 3 : 0);
  const tops = active
    .filter((i) => inGroup(i.category, 'tops') && i.category !== 'colete')
    .sort((a, b) => rank(b) - rank(a) || a.id.localeCompare(b.id));
  const bottoms = active
    .filter((i) => inGroup(i.category, 'bottoms'))
    .sort((a, b) => {
      const score = (i: WardrobeItem) =>
        (mood === 'warm' && i.category !== 'calca' ? 3 : 0) +
        (mood !== 'warm' && i.category === 'calca' ? 3 : 0);
      return score(b) - score(a) || a.id.localeCompare(b.id);
    });
  const shoes = active.filter((i) => inGroup(i.category, 'shoes'));
  const layer = active.find(
    (i) => i.category === 'colete' || /tric[oô]|casaco|jaqueta/i.test(i.name),
  );
  const result: WardrobeItem[][] = [];
  for (const top of tops)
    for (const bottom of bottoms) {
      const chosen = [top, bottom, ...(shoes[0] ? [shoes[0]] : [])];
      if (mood === 'cool' && layer && layer.id !== top.id) chosen.push(layer);
      result.push(chosen);
      if (result.length === 24) return result;
    }
  return result;
}
