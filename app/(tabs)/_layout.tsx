import { useTheme } from '@/settings/Theme';
import { View, useWindowDimensions } from 'react-native';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, type IconName } from '@/components/ui';
import { MotionPop, useReducedMotion } from '@/components/motion';
function TabIcon({ name, focused }: { name: IconName; focused: boolean }) {
  const colors = useTheme();
  return (
    <View
      className={`h-8 w-14 items-center justify-center rounded-full ${focused ? 'bg-lemon' : ''}`}
    >
      <MotionPop trigger={focused}>
        <Icon name={name} size={20} color={focused ? colors.accent : colors.muted} />
      </MotionPop>
    </View>
  );
}
export default function TabLayout() {
  const colors = useTheme();
  const insets = useSafeAreaInsets();
  const compact = useWindowDimensions().width < 430;
  const reducedMotion = useReducedMotion();
  return (
    <Tabs
      initialRouteName="discover"
      screenOptions={{
        headerShown: false,
        animation: reducedMotion ? 'none' : 'fade',
        transitionSpec: { animation: 'timing', config: { duration: reducedMotion ? 0 : 160 } },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.canvas,
          borderTopColor: colors.line,
          paddingTop: 8,
          height: 66 + Math.max(insets.bottom, 8),
          paddingBottom: Math.max(insets.bottom, 8),
        },
        tabBarLabelStyle: {
          fontFamily: 'DMSans_700Bold',
          fontSize: 10,
          marginTop: 2,
        },
        sceneStyle: { backgroundColor: colors.canvas },
      }}
    >
      <Tabs.Screen name="index" options={{ href: null }} />
      <Tabs.Screen
        name="discover"
        options={{
          title: 'Início',
          href: '/discover',
          tabBarIcon: ({ focused }) => <TabIcon name="sun" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="wardrobe"
        options={{
          title: 'Guarda-roupa',
          tabBarLabel: compact ? 'Closet' : 'Guarda-roupa',
          tabBarAccessibilityLabel: 'Meu guarda-roupa',
          tabBarIcon: ({ focused }) => <TabIcon name="grid" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="outfits"
        options={{
          title: 'Combinações',
          tabBarLabel: compact ? 'Looks' : 'Combinações',
          tabBarAccessibilityLabel: 'Minhas combinações',
          tabBarIcon: ({ focused }) => <TabIcon name="layers" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'Calendário',
          tabBarIcon: ({ focused }) => <TabIcon name="calendar" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="feed"
        options={{
          title: 'Meu feed',
          tabBarIcon: ({ focused }) => <TabIcon name="bookmark" focused={focused} />,
        }}
      />
    </Tabs>
  );
}
