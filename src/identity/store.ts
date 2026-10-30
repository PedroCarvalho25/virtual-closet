import { create } from 'zustand';
import { checkDevice, getAccount, identityError } from './api';
import { useAuth } from '@/stores/auth';
import type { AccountData } from './types';
type State = {
  owner: string | null;
  status: 'idle' | 'checking' | 'challenge' | 'verified' | 'error';
  account: AccountData | null;
  error: string | null;
  check: () => Promise<void>;
  refresh: () => Promise<void>;
  accept: (account: AccountData) => void;
  clear: () => void;
};
let revision = 0;
let accountRevision = 0;
export const useIdentity = create<State>((set, get) => ({
  owner: null,
  status: 'idle',
  account: null,
  error: null,
  clear: () => {
    revision++;
    accountRevision++;
    set({ owner: null, status: 'idle', account: null, error: null });
  },
  accept: (account) => {
    accountRevision++;
    if (!account.profile || account.profile.id === useAuth.getState().session?.user.id)
      set({ account });
  },
  check: async () => {
    const session = useAuth.getState().session;
    const current = ++revision;
    const accountRequest = ++accountRevision;
    if (!session) {
      set({ owner: null, status: 'idle', account: null, error: null });
      return;
    }
    const sameOwner = get().owner === session.user.id;
    set({
      owner: session.user.id,
      status: sameOwner && get().status === 'verified' ? 'verified' : 'checking',
      account: sameOwner ? get().account : null,
      error: null,
    });
    try {
      const result = await checkDevice();
      if (current !== revision || useAuth.getState().session?.access_token !== session.access_token)
        return;
      set({
        status: result.verified ? 'verified' : 'challenge',
        account:
          !result.verified || accountRequest === accountRevision ? result.account : get().account,
        error: null,
      });
    } catch (error) {
      if (current === revision && useAuth.getState().session?.access_token === session.access_token)
        set({ status: 'error', account: null, error: identityError(error).message });
    }
  },
  refresh: async () => {
    if (get().status !== 'verified') return;
    const current = revision;
    const accountRequest = ++accountRevision;
    const owner = useAuth.getState().session?.user.id;
    try {
      const account = await getAccount();
      if (
        current === revision &&
        accountRequest === accountRevision &&
        owner === useAuth.getState().session?.user.id
      )
        set({ account, error: null });
    } catch (error) {
      if (current === revision) set({ error: identityError(error).message });
    }
  },
}));
