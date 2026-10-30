import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as Crypto from 'expo-crypto';
import { decode } from 'base64-arraybuffer';
import { client } from '@/lib/supabase';
import { useAuth } from '@/stores/auth';
import { writer } from '@/lib/api';
import { setAvatar, identityError } from './api';
import type { PickedPhoto } from '@/lib/photos';
export const AVATAR_BUCKET = 'profile-photos';
let revision = 0;
const cache = new Map<string, { url: string; until: number }>();
export function clearAvatarCache() {
  revision++;
  cache.clear();
}
export async function pickAvatar(): Promise<PickedPhoto | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted)
    throw new Error('Permita acesso à galeria nos Ajustes para escolher sua foto.');
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 1,
    allowsEditing: false,
  });
  if (result.canceled || !result.assets[0]) return null;
  return prepareAvatar(result.assets[0]);
}
export async function prepareAvatar(asset: ImagePicker.ImagePickerAsset): Promise<PickedPhoto> {
  if (asset.fileSize && asset.fileSize > 50 * 1024 * 1024)
    throw new Error('Escolha uma imagem de até 50 MB. Ajustamos o tamanho para você.');
  if (!asset.width || !asset.height)
    throw new Error('Não foi possível ler essa foto. Tente outra imagem.');
  const side = Math.min(asset.width, asset.height);
  let photo = await manipulateAsync(
    asset.uri,
    [
      {
        crop: {
          originX: Math.floor((asset.width - side) / 2),
          originY: Math.floor((asset.height - side) / 2),
          width: side,
          height: side,
        },
      },
      { resize: { width: Math.min(720, side) } },
    ],
    { compress: 0.82, format: SaveFormat.JPEG, base64: true },
  );
  if (photo.base64 && decode(photo.base64).byteLength > 700 * 1024)
    photo = await manipulateAsync(photo.uri, [{ resize: { width: 512 } }], {
      compress: 0.65,
      format: SaveFormat.JPEG,
      base64: true,
    });
  if (!photo.base64 || decode(photo.base64).byteLength > 1024 * 1024)
    throw new Error('Não conseguimos preparar essa imagem. Escolha outra foto.');
  return { uri: photo.uri, base64: photo.base64 };
}
export async function avatarUrl(path: string): Promise<string> {
  const current = revision;
  const owner = useAuth.getState().session?.user.id;
  const key = `${owner}:${path}`;
  const stored = cache.get(key);
  if (stored && stored.until > Date.now()) return stored.url;
  const { data, error } = await client().storage.from(AVATAR_BUCKET).createSignedUrl(path, 300);
  if (error) throw identityError(error);
  if (current !== revision || useAuth.getState().session?.user.id !== owner)
    throw new Error('Sua sessão mudou.');
  cache.set(key, { url: data.signedUrl, until: Date.now() + 180000 });
  return data.signedUrl;
}
export async function saveAvatar(photo: PickedPhoto | null, oldPath: string | null) {
  const owner = writer();
  let path: string | null = null;
  if (photo) {
    path = `${owner}/avatars/${Crypto.randomUUID()}.jpg`;
    const { error } = await client()
      .storage.from(AVATAR_BUCKET)
      .upload(path, decode(photo.base64), {
        contentType: 'image/jpeg',
        upsert: false,
        cacheControl: '300',
      });
    if (error) throw identityError(error);
  }
  try {
    if (useAuth.getState().session?.user.id !== owner)
      throw new Error('Sua sessão mudou. Escolha a foto novamente.');
    const account = await setAvatar(path);
    clearAvatarCache();
    let warning: string | null = null;
    if (oldPath && oldPath !== path) {
      try {
        const { error } = await client().storage.from(AVATAR_BUCKET).remove([oldPath]);
        if (error)
          warning = 'Foto atualizada. A limpeza da imagem anterior será necessária mais tarde.';
      } catch {
        warning = 'Foto atualizada. Não foi possível remover a imagem anterior agora.';
      }
    }
    return { account, warning };
  } catch (error) {
    if (path && useAuth.getState().session?.user.id === owner)
      await client()
        .storage.from(AVATAR_BUCKET)
        .remove([path])
        .catch(() => {});
    throw error;
  }
}
