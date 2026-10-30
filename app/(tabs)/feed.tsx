import { useCallback } from 'react';
import { Pressable, Text, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';
import { fetchPosts, removePost } from '@/lib/api';
import { usePagedData, useTask } from '@/hooks/useData';
import { useAuth } from '@/stores/auth';
import { OutfitArtwork } from '@/components/cards';
import { ConfirmAction } from '@/components/ConfirmAction';
import { OfflineNotice } from '@/components/OfflineNotice';
import {
  Button,
  Empty,
  Icon,
  Label,
  Loading,
  Notice,
  Page,
  PageTitle,
  TopBar,
} from '@/components/ui';
import type { FeedPost } from '@/types/domain';
const emptyPosts: FeedPost[] = [];
export default function FeedScreen() {
  const load = useCallback((page: number) => fetchPosts(page), []);
  const result = usePagedData(load, emptyPosts);
  const task = useTask();
  const { online } = useAuth();
  return (
    <Page scroll={false}>
      <FlashList
        data={result.data}
        numColumns={2}
        masonry
        keyExtractor={(post) => post.id}
        contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 80 }}
        refreshing={result.loading && result.data.length > 0}
        onRefresh={result.refresh}
        onEndReached={result.more}
        ListHeaderComponent={
          <View className="gap-4 px-1.5 pb-5">
            <TopBar />
            <PageTitle title="Meu feed" />
            <View className="flex-row items-center gap-1.5">
              <Icon name="lock" size={11} />
              <Label className="text-[11px] text-muted">Visível apenas para você</Label>
            </View>
            <OfflineNotice cache={false} />
            <Notice message={result.error} action={result.refresh} />
            <Notice message={task.error} />
          </View>
        }
        renderItem={({ item: post, index }) => (
          <View className="mb-6 gap-2 px-1.5">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Abrir outfit deste post"
              onPress={() => router.push(`/outfit/${post.outfit_id}`)}
              className="overflow-hidden rounded-[20px]"
              style={{ aspectRatio: index % 2 ? 0.95 : 0.73 }}
            >
              <OutfitArtwork outfit={post.outfit} />
            </Pressable>
            <View className="gap-1 px-0.5">
              <Text className="font-semibold text-[12px] leading-[17px] text-ink">
                {post.outfit.name || 'Uma boa combinação'}
              </Text>
              {post.caption && (
                <Label className="text-[11px] leading-[17px] text-muted">{post.caption}</Label>
              )}
              <Label className="py-1 text-[10px] text-muted">
                {new Date(post.created_at).toLocaleDateString('pt-BR', {
                  day: 'numeric',
                  month: 'short',
                })}
              </Label>
              <ConfirmAction
                compact
                label="Remover post"
                description="Remover este post? Sua combinação e seu histórico continuam guardados."
                busy={task.busy}
                disabled={!online}
                onConfirm={() => {
                  void task.run(() => removePost(post.id));
                }}
              />
            </View>
          </View>
        )}
        ListEmptyComponent={
          result.loading ? (
            <Loading />
          ) : result.error || !online ? null : (
            <Empty
              title="Nenhuma publicação"
              description="Escolha uma combinação e guarde seu primeiro look aqui."
              icon="bookmark"
            />
          )
        }
        ListFooterComponent={
          result.hasMore ? (
            <Button
              title="Carregar mais posts"
              secondary
              busy={result.loading}
              onPress={result.more}
            />
          ) : null
        }
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Escolher outfit para postar"
        disabled={!online}
        onPress={() => router.push('/outfits')}
        className={`absolute bottom-5 right-5 h-14 w-14 items-center justify-center rounded-[20px] bg-accent ${!online ? 'opacity-45' : 'active:opacity-80'}`}
        style={{ boxShadow: '0 6px 20px #29372426' }}
      >
        <Icon name="plus" size={26} color="#fff" />
      </Pressable>
    </Page>
  );
}
