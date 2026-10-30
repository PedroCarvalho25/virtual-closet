import { SIGNUP_PASSWORD_HINT } from './password';
import { authErrorMessage } from './auth-errors';

export function friendlyError(error: unknown): string {
  const e = error as { code?: string; message?: string; status?: number } | null;
  const message = e?.message || '';
  const authMessage = authErrorMessage(error);
  if (authMessage) return authMessage;
  if (e?.code === 'weak_password') return SIGNUP_PASSWORD_HINT;
  if (e?.code === '23505') return 'Este outfit já foi registrado nesse dia.';
  if (e?.code === '42501')
    return 'Essa ação não está disponível. Atualize os dados e tente novamente.';
  if (e?.code === 'PGRST116') return 'Não encontramos esse conteúdo na sua conta.';
  if (e?.code === '22023')
    return 'Confira as peças selecionadas e escolha uma data que não esteja no futuro.';
  if (e?.code === '23514') return 'Confira os campos e tente salvar novamente.';
  if (/invalid login credentials/i.test(message)) return 'E-mail ou senha incorretos.';
  if (/email not confirmed/i.test(message)) return 'Confirme seu e-mail antes de entrar.';
  if (/already registered/i.test(message)) return 'Esse e-mail já está cadastrado. Tente entrar.';
  if (/rate limit|too many requests/i.test(message) || e?.status === 429)
    return 'Muitas tentativas. Aguarde alguns minutos e tente novamente.';
  if (/fetch|network|timeout|abort/i.test(message))
    return 'Não foi possível conectar. Confira sua internet e tente novamente.';
  if (e?.status === 401 || e?.code === 'PGRST301') return 'Sua sessão expirou. Entre novamente.';
  if (e?.code || e?.status) return 'Não foi possível concluir. Tente novamente em instantes.';
  return error instanceof Error ? error.message : 'Algo deu errado. Tente novamente.';
}
