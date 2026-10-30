import { Platform } from 'react-native';
import { useAuth } from '@/stores/auth';
import type { OutfitPlan } from '@/preview/types';
import { usePreferences } from '@/settings/preferences';
import type { ItemDetail } from '@/evolution/types';
import { reminderPlan, careReminderPlan } from './reminder-plan';
let queue: Promise<void> = Promise.resolve();
function serialize(work: () => Promise<void>) {
  const next = queue.then(work, work);
  queue = next.catch(() => {});
  return next;
}
export async function enableLocalReminders(plans: OutfitPlan[], details: Record<string,ItemDetail> = {}) {
  if (Platform.OS === 'web')
    throw new Error(
      'Lembretes locais são ativados no iPhone pelo Expo Go. Na prévia web, você pode organizar os planos.',
    );
  const api = await import('expo-notifications');
  const permissions = await api.requestPermissionsAsync();
  if (!permissions.granted)
    throw new Error(
      'As notificações não foram permitidas. Você pode autorizar o Expo Go nos Ajustes do iPhone.',
    );
  await syncLocalReminders(plans, details);
}
export function syncLocalReminders(plans: OutfitPlan[], details: Record<string,ItemDetail> = {}) {
  const owner = useAuth.getState().session?.user.id;
  return serialize(async () => {
    if (Platform.OS === 'web' || !owner || useAuth.getState().session?.user.id !== owner) return;
    const api = await import('expo-notifications');
    if (!(await api.getPermissionsAsync()).granted) return;
    const desired = [...reminderPlan(plans, owner), ...(usePreferences.getState().careReminders ? careReminderPlan(details, owner) : [])].sort((a,b)=>a.at.getTime()-b.at.getTime()).slice(0,48),
      byId = new Map(desired.map((r) => [r.id, r]));
    const pending = await api.getAllScheduledNotificationsAsync();
    for (const request of pending.filter((r) => r.identifier.startsWith(`closet:${owner}:`))) {
      const wanted = byId.get(request.identifier);
      if (!wanted || request.content.data?.when !== wanted.at.toISOString())
        await api.cancelScheduledNotificationAsync(request.identifier);
      else byId.delete(request.identifier);
    }
    for (const r of byId.values()) {
      if (useAuth.getState().session?.user.id !== owner) return;
      await api.scheduleNotificationAsync({
        identifier: r.id,
        content: {
          title: 'Um momento para o seu look',
          body: r.planId.startsWith('item:') ? 'Você tem um cuidado ou uma devolução agendada. Abra seu closet para conferir.' : 'Seu próximo plano está chegando. Abra o Virtual Closet para se preparar.',
          sound: false,
          data: { owner, planId: r.planId, when: r.at.toISOString() },
        },
        trigger: { type: api.SchedulableTriggerInputTypes.DATE, date: r.at },
      });
      if (useAuth.getState().session?.user.id !== owner)
        await api.cancelScheduledNotificationAsync(r.id);
    }
  });
}
export function cancelLocalReminders(owner: string) {
  return serialize(async () => {
    if (Platform.OS === 'web') return;
    const api = await import('expo-notifications');
    for (const r of await api.getAllScheduledNotificationsAsync())
      if (r.identifier.startsWith(`closet:${owner}:`))
        await api.cancelScheduledNotificationAsync(r.identifier);
  });
}
