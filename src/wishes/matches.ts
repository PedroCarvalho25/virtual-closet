import { availableItems, roleOf } from '../evolution/core';
import type { Evolution, SlotRole, Wish } from '../evolution/types';
import type { StudioData } from '../preview/types';
import type { WardrobeItem } from '../types/domain';
import { readTraits, type StyleTraits } from '../style/traits';

const normalize = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
const families: Record<string, string[]> = {
  neutral: [
    'branco',
    'preto',
    'cinza',
    'grafite',
    'creme',
    'off white',
    'off-white',
    'bege',
    'areia',
  ],
  earth: ['marrom', 'caramelo', 'terracota', 'camel', 'mostarda'],
  blue: ['azul', 'marinho'],
  green: ['verde', 'oliva', 'oliva escuro'],
  red: ['vermelho', 'vinho', 'bordo'],
  pink: ['rosa', 'coral'],
  purple: ['roxo', 'lilas'],
  yellow: ['amarelo'],
  orange: ['laranja'],
};
export function colorFamily(color: string): string | null {
  const c = normalize(color);
  // Multi-colour free text does not become a confident palette guess.
  if (/\be\b|\/|,/.test(c)) return null;
  return (
    Object.entries(families).find(([, words]) =>
      words.some((w) => c === w || c.startsWith(`${w} `)),
    )?.[0] || null
  );
}
export function itemTraits(item: WardrobeItem, e: Evolution): StyleTraits {
  const t = readTraits(e.details[item.id]?.styling);
  if (t.volume === 'unknown') {
    if (['oversized', 'baggy', 'baloon', 'boxy'].includes(item.fit || ''))
      return { ...t, volume: 'roomy' };
    if (item.fit === 'normal') return { ...t, volume: 'straight' };
  }
  return t;
}
export type WishMatch = {
  key: string;
  title: string;
  items: WardrobeItem[];
  reasons: string[];
  missing: SlotRole[];
};
type Candidate = { items: WardrobeItem[]; score: number; missing: SlotRole[]; reasons: string[] };
function evaluate(
  wish: Wish,
  items: WardrobeItem[],
  e: Evolution,
): Pick<Candidate, 'score' | 'reasons'> {
  const wt = readTraits(wish.styling),
    family = colorFamily(wish.color),
    ownFamilies = items.map((i) => colorFamily(i.color));
  let score = 0;
  const reasons: string[] = [];
  if (family && ownFamilies.includes(family)) {
    score += 3;
    reasons.push('Uma cor se repete e aproxima as peças.');
  }
  if (ownFamilies.includes('neutral')) {
    score += 2;
    reasons.push('Uma base neutra deixa espaço para a peça que chamou sua atenção.');
  }
  const strong = new Set([family, ...ownFamilies].filter((f) => f && f !== 'neutral'));
  if (strong.size > 2) score -= 2;
  const traits = items.map((i) => itemTraits(i, e));
  if (wt.volume === 'roomy' && traits.some((t) => t.volume === 'slim' || t.volume === 'straight')) {
    score += 3;
    reasons.push('A modelagem ampla encontra uma peça mais reta na composição.');
  }
  if (wt.volume === 'slim' && traits.some((t) => t.volume === 'roomy')) {
    score += 3;
    reasons.push('A mistura de uma peça ajustada com outra ampla muda a proporção.');
  }
  if (wt.texture === 'print' && traits.some((t) => t.texture === 'smooth')) {
    score += 2;
    reasons.push('A peça lisa dá espaço para a estampa aparecer.');
  } else if (
    wt.texture !== 'unknown' &&
    traits.some((t) => t.texture !== 'unknown' && t.texture !== wt.texture)
  ) {
    score += 1;
    reasons.push('Texturas diferentes acrescentam contraste sem depender só da cor.');
  }
  if (wt.occasion !== 'any') {
    const compatible = traits.filter((t) => t.occasion === wt.occasion).length;
    score += compatible * 3;
    score -= traits.filter((t) => t.occasion !== 'any' && t.occasion !== wt.occasion).length;
    if (compatible) reasons.push('Há peças marcadas por você para a mesma ocasião.');
  }
  if (!reasons.length)
    reasons.push('Uma base para experimentar com as peças disponíveis no seu closet.');
  return { score, reasons: reasons.slice(0, 3) };
}
export function wishMatches(wish: Wish, data: StudioData, e: Evolution): WishMatch[] {
  const own = availableItems(data, e),
    role = roleOf(wish.category);
  const essential: SlotRole[] =
    role === 'onepiece'
      ? []
      : role === 'top'
        ? ['bottom']
        : role === 'bottom'
          ? ['top']
          : ['top', 'bottom'];
  const slots = [...essential, ...(role === 'shoes' ? [] : ['shoes' as const])];
  let pool: Candidate[] = [{ items: [], score: 0, missing: [], reasons: [] }];
  for (const slot of slots) {
    const options = own
      .filter((i) => roleOf(i.category) === slot)
      .sort(
        (a, b) =>
          evaluate(wish, [b], e).score - evaluate(wish, [a], e).score || a.id.localeCompare(b.id),
      )
      .slice(0, 8);
    pool = options.length
      ? pool.flatMap((c) => options.map((item) => ({ ...c, items: [...c.items, item] })))
      : pool.map((c) => ({ ...c, missing: [...c.missing, slot] }));
  }
  // A dress/jumpsuit can also be the base for a shoe, layer or accessory wish.
  if (['shoes', 'layer', 'accessory'].includes(role)) {
    const shoes =
      role === 'shoes' ? [] : own.filter((i) => roleOf(i.category) === 'shoes').slice(0, 4);
    for (const item of own.filter((i) => roleOf(i.category) === 'onepiece').slice(0, 8)) {
      if (shoes.length)
        pool.push(
          ...shoes.map((shoe) => ({ items: [item, shoe], score: 0, missing: [], reasons: [] })),
        );
      else
        pool.push({
          items: [item],
          score: 0,
          missing: role === 'shoes' ? [] : ['shoes'],
          reasons: [],
        });
    }
  }
  pool = pool.filter((c) => c.items.length).map((c) => ({ ...c, ...evaluate(wish, c.items, e) }));
  const picked: WishMatch[] = [];
  for (let n = 0; n < 3 && pool.length; n++) {
    pool.sort(
      (a, b) =>
        a.missing.length - b.missing.length ||
        b.score -
          picked.reduce(
            (penalty, p) =>
              penalty + b.items.filter((i) => p.items.some((j) => j.id === i.id)).length * 3,
            0,
          ) -
          (a.score -
            picked.reduce(
              (penalty, p) =>
                penalty + a.items.filter((i) => p.items.some((j) => j.id === i.id)).length * 3,
              0,
            )) ||
        a.items
          .map((i) => i.id)
          .join()
          .localeCompare(b.items.map((i) => i.id).join()),
    );
    const c = pool.shift()!,
      key = c.items
        .map((i) => i.id)
        .sort()
        .join(':');
    if (picked.some((p) => p.key === key)) {
      n--;
      continue;
    }
    picked.push({
      key,
      title: ['Um ponto de partida', 'Outra possibilidade', 'Mude um pouco o caminho'][
        picked.length
      ]!,
      items: c.items,
      reasons: c.reasons,
      missing: c.missing,
    });
  }
  return picked;
}
