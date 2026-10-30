import { useEffect, useState } from 'react';
import { Platform, View, type StyleProp, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { Icon, IconButton } from '@/components/ui';
import { socialPhotoUrl } from './media';
function ImageForPath({
  path,
  label,
  style,
  fit = 'cover',
}: {
  path: string;
  label: string;
  style?: StyleProp<ViewStyle>;
  fit?: 'cover' | 'contain' | 'fill';
}) {
  const [uri, setUri] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let alive = true;
    socialPhotoUrl(path, retry > 0)
      .then((url) => {
        if (alive) {
          setUri(url);
          setFailed(false);
        }
      })
      .catch(() => {
        if (alive) setFailed(true);
      });
    return () => {
      alive = false;
    };
  }, [path, retry]);
  return (
    <View style={[{ backgroundColor: '#E8DEC6', overflow: 'hidden' }, style]}>
      {uri && !failed ? (
        <Image
          key={retry}
          source={{ uri }}
          accessibilityLabel={label}
          style={{ width: '100%', height: '100%' }}
          contentFit={fit}
          transition={Platform.OS === 'web' ? 0 : 120}
          recyclingKey={path}
          onError={() => {
            if (retry === 0) setRetry(1);
            else setFailed(true);
          }}
        />
      ) : (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          {failed ? (
            <IconButton
              icon="refresh-cw"
              label="Recarregar foto"
              onPress={() => setRetry(retry + 1)}
            />
          ) : (
            <Icon name="image" size={24} color="#8B918A" />
          )}
        </View>
      )}
    </View>
  );
}

export function SocialImage(props: Parameters<typeof ImageForPath>[0]) {
  return <ImageForPath key={props.path} {...props} />;
}
