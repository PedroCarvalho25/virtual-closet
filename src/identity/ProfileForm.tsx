import { useState } from 'react';
import { Switch, Text, View } from 'react-native';
import { Button, Chip, Field, Icon, Label, Notice } from '@/components/ui';
import { SoftPressable } from '@/components/motion';
import { useTask } from '@/hooks/useData';
import { useAuth } from '@/stores/auth';
import { saveProfile, usernameAvailable } from './api';
import { normalizeUsername, normalizeProfile, profileTags } from './validation';
import {
  profileTones,
  type AccountData,
  type IdentityProfile,
  type ProfileDraft,
  type ProfileTone,
} from './types';
export function ProfileForm({
  initial,
  current,
  onSaved,
  onCancel,
}: {
  initial: ProfileDraft;
  current?: IdentityProfile;
  onSaved: (account: AccountData) => void;
  onCancel?: () => void;
}) {
  const [draft, setDraft] = useState(initial);
  const task = useTask();
  const online = useAuth((s) => s.online);
  const [openedAt] = useState(() => Date.now());
  const locked = !!current && new Date(current.usernameAvailableAt).getTime() > openedAt;
  const change = <K extends keyof ProfileDraft>(key: K, value: ProfileDraft[K]) =>
    setDraft((p) => ({ ...p, [key]: value }));
  return (
    <View className="gap-5">
      <View className="flex-row gap-3">
        <View className="flex-1">
          <Field
            label="Nome"
            value={draft.firstName}
            onChangeText={(v) => change('firstName', v)}
            maxLength={50}
            editable={!task.busy}
          />
        </View>
        <View className="flex-1">
          <Field
            label="Sobrenome"
            value={draft.lastName}
            onChangeText={(v) => change('lastName', v)}
            maxLength={80}
            editable={!task.busy}
          />
        </View>
      </View>
      <Field
        label="Nome de usuário"
        value={draft.username}
        onChangeText={(v) => change('username', normalizeUsername(v))}
        autoCapitalize="none"
        autoCorrect={false}
        maxLength={24}
        editable={!locked && !task.busy}
      />
      <Label className="text-xs leading-5 text-muted">
        {locked
          ? `Próxima troca do @: ${new Date(current!.usernameAvailableAt).toLocaleDateString('pt-BR')}.`
          : 'Seu @ é único. Após escolher, a próxima troca fica disponível em 30 dias.'}
      </Label>
      <Field
        label="Bio · opcional"
        placeholder="Sobre você"
        value={draft.bio}
        onChangeText={(v) => change('bio', v)}
        multiline
        maxLength={160}
        editable={!task.busy}
      />
      <View className="gap-3">
        <Text className="font-bold text-lg text-ink">Cor do perfil</Text>
        <View className="flex-row flex-wrap gap-2">
          {Object.entries(profileTones).map(([key, tone]) => (
            <SoftPressable
              key={key}
              accessibilityRole="button"
              accessibilityLabel={tone.label}
              accessibilityState={{ selected: draft.tone === key, disabled: task.busy }}
              disabled={task.busy}
              className="min-h-12 flex-row items-center gap-2 rounded-2xl border-2 px-3 py-2"
              style={{
                backgroundColor: tone.background,
                borderColor: draft.tone === key ? tone.ink : 'transparent',
              }}
              onPress={() => {
                if (!task.busy) change('tone', key as ProfileTone);
              }}
            >
              {draft.tone === key && <Icon name="check" size={15} color={tone.ink} />}
              <Text style={{ color: tone.ink, fontFamily: 'DMSans_700Bold', fontSize: 13 }}>
                {tone.label}
              </Text>
            </SoftPressable>
          ))}
        </View>
      </View>
      <View className="gap-3">
        <Text className="font-bold text-lg text-ink">Estilos · até 3</Text>
        <View className="flex-row flex-wrap gap-2">
          {profileTags.map((tag) => (
            <Chip
              key={tag}
              label={tag}
              selected={draft.tags.includes(tag)}
              onPress={() => {
                if (!task.busy)
                  change(
                    'tags',
                    draft.tags.includes(tag)
                      ? draft.tags.filter((v) => v !== tag)
                      : draft.tags.length < 3
                        ? [...draft.tags, tag]
                        : draft.tags,
                  );
              }}
            />
          ))}
        </View>
      </View>
      <View className="gap-3 rounded-[22px] bg-sage p-4">
        <View className="flex-row items-center gap-4">
          <View className="flex-1">
            <Label className="font-medium text-sm">Permitir encontrar meu perfil</Label>
          </View>
          <Switch
            accessibilityLabel="Permitir encontrar meu perfil"
            value={draft.discoverable}
            disabled={task.busy}
            onValueChange={(value) => change('discoverable', value)}
            trackColor={{ true: '#17613E', false: '#CCD3C4' }}
          />
        </View>
        <Label className="text-xs leading-5 text-muted">
          Outras pessoas do app poderão ver seu nome, @, foto, apresentação e contagens. Suas
          roupas, fotos de peças e publicações do diário continuam privadas.
        </Label>
      </View>
      <Notice message={task.error} />
      <Button
        title={current ? 'Salvar meu perfil' : 'Criar meu perfil'}
        icon="check"
        busy={task.busy}
        disabled={!online}
        onPress={() =>
          void task.run(async () => {
            const value = normalizeProfile(draft);
            if (!(await usernameAvailable(value.username)))
              throw new Error('Esse @ já está em uso. Escolha outro nome de usuário.');
            return saveProfile(value);
          }, onSaved)
        }
      />
      {onCancel && (
        <Button title="Cancelar edição" secondary disabled={task.busy} onPress={onCancel} />
      )}
    </View>
  );
}
