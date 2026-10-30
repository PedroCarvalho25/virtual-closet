import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useAuth } from '@/stores/auth';
import { avatarUrl } from './avatar';
import type { ProfileTone } from './types';
import { profileTones } from './types';
import palette from '@/design/palette.json';
export function Avatar({
  path,
  uri,
  name,
  tone = 'olive',
  size = 88,
}: {
  path?: string | null;
  uri?: string;
  name: string;
  tone?: ProfileTone;
  size?: number;
}) {
  const [image, setImage] = useState<{ path: string; owner: string; url: string } | null>(null);
  const owner = useAuth((s) => s.session?.user.id);
  useEffect(() => {
    let alive = true;
    if (path && owner)
      void avatarUrl(path)
        .then((value) => {
          if (alive) setImage({ path, owner, url: value });
        })
        .catch(() => {});
    return () => {
      alive = false;
    };
  }, [path, owner]);
  const url = image?.path === path && image?.owner === owner ? image?.url : null;
  const colors = profileTones[tone];
  return (
    <View
      accessibilityLabel={`Foto de ${name}`}
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.36,
        backgroundColor: colors.detail,
        borderWidth: 3,
        borderColor: palette.canvas,
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {uri || url ? (
        <Image
          source={{ uri: uri || url! }}
          style={{ width: '100%', height: '100%' }}
          contentFit="cover"
          transition={0}
          accessibilityLabel={`Foto de ${name}`}
          onError={() => setImage(null)}
        />
      ) : (
        <Text
          style={{
            fontFamily: 'DMSans_700Bold',
            fontSize: size * 0.33,
            color: colors.detailInk,
          }}
        >
          {name
            .trim()
            .split(/\s+/)
            .map((part) => part[0])
            .slice(0, 2)
            .join('')
            .toUpperCase() || 'VC'}
        </Text>
      )}
    </View>
  );
}
