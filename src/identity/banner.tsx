import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as Crypto from 'expo-crypto';
import { decode } from 'base64-arraybuffer';
import { client } from '@/lib/supabase';
import { writer } from '@/lib/api';
import { useAuth } from '@/stores/auth';
import { setBanner, identityError } from './api';
import type { PickedPhoto } from '@/lib/photos';
const bucket = 'profile-banners';
export async function pickBanner(): Promise<PickedPhoto | null> {
  if (Platform.OS !== 'web' && !(await ImagePicker.requestMediaLibraryPermissionsAsync()).granted)
    throw new Error('Permita acesso à galeria para escolher seu banner.');
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
  const asset = result.assets?.[0];
  if (result.canceled || !asset) return null;
  if (
    !asset.width ||
    !asset.height ||
    (asset.fileSize || 0) > 50 * 1024 * 1024 ||
    Math.max(asset.width, asset.height) > 12000
  )
    throw new Error('Escolha uma foto de até 50 MB e 12.000 pixels por lado.');
  const width = Math.min(asset.width, asset.height * 2.5),
    height = width / 2.5;
  const photo = await manipulateAsync(
    asset.uri,
    [
      {
        crop: {
          originX: Math.floor((asset.width - width) / 2),
          originY: Math.floor((asset.height - height) / 2),
          width: Math.floor(width),
          height: Math.floor(height),
        },
      },
      { resize: { width: Math.min(1600, Math.floor(width)) } },
    ],
    { compress: 0.85, format: SaveFormat.JPEG, base64: true },
  );
  if (!photo.base64 || decode(photo.base64).byteLength > 2 * 1024 * 1024)
    throw new Error('Escolha outra foto; o banner precisa ficar abaixo de 2 MB.');
  return { uri: photo.uri, base64: photo.base64 };
}
export async function saveBanner(photo: PickedPhoto | null, oldPath?: string | null) {
  const owner = writer();
  const path = photo ? `${owner}/banners/${Crypto.randomUUID()}.jpg` : null;
  if (photo && path) {
    const { error } = await client()
      .storage.from(bucket)
      .upload(path, decode(photo.base64), { contentType: 'image/jpeg', upsert: false });
    if (error) throw identityError(error);
  }
  if (owner !== useAuth.getState().session?.user.id) throw new Error('Sua sessão mudou.');
  // Do not delete a new upload after an ambiguous RPC timeout: it may already be in use.
  const account = await setBanner(path);
  if (owner !== useAuth.getState().session?.user.id) throw new Error('Sua sessão mudou.');
  let warning: string | null = null;
  if (oldPath && oldPath !== path) {
    try {
      const { error } = await client().storage.from(bucket).remove([oldPath]);
      if (error) warning = 'Banner salvo. Não foi possível limpar a imagem anterior agora.';
    } catch {
      warning = 'Banner salvo. Não foi possível limpar a imagem anterior agora.';
    }
  }
  return { account, warning };
}
export function BannerImage({ path, uri }: { path?: string | null; uri?: string }) {
  const [resolved, setResolved] = useState<{ path: string; uri: string } | null>(null);
  const owner = useAuth((s) => s.session?.user.id);
  useEffect(() => {
    if (!path || uri || !owner) return;
    let alive = true;
    void client()
      .storage.from(bucket)
      .createSignedUrl(path, 300)
      .then(({ data }) => {
        if (alive && data && owner === useAuth.getState().session?.user.id)
          setResolved({ path, uri: data.signedUrl });
      });
    return () => {
      alive = false;
    };
  }, [path, uri, owner]);
  const source = uri || (resolved?.path === path ? resolved?.uri : null);
  if (!source) return null;
  return (
    <Image
      source={{ uri: source }}
      accessibilityLabel="Banner do perfil"
      contentFit="cover"
      style={{ width: '100%', aspectRatio: 2.5 }}
    />
  );
}
