import AsyncStorage from '@react-native-async-storage/async-storage';
import { useStore } from 'zustand';
import { createClosetCache } from './cache-core';
export const closetCache = createClosetCache(AsyncStorage);
export function useClosetCache() {
  return useStore(closetCache.store);
}
