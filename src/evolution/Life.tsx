import { Disclosure } from '@/components/Disclosure';
import { TraitFields } from '@/style/TraitFields';
import { WeatherCard } from '@/planning/WeatherCard';
import { useState } from 'react';
import { Share, Switch, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Button, Field, Label, Notice } from '@/components/ui';
import { Progress } from '@/components/motion';
import { Photo } from '@/components/Photo';
import { OutfitCard } from '@/components/cards';
import { civilDate, formatDate } from '@/lib/dates';
import { inputDate, money, planDate, studioStats } from '@/preview/model';
import { Card, Choices, ItemChoices, type StyleProps } from './components';
import { emptyDetail, itemStates, type ItemDetail, type PlanDetail } from './types';
import { ShareCard } from './ShareCard';
import { enableLocalReminders } from '@/lib/local-reminders';
export function StyleProfileScreen({ e, act, busy, data }: StyleProps) {
  const [p, setP] = useState({ ...e.profile }),
    [saved, setSaved] = useState(false);
  return (
    <>
      <Card title="Adicionar várias peças">
        <Label className="text-sm">
          Cadastre suas dez peças favoritas aos poucos. Você pode usar o app antes de completar a
          lista.
        </Label>
        <Progress
          value={data.items.filter((i) => !i.archived_at).length / 10}
          label="Suas primeiras dez peças"
        />
        <Button
          title="Adicionar uma favorita"
          icon="plus"
          onPress={() => router.push({ pathname: '/style', params: { view: 'sprint' } })}
        />
      </Card>
      <Card title="Seu conforto vem primeiro">
        <View className="flex-row items-center justify-between gap-4">
          <Label className="flex-1 text-sm">Toque sutil ao favoritar</Label>
          <Switch
            accessibilityLabel="Resposta tátil discreta"
            value={!!p.haptics}
            onValueChange={(haptics) => setP({ ...p, haptics })}
            trackColor={{ true: '#17613E' }}
          />
        </View>
        <Field
          label="Como você quer ser chamado?"
          value={p.name}
          onChangeText={(name) => setP({ ...p, name })}
          maxLength={80}
        />
        <Label className="text-sm">Como quer se sentir?</Label>
        <Choices
          values={{ comfortable: 'Confortável', clean: 'Discreto', expressive: 'Marcante' }}
          value={p.feeling}
          onChange={(feeling) => setP({ ...p, feeling })}
        />
        <Label className="text-sm">Quanto quer variar?</Label>
        <Choices
          values={{ 0: 'Uma troca discreta', 1: 'Uma novidade', 2: 'Duas novidades' }}
          value={String(p.boldness) as '0' | '1' | '2'}
          onChange={(v) => setP({ ...p, boldness: Number(v) as 0 | 1 | 2 })}
        />
        <Label className="text-sm">Temperatura</Label>
        <Choices
          values={{ neutral: 'Sem preferência', cold: 'Sinto mais frio', warm: 'Sinto mais calor' }}
          value={p.thermal}
          onChange={(thermal) => setP({ ...p, thermal })}
        />
        <Label className="text-sm">Seu ambiente habitual</Label>
        <Choices
          values={{ outside: 'Ao ar livre', inside: 'Ambiente interno', aircon: 'Ar-condicionado' }}
          value={p.environment}
          onChange={(environment) => setP({ ...p, environment })}
        />
        <Field
          label="Cidade · opcional"
          value={p.city}
          onChangeText={(city) => setP({ ...p, city })}
          maxLength={100}
        />
        <Label className="text-xs text-muted">
          A cidade preenche a consulta opcional de previsão. Você escolhe quando consultar.
        </Label>
        {[
          ['avoidRecent', 'Evitar repetir peças dos últimos dias'],
          ['challenges', 'Participar dos desafios leves'],
          ['noBuy', 'Modo sem compras'],
        ].map(([key, label]) => (
          <View key={key} className="flex-row items-center justify-between gap-4">
            <Label className="flex-1 text-sm">{label}</Label>
            <Switch
              accessibilityLabel={label}
              value={p[key as 'avoidRecent' | 'challenges' | 'noBuy']}
              onValueChange={(v) => setP({ ...p, [key!]: v })}
              trackColor={{ true: '#17613E' }}
            />
          </View>
        ))}
        <Button
          title="Salvar minhas preferências"
          busy={busy}
          onPress={() => void act({ action: 'profile', profile: p }).then((ok) => setSaved(ok))}
        />
        <Notice
          message={saved ? 'Preferências salvas. Você pode mudar de ideia quando quiser.' : null}
          kind="success"
        />
      </Card>
    </>
  );
}
export function OperationalCloset({
  data,
  e,
  act,
  busy,
  itemId,
}: StyleProps & { itemId?: string }) {
  const [selected, setSelected] = useState(itemId || data.items[0]?.id || ''),
    [draft, setDraft] = useState<ItemDetail>({
      ...emptyDetail,
      ...e.details[itemId || data.items[0]?.id || ''],
    }),
    [error, setError] = useState<string | null>(null),
    [saved, setSaved] = useState(false);
  const item = data.items.find((i) => i.id === selected);
  const choose = (id: string) => {
    setSelected(id);
    setDraft({ ...emptyDetail, ...e.details[id] });
    setSaved(false);
    setError(null);
  };
  if (!item)
    return (
      <Card>
        <Label>
          Adicione sua primeira peça para organizar disponibilidade, cuidados e histórias.
        </Label>
        <Button title="Adicionar peça" onPress={() => router.push('/item/new')} />
      </Card>
    );
  async function save() {
    try {
      if (await act({ action: 'item_detail', id: selected, detail: draft })) {
        setSaved(true);
        setError(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Confira os detalhes.');
    }
  }
  return (
    <>
      <ItemChoices items={data.items} selected={[selected]} onSelect={choose} />
      <Card title={item.name}>
        <View style={{ height: 220, borderRadius: 20, overflow: 'hidden' }}>
          <Photo path={item.photo_path} category={item.category} />
        </View>
        <Label className="text-sm">Como está esta peça?</Label>
        <Choices
          values={itemStates}
          value={draft.state}
          onChange={(state) => setDraft({ ...draft, state })}
        />
        <Label className="text-xs text-muted">
          Só peças disponíveis e não arquivadas entram nas novas sugestões.
        </Label>
        <Field
          label="Onde está guardada?"
          value={draft.location}
          onChangeText={(location) => setDraft({ ...draft, location })}
          maxLength={80}
        />
        {draft.state === 'lent' && (
          <>
            <Field
              label="Emprestada para"
              value={draft.loanTo}
              onChangeText={(loanTo) => setDraft({ ...draft, loanTo })}
              maxLength={80}
            />
            <Field
              label="Devolução prevista · AAAA-MM-DD"
              value={draft.returnDate || ''}
              onChangeText={(returnDate) => setDraft({ ...draft, returnDate: returnDate || null })}
              maxLength={10}
            />
          </>
        )}
        <Field
          label="Cuidados e manutenção"
          value={draft.care}
          onChangeText={(care) => setDraft({ ...draft, care })}
          maxLength={300}
          multiline
        />
        <Field
          label="Lembrar cuidado em · AAAA-MM-DD"
          value={draft.careReminderDate || ''}
          maxLength={10}
          onChangeText={(careReminderDate) =>
            setDraft({ ...draft, careReminderDate: careReminderDate || null })
          }
        />
        <Field
          label="A história desta peça"
          placeholder="De onde veio, quem presenteou, um momento especial…"
          value={draft.story}
          onChangeText={(story) => setDraft({ ...draft, story })}
          maxLength={1000}
          multiline
        />
        <Field
          label="Peso em gramas · opcional"
          value={draft.weightGrams === null ? '' : String(draft.weightGrams)}
          onChangeText={(value) =>
            setDraft({ ...draft, weightGrams: value.trim() ? Number(value) : null })
          }
          keyboardType="number-pad"
          maxLength={5}
        />
        <Disclosure title="Modelagem, textura e ocasião">
          <TraitFields
            value={draft.styling}
            onChange={(styling) => setDraft({ ...draft, styling })}
          />
        </Disclosure>
        <Notice message={error} />
        <Button title="Salvar detalhes da peça" busy={busy} onPress={() => void save()} />
        <Notice
          message={saved ? 'Detalhes salvos. As sugestões já consideram a disponibilidade.' : null}
          kind="success"
        />
      </Card>
    </>
  );
}
export function Wrapped({ data, e }: StyleProps) {
  const today = civilDate(),
    previous = new Date();
  previous.setDate(1);
  previous.setMonth(previous.getMonth() - 1);
  const [period, setPeriod] = useState(today.slice(0, 7)),
    [prices, setPrices] = useState(false),
    [error, setError] = useState<string | null>(null);
  const subset = { ...data, wear: data.wear.filter((w) => w.worn_date.startsWith(period)) },
    stats = studioStats(subset),
    leader = stats.rankItems[0],
    look = stats.rankOutfits[0];
  const colors = new Map<string, number>();
  for (const item of stats.rankItems) {
    const color = item.color.trim().toLocaleLowerCase('pt-BR');
    colors.set(color, (colors.get(color) || 0) + (stats.itemUses[item.id] || 0));
  }
  const color = [...colors].sort((a, b) => b[1] - a[1])[0]?.[0];
  const best = stats.rankItems
    .filter((i) => data.prices[i.id] !== undefined)
    .sort(
      (a, b) =>
        data.prices[a.id]! / stats.itemUses[a.id]! - data.prices[b.id]! / stats.itemUses[b.id]!,
    )[0];
  const notes = e.feedback.filter((f) => f.date.startsWith(period));
  const body = [
    `Minha retrospectiva no Virtual Closet · ${period}`,
    `${stats.totalUses} usos registrados · ${stats.usedItems} peças diferentes`,
    leader ? `Peça protagonista: ${leader.name}` : '',
    look ? `Look mais repetido: ${look.name || 'Meu look'}` : '',
    color ? `Cor mais usada: ${color}` : '',
    prices && best
      ? `Melhor custo por uso: ${money(Math.round(data.prices[best.id]! / stats.itemUses[best.id]!))}`
      : '',
  ]
    .filter(Boolean)
    .join('\n');
  return (
    <>
      <Choices
        values={{
          [today.slice(0, 7)]: 'Este mês',
          [civilDate(previous).slice(0, 7)]: 'Mês passado',
          [today.slice(0, 4)]: 'Este ano',
        }}
        value={period}
        onChange={setPeriod}
      />
      <Card title="Seu estilo deixa lembranças">
        <Text className="font-semibold text-4xl text-accent">{stats.totalUses}</Text>
        <Label className="text-sm">usos registrados neste período</Label>
        <Label>
          {stats.usedItems} peças diferentes · {stats.rankOutfits.length} combinações usadas
        </Label>
        {leader && (
          <>
            <View style={{ height: 220, borderRadius: 20, overflow: 'hidden' }}>
              <Photo path={leader.photo_path} category={leader.category} />
            </View>
            <Label className="font-medium">{leader.name}</Label>
            <Label className="text-xs text-muted">
              Sua peça protagonista · {stats.itemUses[leader.id]} usos
            </Label>
          </>
        )}
        {color && <Label>Cor mais usada: {color}</Label>}
        {look && <Label>Look mais repetido: {look.name || 'Meu look'}</Label>}
        {best && (
          <Label>
            Melhor custo por uso:{' '}
            {money(Math.round(data.prices[best.id]! / stats.itemUses[best.id]!))}
          </Label>
        )}
        <Label className="text-xs text-muted">
          {notes.filter((f) => f.again).length} de {notes.length} usos avaliados que você repetiria.
          Nenhuma avaliação é inferida.
        </Label>
      </Card>
      {stats.rankOutfits.length > 0 && (
        <Card title="Seu mês em combinações">
          <Label className="text-xs text-muted">
            Looks com uso registrado no período escolhido.
          </Label>
          <View className="flex-row gap-3">
            {[0, 1].map((column) => (
              <View key={column} className="min-w-0 flex-1">
                {stats.rankOutfits
                  .slice(0, 6)
                  .filter((_, i) => i % 2 === column)
                  .map((outfit) => (
                    <OutfitCard key={outfit.id} outfit={outfit} compact />
                  ))}
              </View>
            ))}
          </View>
        </Card>
      )}
      <Card title="Compartilhar só o que faz sentido">
        <View className="flex-row items-center justify-between gap-4">
          <Label className="flex-1 text-sm">Incluir custo por uso</Label>
          <Switch
            accessibilityLabel="Incluir preços no compartilhamento"
            value={prices}
            onValueChange={setPrices}
            trackColor={{ true: '#17613E' }}
          />
        </View>
        <Label className="text-xs text-muted">
          Compartilhe o cartão ou um resumo em texto. Agenda, localização e inventário completo
          ficam privados.
        </Label>
        <ShareCard lines={body.split('\n')} />
        <Button
          title="Compartilhar minha retrospectiva"
          icon="share-2"
          onPress={() =>
            void Share.share({ message: body }).catch(() =>
              setError('Não foi possível abrir o compartilhamento neste dispositivo.'),
            )
          }
        />
        <Notice message={error} />
      </Card>
    </>
  );
}
export function TravelDetails({ data, e, act, busy, planId }: StyleProps & { planId?: string }) {
  const [selected, setSelected] = useState(planId || data.plans[0]?.id || ''),
    [day, setDay] = useState(''),
    [task, setTask] = useState(''),
    [activity, setActivity] = useState(''),
    [error, setError] = useState<string | null>(null);
  const plan = data.plans.find((p) => p.id === selected) || data.plans[0];
  const [draft, setDraft] = useState<PlanDetail>(
    () => e.planDetails[plan?.id || ''] || { packed: [], backupOutfitIds: [], days: {}, tasks: [] },
  );
  if (!plan)
    return (
      <Card>
        <Label>Crie uma viagem ou evento no calendário para preparar as peças.</Label>
        <Button
          title="Planejar um evento"
          onPress={() => router.push({ pathname: '/calendar', params: { view: 'plans' } })}
        />
      </Card>
    );
  const ids = new Set([
    ...plan.item_ids,
    ...data.outfits
      .filter((o) =>
        [
          ...plan.outfit_ids,
          ...draft.backupOutfitIds,
          ...Object.values(draft.days).flat(),
        ].includes(o.id),
      )
      .flatMap((o) => o.items.map((i) => i.id)),
  ]);
  const items = data.items.filter((i) => ids.has(i.id)),
    packed = draft.packed.filter((id) => ids.has(id)),
    known = items.filter(
      (i) => e.details[i.id]?.weightGrams !== null && e.details[i.id]?.weightGrams !== undefined,
    ),
    weight = known.reduce((s, i) => s + e.details[i.id]!.weightGrams!, 0);
  const toggle = (list: string[], id: string) =>
    list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
  return (
    <>
      <Choices
        values={Object.fromEntries(data.plans.map((p) => [p.id, p.title]))}
        value={plan.id}
        onChange={(id) => {
          setSelected(id);
          setDraft(e.planDetails[id] || { packed: [], backupOutfitIds: [], days: {}, tasks: [] });
          setError(null);
        }}
      />
      <Card title={plan.title}>
        <Label className="text-sm text-muted">
          {formatDate(plan.date)} a {formatDate(plan.end_date)}
        </Label>
        <Progress value={items.length ? packed.length / items.length : 0} label="Peças separadas" />
        <Label>
          {packed.length} de {items.length} peças separadas
        </Label>
        <ItemChoices
          items={items}
          selected={packed}
          label="Separar"
          onSelect={(id) => setDraft({ ...draft, packed: toggle(packed, id) })}
        />
        <Label className="text-xs text-muted">
          {known.length
            ? `${(weight / 1000).toLocaleString('pt-BR')} kg de peso informado (${known.length}/${items.length} peças). Não inclui a mala.`
            : 'Informe o peso das peças no closet para estimar a mala.'}
        </Label>
        {items.some((i) => e.details[i.id] && e.details[i.id]?.state !== 'available') && (
          <Notice
            kind="info"
            message="Há peças indisponíveis nesta mala. Confira o que precisa lavar, buscar ou consertar."
          />
        )}
      </Card>
      <WeatherCard city={e.profile.city} date={plan.date} />
      <Card title="Seu plano B">
        <Label className="text-sm text-muted">
          Escolha alternativas. Peças compartilhadas entre looks aparecem uma única vez na mala.
        </Label>
        {data.outfits.map((o) => (
          <Button
            key={o.id}
            title={`${draft.backupOutfitIds.includes(o.id) ? '✓ ' : ''}${o.name || 'Meu look'}`}
            secondary
            small
            onPress={() =>
              setDraft({ ...draft, backupOutfitIds: toggle(draft.backupOutfitIds, o.id) })
            }
          />
        ))}
      </Card>
      <Card title="O look de cada dia">
        <Field
          label="Dia da viagem · DD/MM/AAAA"
          value={day}
          onChangeText={setDay}
          maxLength={10}
        />
        <Field
          label="Atividades do dia"
          placeholder="Passeio de manhã, jantar à noite…"
          value={activity}
          onChangeText={setActivity}
          maxLength={240}
        />
        <Button
          title="Anotar atividades neste dia"
          secondary
          onPress={() => {
            try {
              const date = planDate(day);
              if (date < plan.date || date > plan.end_date)
                throw new Error('Escolha uma data dentro do evento.');
              setDraft({ ...draft, activities: { ...draft.activities, [date]: activity } });
              setError(null);
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Confira a data.');
            }
          }}
        />
        {Object.entries(draft.activities || {}).map(([date, text]) => (
          <Label key={date} className="text-sm">
            {inputDate(date)} · {text}
          </Label>
        ))}
        {data.outfits.map((o) => (
          <Button
            key={o.id}
            title={`Planejar ${o.name || 'look'} neste dia`}
            secondary
            small
            onPress={() => {
              try {
                const date = planDate(day);
                if (date < plan.date || date > plan.end_date)
                  throw new Error('Escolha uma data dentro do evento.');
                setDraft({
                  ...draft,
                  days: { ...draft.days, [date]: toggle(draft.days[date] || [], o.id) },
                });
                setError(null);
              } catch (err) {
                setError(err instanceof Error ? err.message : 'Confira a data.');
              }
            }}
          />
        ))}
        {Object.entries(draft.days)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([date, looks]) => (
            <Label key={date} className="text-xs">
              {inputDate(date)} ·{' '}
              {looks
                .map((id) => data.outfits.find((o) => o.id === id)?.name || 'Look')
                .join(', ') || 'Sem look'}
            </Label>
          ))}
      </Card>
      <Card title="Antes de sair">
        <Field label="Lavar, passar, buscar…" value={task} onChangeText={setTask} maxLength={100} />
        <Button
          title="Adicionar à preparação"
          icon="plus"
          secondary
          disabled={!task.trim() || draft.tasks.length >= 30}
          onPress={() => {
            setDraft({ ...draft, tasks: [...draft.tasks, task.trim()] });
            setTask('');
          }}
        />
        {draft.tasks.map((t, index) => (
          <Button
            key={`${index}-${t}`}
            title={`Concluir: ${t}`}
            secondary
            small
            onPress={() => setDraft({ ...draft, tasks: draft.tasks.filter((_, i) => i !== index) })}
          />
        ))}
      </Card>
      <Notice message={error} />
      <Button
        title="Salvar preparação da viagem"
        busy={busy}
        onPress={() =>
          void act({ action: 'plan_detail', id: plan.id, detail: { ...draft, packed } }).then(
            (ok) => setError(ok ? null : 'Não foi possível salvar a preparação.'),
          )
        }
      />
      <Label className="text-xs text-muted">
        O checklist não cria registros de uso. Para receber lembretes, marque a preferência no
        evento e ative as notificações neste aparelho.
      </Label>
      <Button
        title="Ativar lembretes neste aparelho"
        icon="bell"
        secondary
        onPress={() =>
          void enableLocalReminders(data.plans, e.details)
            .then(() => setError(null))
            .catch((err) =>
              setError(
                err instanceof Error ? err.message : 'Não foi possível ativar os lembretes.',
              ),
            )
        }
      />
    </>
  );
}
