import { useEffect, type PropsWithChildren } from 'react';
import { AppState, Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/stores/auth';
import { closetCache } from '@/stores/cache';
import { friendlyError } from '@/lib/errors';
import {
  applySession,
  authLifecycle,
  restoreLogoutMarker,
  revalidateSession,
} from '@/lib/auth-session';

export function SessionProvider({ children }: PropsWithChildren) {
  useEffect(() => {
    if (!supabase) {
      useAuth.setState({ ready: true });
      return;
    }
    const client = supabase;
    let alive = true;
    let authUnsubscribe: (() => void) | undefined;
    void restoreLogoutMarker()
      .then(async (blocked) => {
        if (!alive) return;
        const { data: listener } = client.auth.onAuthStateChange((_event, session) => {
          if (alive) void applySession(session);
        });
        authUnsubscribe = () => listener.subscription.unsubscribe();
        if (blocked) return;
        const bootRevision = authLifecycle.revision;
        const { data, error } = await client.auth.getSession();
        if (!alive || authLifecycle.revision !== bootRevision) return;
        if (error) useAuth.setState({ ready: true, error: friendlyError(error) });
        else await applySession(data.session);
      })
      .catch((error) => {
        if (alive) useAuth.setState({ ready: true, error: friendlyError(error) });
      });
    const checkSession = () => revalidateSession(() => alive);
    const networkListener = NetInfo.addEventListener((state) => {
      const online = state.isConnected !== false && state.isInternetReachable !== false;
      const wasOnline = useAuth.getState().online;
      useAuth.setState({ online });
      if (online && !wasOnline) {
        closetCache.invalidate();
        void checkSession();
      }
    });
    const appListener = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        if (!authLifecycle.blocked) client.auth.startAutoRefresh();
        void checkSession();
        closetCache.invalidate();
      } else if (Platform.OS !== 'web') client.auth.stopAutoRefresh();
    });
    if (AppState.currentState === 'active') client.auth.startAutoRefresh();
    return () => {
      alive = false;
      authLifecycle.revision++;
      authUnsubscribe?.();
      networkListener();
      appListener.remove();
      client.auth.stopAutoRefresh();
    };
  }, []);
  return children;
}
