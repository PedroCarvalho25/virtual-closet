import { useCallback, useState } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Button, Field, Label, Loading, Notice, Page, PageTitle, TopBar } from '@/components/ui';
import { Card } from '@/evolution/components';
import { SocialImage } from '@/social/Photo';
import { useData, useTask } from '@/hooks/useData';
import { atelier } from '@/atelier/api';
import type { Collection } from '@/atelier/types';
export default function CollectionsScreen() {
  const { publication, ownerId } = useLocalSearchParams<{
    publication?: string;
    ownerId?: string;
  }>();
  const state = useData(useCallback(() => atelier({ action: 'list', ownerId }), [ownerId]));
  const task = useTask(),
    [title, setTitle] = useState('');
  return (
    <Page>
      <TopBar back title="Coleções" />
      <PageTitle
        title={publication ? 'Guardar uma inspiração' : 'Seu olhar, organizado'}
        subtitle="Uma fotografia pode fazer parte de várias histórias."
      />
      <Notice message={state.error || task.error} action={() => void state.refresh()} />
      <Notice message={task.success} kind="success" />
      {!ownerId && (
        <Card title="Nova coleção">
          <Field
            label="Nome da coleção"
            value={title}
            onChangeText={setTitle}
            maxLength={100}
            placeholder="Uma nova fase, viagem, texturas…"
          />
          <Button
            title="Criar coleção privada"
            disabled={!title.trim()}
            busy={task.busy}
            onPress={() =>
              void task.run(
                async () => {
                  let c = await atelier<Collection>({ action: 'create_collection', title });
                  if (publication)
                    c = await atelier<Collection>({
                      action: 'add_entry',
                      id: c.id,
                      revision: c.revision,
                      publicationId: publication,
                    });
                  return c;
                },
                (c) => {
                  setTitle('');
                  router.push(`/collection/${c.id}`);
                },
              )
            }
          />
        </Card>
      )}
      {state.loading && !state.data && <Loading />}
      {state.data?.collections.map((c) => {
        const cover =
          c.entries.find((e) => e.publication.id === c.coverId)?.publication ||
          c.entries[0]?.publication;
        return (
          <Card key={c.id}>
            {cover && (
              <View style={{ height: 190, borderRadius: 18, overflow: 'hidden' }}>
                <SocialImage
                  path={cover.thumbPath}
                  label={c.title}
                  style={{ height: '100%', width: '100%' }}
                />
              </View>
            )}
            <Label className="font-semibold text-xl">{c.title}</Label>
            <Label className="text-sm text-muted">
              {c.entries.length} referências ·{' '}
              {c.featured
                ? 'Em destaque no perfil'
                : c.permission === 'owner'
                  ? 'Sua coleção'
                  : 'Compartilhada com você'}
            </Label>
            {publication && c.permission !== 'view' && (
              <Button
                title={`Adicionar a ${c.title}`}
                busy={task.busy}
                disabled={c.entries.some((e) => e.publication.id === publication)}
                onPress={() =>
                  void task.run(
                    () =>
                      atelier({
                        action: 'add_entry',
                        id: c.id,
                        publicationId: publication,
                        revision: c.revision,
                      }),
                    () => {
                      task.setSuccess('Foto adicionada à coleção.');
                      void state.refresh();
                    },
                  )
                }
              />
            )}
            <Button
              title={`Abrir coleção ${c.title}`}
              secondary
              onPress={() => router.push(`/collection/${c.id}`)}
            />
          </Card>
        );
      })}
      {state.data?.collections.length === 0 && <Label>Nenhuma coleção por aqui ainda.</Label>}
    </Page>
  );
}
