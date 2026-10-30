export type SocialAuthor = {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  avatarPath: string | null;
  tone: 'olive' | 'clay' | 'lemon';
};
export type Publication = {
  id: string;
  title: string;
  caption: string;
  tags: string[];
  colors: string[];
  width: number;
  height: number;
  fullPath: string;
  thumbPath: string;
  createdAt: string;
  author: SocialAuthor | null;
  curated: boolean;
  credit: string;
  sourceUrl: string | null;
  friend: boolean;
  mine: boolean;
  liked: boolean;
  saved: boolean;
  reposted: boolean;
  likes: number;
  reposts: number;
  reposters: SocialAuthor[];
};
export type MuralMode = 'all' | 'friends' | 'saved' | 'mine' | 'reposts';
export type FeedQuery = {
  mode?: MuralMode;
  search?: string;
  color?: string;
  author?: string;
  cursor?: { at: string; id: string } | null;
};
export type FeedPage = { items: Publication[]; next: { at: string; id: string } | null };
export type ReceivedShare = {
  id: string;
  sender: SocialAuthor;
  publication: Publication;
  createdAt: string;
  read: boolean;
};
export const colorFilters = [
  ['verde', '#17613E'],
  ['azul', '#416BC1'],
  ['rosa', '#E46494'],
  ['vermelho', '#D9443B'],
  ['laranja', '#FF805E'],
  ['amarelo', '#E9CB36'],
  ['bege', '#D5B992'],
  ['marrom', '#85553F'],
  ['preto', '#20291F'],
  ['branco', '#FFFFFF'],
  ['cinza', '#8B918A'],
] as const;
