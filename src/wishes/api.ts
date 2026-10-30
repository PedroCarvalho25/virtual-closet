import { client } from '@/lib/supabase';
import { writer } from '@/lib/api';
import { uploadPhoto, type PickedPhoto } from '@/lib/photos';
import { useStudio } from '@/preview/store';
import { socialSession } from '@/social/session';
import { ideasPreview } from '@/preview/config';
import type { Wish } from '@/evolution/types';
export async function saveWish(wish: Wish, photo: PickedPhoto | null = null) {
  const owner = writer(),
    generation = socialSession();
  const guard = () => {
    if (writer() !== owner || socialSession() !== generation)
      throw new Error('Sua sessão mudou. Abra o desejo novamente.');
  };
  if (!ideasPreview) {
    const { error } = await client().rpc('visual_style_ready' as never);
    if (error) throw new Error('A nova lista de desejos ainda precisa ser ativada neste projeto.');
  }
  guard();
  const value = { ...wish, media: { ...wish.media } };
  if (photo) {
    value.media.publicationId = null;
    value.media.photoPath = await uploadPhoto(owner, 'outfits', photo);
    guard();
  }
  if (!(await useStudio.getState().act({ action: 'wish', wish: value })))
    throw new Error(useStudio.getState().error || 'Não foi possível guardar o desejo.');
  guard();
  // Do not delete a previously referenced image after an ambiguous transport result.
  // Owner-private media remains in the account export and confirmed erasure manifest.
  return value.id;
}
