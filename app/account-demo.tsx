import { useState } from 'react';
import { View } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Button, Empty, Label, Notice, Page, PageTitle, TopBar } from '@/components/ui';
import { useTask } from '@/hooks/useData';
import { useAuth } from '@/stores/auth';
import { useIdentity } from '@/identity/store';
import { useShowcase } from '@/showcase/components';
import { prepareShowcase, saveShowcase } from '@/showcase/api';
import { showcaseImages } from '@/showcase/images';
import { showcaseItems, showcaseLooks, showcaseUsername, visibleFollowers } from '@/showcase/model';

export default function AccountDemoScreen() {
  const profile = useIdentity((s) => s.account?.profile),
    online = useAuth((s) => s.online);
  const state = useShowcase(),
    task = useTask(),
    [progress, setProgress] = useState('');
  if (profile?.username !== showcaseUsername)
    return (
      <Page>
        <TopBar back title="Apresentação" />
        <Empty
          title="Uma vitrine preparada para o Armando"
          description={`Entre como @${showcaseUsername} para preparar esta conta.`}
        />
      </Page>
    );
  return (
    <Page>
      <TopBar back title="Conta de apresentação" />
      <PageTitle title="Um closet com história." subtitle={`Preparado para @${showcaseUsername}`} />
      <View className="gap-3 rounded-[24px] bg-sage p-5">
        <Label className="font-bold">20 peças · 5 looks · 12 perfis de exemplo</Label>
        <Label className="text-sm leading-6">
          12 fotografias reais e 8 ilustrações de catálogo, com cores e proporções diferentes. As
          peças e os looks entram nesta conta, com cinco registros de uso fictício e dois planos
          para explorar o calendário.
        </Label>
        <Label className="text-xs leading-5 text-muted">
          Seu acervo atual é preservado. Se a conexão cair, abra esta tela para continuar. A
          comunidade fictícia aparece só na apresentação da sua conta, sem criar usuários ou alterar
          suas conexões reais.
        </Label>
        <Button
          title={
            state?.completed
              ? 'Conferir e completar acervo'
              : state
                ? 'Continuar preparação'
                : 'Adicionar acervo à minha conta'
          }
          busy={task.busy}
          disabled={!online}
          onPress={() =>
            void task.run(
              () => prepareShowcase(setProgress),
              () => task.setSuccess('Seu closet de apresentação está pronto.'),
            )
          }
        />
        {!!progress && <Label className="text-sm">{progress}</Label>}
        <Notice message={task.error} />
        <Notice message={task.success} kind="success" />
      </View>
      {state?.completed && (
        <View className="gap-3">
          <Button
            title="1 · Explorar as peças"
            icon="grid"
            onPress={() => router.push('/wardrobe')}
          />
          <Button
            title="2 · Mostrar os looks"
            icon="layers"
            onPress={() => router.push('/outfits')}
          />
          <Button
            title="3 · Abrir calendário"
            icon="calendar"
            onPress={() => router.push('/calendar')}
          />
          <Button
            title={`4 · Comunidade de exemplo (${visibleFollowers(state).length})`}
            icon="users"
            onPress={() => router.push({ pathname: '/people', params: { view: 'followers' } })}
          />
          <Button
            title={
              state.followers ? 'Ocultar seguidores de exemplo' : 'Mostrar seguidores de exemplo'
            }
            secondary
            busy={task.busy}
            onPress={() =>
              void task.run(() => saveShowcase({ ...state, followers: !state.followers }))
            }
          />
          {!!state.hiddenFollowers.length && (
            <Button
              title="Restaurar os 12 perfis de exemplo"
              secondary
              busy={task.busy}
              onPress={() =>
                void task.run(() =>
                  saveShowcase({ ...state, followers: true, hiddenFollowers: [] }),
                )
              }
            />
          )}
        </View>
      )}
      <Label className="font-bold text-xl">As cinco combinações</Label>
      {showcaseLooks.map((look) => (
        <View key={look.key} className="gap-3 rounded-[24px] bg-paper p-4">
          <Image
            source={showcaseImages[`look-${look.key}`]}
            accessibilityLabel={`Composição ${look.name}`}
            style={{ width: '100%', aspectRatio: 1 / 1.2, borderRadius: 16 }}
            contentFit="contain"
          />
          <Label className="font-bold text-lg">{look.name}</Label>
          <Label className="text-sm leading-6">{look.note}</Label>
          <Label className="text-xs text-muted">
            {look.items.map((key) => showcaseItems.find((i) => i.key === key)!.name).join(' · ')}
          </Label>
        </View>
      ))}
      <Label className="font-bold">Imagens e créditos</Label>
      <Label className="text-xs leading-5 text-muted">
        São referências para demonstração, não fotografias do seu guarda-roupa real. Tamanhos e
        modelagens são dados de exemplo. Os créditos e as fontes ficam na história de cada peça; as
        imagens não são publicadas automaticamente no Mural.
      </Label>
    </Page>
  );
}
