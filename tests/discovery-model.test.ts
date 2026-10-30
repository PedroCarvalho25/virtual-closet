import { describe, it, expect } from 'vitest';
import type { StudioData } from '../src/preview/types';
import { freshEvolution } from '../src/evolution/types';
import { personalDiscoveries, recipeVersions } from '../src/evolution/discovery-model';

const data = () =>
  ({
    items: [{ id: 'jeans' }],
    outfits: ['a', 'b', 'c'].map((id) => ({ id, items: [{ id: 'jeans' }] })),
    wear: [],
    plans: [{ outfit_ids: ['c'], date: '2027-01-02' }],
  }) as unknown as StudioData;
describe('personal discoveries use real history', () => {
  it('handles the year boundary and ignores future, old, duplicate, planned and missing outfits', () => {
    const d = data();
    d.wear = [
      ['a', '2026-12-29'],
      ['a', '2027-01-02'],
      ['b', '2026-12-28'],
      ['c', '2027-01-05'],
      ['missing', '2027-01-01'],
    ].map(([outfit_id, worn_date]) => ({ outfit_id, worn_date })) as StudioData['wear'];
    const result = personalDiscoveries(d, freshEvolution(), '2027-01-04');
    expect(result.since).toBe('2026-12-29');
    expect(result.variety).toBe(1);
    expect(result.reuse).toBe(1);
    expect(result.remixes).toBe(0);
  });
  it('counts three styles only when three different outfits were actually worn', () => {
    const d = data();
    d.wear = ['a', 'b', 'c'].map((outfit_id) => ({
      outfit_id,
      worn_date: '2027-01-04',
    })) as StudioData['wear'];
    expect(personalDiscoveries(d, freshEvolution(), '2027-01-04')).toMatchObject({
      variety: 3,
      reuse: 3,
      item: { id: 'jeans' },
    });
  });
  it('deduplicates remix origins and excludes removed outfits or rejected decisions', () => {
    const d = data(),
      e = freshEvolution();
    e.recipes = [{ id: 'recipe' }] as typeof e.recipes;
    e.decisions = [
      ['a', 'accepted'],
      ['a', 'accepted'],
      ['b', 'rejected'],
      ['deleted', 'accepted'],
    ].map(([outfitId, kind]) => ({ recipeId: 'recipe', outfitId, kind })) as typeof e.decisions;
    d.wear = [
      { outfit_id: 'a', worn_date: '2027-01-04' },
      { outfit_id: 'b', worn_date: '2027-01-04' },
    ] as StudioData['wear'];
    expect(recipeVersions(d, e, 'recipe').map((o) => o.id)).toEqual(['a']);
    expect(personalDiscoveries(d, e, '2027-01-04').remixes).toBe(1);
    d.wear = [];
    expect(personalDiscoveries(d, e, '2027-01-04').remixes).toBe(0);
    expect(recipeVersions(d, e, 'recipe').map((o) => o.id)).toEqual(['a']);
  });
});
