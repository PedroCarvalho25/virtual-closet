import { Pressable, Text, View } from 'react-native';
import { civilDate, monthCells } from '@/lib/dates';
import { IconButton } from './ui';
export function MonthCalendar({
  month,
  selected,
  marked,
  onMonth,
  onSelect,
  allowFuture = false,
  markerLabel = 'com registro',
}: {
  month: Date;
  selected: string;
  marked: Set<string>;
  onMonth: (value: Date) => void;
  onSelect: (value: string) => void;
  allowFuture?: boolean;
  markerLabel?: string;
}) {
  const today = civilDate();
  return (
    <View className="gap-4 rounded-card border border-line bg-paper p-4">
      <View className="flex-row items-center justify-between">
        <IconButton
          icon="chevron-left"
          label="Mês anterior"
          onPress={() => onMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
        />
        <Text className="flex-1 text-center font-display text-xl capitalize text-ink">
          {month.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
        </Text>
        <IconButton
          icon="chevron-right"
          label="Próximo mês"
          onPress={() => onMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
        />
      </View>
      <View className="flex-row">
        {['S', 'T', 'Q', 'Q', 'S', 'S', 'D'].map((day, i) => (
          <Text
            key={i}
            className="text-center font-medium text-[10px] text-muted"
            style={{ width: '14.2857%' }}
          >
            {day}
          </Text>
        ))}
      </View>
      <View className="flex-row flex-wrap">
        {monthCells(month).map((date, i) => (
          <View key={date || `blank-${i}`} style={{ width: '14.2857%', minHeight: 47 }}>
            {date && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Dia ${Number(date.slice(-2))}${marked.has(date) ? `, ${markerLabel}` : ''}`}
                accessibilityState={{
                  selected: selected === date,
                  disabled: !allowFuture && date > today,
                }}
                onPress={() => onSelect(date)}
                disabled={!allowFuture && date > today}
                className={`mx-0.5 min-h-11 items-center justify-center rounded-2xl ${selected === date ? 'bg-accent' : date === today ? 'bg-sage' : ''} ${!allowFuture && date > today ? 'opacity-30' : ''}`}
              >
                <Text
                  className={`font-medium text-sm ${selected === date ? 'text-white' : 'text-ink'}`}
                >
                  {Number(date.slice(-2))}
                </Text>
                <View
                  className={`mt-1 h-1 w-1 rounded-full ${marked.has(date) ? (selected === date ? 'bg-paper' : 'bg-accent') : 'bg-transparent'}`}
                />
              </Pressable>
            )}
          </View>
        ))}
      </View>
    </View>
  );
}
