import { describe, expect, it } from 'vitest';
import { createClosetCache, type CacheStorage } from '@/stores/cache-core';
import type { WardrobeItem } from '@/types/domain';
function storage(): CacheStorage & { values: Map<string, string> } {
  const values = new Map<string, string>();
  return {
    values,
    async getItem(key) {
      return values.get(key) || null;
    },
    async setItem(key, value) {
      values.set(key, value);
    },
    async removeItem(key) {
      values.delete(key);
    },
  };
}
function item(id: string, user_id = 'A'): WardrobeItem {
  return {
    id,
    user_id,
    name: 'Camisa',
    category: 'camisa',
    color: 'Branco',
    size: 'M',
    fit: null,
    brand: null,
    photo_path: null,
    archived_at: null,
    created_at: '2026-10-05T00:00:00Z',
    last_worn_date: null,
  };
}
describe('private, bounded offline cache', () => {
  it('does not replace a newer response with an older request in the same session', async () => {
    const cache = createClosetCache(storage());
    await cache.activate('A');
    const old = cache.token();
    const current = cache.token();
    cache.merge(current, { items: [{ ...item('1'), name: 'Newer response' }] });
    cache.merge(old, { items: [{ ...item('1'), name: 'Stale response' }] });
    expect(cache.store.getState().items[0]?.name).toBe('Newer response');
  });
  it('restores only the current user and format version', async () => {
    const disk = storage();
    const first = createClosetCache(disk);
    await first.activate('A');
    first.merge(first.token(), { items: [item('1')] });
    await first.settled();
    const restored = createClosetCache(disk);
    await restored.activate('A');
    expect(restored.store.getState().items).toHaveLength(1);
    await restored.activate('B');
    expect(restored.store.getState().items).toEqual([]);
    expect(disk.values.has('virtual-closet-cache-v1:A')).toBe(false);
  });
  it('rejects a late response from the previous account and clears persisted data on logout', async () => {
    const disk = storage();
    const cache = createClosetCache(disk);
    await cache.activate('A');
    const a = cache.token();
    cache.merge(a, { items: [item('1')] });
    await cache.activate('B');
    cache.merge(a, { items: [item('late')] });
    expect(cache.store.getState().items).toEqual([]);
    cache.merge(cache.token(), { items: [item('2', 'B')] });
    await cache.activate(null);
    await cache.settled();
    expect(cache.store.getState().items).toEqual([]);
    expect([...disk.values.keys()]).toEqual([]);
  });
  it('rejects a response started before a newer mutation', async () => {
    const cache = createClosetCache(storage());
    await cache.activate('A');
    const old = cache.token();
    cache.invalidate();
    cache.merge(cache.token(), { items: [{ ...item('1'), name: 'Atualizada' }] });
    cache.merge(old, { items: [item('1')] });
    expect(cache.store.getState().items[0]?.name).toBe('Atualizada');
  });
  it('caps cache size, does not persist temporary URLs and excludes foreign rows', async () => {
    const cache = createClosetCache(storage());
    await cache.activate('A');
    cache.merge(cache.token(), {
      items: [...Array.from({ length: 250 }, (_, i) => item(String(i))), item('foreign', 'B')],
    });
    expect(cache.store.getState().items).toHaveLength(200);
    expect(cache.store.getState().items.every((i) => i.user_id === 'A')).toBe(true);
  });
  it('handles malformed disk data without exposing it', async () => {
    const disk = storage();
    disk.values.set('virtual-closet-cache-v1:A', '{bad json');
    const cache = createClosetCache(disk);
    await cache.activate('A');
    expect(cache.store.getState().items).toEqual([]);
  });
});
