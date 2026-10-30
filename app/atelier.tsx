import { useCallback } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Button, Empty, Label, Loading, Notice, Page, PageTitle, TopBar } from '@/components/ui';
import { Disclosure } from '@/components/Disclosure';
import { useData } from '@/hooks/useData';
import { atelier } from '@/atelier/api';
import { Canvas } from '@/atelier/Canvas';
import { useStudioScreen } from '@/preview/store';
import { getPublication } from '@/social/api';
import type { Publication } from '@/social/types';
export default function AtelierScreen() {
  const state = useData(useCallback(() => atelier(), []));
  const studio = useStudioScreen();
  const references = [
    ...new Set(
      state.data?.designs.flatMap((d) =>
        d.layers.filter((l) => l.kind === 'reference').map((l) => l.target),
      ) || [],
    ),
  ]
    .sort()
    .join(',');
  const photos = useData(
    useCallback(async () => {
      if (!references) return [];
      return (
        await Promise.all(references.split(',').map((id) => getPublication(id).catch(() => null)))
      ).filter(Boolean) as Publication[];
    }, [references]),
  );
  return (
    <Page>
      <TopBar back title="Ateliê" />
      <PageTitle
        title="E se misturar?"
        subtitle="Um espaço para brincar com o que tem a sua cara."
      />
      <Button
        title="Criar uma composição"
        icon="plus"
        onPress={() => router.push('/outfit/editor')}
      />
      <View className="flex-row flex-wrap gap-2">
        <Button
          title="Meus desejos"
          secondary
          small
          icon="heart"
          onPress={() => router.push('/wishes')}
        />
        <Button
          title="Minhas coleções"
          secondary
          small
          icon="bookmark"
          onPress={() => router.push('/collections')}
        />
      </View>
      <Notice
        message={state.error || studio.error}
        action={() => {
          void state.refresh();
          void studio.load();
        }}
      />
      {state.loading && !state.data && <Loading />}
      {state.data?.designs.length === 0 && (
        <Empty
          title="Pode começar sem ter tudo em mente."
          description="Traga uma peça sua ou um achado do Mural. Seus rascunhos ficam aqui."
          action={
            <Button title="Buscar uma inspiração" secondary onPress={() => router.push('/mural')} />
          }
        />
      )}
      <View className="flex-row items-start gap-3">
        {[0, 1].map((column) => (
          <View key={column} className="flex-1 gap-5">
            {state.data?.designs
              .filter((_, i) => i % 2 === column)
              .map((d) => (
                <View key={d.id} className="gap-2">
                  <Canvas
                    layers={d.layers}
                    items={studio.data?.items || []}
                    wishes={studio.data?.evolution?.wishes || []}
                    publications={photos.data || []}
                  />
                  <Label className="text-xs text-muted">
                    {d.outfitId ? 'Look salvo' : 'Rascunho'}
                    {d.parentId ? ' · nova versão' : ''}
                  </Label>
                  <Button
                    title={`Abrir ${d.title}`}
                    secondary
                    small
                    onPress={() =>
                      router.push({ pathname: '/outfit/editor', params: { id: d.id } })
                    }
                  />
                </View>
              ))}
          </View>
        ))}
      </View>
      <Disclosure title="Minha biblioteca de estilo">
        <Button
          title="Abrir receitas de looks"
          secondary
          onPress={() => router.push({ pathname: '/style', params: { view: 'inspirations' } })}
        />
      </Disclosure>
    </Page>
  );
}
