import * as Crypto from 'expo-crypto';
import { Asset } from 'expo-asset';
import { Platform } from 'react-native';
import { decode } from 'base64-arraybuffer';
import { client } from '@/lib/supabase';
import { writer } from '@/lib/api';
import { useAuth } from '@/stores/auth';
import { useIdentity } from '@/identity/store';
import { getAccount } from '@/identity/api';
import { closetCache } from '@/stores/cache';
import { socialSession } from '@/social/session';
import { useStudio } from '@/preview/store';
import { ideasPreview } from '@/preview/config';
import { civilDate, parseCivil } from '@/lib/dates';
import { emptyDetail } from '@/evolution/types';
import type { StudioAction, StudioData } from '@/preview/types';
import { showcaseImages } from './images';
import {
  readShowcase,
  showcaseKey,
  showcaseLooks,
  showcaseItems,
  showcaseUsername,
  type ShowcaseState,
} from './model';

let importing = false;
function checked<T>(result: { data: T; error: unknown }): T {
  if (result.error) throw result.error;
  return result.data;
}
function required<T>(data: T | null): T {
  if (data === null) throw new Error('O servidor não confirmou a preparação. Tente novamente.');
  return data;
}
async function exchange(action?: StudioAction): Promise<StudioData> {
  if (!ideasPreview)
    return required(
      checked(
        action
          ? await client().rpc('closet_apply', { p_action: action })
          : await client().rpc('closet_snapshot', {}),
      ),
    );
  const response = await fetch('https://closet-test.supabase.co/preview/v1/studio', {
    method: action ? 'POST' : 'GET',
    headers: { 'Content-Type': 'application/json' },
    body: action ? JSON.stringify(action) : undefined,
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw new Error('Não foi possível preparar a conta de exemplo.');
  return response.json();
}
async function fixedId(owner: string, key: string) {
  const hash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `virtual-closet/showcase-v1/${owner}/${key}`,
  );
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-5${hash.slice(13, 16)}-8${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}
export async function saveShowcase(state: ShowcaseState) {
  if (writer() !== state.owner) throw new Error('Sua sessão mudou.');
  const generation = socialSession();
  const result = await client().auth.updateUser({ data: { [showcaseKey]: state } });
  if (result.error) throw result.error;
  if (useAuth.getState().session?.user.id !== state.owner || generation !== socialSession())
    throw new Error('Sua sessão mudou.');
}
async function upload(key: string, path: string, guard: () => void) {
  const asset = await Asset.fromModule(showcaseImages[key]!).downloadAsync();
  let bytes: ArrayBuffer;
  if (Platform.OS === 'web') {
    const response = await fetch(asset.localUri || asset.uri);
    if (!response.ok) throw new Error('Não foi possível carregar uma foto do catálogo.');
    bytes = await response.arrayBuffer();
  } else {
    const files = await import('expo-file-system/legacy');
    bytes = decode(
      await files.readAsStringAsync(asset.localUri || asset.uri, {
        encoding: files.EncodingType.Base64,
      }),
    );
  }
  guard();
  const { error } = await client()
    .storage.from('closet-photos')
    .upload(path, bytes, { contentType: 'image/jpeg', upsert: false });
  if (error) {
    // A previous interrupted import can have uploaded this deterministic object.
    const duplicate = error as { status?: number; statusCode?: string; code?: string };
    if (
      !['409', 'Duplicate', 'ResourceAlreadyExists', 'KeyAlreadyExists'].includes(
        String(duplicate.statusCode),
      ) &&
      !['ResourceAlreadyExists', 'KeyAlreadyExists'].includes(duplicate.code || '')
    )
      throw error;
    checked(await client().storage.from('closet-photos').createSignedUrl(path, 60));
  }
  guard();
}
export async function prepareShowcase(progress: (text: string) => void) {
  if (importing) throw new Error('A preparação já está em andamento.');
  const owner = writer(),
    generation = socialSession();
  const guard = () => {
    if (writer() !== owner || socialSession() !== generation)
      throw new Error('Sua sessão mudou. Abra a preparação novamente.');
  };
  const execute = async () => {
    importing = true;
    try {
      const account = await getAccount();
      guard();
      if (account.profile?.id !== owner || account.profile.username !== showcaseUsername)
        throw new Error(`Esta preparação é exclusiva de @${showcaseUsername}.`);
      let state: ShowcaseState = readShowcase(
        useAuth.getState().session?.user.user_metadata,
        owner,
      ) || {
        version: 1,
        owner,
        anchor: civilDate(),
        completed: false,
        followers: false,
        hiddenFollowers: [],
      };
      await saveShowcase(state);
      guard();
      let snapshot = await exchange();
      guard();
      const ids: Record<string, string> = {};
      for (const [index, item] of showcaseItems.entries()) {
        progress(`Preparando peça ${index + 1} de 20 · ${item.name}`);
        const id = await fixedId(owner, item.key);
        ids[item.key] = id;
        guard();
        if (!snapshot.items.some((i) => i.id === id)) {
          const photo_path = `${owner}/items/${id}.jpg`;
          await upload(item.key, photo_path, guard);
          guard();
          checked(
            await client()
              .from('wardrobe_items')
              .insert({
                id,
                user_id: owner,
                name: item.name,
                category: item.category,
                color: item.color,
                size: item.size,
                fit: item.fit,
                brand: null,
                photo_path,
              }),
          );
        }
        guard();
        if (!snapshot.evolution?.details[id])
          snapshot = await exchange({
            action: 'item_detail',
            id,
            detail: {
              ...emptyDetail,
              location: 'Acervo de apresentação',
              story: `Peça de demonstração; tamanho e modelagem são exemplos. ${item.credit}. ${item.license}. Fonte: ${item.source}`,
              care: 'Consulte a etiqueta da peça real.',
            },
          });
        guard();
      }
      const outfitIds: string[] = [];
      for (const [index, look] of showcaseLooks.entries()) {
        progress(`Compondo look ${index + 1} de 5 · ${look.name}`);
        const photoId = await fixedId(owner, `look-${look.key}`),
          photoPath = `${owner}/outfits/${photoId}.jpg`;
        snapshot = await exchange();
        guard();
        let id = snapshot.outfits.find((o) => o.photo_path === photoPath)?.id;
        if (!id) {
          await upload(`look-${look.key}`, photoPath, guard);
          guard();
          id = required(
            checked(
              await client().rpc('create_outfit', {
                p_item_ids: look.items.map((key) => ids[key]!),
                p_name: look.name,
                p_photo_path: photoPath,
              }),
            ),
          );
        }
        guard();
        outfitIds.push(id);
        const date = parseCivil(state.anchor);
        date.setDate(date.getDate() - index - 1);
        const worn_date = civilDate(date);
        if (!snapshot.wear.some((w) => w.outfit_id === id && w.worn_date === worn_date)) {
          const result = await client()
            .from('wear_log')
            .insert({
              id: await fixedId(owner, `wear-${look.key}`),
              user_id: owner,
              outfit_id: id,
              worn_date,
              notes: `Uso fictício para demonstração. ${look.note}`,
            });
          if (result.error && result.error.code !== '23505') throw result.error;
        }
        guard();
      }
      progress('Organizando dois planos e a comunidade de exemplo…');
      snapshot = await exchange();
      guard();
      for (const [index, title] of [
        'Café e passeio · exemplo',
        'Encontro criativo · exemplo',
      ].entries()) {
        const id = await fixedId(owner, `plan-${index}`);
        if (!snapshot.plans.some((p) => p.id === id)) {
          const day = parseCivil(state.anchor);
          day.setDate(day.getDate() + index + 1);
          await exchange({
            action: 'plan',
            plan: {
              id,
              title,
              date: civilDate(day),
              end_date: civilDate(day),
              kind: 'day',
              outfit_ids: [outfitIds[index === 0 ? 0 : 3]!],
              item_ids: [],
              notes: 'Plano fictício para apresentação do Virtual Closet.',
              reminder: false,
            },
          });
        }
        guard();
      }
      state = { ...state, followers: state.completed ? state.followers : true, completed: true };
      await saveShowcase(state);
      guard();
      closetCache.invalidate();
      await useStudio.getState().load();
      await useIdentity.getState().refresh();
      progress('20 peças, 5 looks, 5 usos de exemplo e 2 planos preparados.');
    } finally {
      importing = false;
    }
  };
  if (Platform.OS === 'web' && navigator.locks)
    return navigator.locks.request(
      `closet-showcase:${owner}`,
      { ifAvailable: true },
      async (lock) => {
        if (!lock) throw new Error('A preparação já está aberta em outra aba.');
        return execute();
      },
    );
  return execute();
}
