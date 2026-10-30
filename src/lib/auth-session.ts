import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session } from '@supabase/supabase-js';
import { client } from './supabase';
import { clearCapture } from './capture-queue';
import { clearSignedPhotos } from './photos';
import { useAuth } from '@/stores/auth';
import { closetCache } from '@/stores/cache';
export const AUTH_STORAGE_KEY = 'virtual-closet-auth-v1';
const LOGOUT_MARKER = 'virtual-closet-signed-out-v1';
export const authLifecycle = { blocked: false, revision: 0 };
export async function applySession(session: Session | null) {
  if (session && authLifecycle.blocked) return;
  const current = ++authLifecycle.revision;
  if (useAuth.getState().session?.user.id !== session?.user.id) {
    useAuth.setState({ ready: false, session: null });
    clearSignedPhotos();
  }
  await closetCache.activate(session?.user.id || null);
  if (current === authLifecycle.revision && (!session || !authLifecycle.blocked))
    useAuth.setState({ session, ready: true, error: null });
}
export async function restoreLogoutMarker() {
  authLifecycle.blocked = (await AsyncStorage.getItem(LOGOUT_MARKER)) === '1';
  if (authLifecycle.blocked) {
    await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
    await applySession(null);
  }
  return authLifecycle.blocked;
}
export async function acceptInteractiveSession(session: Session) {
  await AsyncStorage.removeItem(LOGOUT_MARKER);
  authLifecycle.blocked = false;
  await applySession(session);
  client().auth.startAutoRefresh();
}
export async function revalidateSession(isActive: () => boolean = () => true) {
  const { session, online } = useAuth.getState();
  if (!isActive() || !session || !online || authLifecycle.blocked) return;
  const revision = authLifecycle.revision;
  // A transient transport failure does not prove that a session was revoked.
  const result = await client()
    .auth.getUser()
    .catch(() => null);
  if (!result) return;
  const { error } = result;
  const current = useAuth.getState().session;
  if (
    isActive() &&
    !authLifecycle.blocked &&
    authLifecycle.revision === revision &&
    current?.user.id === session.user.id &&
    current?.access_token === session.access_token &&
    error &&
    (error.status === 401 ||
      error.status === 403 ||
      error.code === 'session_not_found' ||
      error.code === 'refresh_token_not_found')
  ) {
    // Only the session checked by this request can be signed out. A response
    // from a previous account/token must not end a more recent session.
    await signOutOnDevice();
  }
}
export async function signOutOnDevice() {
  // Persist intention first. A pending refresh can never resurrect a logged-out
  // session on restart, even when the device cannot reach Supabase to revoke it.
  const departingOwner = useAuth.getState().session?.user.id;
  await AsyncStorage.setItem(LOGOUT_MARKER, '1');
  authLifecycle.blocked = true;
  authLifecycle.revision++;
  const online = useAuth.getState().online;
  useAuth.setState({ ready: false, session: null });
  client().auth.stopAutoRefresh();
  clearSignedPhotos();
  await closetCache.activate(null);
  try {
    if (online) await client().auth.signOut({ scope: 'local' });
  } finally {
    await AsyncStorage.multiRemove([AUTH_STORAGE_KEY, `${AUTH_STORAGE_KEY}-code-verifier`]);
    if (departingOwner) {
      await clearCapture(departingOwner).catch(() => {});
      const keys = (await AsyncStorage.getAllKeys()).filter(k => k.startsWith(`vc-draft:${departingOwner}:`));
      await AsyncStorage.multiRemove(keys);
    }
    useAuth.setState({ session: null, ready: true, error: null });
  }
}
