import { usePreferences } from '@/settings/preferences';
import { useTheme } from '@/settings/Theme';
import { PhotoPress } from './PhotoPress';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, ScrollView, Text, TextInput, View } from 'react-native';
import { FlashList, type FlashListRef } from '@shopify/flash-list';
import { router, useFocusEffect } from 'expo-router';
import { Button, Chip, Empty, Icon, IconButton, Label, Notice } from '@/components/ui';
import { SoftPressable, MotionReveal } from '@/components/motion';
import { useAuth } from '@/stores/auth';
import { useMural } from './store';
import { SocialImage } from './Photo';
import { colorFilters, type FeedQuery, type MuralMode, type Publication } from './types';

export function PublicationCard({ publication: p }: { publication: Publication }) {
  const preferences = usePreferences();
  const colors = useTheme();
  const busy = useMural((s) => !!s.busy[p.id]);
  const online = useAuth((s) => s.online);
  return (
    <MotionReveal
      fade={false}
      trigger={p.id}
      style={{ marginHorizontal: 5, marginBottom: 20, gap: 8 }}
    >
      {p.reposters.length > 0 && (
        <View className="flex-row items-center gap-1">
          <Icon name="repeat" size={12} color={colors.accent} />
          <Text numberOfLines={1} className="flex-1 font-medium text-[10px] text-accent">
            {p.reposters[0]!.firstName} republicou
          </Text>
        </View>
      )}
      <PhotoPress
        key={p.id}
        label={`Abrir publicação: ${p.title}`}
        onOpen={() => router.push({ pathname: '/publication/[id]', params: { id: p.id } })}
        onLike={() => {
          if (online)
            void useMural
              .getState()
              .toggle(p, 'like', true)
              .catch(() => {});
        }}
      >
        <SocialImage
          path={p.thumbPath}
          label={p.title}
          style={{
            width: '100%',
            aspectRatio: Math.max(0.48, Math.min(1.85, p.width / p.height)),
            borderRadius: 20,
          }}
        />
        {p.friend && (
          <View
            accessibilityLabel="Publicação de amigo"
            style={{
              position: 'absolute',
              top: 10,
              left: 10,
              width: 13,
              height: 13,
              borderRadius: 7,
              backgroundColor: '#27B65F',
              borderWidth: 2,
              borderColor: '#fff',
            }}
          />
        )}
      </PhotoPress>
      <Text
        numberOfLines={2}
        style={preferences.largeText ? { fontSize: 16, lineHeight: 21 } : undefined}
        className="font-bold text-[13px] leading-[17px] text-ink"
      >
        {p.title}
      </Text>
      <View className="flex-row flex-wrap items-center gap-1">
        <View className="flex-1 gap-1">
          <Text numberOfLines={1} className="font-sans text-[10px] text-muted">
            {p.curated ? 'Acervo fotográfico' : `@${p.author?.username}`}
          </Text>
          {preferences.credits && p.curated && (
            <Text numberOfLines={2} className="font-sans text-[10px] leading-[14px] text-muted">
              {p.credit}
            </Text>
          )}
        </View>
        <SoftPressable
          accessibilityRole="button"
          accessibilityLabel={`${p.liked ? 'Descurtir' : 'Curtir'}: ${p.title}`}
          accessibilityState={{ selected: p.liked, disabled: busy || !online }}
          disabled={busy || !online}
          onPress={() =>
            void useMural
              .getState()
              .toggle(p, 'like')
              .catch(() => {})
          }
          className="h-11 w-11 items-center justify-center rounded-full bg-paper"
        >
          <Icon name="heart" size={18} color={p.liked ? '#C34736' : colors.muted} />
        </SoftPressable>
        <SoftPressable
          accessibilityRole="button"
          accessibilityLabel={`${p.saved ? 'Remover dos salvos' : 'Salvar'}: ${p.title}`}
          accessibilityState={{ selected: p.saved, disabled: busy || !online }}
          disabled={busy || !online}
          onPress={() =>
            void useMural
              .getState()
              .toggle(p, 'save')
              .catch(() => {})
          }
          className={`h-11 w-11 items-center justify-center rounded-full ${p.saved ? 'bg-lemon' : 'bg-paper'}`}
        >
          <Icon name={p.saved ? 'check' : 'bookmark'} size={18} color={colors.accent} />
        </SoftPressable>
      </View>
    </MotionReveal>
  );
}
function Controls({ scrollToMural }: { scrollToMural: () => void }) {
  const colors = useTheme();
  const query = useMural((s) => s.query);
  const [text, setText] = useState(query.search || '');
  useEffect(() => {
    if (text === (query.search || '')) return;
    const timer = setTimeout(() => {
      useMural.getState().search({ ...query, search: text });
      scrollToMural();
    }, 350);
    return () => clearTimeout(timer);
  }, [text, query, scrollToMural]);
  const change = (patch: FeedQuery) => {
    useMural.getState().search({ ...query, ...patch });
    scrollToMural();
  };
  return (
    <View className="gap-3 pb-5 pt-7">
      <View className="flex-row items-center justify-between">
        <Text
          accessibilityRole="header"
          className="font-display text-[34px] tracking-[-1px] text-ink"
        >
          Mural<Text className="text-accent">.</Text>
        </Text>
        <View className="flex-row gap-1">
          <IconButton icon="inbox" label="Recebidos" onPress={() => router.push('/mural-inbox')} />
          <IconButton
            icon="plus"
            label="Publicar foto"
            onPress={() => router.push('/publication/new')}
          />
        </View>
      </View>
      <View className="min-h-14 flex-row items-center gap-3 rounded-full border border-line bg-paper px-4">
        <Icon name="search" size={19} />
        <TextInput
          accessibilityLabel="Buscar no mural"
          placeholder="Peças, estilos, cores…"
          placeholderTextColor={colors.muted}
          value={text}
          onChangeText={setText}
          returnKeyType="search"
          maxLength={100}
          className="min-h-14 flex-1 font-sans text-[14px] text-ink"
        />
        {!!text && <IconButton icon="x" label="Limpar busca" onPress={() => setText('')} />}
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 7 }}
        keyboardShouldPersistTaps="handled"
      >
        {(
          [
            ['all', 'Tudo'],
            ['friends', 'Amigos'],
            ['saved', 'Salvos'],
            ['mine', 'Minhas publicações'],
            ['reposts', 'Republicações'],
          ] as [MuralMode, string][]
        ).map(([mode, label]) => (
          <Chip
            key={mode}
            label={label}
            selected={(query.mode || 'all') === mode}
            onPress={() => change({ mode })}
          />
        ))}
      </ScrollView>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 4 }}
      >
        {colorFilters.map(([name, color]) => (
          <SoftPressable
            key={name}
            accessibilityRole="button"
            accessibilityLabel={`Cor ${name}`}
            accessibilityState={{ selected: query.color === name }}
            onPress={() => change({ color: query.color === name ? '' : name })}
            style={{
              width: 44,
              height: 44,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 22,
              borderWidth: query.color === name ? 2 : 0,
              borderColor: '#17613E',
            }}
          >
            <View
              style={{
                width: 23,
                height: 23,
                borderRadius: 12,
                backgroundColor: color,
                borderWidth: 1,
                borderColor: '#A9AA96',
              }}
            />
            {query.color === name && (
              <View style={{ position: 'absolute' }}>
                <Icon
                  name="check"
                  size={15}
                  color={['branco', 'amarelo', 'bege'].includes(name) ? '#20291F' : 'white'}
                />
              </View>
            )}
          </SoftPressable>
        ))}
      </ScrollView>
      {query.author && (
        <Button
          small
          secondary
          title="Ver publicações de todas as pessoas"
          onPress={() => change({ author: undefined })}
        />
      )}
    </View>
  );
}
export function Mural({ header, initialQuery }: { header?: ReactNode; initialQuery?: FeedQuery }) {
  const state = useMural();
  const preferences = usePreferences();
  const list = useRef<FlashListRef<Publication>>(null);
  const anchor = useRef(0);
  const scrollToMural = useCallback(
    () => list.current?.scrollToOffset({ offset: anchor.current, animated: false }),
    [],
  );
  useEffect(() => {
    if (initialQuery) useMural.getState().search(initialQuery);
    else if (!useMural.getState().loaded) void useMural.getState().load();
  }, [initialQuery]);
  useFocusEffect(
    useCallback(() => {
      if (!useMural.getState().loaded) void useMural.getState().load();
    }, []),
  );
  return (
    <FlashList
      ref={list}
      key={preferences.spacious ? 'spacious' : 'masonry'}
      data={state.items}
      masonry
      numColumns={preferences.spacious ? 1 : 2}
      overrideItemLayout={(layout, item, index) => {
        layout.span = !preferences.spacious && index % 13 === 8 && item.width > item.height ? 2 : 1;
      }}
      keyExtractor={(p) => p.id}
      renderItem={({ item }) => <PublicationCard publication={item} />}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ paddingHorizontal: 15, paddingBottom: 36 }}
      onEndReached={() => {
        if (preferences.continuous && !state.error) void state.load(true);
      }}
      onEndReachedThreshold={0.6}
      refreshing={state.loading && state.loaded}
      onRefresh={() => void state.load()}
      ListHeaderComponent={
        <View style={{ paddingHorizontal: 5 }}>
          <View style={{ gap: 20 }}>{header}</View>
          <View
            onLayout={(event) => {
              anchor.current = event.nativeEvent.layout.y;
            }}
          >
            <Controls scrollToMural={scrollToMural} />
          </View>
          <Notice message={state.error} action={() => void state.load()} />
        </View>
      }
      ListEmptyComponent={
        state.loading ? (
          <View className="py-12">
            <ActivityIndicator color="#17613E" />
          </View>
        ) : !state.error ? (
          <Empty
            title="Ainda não há fotos aqui"
            description={
              state.query.mode === 'friends'
                ? 'As publicações e republicações dos seus amigos aparecerão aqui.'
                : 'Experimente outra busca ou publique uma referência sua.'
            }
            icon="image"
          />
        ) : null
      }
      ListFooterComponent={
        state.items.length > 0 ? (
          <View className="px-1 py-5">
            {state.loading ? (
              <ActivityIndicator color="#17613E" />
            ) : state.next ? (
              <Button title="Carregar mais fotos" secondary onPress={() => void state.load(true)} />
            ) : (
              <Label className="text-center text-xs text-muted">
                Você chegou ao fim desta seleção. Novas publicações entram aqui conforme são
                compartilhadas.
              </Label>
            )}
          </View>
        ) : null
      }
    />
  );
}
