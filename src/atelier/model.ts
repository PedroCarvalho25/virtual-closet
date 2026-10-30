import type { Design, Layer } from './types';
export const CANVAS = { width: 360, height: 480 };
export function clampLayer(layer: Layer): Layer {
  return {
    ...layer,
    x: Math.max(0, Math.min(330, layer.x)),
    y: Math.max(0, Math.min(450, layer.y)),
    width: Math.max(36, Math.min(360, layer.width)),
    height: Math.max(36, Math.min(480, layer.height)),
    rotation: Math.max(-180, Math.min(180, layer.rotation)),
  };
}
export function ownItems(design: Design) {
  return [...new Set(design.layers.filter((l) => l.kind === 'item').map((l) => l.target))];
}
export type History = { past: Layer[][]; present: Layer[]; future: Layer[][] };
export function changeLayers(history: History, layers: Layer[]): History {
  if (JSON.stringify(history.present) === JSON.stringify(layers)) return history;
  return { past: [...history.past.slice(-39), history.present], present: layers, future: [] };
}
export function undo(history: History): History {
  if (!history.past.length) return history;
  return {
    past: history.past.slice(0, -1),
    present: history.past.at(-1)!,
    future: [history.present, ...history.future],
  };
}
export function redo(history: History): History {
  if (!history.future.length) return history;
  return {
    past: [...history.past, history.present],
    present: history.future[0]!,
    future: history.future.slice(1),
  };
}
