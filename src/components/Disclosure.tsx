import { useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { SoftPressable } from './motion';
import { Icon, Label } from './ui';
export function Disclosure({
  title,
  children,
  initial = false,
}: {
  title: string;
  children: ReactNode;
  initial?: boolean;
}) {
  const [open, setOpen] = useState(initial);
  return (
    <View className="gap-3">
      <SoftPressable
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen(!open)}
        className="min-h-12 flex-row items-center justify-between gap-3 border-b border-line py-2"
      >
        <Label className="flex-1 font-semibold text-sm">{title}</Label>
        <Icon name={open ? 'chevron-up' : 'chevron-down'} size={18} />
      </SoftPressable>
      {open && <View className="gap-3 pb-2">{children}</View>}
    </View>
  );
}
