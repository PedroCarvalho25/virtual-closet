import { client } from '@/lib/supabase';
import { writer } from '@/lib/api';
import { ideasPreview } from '@/preview/config';
import { useAuth } from '@/stores/auth';
import { socialSession } from './session';
import type { FeedPage, FeedQuery, Publication, ReceivedShare, SocialAuthor } from './types';

export function socialError(error: unknown): Error {
  const e = error as { message?: string; code?: string };
  const messages: Record<string, string> = {
    PUBLIC_PROFILE_REQUIRED: 'Ative seu perfil público em Minha conta para publicar ou republicar.',
    FRIEND_REQUIRED: 'O envio está disponível para quem segue você e é seguido por você.',
    PUBLICATION_UNAVAILABLE: 'Esta publicação não está mais disponível.',
    PUBLISH_LIMIT: 'Você chegou a 30 publicações hoje. Tente novamente amanhã.',
    SHARE_LIMIT: 'Você chegou ao limite de envios nesta hora. Tente mais tarde.',
    MEDIA_NOT_UPLOADED: 'A foto não terminou de enviar. Tente novamente.',
    DEVICE_VERIFICATION_REQUIRED: 'Confirme seu aparelho para abrir o mural.',
  };
  for (const [code, message] of Object.entries(messages))
    if (e?.message?.includes(code)) return new Error(message);
  if (e?.code === 'PGRST202')
    return new Error('O mural está sendo preparado. Tente novamente em breve.');
  if (e?.code && ['22023', '23514', '23502'].includes(e.code))
    return new Error('Confira o título, as tags e a foto antes de publicar.');
  if (error instanceof Error && !e.code) return error;
  return new Error('Não foi possível concluir. Confira sua conexão e tente novamente.');
}
async function request<T>(
  name: 'social_query' | 'social_action' | 'social_notebook',
  value: object,
): Promise<T> {
  const owner = useAuth.getState().session?.user.id;
  const generation = socialSession();
  if (!owner) throw new Error('Entre na sua conta para continuar.');
  const args = name === 'social_query' ? { p_query: value } : { p_action: value };
  let result: T;
  if (ideasPreview) {
    const response = await fetch('https://closet-test.supabase.co/preview/v1/social', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, args }),
      signal: AbortSignal.timeout(15000),
    });
    const data = await response.json();
    if (!response.ok) throw socialError(data);
    result = data;
  } else {
    const { data, error } = await client()
      .rpc(name as never, args as never)
      .abortSignal(AbortSignal.timeout(20000));
    if (error) throw socialError(error);
    result = data as T;
  }
  if (generation !== socialSession() || owner !== useAuth.getState().session?.user.id)
    throw new Error('Sua sessão mudou. Abra o mural novamente.');
  return result;
}
export const getFeed = (query: FeedQuery = {}) => request<FeedPage>('social_query', query);
export const getPublication = (id: string) =>
  request<Publication | null>('social_query', { kind: 'detail', id });
export const getFriends = (offset = 0) =>
  request<SocialAuthor[]>('social_query', { kind: 'friends', offset });
export const getInbox = (cursor: FeedQuery['cursor'] = null) =>
  request<ReceivedShare[]>('social_query', { kind: 'inbox', cursor });
export async function socialAction<T = Publication>(action: object): Promise<T> {
  writer();
  return request<T>('social_action', action);
}

export function notebook(action: { kind: 'get' | 'save'; id: string; note?: string }) {
  if (action.kind === 'save') writer();
  return request<string>('social_notebook', action);
}
