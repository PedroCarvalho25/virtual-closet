import { useCallback, useState } from 'react';
import { View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Button, Field, Label, Loading, Notice, Page, TopBar } from '@/components/ui';
import { ConfirmAction } from '@/components/ConfirmAction';
import { Card, Choices } from '@/evolution/components';
import { SocialImage } from '@/social/Photo';
import { getFriends } from '@/social/api';
import type { SocialAuthor } from '@/social/types';
import { useData, useTask } from '@/hooks/useData';
import { useAuth } from '@/stores/auth';
import { atelier } from '@/atelier/api';
import type { Collection } from '@/atelier/types';

export default function CollectionScreen() {
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const state = useData(
    useCallback(() => atelier<Collection>({ action: 'get_collection', id }), [id]),
  );
  const [value, setValue] = useState<Collection | null>(null),
    task = useTask();
  const [friends, setFriends] = useState<SocialAuthor[]>([]),
    [role, setRole] = useState<'view' | 'edit'>('view');
  const [friendPage, setFriendPage] = useState(0),
    [moreFriends, setMoreFriends] = useState(false);
  const [comment, setComment] = useState('');
  const owner = useAuth((s) => s.session?.user.id);
  useFocusEffect(
    useCallback(() => {
      setValue((current) => (current?.id === id ? null : current));
    }, [id]),
  );
  const c = value?.id === id ? value : state.data?.id === id ? state.data : null;
  const act = (action: object) =>
    task.run(() => atelier<Collection>({ id, revision: c?.revision, ...action }), setValue);
  if (!c)
    return (
      <Page>
        <TopBar back title="Coleção" />
        <Notice
          message={state.error}
          action={() => {
            setValue(null);
            void state.refresh();
          }}
        />
        {state.loading && <Loading />}
      </Page>
    );
  const editable = c.permission !== 'view',
    mine = c.permission === 'owner';
  return (
    <Page>
      <TopBar back title={c.title} />
      <Notice
        message={state.error || task.error}
        action={() => {
          setValue(null);
          void state.refresh();
        }}
      />
      <Card>
        <Field
          label="Nome da coleção"
          value={c.title}
          maxLength={100}
          editable={editable}
          onChangeText={(title) => setValue({ ...c, title })}
        />
        <Field
          label="Ideia por trás da coleção"
          value={c.note}
          maxLength={1200}
          multiline
          editable={editable}
          onChangeText={(note) => setValue({ ...c, note })}
        />
        <Field
          label="Evento ou ocasião · opcional"
          value={c.event}
          maxLength={160}
          editable={editable}
          onChangeText={(event) => setValue({ ...c, event })}
        />
        <Label className="text-xs text-muted">
          Notas desta coleção acompanham o compartilhamento. Seu caderno privado de cada foto
          continua privado.
        </Label>
        {editable && (
          <Button
            title="Salvar detalhes da coleção"
            busy={task.busy}
            onPress={() =>
              void act({ action: 'save_collection', title: c.title, note: c.note, event: c.event })
            }
          />
        )}
      </Card>
      {c.entries.map((entry, index) => (
        <Card key={entry.publication.id}>
          <View
            style={{
              width: '100%',
              aspectRatio: entry.publication.width / entry.publication.height,
              maxHeight: 480,
              overflow: 'hidden',
              borderRadius: 18,
            }}
          >
            <SocialImage
              path={entry.publication.fullPath}
              label={entry.publication.title}
              style={{ height: '100%', width: '100%' }}
            />
          </View>
          <Label className="font-semibold">{entry.publication.title}</Label>
          <Label className="text-xs text-muted">{entry.publication.credit}</Label>
          <Button
            title="Experimentar esta referência"
            icon="layers"
            onPress={() =>
              router.push({ pathname: '/outfit/editor', params: { source: entry.publication.id } })
            }
          />
          <Button
            title="Abrir foto e caderno privado"
            small
            secondary
            onPress={() => router.push(`/publication/${entry.publication.id}`)}
          />
          <Field
            label="Nota desta referência na coleção"
            value={entry.note}
            maxLength={1200}
            multiline
            editable={editable}
            onChangeText={(note) =>
              setValue({ ...c, entries: c.entries.map((e) => (e === entry ? { ...e, note } : e)) })
            }
          />
          {editable && (
            <>
              <Button
                title="Salvar nota da referência"
                secondary
                small
                busy={task.busy}
                onPress={() =>
                  void act({
                    action: 'entry_note',
                    publicationId: entry.publication.id,
                    note: entry.note,
                  })
                }
              />
              <View className="flex-row flex-wrap gap-2">
                <Button
                  title={c.coverId === entry.publication.id ? 'Capa atual' : 'Usar como capa'}
                  small
                  secondary
                  busy={task.busy}
                  onPress={() => void act({ action: 'cover', publicationId: entry.publication.id })}
                />
                {([-1, 1] as const).map((direction) => (
                  <Button
                    key={direction}
                    title={direction === -1 ? 'Mover antes' : 'Mover depois'}
                    small
                    secondary
                    busy={task.busy}
                    disabled={index + direction < 0 || index + direction >= c.entries.length}
                    onPress={() => {
                      const ids = c.entries.map((e) => e.publication.id);
                      [ids[index], ids[index + direction]] = [ids[index + direction]!, ids[index]!];
                      void act({ action: 'order_entries', ids });
                    }}
                  />
                ))}
              </View>
              <ConfirmAction
                label="Retirar foto desta coleção"
                description="A fotografia continua no Mural e nas outras coleções."
                onConfirm={() =>
                  void act({ action: 'remove_entry', publicationId: entry.publication.id })
                }
              />
            </>
          )}
        </Card>
      ))}
      {!c.entries.length && <Label>Abra uma fotografia do Mural para adicioná-la aqui.</Label>}
      {mine && (
        <Card title="Criar em companhia">
          <Label className="text-sm">
            Convide uma amizade para ver e sugerir, ou para editar esta coleção. Seu closet e seus
            rascunhos não são compartilhados.
          </Label>
          <Choices
            values={{ view: 'Ver e sugerir', edit: 'Editar referências' }}
            value={role}
            onChange={setRole}
          />
          <Button
            title="Escolher amizade"
            secondary
            busy={task.busy}
            onPress={() =>
              void task.run(
                () => getFriends(),
                (rows) => {
                  setFriends(rows);
                  setFriendPage(rows.length);
                  setMoreFriends(rows.length === 30);
                },
              )
            }
          />
          {friends.map((f) => (
            <Button
              key={f.id}
              title={`${c.members.some((m) => m.author.id === f.id) ? 'Atualizar' : 'Convidar'} @${f.username} · ${role === 'view' ? 'ver' : 'editar'}`}
              small
              secondary
              busy={task.busy}
              onPress={() => void act({ action: 'grant', userId: f.id, role })}
            />
          ))}
          {moreFriends && (
            <Button
              title="Mais amizades"
              small
              secondary
              onPress={() =>
                void task.run(
                  () => getFriends(friendPage),
                  (rows) => {
                    setFriends((f) => [...f, ...rows]);
                    setFriendPage(friendPage + rows.length);
                    setMoreFriends(rows.length === 30);
                  },
                )
              }
            />
          )}
          {c.members.map((m) => (
            <ConfirmAction
              key={m.author.id}
              label={`Revogar acesso de @${m.author.username}`}
              description="A pessoa perderá a permissão direta. Se a coleção estiver em destaque público, ainda poderá visualizá-la pelo perfil."
              onConfirm={() => void act({ action: 'revoke', userId: m.author.id })}
            />
          ))}
        </Card>
      )}
      <Card title="Sugestões para esta coleção">
        {c.comments.map((m) => (
          <View key={m.id} className="gap-2 border-b border-line pb-3">
            <Label className="text-sm">
              @{m.author.username} · {m.body}
            </Label>
            {(mine || m.author.id === owner) && (
              <Button
                title="Excluir minha sugestão"
                secondary
                small
                busy={task.busy}
                onPress={() => void act({ action: 'delete_comment', commentId: m.id })}
              />
            )}
          </View>
        ))}
        <Field
          label="Sua sugestão"
          placeholder="Uma combinação, uma cor, um detalhe…"
          value={comment}
          onChangeText={setComment}
          maxLength={600}
          multiline
        />
        <Button
          title="Adicionar sugestão à coleção"
          busy={task.busy}
          disabled={!comment.trim()}
          onPress={() =>
            void task.run(
              () => atelier<Collection>({ action: 'comment', id, body: comment }),
              (result) => {
                setValue(result);
                setComment('');
              },
            )
          }
        />
        <Label className="text-xs text-muted">
          Sugestões são aceitas de quem recebeu acesso direto à coleção.
        </Label>
      </Card>
      {mine && (
        <>
          <ConfirmAction
            label={c.featured ? 'Retirar destaque do perfil' : 'Destacar coleção no meu perfil'}
            description={
              c.featured
                ? 'A coleção continuará disponível somente para você e pessoas convidadas.'
                : 'Título, notas, fotografias e sugestões desta coleção ficarão visíveis a quem puder ver seu perfil. Revise o conteúdo antes de destacar.'
            }
            onConfirm={() => void act({ action: 'feature', active: !c.featured })}
          />
          <ConfirmAction
            label="Excluir coleção"
            description="Excluir esta coleção e suas sugestões? Fotografias originais e outras coleções são preservadas."
            busy={task.busy}
            onConfirm={() =>
              void task.run(
                () => atelier({ action: 'delete_collection', id }),
                () => router.replace('/collections'),
              )
            }
          />
        </>
      )}
      {!mine && (
        <Button
          title="Sair desta coleção compartilhada"
          secondary
          onPress={() =>
            void task.run(
              () => atelier({ action: 'leave_collection', id }),
              () => router.replace('/collections'),
            )
          }
        />
      )}
    </Page>
  );
}
