import * as Crypto from 'expo-crypto';
import { itemGroups } from './item-groups';
import { client } from './supabase';
import { useAuth } from '@/stores/auth';
import { closetCache } from '@/stores/cache';
import { assertPastDate } from './dates';
import { normalizeItem, searchExpression, validateSelection } from './validation';
import { removePhoto, uploadPhoto, type PickedPhoto } from './photos';
import {
  PAGE_SIZE,
  type Item,
  type WardrobeItem,
  type ItemFilters,
  type Outfit,
  type OutfitRow,
  type ItemInput,
  type FeedPost,
  type WearLog,
} from '@/types/domain';

export function writer() {
  const { session, online } = useAuth.getState();
  if (!session) throw new Error('Entre na sua conta para continuar.');
  if (!online) throw new Error('Você está offline. Conecte-se à internet para salvar alterações.');
  return session.user.id;
}
function check<T>(result: { data: T; error: unknown }): T {
  if (result.error) throw result.error;
  return result.data;
}
function requireRow<T>(value: T | null): T {
  if (value === null) throw new Error('Não encontramos este conteúdo na sua conta.');
  return value;
}
function guard(t: ReturnType<typeof closetCache.token>) {
  if (!closetCache.valid(t)) throw new Error('Os dados mudaram. Atualize e tente novamente.');
}
function guardIdentity(t: ReturnType<typeof closetCache.token>) {
  const current = closetCache.token();
  if (!t.userId || t.userId !== current.userId || t.epoch !== current.epoch)
    throw new Error('Sua sessão mudou. Entre novamente para continuar.');
}
async function itemDates(items: Item[]): Promise<WardrobeItem[]> {
  if (!items.length) return [];
  const dates = check(
    await client()
      .from('item_last_worn')
      .select('*')
      .in(
        'item_id',
        items.map((i) => i.id),
      ),
  );
  const map = new Map(dates?.map((d) => [d.item_id, d.last_worn_date]));
  return items.map((i) => ({ ...i, last_worn_date: map.get(i.id) || null }));
}
export async function fetchItems(filter: ItemFilters, page = 0): Promise<WardrobeItem[]> {
  const t = closetCache.token();
  let query = client()
    .from('wardrobe_items')
    .select('*')
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
  if (!filter.archived) query = query.is('archived_at', null);
  if (filter.category) query = query.eq('category', filter.category);
  if (filter.group) query = query.in('category', itemGroups[filter.group].categories);
  if (filter.search.trim()) query = query.or(searchExpression(filter.search));
  const items = await itemDates(check(await query) || []);
  guard(t);
  closetCache.merge(t, { items });
  return items;
}
export async function fetchItem(id: string): Promise<WardrobeItem> {
  const t = closetCache.token();
  const item = check(await client().from('wardrobe_items').select('*').eq('id', id).single());
  const rows = await itemDates([requireRow(item)]);
  guard(t);
  closetCache.merge(t, { items: rows });
  return rows[0]!;
}
type OutfitJoin = OutfitRow & { outfit_items: { wardrobe_items: Item }[] };
async function hydrateOutfits(rows: OutfitJoin[]): Promise<Outfit[]> {
  if (!rows.length) return [];
  const dates = check(
    await client()
      .from('outfit_last_worn')
      .select('*')
      .in(
        'outfit_id',
        rows.map((o) => o.id),
      ),
  );
  const itemRows = await itemDates([
    ...new Map(
      rows.flatMap((o) => o.outfit_items.map((i) => i.wardrobe_items)).map((i) => [i.id, i]),
    ).values(),
  ]);
  const items = new Map(itemRows.map((i) => [i.id, i]));
  return rows.map(({ outfit_items, ...outfit }) => ({
    ...outfit,
    last_worn_date: dates?.find((d) => d.outfit_id === outfit.id)?.last_worn_date || null,
    items: outfit_items.map((i) => items.get(i.wardrobe_items.id)!),
  }));
}
export async function fetchOutfits(page = 0): Promise<Outfit[]> {
  const t = closetCache.token();
  const rows = check(
    await client()
      .from('outfits')
      .select('*, outfit_items(wardrobe_items(*))')
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1),
  );
  const outfits = await hydrateOutfits(rows || []);
  guard(t);
  closetCache.merge(t, { outfits });
  return outfits;
}
export async function fetchOutfit(id: string): Promise<Outfit> {
  const t = closetCache.token();
  const row = check(
    await client()
      .from('outfits')
      .select('*, outfit_items(wardrobe_items(*))')
      .eq('id', id)
      .single(),
  );
  const outfits = await hydrateOutfits([requireRow(row)]);
  guard(t);
  closetCache.merge(t, { outfits });
  return outfits[0]!;
}
export type SaveResult = { id: string; warning?: string };
async function cleanupRejectedUpload(path: string | null, error: unknown): Promise<never> {
  // A transport timeout can happen AFTER a commit. Keep the object in ambiguous
  // cases, rather than deleting a photo a committed row may already reference.
  const code = (error as { code?: string })?.code;
  if (path && code && /^[0-9A-Z]{5}$/.test(code)) {
    const removed = await removePhoto(path);
    if (!removed)
      throw new Error(
        'Não foi possível salvar. A foto enviada pode ter ficado no armazenamento; confira antes de tentar de novo.',
      );
  }
  throw error;
}
export async function saveItem(
  input: ItemInput,
  existing: WardrobeItem | null,
  photo: PickedPhoto | null,
  remove: boolean,
): Promise<SaveResult> {
  const userId = writer();
  const value = normalizeItem(input);
  const t = closetCache.token();
  let newPath: string | null = null;
  if (photo) newPath = await uploadPhoto(userId, 'items', photo);
  const photo_path = newPath || (remove ? null : existing?.photo_path || null);
  const id = existing?.id || Crypto.randomUUID();
  try {
    guardIdentity(t);
    const data = existing
      ? check(
          await client()
            .from('wardrobe_items')
            .update({ ...value, photo_path })
            .eq('id', id)
            .select('*')
            .single(),
        )
      : check(
          await client()
            .from('wardrobe_items')
            .insert({ ...value, id, user_id: userId, photo_path })
            .select('*')
            .single(),
        );
    guardIdentity(t);
    closetCache.merge(t, {
      items: [{ ...requireRow(data), last_worn_date: existing?.last_worn_date || null }],
    });
  } catch (error) {
    return cleanupRejectedUpload(newPath, error);
  }
  let warning: string | undefined;
  if (
    existing?.photo_path &&
    existing.photo_path !== photo_path &&
    !(await removePhoto(existing.photo_path))
  )
    warning = 'Peça salva. Não foi possível remover a foto antiga do armazenamento.';
  closetCache.invalidate();
  return { id, warning };
}
export async function setArchived(item: WardrobeItem, archived: boolean) {
  writer();
  const t = closetCache.token();
  const result = check(
    await client()
      .from('wardrobe_items')
      .update({ archived_at: archived ? new Date().toISOString() : null })
      .eq('id', item.id)
      .select('*')
      .single(),
  );
  guardIdentity(t);
  closetCache.merge(t, { items: [{ ...requireRow(result), last_worn_date: item.last_worn_date }] });
  closetCache.invalidate();
}
export async function createOutfit(
  ids: string[],
  name: string,
  photo: PickedPhoto | null,
): Promise<SaveResult> {
  const userId = writer();
  validateSelection(ids);
  const t = closetCache.token();
  let path: string | null = null;
  if (photo) path = await uploadPhoto(userId, 'outfits', photo);
  try {
    guardIdentity(t);
    const id = check(
      await client().rpc('create_outfit', {
        p_item_ids: ids,
        p_name: name.trim() || null,
        p_photo_path: path,
      }),
    );
    guardIdentity(t);
    closetCache.invalidate();
    return { id: requireRow(id) };
  } catch (error) {
    return cleanupRejectedUpload(path, error);
  }
}
export async function fetchWear(start: string, end: string) {
  const t = closetCache.token();
  const logs: WearLog[] = [];
  for (let page = 0; ; page++) {
    const data =
      check(
        await client()
          .from('wear_log')
          .select('*')
          .gte('worn_date', start)
          .lte('worn_date', end)
          .order('worn_date', { ascending: false })
          .order('created_at', { ascending: false })
          .order('id', { ascending: false })
          .range(page * 1000, page * 1000 + 999),
      ) || [];
    guard(t);
    logs.push(...data);
    if (data.length < 1000) break;
  }
  return [...new Map(logs.map((log) => [log.id, log])).values()];
}
async function refreshDerived() {
  closetCache.invalidate();
  const t = closetCache.token();
  const snapshot = closetCache.store.getState();
  try {
    const items = await itemDates(snapshot.items);
    const dates = snapshot.outfits.length
      ? check(
          await client()
            .from('outfit_last_worn')
            .select('*')
            .in(
              'outfit_id',
              snapshot.outfits.map((o) => o.id),
            ),
        )
      : [];
    const datesById = new Map(items.map((i) => [i.id, i.last_worn_date]));
    const outfits = snapshot.outfits.map((o) => ({
      ...o,
      last_worn_date: dates?.find((d) => d.outfit_id === o.id)?.last_worn_date || null,
      items: o.items.map((i) => ({
        ...i,
        last_worn_date: datesById.get(i.id) ?? i.last_worn_date,
      })),
    }));
    closetCache.merge(t, { items, outfits });
  } catch {
    /* The write succeeded; the next focused online screen refreshes dates. */
  }
}
export async function recordWear(outfitId: string, date: string, notes: string) {
  const userId = writer();
  assertPastDate(date);
  check(
    await client()
      .from('wear_log')
      .insert({
        user_id: userId,
        outfit_id: outfitId,
        worn_date: date,
        notes: notes.trim() || null,
      }),
  );
  await refreshDerived();
}
export async function removeWear(id: string) {
  writer();
  check(await client().from('wear_log').delete().eq('id', id));
  await refreshDerived();
}
export async function fetchPosts(page = 0): Promise<FeedPost[]> {
  const t = closetCache.token();
  const rows = check(
    await client()
      .from('posts')
      .select('*, outfits(*, outfit_items(wardrobe_items(*)))')
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1),
  );
  const outfits = await hydrateOutfits(rows?.map((p) => p.outfits) || []);
  guard(t);
  return (rows || []).map(({ outfits: _outfit, ...post }) => ({
    ...post,
    outfit: outfits.find((o) => o.id === post.outfit_id)!,
  }));
}
export async function publishPost(outfitId: string, caption: string) {
  const userId = writer();
  check(
    await client()
      .from('posts')
      .insert({ user_id: userId, outfit_id: outfitId, caption: caption.trim() || null }),
  );
  closetCache.invalidate();
}
export async function removePost(id: string) {
  writer();
  check(await client().from('posts').delete().eq('id', id));
  closetCache.invalidate();
}
