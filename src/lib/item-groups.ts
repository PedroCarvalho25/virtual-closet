import type { Category } from '@/types/domain';
export const itemGroups = {
  tops: { label: 'Parte de cima', categories: ['camiseta', 'regata', 'camisa', 'polo', 'blusa', 'trico', 'moletom'] },
  bottoms: { label: 'Parte de baixo', categories: ['calca', 'bermuda', 'jorts', 'saia'] },
  shoes: { label: 'Calçados', categories: ['tenis', 'bota', 'sandalia', 'sapato'] },
  accessories: { label: 'Acessórios', categories: ['bone_aba_reta', 'bone_aba_curta', 'bolsa', 'cinto', 'joia', 'lenco'] },
  layers: { label: 'Camadas', categories: ['colete', 'jaqueta', 'casaco', 'blazer'] },
  onepiece: { label: 'Peças únicas', categories: ['vestido', 'macacao'] },
  other: { label: 'Outras peças', categories: ['outro'] },
} satisfies Record<string, { label: string; categories: Category[] }>;
export type ItemGroup = keyof typeof itemGroups;
export const inGroup = (category: Category, group?: ItemGroup | null) =>
  !group || (itemGroups[group].categories as Category[]).includes(category);
