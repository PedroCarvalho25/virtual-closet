import { describe, expect, it } from 'vitest';
import { assertPastDate, civilDate, monthBounds, monthCells, parseCivil } from '@/lib/dates';
import {
  filterCachedItems,
  normalizeItem,
  searchExpression,
  validateSelection,
} from '@/lib/validation';
import type { ItemInput, WardrobeItem } from '@/types/domain';
import { validSupabaseConfig } from '@/lib/config';
const input: ItemInput = {
  name: ' Tênis branco ',
  category: 'tenis',
  color: ' Branco ',
  size: ' 40 BR ',
  fit: 'boxy',
  brand: '',
};
describe('safe public configuration', () => {
  it('rejects missing config, malformed URLs and privileged keys', () => {
    expect(validSupabaseConfig('', '')).toBe(false);
    expect(validSupabaseConfig('https://example.supabase.co', 'sb_secret_not_for_clients')).toBe(
      false,
    );
    const jwt = (role: string) =>
      `eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify({ role })).toString('base64url')}.test`;
    expect(validSupabaseConfig('https://example.supabase.co', jwt('service_role'))).toBe(false);
    expect(validSupabaseConfig('https://example.supabase.co', jwt('anon'))).toBe(true);
  });
});
describe('item invariants and search', () => {
  it('clears fit when switching to sneakers and trims required values', () =>
    expect(normalizeItem(input)).toEqual({
      name: 'Tênis branco',
      category: 'tenis',
      color: 'Branco',
      size: '40 BR',
      fit: null,
      brand: null,
    }));
  it.each(['name', 'color', 'size'] as const)('rejects blank %s', (field) =>
    expect(() => normalizeItem({ ...input, [field]: '  ' })).toThrow(),
  );
  it('keeps the specified baloon enum', () =>
    expect(normalizeItem({ ...input, category: 'calca', fit: 'baloon' }).fit).toBe('baloon'));
  it('requires a nonempty distinct selection', () => {
    expect(() => validateSelection([])).toThrow();
    expect(() => validateSelection(['a', 'a'])).toThrow();
    expect(() => validateSelection(['a', 'b'])).not.toThrow();
  });
  it('combines name/color, category and archive filters offline', () => {
    const data = [
      { ...input, id: 'a', name: 'Tênis', category: 'tenis', color: 'Branco', archived_at: null },
      { ...input, id: 'b', name: 'Camisa', category: 'camisa', color: 'Branco', archived_at: null },
      {
        ...input,
        id: 'c',
        name: 'Tênis',
        category: 'tenis',
        color: 'Branco',
        archived_at: '2026-01-01',
      },
    ] as WardrobeItem[];
    expect(
      filterCachedItems(data, { search: 'branco', category: 'tenis', archived: false }).map(
        (i) => i.id,
      ),
    ).toEqual(['a']);
    expect(
      filterCachedItems(data, { search: 'branco', category: 'tenis', archived: true }).map(
        (i) => i.id,
      ),
    ).toEqual(['a', 'c']);
  });
  it('quotes user input as a PostgREST value, escaping wildcards and quotes', () => {
    expect(searchExpression('blue,red')).toBe('name.ilike."%blue,red%",color.ilike."%blue,red%"');
    expect(searchExpression('100%_"')).toBe(
      'name.ilike."%100\\%\\_\\"%",color.ilike."%100\\%\\_\\"%"',
    );
  });
});
describe('local civil dates', () => {
  it.each(['America/Sao_Paulo', 'Pacific/Kiritimati', 'America/Los_Angeles', 'Pacific/Pago_Pago'])(
    'preserves selected dates in %s',
    (zone) => {
      const original = process.env.TZ;
      process.env.TZ = zone;
      try {
        for (const value of ['2024-02-29', '2026-01-01', '2026-12-31', '2026-03-08', '2026-11-01'])
          expect(civilDate(parseCivil(value))).toBe(value);
      } finally {
        process.env.TZ = original;
      }
    },
  );
  it('rejects impossible and future dates', () => {
    expect(() => parseCivil('2025-02-29')).toThrow();
    expect(() => parseCivil('2026-13-01')).toThrow();
    expect(() => assertPastDate('2026-10-06', '2026-10-05')).toThrow();
    expect(() => assertPastDate('2026-10-05', '2026-10-05')).not.toThrow();
  });
  it('builds leap February and month/year boundaries without UTC conversion', () => {
    expect(monthBounds(new Date(2024, 1, 15))).toEqual(['2024-02-01', '2024-02-29']);
    expect(monthCells(new Date(2024, 1, 1)).filter(Boolean)).toHaveLength(29);
    expect(monthBounds(new Date(2026, 12, 1))).toEqual(['2027-01-01', '2027-01-31']);
  });
});
