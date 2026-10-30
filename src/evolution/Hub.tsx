import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { OutfitArtwork } from '@/components/cards';
import { MotionReveal, SoftPressable } from '@/components/motion';
import { Icon, Label, type IconName } from '@/components/ui';
import { civilDate } from '@/lib/dates';
import { dailySuggestions } from './core';
import { Choices, type StyleProps } from './components';

export const stylePages: Record<
  string,
  { title: string; detail: string; icon: IconName; group: string }
> = {
  today: {
    title: 'Três ideias para hoje',
    detail: 'Seguro, criativo ou uma redescoberta',
    icon: 'sun',
    group: 'today',
  },
  inspirations: {
    title: 'Minhas inspirações',
    detail: 'Links, peças e referências',
    icon: 'bookmark',
    group: 'create',
  },
  remix: {
    title: 'Remix com meu closet',
    detail: 'Uma inspiração, com as suas peças',
    icon: 'shuffle',
    group: 'create',
  },
  memory: {
    title: 'Histórico de estilo',
    detail: 'Looks usados e avaliações',
    icon: 'heart',
    group: 'today',
  },
  lab: {
    title: 'Style Lab',
    detail: 'Compare looks',
    icon: 'sliders',
    group: 'create',
  },
  wishlist: {
    title: 'Antes de comprar',
    detail: 'Lista de desejos e comparação',
    icon: 'shopping-bag',
    group: 'care',
  },
  closet: {
    title: 'Cuidados com as peças',
    detail: 'Disponibilidade, cuidados e histórias',
    icon: 'package',
    group: 'care',
  },
  travel: {
    title: 'Viagens e eventos',
    detail: 'Plano B, checklist e mala',
    icon: 'map-pin',
    group: 'care',
  },
  wrapped: {
    title: 'Retrospectiva',
    detail: 'Lembranças do mês e do ano',
    icon: 'calendar',
    group: 'today',
  },
  profile: {
    title: 'Preferências',
    detail: 'Conforto e preferências',
    icon: 'user',
    group: 'care',
  },
  circles: {
    title: 'Círculos de estilo',
    detail: 'Grupos privados e enquetes',
    icon: 'users',
    group: 'create',
  },
  sprint: {
    title: 'Adicionar várias peças',
    detail: 'Até 10 fotos por vez',
    icon: 'camera',
    group: 'care',
  },
  stories: {
    title: 'Peças que contam histórias',
    detail: 'Memórias guardadas no seu closet',
    icon: 'book-open',
    group: 'today',
  },
  challenges: {
    title: 'Desafios',
    detail: 'Desafios com suas roupas',
    icon: 'compass',
    group: 'today',
  },
};
export const openStyle = (view: string) => router.push({ pathname: '/style', params: { view } });

export function StyleHub({ data, e }: StyleProps) {
  const [group, setGroup] = useState('all');
  const today = civilDate();
  const suggestion = useMemo(
    () => dailySuggestions(data, e, 'mild', 'casual', today)[0],
    [data, e, today],
  );
  const entries = Object.entries(stylePages).filter(
    ([id, p]) => id !== 'today' && (group === 'all' || p.group === group),
  );
  const columns = [entries.filter((_, i) => i % 2 === 0), entries.filter((_, i) => i % 2 === 1)];
  const artwork = (id: string) => {
    if (id === 'remix' || id === 'inspirations') return data.outfits[0];
    if (id === 'wrapped' || id === 'stories') return data.outfits[1];
    return undefined;
  };
  return (
    <>
      <SoftPressable
        accessibilityRole="button"
        accessibilityLabel="Escolher meu look de hoje"
        onPress={() => openStyle('today')}
        className="overflow-hidden rounded-[26px] bg-sage"
      >
        {!!suggestion?.items.length && (
          <View style={{ height: 205 }}>
            <OutfitArtwork outfit={{ items: suggestion.items, photo_path: null }} />
          </View>
        )}
        <View className="flex-row items-center gap-3 p-5">
          <View className="flex-1 gap-1">
            <Text className="font-semibold text-lg text-ink">Looks para hoje</Text>
            <Label className="text-xs leading-5 text-muted">3 sugestões com suas roupas.</Label>
          </View>
          <View className="h-10 w-10 items-center justify-center rounded-full bg-paper">
            <Icon name="arrow-up-right" size={20} />
          </View>
        </View>
      </SoftPressable>
      <Choices
        values={{ all: 'Tudo', today: 'Meu dia', create: 'Criar', care: 'Cuidar' }}
        value={group}
        onChange={setGroup}
      />
      <MotionReveal trigger={group} style={{ flexDirection: 'row', gap: 12 }}>
        {columns.map((column, index) => (
          <View key={index} style={{ flex: 1, minWidth: 0, gap: 12 }}>
            {column.map(([id, p]) => {
              const photo = artwork(id);
              return (
                <SoftPressable
                  key={id}
                  accessibilityRole="button"
                  accessibilityLabel={p.title}
                  onPress={() => openStyle(id)}
                  className="overflow-hidden rounded-[22px] bg-paper"
                >
                  {photo && (
                    <View style={{ height: id === 'inspirations' ? 180 : 140 }}>
                      <OutfitArtwork outfit={photo} />
                    </View>
                  )}
                  <View className="gap-3 p-4">
                    <Icon name={p.icon} color="#17613E" size={21} />
                    <View className="gap-1.5">
                      <Text className="font-bold text-[16px] leading-[21px] text-ink">
                        {p.title}
                      </Text>
                      <Label className="text-xs leading-[18px] text-muted">{p.detail}</Label>
                    </View>
                  </View>
                </SoftPressable>
              );
            })}
          </View>
        ))}
      </MotionReveal>
    </>
  );
}
