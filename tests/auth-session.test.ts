import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Session } from '@supabase/supabase-js';
import { applySession, authLifecycle, revalidateSession } from '@/lib/auth-session';
import { useAuth } from '@/stores/auth';

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  signOut: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  multiRemove: vi.fn(),
  activate: vi.fn(),
  clearPhotos: vi.fn(),
}));
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(),
    getAllKeys: async () => [],
    setItem: mocks.setItem,
    removeItem: mocks.removeItem,
    multiRemove: mocks.multiRemove,
  },
}));
vi.mock('@/lib/supabase', () => ({
  client: () => ({
    auth: {
      getUser: mocks.getUser,
      signOut: mocks.signOut,
      startAutoRefresh: vi.fn(),
      stopAutoRefresh: vi.fn(),
    },
  }),
}));
vi.mock('@/lib/capture-queue', () => ({ clearCapture: vi.fn(async () => {}) }));
vi.mock('@/lib/photos', () => ({ clearSignedPhotos: mocks.clearPhotos }));
vi.mock('@/stores/cache', () => ({ closetCache: { activate: mocks.activate } }));

function session(id: string, token = `token-${id}`): Session {
  return {
    access_token: token,
    refresh_token: `refresh-${token}`,
    expires_in: 3600,
    token_type: 'bearer',
    user: { id, app_metadata: {}, user_metadata: {}, aud: 'authenticated', created_at: '' },
  };
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
beforeEach(() => {
  vi.resetAllMocks();
  authLifecycle.blocked = false;
  authLifecycle.revision = 0;
  useAuth.setState({ session: session('A'), ready: true, online: true, error: null });
});

describe('session validation across account changes', () => {
  it('does not sign out B when a request from A returns a late 401', async () => {
    const request = deferred<{ error: { status: number } }>();
    mocks.getUser.mockReturnValue(request.promise);
    const checking = revalidateSession();
    await applySession(session('B'));
    request.resolve({ error: { status: 401 } });
    await checking;
    expect(useAuth.getState().session?.user.id).toBe('B');
    expect(mocks.signOut).not.toHaveBeenCalled();
    expect(mocks.setItem).not.toHaveBeenCalled();
  });

  it('preserves a renewed session for the same account', async () => {
    const request = deferred<{ error: { code: string } }>();
    mocks.getUser.mockReturnValue(request.promise);
    const checking = revalidateSession();
    await applySession(session('A', 'renewed-token'));
    request.resolve({ error: { code: 'refresh_token_not_found' } });
    await checking;
    expect(useAuth.getState().session?.access_token).toBe('renewed-token');
    expect(mocks.signOut).not.toHaveBeenCalled();
  });

  it('clears the current account when its session really is revoked', async () => {
    mocks.getUser.mockResolvedValue({ error: { status: 401 } });
    await revalidateSession();
    expect(useAuth.getState().session).toBeNull();
    expect(authLifecycle.blocked).toBe(true);
    expect(mocks.signOut).toHaveBeenCalledWith({ scope: 'local' });
    expect(mocks.activate).toHaveBeenCalledWith(null);
    expect(mocks.clearPhotos).toHaveBeenCalledOnce();
    expect(mocks.multiRemove).toHaveBeenCalled();
  });

  it('does not check offline or after logout', async () => {
    useAuth.setState({ online: false });
    await revalidateSession();
    useAuth.setState({ online: true, session: null });
    await revalidateSession();
    expect(mocks.getUser).not.toHaveBeenCalled();
  });

  it('ignores results after the provider unmounts', async () => {
    let active = true;
    const request = deferred<{ error: { status: number } }>();
    mocks.getUser.mockReturnValue(request.promise);
    const checking = revalidateSession(() => active);
    active = false;
    request.resolve({ error: { status: 403 } });
    await checking;
    expect(useAuth.getState().session?.user.id).toBe('A');
    expect(mocks.signOut).not.toHaveBeenCalled();
  });

  it('keeps the session when connectivity fails during verification', async () => {
    mocks.getUser.mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(revalidateSession()).resolves.toBeUndefined();
    expect(useAuth.getState().session?.user.id).toBe('A');
    expect(mocks.signOut).not.toHaveBeenCalled();
  });
});
