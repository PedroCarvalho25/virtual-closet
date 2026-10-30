import { useState } from 'react';
import { Switch, View } from 'react-native';
import { router } from 'expo-router';
import * as Crypto from 'expo-crypto';
import { Button, Field, Label, Notice } from '@/components/ui';
import { OutfitArtwork } from '@/components/cards';
import { Progress } from '@/components/motion';
import { ConfirmAction } from '@/components/ConfirmAction';
import { civilDate, formatDate } from '@/lib/dates';
import { dailySuggestions } from './core';
import { Card, Choices, type StyleProps } from './components';
import type { Feedback, Suggestion } from './types';
export { DailyLook as Today } from './DailyLook';
export function StyleLab({ data, e, act, busy }: StyleProps) {
  const today = civilDate(),
    done = e.decisions.filter((d) => d.kind === 'lab' && d.date === today).length;
  const options = dailySuggestions(
    data,
    e,
    done % 2 ? 'cool' : 'mild',
    done % 2 ? 'work' : 'casual',
    today,
  );
  const [message, setMessage] = useState('');
  return (
    <>
      <Card title="Escolha um look">
        <Label className="text-sm text-muted">
          Escolha o que usaria. São até três escolhas por dia, sem sequência obrigatória.
        </Label>
        <Progress value={done / 3} label="Escolhas de hoje" />
        <Label className="text-xs">{Math.min(done, 3)} de 3 escolhas</Label>
      </Card>
      {done >= 3 ? (
        <Card title="Por hoje, está ótimo.">
          <Label>
            Suas escolhas já ajudam nas próximas sugestões. Volte quando fizer sentido para você.
          </Label>
        </Card>
      ) : !options.length ? (
        <Label>Adicione uma parte de cima e uma parte de baixo para experimentar.</Label>
      ) : (
        options.slice(0, 2).map((s: Suggestion, index) => (
          <Card key={s.kind} title={`Opção ${index === 0 ? 'A' : 'B'}`}>
            <View style={{ height: 220, borderRadius: 20, overflow: 'hidden' }}>
              <OutfitArtwork outfit={{ items: s.items, photo_path: null }} />
            </View>
            <Button
              title={`Eu usaria a opção ${index === 0 ? 'A' : 'B'}`}
              disabled={busy}
              onPress={() =>
                void act({
                  action: 'decision',
                  decision: {
                    id: Crypto.randomUUID(),
                    date: today,
                    kind: 'lab',
                    reason: `Escolha ${done + 1}`,
                    itemIds: s.items.map((i) => i.id),
                    outfitId: null,
                    recipeId: null,
                  },
                }).then((ok) => {
                  if (ok) setMessage('Escolha guardada. Seu gosto é sempre seu.');
                })
              }
            />
          </Card>
        ))
      )}
      <Notice message={message} kind="success" />
    </>
  );
}
export function StyleMemory({ data, e, act, busy }: StyleProps) {
  const logs = [...data.wear].sort((a, b) => b.worn_date.localeCompare(a.worn_date));
  const previous = e.feedback.find(
    (f) => f.outfitId === logs[0]?.outfit_id && f.date === logs[0]?.worn_date,
  );
  const [chosen, setChosen] = useState(logs[0]?.id || ''),
    [draft, setDraft] = useState({
      comfort: previous?.comfort ?? true,
      confidence: previous?.confidence ?? true,
      weather: previous?.weather ?? true,
      occasion: previous?.occasion ?? true,
      again: previous?.again ?? true,
    }),
    [note, setNote] = useState(previous?.note || ''),
    [message, setMessage] = useState('');
  const log = logs.find((w) => w.id === chosen),
    outfit = data.outfits.find((o) => o.id === log?.outfit_id);
  const labels = {
    comfort: 'Foi confortável',
    confidence: 'Me senti confiante',
    weather: 'Funcionou para o clima',
    occasion: 'Combinou com a ocasião',
    again: 'Usaria novamente',
  };
  return (
    <>
      <Card title="Como você se sentiu?">
        <Label className="text-sm text-muted">
          O que aconteceu depois de vestir importa mais do que uma curtida.
        </Label>
        <Label className="text-xs">
          {e.feedback.length} usos avaliados · {e.decisions.length} escolhas guardadas
        </Label>
      </Card>
      {!log ? (
        <Card>
          <Label>Registre um uso no calendário para começar sua memória de estilo.</Label>
          <Button title="Abrir meu calendário" onPress={() => router.push('/calendar')} />
        </Card>
      ) : (
        <Card title="Um retorno rápido">
          <Choices
            values={Object.fromEntries(
              logs
                .slice(0, 30)
                .map((w) => [
                  w.id,
                  `${formatDate(w.worn_date)} · ${data.outfits.find((o) => o.id === w.outfit_id)?.name || 'Look'}`,
                ]),
            )}
            value={chosen}
            onChange={(id) => {
              setChosen(id);
              const w = logs.find((w) => w.id === id);
              const f = e.feedback.find(
                (f) => f.outfitId === w?.outfit_id && f.date === w?.worn_date,
              );
              setDraft(
                f
                  ? {
                      comfort: f.comfort,
                      confidence: f.confidence,
                      weather: f.weather,
                      occasion: f.occasion,
                      again: f.again,
                    }
                  : { comfort: true, confidence: true, weather: true, occasion: true, again: true },
              );
              setNote(f?.note || '');
            }}
          />
          {outfit && (
            <View style={{ height: 200, borderRadius: 20, overflow: 'hidden' }}>
              <OutfitArtwork outfit={outfit} />
            </View>
          )}
          {Object.entries(labels).map(([key, label]) => (
            <View key={key} className="flex-row items-center justify-between gap-4">
              <Label className="flex-1 text-sm">{label}</Label>
              <Switch
                accessibilityLabel={label}
                value={draft[key as keyof typeof draft]}
                onValueChange={(v) => setDraft({ ...draft, [key]: v })}
                trackColor={{ true: '#17613E' }}
              />
            </View>
          ))}
          <Field
            label="O que você quer lembrar?"
            value={note}
            onChangeText={setNote}
            multiline
            maxLength={300}
          />
          <Button
            title="Guardar meu feedback"
            busy={busy}
            onPress={() => {
              const feedback: Feedback = {
                id: Crypto.randomUUID(),
                outfitId: log.outfit_id,
                date: log.worn_date,
                ...draft,
                note,
              };
              void act({ action: 'feedback', feedback }).then((ok) => {
                if (ok)
                  setMessage(
                    'Feedback guardado. Suas próximas sugestões considerarão esse retorno.',
                  );
              });
            }}
          />
        </Card>
      )}
      <Notice message={message} kind="success" />
      <Card title="Você controla essa memória">
        <Label className="text-xs text-muted">
          Apagar o aprendizado remove avaliações e escolhas. Suas peças, combinações e registros de
          uso são preservados.
        </Label>
        <ConfirmAction
          label="Apagar meu aprendizado"
          description="Remover todas as avaliações e escolhas de personalização?"
          busy={busy}
          onConfirm={() =>
            void act({ action: 'clear_learning' }).then((ok) => {
              if (ok) setMessage('Aprendizado apagado. Seu histórico de uso foi preservado.');
            })
          }
        />
      </Card>
    </>
  );
}
