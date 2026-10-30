import { create } from 'zustand';
import { useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { closetCache, useClosetCache } from '@/stores/cache';
import { ideasPreview } from './config';
import { client } from '@/lib/supabase';
import { writer } from '@/lib/api';
import { useAuth } from '@/stores/auth';
import { freshEvolution } from '@/evolution/types';
import { syncLocalReminders } from '@/lib/local-reminders';
import type { StudioAction, StudioData } from './types';
type State = {
  data: StudioData | null;
  busy: boolean;
  error: string | null;
  load: () => Promise<void>;
  act: (action: StudioAction) => Promise<boolean>;
  clear: () => void;
};
let request = 0;
let pendingLoad: { key: string; request: number; promise: Promise<void> } | null = null;
function identity() {
  const owner = useAuth.getState().session?.user.id;
  const { epoch, revision } = closetCache.store.getState();
  return { owner, epoch, key: `${owner}:${epoch}:${revision}` };
}
async function exchange(action?: StudioAction): Promise<StudioData> {
  if (!ideasPreview) {
    if (action) writer();
    const { data, error } = action
      ? await client().rpc('closet_apply', { p_action: action })
      : await client().rpc('closet_snapshot', {});
    if (error)
      throw new Error(
        error.code === '40001'
          ? 'Este conteúdo mudou em outro aparelho. Volte à lista e abra novamente antes de salvar.'
          : error.code === 'PGRST202'
            ? 'Seu espaço de estilo precisa da atualização gratuita do projeto. As peças e os looks atuais continuam disponíveis.'
            : 'Não foi possível atualizar seu espaço de estilo. Confira a conexão e tente novamente.',
      );
    if (!data) throw new Error('Não foi possível carregar seu espaço de estilo.');
    return { ...data, evolution: data.evolution || freshEvolution() };
  }
  const response = await fetch('https://closet-test.supabase.co/preview/v1/studio', {
    method: action ? 'POST' : 'GET',
    headers: { 'Content-Type': 'application/json' },
    body: action ? JSON.stringify(action) : undefined,
    signal: AbortSignal.timeout(10000),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || 'Não foi possível atualizar a prévia.');
  return { ...result, evolution: result.evolution || freshEvolution() } as StudioData;
}
export const useStudio = create<State>((set, get) => ({
  data: null,
  busy: false,
  error: null,
  clear: () => {
    request++;
    pendingLoad = null;
    set({ data: null, busy: false, error: null });
  },
  load: async () => {
    const start = identity();
    if (!start.owner || get().busy) return;
    if (!useAuth.getState().online) {
      if (!get().data) set({ error: 'Conecte-se à internet para abrir seu espaço de estilo.' });
      return;
    }
    if (pendingLoad?.key === start.key) return pendingLoad.promise;
    const current = ++request;
    const promise = (async () => {
      try {
        const data = await exchange();
        if (current === request && identity().key === start.key) {
          set({ data, error: null });
          if (!ideasPreview)
            void syncLocalReminders(data.plans, data.evolution?.details).catch(() => {
              if (current === request)
                set({
                  error:
                    'Seus dados foram salvos, mas não foi possível atualizar os lembretes deste aparelho. Abra Checklist, plano B e lembretes e tente ativá-los novamente.',
                });
            });
        }
      } catch (error) {
        if (current === request && identity().key === start.key)
          set({
            error: error instanceof Error ? error.message : 'Não foi possível carregar a prévia.',
          });
      } finally {
        if (pendingLoad?.request === current) pendingLoad = null;
      }
    })();
    pendingLoad = { key: start.key, request: current, promise };
    return promise;
  },
  act: async (action) => {
    if (get().busy) return false;
    const start = identity();
    if (!start.owner) return false;
    const current = ++request;
    pendingLoad = null;
    set({ busy: true, error: null });
    try {
      const data = await exchange(action);
      if (
        current !== request ||
        identity().owner !== start.owner ||
        identity().epoch !== start.epoch
      )
        return false;
      set({ data });
      if (!ideasPreview)
        void syncLocalReminders(data.plans, data.evolution?.details).catch(() => {
          if (current === request)
            set({
              error:
                'Seus dados foram salvos, mas não foi possível atualizar os lembretes deste aparelho. Abra Checklist, plano B e lembretes e tente ativá-los novamente.',
            });
        });
      return true;
    } catch (error) {
      if (current === request)
        set({ error: error instanceof Error ? error.message : 'Não foi possível salvar.' });
      return false;
    } finally {
      if (current === request) set({ busy: false });
    }
  },
}));
export function useStudioScreen() {
  const state = useStudio();
  const { load } = state;
  const { revision } = useClosetCache();
  useFocusEffect(
    useCallback(() => {
      void load();
      // A closet mutation invalidates this snapshot even though load has no arguments.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [load, revision]),
  );
  return state;
}
