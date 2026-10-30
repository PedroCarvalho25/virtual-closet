import { View } from 'react-native';
import { router } from 'expo-router';
import { Button, Label, Notice } from '@/components/ui';
import { Avatar } from '@/identity/ProfileAvatar';
import { useAuth } from '@/stores/auth';
import { useIdentity } from '@/identity/store';
import { useTask } from '@/hooks/useData';
import { readShowcase, visibleFollowers, showcaseUsername } from './model';
import { saveShowcase } from './api';

export function useShowcase() {
  const session = useAuth((s) => s.session);
  const profile = useIdentity((s) => s.account?.profile);
  return profile?.username === showcaseUsername && profile.id === session?.user.id
    ? readShowcase(session.user.user_metadata, session.user.id)
    : null;
}
export function ShowcaseCard() {
  const profile = useIdentity((s) => s.account?.profile),
    state = useShowcase();
  if (profile?.username !== showcaseUsername) return null;
  return (
    <View className="gap-3 rounded-[24px] bg-sage p-5">
      <Label className="font-bold">
        {state?.completed ? 'Conta de apresentação' : 'Seu closet de apresentação'}
      </Label>
      <Label className="text-xs leading-5 text-muted">
        {state?.completed
          ? `Acervo e usos de exemplo. O contador desta tela inclui ${visibleFollowers(state).length} perfis fictícios, identificados na lista de seguidores.`
          : 'Um acervo de 20 peças, cinco combinações e uma comunidade de exemplo para mostrar o Virtual Closet.'}
      </Label>
      <Button
        title={
          state?.completed ? 'Abrir roteiro da apresentação' : 'Preparar conta de apresentação'
        }
        icon="play"
        secondary
        onPress={() => router.push('/account-demo')}
      />
    </View>
  );
}
export function ExampleFollowers() {
  const state = useShowcase(),
    task = useTask(),
    rows = visibleFollowers(state);
  if (!state || !rows.length) return null;
  return (
    <View className="gap-3">
      <Label className="font-bold">Comunidade de exemplo · {rows.length}</Label>
      <Label className="text-xs leading-5 text-muted">
        Perfis fictícios para esta apresentação. Não são contas reais e não recebem mensagens. As
        conexões reais continuam separadas.
      </Label>
      <Notice message={task.error} />
      {rows.map((person) => (
        <View key={person.id} className="gap-3 rounded-2xl bg-sage p-4">
          <View className="flex-row items-center gap-3">
            <Avatar path={null} name={person.name} tone={person.tone} size={46} />
            <View className="flex-1 gap-1">
              <Label className="font-bold text-sm">{person.name}</Label>
              <Label className="text-xs">@{person.id} · fictício</Label>
              <Label className="text-xs text-muted">{person.style}</Label>
            </View>
          </View>
          <Button
            title={`Remover exemplo de ${person.name}`}
            small
            secondary
            busy={task.busy}
            onPress={() =>
              void task.run(() =>
                saveShowcase({ ...state, hiddenFollowers: [...state.hiddenFollowers, person.id] }),
              )
            }
          />
        </View>
      ))}
    </View>
  );
}
