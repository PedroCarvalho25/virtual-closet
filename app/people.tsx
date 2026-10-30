import { useCallback, useState } from 'react';
import { ExampleFollowers, useShowcase } from '@/showcase/components';
import { visibleFollowers } from '@/showcase/model';
import { Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Button, Chip, Field, Label, Notice, Page, PageTitle, TopBar } from '@/components/ui';
import { SoftPressable } from '@/components/motion';
import { ConfirmAction } from '@/components/ConfirmAction';
import { useData, useTask } from '@/hooks/useData';
import { Avatar } from '@/identity/ProfileAvatar';
import { connections, connectProfile, lookupProfile } from '@/identity/api';
import { useIdentity } from '@/identity/store';
import { normalizeUsername } from '@/identity/validation';
import type { Connection } from '@/identity/types';
import { useAuth } from '@/stores/auth';
type ViewKind = 'search' | 'following' | 'followers' | 'blocked';
export default function PeopleScreen() {
  const showcase = useShowcase();
  const params = useLocalSearchParams<{ view?: string }>();
  const [view, setView] = useState<ViewKind>(
    ['following', 'followers', 'blocked'].includes(params.view || '')
      ? (params.view as ViewKind)
      : 'search',
  );
  const [username, setUsername] = useState('');
  const [extra, setExtra] = useState<Connection[]>([]);
  const [more, setMore] = useState(true);
  const task = useTask();
  const online = useAuth((s) => s.online);
  const load = useCallback(
    async () => ({ kind: view, rows: view === 'search' ? [] : await connections(view) }),
    [view],
  );
  const state = useData(load);
  const initial = state.data?.kind === view ? state.data.rows : [];
  const rows = [...new Map([...initial, ...extra].map((person) => [person.id, person])).values()];
  const switchView = (next: ViewKind) => {
    if (task.busy) return;
    setExtra([]);
    setMore(true);
    setView(next);
    task.setError(null);
    task.setSuccess(null);
  };
  return (
    <Page>
      <TopBar back title="Encontros" />
      <PageTitle title="Pessoas" subtitle="Busque pelo @ completo." />
      <View className="flex-row flex-wrap gap-2">
        {Object.entries({
          search: 'Encontrar',
          following: 'Seguindo',
          followers: 'Seguidores',
          blocked: 'Bloqueados',
        }).map(([key, label]) => (
          <Chip
            key={key}
            label={label}
            selected={view === key}
            onPress={() => switchView(key as ViewKind)}
          />
        ))}
      </View>
      {view === 'search' ? (
        <View className="gap-4 rounded-[24px] bg-sage p-5">
          <Field
            label="Encontrar pelo nome de usuário"
            placeholder="@seu.estilo"
            value={username}
            onChangeText={setUsername}
            maxLength={25}
            autoCapitalize="none"
            autoCorrect={false}
            onSubmitEditing={() => void search()}
          />
          <Button
            title="Encontrar perfil"
            icon="search"
            busy={task.busy}
            disabled={!online || normalizeUsername(username).length < 3}
            onPress={() => void search()}
          />
          <Label className="text-xs leading-5 text-muted">
            Digite o @ completo. Só aparecem perfis que permitem ser encontrados.
          </Label>
        </View>
      ) : (
        <>
          {view === 'followers' && <ExampleFollowers />}
          {!state.loading && !rows.length && !(view === 'followers' && visibleFollowers(showcase).length) && (
            <View className="gap-2 rounded-[24px] bg-sage p-5">
              <Text className="font-semibold text-lg text-ink">
                {view === 'blocked' ? 'Nenhum perfil bloqueado' : 'Nenhum perfil por aqui'}
              </Text>
              <Label className="text-sm leading-6 text-muted">
                {view === 'blocked'
                  ? 'Você ainda não bloqueou nenhum perfil.'
                  : view === 'following'
                    ? 'Encontre uma pessoa pelo @ para começar a acompanhar seu perfil.'
                    : 'Quando alguém seguir você, o perfil aparece aqui.'}
              </Label>
            </View>
          )}
          {rows.map((person) => (
            <View key={person.id} className="gap-3 rounded-[22px] bg-paper p-4">
              <SoftPressable
                accessibilityRole="button"
                accessibilityLabel={`Abrir perfil de @${person.username}`}
                disabled={view === 'blocked'}
                onPress={() =>
                  router.push({ pathname: '/u/[username]', params: { username: person.username } })
                }
                className="flex-row items-center gap-3"
              >
                <Avatar
                  path={person.avatarPath}
                  name={`${person.firstName} ${person.lastName}`}
                  tone={person.tone}
                  size={52}
                />
                <View className="flex-1 gap-1">
                  <Text className="font-semibold text-sm text-ink">@{person.username}</Text>
                  <Label className="text-xs text-muted">
                    {person.firstName} {person.lastName}
                  </Label>
                </View>
              </SoftPressable>
              <ConfirmAction
                label={
                  view === 'blocked'
                    ? `Desbloquear @${person.username}`
                    : view === 'followers'
                      ? `Remover seguidor @${person.username}`
                      : `Deixar de seguir @${person.username}`
                }
                description={
                  view === 'blocked'
                    ? 'Desbloquear este perfil? Vocês não voltarão a se seguir automaticamente.'
                    : view === 'followers'
                      ? 'Remover essa pessoa dos seus seguidores?'
                      : 'Deixar de acompanhar este perfil?'
                }
                busy={task.busy || !online}
                onConfirm={() =>
                  void task.run(
                    () =>
                      connectProfile(
                        person.id,
                        view === 'blocked'
                          ? 'unblock'
                          : view === 'followers'
                            ? 'remove_follower'
                            : 'unfollow',
                      ),
                    (account) => {
                      useIdentity.getState().accept(account);
                      setExtra([]);
                      setMore(true);
                      void state.refresh();
                      task.setSuccess('Suas conexões foram atualizadas.');
                    },
                  )
                }
              />
            </View>
          ))}
          {initial.length === 30 && more && (
            <Button
              title="Ver mais pessoas"
              secondary
              busy={task.busy}
              onPress={() =>
                void task.run(
                  () => connections(view as Exclude<ViewKind, 'search'>, rows.length),
                  (next) => {
                    setExtra((old) => [...old, ...next]);
                    setMore(next.length === 30);
                  },
                )
              }
            />
          )}
        </>
      )}
      <Notice message={state.error || task.error} />
      <Notice message={task.success} kind="success" />
    </Page>
  );
  async function search() {
    await task.run(
      async () => {
        const result = await lookupProfile(username);
        if (!result)
          throw new Error('Não encontramos esse perfil disponível. Confira o @ e tente novamente.');
        return result;
      },
      (result) =>
        router.push({ pathname: '/u/[username]', params: { username: result.profile.username } }),
    );
  }
}
