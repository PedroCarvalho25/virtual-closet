import { createStore } from 'zustand/vanilla';
import type { Outfit, WardrobeItem } from '@/types/domain';
export interface CacheStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}
type Snapshot = {
  userId: string | null;
  epoch: number;
  revision: number;
  items: WardrobeItem[];
  outfits: Outfit[];
  updatedAt: string | null;
  storageError: boolean;
};
export function createClosetCache(storage: CacheStorage) {
  const store = createStore<Snapshot>(() => ({
    userId: null,
    epoch: 0,
    revision: 0,
    items: [],
    outfits: [],
    updatedAt: null,
    storageError: false,
  }));
  let queue = Promise.resolve();
  let requestSequence = 0;
  const itemVersions = new Map<string, number>();
  const outfitVersions = new Map<string, number>();
  const key = (id: string) => `virtual-closet-cache-v1:${id}`;
  const enqueue = (fn: () => Promise<void>) => {
    queue = queue.then(fn).catch(() => {
      store.setState({ storageError: true });
    });
    return queue;
  };
  const token = () => {
    const { userId, epoch, revision } = store.getState();
    return { userId, epoch, revision, sequence: ++requestSequence };
  };
  const valid = (t: ReturnType<typeof token>) => {
    const s = store.getState();
    return !!t.userId && s.userId === t.userId && s.epoch === t.epoch && s.revision === t.revision;
  };
  const persist = () => {
    const snapshot = store.getState();
    return enqueue(async () => {
      if (!snapshot.userId || store.getState().epoch !== snapshot.epoch) return;
      await storage.setItem(
        key(snapshot.userId),
        JSON.stringify({
          version: 1,
          userId: snapshot.userId,
          items: snapshot.items,
          outfits: snapshot.outfits,
          updatedAt: snapshot.updatedAt,
        }),
      );
    });
  };
  return {
    store,
    token,
    valid,
    async activate(userId: string | null) {
      if (store.getState().userId === userId && userId !== null) return;
      const previous = store.getState().userId;
      const epoch = store.getState().epoch + 1;
      itemVersions.clear();
      outfitVersions.clear();
      store.setState({
        userId,
        epoch,
        revision: 0,
        items: [],
        outfits: [],
        updatedAt: null,
        storageError: false,
      });
      await enqueue(async () => {
        const savedUser = await storage.getItem('virtual-closet-cache-owner-v1');
        for (const id of new Set([previous, savedUser]))
          if (id && id !== userId) await storage.removeItem(key(id));
        if (!userId) {
          await storage.removeItem('virtual-closet-cache-owner-v1');
          return;
        }
        if (store.getState().epoch !== epoch) return;
        await storage.setItem('virtual-closet-cache-owner-v1', userId);
        const raw = await storage.getItem(key(userId));
        if (!raw || store.getState().epoch !== epoch) return;
        try {
          const data = JSON.parse(raw) as {
            version: number;
            userId: string;
            items: WardrobeItem[];
            outfits: Outfit[];
            updatedAt: string;
          };
          if (
            data.version === 1 &&
            data.userId === userId &&
            Array.isArray(data.items) &&
            Array.isArray(data.outfits)
          ) {
            store.setState({
              items: data.items.filter((i) => i.user_id === userId).slice(0, 200),
              outfits: data.outfits
                .filter(
                  (o) =>
                    o.user_id === userId &&
                    Array.isArray(o.items) &&
                    o.items.every((i) => i.user_id === userId),
                )
                .slice(0, 100),
              updatedAt: data.updatedAt,
            });
          }
        } catch {
          await storage.removeItem(key(userId));
        }
      });
    },
    merge(t: ReturnType<typeof token>, data: { items?: WardrobeItem[]; outfits?: Outfit[] }) {
      if (!valid(t)) return;
      const s = store.getState();
      const accept = <T extends { id: string }>(
        values: T[] | undefined,
        versions: Map<string, number>,
      ) =>
        values?.filter((value) => {
          if ((versions.get(value.id) || 0) > t.sequence) return false;
          versions.set(value.id, t.sequence);
          return true;
        });
      const incomingItems = accept(data.items, itemVersions);
      const incomingOutfits = accept(data.outfits, outfitVersions);
      const merge = <T extends { id: string; user_id: string }>(
        incoming: T[] | undefined,
        current: T[],
        limit: number,
      ) =>
        [
          ...new Map(
            [...(incoming || []), ...current.filter((v) => !incoming?.some((i) => i.id === v.id))]
              .filter((v) => v.user_id === t.userId)
              .map((v) => [v.id, v]),
          ).values(),
        ].slice(0, limit);
      const items = merge(incomingItems, s.items, 200);
      const changedItems = new Map(incomingItems?.map((item) => [item.id, item]));
      const itemsById = new Map(items.map((item) => [item.id, item]));
      const outfits = merge(incomingOutfits, s.outfits, 100).map((outfit) => ({
        ...outfit,
        items: outfit.items.map(
          (item) =>
            changedItems.get(item.id) ||
            ((itemVersions.get(item.id) || 0) > t.sequence ? itemsById.get(item.id) : null) ||
            item,
        ),
      }));
      store.setState({ items, outfits, updatedAt: new Date().toISOString() });
      void persist();
    },
    invalidate() {
      store.setState((s) => ({ revision: s.revision + 1 }));
    },
    settled: () => queue,
  };
}
