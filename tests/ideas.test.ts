import { describe, expect, it } from 'vitest';
import { inGroup } from '@/lib/item-groups';
import { filterCachedItems } from '@/lib/validation';
import { outfitCost, priceCents, planDate, studioStats, suggestions } from '@/preview/model';
import type { WardrobeItem } from '@/types/domain';
import type { StudioData } from '@/preview/types';
const item = (
  id: string,
  category: WardrobeItem['category'],
  extra: Partial<WardrobeItem> = {},
): WardrobeItem => ({
  id,
  category,
  user_id: 'u',
  name: id,
  color: 'Branco',
  size: 'M',
  fit: null,
  brand: null,
  photo_path: null,
  archived_at: null,
  created_at: '2026-10-06T12:00:00Z',
  last_worn_date: null,
  ...extra,
});
describe('broad filters', () => {
  it('combines groups with search, category and archive state', () => {
    const rows = [
      item('top', 'camiseta'),
      item('bottom', 'calca'),
      item('archived', 'camiseta', { archived_at: '2026-01-01' }),
    ];
    expect(
      filterCachedItems(rows, {
        search: 'branco',
        category: null,
        group: 'tops',
        archived: false,
      }).map((i) => i.id),
    ).toEqual(['top']);
    expect(
      filterCachedItems(rows, { search: '', category: 'calca', group: 'tops', archived: true }),
    ).toEqual([]);
    expect(inGroup('bone_aba_curta', 'accessories')).toBe(true);
    expect(inGroup('outro', 'tops')).toBe(false);
  });
});
describe('style suggestions', () => {
  const rows = [
    item('tee', 'camiseta'),
    item('shirt', 'camisa'),
    item('jeans', 'calca'),
    item('shorts', 'jorts'),
    item('shoe', 'tenis'),
    item('layer', 'outro', { name: 'Tricô' }),
    item('hidden', 'polo', { archived_at: '2026-01-01' }),
  ];
  it('changes clothing choices for weather and work without using archived items', () => {
    expect(suggestions(rows, 'warm', 'casual')[0]?.map((i) => i.id)).toEqual([
      'tee',
      'shorts',
      'shoe',
    ]);
    expect(suggestions(rows, 'cool', 'work')[0]?.map((i) => i.id)).toEqual([
      'shirt',
      'jeans',
      'shoe',
      'layer',
    ]);
    expect(
      suggestions(rows, 'mild', 'work')
        .flat()
        .some((i) => i.id === 'hidden'),
    ).toBe(false);
    expect(suggestions([rows[0]!], 'mild', 'casual')).toEqual([]);
  });
  it('never uses the same item twice and remains within owned pieces', () => {
    for (const look of suggestions(rows, 'cool', 'casual')) {
      expect(new Set(look.map((i) => i.id)).size).toBe(look.length);
      expect(look.every((i) => rows.includes(i))).toBe(true);
    }
  });
});
describe('prices and planning dates', () => {
  it('keeps zero distinct from missing values and uses integer cents', () => {
    expect(priceCents('129,90')).toBe(12990);
    expect(priceCents('0')).toBe(0);
    expect(priceCents('')).toBeNull();
    for (const invalid of ['-10', '1.000,00', '12,345', 'NaN', 'Infinity'])
      expect(() => priceCents(invalid)).toThrow();
    expect(outfitCost(['a', 'a', 'b', 'c'], { a: 1000, b: 0 })).toEqual({
      total: 1000,
      known: 2,
      count: 3,
      complete: false,
    });
    expect(outfitCost(['a', 'b'], { a: 1000, b: 0 }).complete).toBe(true);
  });
  it('allows valid future planning but rejects impossible dates', () => {
    expect(planDate('31/12/2027')).toBe('2027-12-31');
    expect(() => planDate('31/02/2027')).toThrow();
    expect(() => planDate('12-04-2027')).toThrow();
  });
});
describe('statistics', () => {
  it('counts actual uses once and does not count future plans as wear', () => {
    const top = item('top', 'camiseta'),
      bottom = item('bottom', 'calca');
    const outfit = {
      id: 'look',
      user_id: 'u',
      name: 'Look',
      photo_path: null,
      created_at: '',
      items: [top, bottom],
      last_worn_date: null,
    };
    const log = {
      id: 'log',
      user_id: 'u',
      outfit_id: 'look',
      worn_date: '2026-10-05',
      notes: null,
      created_at: '',
    };
    const data: StudioData = {
      items: [top, bottom],
      outfits: [outfit],
      wear: [log, { ...log, id: 'duplicate' }, { ...log, id: 'future', worn_date: '2026-10-07' }],
      prices: { top: 1000 },
      favorite_items: ['bottom'],
      favorite_outfits: [],
      plans: [
        {
          id: 'plan',
          date: '2026-10-07',
          end_date: '2026-10-07',
          title: 'Amanhã',
          kind: 'day',
          outfit_ids: ['look'],
          item_ids: [],
          notes: '',
          reminder: true,
        },
      ],
    };
    const result = studioStats(data, '2026-10-06');
    expect(result.totalUses).toBe(1);
    expect(result.itemUses).toEqual({ top: 1, bottom: 1 });
    expect(result.weekCount).toBe(1);
    expect(result.value).toBe(1000);
    expect(result.priced).toHaveLength(1);
  });
});
