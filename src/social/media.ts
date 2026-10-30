import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';
import { Asset } from 'expo-asset';
import { decode } from 'base64-arraybuffer';
import { client } from '@/lib/supabase';
import { writer } from '@/lib/api';
import { useAuth } from '@/stores/auth';
import { socialAction, socialError } from './api';
import { catalogImages } from './catalog';
import type { Publication } from './types';

export const MURAL_BUCKET = 'mural-photos';
export type SocialPhoto = {
  uri: string;
  full: string;
  thumb: string;
  width: number;
  height: number;
  uploadId: string;
};
const cache = new Map<string, { url: string; until: number }>();
let revision = 0;
export function clearSocialPhotos() {
  revision++;
  cache.clear();
}
useAuth.subscribe((state, previous) => {
  if (state.session?.user.id !== previous.session?.user.id) clearSocialPhotos();
});
export async function socialPhotoUrl(path: string, force = false): Promise<string> {
  const bundled = catalogImages[path];
  if (bundled) return Asset.fromModule(bundled).uri;
  const owner = useAuth.getState().session?.user.id;
  const current = revision;
  if (!owner) throw new Error('Entre para abrir a foto.');
  const key = `${owner}:${path}`;
  const stored = cache.get(key);
  if (!force && stored && stored.until > Date.now()) return stored.url;
  const { data, error } = await client().storage.from(MURAL_BUCKET).createSignedUrl(path, 300);
  if (error) throw socialError(error);
  if (current !== revision || owner !== useAuth.getState().session?.user.id)
    throw new Error('Sua sessão mudou.');
  if (cache.size > 160) cache.delete(cache.keys().next().value!);
  cache.set(key, { url: data.signedUrl, until: Date.now() + 180000 });
  return data.signedUrl;
}
export async function pickSocialPhoto(): Promise<SocialPhoto | null> {
  if (Platform.OS !== 'web') {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) throw new Error('Permita acesso às fotos nos Ajustes para publicar.');
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 1,
    allowsEditing: false,
  });
  if (result.canceled || !result.assets[0]) return null;
  const asset = result.assets[0];
  if (
    !asset.width ||
    !asset.height ||
    Math.max(asset.width, asset.height) > 12000 ||
    (asset.fileSize || 0) > 50 * 1024 * 1024
  )
    throw new Error('Escolha uma foto de até 50 MB e 12.000 pixels por lado.');
  // Preserve the full dimensions. Re-encode to JPEG to strip metadata and normalize orientation.
  const full = await manipulateAsync(asset.uri, [], {
    compress: 0.92,
    format: SaveFormat.JPEG,
    base64: true,
  });
  if (!full.base64 || decode(full.base64).byteLength > 12 * 1024 * 1024)
    throw new Error('A versão de alta resolução excede 12 MB. Escolha uma imagem menor.');
  const thumb = await manipulateAsync(
    full.uri,
    [
      {
        resize:
          full.width >= full.height
            ? { width: Math.min(480, full.width) }
            : { height: Math.min(640, full.height) },
      },
    ],
    { compress: 0.76, format: SaveFormat.JPEG, base64: true },
  );
  if (!thumb.base64) throw new Error('Não foi possível preparar a miniatura.');
  return {
    uri: full.uri,
    full: full.base64,
    thumb: thumb.base64,
    width: full.width,
    height: full.height,
    uploadId: Crypto.randomUUID(),
  };
}
export async function publishPhoto(
  photo: SocialPhoto,
  details: { title: string; caption: string; tags: string[]; colors: string[] },
) {
  const owner = writer();
  const root = `${owner}/${photo.uploadId}`;
  for (const [name, content] of [
    ['full', photo.full],
    ['thumb', photo.thumb],
  ] as const) {
    if (owner !== useAuth.getState().session?.user.id) throw new Error('Sua sessão mudou.');
    const { error } = await client()
      .storage.from(MURAL_BUCKET)
      .upload(`${root}/${name}.jpg`, decode(content), {
        contentType: 'image/jpeg',
        upsert: false,
        cacheControl: '300',
      });
    // A retry reuses immutable objects. It never replaces an existing publication image.
    if (error && !/already exists|duplicate/i.test(error.message)) throw socialError(error);
  }
  if (owner !== useAuth.getState().session?.user.id) throw new Error('Sua sessão mudou.');
  return socialAction<Publication>({
    action: 'publish',
    ...details,
    fullPath: `${root}/full.jpg`,
    thumbPath: `${root}/thumb.jpg`,
    width: photo.width,
    height: photo.height,
  });
}
export async function deletePublication(publication: Publication) {
  await socialAction({ action: 'delete', id: publication.id });
  // The database reference is removed first; failures here never resurrect a public post.
  const { error } = await client()
    .storage.from(MURAL_BUCKET)
    .remove([publication.fullPath, publication.thumbPath]);
  return error
    ? 'Publicação excluída. A limpeza do arquivo precisa ser tentada novamente.'
    : 'Publicação excluída.';
}
export async function downloadPublication(publication: Publication): Promise<string> {
  const uri = await socialPhotoUrl(publication.fullPath, true);
  if (Platform.OS === 'web') {
    const response = await fetch(uri, { signal: AbortSignal.timeout(25000) });
    if (!response.ok) throw new Error('Não foi possível baixar a foto. Tente novamente.');
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `virtual-closet-${publication.id}.jpg`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    return /iPhone|iPad/.test(navigator.userAgent)
      ? 'Abra a imagem baixada e use Compartilhar → Salvar imagem para guardar em Fotos.'
      : 'Download solicitado ao navegador.';
  }
  const MediaLibrary = await import('expo-media-library/legacy');
  const FileSystem = await import('expo-file-system/legacy');
  const permission = await MediaLibrary.requestPermissionsAsync(true);
  if (!permission.granted) throw new Error('Permita salvar fotos nos Ajustes e tente novamente.');
  const local = `${FileSystem.cacheDirectory}mural-${Crypto.randomUUID()}.jpg`;
  try {
    await FileSystem.downloadAsync(uri, local);
    await MediaLibrary.saveToLibraryAsync(local);
    return 'Imagem salva em Fotos.';
  } finally {
    await FileSystem.deleteAsync(local, { idempotent: true }).catch(() => {});
  }
}
