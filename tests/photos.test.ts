import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearSignedPhotos, pickPhoto, removePhoto, signedPhoto, uploadPhoto } from '@/lib/photos';
const mocks = vi.hoisted(() => ({
  permission: vi.fn(),
  camera: vi.fn(),
  gallery: vi.fn(),
  manipulate: vi.fn(),
  upload: vi.fn(),
  remove: vi.fn(),
  sign: vi.fn(),
}));
vi.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: mocks.permission,
  requestMediaLibraryPermissionsAsync: mocks.permission,
  launchCameraAsync: mocks.camera,
  launchImageLibraryAsync: mocks.gallery,
}));
vi.mock('expo-image-manipulator', () => ({
  manipulateAsync: mocks.manipulate,
  SaveFormat: { JPEG: 'jpeg' },
}));
vi.mock('expo-crypto', () => ({ randomUUID: () => '11111111-1111-4111-8111-111111111111' }));
vi.mock('@/lib/supabase', () => ({
  client: () => ({
    storage: {
      from: () => ({ upload: mocks.upload, remove: mocks.remove, createSignedUrl: mocks.sign }),
    },
  }),
}));
beforeEach(() => {
  vi.resetAllMocks();
  clearSignedPhotos();
  mocks.permission.mockResolvedValue({ granted: true });
  mocks.upload.mockResolvedValue({ error: null });
});
describe('photo boundary behavior', () => {
  it('denied permission does not open the camera', async () => {
    mocks.permission.mockResolvedValue({ granted: false });
    await expect(pickPhoto(true)).rejects.toThrow('Ajustes');
    expect(mocks.camera).not.toHaveBeenCalled();
  });
  it('cancellation does not change the selected photo or upload anything', async () => {
    mocks.gallery.mockResolvedValue({ canceled: true, assets: [] });
    expect(await pickPhoto(false)).toBeNull();
    expect(mocks.manipulate).not.toHaveBeenCalled();
    expect(mocks.upload).not.toHaveBeenCalled();
  });
  it('converts a portrait to a bounded JPEG without forcing a square crop', async () => {
    mocks.gallery.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file://original.heic', width: 3000, height: 4000 }],
    });
    mocks.manipulate.mockResolvedValue({
      uri: 'file://compressed.jpg',
      base64: 'aGVsbG8=',
      width: 1050,
      height: 1400,
    });
    expect(await pickPhoto(false)).toEqual({ uri: 'file://compressed.jpg', base64: 'aGVsbG8=' });
    expect(mocks.manipulate).toHaveBeenCalledWith(
      'file://original.heic',
      [{ resize: { height: 1400 } }],
      expect.objectContaining({ format: 'jpeg', base64: true }),
    );
  });
  it('uploads ArrayBuffer with a private owner path and never overwrites', async () => {
    const path = await uploadPhoto('owner', 'items', { uri: 'local', base64: 'aGVsbG8=' });
    expect(path).toBe('owner/items/11111111-1111-4111-8111-111111111111.jpg');
    expect(mocks.upload.mock.calls[0]?.[1]).toBeInstanceOf(ArrayBuffer);
    expect(mocks.upload.mock.calls[0]?.[2]).toEqual({
      contentType: 'image/jpeg',
      upsert: false,
      cacheControl: '3600',
    });
  });
  it('propagates upload failure rather than pretending it succeeded', async () => {
    mocks.upload.mockResolvedValue({ error: new Error('quota') });
    await expect(
      uploadPhoto('owner', 'items', { uri: 'local', base64: 'aGVsbG8=' }),
    ).rejects.toThrow('quota');
  });
  it('renews signed URLs on demand and exposes cleanup failures to the caller', async () => {
    mocks.sign
      .mockResolvedValueOnce({ data: { signedUrl: 'first' }, error: null })
      .mockResolvedValueOnce({ data: { signedUrl: 'renewed' }, error: null });
    expect(await signedPhoto('owner/items/photo.jpg')).toBe('first');
    expect(await signedPhoto('owner/items/photo.jpg')).toBe('first');
    expect(mocks.sign).toHaveBeenCalledTimes(1);
    expect(await signedPhoto('owner/items/photo.jpg', true)).toBe('renewed');
    mocks.remove.mockResolvedValue({ error: new Error('offline') });
    expect(await removePhoto('owner/items/photo.jpg')).toBe(false);
  });
  it('rejects an old signing response after logout without restoring it to the cache', async () => {
    let resolve!: (value: { data: { signedUrl: string }; error: null }) => void;
    mocks.sign.mockReturnValueOnce(
      new Promise((done) => {
        resolve = done;
      }),
    );
    const oldPhoto = signedPhoto('owner/items/photo.jpg');
    clearSignedPhotos();
    const rejected = expect(oldPhoto).rejects.toThrow('sessão mudou');
    resolve({ data: { signedUrl: 'old-private-url' }, error: null });
    await rejected;
    mocks.sign.mockResolvedValueOnce({ data: { signedUrl: 'new-private-url' }, error: null });
    expect(await signedPhoto('owner/items/photo.jpg')).toBe('new-private-url');
    expect(mocks.sign).toHaveBeenCalledTimes(2);
  });
});
