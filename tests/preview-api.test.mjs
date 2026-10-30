import { describe, expect, it } from 'vitest';
import { createPreviewData } from '../scripts/preview-fixtures.mjs';
const url = new URL('https://closet-test.supabase.co/preview/v1/studio');
describe('isolated ideas fixture', () => {
  it('saves and edits plans without creating wear, and deletes only the plan', async () => {
    const api = createPreviewData();
    const before = (await api.handle(url, 'GET', null, {})).data;
    const wearCount = before.wear.length;
    const plan = {
      title: 'Viagem teste',
      date: '2027-01-10',
      end_date: '2027-01-12',
      kind: 'trip',
      outfit_ids: [before.outfits[0].id],
      item_ids: [],
      notes: '',
      reminder: true,
    };
    const saved = await api.handle(url, 'POST', { action: 'plan', plan }, {});
    expect(saved.status).toBe(200);
    const record = saved.data.plans.find((p) => p.title === 'Viagem teste');
    expect(record).toBeTruthy();
    expect(saved.data.wear).toHaveLength(wearCount);
    const invalid = await api.handle(
      url,
      'POST',
      { action: 'plan', plan: { ...plan, date: '2027-02-30' } },
      {},
    );
    expect(invalid.status).toBe(400);
    expect(
      (
        await api.handle(
          url,
          'POST',
          { action: 'plan', plan: { ...plan, outfit_ids: ['missing'] } },
          {},
        )
      ).status,
    ).toBe(400);
    const removed = await api.handle(url, 'POST', { action: 'remove_plan', id: record.id }, {});
    expect(removed.data.plans.some((p) => p.id === record.id)).toBe(false);
    expect(removed.data.wear).toHaveLength(wearCount);
  });
  it('validates prices and keeps explicit zero, missing and favorites independent of usage', async () => {
    const api = createPreviewData();
    const before = (await api.handle(url, 'GET', null, {})).data;
    const id = before.items[0].id;
    expect((await api.handle(url, 'POST', { action: 'price', id, cents: -1 }, {})).status).toBe(
      400,
    );
    expect(
      (await api.handle(url, 'POST', { action: 'price', id, cents: 0 }, {})).data.prices[id],
    ).toBe(0);
    expect(
      (await api.handle(url, 'POST', { action: 'price', id, cents: null }, {})).data.prices[id],
    ).toBeUndefined();
    const saved = await api.handle(url, 'POST', { action: 'favorite_item', id }, {});
    expect(saved.data.favorite_items).toContain(id);
    expect(saved.data.wear.length).toBe(before.wear.length);
  });
});
