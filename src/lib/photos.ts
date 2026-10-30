import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as Crypto from 'expo-crypto';
import { decode } from 'base64-arraybuffer';
import { client } from './supabase';
export const PHOTO_BUCKET = 'closet-photos';
export type PickedPhoto = { uri: string; base64: string };
export async function pickPhoto(camera: boolean): Promise<PickedPhoto | null> {
  const permission = camera
    ? await ImagePicker.requestCameraPermissionsAsync()
    : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted)
    throw new Error(
      `Permita acesso ${camera ? 'à câmera' : 'às fotos'} nos Ajustes do iPhone para continuar.`,
    );
  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ['images'],
    quality: 1,
    allowsEditing: false,
  };
  const result = camera
    ? await ImagePicker.launchCameraAsync(options)
    : await ImagePicker.launchImageLibraryAsync(options);
  if (result.canceled || !result.assets[0]) return null;
  return preparePhoto(result.assets[0]);
}
export async function pickPhotoBatch(): Promise<PickedPhoto[]> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) throw new Error('Permita acesso às fotos para escolher suas peças.');
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: true,
    selectionLimit: 10,
    orderedSelection: true,
    quality: 1,
  });
  if (result.canceled) return [];
  const photos: PickedPhoto[] = [];
  for (const asset of result.assets.slice(0, 10)) photos.push(await preparePhoto(asset));
  return photos;
}
async function preparePhoto(asset: ImagePicker.ImagePickerAsset): Promise<PickedPhoto> {
  const actions =
    Math.max(asset.width, asset.height) > 1400
      ? [{ resize: asset.width >= asset.height ? { width: 1400 } : { height: 1400 } }]
      : [];
  let photo = await manipulateAsync(asset.uri, actions, {
    compress: 0.78,
    format: SaveFormat.JPEG,
    base64: true,
  });
  if (!photo.base64) throw new Error('Não foi possível preparar essa foto. Tente outra imagem.');
  if (decode(photo.base64).byteLength > 2 * 1024 * 1024)
    photo = await manipulateAsync(
      photo.uri,
      [{ resize: photo.width >= photo.height ? { width: 1100 } : { height: 1100 } }],
      { compress: 0.6, format: SaveFormat.JPEG, base64: true },
    );
  if (!photo.base64 || decode(photo.base64).byteLength > 2 * 1024 * 1024)
    throw new Error('A foto ficou muito grande. Escolha uma imagem menor.');
  return { uri: photo.uri, base64: photo.base64 };
}
export async function uploadPhoto(
  userId: string,
  kind: 'items' | 'outfits',
  photo: PickedPhoto,
): Promise<string> {
  const path = `${userId}/${kind}/${Crypto.randomUUID()}.jpg`;
  const { error } = await client().storage.from(PHOTO_BUCKET).upload(path, decode(photo.base64), {
    contentType: 'image/jpeg',
    upsert: false,
    cacheControl: '3600',
  });
  if (error) throw error;
  return path;
}
export async function removePhoto(path: string): Promise<boolean> {
  try {
    const { error } = await client().storage.from(PHOTO_BUCKET).remove([path]);
    return !error;
  } catch {
    return false;
  }
}
const signed = new Map<string, { url: string; expires: number }>();
let signedRevision = 0;
export function clearSignedPhotos() {
  signedRevision++;
  signed.clear();
}
export async function signedPhoto(path: string, force = false): Promise<string> {
  const existing = signed.get(path);
  if (!force && existing && existing.expires > Date.now()) return existing.url;
  const revision = signedRevision;
  const { data, error } = await client().storage.from(PHOTO_BUCKET).createSignedUrl(path, 3600);
  if (revision !== signedRevision)
    throw new Error('Sua sessão mudou. Abra a foto novamente na conta atual.');
  if (error) throw error;
  signed.set(path, { url: data.signedUrl, expires: Date.now() + 50 * 60 * 1000 });
  return data.signedUrl;
}
