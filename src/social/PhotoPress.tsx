import { useEffect, useRef, useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { SoftPressable, MotionPop } from '@/components/motion';
import { Icon } from '@/components/ui';
import { usePreferences } from '@/settings/preferences';
export function PhotoPress({
  label,
  onOpen,
  onLike,
  children,
}: {
  label: string;
  onOpen: () => void;
  onLike: () => void;
  children: ReactNode;
}) {
  const enabled = usePreferences((s) => s.doubleTap);
  const pending = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hide = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [heart, setHeart] = useState(false);
  useEffect(
    () => () => {
      if (pending.current) clearTimeout(pending.current);
      if (hide.current) clearTimeout(hide.current);
    },
    [],
  );
  const press = () => {
    if (!enabled) {
      onOpen();
      return;
    }
    if (pending.current) {
      clearTimeout(pending.current);
      pending.current = null;
      onLike();
      setHeart(true);
      if (hide.current) clearTimeout(hide.current);
      hide.current = setTimeout(() => setHeart(false), 650);
    } else
      pending.current = setTimeout(() => {
        pending.current = null;
        onOpen();
      }, 280);
  };
  return (
    <SoftPressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={
        enabled ? 'Um toque abre. Dois toques rápidos curtem.' : 'Abre a publicação.'
      }
      onPress={press}
    >
      {children}
      {heart && (
        <View
          pointerEvents="none"
          style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' }}
        >
          <MotionPop trigger={heart}>
            <View style={{ backgroundColor: '#17613E', padding: 18, borderRadius: 48 }}>
              <Icon name="heart" color="#fff" size={36} />
            </View>
          </MotionPop>
        </View>
      )}
    </SoftPressable>
  );
}
