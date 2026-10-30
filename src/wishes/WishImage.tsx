import { useCallback } from 'react';
import { View } from 'react-native';
import { Photo } from '@/components/Photo';
import { Button, Label } from '@/components/ui';
import { useData } from '@/hooks/useData';
import { getPublication } from '@/social/api';
import { SocialImage } from '@/social/Photo';
import type { Wish } from '@/evolution/types';
export function WishImage({ wish, credit = false }: { wish: Wish; credit?: boolean }) {
  const id = wish.media?.publicationId;
  const publication = useData(
    useCallback(() => (id ? getPublication(id) : Promise.resolve(null)), [id]),
  );
  const visible =
    !publication.loading && !publication.error && publication.data?.id === id
      ? publication.data
      : null;
  return (
    <View className="flex-1 gap-2">
      <View className="flex-1 overflow-hidden rounded-2xl bg-sage">
        {wish.media?.photoPath ? (
          <Photo path={wish.media.photoPath} category={wish.category} label={wish.title} contain />
        ) : visible ? (
          <SocialImage
            path={visible.fullPath}
            label={wish.title}
            style={{ width: '100%', height: '100%' }}
            fit="contain"
          />
        ) : (
          <View className="flex-1 items-center justify-center p-3">
            <Photo category={wish.category} label={wish.title} />
            {id && (
              <Label className="text-center text-xs text-muted">
                {publication.loading ? 'Abrindo referência…' : 'Referência indisponível'}
              </Label>
            )}
          </View>
        )}
      </View>
      {credit && visible && (
        <Label className="text-xs text-muted">
          {visible.credit ||
            (visible.author ? `Foto de @${visible.author.username}` : 'Referência do Mural')}
        </Label>
      )}
      {credit && publication.error && (
        <Button
          title="Tentar abrir a referência"
          small
          secondary
          onPress={() => void publication.refresh()}
        />
      )}
    </View>
  );
}
