export const volumes = {
  unknown: 'Não informado',
  slim: 'Ajustada',
  straight: 'Reta',
  roomy: 'Ampla',
} as const;
export const textures = {
  unknown: 'Não informada',
  smooth: 'Lisa',
  denim: 'Jeans',
  knit: 'Tricô',
  linen: 'Linho',
  leather: 'Couro',
  print: 'Estampada',
} as const;
export const occasions = {
  any: 'Sem preferência',
  casual: 'Dia a dia',
  smart: 'Mais arrumado',
  active: 'Em movimento',
} as const;
export type StyleTraits = {
  volume: keyof typeof volumes;
  texture: keyof typeof textures;
  occasion: keyof typeof occasions;
};
export const emptyTraits: StyleTraits = { volume: 'unknown', texture: 'unknown', occasion: 'any' };
export function validTraits(value: unknown): value is StyleTraits {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const v = value as StyleTraits;
  return (
    Object.keys(v).every((k) => ['volume', 'texture', 'occasion'].includes(k)) &&
    Object.hasOwn(volumes, v.volume) &&
    Object.hasOwn(textures, v.texture) &&
    Object.hasOwn(occasions, v.occasion)
  );
}
export function readTraits(value: unknown): StyleTraits {
  return validTraits(value) ? value : { ...emptyTraits };
}
