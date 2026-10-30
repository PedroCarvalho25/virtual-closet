import { Text, View } from 'react-native';
import { useCallback, useRef, useState } from 'react';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { greetingFor, greetingCount, readGreeting } from '@/identity/greetings';
import { Button, Icon, Label, Loading, Notice, Page, PageTitle, TopBar } from '@/components/ui';
import { SoftPressable } from '@/components/motion';
import { OutfitArtwork } from '@/components/cards';
import { useStudioScreen } from '@/preview/store';
import { useAuth } from '@/stores/auth';
import { ideasPreview } from '@/preview/config';
import { civilDate, formatDate } from '@/lib/dates';
import { firstLookJourney } from './first-use';
import { FirstSteps, openInspiration } from './FirstSteps';
import { freshEvolution } from './types';
import { DailyLook } from './DailyLook';
import { Mural } from '@/social/Mural';
import { useIdentity } from '@/identity/store';

export default function Home() {
  const state = useStudioScreen();
  const online = useAuth((s) => s.online);
  const firstName = useIdentity((s) => s.account?.profile?.firstName);
  const metadata = useAuth((s) => s.session?.user.user_metadata);
  const [greetingIndex, setGreetingIndex] = useState(() =>
    Math.floor(Math.random() * greetingCount),
  );
  const greeted = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (greeted.current) setGreetingIndex((value) => (value + 1) % greetingCount);
      greeted.current = true;
    }, []),
  );
  const params = useLocalSearchParams<{ saved?: string; warning?: string }>();
  if (!state.data)
    return (
      <Page>
        <TopBar />
        <PageTitle title="Seu closet" />
        <Notice message={state.error} action={state.load} />
        {!state.error && <Loading />}
        <Button title="Abrir meu guarda-roupa" secondary onPress={() => router.push('/wardrobe')} />
      </Page>
    );
  const data = state.data;
  const e = data.evolution || freshEvolution();
  const journey = firstLookJourney(data, e);
  const empty = !data.items.length && !data.outfits.length;
  const name = firstName || e.profile.name.trim().split(/\s+/)[0] || '';
  const nextPlan = [...data.plans]
    .filter((p) => p.end_date >= civilDate())
    .sort((a, b) => a.date.localeCompare(b.date))[0];
  const recentLook = data.outfits[0];
  return (
    <Page scroll={false}>
      <Mural
        header={
          <>
            <TopBar />
            <View className="gap-3">
              {ideasPreview && (
                <View className="self-start rounded-full bg-lemon px-3 py-1.5">
                  <Label className="text-[11px] text-accent">Prévia com dados de exemplo</Label>
                </View>
              )}
              <Text
                testID="home-greeting"
                className="font-medium text-sm text-muted"
                style={{ flexShrink: 1 }}
              >
                {greetingFor(readGreeting(metadata), name, greetingIndex)}
              </Text>
              <Text
                accessibilityRole="header"
                className="font-display text-[42px] leading-[46px] tracking-[-1.8px] text-ink"
              >
                Seu closet<Text className="text-accent">.</Text>
              </Text>
            </View>
            {!online && (
              <Notice
                kind="info"
                message="Você está offline. Seus dados já carregados continuam aqui; conecte-se para guardar algo novo."
              />
            )}
            {params.saved && data.items.some((item) => item.id === params.saved) && (
              <Notice
                kind={params.warning ? 'info' : 'success'}
                message={params.warning || 'Peça adicionada.'}
              />
            )}
            <View className="flex-row flex-wrap gap-2">
              <Button
                title="Ateliê"
                icon="layers"
                secondary
                small
                onPress={() => router.push('/atelier')}
              />
              <Button
                title="Desejos"
                icon="heart"
                secondary
                small
                onPress={() => router.push('/wishes')}
              />
              <Button
                title="Coleções"
                icon="bookmark"
                secondary
                small
                onPress={() => router.push('/collections')}
              />
            </View>
            <Notice message={state.error} action={state.load} />
            {journey.next !== 'done' && <FirstSteps data={data} e={e} />}
            {journey.hasTop && journey.hasBottom && (
              <DailyLook data={data} e={e} act={state.act} busy={state.busy} compact />
            )}
            {!empty &&
              !journey.hasTop &&
              !journey.hasBottom &&
              journey.available.length < data.items.filter((i) => !i.archived_at).length && (
                <Button
                  title="Rever disponibilidade das peças"
                  secondary
                  icon="package"
                  onPress={() => router.push({ pathname: '/style', params: { view: 'closet' } })}
                />
              )}
            {(!empty || e.recipes.length > 0) && (
              <View className="gap-4">
                <View className="flex-row items-center justify-between gap-3">
                  <Text className="font-bold text-2xl tracking-[-0.5px] text-ink">Inspirações</Text>
                  <SoftPressable
                    accessibilityRole="button"
                    accessibilityLabel="Ver minhas inspirações"
                    onPress={() =>
                      router.push({ pathname: '/style', params: { view: 'inspirations' } })
                    }
                    className="min-h-11 justify-center"
                  >
                    <Text className="font-medium text-xs text-accent">Ver todas →</Text>
                  </SoftPressable>
                </View>
                <SoftPressable
                  accessibilityRole="button"
                  accessibilityLabel={
                    e.recipes.length
                      ? 'Abrir minha biblioteca de inspirações'
                      : 'Guardar minha primeira inspiração'
                  }
                  onPress={() =>
                    e.recipes.length
                      ? router.push({ pathname: '/style', params: { view: 'inspirations' } })
                      : openInspiration()
                  }
                  className="overflow-hidden rounded-[24px] bg-blush"
                >
                  {recentLook && (
                    <View style={{ height: 150 }}>
                      <OutfitArtwork outfit={recentLook} />
                    </View>
                  )}
                  <View className="flex-row items-center gap-4 p-5">
                    <View className="h-12 w-12 items-center justify-center rounded-2xl bg-paper">
                      <Icon name="bookmark" color="#17613E" size={22} />
                    </View>
                    <View className="flex-1 gap-1.5">
                      <Text className="font-semibold text-base leading-6 text-ink">
                        {e.recipes.length
                          ? `${e.recipes.length} ${e.recipes.length === 1 ? 'inspiração salva' : 'inspirações salvas'}`
                          : 'Salvar inspiração'}
                      </Text>
                      <Label className="text-xs leading-5 text-muted">
                        {e.recipes.length ? 'Abrir biblioteca' : 'Links, peças e referências.'}
                      </Label>
                    </View>
                    <Icon name="arrow-up-right" size={19} />
                  </View>
                </SoftPressable>
              </View>
            )}
            {!empty && (
              <View className="gap-4">
                <Text className="font-bold text-2xl tracking-[-0.5px] text-ink">Agenda</Text>
                <SoftPressable
                  accessibilityRole="button"
                  accessibilityLabel={
                    nextPlan ? `Abrir plano ${nextPlan.title}` : 'Planejar meu próximo look'
                  }
                  onPress={() => router.push({ pathname: '/calendar', params: { view: 'plans' } })}
                  className="flex-row items-center gap-4 rounded-[24px] bg-sage p-5"
                >
                  <View className="h-12 w-12 items-center justify-center rounded-2xl bg-paper">
                    <Icon
                      name={nextPlan?.kind === 'trip' ? 'map-pin' : 'calendar'}
                      color="#17613E"
                      size={22}
                    />
                  </View>
                  <View className="flex-1 gap-1.5">
                    <Text className="font-semibold text-base leading-6 text-ink">
                      {nextPlan?.title || 'Planejar look'}
                    </Text>
                    <Label className="text-xs leading-5 text-muted">
                      {nextPlan ? formatDate(nextPlan.date) : 'Eventos e viagens.'}
                    </Label>
                  </View>
                  <Icon name="chevron-right" size={19} />
                </SoftPressable>
              </View>
            )}
            <View className="gap-3 border-t border-line pt-5">
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
              <Button
                title="Explorar"
                icon="compass"
                secondary
                onPress={() => router.push('/style')}
              />
            </View>
          </>
        }
      />
    </Page>
  );
}
