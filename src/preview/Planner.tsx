import { useState } from 'react';
import { ideasPreview } from './config';
import { Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { router } from 'expo-router';
import { civilDate, formatDate, monthCells } from '@/lib/dates';
import { inputDate, planDate } from './model';
import type { OutfitPlan, PlanKind } from './types';
import { useStudioScreen } from './store';
import { SectionTitle, Tag } from './components';
import { OutfitArtwork } from '@/components/cards';
import { MonthCalendar } from '@/components/MonthCalendar';
import { ConfirmAction } from '@/components/ConfirmAction';
import {
  Button,
  Chip,
  Empty,
  Field,
  Icon,
  Label,
  Loading,
  Notice,
  Page,
  PageTitle,
  TopBar,
} from '@/components/ui';
const kinds: Record<PlanKind, string> = {
  day: 'Dia a dia',
  party: 'Festa',
  wedding: 'Casamento',
  trip: 'Viagem',
};
export function CalendarMode({ plans }: { plans: boolean }) {
  return (
    <View className="flex-row gap-2">
      <View className="flex-1">
        <Chip
          label="Já usei"
          selected={!plans}
          onPress={() => router.setParams({ view: 'used' })}
        />
      </View>
      <View className="flex-1">
        <Chip
          label="Quero usar"
          selected={plans}
          onPress={() => router.setParams({ view: 'plans' })}
        />
      </View>
    </View>
  );
}
export function Planner() {
  const { data, act, busy, error: remoteError, load } = useStudioScreen();
  const [month, setMonth] = useState(new Date());
  const [day, setDay] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [id, setId] = useState<string | undefined>();
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState<PlanKind>('day');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [notes, setNotes] = useState('');
  const [outfitIds, setOutfitIds] = useState<string[]>([]);
  const [itemIds, setItemIds] = useState<string[]>([]);
  const [pieces, setPieces] = useState(false);
  const [reminder, setReminder] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  function edit(plan?: OutfitPlan) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const date = day || civilDate(tomorrow);
    setId(plan?.id);
    setTitle(plan?.title || '');
    setKind(plan?.kind || 'day');
    setStart(inputDate(plan?.date || date));
    setEnd(inputDate(plan?.end_date || date));
    setNotes(plan?.notes || '');
    setOutfitIds(plan?.outfit_ids || []);
    setItemIds(plan?.item_ids || []);
    setReminder(plan?.reminder || false);
    setPieces(!!plan?.item_ids.length);
    setEditing(true);
    setFeedback(null);
    setError(null);
  }
  function save() {
    try {
      if (!title.trim()) throw new Error('Dê um nome para esse plano.');
      const date = planDate(start),
        endDate = kind === 'trip' ? planDate(end) : date;
      if (endDate < date) throw new Error('A data final deve ser igual ou posterior à inicial.');
      if (!outfitIds.length && !itemIds.length)
        throw new Error('Escolha pelo menos uma combinação ou uma peça.');
      setError(null);
      void act({
        action: 'plan',
        plan: {
          id,
          title,
          date,
          end_date: endDate,
          kind,
          notes,
          outfit_ids: outfitIds,
          item_ids: itemIds,
          reminder,
        },
      }).then((ok) => {
        if (ok) {
          setEditing(false);
          setDay(null);
          setFeedback(
            ideasPreview
              ? 'Plano salvo na prévia. Seu histórico de uso continua separado.'
              : 'Plano salvo. Seu histórico de uso continua separado.',
          );
        }
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Confira os dados.');
    }
  }
  if (!data)
    return (
      <Page>
        <TopBar />
        <CalendarMode plans />
        <Notice message={remoteError} action={load} />
        {!remoteError && <Loading />}
      </Page>
    );
  const marked = new Set(
    monthCells(month).filter(
      (value): value is string =>
        !!value && data.plans.some((p) => p.date <= value && p.end_date >= value),
    ),
  );
  const visible = [...data.plans]
    .filter((p) => !day || (p.date <= day && p.end_date >= day))
    .sort((a, b) => a.date.localeCompare(b.date));
  return (
    <Page>
      <TopBar />
      <CalendarMode plans />
      <PageTitle
        title="Sua agenda de looks"
        subtitle="Reserve uma combinação para os dias que importam."
      />
      <Notice message={remoteError} action={load} />
      <Notice message={feedback} kind="success" />
      {editing ? (
        <View className="gap-4 rounded-[24px] bg-sage p-4">
          <SectionTitle title={id ? 'Editar plano' : 'Um novo plano'} />
          <Field
            label="Nome do evento *"
            placeholder="Ex.: Viagem de fim de semana"
            value={title}
            onChangeText={setTitle}
            maxLength={80}
          />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 7 }}
          >
            {Object.entries(kinds).map(([key, label]) => (
              <Chip
                key={key}
                label={label}
                selected={kind === key}
                onPress={() => setKind(key as PlanKind)}
              />
            ))}
          </ScrollView>
          <Field
            label={kind === 'trip' ? 'Data inicial *' : 'Data do plano *'}
            placeholder="DD/MM/AAAA"
            value={start}
            onChangeText={setStart}
            keyboardType="numbers-and-punctuation"
            maxLength={10}
          />
          {kind === 'trip' && (
            <Field
              label="Data final *"
              placeholder="DD/MM/AAAA"
              value={end}
              onChangeText={setEnd}
              keyboardType="numbers-and-punctuation"
              maxLength={10}
            />
          )}
          <SectionTitle title="Looks que vão com você" />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 10 }}
          >
            {data.outfits.map((o) => (
              <Pressable
                key={o.id}
                accessibilityRole="button"
                accessibilityLabel={`Planejar ${o.name || 'combinação'}`}
                accessibilityState={{ selected: outfitIds.includes(o.id) }}
                onPress={() =>
                  setOutfitIds((previous) =>
                    previous.includes(o.id)
                      ? previous.filter((i) => i !== o.id)
                      : [...previous, o.id],
                  )
                }
                style={{ width: 130 }}
                className={`gap-2 rounded-2xl p-1.5 ${outfitIds.includes(o.id) ? 'bg-lemon' : 'bg-paper'}`}
              >
                <View className="h-36 overflow-hidden rounded-xl">
                  <OutfitArtwork outfit={o} />
                </View>
                <Text className="px-1 font-medium text-xs text-ink">
                  {o.name || 'Uma boa combinação'}
                </Text>
                <View className="flex-row items-center gap-1 px-1 pb-2">
                  <Icon
                    name={outfitIds.includes(o.id) ? 'check-circle' : 'circle'}
                    size={15}
                    color="#17613E"
                  />
                  <Label className="text-[10px] text-accent">
                    {outfitIds.includes(o.id) ? 'Selecionado' : 'Selecionar'}
                  </Label>
                </View>
              </Pressable>
            ))}
          </ScrollView>
          <Button
            title={pieces ? 'Ocultar peças avulsas' : 'Adicionar peças avulsas'}
            small
            secondary
            icon="plus"
            onPress={() => setPieces(!pieces)}
          />
          {pieces && (
            <View className="gap-2">
              {data.items
                .filter((i) => !i.archived_at)
                .map((item) => (
                  <Pressable
                    key={item.id}
                    accessibilityRole="checkbox"
                    accessibilityLabel={`Levar ${item.name}`}
                    accessibilityState={{ checked: itemIds.includes(item.id) }}
                    onPress={() =>
                      setItemIds((previous) =>
                        previous.includes(item.id)
                          ? previous.filter((i) => i !== item.id)
                          : [...previous, item.id],
                      )
                    }
                    className="min-h-11 flex-row items-center gap-2 rounded-xl bg-paper px-3"
                  >
                    <Icon
                      name={itemIds.includes(item.id) ? 'check-square' : 'square'}
                      size={17}
                      color="#17613E"
                    />
                    <Label className="flex-1 text-xs">{item.name}</Label>
                  </Pressable>
                ))}
            </View>
          )}
          <Field
            label="Uma observação · opcional"
            placeholder="O lugar, a ocasião, um detalhe…"
            value={notes}
            onChangeText={setNotes}
            maxLength={300}
            multiline
          />
          <View className="flex-row items-center justify-between gap-3">
            <Label className="flex-1 text-xs">Quero um lembrete na véspera e no dia</Label>
            <Switch
              accessibilityLabel="Lembrete na véspera e no dia"
              value={reminder}
              onValueChange={setReminder}
              trackColor={{ true: '#17613E' }}
            />
          </View>
          <Label className="text-[11px] leading-5 text-muted">
            {ideasPreview
              ? 'A prévia guarda sua preferência. As notificações são ativadas no aparelho real.'
              : 'Ative os lembretes no preparo da viagem para receber avisos às 18h da véspera e às 9h do dia, no horário deste aparelho.'}
          </Label>
          <Notice message={error} />
          <Button title="Salvar plano" busy={busy} onPress={save} />
          <Button
            title="Cancelar edição"
            secondary
            disabled={busy}
            onPress={() => setEditing(false)}
          />
        </View>
      ) : (
        <>
          <Button title="Novo evento ou look planejado" icon="plus" onPress={() => edit()} />
          <Button
            title="Checklist, plano B e lembretes"
            icon="check-square"
            secondary
            onPress={() => router.push({ pathname: '/style', params: { view: 'travel' } })}
          />
          <MonthCalendar
            month={month}
            selected={day || civilDate()}
            marked={marked}
            allowFuture
            markerLabel="com plano"
            onMonth={(value) => {
              setMonth(value);
              setDay(null);
            }}
            onSelect={(value) => {
              setDay(value);
              setFeedback(null);
            }}
          />
          <View className="flex-row items-center justify-between">
            <SectionTitle title={day ? formatDate(day) : 'Seus planos'} />
            {day && (
              <Pressable
                accessibilityRole="button"
                onPress={() => setDay(null)}
                className="min-h-11 justify-center"
              >
                <Text className="font-medium text-xs text-accent">Ver todos</Text>
              </Pressable>
            )}
          </View>
          {!visible.length && (
            <Empty
              title="Esse dia está em aberto"
              description="Escolha as peças que vão acompanhar você."
              action={<Button title="Planejar para este dia" onPress={() => edit()} />}
            />
          )}
          {visible.map((plan) => {
            const looks = data.outfits.filter((o) => plan.outfit_ids.includes(o.id));
            const packing = [
              ...new Set([...looks.flatMap((o) => o.items.map((i) => i.id)), ...plan.item_ids]),
            ];
            return (
              <View key={plan.id} className="gap-3 rounded-[24px] bg-paper p-4">
                <View className="gap-2">
                  <Tag>
                    {kinds[plan.kind]}
                    {plan.end_date < civilDate() ? ' · passado' : ''}
                  </Tag>
                  {plan.reminder && <Icon name="bell" size={16} color="#73786C" />}
                </View>
                <Text className="font-semibold text-[19px] text-ink">{plan.title}</Text>
                <Label className="text-xs text-muted">
                  {formatDate(plan.date)}
                  {plan.end_date !== plan.date ? ` a ${formatDate(plan.end_date)}` : ''}
                </Label>
                {!!looks.length && (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 8 }}
                  >
                    {looks.map((o) => (
                      <Pressable
                        key={o.id}
                        accessibilityRole="button"
                        accessibilityLabel={`Abrir ${o.name}`}
                        onPress={() => router.push(`/outfit/${o.id}`)}
                        className="gap-1"
                        style={{ width: 108 }}
                      >
                        <View className="h-28 overflow-hidden rounded-2xl">
                          <OutfitArtwork outfit={o} />
                        </View>
                        <Text numberOfLines={1} className="font-medium text-[10px] text-ink">
                          {o.name}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                )}
                <Label className="text-xs text-accent">
                  {looks.length} combinações · {packing.length} peças{' '}
                  {plan.kind === 'trip' ? 'na mala' : 'selecionadas'}
                </Label>
                {plan.notes && <Label className="text-xs leading-5 text-muted">{plan.notes}</Label>}
                <View className="gap-2">
                  <Button
                    title={`Editar ${plan.title}`}
                    secondary
                    small
                    icon="edit-2"
                    onPress={() => edit(plan)}
                  />
                  <Button title={`Reutilizar ${plan.title}`} secondary small icon="copy" onPress={() => {
                    edit(plan); setId(undefined); setTitle(`${plan.title.slice(0, 62)} · nova viagem`);
                    const next = new Date(); next.setDate(next.getDate()+1); setStart(inputDate(civilDate(next)));
                    const duration = Math.round((Date.parse(plan.end_date+'T12:00:00Z')-Date.parse(plan.date+'T12:00:00Z'))/86400000); next.setDate(next.getDate()+duration); setEnd(inputDate(civilDate(next))); setReminder(false);
                  }} />
                  <ConfirmAction
                    compact
                    label={`Remover ${plan.title}`}
                    description="Remover este plano? Suas peças, combinações e registros de uso continuam guardados."
                    busy={busy}
                    onConfirm={() =>
                      void act({ action: 'remove_plan', id: plan.id }).then((ok) => {
                        if (ok) setFeedback('Plano removido. O histórico de uso foi preservado.');
                      })
                    }
                  />
                </View>
              </View>
            );
          })}
          <Label className="text-[10px] leading-4 text-muted">
            Planejar não registra uso automaticamente. Depois de vestir, registre em “Já usei”.
            Eventos desta prévia são exemplos e ficam nesta sessão local.
          </Label>
        </>
      )}
    </Page>
  );
}
