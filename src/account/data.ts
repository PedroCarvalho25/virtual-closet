import { Platform } from 'react-native';
import { client, recoveryClient } from '@/lib/supabase';
import { writer } from '@/lib/api';
import { useAuth } from '@/stores/auth';
import { socialSession } from '@/social/session';
import { deviceCredential, deviceLabel } from '@/identity/device';
import { signOutOnDevice } from '@/lib/auth-session';
import { ideasPreview } from '@/preview/config';
import { readGreeting } from '@/identity/greetings';
import { readShowcase } from '@/showcase/model';
type MediaEntry = { bucket: string; path: string };
export type AccountExport = {
  format: string;
  exportedAt: string;
  media: MediaEntry[];
  [key: string]: unknown;
};
export async function exportAccount(): Promise<AccountExport> {
  const owner = writer(),
    generation = socialSession();
  const personalized = (data: AccountExport): AccountExport => {
    if (owner !== useAuth.getState().session?.user.id || generation !== socialSession()) throw new Error('Sua sessão mudou.');
    const metadata = useAuth.getState().session?.user.user_metadata;
    return { ...data, greetingPreferences: readGreeting(metadata), showcasePreferences: readShowcase(metadata, owner) };
  };
  if (ideasPreview) {
    const response = await fetch('https://closet-test.supabase.co/preview/v1/account-export');
    if (!response.ok) throw new Error('Exportação de exemplo indisponível.');
    return personalized(await response.json());
  }
  const { data, error } = await client().rpc('account_export' as never);
  if (error)
    throw new Error('Não foi possível exportar. Confira a conexão e a atualização do projeto.');
  if (owner !== useAuth.getState().session?.user.id || generation !== socialSession())
    throw new Error('Sua sessão mudou.');
  return personalized(data as AccountExport);
}
export async function downloadData(data: unknown) {
  const text = JSON.stringify(data, null, 2),
    name = `virtual-closet-dados-${new Date().toISOString().slice(0, 10)}.json`;
  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    return;
  }
  const FileSystem = await import('expo-file-system/legacy'),
    Sharing = await import('expo-sharing');
  const path = `${FileSystem.cacheDirectory}${name}`;
  try {
    await FileSystem.writeAsStringAsync(path, text);
    await Sharing.shareAsync(path, { mimeType: 'application/json', UTI: 'public.json' });
  } finally {
    await FileSystem.deleteAsync(path, { idempotent: true });
  }
}
export async function downloadMediaBatch(offset = 0): Promise<{ next: number; total: number }> {
  const owner = writer(),
    generation = socialSession(),
    data = await exportAccount();
  const files: Record<string, Uint8Array> = {};
  const { zipSync, strToU8 } = await import('fflate');
  const batch = data.media.slice(offset, offset + 10);
  if (!batch.length) throw new Error('Não há imagens próprias neste lote.');
  let totalBytes = 0;
  for (const entry of batch) {
    if (owner !== useAuth.getState().session?.user.id || generation !== socialSession())
      throw new Error('Sua sessão mudou.');
    const { data: signed, error } = await client()
      .storage.from(entry.bucket)
      .createSignedUrl(entry.path, 300);
    if (error)
      throw new Error('Uma imagem não ficou disponível. Tente exportar este lote novamente.');
    const response = await fetch(signed.signedUrl, { signal: AbortSignal.timeout(20000) });
    if (!response.ok) throw new Error('Não foi possível baixar uma das imagens deste lote.');
    const bytes = new Uint8Array(await response.arrayBuffer());
    totalBytes += bytes.byteLength;
    if (totalBytes > 30 * 1024 * 1024)
      throw new Error(
        'Este lote ultrapassou o tamanho seguro para o aparelho. Exporte as imagens individualmente pelo app.',
      );
    files[`${entry.bucket}/${entry.path.split('/').slice(1).join('/')}`] = bytes;
  }
  if (owner !== useAuth.getState().session?.user.id || generation !== socialSession())
    throw new Error('Sua sessão mudou.');
  files['manifesto.json'] = strToU8(
    JSON.stringify({ exportedAt: data.exportedAt, files: batch }, null, 2),
  );
  const zip = zipSync(files, { level: 0 }),
    name = `virtual-closet-imagens-${Math.floor(offset / 10) + 1}.zip`;
  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(new Blob([zip as BlobPart], { type: 'application/zip' })),
      link = document.createElement('a');
    link.href = url;
    link.download = name;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } else {
    const FileSystem = await import('expo-file-system/legacy'),
      Sharing = await import('expo-sharing'),
      { encode } = await import('base64-arraybuffer');
    const file = `${FileSystem.cacheDirectory}${name}`;
    try {
      await FileSystem.writeAsStringAsync(file, encode(zip.buffer as ArrayBuffer), {
        encoding: FileSystem.EncodingType.Base64,
      });
      await Sharing.shareAsync(file, { mimeType: 'application/zip', UTI: 'public.zip-archive' });
    } finally {
      await FileSystem.deleteAsync(file, { idempotent: true });
    }
  }
  return { next: offset + batch.length, total: data.media.length };
}
export async function eraseAccount(
  code: string,
  confirmation: string,
  progress: (value: string) => void,
) {
  if (ideasPreview)
    throw new Error(
      'A prévia não exclui contas reais. Teste de exclusão disponível na suíte local de banco.',
    );
  const owner = writer(),
    email = useAuth.getState().session?.user.email;
  const generation = socialSession(),
    isolated = recoveryClient();
  const guard = () => {
    if (owner !== useAuth.getState().session?.user.id || generation !== socialSession())
      throw new Error('Sua sessão mudou.');
  };
  if (!email || !/^\d{6,8}$/.test(code) || confirmation !== 'EXCLUIR MINHA CONTA')
    throw new Error('Confira o código e a frase de confirmação.');
  const verified = await isolated.auth.verifyOtp({ email, token: code, type: 'email' });
  if (verified.error || verified.data.user?.id !== owner)
    throw new Error('Código inválido ou expirado. Solicite outro código.');
  guard();
  const credential = await deviceCredential(owner);
  const device = await isolated.rpc('identity_session', {
    p_device_id: credential.id,
    p_secret: credential.secret,
    p_label: deviceLabel(),
  });
  if (device.error) throw new Error('Não foi possível confirmar este aparelho.');
  const begin = await isolated.rpc('account_begin_erasure', { p_confirmation: confirmation });
  if (begin.error)
    throw new Error(
      'Não foi possível iniciar a exclusão. Nenhum arquivo foi removido por esta tentativa.',
    );
  const media = begin.data as MediaEntry[];
  let done = 0;
  for (const bucket of [...new Set(media.map((m) => m.bucket))]) {
    const paths = media.filter((m) => m.bucket === bucket).map((m) => m.path);
    for (let start = 0; start < paths.length; start += 50) {
      guard();
      const result = await isolated.storage.from(bucket).remove(paths.slice(start, start + 50));
      if (result.error)
        throw new Error(
          'A limpeza foi interrompida. Sua conta ainda existe e está privada. Solicite novo código e retome a exclusão.',
        );
      done += Math.min(50, paths.length - start);
      progress(`Removendo imagens: ${done} de ${media.length}`);
    }
  }
  guard();
  progress('Concluindo a exclusão dos dados da conta…');
  const finish = await isolated.rpc('account_finish_erasure');
  if (finish.error)
    throw new Error(
      'Não foi possível confirmar a conclusão. Solicite novo código para retomar ou confira se a conta já foi excluída.',
    );
  await signOutOnDevice();
}
