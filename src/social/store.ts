import { create } from 'zustand';
import { useAuth } from '@/stores/auth';
import { getFeed, socialAction, socialError } from './api';
import type { FeedQuery, Publication } from './types';

type State = {
  items: Publication[];
  query: FeedQuery;
  next: FeedQuery['cursor'];
  loading: boolean;
  loaded: boolean;
  error: string | null;
  busy: Record<string, boolean>;
  clear: () => void;
  search: (query: FeedQuery) => void;
  load: (append?: boolean) => Promise<void>;
  put: (publication: Publication) => void;
  remove: (id: string) => void;
  toggle: (
    publication: Publication,
    kind: 'like' | 'save' | 'repost',
    desired?: boolean,
  ) => Promise<void>;
};
let revision = 0;
let changes = 0;
let accountGeneration = 0;
export const useMural = create<State>((set, get) => ({
  items: [],
  query: {},
  next: null,
  loading: false,
  loaded: false,
  error: null,
  busy: {},
  clear: () => {
    accountGeneration++;
    revision++;
    changes++;
    set({ items: [], query: {}, next: null, loading: false, loaded: false, error: null, busy: {} });
  },
  search: (query) => {
    revision++;
    set({ query, items: [], next: null, loading: false, loaded: false, error: null });
    void get().load();
  },
  load: async (append = false) => {
    if (get().loading || (append && !get().next)) return;
    const owner = useAuth.getState().session?.user.id;
    if (!owner) return;
    const current = ++revision;
    const mutation = changes;
    set({ loading: true, error: null });
    try {
      const result = await getFeed({ ...get().query, cursor: append ? get().next : null });
      if (current !== revision || owner !== useAuth.getState().session?.user.id) return;
      // An in-flight read must not undo an optimistic action made after it started.
      const previous = new Map(get().items.map((p) => [p.id, p]));
      const rows = result.items.map((p) =>
        mutation !== changes && previous.has(p.id) ? previous.get(p.id)! : p,
      );
      set({
        items: append
          ? [...new Map([...get().items, ...rows].map((p) => [p.id, p])).values()]
          : rows,
        next: result.next,
        loaded: true,
      });
    } catch (error) {
      if (current === revision) set({ error: socialError(error).message });
    } finally {
      if (current === revision) set({ loading: false });
    }
  },
  put: (publication) => {
    changes++;
    set({ items: get().items.map((p) => (p.id === publication.id ? publication : p)) });
  },
  remove: (id) => {
    changes++;
    set({ items: get().items.filter((p) => p.id !== id) });
  },
  toggle: async (publication, kind, desired) => {
    if (get().busy[publication.id]) return;
    const owner = useAuth.getState().session?.user.id;
    const current = accountGeneration;
    const before = get().items.find((p) => p.id === publication.id) || publication;
    const field = { like: 'liked', save: 'saved', repost: 'reposted' }[kind] as
      'liked' | 'saved' | 'reposted';
    const active = desired ?? !before[field];
    if (before[field] === active) return;
    const optimistic = {
      ...before,
      [field]: active,
      likes: before.likes + (kind === 'like' ? (active ? 1 : -1) : 0),
      reposts: before.reposts + (kind === 'repost' ? (active ? 1 : -1) : 0),
    };
    get().put(optimistic);
    set({ busy: { ...get().busy, [publication.id]: true }, error: null });
    try {
      const result = await socialAction({ action: kind, id: publication.id, active });
      if (owner === useAuth.getState().session?.user.id && current === accountGeneration)
        get().put(result);
    } catch (error) {
      if (owner === useAuth.getState().session?.user.id && current === accountGeneration) {
        get().put(before);
        set({ error: socialError(error).message });
      }
      throw socialError(error);
    } finally {
      if (owner === useAuth.getState().session?.user.id && current === accountGeneration)
        set({ busy: { ...get().busy, [publication.id]: false } });
    }
  },
}));
useAuth.subscribe((state, previous) => {
  if (state.session?.user.id !== previous.session?.user.id) useMural.getState().clear();
});
