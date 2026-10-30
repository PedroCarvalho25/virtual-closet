import { useState } from 'react';
import { Switch, Text, View } from 'react-native';
import { Button, Chip, Field, Label, Notice } from '@/components/ui';
import { useTask } from '@/hooks/useData';
import { useAuth } from '@/stores/auth';
import { client } from '@/lib/supabase';
import { useTheme } from '@/settings/Theme';
import { greetingFor, greetingKey, readGreeting, sexOptions, type GreetingSex } from './greetings';

export function SexChoices({
  value,
  onChange,
  disabled = false,
}: {
  value: GreetingSex;
  onChange: (value: GreetingSex) => void;
  disabled?: boolean;
}) {
  return (
    <View className="gap-2">
      <Label className="font-medium text-sm">Sexo · opcional</Label>
      <View className="flex-row flex-wrap gap-2">
        {(Object.entries(sexOptions) as [GreetingSex, string][]).map(([key, label]) => (
          <Chip
            key={key}
            label={label}
            selected={value === key}
            disabled={disabled}
            onPress={() => onChange(key)}
          />
        ))}
      </View>
      <Label className="text-xs leading-5 text-muted">
        Usado para ajustar as saudações. Sem resposta, usamos frases neutras. Você pode mudar
        depois.
      </Label>
    </View>
  );
}
export function GreetingSettings({ firstName }: { firstName: string }) {
  const session = useAuth((s) => s.session),
    online = useAuth((s) => s.online),
    colors = useTheme(),
    task = useTask();
  const [draft, setDraft] = useState(() => readGreeting(session?.user.user_metadata));
  return (
    <View className="gap-4 border-t border-line pt-5">
      <Label className="font-bold">Do seu jeito, desde o oi</Label>
      <Field
        label="Nome pelo qual gostaria de ser chamado"
        value={draft.preferredName}
        onChangeText={(preferredName) => setDraft({ ...draft, preferredName })}
        multiline
        autoCorrect={false}
        editable={!task.busy}
      />
      <Label className="text-xs leading-5 text-muted">
        Pode ser um apelido, nome social ou como você se sentir melhor. Espaços, acentos, símbolos e
        emojis são bem-vindos.
      </Label>
      <View className="min-h-14 flex-row items-center gap-4">
        <Label className="flex-1 font-medium">Usar esse nome nas saudações</Label>
        <Switch
          accessibilityLabel="Usar esse nome nas saudações"
          value={draft.usePreferredName}
          disabled={task.busy}
          onValueChange={(usePreferredName) => setDraft({ ...draft, usePreferredName })}
          trackColor={{ false: colors.line, true: colors.accent }}
          thumbColor={colors.paper}
        />
      </View>
      <SexChoices
        value={draft.sex}
        disabled={task.busy}
        onChange={(sex) => setDraft({ ...draft, sex })}
      />
      <View className="gap-2 rounded-2xl bg-sage p-4">
        <Label className="text-xs text-muted">Assim fica o seu oi</Label>
        <Text className="font-sans text-sm text-ink" style={{ flexShrink: 1 }}>
          {greetingFor(draft, firstName)}
        </Text>
      </View>
      <Label className="text-xs leading-5 text-muted">
        Estas escolhas ficam na sua conta e só personalizam suas saudações. Seu nome público e seu @
        continuam iguais. Deixe o campo vazio para usar seu primeiro nome.
      </Label>
      <Button
        title="Salvar minhas saudações"
        busy={task.busy}
        disabled={!online}
        onPress={() =>
          void task.run(
            async () => {
              const owner = useAuth.getState().session?.user.id;
              if (!owner || owner !== session?.user.id)
                throw new Error('Sua sessão mudou. Reabra as configurações.');
              const result = await client().auth.updateUser({ data: { [greetingKey]: draft } });
              if (result.error)
                throw new Error('Não foi possível salvar as saudações. Tente novamente.');
              if (result.data.user.id !== owner || useAuth.getState().session?.user.id !== owner)
                throw new Error('Sua sessão mudou.');
              // Supabase persists the user and emits USER_UPDATED; SessionProvider applies it.
            },
            () => task.setSuccess('Suas saudações foram salvas.'),
          )
        }
      />
      <Notice message={task.error} />
      <Notice message={task.success} kind="success" />
    </View>
  );
}
