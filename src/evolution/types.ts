import type { Category, WardrobeItem } from '../types/domain';
export const itemStates = {
  available: 'Disponível',
  dirty: 'Para lavar',
  washing: 'Lavando',
  repair: 'Em conserto',
  lent: 'Emprestada',
  stored: 'Guardada',
  selling: 'Para vender',
  donating: 'Para doar',
} as const;
export type ItemState = keyof typeof itemStates;
export type ItemDetail = {
  styling?: import('../style/traits').StyleTraits;
  careReminderDate?: string | null;
  state: ItemState;
  location: string;
  story: string;
  care: string;
  loanTo: string;
  returnDate: string | null;
  weightGrams: number | null;
};
export const emptyDetail: ItemDetail = {
  state: 'available',
  location: '',
  story: '',
  care: '',
  loanTo: '',
  returnDate: null,
  weightGrams: null,
};
export type StyleProfile = {
  name: string;
  feeling: 'comfortable' | 'clean' | 'expressive';
  thermal: 'neutral' | 'cold' | 'warm';
  environment: 'outside' | 'inside' | 'aircon';
  boldness: number;
  avoidRecent: boolean;
  challenges: boolean;
  noBuy: boolean;
  city: string;
  haptics?: boolean;
};
export const defaultProfile: StyleProfile = {
  name: '',
  feeling: 'comfortable',
  thermal: 'neutral',
  environment: 'outside',
  boldness: 1,
  avoidRecent: true,
  challenges: true,
  noBuy: false,
  city: '',
  haptics: false,
};
export const slotLabels = {
  onepiece: 'Peça única',
  top: 'Parte de cima',
  bottom: 'Parte de baixo',
  layer: 'Camada',
  shoes: 'Calçado',
  accessory: 'Acessório',
} as const;
export type SlotRole = keyof typeof slotLabels;
export type RecipeSlot = { role: SlotRole; category: Category; color: string };
export type Recipe = {
  id: string;
  title: string;
  folder: string;
  source: string;
  note: string;
  slots: RecipeSlot[];
};
export type Wish = {
  media?: { publicationId?: string | null; photoPath?: string | null };
  styling?: import('../style/traits').StyleTraits;
  revision?: number;
  id: string;
  title: string;
  category: Category;
  color: string;
  price: number | null;
  source: string;
  note: string;
  reflectUntil: string | null;
};
export type Feedback = {
  id: string;
  outfitId: string;
  date: string;
  comfort: boolean;
  confidence: boolean;
  weather: boolean;
  occasion: boolean;
  again: boolean;
  note: string;
};
export type Decision = {
  id: string;
  itemIds: string[];
  outfitId: string | null;
  recipeId: string | null;
  date: string;
  kind: 'accepted' | 'rejected' | 'lab';
  reason: string;
};
export type PlanDetail = {
  activities?: Record<string, string>;
  packed: string[];
  backupOutfitIds: string[];
  days: Record<string, string[]>;
  tasks: string[];
};
export type Evolution = {
  profile: StyleProfile;
  details: Record<string, ItemDetail>;
  recipes: Recipe[];
  wishes: Wish[];
  feedback: Feedback[];
  decisions: Decision[];
  planDetails: Record<string, PlanDetail>;
};
export const freshEvolution = (): Evolution => ({
  profile: { ...defaultProfile },
  details: {},
  recipes: [],
  wishes: [],
  feedback: [],
  decisions: [],
  planDetails: {},
});
export type EvolutionAction =
  | { action: 'profile'; profile: StyleProfile }
  | { action: 'item_detail'; id: string; detail: ItemDetail }
  | { action: 'recipe'; recipe: Recipe }
  | { action: 'remove_recipe'; id: string }
  | { action: 'wish'; wish: Wish }
  | { action: 'remove_wish'; id: string }
  | { action: 'feedback'; feedback: Feedback }
  | { action: 'decision'; decision: Decision }
  | { action: 'clear_learning' }
  | { action: 'plan_detail'; id: string; detail: PlanDetail };
export type Suggestion = {
  kind: 'safe' | 'creative' | 'rediscover';
  title: string;
  items: WardrobeItem[];
  reasons: string[];
};
