import { useCallback } from 'react';
import { Pressable, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';
import { fetchOutfits } from '@/lib/api';
import { usePagedData } from '@/hooks/useData';
import { useClosetCache } from '@/stores/cache';
import { OutfitCard } from '@/components/cards';
import { OfflineNotice } from '@/components/OfflineNotice';
import { Button, Empty, Icon, Loading, Notice, Page, PageTitle, TopBar } from '@/components/ui';
export default function OutfitsScreen() {
  const { outfits } = useClosetCache();
  const load = useCallback((page: number) => fetchOutfits(page), []);
  const result = usePagedData(load, outfits);
  return (
    <Page scroll={false}>
      <FlashList
        data={result.data}
        numColumns={2}
        masonry
        keyExtractor={(o) => o.id}
        contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 80 }}
        onEndReached={result.more}
        refreshing={result.loading && result.data.length > 0}
        onRefresh={result.refresh}
        renderItem={({ item }) => (
          <View className="px-1.5">
            <OutfitCard outfit={item} compact />
          </View>
        )}
        ListHeaderComponent={
          <View className="gap-4 px-1.5 pb-6">
            <TopBar />
            <PageTitle title="Minhas combinações" />
            <OfflineNotice />
            <Notice message={result.error} action={result.refresh} />
          </View>
        }
        ListEmptyComponent={
          result.loading ? (
            <Loading />
          ) : result.error ? null : (
            <Empty
              title="Seu primeiro look"
              description="Junte algumas peças e salve uma combinação que você quer usar."
              icon="layers"
            />
          )
        }
        ListFooterComponent={
          result.hasMore ? (
            <Button
              title="Carregar mais outfits"
              secondary
              busy={result.loading}
              onPress={result.more}
            />
          ) : null
        }
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Criar outfit"
        onPress={() => router.push('/outfit/new')}
        className="absolute bottom-5 right-5 h-14 w-14 items-center justify-center rounded-[20px] bg-accent active:opacity-80"
        style={{ boxShadow: '0 6px 20px #29372426' }}
      >
        <Icon name="plus" size={26} color="#fff" />
      </Pressable>
    </Page>
  );
}
