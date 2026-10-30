import { BannerImage } from './banner';
import { Text, View, useWindowDimensions } from 'react-native';
import { Icon, colors } from '@/components/ui';
import { SoftPressable, MotionReveal } from '@/components/motion';
import { Avatar } from './ProfileAvatar';
import { profileTones, type IdentityProfile } from './types';

export function ProfileHero({
  profile,
  onPhoto,
}: {
  profile: IdentityProfile;
  onPhoto?: () => void;
}) {
  const tone = profileTones[profile.tone];
  const compact = useWindowDimensions().width < 360;
  const avatar = (
    <Avatar
      path={profile.avatarPath}
      name={`${profile.firstName} ${profile.lastName}`}
      tone={profile.tone}
      size={96}
    />
  );
  return (
    <MotionReveal
      trigger={profile.tone}
      style={{ backgroundColor: tone.background, borderRadius: 28, overflow: 'hidden' }}
    >
      {profile.bannerPath && <BannerImage path={profile.bannerPath} />}
      <View
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{
          position: 'absolute',
          right: -28,
          top: 68,
          width: 108,
          height: 108,
          borderRadius: 26,
          borderWidth: 18,
          borderColor: tone.detail,
          opacity: 0.12,
          transform: [{ rotate: '-18deg' }],
        }}
      />
      <View className="gap-4 p-5">
        <View className="flex-row items-start justify-between gap-3">
          {onPhoto ? (
            <SoftPressable
              accessibilityRole="button"
              accessibilityLabel="Editar foto do perfil"
              onPress={onPhoto}
            >
              {avatar}
              <View className="absolute -bottom-1 -right-1 h-9 w-9 items-center justify-center rounded-full bg-paper">
                <Icon name="camera" size={17} color={colors.accent} />
              </View>
            </SoftPressable>
          ) : (
            avatar
          )}
          {onPhoto && (
            <View
              className="flex-row items-center gap-1.5 rounded-full px-3 py-2"
              style={{ backgroundColor: tone.detail }}
            >
              <Icon
                name={profile.discoverable ? 'eye' : 'eye-off'}
                size={13}
                color={tone.detailInk}
              />
              <Text style={{ color: tone.detailInk, fontFamily: 'DMSans_700Bold', fontSize: 11 }}>
                {profile.discoverable ? 'Perfil visível' : 'Perfil oculto'}
              </Text>
            </View>
          )}
        </View>
        <View className="gap-1.5">
          <Text
            accessibilityRole="header"
            style={{
              color: tone.ink,
              fontFamily: 'DMSans_800ExtraBold',
              fontSize: compact ? 26 : 30,
              lineHeight: compact ? 31 : 36,
              letterSpacing: -1,
              flexShrink: 1,
            }}
            selectable
          >
            @{profile.username}
          </Text>
          <Text style={{ color: tone.ink, fontFamily: 'DMSans_500Medium', fontSize: 16 }}>
            {profile.firstName} {profile.lastName}
          </Text>
        </View>
        {!!profile.bio && (
          <Text
            style={{
              color: tone.ink,
              fontFamily: 'DMSans_400Regular',
              fontSize: 14,
              lineHeight: 21,
            }}
          >
            {profile.bio}
          </Text>
        )}
        {!!profile.tags.length && (
          <View className="flex-row flex-wrap gap-2">
            {profile.tags.map((tag) => (
              <View
                key={tag}
                style={{
                  backgroundColor: tone.detail,
                  borderRadius: 12,
                  paddingHorizontal: 12,
                  paddingVertical: 7,
                }}
              >
                <Text style={{ color: tone.detailInk, fontFamily: 'DMSans_700Bold', fontSize: 12 }}>
                  {tag}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </MotionReveal>
  );
}
