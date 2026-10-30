import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import type { PickedPhoto } from './photos';
import type { ItemInput } from '@/types/domain';
export type CaptureQueue = { photos: PickedPhoto[]; index: number; defaults?: Partial<ItemInput> };
const empty = (): CaptureQueue => ({ photos: [], index: 0 });
async function webDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('virtual-closet-private-capture', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('queues');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
async function webQueue(owner: string, value?: CaptureQueue | null) {
  const db = await webDatabase();
  try {
    return await new Promise<CaptureQueue>((resolve, reject) => {
      const tx = db.transaction('queues', value === undefined ? 'readonly' : 'readwrite');
      const table = tx.objectStore('queues');
      const request =
        value === undefined
          ? table.get(owner)
          : value === null
            ? table.delete(owner)
            : table.put(value, owner);
      tx.oncomplete = () =>
        resolve(value === undefined ? request.result || empty() : value || empty());
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}
const folder = (owner: string) => `${FileSystem.documentDirectory}capture-${owner}/`;
export async function readCapture(owner: string): Promise<CaptureQueue> {
  if (Platform.OS === 'web') {
    const q = await webQueue(owner);
    return {
      ...q,
      photos: q.photos.map((p) => ({ ...p, uri: `data:image/jpeg;base64,${p.base64}` })),
    };
  }
  const meta = await AsyncStorage.getItem(`vc-capture:${owner}`);
  if (!meta) return empty();
  const q = JSON.parse(meta) as { count: number; index: number; defaults?: Partial<ItemInput> };
  const photos: PickedPhoto[] = [];
  for (let i = 0; i < q.count; i++) {
    const uri = `${folder(owner)}${i}.jpg`;
    photos.push({
      uri,
      base64: await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 }),
    });
  }
  return { photos, index: q.index, defaults: q.defaults };
}
export async function writeCapture(owner: string, queue: CaptureQueue) {
  if (Platform.OS === 'web') {
    await webQueue(owner, queue);
    return;
  }
  await FileSystem.makeDirectoryAsync(folder(owner), { intermediates: true });
  for (let i = 0; i < queue.photos.length; i++) {
    const uri = `${folder(owner)}${i}.jpg`;
    await FileSystem.writeAsStringAsync(uri, queue.photos[i]!.base64, {
      encoding: FileSystem.EncodingType.Base64,
    });
  }
  await AsyncStorage.setItem(
    `vc-capture:${owner}`,
    JSON.stringify({ count: queue.photos.length, index: queue.index, defaults: queue.defaults }),
  );
}
export async function clearCapture(owner: string) {
  if (Platform.OS === 'web') await webQueue(owner, null);
  else {
    await FileSystem.deleteAsync(folder(owner), { idempotent: true });
    await AsyncStorage.removeItem(`vc-capture:${owner}`);
  }
}
