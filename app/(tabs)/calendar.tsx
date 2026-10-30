import { useCallback, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { CalendarMode, Planner } from '@/preview/Planner';
import { fetchOutfits, fetchWear, recordWear, removeWear } from '@/lib/api';
import { civilDate, formatDate, monthBounds } from '@/lib/dates';
import { useData, usePagedData, useTask } from '@/hooks/useData';
import { useClosetCache } from '@/stores/cache';
import { useAuth } from '@/stores/auth';
import { OfflineNotice } from '@/components/OfflineNotice';
import { MonthCalendar } from '@/components/MonthCalendar';
import { ConfirmAction } from '@/components/ConfirmAction';
import {
  Button,
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
export default function CalendarScreen() {
  const { view } = useLocalSearchParams<{ view?: string }>();
  return view === 'plans' ? <Planner /> : <HistoryCalendar />;
}
function HistoryCalendar() {
  const [month, setMonth] = useState(new Date());
  const [selected, setSelected] = useState(civilDate());
  const [choosing, setChoosing] = useState(false);
  const [outfitId, setOutfitId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const { online } = useAuth();
  const { outfits: cachedOutfits } = useClosetCache();
  const [start, end] = monthBounds(month);
  const loadWear = useCallback(() => fetchWear(start, end), [start, end]);
  const result = useData(loadWear);
  const loadOutfits = useCallback((page: number) => fetchOutfits(page), []);
  const outfits = usePagedData(loadOutfits, cachedOutfits);
  const task = useTask();
  const marked = useMemo(() => new Set(result.data?.map((log) => log.worn_date)), [result.data]);
  const logs = result.data?.filter((log) => log.worn_date === selected) || [];
  return (
    <Page>
      <TopBar />
      {<CalendarMode plans={false} />}
      <PageTitle title="O que você vestiu?" />
      <OfflineNotice cache={false} />
      <MonthCalendar
        month={month}
        selected={selected}
        marked={marked}
        onMonth={(value) => {
          setMonth(value);
          const first = civilDate(value);
          setSelected(first > civilDate() ? civilDate() : first);
          setChoosing(false);
        }}
        onSelect={(value) => {
          setSelected(value);
          setChoosing(false);
          task.setSuccess(null);
        }}
      />
      <Notice message={result.error} action={result.refresh} />
      <Notice message={task.error} />
      <Notice message={task.success} kind="success" />
      <View className="gap-4">
        <View className="flex-row items-center justify-between">
          <Text className="font-semibold text-lg text-ink">{formatDate(selected)}</Text>
          <Label className="text-xs text-muted">
            {logs.length} {logs.length === 1 ? 'registro' : 'registros'}
          </Label>
        </View>
        {result.loading ? (
          <Loading />
        ) : !online ? (
          <Notice
            kind="info"
            message="O calendário precisa de conexão para consultar seus registros."
          />
        ) : logs.length === 0 ? (
          <Empty
            title="Um dia para lembrar"
            description="Usou uma combinação que gostou? Registre seu outfit aqui."
            icon="sun"
          />
        ) : (
          logs.map((log) => (
            <View key={log.id} className="gap-4 rounded-card border border-line bg-paper p-5">
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push(`/outfit/${log.outfit_id}`)}
                className="min-h-11 flex-row items-center justify-between gap-3"
              >
                <View className="flex-1 gap-2">
                  <Text className="font-medium text-sm text-ink">
                    {cachedOutfits.find((o) => o.id === log.outfit_id)?.name || 'Seu outfit'}
                  </Text>
                  {log.notes && <Label className="text-xs leading-5 text-muted">{log.notes}</Label>}
                </View>
                <Icon name="arrow-up-right" size={18} />
              </Pressable>
              <ConfirmAction
                label="Remover registro"
                description="Remover este uso do calendário? O outfit será preservado e as últimas datas serão recalculadas."
                busy={task.busy}
                disabled={!online}
                onConfirm={() => {
                  void task.run(
                    () => removeWear(log.id),
                    () => task.setSuccess('Registro removido. Histórico atualizado.'),
                  );
                }}
              />
            </View>
          ))
        )}
      </View>
      {!choosing ? (
        <Button
          title="Registrar outfit neste dia"
          icon="plus"
          disabled={!online}
          onPress={() => {
            setChoosing(true);
            setOutfitId(null);
            setNotes('');
            task.setSuccess(null);
          }}
        />
      ) : (
        <View className="gap-4 rounded-card border border-line bg-paper p-5">
          <Text className="font-display text-2xl text-ink">Qual combinação você usou?</Text>
          <Notice message={outfits.error} action={outfits.refresh} />
          {outfits.loading && !outfits.data.length && <Loading />}
          {outfits.data.map((outfit) => (
            <Pressable
              key={outfit.id}
              accessibilityRole="button"
              accessibilityState={{ selected: outfitId === outfit.id }}
              onPress={() => setOutfitId(outfit.id)}
              className={`min-h-14 flex-row items-center justify-between gap-3 rounded-2xl border p-4 ${outfitId === outfit.id ? 'border-accent bg-blush' : 'border-line'}`}
            >
              <Label className="flex-1 text-sm">{outfit.name || 'Uma boa combinação'}</Label>
              {outfitId === outfit.id && <Icon name="check" size={18} />}
            </Pressable>
          ))}
          {!outfits.loading && !outfits.error && !outfits.data.length && (
            <Empty
              title="Primeiro, uma combinação"
              description="Crie seu primeiro outfit para começar o histórico."
              action={<Button title="Criar outfit" onPress={() => router.push('/outfit/new')} />}
            />
          )}
          {outfits.hasMore && (
            <Button
              title="Carregar mais outfits"
              secondary
              busy={outfits.loading}
              onPress={outfits.more}
            />
          )}
          <Field
            label="Observação · opcional"
            placeholder="Um detalhe sobre esse dia…"
            value={notes}
            onChangeText={setNotes}
            maxLength={500}
            multiline
            editable={!task.busy}
          />
          <Button
            title="Salvar registro"
            busy={task.busy}
            disabled={!outfitId || !online}
            onPress={() => {
              if (outfitId)
                void task.run(
                  () => recordWear(outfitId, selected, notes),
                  () => {
                    setChoosing(false);
                    task.setSuccess('Uso registrado. Seu histórico foi atualizado.');
                  },
                );
            }}
          />
          <Button
            title="Cancelar"
            secondary
            disabled={task.busy}
            onPress={() => setChoosing(false)}
          />
        </View>
      )}
    </Page>
  );
}
