import { beforeEach, expect, it, vi } from 'vitest';
import { useIdentity } from '@/identity/store';
import { useAuth } from '@/stores/auth';
import type { Session } from '@supabase/supabase-js';
import type { AccountData, SessionCheck } from '@/identity/types';
const m = vi.hoisted(() => ({ check: vi.fn(), account: vi.fn() }));
vi.mock('@/identity/api', () => ({
  checkDevice: m.check,
  getAccount: m.account,
  identityError: (e: Error) => e,
}));
const session = (id: string) => ({ user: { id }, access_token: id }) as Session;
const account = (id: string, bio = '') =>
  ({
    profile: { id, bio },
    devices: [],
    counts: { posts: 0, following: 0, followers: 0 },
  }) as unknown as AccountData;
function deferred<T>() {
  let done!: (value: T) => void;
  const promise = new Promise<T>((resolve) => {
    done = resolve;
  });
  return { promise, done };
}
beforeEach(() => {
  vi.resetAllMocks();
  useIdentity.getState().clear();
  useAuth.setState({ session: session('A') });
});
it('never accepts a late verification response from another account', async () => {
  const pending = deferred<SessionCheck>();
  m.check.mockReturnValueOnce(pending.promise);
  const first = useIdentity.getState().check();
  useAuth.setState({ session: session('B') });
  m.check.mockResolvedValue({ verified: true, account: account('B') });
  await useIdentity.getState().check();
  pending.done({ verified: true, account: account('A') });
  await first;
  expect(useIdentity.getState().owner).toBe('B');
  expect(useIdentity.getState().account?.profile?.id).toBe('B');
});
it('does not let an earlier refresh undo a saved profile', async () => {
  m.check.mockResolvedValue({ verified: true, account: account('A') });
  await useIdentity.getState().check();
  const pending = deferred<AccountData>();
  m.account.mockReturnValue(pending.promise);
  const refresh = useIdentity.getState().refresh();
  useIdentity.getState().accept(account('A', 'new'));
  pending.done(account('A', 'old'));
  await refresh;
  expect(useIdentity.getState().account?.profile?.bio).toBe('new');
});
it('keeps recognized content mounted during token revalidation but clears it if access is revoked', async () => {
  m.check.mockResolvedValueOnce({ verified: true, account: account('A') });
  await useIdentity.getState().check();
  const pending = deferred<SessionCheck>();
  m.check.mockReturnValue(pending.promise);
  const check = useIdentity.getState().check();
  expect(useIdentity.getState().status).toBe('verified');
  pending.done({ verified: false, account: null });
  await check;
  expect(useIdentity.getState().status).toBe('challenge');
  expect(useIdentity.getState().account).toBeNull();
});
