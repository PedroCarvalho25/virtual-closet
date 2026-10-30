import { View } from 'react-native';
import { Image } from 'expo-image';
export function WelcomeCollage({ compact = false }: { compact?: boolean }) {
  return (
    <View className="flex-row items-center gap-2.5" style={{ height: compact ? 182 : 210 }}>
      <View
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        className="absolute right-2 top-1 h-14 w-14 rounded-2xl bg-coral"
        style={{ transform: [{ rotate: '12deg' }] }}
      />
      <View
        className="flex-1 overflow-hidden rounded-[24px]"
        style={{ height: compact ? 148 : 174, transform: [{ rotate: '-5deg' }] }}
      >
        <Image
          source={require('../../assets/welcome/knit.jpg')}
          contentFit="cover"
          style={{ width: '100%', height: '100%' }}
          accessibilityLabel="Imagem de inspiração: peça de tricô"
        />
      </View>
      <View
        className="overflow-hidden rounded-[24px]"
        style={{ flex: 1.18, height: compact ? 176 : 210, transform: [{ rotate: '3deg' }] }}
      >
        <Image
          source={require('../../assets/welcome/closet.jpg')}
          contentFit="cover"
          style={{ width: '100%', height: '100%' }}
          accessibilityLabel="Imagem de inspiração: roupas organizadas"
        />
      </View>
      <View
        className="flex-1 overflow-hidden rounded-[24px]"
        style={{ height: compact ? 144 : 172, transform: [{ rotate: '6deg' }] }}
      >
        <Image
          source={require('../../assets/welcome/tee.jpg')}
          contentFit="cover"
          style={{ width: '100%', height: '100%' }}
          accessibilityLabel="Imagem de inspiração: camiseta branca"
        />
      </View>
    </View>
  );
}
