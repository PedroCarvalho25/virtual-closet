import { CareReminders } from '@/planning/CareReminders';
import { PwaSettings } from '@/settings/Pwa';
import { GreetingSettings } from '@/identity/GreetingSettings';
import { useState, type ReactNode } from 'react';
import { Switch, Text, View } from 'react-native';
import { router } from 'expo-router';
import {
  Button,
  Chip,
  Icon,
  Label,
  Loading,
  Notice,
  Page,
  TopBar,
  type IconName,
} from '@/components/ui';
import { MotionReveal } from '@/components/motion';
import { usePreferences, type Preferences } from '@/settings/preferences';
import { useTheme } from '@/settings/Theme';
import { useIdentity } from '@/identity/store';
import { saveProfile } from '@/identity/api';
import { BannerImage, pickBanner, saveBanner } from '@/identity/banner';
import { useTask } from '@/hooks/useData';
import { useAuth } from '@/stores/auth';
import { ConfirmAction } from '@/components/ConfirmAction';
import type { PickedPhoto } from '@/lib/photos';

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: IconName;
  children: ReactNode;
}) {
  return (
    <View className="gap-5 rounded-[26px] border border-line bg-paper p-5">
      <View className="flex-row items-center gap-3">
        <Icon name={icon} size={21} />
        <Text accessibilityRole="header" className="font-bold text-lg text-ink">
          {title}
        </Text>
      </View>
      {children}
    </View>
  );
}
function Toggle({
  title,
  detail,
  value,
  onChange,
  disabled = false,
}: {
  title: string;
  detail: string;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  const colors = useTheme();
  return (
    <View className="min-h-14 flex-row items-center gap-4">
      <View className="flex-1 gap-1">
        <Label className="font-bold">{title}</Label>
        <Label className="text-xs leading-5 text-muted">{detail}</Label>
      </View>
      <Switch
        accessibilityLabel={title}
        accessibilityState={{ checked: value, disabled }}
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        trackColor={{ false: colors.line, true: colors.accent }}
        thumbColor={value ? colors.onAccent : colors.paper}
      />
    </View>
  );
}
export default function SettingsScreen() {
  const preferences = usePreferences();
  const identity = useIdentity();
  const profile = identity.account?.profile;
  const online = useAuth((s) => s.online);
  const task = useTask();
  const [banner, setBanner] = useState<PickedPhoto | null>(null);
  const option = (key: keyof Preferences, title: string, detail: string) => (
    <Toggle
      key={key}
      title={title}
      detail={detail}
      value={!!preferences[key]}
      onChange={(value) => preferences.change(key, value as never)}
    />
  );
  if (!profile)
    return (
      <Page>
        <TopBar back title="Configurações" />
        <Loading />
      </Page>
    );
  return (
    <Page>
      <TopBar back title="Configurações" />
      <MotionReveal>
        <View className="gap-2 pb-2">
          <Text
            accessibilityRole="header"
            className="font-display text-[36px] leading-[40px] tracking-[-1px] text-ink"
          >
            Seu espaço. Seu ritmo.
          </Text>
          <Label className="text-sm text-muted">
            Aparência e navegação ficam neste dispositivo. Privacidade e banner acompanham sua
            conta.
          </Label>
        </View>
      </MotionReveal>
      <Notice message={task.error} />
      <Notice message={task.success} kind="success" />
      <Section title="Aparência" icon="sun">
        <View className="flex-row flex-wrap gap-2">
          {(
            [
              ['system', 'Do dispositivo'],
              ['light', 'Claro'],
              ['dark', 'Escuro'],
            ] as const
          ).map(([value, label]) => (
            <Chip
              key={value}
              label={label}
              selected={preferences.theme === value}
              onPress={() => preferences.change('theme', value)}
            />
          ))}
        </View>
        <View className="flex-row gap-2" accessibilityLabel="Prévia da paleta">
          <View className="h-12 flex-1 rounded-xl bg-canvas" />
          <View className="h-12 flex-1 rounded-xl bg-sage" />
          <View className="h-12 flex-1 rounded-xl bg-lemon" />
          <View className="h-12 flex-1 rounded-xl bg-coral" />
        </View>
      </Section>
      <Section title="Conforto e acessibilidade" icon="eye">
        {option('contrast', 'Mais contraste', 'Textos secundários e bordas mais definidos.')}
        {option(
          'largeText',
          'Ampliar textos de leitura',
          'Mais espaço para ler descrições, campos e referências. O tamanho de texto do sistema também é respeitado.',
        )}
        {option(
          'reduceMotion',
          'Reduzir movimento',
          'Desativa transições e efeitos. A preferência de acessibilidade do sistema sempre prevalece.',
        )}
        <GreetingSettings key={profile.id} firstName={profile.firstName} />
      </Section>
      <Section title="Um mural no seu ritmo" icon="grid">
        {option(
          'continuous',
          'Rolagem contínua',
          'Carrega a próxima página conforme você navega. Desative para escolher quando ver mais.',
        )}
        {option(
          'spacious',
          'Fotos com mais espaço',
          'Uma referência por vez, com imagens maiores e leitura mais tranquila.',
        )}
        {option(
          'quiet',
          'Modo contemplação',
          'Esconde as contagens de curtidas e republicações para focar no trabalho de cada pessoa.',
        )}
        {option(
          'credits',
          'Autoria junto da foto',
          'Mostra também o crédito completo nos cartões do mural. Os créditos continuam disponíveis na publicação.',
        )}
        {option(
          'doubleTap',
          'Dois toques para curtir',
          'Curtir sem sair do mural. Curtir novamente com dois toques mantém a curtida.',
        )}
      </Section>
      <Section title="Privacidade da conta" icon="lock">
        <Toggle
          title="Conta privada"
          detail="Oculta seu perfil, banner e publicações de outras pessoas, inclusive seguidores. Seu closet e diário permanecem privados em qualquer opção."
          value={!profile.discoverable}
          disabled={task.busy || !online}
          onChange={(value) =>
            void task.run(
              () => saveProfile({ ...profile, discoverable: !value }),
              (account) => {
                identity.accept(account);
                task.setSuccess(
                  value
                    ? 'Conta privada. Seu perfil e publicações estão ocultos.'
                    : 'Perfil visível para pessoas conectadas ao Virtual Closet.',
                );
              },
            )
          }
        />
        <Label className="text-xs leading-5 text-muted">
          Ao ativar a privacidade, links temporários de imagens já emitidos podem funcionar por até
          5 minutos. Cópias já baixadas por outras pessoas não podem ser recolhidas.
        </Label>
        <Button
          secondary
          title="Dispositivos e pessoas bloqueadas"
          icon="shield"
          onPress={() => router.push('/account')}
        />
      </Section>
      <Section title="Seu cartão de perfil" icon="image">
        <View className="overflow-hidden rounded-2xl bg-sage">
          <BannerImage path={profile.bannerPath} uri={banner?.uri} />
          {!profile.bannerPath && !banner && (
            <View className="gap-2 p-5">
              <Icon name="image" size={30} />
              <Label className="text-sm">Uma foto sua, uma textura, um detalhe.</Label>
            </View>
          )}
        </View>
        <Label className="text-xs leading-5 text-muted">
          O banner aparece acima do seu @, sem cobrir a leitura. Recorte central panorâmico; dados
          de localização da foto são removidos.
        </Label>
        <Button
          secondary
          title="Escolher imagem do banner"
          icon="image"
          busy={task.busy}
          disabled={!online}
          onPress={() =>
            void task.run(pickBanner, (photo) => {
              if (photo) setBanner(photo);
            })
          }
        />
        {banner && (
          <>
            <Button
              title="Salvar banner"
              icon="check"
              busy={task.busy}
              disabled={!online}
              onPress={() =>
                void task.run(
                  () => saveBanner(banner, profile.bannerPath),
                  (result) => {
                    identity.accept(result.account);
                    setBanner(null);
                    task.setSuccess(result.warning || 'Banner atualizado.');
                  },
                )
              }
            />
            <Button title="Descartar escolha do banner" secondary onPress={() => setBanner(null)} />
          </>
        )}
        {profile.bannerPath && !banner && (
          <ConfirmAction
            label="Remover banner"
            description="Remover a foto do banner e manter as cores do seu perfil?"
            busy={task.busy || !online}
            onConfirm={() =>
              void task.run(
                () => saveBanner(null, profile.bannerPath),
                (result) => {
                  identity.accept(result.account);
                  task.setSuccess(result.warning || 'Banner removido.');
                },
              )
            }
          />
        )}
      </Section>
      <Section title="Instalação e atualizações" icon="smartphone"><PwaSettings /></Section>
      <Section title="Estilo, lembretes e seus dados" icon="sliders">
        <CareReminders />
        <Button title="Preferências de conforto e estilo" secondary onPress={() => router.push({ pathname: '/style', params: { view: 'profile' } })} />
        <Button title="Planos e lembretes" secondary onPress={() => router.push({ pathname: '/style', params: { view: 'travel' } })} />
        <Button title="Exportar dados ou encerrar conta" secondary onPress={() => router.push('/account-data')} />
      </Section>
      <ConfirmAction
        label="Restaurar preferências deste dispositivo"
        description="Voltar à aparência e à navegação originais? Sua privacidade e seu banner não serão alterados."
        onConfirm={() => {
          preferences.reset();
          task.setSuccess('Preferências restauradas.');
        }}
      />
    </Page>
  );
}
