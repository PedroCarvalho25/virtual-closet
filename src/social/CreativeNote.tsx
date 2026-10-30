import { useCallback, useState } from 'react';
import { View } from 'react-native';
import { Button, Field, Icon, Label, Notice } from '@/components/ui';
import { useData, useTask } from '@/hooks/useData';
import { useAuth } from '@/stores/auth';
import { notebook } from './api';
export function CreativeNote({ id }: { id: string }) {
  const load = useCallback(() => notebook({ kind: 'get', id }), [id]);
  const data = useData(load);
  const [draft, setDraft] = useState<string | null>(null);
  const task = useTask();
  const online = useAuth((s) => s.online);
  return (
    <View className="gap-3 rounded-[24px] bg-sage p-5">
      <View className="flex-row items-center gap-2">
        <Icon name="edit-3" size={18} />
        <Label className="font-bold">Caderno de criação</Label>
        <Icon name="lock" size={14} />
      </View>
      <Label className="text-xs leading-5 text-muted">
        O que você quer experimentar? Sua anotação fica só na sua conta, mesmo se republicar a foto.
      </Label>
      <Notice message={data.error || task.error} action={() => void data.refresh()} />
      <Notice message={task.success} kind="success" />
      <Field
        label="Minha ideia para esta referência"
        placeholder="Uma combinação, um detalhe, uma peça que já tenho…"
        multiline
        maxLength={1200}
        value={draft ?? data.data ?? ''}
        onChangeText={setDraft}
        editable={!data.loading && !data.error && !task.busy}
        style={{ minHeight: 110, textAlignVertical: 'top' }}
      />
      <Button
        title="Guardar ideia"
        small
        secondary
        icon="check"
        busy={task.busy}
        disabled={!online || data.loading || !!data.error || draft === null}
        onPress={() =>
          void task.run(
            () => notebook({ kind: 'save', id, note: draft || '' }),
            (saved) => {
              setDraft(saved);
              task.setSuccess(saved ? 'Ideia guardada só para você.' : 'Anotação removida.');
            },
          )
        }
      />
    </View>
  );
}
