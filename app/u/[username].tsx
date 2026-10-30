import { useCallback } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Button, Label, Loading, Notice, Page, PageTitle, TopBar } from '@/components/ui';
import { ConfirmAction } from '@/components/ConfirmAction';
import { useData, useTask } from '@/hooks/useData';
import { lookupProfile, connectProfile } from '@/identity/api';
import { ProfileHero } from '@/identity/ProfileHero';
import { useIdentity } from '@/identity/store';
import { useAuth } from '@/stores/auth';
export default function MemberScreen() {
  const { username = '' } = useLocalSearchParams<{ username: string }>();
  const load = useCallback(() => lookupProfile(username), [username]);
  const state = useData(load);
  const task = useTask();
  const online = useAuth((s) => s.online);
  const card = state.data;
  return (
    <Page>
      <TopBar back title="Perfil" />
      {state.loading && !card ? (
        <Loading />
      ) : !card ? (
        <>
          <PageTitle
            title="Esse perfil não está disponível."
            subtitle="Ele pode ter mudado de @ ou escolhido ficar reservado."
          />
          <Button
            title="Encontrar outro perfil"
            secondary
            onPress={() => router.replace('/people')}
          />
        </>
      ) : (
        <>
          <ProfileHero profile={card.profile} />
          <Button title="Coleções em destaque" secondary icon="bookmark" onPress={() => router.push({ pathname: '/collections', params: { ownerId: card.profile.id } })} />
          <View className="flex-row flex-wrap gap-3 rounded-[22px] bg-sage p-5">
            <Label className="text-xs">{card.counts.following} seguindo</Label>
            <Label className="text-xs">{card.counts.followers} seguidores</Label>
            <Label className="text-xs">{card.counts.posts} publicações</Label>
          </View>
          {card.self ? (
            <Button
              title="Abrir minha conta"
              icon="user"
              onPress={() => router.replace('/account')}
            />
          ) : (
            <>
              <Button
                title={
                  card.following
                    ? 'Seguindo · deixar de seguir'
                    : `Seguir @${card.profile.username}`
                }
                icon={card.following ? 'user-check' : 'user-plus'}
                busy={task.busy}
                disabled={!online}
                onPress={() =>
                  void task.run(
                    () => connectProfile(card.profile.id, card.following ? 'unfollow' : 'follow'),
                    (account) => {
                      useIdentity.getState().accept(account);
                      void state.refresh();
                      task.setSuccess(
                        card.following
                          ? 'Você deixou de seguir este perfil.'
                          : 'Você está seguindo este perfil.',
                      );
                    },
                  )
                }
              />
              <ConfirmAction
                label={`Bloquear @${card.profile.username}`}
                description="Vocês deixam de se seguir e de encontrar os perfis um do outro. Você pode desfazer em Minha conta."
                busy={task.busy || !online}
                onConfirm={() =>
                  void task.run(
                    () => connectProfile(card.profile.id, 'block'),
                    (account) => {
                      useIdentity.getState().accept(account);
                      router.replace({ pathname: '/people', params: { view: 'blocked' } });
                    },
                  )
                }
              />
            </>
          )}
          <Button
            title="Ver publicações"
            secondary
            icon="grid"
            onPress={() => router.push({ pathname: '/mural', params: { author: card.profile.id } })}
          />
          <Button
            title="Ver republicações"
            secondary
            icon="repeat"
            onPress={() =>
              router.push({
                pathname: '/mural',
                params: { author: card.profile.id, mode: 'reposts' },
              })
            }
          />
          <Label className="text-center text-xs leading-5 text-muted">
            O closet e o diário desta pessoa continuam privados. Aqui aparecem apenas as fotos que
            ela decidiu publicar.
          </Label>
        </>
      )}
      <Notice message={state.error || task.error} />
      <Notice message={task.success} kind="success" />
    </Page>
  );
}
