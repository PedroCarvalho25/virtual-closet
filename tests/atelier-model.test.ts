import { describe, expect, it } from 'vitest';
import { changeLayers, ownItems, redo, undo, type History } from '@/atelier/model';
import { forecastMood } from '@/planning/weather';
import type { Design, Layer } from '@/atelier/types';
const layer: Layer = {
  id: '1',
  kind: 'item',
  target: 'owned',
  x: 0,
  y: 0,
  width: 100,
  height: 100,
  rotation: 0,
};
describe('creative versions and weather decisions', () => {
  it('undoes gestures, branches history and never counts references as owned garments', () => {
    let h: History = { past: [], present: [layer], future: [] };
    h = changeLayers(h, [{ ...layer, x: 30 }]);
    h = changeLayers(h, [{ ...layer, x: 60 }]);
    expect(undo(h).present[0]!.x).toBe(30);
    expect(redo(undo(h)).present[0]!.x).toBe(60);
    expect(changeLayers(undo(h), [{ ...layer, y: 80 }]).future).toEqual([]);
    const design = {
      layers: [
        layer,
        { ...layer, id: '2', kind: 'reference', target: 'inspiration' },
        { ...layer, id: '3' },
      ],
    } as Design;
    expect(ownItems(design)).toEqual(['owned']);
  });
  it('prioritizes rain, then heat or cold in forecast suggestions', () => {
    expect(forecastMood(18, 31, 75)).toBe('rain');
    expect(forecastMood(18, 31, 10)).toBe('warm');
    expect(forecastMood(9, 23, 10)).toBe('cool');
    expect(forecastMood(17, 25, 20)).toBe('mild');
  });
});
