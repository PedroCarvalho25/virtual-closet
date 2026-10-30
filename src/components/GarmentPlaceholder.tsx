import { Text, View } from 'react-native';
import Svg, { Path, Line } from 'react-native-svg';
import type { Category } from '@/types/domain';
export function GarmentPlaceholder({ category = 'camiseta' }: { category?: Category }) {
  const pants = ['calca', 'jorts', 'bermuda'].includes(category);
  const cap = category.startsWith('bone_');
  const shoe = category === 'tenis';
  return (
    <View className="flex-1 items-center justify-center gap-3 bg-[#F0EFE9]">
      <Svg
        width="74"
        height="90"
        viewBox="0 0 100 120"
        fill="none"
        stroke="#A0A58F"
        strokeWidth="1.8"
        strokeLinejoin="round"
        strokeLinecap="round"
      >
        {shoe ? (
          <>
            <Path d="M18 72l7-25 15 17 17 7 22 4q12 4 12 15H12v-12z" fill="#E8E9DE" />
            <Path d="M12 82h78M36 63l8-5M47 69l7-6M58 72l5-5" />
          </>
        ) : cap ? (
          <>
            <Path d="M22 67q0-36 30-36t28 36z" fill="#E8E9DE" />
            <Path d="M22 67q-17 13-12 18 13 7 43-18M52 31v36" />
          </>
        ) : pants ? (
          <>
            <Path d="M26 19h50l-5 85H53l-4-56-6 56H24z" fill="#E8E9DE" />
            <Path d="M26 30h49M50 20v22M34 31q0 12-9 14M67 31q0 11 8 14" />
          </>
        ) : (
          <>
            <Path
              d="M34 24L17 35 7 53l16 11 8-12-4 49h48l-4-49 8 12 16-11-10-18-18-11q-15 14-33 0z"
              fill="#E8E9DE"
            />
            <Path d="M34 24q16 22 33 0M29 91h44" />
          </>
        )}
        {!shoe && !cap && <Line x1="39" y1="19" x2="62" y2="19" stroke="transparent" />}
      </Svg>
      <Text className="font-medium text-[10px] text-[#929884]">Sem foto</Text>
    </View>
  );
}
