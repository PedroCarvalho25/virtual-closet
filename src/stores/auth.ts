import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';
export const useAuth = create<{
  session: Session | null;
  ready: boolean;
  error: string | null;
  online: boolean;
}>(() => ({ session: null, ready: false, error: null, online: true }));
