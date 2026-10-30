import { Switch, View } from 'react-native';
import { Button, Label, Notice } from '@/components/ui';
import { usePreferences } from '@/settings/preferences';
import { useStudioScreen } from '@/preview/store';
import { enableLocalReminders, syncLocalReminders } from '@/lib/local-reminders';
import { useTask } from '@/hooks/useData';
export function CareReminders() {
  const preferences = usePreferences(),
    studio = useStudioScreen(),
    task = useTask();
  return (
    <>
      <View className="flex-row items-center gap-3">
        <Switch
          accessibilityLabel="Lembretes de cuidados e devoluções"
          value={preferences.careReminders}
          onValueChange={(value) => {
            preferences.change('careReminders', value);
            if (studio.data)
              void task.run(() =>
                syncLocalReminders(studio.data!.plans, studio.data!.evolution?.details),
              );
          }}
        />
        <Label className="flex-1 text-sm">
          Lembrar cuidados agendados e devoluções de empréstimos
        </Label>
      </View>
      <Button
        title="Ativar notificações neste aparelho"
        secondary
        busy={task.busy}
        onPress={() =>
          void task.run(
            () => enableLocalReminders(studio.data?.plans || [], studio.data?.evolution?.details),
            () => task.setSuccess('Preferência de lembretes atualizada.'),
          )
        }
      />
      <Label className="text-xs text-muted">
        Notificações locais no aplicativo nativo. No navegador, as datas ficam disponíveis no
        planejamento. As mensagens não expõem nomes de pessoas ou roupas na tela bloqueada.
      </Label>
      <Notice message={task.error} />
      <Notice message={task.success} kind="success" />
    </>
  );
}
