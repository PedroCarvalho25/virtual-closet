import type { StudioData } from '../preview/types';
import type { Evolution } from './types';

// Only actual wear records contribute. Duplicate records never create extra progress.
export function personalDiscoveries(data: StudioData, e: Evolution, today: string) {
  const start = new Date(`${today}T12:00:00Z`);
  start.setUTCDate(start.getUTCDate() - 6);
  const since = start.toISOString().slice(0, 10);
  const worn = new Set(
    data.wear.filter((w) => w.worn_date >= since && w.worn_date <= today).map((w) => w.outfit_id),
  );
  const outfits = data.outfits.filter((o) => worn.has(o.id));
  const byItem = new Map<string, Set<string>>();
  for (const outfit of outfits)
    for (const item of outfit.items) {
      if (!byItem.has(item.id)) byItem.set(item.id, new Set());
      byItem.get(item.id)!.add(outfit.id);
    }
  const leader = [...byItem].sort((a, b) => b[1].size - a[1].size)[0];
  const recipes = new Set(e.recipes.map((r) => r.id));
  const remixed = new Set(
    e.decisions
      .filter(
        (d) =>
          d.kind === 'accepted' &&
          d.recipeId &&
          recipes.has(d.recipeId) &&
          d.outfitId &&
          worn.has(d.outfitId),
      )
      .map((d) => d.outfitId),
  );
  return {
    since,
    outfits,
    variety: worn.size ? outfits.length : 0,
    reuse: leader?.[1].size || 0,
    item: data.items.find((i) => i.id === leader?.[0]),
    remixes: remixed.size,
  };
}

export function recipeVersions(data: StudioData, e: Evolution, recipeId: string) {
  const ids = new Set(
    e.decisions
      .filter((d) => d.kind === 'accepted' && d.recipeId === recipeId && d.outfitId)
      .map((d) => d.outfitId),
  );
  return data.outfits.filter((o) => ids.has(o.id));
}
