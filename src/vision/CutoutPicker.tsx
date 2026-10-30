import { useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import Svg, { Circle, Polyline } from 'react-native-svg';
import { Image } from 'expo-image';
import { Button, Label, Notice } from '@/components/ui';
import { useTask } from '@/hooks/useData';
import { polygonCutout, cutoutOnDevice } from './browser';
export function CutoutPicker({
  uri,
  ratio,
  onCutout,
}: {
  uri: string;
  ratio: number;
  onCutout: (uri: string) => void;
}) {
  const [points, setPoints] = useState<{ x: number; y: number }[]>([]),
    [size, setSize] = useState({ width: 300, height: 400 });
  const task = useTask();
  if (Platform.OS !== 'web')
    return (
      <Label>
        O recorte manual está disponível na versão para navegador. Abra o Virtual Closet no Safari
        para usar esta ferramenta.
      </Label>
    );
  return (
    <View className="gap-3">
      <Label className="text-sm">
        Toque em volta da roupa para marcar o contorno. Evite incluir rosto, mãos ou outras peças.
      </Label>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Marcar contorno da roupa"
        onLayout={(e) => setSize(e.nativeEvent.layout)}
        onPress={(event) => {
          const { locationX, locationY } = event.nativeEvent;
          if (points.length < 60)
            setPoints([
              ...points,
              {
                x: Math.max(0, Math.min(1, locationX / size.width)),
                y: Math.max(0, Math.min(1, locationY / size.height)),
              },
            ]);
        }}
        style={{ width: '100%', aspectRatio: ratio, borderRadius: 18, overflow: 'hidden' }}
      >
        <Image
          source={{ uri }}
          contentFit="fill"
          style={{ width: '100%', height: '100%' }}
          accessibilityLabel="Foto para recorte manual"
        />
        <Svg
          pointerEvents="none"
          width="100%"
          height="100%"
          style={{ position: 'absolute' }}
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          <Polyline
            points={points.map((p) => `${p.x * 100},${p.y * 100}`).join(' ')}
            stroke="#D2FF75"
            strokeWidth=".6"
            fill="rgba(23,97,62,.2)"
          />
          {points.map((p, i) => (
            <Circle key={i} cx={p.x * 100} cy={p.y * 100} r=".9" fill="#D2FF75" />
          ))}
        </Svg>
      </Pressable>
      <Label className="text-xs text-muted">
        {points.length} pontos · o último ponto será ligado ao primeiro.
      </Label>
      <Button
        title="Usar este recorte"
        disabled={points.length < 3}
        busy={task.busy}
        onPress={() => void task.run(() => polygonCutout(uri, points), onCutout)}
      />
      <Button
        title="Desfazer último ponto"
        secondary
        small
        disabled={!points.length}
        onPress={() => setPoints(points.slice(0, -1))}
      />
      <Button
        title="Tentar remover somente o fundo"
        secondary
        small
        busy={task.busy}
        onPress={() => void task.run(() => cutoutOnDevice(uri, true), onCutout)}
      />
      <Label className="text-xs text-muted">
        O recorte automático separa o fundo. Em fotos com uma pessoa vestindo a roupa, use o
        contorno manual para isolar a peça.
      </Label>
      <Notice message={task.error} />
    </View>
  );
}
