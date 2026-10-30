import { useState } from 'react';
import { View } from 'react-native';
import { recordWear } from '@/lib/api';
import { civilDate, formatDate } from '@/lib/dates';
import { useTask } from '@/hooks/useData';
import { useAuth } from '@/stores/auth';
import { MonthCalendar } from './MonthCalendar';
import { Button, Field, Label, Notice } from './ui';
export function WearForm({ outfitId, onDone }: { outfitId: string; onDone: () => void }) {
  const [month, setMonth] = useState(new Date());
  const [date, setDate] = useState(civilDate());
  const [notes, setNotes] = useState('');
  const task = useTask();
  const { online } = useAuth();
  return (
    <View className="gap-4">
      <MonthCalendar
        month={month}
        selected={date}
        marked={new Set()}
        onMonth={setMonth}
        onSelect={setDate}
      />
      <Label className="text-sm">Data de uso: {formatDate(date)}</Label>
      <Field
        label="Observação · opcional"
        placeholder="Onde essa combinação te levou?"
        value={notes}
        onChangeText={setNotes}
        multiline
        maxLength={500}
        editable={!task.busy}
      />
      <Notice message={task.error} />
      <Button
        title="Confirmar uso"
        icon="check"
        busy={task.busy}
        disabled={!online}
        onPress={() => {
          void task.run(() => recordWear(outfitId, date, notes), onDone);
        }}
      />
    </View>
  );
}
