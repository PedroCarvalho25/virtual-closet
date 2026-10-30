import { useCallback, useState } from 'react';
import { ShowcaseCard, useShowcase } from '@/showcase/components';
import { visibleFollowers } from '@/showcase/model';
import { Platform, Share, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { signOutOnDevice } from '@/lib/auth-session';
import { useAuth } from '@/stores/auth';
import { useTask } from '@/hooks/useData';
import { ConfirmAction } from '@/components/ConfirmAction';
import { Button, Icon, IconButton, Label, Notice, Page, TopBar } from '@/components/ui';
import { SoftPressable, MotionReveal } from '@/components/motion';
import { useIdentity } from '@/identity/store';
import { ProfileHero } from '@/identity/ProfileHero';
import { ProfileForm } from '@/identity/ProfileForm';
import { Avatar } from '@/identity/ProfileAvatar';
import { pickAvatar, saveAvatar } from '@/identity/avatar';
import { revokeDevice } from '@/identity/api';
import { forgetDeviceCredential } from '@/identity/device';
import { shareProfileText } from '@/identity/validation';
import type { PickedPhoto } from '@/lib/photos';
export default function AccountScreen() {
  const identity = useIdentity();
  const showcase = useShowcase();
  const { session, online } = useAuth();
  const task = useTask();
  const [editing, setEditing] = useState(false);
  const [photoPanel, setPhotoPanel] = useState(false);
  const [photo, setPhoto] = useState<PickedPhoto | null>(null);
  const [devicesOpen, setDevicesOpen] = useState(false);
  useFocusEffect(
    useCallback(() => {
      if (online) void useIdentity.getState().refresh();
    }, [online]),
  );
  const data = identity.account;
  const profile = data?.profile;
  if (!data || !profile)
    return (
      <Page>
        <TopBar back title="Minha conta" />
        <Notice message={identity.error} action={identity.refresh} />
      </Page>
    );
  const share = async () => {
    const content = shareProfileText(profile.username, process.env.EXPO_PUBLIC_APP_URL);
    const message = `${content.message}${content.url ? `\n${content.url}` : ''}`;
    if (Platform.OS === 'web') {
      if (navigator.share) {
        try {
          await navigator.share({
            title: `@${profile.username} · Virtual Closet`,
            text: content.message,
            ...(content.url ? { url: content.url } : {}),
          });
        } catch (error) {
          if ((error as Error).name !== 'AbortError') throw error;
        }
      } else {
        await navigator.clipboard.writeText(message);
        task.setSuccess('Seu perfil foi copiado. Cole na conversa que preferir.');
      }
    } else await Share.share({ title: 'Meu Virtual Closet', message });
  };
  return (
    <Page>
      <TopBar
        back
        title={editing ? 'Editar meu perfil' : 'Minha conta'}
        right={
          <IconButton
            icon="settings"
            label="Configurações"
            onPress={() => router.push('/settings')}
          />
        }
      />
      {editing ? (
        <ProfileForm
          initial={profile}
          current={profile}
          onSaved={(account) => {
            identity.accept(account);
            setEditing(false);
            task.setSuccess('Perfil atualizado.');
          }}
          onCancel={() => setEditing(false)}
        />
      ) : (
        <>
          <ProfileHero profile={profile} onPhoto={() => setPhotoPanel(!photoPanel)} />
          <ShowcaseCard />
          <View className="flex-row gap-3">
            {(
              [
                ['following', 'Seguindo', 'arrow-up-right'],
                ['followers', 'Seguidores', 'users'],
                ['posts', 'Posts', 'bookmark'],
              ] as const
            ).map(([key, label, icon]) => (
              <SoftPressable
                key={key}
                accessibilityRole="button"
                accessibilityLabel={`${data.counts[key] + (key === 'followers' ? visibleFollowers(showcase).length : 0)} ${label}`}
                onPress={() =>
                  key === 'posts'
                    ? router.push({ pathname: '/mural', params: { mode: 'mine' } })
                    : router.push({ pathname: '/people', params: { view: key } })
                }
                className="flex-1 gap-2 rounded-[20px] border border-line bg-paper px-3 py-4"
              >
                <Icon name={icon} size={17} color="#17613E" />
                <Text className="font-display text-[28px] leading-8 text-ink">
                  {(data.counts[key] + (key === 'followers' ? visibleFollowers(showcase).length : 0)).toLocaleString('pt-BR')}
                </Text>
                <Label className="text-[11px] leading-4 text-muted">{label}</Label>
              </SoftPressable>
            ))}
          </View>
          <Button
            title="Compartilhar perfil"
            icon="send"
            disabled={!profile.discoverable || task.busy}
            onPress={() => void task.run(share)}
          />
          {!profile.discoverable && (
            <Label className="text-xs leading-5 text-muted">
              Ative “Permitir encontrar meu perfil” na edição para compartilhar seu cartão.
            </Label>
          )}
          <Button
            title="Editar meu perfil"
            secondary
            icon="edit-3"
            onPress={() => setEditing(true)}
          />
          {photoPanel && (
            <MotionReveal>
              <View className="gap-4 rounded-[24px] bg-sage p-5">
                <View className="items-center">
                  <Avatar
                    path={profile.avatarPath}
                    uri={photo?.uri}
                    name={profile.firstName}
                    size={132}
                    tone={profile.tone}
                  />
                </View>
                <Label className="text-center text-xs leading-5 text-muted">
                  Até 50 MB · recorte quadrado automático.
                </Label>
                <Button
                  title="Escolher foto do perfil"
                  icon="image"
                  secondary
                  busy={task.busy}
                  disabled={!online}
                  onPress={() =>
                    void task.run(pickAvatar, (value) => {
                      if (value) setPhoto(value);
                    })
                  }
                />
                {photo && (
                  <Button
                    title="Salvar foto do perfil"
                    icon="check"
                    busy={task.busy}
                    disabled={!online}
                    onPress={() =>
                      void task.run(
                        () => saveAvatar(photo, profile.avatarPath),
                        (result) => {
                          identity.accept(result.account);
                          setPhoto(null);
                          setPhotoPanel(false);
                          task.setSuccess(result.warning || 'Foto atualizada.');
                        },
                      )
                    }
                  />
                )}
                {profile.avatarPath && !photo && (
                  <ConfirmAction
                    label="Remover foto do perfil"
                    description="Remover a foto e usar suas iniciais no perfil?"
                    busy={task.busy || !online}
                    onConfirm={() =>
                      void task.run(
                        () => saveAvatar(null, profile.avatarPath),
                        (result) => {
                          identity.accept(result.account);
                          setPhotoPanel(false);
                          task.setSuccess(result.warning || 'Foto removida.');
                        },
                      )
                    }
                  />
                )}
                <Button
                  title="Fechar edição da foto"
                  secondary
                  disabled={task.busy}
                  onPress={() => {
                    setPhoto(null);
                    setPhotoPanel(false);
                  }}
                />
              </View>
            </MotionReveal>
          )}
          <Notice message={task.error || identity.error} />
          <Notice message={task.success} kind="success" />
          <SoftPressable
            accessibilityRole="button"
            accessibilityLabel="Encontrar pessoas"
            onPress={() => router.push('/people')}
            className="min-h-16 flex-row items-center gap-3 rounded-[20px] bg-coral px-5 py-4"
          >
            <Icon name="users" size={23} />
            <Text className="flex-1 font-bold text-lg text-ink">Encontrar pessoas</Text>
            <Icon name="arrow-up-right" size={22} />
          </SoftPressable>
          <View className="gap-4 border-t border-line pt-5">
            <View className="flex-row items-center gap-2">
              <Icon name="shield" color="#17613E" size={19} />
              <Text className="font-bold text-xl text-ink">Privacidade e acesso</Text>
            </View>
            <Label className="text-xs leading-5 text-muted">
              Seu closet e seu diário são privados. Compartilhar o perfil mostra seu cartão,
              publicações públicas e suas contagens.
            </Label>
            <Button
              title={
                devicesOpen ? 'Ocultar dispositivos reconhecidos' : 'Dispositivos reconhecidos'
              }
              secondary
              icon="smartphone"
              onPress={() => setDevicesOpen(!devicesOpen)}
            />
            {devicesOpen &&
              data.devices.map((device) => (
                <View key={device.id} className="gap-3 rounded-2xl bg-paper p-4">
                  <View className="flex-row items-center gap-3">
                    <Icon name="monitor" size={18} />
                    <View className="flex-1 gap-1">
                      <Text className="font-medium text-sm text-ink">
                        {device.label}
                        {device.current ? ' · este aparelho' : ''}
                      </Text>
                      <Label className="text-xs text-muted">
                        Reconhecido até {new Date(device.expiresAt).toLocaleDateString('pt-BR')}
                      </Label>
                    </View>
                  </View>
                  <ConfirmAction
                    label={`Esquecer ${device.label}${device.current ? ' atual' : ''}`}
                    description={
                      device.current
                        ? 'Você sairá da conta neste aparelho. Um novo código será necessário na próxima entrada.'
                        : 'Esse aparelho precisará confirmar o e-mail novamente para acessar seu closet.'
                    }
                    busy={task.busy || !online}
                    onConfirm={() =>
                      void task.run(async () => {
                        await revokeDevice(device.id);
                        if (device.current && session) {
                          await forgetDeviceCredential(session.user.id);
                          await signOutOnDevice();
                        } else await identity.refresh();
                      })
                    }
                  />
                </View>
              ))}
            <Button
              title="Perfis bloqueados"
              secondary
              icon="slash"
              onPress={() => router.push({ pathname: '/people', params: { view: 'blocked' } })}
            />
            <Label className="text-xs text-muted">E-mail da conta: {session?.user.email}</Label>
            <ConfirmAction
              label="Sair da minha conta"
              description="Sair neste aparelho e limpar os dados disponíveis offline? O aparelho continua reconhecido até você removê-lo."
              busy={task.busy}
              onConfirm={() => void task.run(signOutOnDevice)}
            />
          </View>
        </>
      )}
    </Page>
  );
}
