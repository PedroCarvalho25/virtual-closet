import { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { fetchOutfit, publishPost } from '@/lib/api';
import { formatDate } from '@/lib/dates';
import { useData, useTask } from '@/hooks/useData';
import { useClosetCache } from '@/stores/cache';
import { useAuth } from '@/stores/auth';
import { ItemCard, OutfitArtwork } from '@/components/cards';
import { OfflineNotice } from '@/components/OfflineNotice';
import { WearForm } from '@/components/WearForm';
import {
  Button,
  Empty,
  Eyebrow,
  Field,
  Label,
  Loading,
  Notice,
  Page,
  TopBar,
} from '@/components/ui';
export default function OutfitScreen() {
  const { id, notice } = useLocalSearchParams<{ id: string; notice?: string }>();
  const { outfits } = useClosetCache();
  const { online } = useAuth();
  const load = useCallback(() => fetchOutfit(id), [id]);
  const result = useData(load, outfits.find((o) => o.id === id) || null);
  const [action, setAction] = useState<'wear' | 'post' | null>(null);
  const [caption, setCaption] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const task = useTask();
  const outfit = result.data;
  return (
    <Page>
      <TopBar back title="Seu outfit" />
      <OfflineNotice />
      <Notice kind="info" message={notice} />
      <Notice message={result.error} action={result.refresh} />
      {!outfit ? (
        result.loading ? (
          <Loading />
        ) : (
          <Empty
            title="Outfit indisponível"
            description="Conecte-se e atualize os dados para abrir esta combinação."
          />
        )
      ) : (
        <>
          <View className="overflow-hidden rounded-[24px]" style={{ aspectRatio: 1.1 }}>
            <OutfitArtwork outfit={outfit} />
          </View>
          <Button title="Criar uma versão no ateliê" secondary icon="layers" onPress={() => router.push({ pathname: '/outfit/editor', params: { outfit: outfit.id } })} />
          <View className="gap-3">
            <Eyebrow>Uma combinação sua</Eyebrow>
            <Text
              accessibilityRole="header"
              className="font-semibold text-[28px] leading-[34px] tracking-[-0.7px] text-ink"
            >
              {outfit.name || 'Uma boa combinação'}
            </Text>
            <Label className="text-xs text-muted">
              Último uso: {formatDate(outfit.last_worn_date, 'Ainda não usado')}
            </Label>
          </View>
          <Notice kind="success" message={message} />
          {!action && (
            <View className="gap-3">
              <Button
                title="Usei este outfit"
                icon="calendar"
                disabled={!online}
                onPress={() => {
                  setAction('wear');
                  setMessage(null);
                }}
              />
              <Button
                title="Publicar no meu feed"
                icon="book-open"
                secondary
                disabled={!online}
                onPress={() => {
                  setAction('post');
                  setMessage(null);
                }}
              />
            </View>
          )}
          {action === 'wear' && (
            <WearForm
              outfitId={id}
              onDone={() => {
                setAction(null);
                setMessage('Uso registrado. Seu histórico foi atualizado.');
              }}
            />
          )}
          {action === 'post' && (
            <View className="gap-4">
              <Field
                label="Legenda · opcional"
                placeholder="A história por trás do look…"
                value={caption}
                onChangeText={setCaption}
                maxLength={1000}
                multiline
                editable={!task.busy}
              />
              <Notice
                kind="info"
                message="Este post ficará visível apenas para você, no seu feed pessoal."
              />
              <Notice message={task.error} />
              <Button
                title="Publicar só para mim"
                icon="check"
                busy={task.busy}
                disabled={!online}
                onPress={() => {
                  void task.run(
                    () => publishPost(id, caption),
                    () => {
                      setAction(null);
                      setCaption('');
                      router.push('/feed');
                    },
                  );
                }}
              />
            </View>
          )}
          {action && (
            <Button title="Fechar" secondary disabled={task.busy} onPress={() => setAction(null)} />
          )}
          <Button
            title="Como me senti com este look"
            icon="heart"
            secondary
            onPress={() => router.push({ pathname: '/style', params: { view: 'memory' } })}
          />
          <View className="gap-4">
            <Eyebrow>{outfit.items.length} peças nessa composição</Eyebrow>
            <View className="flex-row flex-wrap gap-3">
              {outfit.items.map((item) => (
                <View key={item.id} style={{ width: '47%' }}>
                  <ItemCard item={item} />
                </View>
              ))}
            </View>
            <Label className="text-xs leading-5 text-muted">
              Esta composição é fixa para manter seu histórico fiel. Peças arquivadas continuam
              fazendo parte dela.
            </Label>
          </View>
        </>
      )}
    </Page>
  );
}
