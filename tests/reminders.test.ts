import { describe, it, expect } from 'vitest';
import { reminderPlan } from '../src/lib/reminder-plan';
import type { OutfitPlan } from '../src/preview/types';
const plan = (id: string, date = '2027-01-02', reminder = true): OutfitPlan => ({
  id,
  title: 'Evento privado',
  kind: 'day',
  date,
  end_date: date,
  reminder,
  outfit_ids: [],
  item_ids: [],
  notes: '',
});
describe('local reminder scheduling', () => {
  it('uses local civil time across month boundaries and filters past dates', () => {
    const result = reminderPlan([plan('a', '2027-01-01')], 'owner', new Date(2026, 11, 30, 12));
    expect(
      result.map((r) => [r.at.getFullYear(), r.at.getMonth(), r.at.getDate(), r.at.getHours()]),
    ).toEqual([
      [2026, 11, 31, 18],
      [2027, 0, 1, 9],
    ]);
    expect(reminderPlan([plan('a')], 'owner', new Date(2027, 0, 2, 10))).toEqual([]);
  });
  it('ignores opt-outs and malformed civil dates', () => {
    expect(
      reminderPlan(
        [plan('a', '2027-02-30'), plan('b', '2027-01-02', false)],
        'owner',
        new Date(2026, 0, 1),
      ),
    ).toEqual([]);
  });
  it('limits upcoming requests and namespaces stable ids by account', () => {
    const plans = Array.from({ length: 30 }, (_, i) => plan(String(i)));
    const a = reminderPlan(plans, 'a', new Date(2026, 0, 1)),
      b = reminderPlan(plans, 'b', new Date(2026, 0, 1));
    expect(a).toHaveLength(48);
    expect(a.every((r) => r.id.startsWith('closet:a:'))).toBe(true);
    expect(a.some((r) => b.some((s) => s.id === r.id))).toBe(false);
  });
});
