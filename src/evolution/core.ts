import { validTraits } from '../style/traits.ts';
import type { StudioData } from '../preview/types';
import type { Evolution, EvolutionAction, Recipe, SlotRole, Suggestion, Wish } from './types';

import { categories as categoryLabels } from '../types/domain.ts';
const categories = Object.keys(categoryLabels);
const states = ['available', 'dirty', 'washing', 'repair', 'lent', 'stored', 'selling', 'donating'];
const normalize = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
const text = (s: unknown, max: number) => typeof s === 'string' && s.length <= max;
function date(s: unknown) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T12:00:00Z`);
  return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === s;
}
export function sourceLink(value: string) {
  if (!value.trim()) return '';
  let u: URL;
  try {
    u = new URL(value.trim());
  } catch {
    throw new Error('Use um link completo começando com https://.');
  }
  assert(
    u.protocol === 'https:' && !u.username && !u.password && value.length <= 1000,
    'Use um link https:// sem dados de acesso.',
  );
  return u.href;
}
export function roleOf(category: string): SlotRole {
  if (['camiseta', 'regata', 'camisa', 'polo', 'blusa', 'moletom', 'trico'].includes(category))
    return 'top';
  if (['calca', 'bermuda', 'jorts', 'saia'].includes(category)) return 'bottom';
  if (['tenis', 'bota', 'sandalia', 'sapato'].includes(category)) return 'shoes';
  if (['vestido', 'macacao'].includes(category)) return 'onepiece';
  if (category.startsWith('bone_') || ['bolsa', 'cinto', 'joia', 'lenco'].includes(category))
    return 'accessory';
  return 'layer';
}
export function applyEvolution(
  data: StudioData,
  initial: Evolution,
  action: EvolutionAction,
  today: string,
): Evolution {
  const e = JSON.parse(JSON.stringify(initial)) as Evolution;
  const ownItem = (id: string) => data.items.some((i) => i.id === id);
  const ownOutfit = (id: string) => data.outfits.some((o) => o.id === id);
  const ids = (values: string[], check: (id: string) => boolean, max = 100) =>
    Array.isArray(values) &&
    values.length <= max &&
    new Set(values).size === values.length &&
    values.every(check);
  switch (action.action) {
    case 'profile': {
      const p = action.profile;
      assert(
        p &&
          text(p.name, 80) &&
          text(p.city, 100) &&
          ['comfortable', 'clean', 'expressive'].includes(p.feeling) &&
          ['neutral', 'cold', 'warm'].includes(p.thermal) &&
          ['outside', 'inside', 'aircon'].includes(p.environment) &&
          [0, 1, 2].includes(p.boldness) &&
          (p.haptics === undefined || typeof p.haptics === 'boolean') &&
          [p.avoidRecent, p.challenges, p.noBuy].every((v) => typeof v === 'boolean'),
        'Confira suas preferências.',
      );
      e.profile = { ...p, name: p.name.trim(), city: p.city.trim() };
      break;
    }
    case 'item_detail': {
      const d = action.detail;
      assert(
        ownItem(action.id) &&
          d &&
          (d.styling === undefined || validTraits(d.styling)) &&
          states.includes(d.state) &&
          text(d.location, 80) &&
          text(d.story, 1000) &&
          text(d.care, 300) &&
          text(d.loanTo, 80) &&
          (d.returnDate === null || date(d.returnDate)) &&
          (!d.careReminderDate || date(d.careReminderDate)) &&
          (d.weightGrams === null ||
            (Number.isInteger(d.weightGrams) && d.weightGrams >= 0 && d.weightGrams <= 50000)),
        'Confira os detalhes da peça.',
      );
      e.details[action.id] = d;
      break;
    }
    case 'recipe': {
      const r = action.recipe;
      assert(
        r &&
          text(r.id, 36) &&
          text(r.title, 80) &&
          r.title.trim() &&
          text(r.folder, 50) &&
          text(r.note, 500) &&
          Array.isArray(r.slots) &&
          r.slots.length >= 1 &&
          r.slots.length <= 8 &&
          r.slots.every(
            (s) =>
              ['top', 'bottom', 'layer', 'shoes', 'accessory', 'onepiece'].includes(s.role) &&
              categories.includes(s.category) &&
              roleOf(s.category) === s.role &&
              text(s.color, 50),
          ),
        'Confira o título e as peças da inspiração.',
      );
      r.source = sourceLink(r.source);
      e.recipes = e.recipes.filter((x) => x.id !== r.id);
      e.recipes.unshift(r);
      break;
    }
    case 'wish': {
      const w = action.wish;
      assert(
        w &&
          text(w.id, 36) &&
          text(w.title, 80) &&
          w.title.trim() &&
          categories.includes(w.category) &&
          text(w.color, 50) &&
          text(w.note, 500) &&
          (w.price === null ||
            (Number.isSafeInteger(w.price) && w.price >= 0 && w.price <= 100000000)) &&
          (w.reflectUntil === null || date(w.reflectUntil)),
        'Confira os dados do desejo.',
      );
      assert(w.styling === undefined || validTraits(w.styling), 'Confira os detalhes de estilo.');
      const old = e.wishes.find((x) => x.id === w.id);
      assert(
        w.revision === undefined
          ? old?.revision === undefined
          : Number.isSafeInteger(w.revision) && w.revision === (old?.revision || 0),
        'Este desejo mudou. Atualize antes de salvar.',
      );
      if (w.media !== undefined) {
        assert(
          w.media &&
            typeof w.media === 'object' &&
            !Array.isArray(w.media) &&
            Object.keys(w.media).every((k) => ['publicationId', 'photoPath'].includes(k)),
          'Confira a foto do desejo.',
        );
        assert(
          w.media.publicationId == null ||
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
              w.media.publicationId,
            ),
          'Referência inválida.',
        );
        assert(
          w.media.photoPath == null ||
            (typeof w.media.photoPath === 'string' &&
              w.media.photoPath.length <= 1000 &&
              !w.media.photoPath.includes('..')),
          'Foto inválida.',
        );
      }
      w.revision = (old?.revision || 0) + 1;
      w.source = sourceLink(w.source);
      e.wishes = e.wishes.filter((x) => x.id !== w.id);
      e.wishes.unshift(w);
      break;
    }
    case 'remove_recipe':
      e.recipes = e.recipes.filter((x) => x.id !== action.id);
      break;
    case 'remove_wish':
      e.wishes = e.wishes.filter((x) => x.id !== action.id);
      break;
    case 'feedback': {
      const f = action.feedback;
      assert(
        f &&
          ownOutfit(f.outfitId) &&
          date(f.date) &&
          f.date <= today &&
          data.wear.some((w) => w.outfit_id === f.outfitId && w.worn_date === f.date) &&
          [f.comfort, f.confidence, f.weather, f.occasion, f.again].every(
            (v) => typeof v === 'boolean',
          ) &&
          text(f.note, 300),
        'O feedback precisa de um uso registrado nessa data.',
      );
      e.feedback = e.feedback.filter((x) => !(x.outfitId === f.outfitId && x.date === f.date));
      e.feedback.unshift(f);
      break;
    }
    case 'decision': {
      const d = action.decision;
      assert(
        d &&
          ids(d.itemIds, ownItem, 30) &&
          d.itemIds.length > 0 &&
          (!d.outfitId || ownOutfit(d.outfitId)) &&
          (!d.recipeId || e.recipes.some((r) => r.id === d.recipeId)) &&
          date(d.date) &&
          d.date <= today &&
          ['accepted', 'rejected', 'lab'].includes(d.kind) &&
          text(d.reason, 100),
        'Não foi possível guardar essa escolha.',
      );
      assert(
        d.kind !== 'lab' ||
          (d.date === today &&
            e.decisions.filter((x) => x.kind === 'lab' && x.date === today && x.id !== d.id)
              .length < 3),
        'Você já completou as três escolhas de hoje.',
      );
      e.decisions = e.decisions.filter((x) => x.id !== d.id);
      e.decisions.unshift(d);
      e.decisions = e.decisions.slice(0, 500);
      break;
    }
    case 'clear_learning':
      e.feedback = [];
      e.decisions = [];
      break;
    case 'plan_detail': {
      const d = action.detail,
        p = data.plans.find((p) => p.id === action.id);
      assert(
        p &&
          d &&
          ids(d.packed, ownItem) &&
          ids(d.backupOutfitIds, ownOutfit, 30) &&
          Array.isArray(d.tasks) &&
          d.tasks.length <= 30 &&
          d.tasks.every((t) => text(t, 100)) &&
          d.days &&
          Object.entries(d.days).every(
            ([day, outfits]) =>
              date(day) && day >= p.date && day <= p.end_date && ids(outfits, ownOutfit, 30),
          ),
        'Confira as datas, peças e alternativas da viagem.',
      );
      assert(
        !d.activities ||
          (Object.keys(d.activities).length <= 366 &&
            Object.entries(d.activities).every(
              ([day, activity]) =>
                date(day) && day >= p.date && day <= p.end_date && text(activity, 240),
            )),
        'Confira as atividades e datas da viagem.',
      );
      const packing = new Set([
        ...p.item_ids,
        ...data.outfits
          .filter((o) =>
            [...p.outfit_ids, ...d.backupOutfitIds, ...Object.values(d.days).flat()].includes(o.id),
          )
          .flatMap((o) => o.items.map((i) => i.id)),
      ]);
      assert(
        d.packed.every((id) => packing.has(id)),
        'Somente peças desta mala podem ser marcadas.',
      );
      e.planDetails[action.id] = d;
      break;
    }
  }
  return e;
}
export function availableItems(data: StudioData, e: Evolution) {
  return data.items.filter(
    (i) => !i.archived_at && (!e.details[i.id] || e.details[i.id]?.state === 'available'),
  );
}
function itemCounts(data: StudioData) {
  const counts = new Map<string, number>(),
    looks = new Map(data.outfits.map((o) => [o.id, o]));
  for (const w of data.wear) {
    for (const id of new Set(looks.get(w.outfit_id)?.items.map((i) => i.id))) {
      counts.set(id, (counts.get(id) || 0) + 1);
    }
  }
  return counts;
}
export function dailySuggestions(
  data: StudioData,
  e: Evolution,
  mood: string,
  occasion: string,
  today: string,
): Suggestion[] {
  const items = availableItems(data, e),
    counts = itemCounts(data),
    favorites = new Set(data.favorite_items);
  const learned = new Map<string, number>();
  for (const f of e.feedback) {
    const o = data.outfits.find((o) => o.id === f.outfitId);
    for (const i of o?.items || [])
      learned.set(i.id, (learned.get(i.id) || 0) + (f.again ? 2 : -1) + (f.comfort ? 1 : -1));
  }
  for (const d of e.decisions.slice(0, 80))
    for (const id of d.itemIds)
      learned.set(id, (learned.get(id) || 0) + (d.kind === 'rejected' ? -1 : 1));
  const recent = new Date(`${today}T12:00:00Z`);
  recent.setUTCDate(recent.getUTCDate() - 3);
  const since = recent.toISOString().slice(0, 10);
  const neutrals = new Set(['branco', 'preto', 'cinza', 'bege', 'marrom', 'off-white']);
  const feelingScore = (i: (typeof items)[number]) =>
    e.profile.feeling === 'clean'
      ? neutrals.has(normalize(i.color))
        ? 2
        : 0
      : e.profile.feeling === 'expressive'
        ? !neutrals.has(normalize(i.color))
          ? 2
          : 0
        : ['camiseta', 'regata', 'bermuda', 'jorts', 'tenis'].includes(i.category)
          ? 1
          : 0;
  const rank = (i: (typeof items)[number]) =>
    (favorites.has(i.id) ? 3 : 0) +
    feelingScore(i) +
    Math.max(-6, Math.min(6, learned.get(i.id) || 0)) +
    (occasion === 'work' && ['camisa', 'polo'].includes(i.category) ? 5 : 0) -
    (e.profile.avoidRecent && i.last_worn_date && i.last_worn_date >= since ? 3 : 0);
  const role = (r: SlotRole) =>
    items
      .filter((i) => roleOf(i.category) === r)
      .sort((a, b) => rank(b) - rank(a) || a.id.localeCompare(b.id));
  const tops = role('top').slice(0, 12),
    bottoms = role('bottom')
      .sort(
        (a, b) =>
          ((
            mood === 'warm' || (mood === 'mild' && e.profile.thermal === 'warm')
              ? a.category === 'calca'
              : a.category !== 'calca'
          )
            ? 1
            : 0) -
          ((
            mood === 'warm' || (mood === 'mild' && e.profile.thermal === 'warm')
              ? b.category === 'calca'
              : b.category !== 'calca'
          )
            ? 1
            : 0),
      )
      .slice(0, 12),
    shoes = role('shoes');

  const withLayer =
    mood === 'cool' || e.profile.thermal === 'cold' || e.profile.environment === 'aircon';
  const variants = tops.flatMap((t) =>
    bottoms.map((b) => [
      t,
      b,
      ...shoes.slice(0, 1),
      ...(withLayer ? role('layer').slice(0, 1) : []),
    ]),
  );
  variants.push(
    ...role('onepiece')
      .slice(0, 12)
      .map((one) => [one, ...shoes.slice(0, 1), ...(withLayer ? role('layer').slice(0, 1) : [])]),
  );
  if (!variants.length) return [];
  const safe = variants[0]!;
  const differences = (v: typeof safe) => v.filter((i) => !safe.some((x) => x.id === i.id)).length;
  const creative =
    variants.find((v) => differences(v) === (e.profile.boldness === 2 ? 2 : 1)) ||
    variants.find((v) => differences(v) === 1) ||
    safe;
  const redisc = [...variants].sort(
    (a, b) =>
      Math.min(...a.map((i) => counts.get(i.id) || 0)) -
      Math.min(...b.map((i) => counts.get(i.id) || 0)),
  )[0]!;
  return [
    {
      kind: 'safe',
      title: 'Seu caminho seguro',
      items: safe,
      reasons: [
        'Peças disponíveis no seu closet',
        e.feedback.length || e.decisions.length
          ? 'Considera suas escolhas e seu feedback'
          : 'Um ponto de partida para conhecer seu estilo',
        ...(withLayer && role('layer').length
          ? ['Camada extra para o cenário escolhido']
          : withLayer
            ? ['Você pode cadastrar uma camada para este cenário']
            : []),
        `Preferência: ${e.profile.feeling === 'clean' ? 'cores discretas' : e.profile.feeling === 'expressive' ? 'mais cor' : 'base casual'}`,
      ],
    },
    {
      kind: 'creative',
      title: 'Uma pequena mudança',
      items: creative,
      reasons: [
        creative === safe
          ? 'Cadastre mais peças para variar esta composição'
          : `Varia ${differences(creative)} ${differences(creative) === 1 ? 'peça' : 'peças'} da composição`,
        `Ocasião: ${occasion === 'work' ? 'trabalho' : occasion === 'out' ? 'sair' : 'dia a dia'}`,
      ],
    },
    {
      kind: 'rediscover',
      title: 'Olhe de novo',
      items: redisc,
      reasons: [
        'Inclui uma peça com pouco ou nenhum uso registrado',
        'Planejar não conta como usar',
      ],
    },
  ];
}
export function remixRecipe(recipe: Recipe, data: StudioData, e: Evolution) {
  const available = availableItems(data, e),
    taken = new Set<string>();
  return recipe.slots.map((slot) => {
    const options = available
      .filter((i) => roleOf(i.category) === slot.role)
      .sort((a, b) => {
        const score = (i: typeof a) =>
          (i.category === slot.category ? 4 : 0) +
          (normalize(i.color) === normalize(slot.color) ? 3 : 0) +
          (data.favorite_items.includes(i.id) ? 1 : 0);
        return score(b) - score(a) || a.id.localeCompare(b.id);
      });
    const chosen = options.find((i) => !taken.has(i.id)) || null;
    if (chosen) taken.add(chosen.id);
    return { slot, chosen, options: options.slice(0, 3) };
  });
}
export function purchaseInsight(w: Wish, data: StudioData, e: Evolution) {
  const available = availableItems(data, e),
    role = roleOf(w.category);
  const similar = data.items.filter(
    (i) => !i.archived_at && i.category === w.category && normalize(i.color) === normalize(w.color),
  );
  const pairs = available.filter(
    (i) => roleOf(i.category) === (role === 'top' ? 'bottom' : role === 'bottom' ? 'top' : 'top'),
  );
  const bottoms = available.filter((i) => roleOf(i.category) === 'bottom');
  const potential =
    role === 'top' || role === 'bottom' ? pairs.length : pairs.length * bottoms.length;
  return {
    similar,
    potential,
    explanation:
      'Estimativa por categoria e disponibilidade; não mede harmonia visual nem garante que você usará todos os looks.',
  };
}
