export const categories = {
  camiseta: 'Camisetas',
  calca: 'Calças',
  regata: 'Regatas',
  bone_aba_reta: 'Bonés de aba reta',
  bone_aba_curta: 'Bonés de aba curta',
  bermuda: 'Bermudas',
  jorts: 'Jorts',
  camisa: 'Camisas',
  polo: 'Polos',
  colete: 'Coletes',
  tenis: 'Tênis',
  blusa: 'Blusas',
  moletom: 'Moletons',
  trico: 'Tricôs',
  jaqueta: 'Jaquetas',
  casaco: 'Casacos',
  blazer: 'Blazers',
  saia: 'Saias',
  vestido: 'Vestidos',
  macacao: 'Macacões',
  bota: 'Botas',
  sandalia: 'Sandálias',
  sapato: 'Sapatos',
  bolsa: 'Bolsas',
  cinto: 'Cintos',
  joia: 'Joias e bijuterias',
  lenco: 'Lenços',
  outro: 'Outras peças',
} as const;
export const fits = {
  normal: 'Normal',
  boxy: 'Boxy',
  oversized: 'Oversized',
  cropped: 'Cropped',
  baggy: 'Baggy',
  baloon: 'Balonê',
} as const;
export type Category = keyof typeof categories;
export type Fit = keyof typeof fits;
export type Item = {
  id: string;
  user_id: string;
  name: string;
  category: Category;
  color: string;
  size: string;
  fit: Fit | null;
  brand: string | null;
  photo_path: string | null;
  archived_at: string | null;
  created_at: string;
};
export type WardrobeItem = Item & { last_worn_date: string | null };
export type OutfitRow = {
  id: string;
  user_id: string;
  name: string | null;
  photo_path: string | null;
  created_at: string;
};
export type Outfit = OutfitRow & { items: WardrobeItem[]; last_worn_date: string | null };
export type WearLog = {
  id: string;
  user_id: string;
  outfit_id: string;
  worn_date: string;
  notes: string | null;
  created_at: string;
};
export type Post = {
  id: string;
  user_id: string;
  outfit_id: string;
  caption: string | null;
  created_at: string;
};
export type FeedPost = Post & { outfit: Outfit };
export type ItemInput = Pick<Item, 'name' | 'category' | 'color' | 'size' | 'fit' | 'brand'>;
export type ItemFilters = {
  search: string;
  category: Category | null;
  archived: boolean;
  group?: import('@/lib/item-groups').ItemGroup | null;
};
export const PAGE_SIZE = 24;
