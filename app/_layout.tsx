import { PwaRegistration } from '@/settings/Pwa';
import { ThemeProvider, useTheme } from '@/settings/Theme';
import '../global.css';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { Stack, type ErrorBoundaryProps } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { DMSans_400Regular } from '@expo-google-fonts/dm-sans/400Regular';
import { DMSans_500Medium } from '@expo-google-fonts/dm-sans/500Medium';
import { DMSans_600SemiBold } from '@expo-google-fonts/dm-sans/600SemiBold';
import { DMSans_700Bold } from '@expo-google-fonts/dm-sans/700Bold';
import { DMSans_800ExtraBold } from '@expo-google-fonts/dm-sans/800ExtraBold';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SessionProvider } from '@/components/SessionProvider';
import { useAuth } from '@/stores/auth';
import { isConfigured } from '@/lib/supabase';
import { Button, Empty, Loading, Page } from '@/components/ui';
import { useStudio } from '@/preview/store';
import { MotionProvider, useReducedMotion } from '@/components/motion';
import { cancelLocalReminders } from '@/lib/local-reminders';
import { useIdentity } from '@/identity/store';
import { clearAvatarCache } from '@/identity/avatar';
import { signOutOnDevice } from '@/lib/auth-session';
import { ProfileLink } from '@/identity/ProfileLink';

void SplashScreen.preventAutoHideAsync();
function Navigation() {
  const colors = useTheme();
  const reducedMotion = useReducedMotion();
  const { session, ready, online } = useAuth();
  const identity = useIdentity();
  const recognized = identity.status === 'verified' && identity.owner === session?.user.id;
  const complete = recognized && !!identity.account?.profile;
  useEffect(() => {
    useIdentity.getState().clear();
    clearAvatarCache();
  }, [session?.user.id]);
  useEffect(() => {
    if (useAuth.getState().session && online) void useIdentity.getState().check();
  }, [session?.access_token, online]);
  useEffect(() => {
    const listener = AppState.addEventListener('change', (state) => {
      if (state === 'active' && useAuth.getState().session && useAuth.getState().online)
        void useIdentity.getState().check();
    });
    return () => listener.remove();
  }, []);
  useEffect(() => {
    useStudio.getState().clear();
    if (session?.user.id && complete) void useStudio.getState().load();
    else useStudio.getState().clear();
    const owner = session?.user.id;
    return () => {
      if (owner) void cancelLocalReminders(owner).catch(() => {});
    };
  }, [session?.user.id, complete]);
  if (!ready)
    return (
      <Page>
        <Loading />
      </Page>
    );
  if (session && ['idle', 'checking', 'error'].includes(identity.status))
    return (
      <Page>
        <Empty
          title={
            identity.status === 'error'
              ? 'Vamos confirmar seu acesso?'
              : online
                ? 'Reconhecendo este aparelho.'
                : 'Conecte-se para abrir seu closet.'
          }
          description={
            identity.error ||
            (online
              ? 'Um instante para cuidar do seu acesso.'
              : 'Precisamos de uma conexão para conferir este aparelho com segurança.')
          }
          icon="shield"
          action={
            identity.status === 'error' ? (
              <Button
                title="Tentar novamente"
                onPress={() => void identity.check()}
                disabled={!online}
              />
            ) : online ? (
              <Loading />
            ) : undefined
          }
        />
        <Button
          title="Sair da minha conta"
          secondary
          onPress={() => void signOutOnDevice().catch(() => {})}
        />
      </Page>
    );
  return (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.canvas },
          animation: reducedMotion ? 'none' : 'slide_from_right',
          animationDuration: 220,
        }}
      >
        <Stack.Protected guard={!isConfigured}>
          <Stack.Screen name="setup" />
        </Stack.Protected>
        <Stack.Protected guard={isConfigured && !session}>
          <Stack.Screen name="login" />
          <Stack.Screen name="recover" />
        </Stack.Protected>
        <Stack.Protected guard={isConfigured && !!session && identity.status === 'challenge'}>
          <Stack.Screen name="verify-device" />
        </Stack.Protected>
        <Stack.Protected guard={isConfigured && !!session && recognized && !complete}>
          <Stack.Screen name="complete-profile" />
        </Stack.Protected>
        <Stack.Protected guard={isConfigured && !!session && complete}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="item/new" />
          <Stack.Screen name="item/[id]" />
          <Stack.Screen name="item/edit/[id]" />
          <Stack.Screen name="outfit/new" />
          <Stack.Screen name="outfit/[id]" />
          <Stack.Screen name="account" />
          <Stack.Screen name="account-demo" />
          <Stack.Screen name="settings" />
          <Stack.Screen name="account-data" />
          <Stack.Screen name="atelier" />
          <Stack.Screen name="wishes" />
          <Stack.Screen name="wish/[id]" />
          <Stack.Screen name="try-on" />
          <Stack.Screen name="collections" />
          <Stack.Screen name="collection/[id]" />
          <Stack.Screen name="outfit/editor" />
          <Stack.Screen name="insights" />
          <Stack.Screen name="style" />
          <Stack.Screen name="people" />
          <Stack.Screen name="mural" />
          <Stack.Screen name="publication/[id]" />
          <Stack.Screen name="publication/new" />
          <Stack.Screen name="mural-inbox" />
          <Stack.Screen name="u/[username]" />
        </Stack.Protected>
      </Stack>
    </>
  );
}
export default function RootLayout() {
  const [loaded, fontError] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
    DMSans_800ExtraBold,
  });
  useEffect(() => {
    if (loaded || fontError) void SplashScreen.hideAsync();
  }, [loaded, fontError]);
  if (!loaded && !fontError) return null;
  return (
    <MotionProvider>
      <SafeAreaProvider>
        <ThemeProvider>
          <SessionProvider>
            <PwaRegistration />
            <Navigation />
            <ProfileLink />
          </SessionProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </MotionProvider>
  );
}
export function ErrorBoundary({ retry }: ErrorBoundaryProps) {
  return (
    <SafeAreaProvider>
      <Page>
        <Empty
          title="Vamos tentar de novo?"
          description="Não foi possível abrir esta tela. Seus dados salvos continuam na sua conta."
          icon="refresh-cw"
          action={<Button title="Reabrir tela" onPress={retry} />}
        />
      </Page>
    </SafeAreaProvider>
  );
}
