import { useAuth } from '@/stores/auth';
import { useClosetCache } from '@/stores/cache';
import { Notice } from './ui';
export function OfflineNotice({ cache = true }: { cache?: boolean }) {
  const { online } = useAuth();
  const { updatedAt, storageError } = useClosetCache();
  if (online)
    return storageError ? (
      <Notice
        kind="info"
        message="Não foi possível guardar uma cópia local. Seus dados salvos continuam na sua conta."
      />
    ) : null;
  return (
    <Notice
      kind="info"
      message={
        cache
          ? `Você está offline. Busca e filtros mostram apenas os dados disponíveis neste aparelho.${updatedAt ? ` Atualizados em ${new Date(updatedAt).toLocaleString('pt-BR')}.` : ''} Conecte-se para salvar alterações.`
          : 'Você está offline. Conecte-se para consultar esta área e salvar alterações.'
      }
    />
  );
}
