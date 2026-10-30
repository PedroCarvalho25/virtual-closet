import { client } from '@/lib/supabase';
import { writer } from '@/lib/api';
import { useAuth } from '@/stores/auth';
import { socialSession } from '@/social/session';
import { ideasPreview } from '@/preview/config';
import type { AtelierData } from './types';
export async function atelier<T = AtelierData>(action: object = { action: 'list' }): Promise<T> {
  const owner = writer(),
    generation = socialSession();
  let value: T;
  if (ideasPreview) {
    const response = await fetch('https://closet-test.supabase.co/preview/v1/atelier', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(action),
      signal: AbortSignal.timeout(15000),
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body.message || 'Não foi possível salvar.');
    value = body;
  } else {
    const { data, error } = await client().rpc(
      'atelier_action' as never,
      { p_action: action } as never,
    );
    if (error) {
      if (error.message.includes('CONFLICT'))
        throw new Error('Este conteúdo mudou em outro aparelho. Atualize antes de salvar.');
      if (error.code === 'PGRST202')
        throw new Error(
          'As novas ferramentas aguardam a atualização do projeto. Seu closet continua disponível.',
        );
      if (error.code === '42501')
        throw new Error('Este conteúdo ou esta permissão não está mais disponível.');
      throw new Error('Não foi possível concluir. Confira os campos e sua conexão.');
    }
    value = data as T;
  }
  if (owner !== useAuth.getState().session?.user.id || generation !== socialSession())
    throw new Error('Sua sessão mudou. Abra esta tela novamente.');
  return value;
}
