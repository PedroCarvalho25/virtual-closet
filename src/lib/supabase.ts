import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, processLock } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { validSupabaseConfig } from './config';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() || '';
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() || '';
export const isConfigured = validSupabaseConfig(url, key);
export const supabase = isConfigured
  ? createClient<Database>(url, key, {
      auth: {
        storage: AsyncStorage,
        storageKey: 'virtual-closet-auth-v1',
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        lock: processLock,
      },
      global: {
        headers: { 'x-client-timezone': Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC' },
        fetch: (input, init) =>
          fetch(input, { ...init, signal: init?.signal ?? AbortSignal.timeout(20000) }),
      },
    })
  : null;
export function client() {
  if (!supabase) throw new Error('Configure a conexão com o Supabase para continuar.');
  return supabase;
}
// Recovery uses an isolated in-memory session until the new password is saved.
export function recoveryClient() {
  if (!isConfigured) throw new Error('Configure a conexão para recuperar seu acesso.');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
}
