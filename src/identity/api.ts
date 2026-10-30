import { client } from '@/lib/supabase';
import { authErrorMessage } from '@/lib/auth-errors';
import { writer } from '@/lib/api';
import { ideasPreview } from '@/preview/config';
import { useAuth } from '@/stores/auth';
import { useMural } from '@/social/store';
import { clearSocialPhotos } from '@/social/media';
import { deviceCredential, deviceLabel } from './device';
import { normalizeProfile, normalizeUsername } from './validation';
import type { AccountData, Connection, ProfileCard, ProfileDraft, SessionCheck } from './types';

export function identityError(error: unknown): Error {
  const authMessage = authErrorMessage(error);
  if (authMessage) return new Error(authMessage);
  const e = error as { message?: string; code?: string; status?: number };
  const text = e?.message || '';
  const messages: Record<string, string> = {
    USERNAME_UNAVAILABLE: 'Esse @ já está em uso. Escolha outro nome de usuário.',
    USERNAME_COOLDOWN:
      'Seu @ pode ser alterado uma vez a cada 30 dias. Confira a próxima data no perfil.',
    DEVICE_VERIFICATION_REQUIRED: 'Confirme este dispositivo com o código enviado ao seu e-mail.',
    DEVICE_LIMIT:
      'Você chegou ao limite de 20 aparelhos. Remova um aparelho reconhecido e tente novamente.',
    PROFILE_UNAVAILABLE: 'Esse perfil não está disponível.',
    PROFILE_REQUIRED: 'Complete seu perfil antes de escolher uma foto.',
    AVATAR_NOT_UPLOADED: 'A foto não terminou de enviar. Escolha a imagem novamente.',
  };
  for (const [key, message] of Object.entries(messages))
    if (text.includes(key)) return new Error(message);
  if (e?.code === '23505') return new Error(messages.USERNAME_UNAVAILABLE);
  if (e?.code === 'PGRST202')
    return new Error(
      'Esta versão ainda está sendo preparada. Tente novamente em alguns instantes.',
    );
  if (e?.code === '22023' || e?.code === '23514' || e?.code === '23502')
    return new Error('Confira os dados do perfil e tente salvar novamente.');
  if (e?.code === '42501')
    return new Error('Confirme seu acesso ou atualize a tela para continuar.');
  if (e?.code === 'otp_expired' || /expired|invalid.*token/i.test(text))
    return new Error(
      'Esse código expirou ou não está correto. Confira os seis dígitos ou peça outro.',
    );
  if (/email.*not.*allowed|not.*authorized.*email/i.test(text))
    return new Error(
      'O envio de e-mail ainda não está disponível para este endereço. Tente novamente quando a configuração estiver concluída.',
    );
  if (e?.status === 429 || /rate limit|too many/i.test(text))
    return new Error('Muitas tentativas. Aguarde alguns minutos antes de pedir outro código.');
  if (/fetch|network|timeout|abort/i.test(text))
    return new Error('Não foi possível conectar. Confira sua internet e tente novamente.');
  if (error instanceof Error && !e.code) return error;
  return new Error('Não foi possível concluir agora. Tente novamente.');
}
async function request<T>(name: string, args: object = {}): Promise<T> {
  if (ideasPreview) {
    const response = await fetch('https://closet-test.supabase.co/preview/v1/identity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, args }),
      signal: AbortSignal.timeout(15000),
    });
    const result = await response.json();
    if (!response.ok) throw identityError(result);
    return result as T;
  }
  // Centralize the dynamic RPC transport while keeping each public wrapper typed.
  const { data, error } = await client().rpc(
    name as keyof import('@/types/database').Database['public']['Functions'],
    args as never,
  );
  if (error) throw identityError(error);
  return data as T;
}
export async function checkDevice(): Promise<SessionCheck> {
  const id = useAuth.getState().session?.user.id;
  if (!id) throw new Error('Entre na sua conta para continuar.');
  const credential = await deviceCredential(id);
  return request('identity_session', {
    p_device_id: credential.id,
    p_secret: credential.secret,
    p_label: deviceLabel(),
  });
}
export const getAccount = () => request<AccountData>('identity_account');
export const usernameAvailable = (username: string) =>
  request<boolean>('profile_username_available', { p_username: normalizeUsername(username) });
export async function saveProfile(profile: ProfileDraft) {
  const owner = writer();
  const result = await request<AccountData>('profile_save', {
    p_profile: normalizeProfile(profile),
  });
  if (owner !== useAuth.getState().session?.user.id) throw new Error('Sua sessão mudou.');
  useMural.getState().clear();
  clearSocialPhotos();
  return result;
}
export async function setAvatar(path: string | null) {
  writer();
  return request<AccountData>('profile_set_avatar', { p_path: path });
}
export const lookupProfile = (username: string) =>
  request<ProfileCard | null>('profile_lookup', { p_username: normalizeUsername(username) });
export const connections = (kind: 'following' | 'followers' | 'blocked', offset = 0) =>
  request<Connection[]>('profile_connections', { p_kind: kind, p_offset: offset });
export async function connectProfile(
  id: string,
  action: 'follow' | 'unfollow' | 'block' | 'unblock' | 'remove_follower',
) {
  writer();
  const result = await request<AccountData>('profile_connect', { p_target: id, p_action: action });
  useMural.getState().clear();
  clearSocialPhotos();
  return result;
}
export async function revokeDevice(id: string) {
  writer();
  return request<void>('identity_revoke_device', { p_id: id });
}
export async function sendDeviceCode() {
  const email = useAuth.getState().session?.user.email;
  if (!email) throw new Error('Entre com seu e-mail para receber o código.');
  const { error } = await client().auth.signInWithOtp({
    email,
    options: { shouldCreateUser: false },
  });
  if (error) throw identityError(error);
}

export async function setBanner(path: string | null) {
  writer();
  return request<AccountData>('profile_set_banner', { p_path: path });
}
