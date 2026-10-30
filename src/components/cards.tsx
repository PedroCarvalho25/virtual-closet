import { Text, View } from 'react-native';
import { router } from 'expo-router';
import type { Outfit, WardrobeItem, Category } from '@/types/domain';
import { Photo } from './Photo';
import { Icon, Label } from './ui';
import { SoftPressable } from './motion';
import { Favorite } from '@/preview/components';

const proportions: Partial<Record<Category, number>> = {
  calca: 0.69,
  camisa: 0.76,
  camiseta: 0.86,
  colete: 0.78,
  tenis: 1.03,
  bone_aba_reta: 1,
  bone_aba_curta: 1,
  regata: 0.88,
};
export function ItemCard({
  item,
  selected,
  onPress,
}: {
  item: WardrobeItem;
  selected?: boolean;
  onPress?: () => void;
}) {
  return (
    <SoftPressable
      accessibilityRole="button"
      accessibilityLabel={`${item.name}, ${item.color}, tamanho ${item.size}${item.archived_at ? ', arquivada' : ''}`}
      accessibilityState={selected === undefined ? undefined : { selected }}
      onPress={onPress || (() => router.push(`/item/${item.id}`))}
      className="gap-2 pb-5 active:opacity-80"
    >
      <View
        className={`overflow-hidden rounded-[20px] ${selected ? 'border-2 border-accent' : ''}`}
        style={{ aspectRatio: proportions[item.category] || 0.86 }}
      >
        <Photo path={item.photo_path} label={item.name} category={item.category} />
        {selected === undefined && (
          <View className="absolute right-2 top-2">
            <Favorite id={item.id} />
          </View>
        )}
        {item.archived_at && (
          <View className="absolute bottom-2 left-2 rounded-full bg-paper px-2.5 py-1">
            <Text className="font-medium text-[10px] text-muted">Arquivada</Text>
          </View>
        )}
        {selected !== undefined && (
          <View
            className={`absolute right-2.5 top-2.5 h-7 w-7 items-center justify-center rounded-full ${selected ? 'bg-accent' : 'border border-line bg-paper'}`}
          >
            {selected && <Icon name="check" size={16} color="#fff" />}
          </View>
        )}
      </View>
      <View className="gap-1 px-0.5">
        <Text numberOfLines={2} className="font-semibold text-[12px] leading-[17px] text-ink">
          {item.name}
        </Text>
        <Label className="text-[11px] text-muted">
          {item.color} · {item.size}
        </Label>
      </View>
    </SoftPressable>
  );
}
export function OutfitArtwork({ outfit }: { outfit: Pick<Outfit, 'photo_path' | 'items'> }) {
  if (outfit.photo_path) return <Photo path={outfit.photo_path} label="Foto do outfit" />;
  const items = outfit.items.slice(0, 4);
  const columns =
    items.length <= 2
      ? items.map((item) => [item])
      : items.length === 3
        ? [[items[0]!], [items[1]!, items[2]!]]
        : [
            [items[0]!, items[2]!],
            [items[1]!, items[3]!],
          ];
  return (
    <View className="flex-1 flex-row gap-1.5 bg-[#EEEFE7] p-2">
      {columns.map((column, index) => (
        <View key={index} className="min-w-0 flex-1 gap-1.5">
          {column.map((item) => (
            <View key={item.id} className="min-h-0 flex-1 overflow-hidden rounded-xl">
              <Photo path={item.photo_path} label={item.name} category={item.category} />
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}
export function OutfitCard({
  outfit,
  onPress,
  compact = false,
}: {
  outfit: Outfit;
  onPress?: () => void;
  compact?: boolean;
}) {
  return (
    <SoftPressable
      accessibilityRole="button"
      accessibilityLabel={outfit.name || 'Outfit sem nome'}
      onPress={onPress || (() => router.push(`/outfit/${outfit.id}`))}
      className="mb-5 gap-3 active:opacity-80"
    >
      <View
        className="overflow-hidden rounded-[22px]"
        style={{ aspectRatio: compact ? 0.75 : 1.2 }}
      >
        <OutfitArtwork outfit={outfit} />
        {
          <View className="absolute right-2 top-2">
            <Favorite id={outfit.id} kind="outfit" />
          </View>
        }
        <View className="absolute bottom-3 right-3 rounded-full bg-paper px-3 py-1.5">
          <Text className="font-medium text-[10px] text-ink">{outfit.items.length} peças</Text>
        </View>
      </View>
      <View className="flex-row items-center justify-between gap-2 px-1">
        <Text
          numberOfLines={2}
          className={`flex-1 font-semibold text-ink ${compact ? 'text-[13px]' : 'text-base'}`}
        >
          {outfit.name || 'Uma boa combinação'}
        </Text>
        {!compact && <Icon name="arrow-up-right" size={18} />}
      </View>
    </SoftPressable>
  );
}
