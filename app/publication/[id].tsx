import { CreativeNote } from '@/social/CreativeNote';
import { usePreferences } from '@/settings/preferences';
import { useCallback, useState } from 'react';
import { Linking, Text, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Button, Chip, Empty, Icon, Label, Loading, Notice, Page, TopBar } from '@/components/ui';
import { SoftPressable } from '@/components/motion';
import { ConfirmAction } from '@/components/ConfirmAction';
import { useData, useTask } from '@/hooks/useData';
import { useAuth } from '@/stores/auth';
import { useIdentity } from '@/identity/store';
import { Avatar } from '@/identity/ProfileAvatar';
import { getPublication, getFriends, socialAction, socialError } from '@/social/api';
import { deletePublication, downloadPublication } from '@/social/media';
import { socialSession } from '@/social/session';
import { useMural } from '@/social/store';
import { ZoomPhoto } from '@/social/ZoomPhoto';
import type { Publication, SocialAuthor } from '@/social/types';

export default function PublicationScreen() {
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const quiet = usePreferences((s) => s.quiet);
  const load = useCallback(() => getPublication(id), [id]);
  const state = useData(load);
  const [override, setOverride] = useState<Publication | null>(null);
  useFocusEffect(
    useCallback(() => {
      setOverride(null);
    }, []),
  );
  const p = override?.id === id ? override : state.data;
  const task = useTask();
  const online = useAuth((s) => s.online);
  const [friends, setFriends] = useState<SocialAuthor[] | null>(null);
  const [moreFriends, setMoreFriends] = useState(false);
  const [sent, setSent] = useState<string[]>([]);
  const [options, setOptions] = useState(false);
  const [report, setReport] = useState(false);
  const exit = () => (router.canGoBack() ? router.back() : router.replace('/discover'));
  async function toggle(kind: 'like' | 'save' | 'repost', desired?: boolean) {
    if (!p || task.busy || !online) return;
    const generation = socialSession();
    const previous = p;
    const field = ({ like: 'liked', save: 'saved', repost: 'reposted' } as const)[kind];
    const active = desired ?? !p[field];
    if (p[field] === active) return;
    const optimistic = {
      ...p,
      [field]: active,
      likes: p.likes + (kind === 'like' ? (active ? 1 : -1) : 0),
      reposts: p.reposts + (kind === 'repost' ? (active ? 1 : -1) : 0),
    };
    await task.run(
      async () => {
        setOverride(optimistic);
        useMural.getState().put(optimistic);
        try {
          return await socialAction({ action: kind, id: p.id, active });
        } catch (error) {
          if (generation === socialSession()) {
            setOverride(previous);
            useMural.getState().put(previous);
          }
          throw socialError(error);
        }
      },
      (result) => {
        setOverride(result);
        useMural.getState().put(result);
      },
    );
  }
  return (
    <Page>
      <TopBar back title="Publicação" />
      <Notice
        message={state.error}
        action={() => {
          setOverride(null);
          void state.refresh();
        }}
      />
      {state.loading && !p ? (
        <Loading />
      ) : !p ? (
        <Empty
          title="Publicação indisponível"
          description="Ela pode ter sido excluída ou ter mudado de visibilidade."
        />
      ) : (
        <>
          {p.reposters.length > 0 && (
            <View className="flex-row flex-wrap items-center gap-2">
              <Icon name="repeat" color="#17613E" size={17} />
              <Label className="text-xs text-accent">
                {p.reposters
                  .map((a) =>
                    a.id === useAuth.getState().session?.user.id ? 'Você' : `@${a.username}`,
                  )
                  .join(', ')}{' '}
                {p.reposters.length === 1 ? 'republicou' : 'republicaram'}
              </Label>
            </View>
          )}
          <ZoomPhoto
            key={`photo:${p.id}`}
            publication={p}
            onLike={() => void toggle('like', true)}
          />
          <View className="flex-row justify-between gap-2">
            {(
              [
                {
                  kind: 'like',
                  icon: 'heart',
                  label: p.liked ? 'Descurtir' : 'Curtir',
                  value: p.likes,
                  active: p.liked,
                },
                {
                  kind: 'save',
                  icon: 'bookmark',
                  label: p.saved ? 'Remover dos salvos' : 'Salvar no app',
                  value: null,
                  active: p.saved,
                },
                {
                  kind: 'repost',
                  icon: 'repeat',
                  label: p.reposted ? 'Desfazer republicação' : 'Republicar',
                  value: p.reposts,
                  active: p.reposted,
                },
              ] as const
            ).map((action) => (
              <SoftPressable
                key={action.kind}
                accessibilityRole="button"
                accessibilityLabel={action.label}
                accessibilityState={{ selected: action.active, disabled: task.busy || !online }}
                disabled={task.busy || !online}
                onPress={() => void toggle(action.kind)}
                className={`min-h-16 flex-1 items-center justify-center gap-1 rounded-2xl ${action.active ? 'bg-lemon' : 'bg-paper'}`}
              >
                <View className="flex-row items-center gap-1">
                  <Icon name={action.icon} size={22} color="#17613E" />
                  {!quiet && action.value !== null && (
                    <Text className="font-bold text-sm text-ink">{action.value}</Text>
                  )}
                </View>
                <Label className="text-center text-[10px]">
                  {action.kind === 'like'
                    ? 'Curtir'
                    : action.kind === 'save'
                      ? 'Salvar'
                      : 'Republicar'}
                </Label>
              </SoftPressable>
            ))}
          </View>
          <Button
            title="Combinar com meu closet"
            icon="layers"
            onPress={() =>
              router.push({ pathname: '/wish/[id]', params: { id: 'new', source: p.id } })
            }
          />
          <View className="flex-row flex-wrap gap-2">
            <Button
              title="Guardar em coleção"
              secondary
              small
              icon="bookmark"
              onPress={() =>
                router.push({ pathname: '/collections', params: { publication: p.id } })
              }
            />
            <Button
              title="Abrir no ateliê"
              secondary
              small
              onPress={() => router.push({ pathname: '/outfit/editor', params: { source: p.id } })}
            />
            <Button
              title="Sobre minha foto"
              secondary
              small
              onPress={() => router.push({ pathname: '/try-on', params: { source: p.id } })}
            />
          </View>
          <Notice message={task.error} />
          <Notice message={task.success} kind="success" />
          <View className="gap-3">
            <Text
              accessibilityRole="header"
              className="font-display text-[28px] leading-8 text-ink"
            >
              {p.title}
            </Text>
            {p.author ? (
              <SoftPressable
                accessibilityRole="button"
                accessibilityLabel={`Abrir perfil de @${p.author.username}`}
                onPress={() =>
                  router.push({
                    pathname: '/u/[username]',
                    params: { username: p.author!.username },
                  })
                }
                className="min-h-12 flex-row items-center gap-3"
              >
                <Avatar
                  path={p.author.avatarPath}
                  name={`${p.author.firstName} ${p.author.lastName}`}
                  tone={p.author.tone}
                  size={36}
                />
                <View className="flex-1">
                  <Text className="font-bold text-sm text-ink">
                    {p.author.firstName} {p.author.lastName}
                  </Text>
                  <Label className="text-xs text-muted">@{p.author.username}</Label>
                </View>
                {p.friend && (
                  <View className="flex-row items-center gap-1">
                    <View className="h-2 w-2 rounded-full bg-[#27B65F]" />
                    <Label className="text-xs text-accent">Amigo</Label>
                  </View>
                )}
              </SoftPressable>
            ) : (
              <View className="gap-2">
                <Label className="text-sm text-accent">Acervo fotográfico</Label>
                <Label className="text-xs text-muted">{p.credit}</Label>
                {p.sourceUrl && (
                  <Button
                    small
                    secondary
                    title="Ver fonte da imagem"
                    icon="external-link"
                    onPress={() =>
                      void Linking.openURL(p.sourceUrl!).catch(() =>
                        task.setError('Não foi possível abrir a fonte.'),
                      )
                    }
                  />
                )}
              </View>
            )}
            {!!p.caption && <Label className="text-sm leading-6">{p.caption}</Label>}
            {p.tags.length > 0 && (
              <Label className="text-xs text-muted">{p.tags.map((t) => `#${t}`).join('  ')}</Label>
            )}
          </View>
          {!!p.colors.length && (
            <View className="gap-2">
              <Label className="font-bold text-sm">Continuar por esta cor</Label>
              <View className="flex-row flex-wrap gap-2">
                {p.colors.map((color) => (
                  <Chip
                    key={color}
                    label={`Explorar ${color}`}
                    selected={false}
                    onPress={() => router.push({ pathname: '/mural', params: { color } })}
                  />
                ))}
              </View>
            </View>
          )}
          <CreativeNote key={`note:${p.id}`} id={p.id} />
          <Button
            title="Enviar para amigo"
            icon="send"
            secondary
            busy={task.busy}
            disabled={!online}
            onPress={() =>
              void task.run(
                () => getFriends(),
                (rows) => {
                  setFriends(rows);
                  setMoreFriends(rows.length === 30);
                },
              )
            }
          />
          {friends && (
            <View className="gap-2 rounded-2xl bg-paper p-4">
              <View className="flex-row items-center justify-between">
                <Text className="font-bold text-lg text-ink">Enviar para</Text>
                <Button small secondary title="Fechar" onPress={() => setFriends(null)} />
              </View>
              {friends.length === 0 && (
                <Label className="text-xs leading-5">
                  Os envios ficam entre amigos que se seguem mutuamente.
                </Label>
              )}
              {friends.map((friend) => (
                <Button
                  key={friend.id}
                  title={
                    sent.includes(friend.id)
                      ? `Enviado para @${friend.username}`
                      : `Enviar para @${friend.username}`
                  }
                  icon={sent.includes(friend.id) ? 'check' : 'send'}
                  secondary
                  disabled={task.busy || sent.includes(friend.id)}
                  onPress={() =>
                    void task.run(
                      () => socialAction({ action: 'share', id: p.id, recipient: friend.id }),
                      () => {
                        setSent([...sent, friend.id]);
                        task.setSuccess('Enviado.');
                      },
                    )
                  }
                />
              ))}
              {moreFriends && (
                <Button
                  title="Mais amigos"
                  small
                  secondary
                  onPress={() =>
                    void task.run(
                      () => getFriends(friends.length),
                      (rows) => {
                        setFriends([...friends, ...rows]);
                        setMoreFriends(rows.length === 30);
                      },
                    )
                  }
                />
              )}
            </View>
          )}
          <Button
            title="Salvar imagem no dispositivo"
            icon="download"
            secondary
            disabled={task.busy || !online}
            onPress={() =>
              void task.run(
                () => downloadPublication(p),
                (message) => task.setSuccess(message),
              )
            }
          />
          <Button
            title="Mais opções"
            icon="more-horizontal"
            small
            secondary
            onPress={() => setOptions(!options)}
          />
          {options && (
            <View className="gap-3">
              <Button
                title="Ocultar publicação"
                secondary
                disabled={task.busy}
                onPress={() =>
                  void task.run(
                    () => socialAction({ action: 'hide', id: p.id, active: true }),
                    () => {
                      useMural.getState().remove(p.id);
                      exit();
                    },
                  )
                }
              />
              <Button title="Denunciar publicação" secondary onPress={() => setReport(!report)} />
              {report && (
                <View className="gap-2">
                  <Label className="text-xs">
                    O motivo fica privado. A publicação será ocultada para você.
                  </Label>
                  {(
                    [
                      ['inappropriate', 'Conteúdo inadequado'],
                      ['rights', 'Direitos de imagem ou autoria'],
                      ['spam', 'Spam'],
                    ] as const
                  ).map(([reason, title]) => (
                    <ConfirmAction
                      key={reason}
                      label={title}
                      description="Confirmar esta denúncia?"
                      busy={task.busy}
                      onConfirm={() =>
                        void task.run(
                          () => socialAction({ action: 'report', id: p.id, reason }),
                          () => {
                            useMural.getState().remove(p.id);
                            exit();
                          },
                        )
                      }
                    />
                  ))}
                </View>
              )}
              {p.mine && (
                <ConfirmAction
                  label="Excluir publicação"
                  description="A foto sai do mural, dos salvos e das republicações. Esta ação não pode ser desfeita."
                  busy={task.busy}
                  onConfirm={() =>
                    void task.run(
                      () => deletePublication(p),
                      () => {
                        useMural.getState().remove(p.id);
                        void useIdentity.getState().refresh();
                        exit();
                      },
                    )
                  }
                />
              )}
            </View>
          )}
        </>
      )}
    </Page>
  );
}
