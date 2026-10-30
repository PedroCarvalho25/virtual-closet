import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type PropsWithChildren,
} from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Platform,
  Pressable,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { cssInterop } from 'nativewind';
import { usePreferences } from '@/settings/preferences';

// One preference listener for the app. No perpetual animations or extra dependency.
const MotionContext = createContext(true);
export function MotionProvider({ children }: PropsWithChildren) {
  const appReduced = usePreferences((s) => s.reduceMotion);
  const [reduced, setReduced] = useState(() =>
    Platform.OS === 'web' && typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : true,
  );
  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const query = window.matchMedia('(prefers-reduced-motion: reduce)');
      const change = () => setReduced(query.matches);
      change();
      query.addEventListener('change', change);
      return () => query.removeEventListener('change', change);
    }
    let alive = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (alive) setReduced(value);
    });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => {
      alive = false;
      subscription.remove();
    };
  }, []);
  return <MotionContext.Provider value={reduced || appReduced}>{children}</MotionContext.Provider>;
}
export const useReducedMotion = () => useContext(MotionContext);
const nativeDriver = Platform.OS !== 'web';
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
cssInterop(AnimatedPressable, { className: 'style' });
type SoftProps = Omit<ComponentProps<typeof Pressable>, 'style'> & { style?: StyleProp<ViewStyle> };
export function SoftPressable({ onPressIn, onPressOut, style, ...props }: SoftProps) {
  const reduced = useReducedMotion();
  const [scale] = useState(() => new Animated.Value(1));
  useEffect(() => {
    if (reduced) {
      scale.stopAnimation();
      scale.setValue(1);
    }
    return () => scale.stopAnimation();
  }, [reduced, scale]);
  const move = (value: number) => {
    scale.stopAnimation();
    if (reduced) scale.setValue(1);
    else
      Animated.timing(scale, {
        toValue: value,
        duration: value === 1 ? 180 : 90,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: nativeDriver,
        isInteraction: false,
      }).start();
  };
  return (
    <AnimatedPressable
      {...props}
      style={[style, { transform: [{ scale }] }]}
      onPressIn={(event) => {
        move(0.975);
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        move(1);
        onPressOut?.(event);
      }}
    />
  );
}
export function MotionReveal({
  children,
  trigger,
  style,
  fade = true,
}: PropsWithChildren<{
  trigger?: string | number | boolean;
  style?: StyleProp<ViewStyle>;
  fade?: boolean;
}>) {
  const reduced = useReducedMotion();
  const [progress] = useState(() => new Animated.Value(1));
  useEffect(() => {
    progress.stopAnimation();
    if (reduced) progress.setValue(1);
    else {
      progress.setValue(0);
      Animated.timing(progress, {
        toValue: 1,
        duration: 200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: nativeDriver,
        isInteraction: false,
      }).start();
    }
    return () => progress.stopAnimation();
  }, [trigger, reduced, progress]);
  return (
    <Animated.View
      style={[
        style,
        {
          opacity: fade ? progress : 1,
          transform: [
            { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [5, 0] }) },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}
export function MotionPop({ children, trigger }: PropsWithChildren<{ trigger: boolean }>) {
  const reduced = useReducedMotion();
  const [scale] = useState(() => new Animated.Value(1));
  const previous = useRef(trigger);
  useEffect(() => {
    scale.stopAnimation();
    if (reduced || previous.current === trigger) scale.setValue(1);
    else
      Animated.sequence([
        Animated.timing(scale, {
          toValue: trigger ? 1.16 : 0.92,
          duration: 110,
          useNativeDriver: nativeDriver,
          isInteraction: false,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 170,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: nativeDriver,
          isInteraction: false,
        }),
      ]).start();
    previous.current = trigger;
    return () => scale.stopAnimation();
  }, [trigger, reduced, scale]);
  return <Animated.View style={{ transform: [{ scale }] }}>{children}</Animated.View>;
}

// A short highlight accompanies a changed composition. Photos stay fully
// opaque; the light pass never loops or intercepts touches.
export function LookReveal({ children, trigger }: PropsWithChildren<{ trigger: string }>) {
  const reduced = useReducedMotion();
  const previous = useRef(trigger);
  const [width, setWidth] = useState(350);
  const [progress] = useState(() => new Animated.Value(1));
  useEffect(() => {
    progress.stopAnimation();
    if (reduced || previous.current === trigger) progress.setValue(1);
    else {
      progress.setValue(0);
      Animated.timing(progress, {
        toValue: 1,
        duration: 420,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: nativeDriver,
        isInteraction: false,
      }).start();
    }
    previous.current = trigger;
    return () => progress.stopAnimation();
  }, [trigger, reduced, progress]);
  return (
    <View
      testID="look-reveal"
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      style={{ flex: 1, overflow: 'hidden', borderRadius: 22 }}
    >
      <Animated.View
        style={{
          flex: 1,
          transform: [
            {
              scale: progress.interpolate({
                inputRange: [0, 0.7, 1],
                outputRange: [0.985, 1.006, 1],
              }),
            },
          ],
        }}
      >
        {children}
      </Animated.View>
      {!reduced && (
        <Animated.View
          testID="look-light-pass"
          pointerEvents="none"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={{
            position: 'absolute',
            left: 0,
            top: -80,
            bottom: -80,
            width: 75,
            backgroundColor: '#FFFFFF',
            opacity: progress.interpolate({
              inputRange: [0, 0.25, 0.65, 1],
              outputRange: [0, 0.2, 0.12, 0],
            }),
            transform: [
              {
                translateX: progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-120, width + 100],
                }),
              },
              { rotate: '18deg' },
            ],
          }}
        />
      )}
    </View>
  );
}
export function Progress({ value, label }: { value: number; label: string }) {
  const target = Math.max(0, Math.min(1, value));
  const reduced = useReducedMotion();
  const [progress] = useState(() => new Animated.Value(target));
  useEffect(() => {
    progress.stopAnimation();
    if (reduced) progress.setValue(target);
    else
      Animated.timing(progress, {
        toValue: target,
        duration: 320,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: nativeDriver,
        isInteraction: false,
      }).start();
    return () => progress.stopAnimation();
  }, [target, reduced, progress]);
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(target * 100) }}
      style={{ height: 6, backgroundColor: '#FFFFFF', borderRadius: 3, overflow: 'hidden' }}
    >
      <Animated.View
        style={{
          height: '100%',
          width: '100%',
          backgroundColor: '#17613E',
          borderRadius: 3,
          transformOrigin: 'left center',
          transform: [{ scaleX: progress }],
        }}
      />
    </View>
  );
}
