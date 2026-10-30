import { describe, it, expect } from 'vitest';
import { wishMatches, colorFamily } from '../src/wishes/matches';
import { freshEvolution, emptyDetail, type Wish } from '../src/evolution/types';
import { applyEvolution } from '../src/evolution/core';
import type { WardrobeItem } from '../src/types/domain';
import type { StudioData } from '../src/preview/types';
const wish: Wish = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  title: 'Camisa verde',
  category: 'camisa',
  color: 'Verde',
  price: null,
  source: '',
  note: '',
  reflectUntil: null,
  revision: 0,
};
const item = (id: string, category: WardrobeItem['category'], color = 'Preto') =>
  ({ id, category, color, name: id, archived_at: null, fit: 'normal' }) as WardrobeItem;
const data = (items: WardrobeItem[]) =>
  ({ items, outfits: [], wear: [], plans: [], prices: {} }) as unknown as StudioData;
describe('wish combinations', () => {
  it('uses available owned garments, never replaces the wish with a duplicate top', () => {
    const e = freshEvolution();
    e.details.washing = { ...emptyDetail, state: 'washing' };
    const d = data([
      item('pants', 'calca'),
      item('washing', 'calca'),
      { ...item('archived', 'calca'), archived_at: '2026-10-01' },
      item('top', 'camisa'),
      item('shoes', 'tenis'),
    ]);
    expect(wishMatches(wish, d, e).map((m) => m.items.map((i) => i.id))).toEqual([
      ['pants', 'shoes'],
    ]);
  });
  it('returns distinct ideas and marks incomplete bases without making up clothes', () => {
    const e = freshEvolution(),
      d = data([item('a', 'calca'), item('b', 'calca', 'Azul'), item('c', 'saia', 'Verde')]);
    const results = wishMatches(wish, d, e);
    expect(results).toHaveLength(3);
    expect(new Set(results.map((m) => m.key)).size).toBe(3);
    expect(results.every((m) => m.missing.includes('shoes'))).toBe(true);
    expect(wishMatches(wish, data([]), e)).toEqual([]);
  });
  it('uses a dress as a complete base for a shoe wish', () => {
    const results = wishMatches(
      { ...wish, category: 'bota' },
      data([item('dress', 'vestido')]),
      freshEvolution(),
    );
    expect(results[0]?.items.map((i) => i.id)).toEqual(['dress']);
    expect(results[0]?.missing).toEqual([]);
  });
  it('keeps unknown and multi-colour palettes unknown and explains only declared traits', () => {
    expect(colorFamily('azul e verde')).toBeNull();
    expect(colorFamily('uma cor especial')).toBeNull();
    const e = freshEvolution();
    e.details.pants = {
      ...emptyDetail,
      styling: { volume: 'straight', texture: 'smooth', occasion: 'casual' },
    };
    const results = wishMatches(
      { ...wish, styling: { volume: 'roomy', texture: 'print', occasion: 'casual' } },
      data([item('pants', 'calca')]),
      e,
    );
    expect(results[0]?.reasons.join(' ')).toContain('modelagem ampla');
  });
  it('preserves visual fields and rejects stale revisions in local mode', () => {
    const e = freshEvolution(),
      d = data([]),
      media = { publicationId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' };
    const next = applyEvolution(d, e, { action: 'wish', wish: { ...wish, media } }, '2026-10-16');
    expect(next.wishes[0]).toMatchObject({ media, revision: 1 });
    expect(() =>
      applyEvolution(d, next, { action: 'wish', wish: { ...wish } }, '2026-10-16'),
    ).toThrow('mudou');
  });
});
