import { ScrollView, Text, View } from 'react-native';
import { Button, Chip, Label } from '@/components/ui';
import { Photo } from '@/components/Photo';
import { SoftPressable } from '@/components/motion';
import type { StudioAction, StudioData } from '@/preview/types';
import type { Evolution } from './types';
export type StyleProps = {
  data: StudioData;
  e: Evolution;
  act: (action: StudioAction) => Promise<boolean>;
  busy: boolean;
};
export function Choices<T extends string>({
  values,
  value,
  onChange,
}: {
  values: Record<T, string>;
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 6 }}
    >
      {Object.entries(values).map(([key, label]) => (
        <Chip
          key={key}
          label={String(label)}
          selected={value === key}
          onPress={() => onChange(key as T)}
        />
      ))}
    </ScrollView>
  );
}
export function Card({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <View className="gap-4 rounded-[24px] bg-paper p-5">
      {title && <Text className="font-semibold text-lg text-ink">{title}</Text>}
      {children}
    </View>
  );
}
export function ItemChoices({
  items,
  selected,
  onSelect,
  label = 'Escolher',
}: {
  items: StudioData['items'];
  selected: string[];
  onSelect: (id: string) => void;
  label?: string;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 10 }}
    >
      {items.map((i) => (
        <SoftPressable
          key={i.id}
          accessibilityRole="checkbox"
          accessibilityLabel={`${label} ${i.name}`}
          accessibilityState={{ checked: selected.includes(i.id) }}
          onPress={() => onSelect(i.id)}
          className={`w-28 gap-2 rounded-2xl p-2 ${selected.includes(i.id) ? 'bg-lemon' : 'bg-sage'}`}
        >
          <View className="h-28 overflow-hidden rounded-xl">
            <Photo path={i.photo_path} category={i.category} />
          </View>
          <Text className="font-medium text-xs text-ink">{i.name}</Text>
        </SoftPressable>
      ))}
    </ScrollView>
  );
}
export function EmptyLibrary({ title, onCreate }: { title: string; onCreate: () => void }) {
  return (
    <Card>
      <Label>{title}</Label>
      <Button title="Adicionar a primeira" secondary icon="plus" onPress={onCreate} />
    </Card>
  );
}
