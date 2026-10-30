import { createContext, useContext, type PropsWithChildren } from 'react';
import { View, useColorScheme } from 'react-native';
import { vars } from 'nativewind';
import { StatusBar } from 'expo-status-bar';
import palette from '@/design/palette.json';
import { usePreferences } from './preferences';

const light = { ...palette, onAccent: '#FFFFFF', outer: '#ECEEE6' };
const dark: typeof light = {
  canvas: '#191F1B',
  paper: '#252E27',
  ink: '#F5EDD9',
  muted: '#B8C6B2',
  accent: '#98D9AD',
  onAccent: '#183521',
  line: '#4C5A4F',
  sage: '#293B2D',
  blush: '#493328',
  lemon: '#3B4D20',
  coral: '#824A36',
  outer: '#101612',
};
const ThemeContext = createContext(light);
export const useTheme = () => useContext(ThemeContext);
const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(' ');
export function ThemeProvider({ children }: PropsWithChildren) {
  const os = useColorScheme();
  const preferences = usePreferences();
  const night = preferences.theme === 'dark' || (preferences.theme === 'system' && os === 'dark');
  const colors = { ...(night ? dark : light) };
  if (preferences.contrast) {
    colors.muted = night ? '#E2EADA' : '#35432F';
    colors.line = night ? '#9BAF9D' : '#77836E';
  }
  const variables = vars({
    ...Object.fromEntries(
      Object.entries(colors).map(([key, color]) => [`--vc-${key}`, rgb(color)]),
    ),
    '--vc-small': preferences.largeText ? '14px' : '12px',
    '--vc-base': preferences.largeText ? '19px' : '16px',
  });
  return (
    <ThemeContext.Provider value={colors}>
      <StatusBar style={night ? 'light' : 'dark'} />
      <View style={[{ flex: 1, backgroundColor: colors.outer, alignItems: 'center' }, variables]}>
        <View style={{ flex: 1, width: '100%', maxWidth: 640 }}>{children}</View>
      </View>
    </ThemeContext.Provider>
  );
}
