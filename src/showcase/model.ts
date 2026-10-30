import catalog from './catalog.json';
import type { ItemInput } from '@/types/domain';
export const showcaseUsername = 'oarmandopintoofc';
export const showcaseKey = 'closet_showcase_v1';
export const showcaseItems = catalog.items as (ItemInput & {
  key: string;
  credit: string;
  source: string;
  license: string;
})[];
export const showcaseLooks = catalog.looks;
export const exampleFollowers = [
  ['nina.cor', 'Nina Cor', 'Cor e alfaiataria'],
  ['teo.linha', 'Teo Linha', 'Jeans e camadas'],
  ['maya.trama', 'Maya Trama', 'Texturas naturais'],
  ['leo.forma', 'Leo Forma', 'Minimalismo'],
  ['bia.tintura', 'Bia Tintura', 'Vintage e garimpo'],
  ['noa.estampa', 'Noa Estampa', 'Estampas gráficas'],
  ['rui.corte', 'Rui Corte', 'Proporção e volume'],
  ['lia.fio', 'Lia Fio', 'Tricô e conforto'],
  ['caio.tom', 'Caio Tom', 'Tons terrosos'],
  ['iris.dobra', 'Íris Dobra', 'Silhuetas amplas'],
  ['lu.azul', 'Lu Azul', 'Denim'],
  ['dani.ritmo', 'Dani Ritmo', 'Urbano e movimento'],
].map(([key, name, style], index) => ({
  id: `demo.${key}`,
  name: name!,
  style: style!,
  tone: (['olive', 'clay', 'lemon'] as const)[index % 3]!,
}));
export type ShowcaseState = {
  version: 1;
  owner: string;
  anchor: string;
  completed: boolean;
  followers: boolean;
  hiddenFollowers: string[];
};
export function readShowcase(
  metadata: Record<string, unknown> | undefined,
  owner: string | undefined,
): ShowcaseState | null {
  const raw = metadata?.[showcaseKey] as Partial<ShowcaseState> | undefined;
  if (
    !owner ||
    !raw ||
    raw.version !== 1 ||
    raw.owner !== owner ||
    typeof raw.anchor !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(raw.anchor)
  )
    return null;
  return {
    version: 1,
    owner,
    anchor: raw.anchor,
    completed: raw.completed === true,
    followers: raw.followers === true,
    hiddenFollowers: Array.isArray(raw.hiddenFollowers)
      ? raw.hiddenFollowers.filter((v) => typeof v === 'string')
      : [],
  };
}
export function visibleFollowers(state: ShowcaseState | null) {
  return state?.completed && state.followers
    ? exampleFollowers.filter((p) => !state.hiddenFollowers.includes(p.id))
    : [];
}
