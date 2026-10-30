import { expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { readShowcase, showcaseKey, visibleFollowers, type ShowcaseState } from '@/showcase/model';
import catalog from '@/showcase/catalog.json';
it('keeps fictional followers scoped to their owner and respects hiding and completion', () => {
  const state: ShowcaseState = {
    version: 1,
    owner: 'A',
    anchor: '2026-10-15',
    completed: true,
    followers: true,
    hiddenFollowers: [],
  };
  const metadata = { [showcaseKey]: state };
  expect(readShowcase(metadata, 'B')).toBeNull();
  expect(visibleFollowers(readShowcase(metadata, 'A'))).toHaveLength(12);
  expect(visibleFollowers({ ...state, completed: false })).toHaveLength(0);
  expect(visibleFollowers({ ...state, followers: false })).toHaveLength(0);
  expect(visibleFollowers({ ...state, hiddenFollowers: ['demo.nina.cor'] })).toHaveLength(11);
  expect(readShowcase({ [showcaseKey]: { ...state, anchor: 'invalid' } }, 'A')).toBeNull();
});
it('ships a traceable mix of actual photographs and explicitly identified illustrations', () => {
  expect(catalog.items.filter((i) => i.kind === 'photograph')).toHaveLength(12);
  expect(catalog.items.filter((i) => i.kind === 'illustration')).toHaveLength(8);
  for (const item of catalog.items) {
    const bytes = readFileSync(new URL(`../assets/showcase/${item.key}.jpg`, import.meta.url));
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(item.sha256);
    expect(item.credit).toBeTruthy();
    expect(item.license).toBeTruthy();
    if (item.kind === 'photograph') expect(item.source).toMatch(/^https:\/\//);
    else expect(item.credit).toContain('ilustração');
  }
});
