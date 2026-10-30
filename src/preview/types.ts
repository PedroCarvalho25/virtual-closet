import type { Outfit, WardrobeItem, WearLog } from '@/types/domain';
export type WeatherMood = 'mild' | 'warm' | 'cool' | 'rain';
export type Occasion = 'casual' | 'work' | 'out';
export type PlanKind = 'day' | 'party' | 'wedding' | 'trip';
export type OutfitPlan = {
  id: string;
  title: string;
  date: string;
  end_date: string;
  kind: PlanKind;
  outfit_ids: string[];
  item_ids: string[];
  notes: string;
  reminder: boolean;
};
export type StudioData = {
  items: WardrobeItem[];
  outfits: Outfit[];
  wear: WearLog[];
  prices: Record<string, number>;
  favorite_items: string[];
  favorite_outfits: string[];
  plans: OutfitPlan[];
  evolution?: import('../evolution/types').Evolution;
};
export type StudioAction =
  | import('../evolution/types').EvolutionAction
  | { action: 'favorite_item' | 'favorite_outfit'; id: string }
  | { action: 'price'; id: string; cents: number | null }
  | { action: 'plan'; plan: Omit<OutfitPlan, 'id'> & { id?: string } }
  | { action: 'remove_plan'; id: string };
