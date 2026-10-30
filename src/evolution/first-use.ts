import type { StudioData } from '@/preview/types';
import { availableItems, roleOf } from './core';
import type { Evolution } from './types';
export type FirstLookStep = 'top' | 'bottom' | 'combine' | 'wear' | 'done';

// Progress comes from saved records, so returning on another device needs no
// local onboarding flags and planning can never masquerade as a recorded use.
export function firstLookJourney(data: StudioData, e: Evolution) {
  const available = availableItems(data, e);
  const hasTop = available.some((item) => ['top', 'onepiece'].includes(roleOf(item.category)));
  const hasBottom = available.some((item) => ['bottom', 'onepiece'].includes(roleOf(item.category)));
  const worn = data.wear.some((wear) => data.outfits.some((look) => look.id === wear.outfit_id));
  const steps = [hasTop, hasBottom, data.outfits.length > 0, worn];
  const next: FirstLookStep = worn
    ? 'done'
    : data.outfits.length
      ? 'wear'
      : !hasTop
        ? 'top'
        : !hasBottom
          ? 'bottom'
          : 'combine';
  return { available, hasTop, hasBottom, steps, next, completed: steps.filter(Boolean).length };
}
