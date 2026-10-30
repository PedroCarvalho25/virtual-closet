import { useCallback } from 'react';
import { Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { fetchItem, setArchived } from '@/lib/api';
import { formatDate } from '@/lib/dates';
import { categories, fits } from '@/types/domain';
import { useData, useTask } from '@/hooks/useData';
import { useClosetCache } from '@/stores/cache';
import { useAuth } from '@/stores/auth';
import { Photo } from '@/components/Photo';
import { OfflineNotice } from '@/components/OfflineNotice';
import { Button, Empty, Eyebrow, Label, Loading, Notice, Page, TopBar } from '@/components/ui';
export default function ItemScreen() {
  const { id, notice } = useLocalSearchParams<{ id: string; notice?: string }>();
  const { items } = useClosetCache();
  const { online } = useAuth();
  const load = useCallback(() => fetchItem(id), [id]);
  const result = useData(load, items.find((i) => i.id === id) || null);
  const task = useTask();
  const item = result.data;
  return (
    <Page>
      <TopBar back title="Sua peça" />
      <OfflineNotice />
      <Notice kind="success" message={notice} />
      <Notice message={result.error} action={result.refresh} />
      {!item ? (
        result.loading ? (
          <Loading />
        ) : (
          <Empty
            title="Peça indisponível"
            description="Esta peça não está disponível nos dados carregados. Conecte-se e tente atualizar."
          />
        )
      ) : (
        <>
          <View className="overflow-hidden rounded-[24px]" style={{ aspectRatio: 0.95 }}>
            <Photo path={item.photo_path} label={item.name} />
          </View>
          <View className="gap-3">
            <Eyebrow>
              {categories[item.category]}
              {item.archived_at ? ' · Arquivada' : ''}
            </Eyebrow>
            <Text
              accessibilityRole="header"
              className="font-semibold text-[28px] leading-[34px] tracking-[-0.7px] text-ink"
            >
              {item.name}
            </Text>
            <Label className="text-sm text-muted">
              {[item.color, item.size, item.fit ? fits[item.fit] : null, item.brand]
                .filter(Boolean)
                .join(' · ')}
            </Label>
          </View>
          <View className="gap-2 rounded-card bg-sage p-5">
            <Eyebrow>Último uso</Eyebrow>
            <Text className="font-display text-[27px] text-ink">
              {formatDate(item.last_worn_date)}
            </Text>
            <Label className="text-xs leading-5 text-muted">
              O histórico é atualizado quando você registra um outfit com esta peça.
            </Label>
          </View>
          <Notice message={task.error} />
          <Notice message={task.success} kind="success" />
          <Button
            title="Disponibilidade, cuidados e história"
            icon="package"
            secondary
            onPress={() =>
              router.push({ pathname: '/style', params: { view: 'closet', item: id } })
            }
          />
          <Button
            title="Editar peça"
            secondary
            icon="edit-2"
            disabled={!online || task.busy}
            onPress={() => router.push(`/item/edit/${id}`)}
          />
          <Button
            title={item.archived_at ? 'Restaurar ao guarda-roupa' : 'Arquivar peça'}
            icon={item.archived_at ? 'rotate-ccw' : 'archive'}
            secondary
            disabled={!online}
            busy={task.busy}
            onPress={() => {
              void task.run(
                () => setArchived(item, !item.archived_at),
                () =>
                  task.setSuccess(
                    item.archived_at
                      ? 'Peça restaurada.'
                      : 'Peça arquivada. Seus outfits e histórico foram preservados.',
                  ),
              );
            }}
          />
          <Label className="text-center text-xs leading-5 text-muted">
            Arquivar mantém a peça nos outfits e no histórico.
          </Label>
        </>
      )}
    </Page>
  );
}
