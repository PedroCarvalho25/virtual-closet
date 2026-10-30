import { describe, expect, it } from 'vitest';
import { firstLookJourney } from '@/evolution/first-use';
import { freshEvolution } from '@/evolution/types';
import type { StudioData } from '@/preview/types';
import type { WardrobeItem } from '@/types/domain';

function data(): StudioData {
  return {
    items: [],
    outfits: [],
    wear: [],
    favorite_items: [],
    favorite_outfits: [],
    prices: {},
    plans: [],
    evolution: freshEvolution(),
  };
}
function item(id: string, category: WardrobeItem['category']): WardrobeItem {
  return {
    id,
    user_id: 'A',
    name: id,
    category,
    color: 'Branco',
    size: 'M',
    fit: null,
    brand: null,
    photo_path: null,
    archived_at: null,
    created_at: '',
    last_worn_date: null,
  };
}
describe('first look follows saved user data', () => {
  it('starts light and does not mistake an inspiration for owned clothes', () => {
    const d = data();
    d.evolution!.recipes.push({
      id: 'recipe',
      title: 'Ideia',
      folder: '',
      source: '',
      note: '',
      slots: [{ role: 'top', category: 'camiseta', color: 'Branco' }],
    });
    expect(firstLookJourney(d, d.evolution!).next).toBe('top');
    expect(firstLookJourney(d, d.evolution!).completed).toBe(0);
  });
  it('resumes from available clothes and requires no ten-item threshold', () => {
    const d = data(),
      e = d.evolution!;
    d.items.push(item('top', 'camiseta'));
    expect(firstLookJourney(d, e).next).toBe('bottom');
    d.items.push(item('bottom', 'calca'));
    expect(firstLookJourney(d, e).next).toBe('combine');
    e.details.bottom = {
      state: 'washing',
      location: '',
      story: '',
      care: '',
      loanTo: '',
      returnDate: null,
      weightGrams: null,
    };
    expect(firstLookJourney(d, e).next).toBe('bottom');
  });
  it('saving a look or planning tomorrow does not complete a real use', () => {
    const d = data();
    d.items.push(item('top', 'camiseta'), item('bottom', 'calca'));
    d.outfits.push({
      id: 'look',
      user_id: 'A',
      name: 'Meu look',
      photo_path: null,
      created_at: '',
      items: d.items,
      last_worn_date: null,
    });
    d.plans.push({
      id: 'plan',
      title: 'Amanhã',
      date: '2027-01-01',
      end_date: '2027-01-01',
      kind: 'day',
      notes: '',
      outfit_ids: ['look'],
      item_ids: [],
      reminder: false,
    });
    expect(firstLookJourney(d, d.evolution!).next).toBe('wear');
    expect(firstLookJourney(d, d.evolution!).steps[3]).toBe(false);
    d.wear.push({
      id: 'use',
      user_id: 'A',
      outfit_id: 'look',
      worn_date: '2026-10-13',
      notes: null,
      created_at: '',
    });
    expect(firstLookJourney(d, d.evolution!).next).toBe('done');
  });
});
