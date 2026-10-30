import { beforeEach, expect, it, vi } from 'vitest';
import type { Session } from '@supabase/supabase-js';
import { useMural } from '@/social/store';
import { useAuth } from '@/stores/auth';
import type { Publication } from '@/social/types';
const api = vi.hoisted(() => ({ feed: vi.fn(), action: vi.fn() }));
vi.mock('@/social/api', () => ({
  getFeed: api.feed,
  socialAction: api.action,
  socialError: (e: Error) => e,
}));
const session = (id: string) => ({ user: { id }, access_token: id }) as Session;
const post = {
  id: 'p',
  title: 'Foto',
  liked: false,
  saved: false,
  reposted: false,
  likes: 0,
  reposts: 0,
  reposters: [],
} as unknown as Publication;
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((a, b) => {
    resolve = a;
    reject = b;
  });
  return { promise, resolve, reject };
}
beforeEach(() => {
  vi.resetAllMocks();
  useMural.getState().clear();
  useAuth.setState({ session: session('A') });
});
it('discards a previous account response even when logging back into that same account', async () => {
  const pending = deferred<{ items: Publication[]; next: null }>();
  api.feed.mockReturnValue(pending.promise);
  const load = useMural.getState().load();
  useAuth.setState({ session: null });
  useAuth.setState({ session: session('A') });
  pending.resolve({ items: [post], next: null });
  await load;
  expect(useMural.getState().items).toEqual([]);
});
it('rolls back failed optimistic saves and prevents duplicate simultaneous actions', async () => {
  api.feed.mockResolvedValue({ items: [post], next: null });
  await useMural.getState().load();
  const pending = deferred<Publication>();
  api.action.mockReturnValue(pending.promise);
  const first = useMural.getState().toggle(post, 'save');
  const checked = expect(first).rejects.toThrow('offline');
  expect(useMural.getState().items[0]?.saved).toBe(true);
  await useMural.getState().toggle(post, 'save');
  expect(api.action).toHaveBeenCalledTimes(1);
  pending.reject(new Error('offline'));
  await checked;
  expect(useMural.getState().items[0]?.saved).toBe(false);
  expect(useMural.getState().error).toBe('offline');
});
it('deduplicates overlapping pages and ignores superseded searches', async () => {
  api.feed
    .mockResolvedValueOnce({ items: [post], next: { at: '2026-10-01', id: 'p' } })
    .mockResolvedValueOnce({ items: [post, { ...post, id: 'q' }], next: null });
  await useMural.getState().load();
  await useMural.getState().load(true);
  expect(useMural.getState().items.map((p) => p.id)).toEqual(['p', 'q']);
  const first = deferred<{ items: Publication[]; next: null }>();
  api.feed
    .mockReturnValueOnce(first.promise)
    .mockResolvedValueOnce({ items: [{ ...post, id: 'new' }], next: null });
  useMural.getState().search({ search: 'old' });
  useMural.getState().search({ search: 'new' });
  await Promise.resolve();
  first.resolve({ items: [post], next: null });
  await first.promise;
  expect(useMural.getState().items.map((p) => p.id)).toEqual(['new']);
});
it('does not undo an action with a slower read started before it', async () => {
  api.feed.mockResolvedValueOnce({ items: [post], next: null });
  await useMural.getState().load();
  const read = deferred<{ items: Publication[]; next: null }>();
  api.feed.mockReturnValue(read.promise);
  const loading = useMural.getState().load();
  api.action.mockResolvedValue({ ...post, liked: true, likes: 1 });
  await useMural.getState().toggle(post, 'like');
  read.resolve({ items: [post], next: null });
  await loading;
  expect(useMural.getState().items[0]).toMatchObject({ liked: true, likes: 1 });
});
it('double-tap likes are idempotent even when the caller has a stale card', async () => {
  api.feed.mockResolvedValueOnce({ items: [post], next: null });
  await useMural.getState().load();
  api.action.mockResolvedValue({ ...post, liked: true, likes: 1 });
  await useMural.getState().toggle(post, 'like', true);
  await useMural.getState().toggle(post, 'like', true);
  expect(api.action).toHaveBeenCalledTimes(1);
  expect(api.action).toHaveBeenCalledWith({ action: 'like', id: 'p', active: true });
  expect(useMural.getState().items[0]).toMatchObject({ liked: true, likes: 1 });
});
