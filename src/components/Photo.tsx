import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { Image } from 'expo-image';
import { signedPhoto } from '@/lib/photos';
import { useAuth } from '@/stores/auth';
import type { Category } from '@/types/domain';
import { GarmentPlaceholder } from './GarmentPlaceholder';
import { useReducedMotion } from './motion';
function PrivatePhoto({
  path,
  label,
  contain,
  category,
}: {
  path: string;
  label: string;
  contain: boolean;
  category?: Category;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const reducedMotion = useReducedMotion();
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let alive = true;
    const refresh = () => {
      void signedPhoto(path, attempt > 0)
        .then((value) => {
          if (alive) setUrl(value);
        })
        .catch(() => {
          if (alive) setUrl(null);
        });
    };
    refresh();
    const timer = setInterval(refresh, 50 * 60 * 1000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [path, attempt]);
  if (!url) return <GarmentPlaceholder category={category} />;
  return (
    <Image
      source={{ uri: url }}
      recyclingKey={path}
      style={{ width: '100%', height: '100%' }}
      contentFit={contain ? 'contain' : 'cover'}
      // Web cross-dissolve can leave recycled images at opacity 0 in Expo Image.
      // Surrounding cards still animate; the photo itself must remain visible.
      transition={reducedMotion || Platform.OS === 'web' ? 0 : 180}
      cachePolicy="memory"
      accessibilityLabel={label}
      onError={() => {
        setUrl(null);
        if (attempt < 1) setAttempt(1);
      }}
    />
  );
}
export function Photo({
  path,
  uri,
  label = 'Foto da peça',
  contain = false,
  category,
}: {
  path?: string | null;
  uri?: string;
  label?: string;
  contain?: boolean;
  category?: Category;
}) {
  const { online, session } = useAuth();
  if (uri)
    return (
      <Image
        source={{ uri }}
        style={{ width: '100%', height: '100%' }}
        contentFit={contain ? 'contain' : 'cover'}
        accessibilityLabel={label}
      />
    );
  if (!path || !online || !session || !path.startsWith(`${session.user.id}/`))
    return <GarmentPlaceholder category={category} />;
  return (
    <PrivatePhoto
      key={`${session.user.id}:${path}`}
      path={path}
      label={label}
      contain={contain}
      category={category}
    />
  );
}
