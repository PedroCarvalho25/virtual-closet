import { beforeEach, describe, it, expect } from 'vitest';
import { createPreviewData } from '../scripts/preview-fixtures.mjs';
import {
  applyEvolution,
  dailySuggestions,
  purchaseInsight,
  remixRecipe,
  sourceLink,
} from '../src/evolution/core.ts';
import { emptyDetail } from '../src/evolution/types.ts';
let data, e;
beforeEach(async () => {
  const preview = createPreviewData();
  data = (
    await preview.handle(
      new URL('https://closet-test.supabase.co/preview/v1/studio'),
      'GET',
      null,
      {},
    )
  ).data;
  e = data.evolution;
});
describe('personal style rules', () => {
  it('excludes unavailable and archived pieces from all daily options and remix slots', () => {
    e.details[data.items[0].id] = { ...emptyDetail, state: 'washing' };
    const options = dailySuggestions(data, e, 'mild', 'casual', '2026-10-09');
    expect(options).toHaveLength(3);
    for (const option of options)
      expect(option.items.some((i) => i.id === data.items[0].id)).toBe(false);
    for (const slot of remixRecipe(e.recipes[0], data, e))
      expect(slot.options.some((i) => i.id === data.items[0].id)).toBe(false);
  });
  it('cannot attach metadata to a foreign item and leaves original data intact', () => {
    expect(() =>
      applyEvolution(
        data,
        e,
        { action: 'item_detail', id: 'foreign', detail: emptyDetail },
        '2026-10-09',
      ),
    ).toThrow();
    expect(e.details).toEqual({});
  });
  it('feedback requires an actual recorded use, never a plan', () => {
    const f = {
      id: 'id',
      outfitId: data.outfits[0].id,
      date: '2099-01-01',
      comfort: true,
      confidence: true,
      weather: true,
      occasion: true,
      again: true,
      note: '',
    };
    expect(() =>
      applyEvolution(data, e, { action: 'feedback', feedback: f }, '2026-10-09'),
    ).toThrow();
    const w = data.wear[0];
    const updated = applyEvolution(
      data,
      e,
      { action: 'feedback', feedback: { ...f, outfitId: w.outfit_id, date: w.worn_date } },
      '2099-01-01',
    );
    expect(updated.feedback).toHaveLength(1);
    expect(data.wear).toHaveLength(9);
  });
  it('clearing personalization preserves wardrobe, plans and preferences', () => {
    e.decisions = [{ id: 'x' }];
    e.feedback = [{ id: 'y' }];
    const updated = applyEvolution(data, e, { action: 'clear_learning' }, '2026-10-09');
    expect(updated.decisions).toEqual([]);
    expect(updated.feedback).toEqual([]);
    expect(updated.recipes).toEqual(e.recipes);
    expect(data.items).toHaveLength(7);
  });
  it('purchase candidates are category estimates and do not add a desired item to the closet', () => {
    const w = { category: 'camiseta', color: 'branco', price: 0 };
    const result = purchaseInsight(w, data, e);
    expect(result.similar.map((i) => i.name)).toContain('Camiseta essencial');
    expect(result.potential).toBe(2);
    expect(data.items).toHaveLength(7);
  });
  it('reference links reject executable schemes and embedded credentials', () => {
    for (const u of ['javascript:alert(1)', 'file:///etc/passwd', 'https://user:pass@example.com'])
      expect(() => sourceLink(u)).toThrow();
    expect(sourceLink('https://example.com/look')).toBe('https://example.com/look');
  });
  it('packing checks exclude pieces not in the event and days outside it', () => {
    const plan = data.plans[0];
    const detail = { packed: [data.items[5].id], backupOutfitIds: [], days: {}, tasks: [] };
    expect(() =>
      applyEvolution(data, e, { action: 'plan_detail', id: plan.id, detail }, '2026-10-09'),
    ).toThrow();
    detail.packed = [];
    detail.days = { '2099-01-01': [data.outfits[0].id] };
    expect(() =>
      applyEvolution(data, e, { action: 'plan_detail', id: plan.id, detail }, '2026-10-09'),
    ).toThrow();
  });
  it('records no more than 500 learning decisions', () => {
    e.decisions = Array.from({ length: 500 }, (_, i) => ({ id: String(i) }));
    const updated = applyEvolution(
      data,
      e,
      {
        action: 'decision',
        decision: {
          id: 'new',
          itemIds: [data.items[0].id],
          outfitId: null,
          recipeId: null,
          date: '2026-10-09',
          kind: 'lab',
          reason: 'A',
        },
      },
      '2026-10-09',
    );
    expect(updated.decisions).toHaveLength(500);
    expect(updated.decisions[0].id).toBe('new');
  });
});
