import { WeatherCard } from '@/planning/WeatherCard';
import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import * as Crypto from 'expo-crypto';
import { Button, Icon, Label, Notice } from '@/components/ui';
import { OutfitArtwork } from '@/components/cards';
import { LookReveal, SoftPressable } from '@/components/motion';
import { useTask } from '@/hooks/useData';
import { createOutfit } from '@/lib/api';
import { civilDate } from '@/lib/dates';
import { useAuth } from '@/stores/auth';
import { useStudio } from '@/preview/store';
import { availableItems, dailySuggestions, roleOf } from './core';
import { Card, Choices, ItemChoices, type StyleProps } from './components';

const weathers = { mild: 'Ameno', warm: 'Calor', cool: 'Frio', rain: 'Chuva' };
const occasions = { casual: 'Dia a dia', work: 'Trabalho', out: 'Sair' };
export function DailyLook({
  data,
  e,
  act,
  busy,
  compact = false,
}: StyleProps & { compact?: boolean }) {
  const [weather, setWeather] = useState<keyof typeof weathers>('mild');
  const [occasion, setOccasion] = useState<keyof typeof occasions>('casual');
  const [kind, setKind] = useState('safe');
  const [contextOpen, setContextOpen] = useState(!compact);
  const [detailsOpen, setDetailsOpen] = useState(!compact);
  const [override, setOverride] = useState<string[] | null>(null);
  const [swapping, setSwapping] = useState<string | null>(null);
  const [rejected, setRejected] = useState(false);
  const task = useTask();
  const online = useAuth((s) => s.online);
  const today = civilDate();
  const options = useMemo(
    () => dailySuggestions(data, e, weather, occasion, today),
    [data, e, weather, occasion, today],
  );
  const available = useMemo(() => availableItems(data, e), [data, e]);
  const option = options.find((s) => s.kind === kind) || options[0];
  if (!option)
    return compact ? null : (
      <Card title="Comece com poucas peças">
        <Label className="text-sm leading-6 text-muted">
          Uma parte de cima e uma parte de baixo disponíveis já ajudam. Guarde suas favoritas e
          continue aos poucos.
        </Label>
        <Button
          title="Adicionar uma peça"
          icon="plus"
          onPress={() => router.push('/item/new')}
          disabled={!online}
        />
        <Button
          title="Ver disponibilidade das peças"
          secondary
          onPress={() => router.push({ pathname: '/style', params: { view: 'closet' } })}
        />
      </Card>
    );
  const selected = override
    ? override
        .map((id) => available.find((i) => i.id === id))
        .filter((item): item is (typeof available)[number] => !!item)
    : option.items;
  const swap = selected.find((item) => item.id === swapping);
  const locked = busy || task.busy || !online;
  const resetChoice = () => {
    setOverride(null);
    setSwapping(null);
    setRejected(false);
  };
  async function save() {
    await task.run(
      async () => {
        const ids = selected.map((i) => i.id),
          signature = [...ids].sort().join('|');
        const existing = data.outfits.find(
          (outfit) =>
            outfit.items
              .map((i) => i.id)
              .sort()
              .join('|') === signature,
        );
        const result = existing
          ? { id: existing.id }
          : await createOutfit(
              ids,
              `${occasions[occasion]} · ${weathers[weather].toLowerCase()}`,
              null,
            );
        await useStudio.getState().load();
        const learned = await act({
          action: 'decision',
          decision: {
            id: Crypto.randomUUID(),
            date: civilDate(),
            kind: 'accepted',
            reason: 'Escolha do dia',
            itemIds: ids,
            outfitId: result.id,
            recipeId: null,
          },
        });
        return {
          ...result,
          notice: learned
            ? 'Look salvo.'
            : 'Look guardado. Não foi possível registrar esta escolha na memória de estilo.',
        };
      },
      (result) =>
        router.push({ pathname: '/outfit/[id]', params: { id: result.id, notice: result.notice } }),
    );
  }
  return (
    <View className="gap-4">
      <View className="flex-row items-center justify-between gap-2">
        <View className="flex-1 gap-1">
          <Text className="font-bold text-2xl tracking-[-0.5px] text-ink">Looks para hoje</Text>
        </View>
        <View className="h-11 w-11 items-center justify-center rounded-full bg-lemon">
          <Icon name="sun" size={21} color="#17613E" />
        </View>
      </View>
      <SoftPressable
        accessibilityRole="button"
        accessibilityLabel="Ajustar meu dia"
        accessibilityState={{ expanded: contextOpen }}
        onPress={() => setContextOpen(!contextOpen)}
        className="min-h-12 flex-row items-center justify-between gap-2 rounded-2xl bg-sage px-4 py-3"
      >
        <View className="flex-1 flex-row items-center gap-2">
          <Icon
            name={weather === 'rain' ? 'cloud-rain' : weather === 'cool' ? 'cloud' : 'sun'}
            size={17}
            color="#17613E"
          />
          <Label className="text-xs">
            {weathers[weather]} · {occasions[occasion]}
          </Label>
        </View>
        <Label className="text-xs text-accent">Ajustar</Label>
        <Icon name={contextOpen ? 'chevron-up' : 'chevron-down'} size={17} />
      </SoftPressable>
      {contextOpen && (
        <View className="gap-3">
          <Label className="text-xs text-muted">Clima e ocasião</Label>
          <WeatherCard city={e.profile.city} date={today} onChoose={value => { if (!locked) { setWeather(value); resetChoice(); } }} />
          <Choices
            values={weathers}
            value={weather}
            onChange={(value) => {
              if (!locked) {
                setWeather(value);
                resetChoice();
              }
            }}
          />
          <Choices
            values={occasions}
            value={occasion}
            onChange={(value) => {
              if (!locked) {
                setOccasion(value);
                resetChoice();
              }
            }}
          />
        </View>
      )}
      <Choices
        values={{ safe: 'Seguro', creative: 'Criativo', rediscover: 'Redescoberta' }}
        value={kind}
        onChange={(value) => {
          if (!locked) {
            setKind(value);
            resetChoice();
          }
        }}
      />
      <View className="overflow-hidden rounded-[26px] bg-paper">
        <View style={{ height: compact ? 280 : 300, padding: 8 }}>
          <LookReveal trigger={selected.map((i) => i.id).join('|')}>
            <OutfitArtwork outfit={{ items: selected, photo_path: null }} />
          </LookReveal>
        </View>
        <View className="gap-4 px-5 pb-5 pt-3">
          <View className="flex-row items-center justify-between gap-3">
            <Text className="flex-1 font-semibold text-lg leading-6 text-ink">{option.title}</Text>
            <View className="rounded-full bg-sage px-3 py-2">
              <Label className="text-[11px]">{selected.length} peças</Label>
            </View>
          </View>
          <Label className="text-sm leading-6 text-muted">{option.reasons[0]}</Label>
          <Button
            title={compact ? 'Guardar look' : 'Guardar esta combinação'}
            icon="bookmark"
            busy={task.busy}
            disabled={busy || !online || selected.length === 0}
            onPress={() => void save()}
          />
          <View className="flex-row gap-2">
            <View className="flex-1">
              <Button
                title="Ajustar look"
                icon="sliders"
                secondary
                small
                disabled={locked}
                onPress={() => setDetailsOpen(!detailsOpen)}
              />
            </View>
            <View className="flex-1">
              <Button
                title="Não hoje"
                secondary
                small
                disabled={locked}
                onPress={() => setRejected(!rejected)}
              />
            </View>
          </View>
          {detailsOpen && (
            <View className="gap-3 border-t border-line pt-4">
              <Text className="font-semibold text-sm text-ink">Detalhes do look</Text>
              {option.reasons.slice(1).map((reason) => (
                <Label key={reason} className="text-xs leading-5 text-muted">
                  {reason}
                </Label>
              ))}
              <Label className="text-xs text-muted">Toque em uma peça para ver alternativas.</Label>
              <ItemChoices
                items={selected}
                selected={swapping ? [swapping] : []}
                label="Trocar"
                onSelect={(id) => {
                  if (!locked) setSwapping(swapping === id ? null : id);
                }}
              />
              {swap && (
                <View className="gap-3 rounded-2xl bg-sage p-3">
                  <Label className="font-medium text-sm">Trocar {swap.name}</Label>
                  <ItemChoices
                    items={available.filter(
                      (item) =>
                        roleOf(item.category) === roleOf(swap.category) &&
                        (!selected.some((i) => i.id === item.id) || item.id === swap.id),
                    )}
                    selected={[swap.id]}
                    onSelect={(id) => {
                      if (!locked) {
                        setOverride(selected.map((item) => (item.id === swap.id ? id : item.id)));
                        setSwapping(null);
                      }
                    }}
                  />
                  {available.filter((item) => roleOf(item.category) === roleOf(swap.category))
                    .length < 2 && (
                    <Label className="text-xs leading-5 text-muted">
                      Por enquanto, esta é sua única opção disponível. Outras peças podem chegar
                      depois.
                    </Label>
                  )}
                </View>
              )}
            </View>
          )}
          {rejected && (
            <View className="gap-2 border-t border-line pt-4">
              <Label className="text-sm">O que mudaria hoje?</Label>
              {[
                'Repeti recentemente',
                'Quero outra cor',
                'Não combina comigo',
                'Formal demais',
                'Casual demais',
              ].map((reason) => (
                <Button
                  key={reason}
                  title={reason}
                  secondary
                  small
                  disabled={locked}
                  onPress={() =>
                    void act({
                      action: 'decision',
                      decision: {
                        id: Crypto.randomUUID(),
                        date: civilDate(),
                        kind: 'rejected',
                        reason,
                        itemIds: selected.map((i) => i.id),
                        outfitId: null,
                        recipeId: null,
                      },
                    }).then((ok) => {
                      if (ok) {
                        setKind(kind === 'safe' ? 'creative' : 'rediscover');
                        resetChoice();
                      }
                    })
                  }
                />
              ))}
            </View>
          )}
          <Notice message={task.error} />
          <Label className="text-center text-[11px] leading-5 text-muted">
            Guardar é diferente de vestir. Você registra o uso depois.
          </Label>
        </View>
      </View>
    </View>
  );
}
