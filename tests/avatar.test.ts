import { beforeEach, describe, expect, it, vi } from 'vitest';
import { prepareAvatar, saveAvatar, avatarUrl, clearAvatarCache } from '@/identity/avatar';
const m = vi.hoisted(() => ({
  manipulate: vi.fn(),
  upload: vi.fn(),
  remove: vi.fn(),
  save: vi.fn(),
  sign: vi.fn(),
  owner: 'owner',
}));
vi.mock('expo-image-picker', () => ({}));
vi.mock('expo-image-manipulator', () => ({
  manipulateAsync: m.manipulate,
  SaveFormat: { JPEG: 'jpeg' },
}));
vi.mock('expo-crypto', () => ({ randomUUID: () => 'image-id' }));
vi.mock('@/lib/api', () => ({ writer: () => m.owner }));
vi.mock('@/stores/auth', () => ({
  useAuth: { getState: () => ({ session: { user: { id: m.owner } } }) },
}));
vi.mock('@/identity/api', () => ({ setAvatar: m.save, identityError: (e: unknown) => e }));
vi.mock('@/lib/supabase', () => ({
  client: () => ({
    storage: { from: () => ({ upload: m.upload, remove: m.remove, createSignedUrl: m.sign }) },
  }),
}));
beforeEach(() => {
  vi.resetAllMocks();
  m.owner = 'owner';
  clearAvatarCache();
  m.upload.mockResolvedValue({ error: null });
  m.remove.mockResolvedValue({ error: null });
  m.save.mockResolvedValue({ profile: { id: 'owner' } });
});
describe('profile photo preparation and persistence', () => {
  it('crops a high resolution portrait centrally and uploads only a compact JPEG', async () => {
    m.manipulate.mockResolvedValue({ uri: 'compact', base64: 'aGVsbG8=' });
    const photo = await prepareAvatar({
      uri: 'original',
      width: 3000,
      height: 4000,
      fileSize: 18000000,
    });
    expect(m.manipulate.mock.calls[0]![1]).toEqual([
      { crop: { originX: 0, originY: 500, width: 3000, height: 3000 } },
      { resize: { width: 720 } },
    ]);
    await saveAvatar(photo, 'old');
    expect(m.upload.mock.calls[0]![0]).toBe('owner/avatars/image-id.jpg');
    expect(m.upload.mock.calls[0]![1]).toBeInstanceOf(ArrayBuffer);
    expect(m.save.mock.invocationCallOrder[0]).toBeLessThan(m.remove.mock.invocationCallOrder[0]!);
  });
  it('rejects excessively large or unreadable source images before manipulation', async () => {
    await expect(
      prepareAvatar({ uri: 'huge', width: 3000, height: 4000, fileSize: 51 * 1024 * 1024 }),
    ).rejects.toThrow('50 MB');
    await expect(prepareAvatar({ uri: 'broken', width: 0, height: 0 })).rejects.toThrow(
      'ler essa foto',
    );
    expect(m.manipulate).not.toHaveBeenCalled();
  });
  it('keeps the previous avatar when saving the new reference fails and cleans the new upload', async () => {
    m.save.mockRejectedValue(new Error('offline'));
    await expect(saveAvatar({ uri: 'compact', base64: 'aGVsbG8=' }, 'old')).rejects.toThrow(
      'offline',
    );
    expect(m.remove).toHaveBeenCalledExactlyOnceWith(['owner/avatars/image-id.jpg']);
  });
  it('reports successful replacement even if old-file cleanup fails', async () => {
    m.remove.mockResolvedValue({ error: new Error('offline') });
    const result = await saveAvatar(null, 'old');
    expect(result.account.profile?.id).toBe('owner');
    expect(result.warning).toBeTruthy();
  });
  it('does not cache a signed private photo after the session changes', async () => {
    let done!: (value: unknown) => void;
    m.sign.mockImplementation(
      () =>
        new Promise((resolve) => {
          done = resolve;
        }),
    );
    const pending = avatarUrl('old');
    m.owner = 'different';
    clearAvatarCache();
    const rejected = expect(pending).rejects.toThrow('sessão mudou');
    done({ data: { signedUrl: 'private' }, error: null });
    await rejected;
  });
});
