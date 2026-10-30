import type { Publication, SocialAuthor } from '@/social/types';
export type Collection = {
  id: string;
  title: string;
  note: string;
  event: string;
  ownerId: string;
  revision: number;
  featured: boolean;
  coverId: string | null;
  permission: 'owner' | 'edit' | 'view';
  entries: { publication: Publication; note: string }[];
  members: { author: SocialAuthor; role: 'view' | 'edit' }[];
  comments: { id: string; author: SocialAuthor; body: string; createdAt: string }[];
};
export type Crop = { x: number; y: number; width: number; height: number };
export type Layer = {
  id: string;
  kind: 'item' | 'reference' | 'wish';
  target: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  crop?: Crop;
};
export type Design = {
  id: string;
  title: string;
  note: string;
  layers: Layer[];
  sourceId: string | null;
  parentId: string | null;
  outfitId: string | null;
  revision: number;
  updatedAt?: string;
};
export type AtelierData = { collections: Collection[]; designs: Design[] };
