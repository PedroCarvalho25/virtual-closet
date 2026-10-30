import { useState } from 'react';
import { View } from 'react-native';
import { Button, IconButton, Label } from './ui';
export function ConfirmAction({
  label,
  description,
  onConfirm,
  busy = false,
  disabled = false,
  compact = false,
}: {
  label: string;
  description: string;
  onConfirm: () => void;
  busy?: boolean;
  disabled?: boolean;
  compact?: boolean;
}) {
  const [confirm, setConfirm] = useState(false);
  if (!confirm && compact)
    return (
      <View className="items-end">
        <IconButton
          icon="more-horizontal"
          label={label}
          disabled={disabled || busy}
          onPress={() => setConfirm(true)}
        />
      </View>
    );
  if (!confirm)
    return (
      <Button
        title={label}
        secondary
        small
        disabled={disabled || busy}
        onPress={() => setConfirm(true)}
      />
    );
  return (
    <View className="gap-3 rounded-2xl bg-blush p-4">
      <Label className="text-xs leading-5">{description}</Label>
      <View className={`${compact ? '' : 'flex-row'} gap-2`}>
        <View className="flex-1">
          <Button title="Confirmar" small busy={busy} disabled={disabled} onPress={onConfirm} />
        </View>
        <View className="flex-1">
          <Button
            title="Cancelar"
            small
            secondary
            disabled={busy}
            onPress={() => setConfirm(false)}
          />
        </View>
      </View>
    </View>
  );
}
