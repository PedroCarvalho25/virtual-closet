import { useState } from 'react';
import type { ComponentProps, PropsWithChildren, ReactNode } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  type ColorValue,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';
import { router } from 'expo-router';
import { SoftPressable } from './motion';
import { Avatar } from '@/identity/ProfileAvatar';
import { useIdentity } from '@/identity/store';
import { useAuth } from '@/stores/auth';
import palette from '@/design/palette.json';
import { useTheme } from '@/settings/Theme';

export const colors = palette;
export type IconName = ComponentProps<typeof Feather>['name'];
export function Icon({
  name,
  size = 22,
  color,
}: {
  name: IconName;
  size?: number;
  color?: ColorValue;
}) {
  const theme = useTheme();
  return <Feather name={name} size={size} color={color === palette.accent ? theme.accent : color === palette.muted ? theme.muted : color || theme.ink} />;
}
export function Label({ children, className = '' }: PropsWithChildren<{ className?: string }>) {
  const hasSize = /\btext-(?:xs|sm|base|lg|xl|[2-9]xl|\[\d)/.test(className);
  return (
    <Text className={`font-sans ${hasSize ? '' : 'text-base'} text-ink ${className}`}>
      {children}
    </Text>
  );
}
export function Eyebrow({ children }: PropsWithChildren) {
  return <Text className="font-medium text-[11px] text-muted">{children}</Text>;
}
export function Brand() {
  const theme = useTheme();
  return (
    <View className="flex-row items-center gap-2.5">
      <View className="h-9 w-9 items-center justify-center rounded-xl bg-accent">
        <Icon name="layers" size={20} color={theme.onAccent} />
      </View>
      <Text className="font-display text-[20px] tracking-[-0.9px] text-ink">
        virtual closet<Text style={{ color: theme.accent }}>.</Text>
      </Text>
    </View>
  );
}
export function Button({
  title,
  onPress,
  icon,
  secondary = false,
  busy = false,
  disabled = false,
  small = false,
}: {
  title: string;
  onPress: () => void;
  icon?: IconName;
  secondary?: boolean;
  busy?: boolean;
  disabled?: boolean;
  small?: boolean;
}) {
  const theme = useTheme();
  return (
    <SoftPressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: disabled || busy, busy }}
      onPress={onPress}
      disabled={disabled || busy}
      className={`flex-row items-center justify-center gap-2 rounded-2xl ${small ? 'px-4 py-3' : 'px-5 py-4'} ${secondary ? 'border border-line bg-paper' : 'bg-accent'} ${disabled || busy ? 'opacity-45' : 'active:opacity-75'}`}
      style={{ minHeight: 48 }}
    >
      {busy ? (
        <ActivityIndicator size="small" color={secondary ? theme.accent : theme.onAccent} />
      ) : icon ? (
        <Icon name={icon} size={18} color={secondary ? theme.accent : theme.onAccent} />
      ) : null}
      <Text
        style={{ flexShrink: 1, textAlign: 'center' }}
        className={`font-bold text-[14px] ${secondary ? 'text-ink' : 'text-onAccent'}`}
      >
        {busy ? 'Aguarde…' : title}
      </Text>
    </SoftPressable>
  );
}
export function IconButton({
  icon,
  label,
  onPress,
  disabled = false,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <SoftPressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      className={`h-11 w-11 items-center justify-center rounded-full ${disabled ? 'opacity-35' : 'active:bg-sage'}`}
    >
      <Icon name={icon} size={21} />
    </SoftPressable>
  );
}
export function Chip({
  label,
  selected,
  onPress,
  disabled = false,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <SoftPressable
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      {...(Platform.OS === 'web' ? { 'aria-pressed': selected } : {})}
      onPress={onPress}
      className={`min-h-11 items-center justify-center rounded-full px-4 py-2 ${selected ? 'bg-lemon' : 'bg-paper'}`}
    >
      <Text
        className={`text-[12px] ${selected ? 'font-semibold text-ink' : 'font-medium text-muted'}`}
      >
        {label}
      </Text>
    </SoftPressable>
  );
}
export function Field({
  label,
  error,
  onFocus,
  onBlur,
  ...props
}: ComponentProps<typeof TextInput> & { label: string; error?: string }) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <View className="gap-2">
      <Text className="font-medium text-xs text-ink">{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={theme.muted}
        className={`min-h-14 rounded-2xl border bg-paper px-4 py-3 font-sans text-base text-ink ${error ? 'border-[#A85035]' : focused ? 'border-accent' : 'border-line'}`}
        selectionColor={colors.accent}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
        {...props}
      />
      {error && <Label className="text-xs text-[#A85035]">{error}</Label>}
    </View>
  );
}
export function Notice({
  message,
  kind = 'error',
  action,
}: {
  message: string | null | undefined;
  kind?: 'error' | 'info' | 'success';
  action?: () => void;
}) {
  if (!message) return null;
  return (
    <View
      accessibilityLiveRegion="polite"
      className={`flex-row items-start gap-3 rounded-2xl p-4 ${kind === 'success' ? 'bg-sage' : kind === 'info' ? 'bg-[#F0F0EA]' : 'bg-blush'}`}
    >
      <Icon
        name={kind === 'error' ? 'alert-circle' : kind === 'success' ? 'check-circle' : 'info'}
        size={17}
        color={kind === 'error' ? '#A85035' : colors.accent}
      />
      <View className="flex-1 gap-2">
        <Label className="text-xs leading-5">{message}</Label>
        {action && (
          <Pressable
            onPress={action}
            accessibilityRole="button"
            className="min-h-11 justify-center"
          >
            <Text className="font-semibold text-xs text-accent">Tentar novamente</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}
export function Empty({
  title,
  description,
  icon = 'grid',
  action,
}: {
  title: string;
  description: string;
  icon?: IconName;
  action?: ReactNode;
}) {
  return (
    <View className="items-center gap-4 px-6 py-12">
      <View className="h-16 w-16 items-center justify-center rounded-[22px] bg-sage">
        <Icon name={icon} size={25} color={colors.accent} />
      </View>
      <Text className="text-center font-bold text-[24px] leading-7 tracking-[-0.5px] text-ink">
        {title}
      </Text>
      <Label className="max-w-[290px] text-center text-[13px] leading-6 text-muted">
        {description}
      </Label>
      {action}
    </View>
  );
}
export function Loading() {
  return (
    <View className="items-center gap-3 py-12">
      <ActivityIndicator color={colors.accent} />
      <Label className="text-xs text-muted">Carregando…</Label>
    </View>
  );
}
export function Page({ children, scroll = true }: PropsWithChildren<{ scroll?: boolean }>) {
  return (
    <SafeAreaView edges={['top', 'left', 'right']} className="flex-1 bg-canvas">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        {scroll ? (
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 36, gap: 20 }}
          >
            {children}
          </ScrollView>
        ) : (
          children
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
export function TopBar({
  back = false,
  title,
  right,
}: {
  back?: boolean;
  title?: string;
  right?: ReactNode;
}) {
  const owner = useAuth((state) => state.session?.user.id);
  const profile = useIdentity((state) =>
    state.status === 'verified' && state.owner === owner && state.account?.profile?.id === owner
      ? state.account.profile
      : null,
  );
  return (
    <View className="min-h-16 flex-row items-center justify-between gap-3">
      <View className="flex-1 flex-row items-center gap-2">
        {back ? (
          <>
            <IconButton
              icon="arrow-left"
              label="Voltar"
              onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
            />
            <Text numberOfLines={1} className="flex-1 font-bold text-base text-ink">
              {title}
            </Text>
          </>
        ) : (
          <Brand />
        )}
      </View>
      {right}
      {!back && (
        <SoftPressable
          accessibilityRole="button"
          accessibilityLabel="Minha conta"
          onPress={() => router.push('/account')}
          className="h-12 w-12 items-center justify-center rounded-[18px] bg-lemon"
        >
          {profile ? (
            <Avatar
              path={profile.avatarPath}
              name={`${profile.firstName} ${profile.lastName}`}
              tone={profile.tone}
              size={44}
            />
          ) : (
            <Icon name="user" size={23} color={colors.accent} />
          )}
        </SoftPressable>
      )}
    </View>
  );
}
export function PageTitle({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
}) {
  return (
    <View className="gap-2">
      <View className="flex-row items-center justify-between gap-3">
        <Text
          accessibilityRole="header"
          className="flex-1 font-display text-[32px] leading-[38px] tracking-[-1px] text-ink"
        >
          {title}
        </Text>
        {right}
      </View>
      {subtitle && <Label className="text-[13px] leading-5 text-muted">{subtitle}</Label>}
    </View>
  );
}
