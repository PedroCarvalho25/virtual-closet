const pad = (n: number) => String(n).padStart(2, '0');
export function civilDate(date = new Date()): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
export function parseCivil(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new Error('Data inválida.');
  const [, y, m, d] = match;
  const result = new Date(Number(y), Number(m) - 1, Number(d), 12);
  if (civilDate(result) !== value) throw new Error('Data inválida.');
  return result;
}
export function assertPastDate(value: string, today = civilDate()): void {
  parseCivil(value);
  if (value > today) throw new Error('Escolha hoje ou uma data anterior.');
}
export function formatDate(value: string | null, fallback = 'Ainda não usada'): string {
  if (!value) return fallback;
  return parseCivil(value).toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
export function monthBounds(month: Date): [string, string] {
  return [
    civilDate(new Date(month.getFullYear(), month.getMonth(), 1)),
    civilDate(new Date(month.getFullYear(), month.getMonth() + 1, 0)),
  ];
}
export function monthCells(month: Date): (string | null)[] {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  return [
    ...Array.from({ length: (first.getDay() + 6) % 7 }, () => null),
    ...Array.from({ length: days }, (_, i) =>
      civilDate(new Date(month.getFullYear(), month.getMonth(), i + 1)),
    ),
  ];
}
