import { Platform, Text, View } from 'react-native';
import type { PropsWithChildren } from 'react';
import { Icon, Label, type IconName } from '@/components/ui';
import { useStudio } from './store';
import { MotionPop, SoftPressable } from '@/components/motion';
import Svg, { Path } from 'react-native-svg';

export function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View className="gap-1">
      <Text
        accessibilityRole="header"
        className="font-semibold text-[19px] tracking-[-0.4px] text-ink"
      >
        {title}
      </Text>
      {subtitle && <Label className="text-xs leading-5 text-muted">{subtitle}</Label>}
    </View>
  );
}
export function Tag({ children, dark = false }: PropsWithChildren<{ dark?: boolean }>) {
  return (
    <View className={`self-start rounded-full px-3 py-1.5 ${dark ? 'bg-accent' : 'bg-lemon'}`}>
      <Text className={`font-medium text-[10px] ${dark ? 'text-white' : 'text-accent'}`}>
        {children}
      </Text>
    </View>
  );
}
export function Favorite({ id, kind = 'item' }: { id: string; kind?: 'item' | 'outfit' }) {
  const { data, act, busy } = useStudio();
  const active =
    (kind === 'item' ? data?.favorite_items : data?.favorite_outfits)?.includes(id) || false;
  if (!data) return null;
  return (
    <SoftPressable
      accessibilityRole="button"
      accessibilityLabel={`${active ? 'Desfavoritar' : 'Favoritar'} ${kind === 'item' ? 'peça' : 'combinação'}`}
      accessibilityState={{ selected: active, disabled: busy }}
      disabled={busy || !data}
      onPress={(event) => {
        event.stopPropagation();
        void act({ action: kind === 'item' ? 'favorite_item' : 'favorite_outfit', id }).then(
          (ok) => {
            if (ok && Platform.OS !== 'web' && data.evolution?.profile.haptics)
              void import('expo-haptics').then((api) => api.selectionAsync()).catch(() => {});
          },
        );
      }}
      className={`h-11 w-11 items-center justify-center rounded-full ${active ? 'bg-lemon' : 'bg-paper'}`}
    >
      <MotionPop trigger={active}>
        <Svg width={20} height={20} viewBox="0 0 24 24" aria-hidden>
          <Path
            d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"
            fill={active ? '#17613E' : 'none'}
            stroke={active ? '#17613E' : '#73786C'}
            strokeWidth={1.7}
            strokeLinejoin="round"
          />
        </Svg>
      </MotionPop>
    </SoftPressable>
  );
}
export function QuickLink({
  title,
  detail,
  icon,
  onPress,
}: {
  title: string;
  detail: string;
  icon: IconName;
  onPress: () => void;
}) {
  return (
    <SoftPressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      className="min-w-0 flex-1 gap-3 rounded-[22px] bg-paper p-4 active:opacity-80"
    >
      <Icon name={icon} size={22} color="#17613E" />
      <View className="gap-1">
        <Text className="font-semibold text-[13px] text-ink">{title}</Text>
        <Label className="text-[11px] leading-4 text-muted">{detail}</Label>
      </View>
    </SoftPressable>
  );
}
