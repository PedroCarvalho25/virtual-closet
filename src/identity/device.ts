import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { DeviceCredential } from './types';
const pending = new Map<string, Promise<DeviceCredential>>();
export function deviceLabel(): string {
  if (Platform.OS === 'ios') return 'Meu iPhone ou iPad';
  if (Platform.OS === 'android') return 'Meu Android';
  if (typeof navigator !== 'undefined') {
    if (/Edg\//.test(navigator.userAgent)) return 'Microsoft Edge';
    if (/Chrome\//.test(navigator.userAgent)) return 'Google Chrome';
    if (/Safari\//.test(navigator.userAgent)) return 'Safari';
    if (/Firefox\//.test(navigator.userAgent)) return 'Firefox';
  }
  return 'Meu navegador';
}
export async function deviceCredential(userId: string): Promise<DeviceCredential> {
  const existing = pending.get(userId);
  if (existing) return existing;
  const request = (async () => {
    const key = `virtual-closet-device-v1-${userId}`;
    const stored =
      Platform.OS === 'web' ? await AsyncStorage.getItem(key) : await SecureStore.getItemAsync(key);
    if (stored) {
      try {
        const value = JSON.parse(stored) as DeviceCredential;
        if (/^[0-9a-f-]{36}$/.test(value.id) && /^[0-9a-f]{64}$/.test(value.secret)) return value;
      } catch {
        /* A damaged credential requires another email verification. */
      }
    }
    const bytes = await Crypto.getRandomBytesAsync(32);
    const value = {
      id: Crypto.randomUUID(),
      secret: [...bytes].map((v) => v.toString(16).padStart(2, '0')).join(''),
    };
    if (Platform.OS === 'web') await AsyncStorage.setItem(key, JSON.stringify(value));
    else
      await SecureStore.setItemAsync(key, JSON.stringify(value), {
        keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });
    return value;
  })();
  pending.set(userId, request);
  try {
    return await request;
  } finally {
    pending.delete(userId);
  }
}
export async function forgetDeviceCredential(userId: string) {
  const key = `virtual-closet-device-v1-${userId}`;
  if (Platform.OS === 'web') await AsyncStorage.removeItem(key);
  else await SecureStore.deleteItemAsync(key);
}
