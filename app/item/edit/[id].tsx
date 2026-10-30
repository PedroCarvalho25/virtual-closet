import { useCallback } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { fetchItem } from '@/lib/api';
import { useData } from '@/hooks/useData';
import { useClosetCache } from '@/stores/cache';
import { ItemForm } from '@/components/ItemForm';
import { OfflineNotice } from '@/components/OfflineNotice';
import { Empty, Loading, Notice, Page, TopBar } from '@/components/ui';
export default function EditItemScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { items } = useClosetCache();
  const load = useCallback(() => fetchItem(id), [id]);
  const result = useData(load, items.find((i) => i.id === id) || null);
  return (
    <Page>
      <TopBar back title="Editar peça" />
      <OfflineNotice />
      <Notice message={result.error} action={result.refresh} />
      {result.data ? (
        <ItemForm key={result.data.id} existing={result.data} />
      ) : result.loading ? (
        <Loading />
      ) : (
        <Empty
          title="Peça indisponível"
          description="Conecte-se e atualize os dados para abrir esta peça."
        />
      )}
    </Page>
  );
}
