import { parseCivil } from './dates';
import type { OutfitPlan } from '../preview/types';
import type { ItemDetail } from '../evolution/types';
export function careReminderPlan(details: Record<string, ItemDetail>, owner: string, now = new Date()) {
  const output: { id: string; at: Date; planId: string }[] = [];
  for (const [id, detail] of Object.entries(details)) {
    const dates = [detail.careReminderDate, detail.state === 'lent' ? detail.returnDate : null];
    for (const [index,date] of dates.entries()) {
      if (!date) continue;
      try { parseCivil(date); } catch { continue; }
      const [y,m,d] = date.split('-').map(Number);
      const at = new Date(y!,m!-1,d!,9,0,0);
      if(at>now) output.push({ id:`closet:${owner}:care:${id}:${index}`, at, planId:`item:${id}` });
    }
  }
  return output;
}
export function reminderPlan(plans: OutfitPlan[], owner: string, now = new Date()) {
  const reminders: { id: string; at: Date; planId: string }[] = [];
  for (const p of plans.filter((p) => p.reminder)) {
    try {
      parseCivil(p.date);
    } catch {
      continue;
    }
    const [y, m, d] = p.date.split('-').map(Number);
    if (!y || !m || !d) continue;
    for (const [offset, hour, label] of [
      [-1, 18, 'before'],
      [0, 9, 'day'],
    ] as const) {
      const at = new Date(y, m - 1, d + offset, hour, 0, 0, 0);
      if (at > now) reminders.push({ id: `closet:${owner}:${p.id}:${label}`, at, planId: p.id });
    }
  }
  return reminders
    .sort((a, b) => a.at.getTime() - b.at.getTime() || a.id.localeCompare(b.id))
    .slice(0, 48);
}
