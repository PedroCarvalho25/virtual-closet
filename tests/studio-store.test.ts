import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Session } from '@supabase/supabase-js';
import { useAuth } from '@/stores/auth';
import { useStudio } from '@/preview/store';
import { freshEvolution } from '@/evolution/types';
import type { StudioData } from '@/preview/types';
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), cache: { epoch: 1, revision: 0 } }));
vi.mock('expo-router', () => ({ useFocusEffect: vi.fn() }));
vi.mock('@/preview/config', () => ({ ideasPreview: false }));
vi.mock('@/lib/supabase', () => ({ client: () => ({ rpc: mocks.rpc }) }));
vi.mock('@/lib/api', () => ({ writer: vi.fn() }));
vi.mock('@/lib/local-reminders', () => ({
  syncLocalReminders: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@/stores/cache', () => ({
  closetCache: { store: { getState: () => mocks.cache } },
  useClosetCache: vi.fn(),
}));
function snapshot(): StudioData {
  return {
    items: [],
    outfits: [],
    wear: [],
    prices: {},
    plans: [],
    favorite_items: [],
    favorite_outfits: [],
    evolution: freshEvolution(),
  };
}
function response() {
  let resolve!: (value: { data: StudioData; error: null }) => void;
  const promise = new Promise((done) => {
    resolve = done;
  });
  return { resolve, promise };
}
function account(id: string) {
  useAuth.setState({ session: { user: { id } } as Session, online: true });
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.cache.epoch = 1;
  mocks.cache.revision = 0;
  account('A');
  useStudio.getState().clear();
});
describe('shared studio reads', () => {
  it('coalesces simultaneous reads for the same account and revision', async () => {
    const r = response();
    mocks.rpc.mockReturnValue(r.promise);
    const a = useStudio.getState().load(),
      b = useStudio.getState().load();
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
    r.resolve({ data: snapshot(), error: null });
    await Promise.all([a, b]);
    expect(useStudio.getState().data).not.toBeNull();
  });
  it('discards the previous account even before the navigation cleanup effect', async () => {
    const r = response();
    mocks.rpc.mockReturnValue(r.promise);
    const loading = useStudio.getState().load();
    account('B');
    mocks.cache.epoch++;
    r.resolve({ data: snapshot(), error: null });
    await loading;
    expect(useStudio.getState().data).toBeNull();
  });
  it('does not merge a response from before a closet mutation', async () => {
    const old = response(),
      fresh = response();
    mocks.rpc.mockReturnValueOnce(old.promise).mockReturnValueOnce(fresh.promise);
    const a = useStudio.getState().load();
    mocks.cache.revision++;
    const b = useStudio.getState().load();
    const newest = snapshot();
    newest.favorite_items = ['new'];
    fresh.resolve({ data: newest, error: null });
    await b;
    old.resolve({ data: snapshot(), error: null });
    await a;
    expect(useStudio.getState().data?.favorite_items).toEqual(['new']);
  });
  it('lets a write supersede an old read without refetching over it', async () => {
    const old = response(),
      write = response();
    mocks.rpc.mockReturnValueOnce(old.promise).mockReturnValueOnce(write.promise);
    const loading = useStudio.getState().load();
    const writing = useStudio.getState().act({ action: 'favorite_item', id: 'piece' });
    await useStudio.getState().load();
    expect(mocks.rpc).toHaveBeenCalledTimes(2);
    const saved = snapshot();
    saved.favorite_items = ['piece'];
    write.resolve({ data: saved, error: null });
    expect(await writing).toBe(true);
    old.resolve({ data: snapshot(), error: null });
    await loading;
    expect(useStudio.getState().data?.favorite_items).toEqual(['piece']);
  });
  it('allows a retry after failure and does not display a fake empty closet', async () => {
    mocks.rpc.mockResolvedValueOnce({ data: null, error: { code: 'network' } });
    await useStudio.getState().load();
    expect(useStudio.getState().data).toBeNull();
    expect(useStudio.getState().error).toBeTruthy();
    mocks.rpc.mockResolvedValueOnce({ data: snapshot(), error: null });
    await useStudio.getState().load();
    expect(useStudio.getState().error).toBeNull();
    expect(useStudio.getState().data).not.toBeNull();
  });
});
