/* eslint-disable react-hooks/refs -- PanResponder stores callbacks and invokes them after render, as in ZoomPhoto. */
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Animated, PanResponder, Platform, Pressable, View } from 'react-native';
import type { Wish } from '@/evolution/types';
import { WishImage } from '@/wishes/WishImage';
import { Photo } from '@/components/Photo';
import { Label } from '@/components/ui';
import { SocialImage } from '@/social/Photo';
import type { WardrobeItem } from '@/types/domain';
import type { Publication } from '@/social/types';
import type { Layer } from './types';
import { clampLayer } from './model';
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
function CanvasLayer(props: {
  layer: Layer;
  scale: number;
  item?: WardrobeItem;
  wish?: Wish;
  publication?: Publication;
  uri?: string;
  selected: boolean;
  onSelect?: () => void;
  onMove?: (layer: Layer) => void;
}) {
  const latest = useRef(props);
  useLayoutEffect(() => {
    latest.current = props;
  }, [props]);
  const [pan] = useState(() => new Animated.ValueXY());
  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !!latest.current.onSelect,
        onMoveShouldSetPanResponder: () => !!latest.current.onMove,
        onPanResponderGrant: () => latest.current.onSelect?.(),
        onPanResponderMove: (_, gesture) => pan.setValue({ x: gesture.dx, y: gesture.dy }),
        onPanResponderRelease: (_, gesture) => {
          const { layer, scale, onMove } = latest.current;
          pan.setValue({ x: 0, y: 0 });
          onMove?.(
            clampLayer({
              ...layer,
              x: layer.x + gesture.dx / scale,
              y: layer.y + gesture.dy / scale,
            }),
          );
        },
        onPanResponderTerminate: () => pan.setValue({ x: 0, y: 0 }),
      }),
    [pan],
  );
  const { layer: l, scale: s, item, publication, selected } = props;
  const crop = l.crop || { x: 0, y: 0, width: 1, height: 1 };
  const label = item?.name || props.wish?.title || publication?.title || 'Referência indisponível';
  return (
    <AnimatedPressable
      {...responder.panHandlers}
      onPress={props.onSelect}
      accessible
      accessibilityRole="button"
      accessibilityLabel={`${l.kind === 'reference' ? 'Referência: ' : ''}${label}`}
      accessibilityState={{ selected }}
      onAccessibilityTap={props.onSelect}
      style={[
        {
          position: 'absolute',
          left: l.x * s,
          top: l.y * s,
          width: l.width * s,
          height: l.height * s,
          borderWidth: selected ? 2 : 0,
          borderColor: '#17613E',
          borderRadius: 8,
          transform: [{ translateX: pan.x }, { translateY: pan.y }, { rotate: `${l.rotation}deg` }],
          overflow: 'hidden',
        },
        Platform.OS === 'web' && props.onMove ? ({ touchAction: 'none' } as never) : {},
      ]}
    >
      {props.uri ? (
        <Photo uri={props.uri} contain label={label} />
      ) : l.kind === 'wish' && props.wish ? (
        <WishImage wish={props.wish} />
      ) : l.kind === 'item' ? (
        <Photo path={item?.photo_path} category={item?.category} label={label} contain />
      ) : publication ? (
        <View
          style={{
            position: 'absolute',
            width: `${100 / crop.width}%`,
            height: `${100 / crop.height}%`,
            left: (-crop.x * l.width * s) / crop.width,
            top: (-crop.y * l.height * s) / crop.height,
          }}
        >
          <SocialImage
            path={publication.fullPath}
            label={label}
            style={{ width: '100%', height: '100%' }}
            fit="fill"
          />
        </View>
      ) : (
        <View className="flex-1 justify-center bg-paper p-2">
          <Label className="text-xs">Referência indisponível</Label>
        </View>
      )}
    </AnimatedPressable>
  );
}
export function Canvas({
  layers,
  items,
  publications,
  selected,
  onSelect,
  onMove,
  background,
  cutouts,
  wishes = [],
}: {
  wishes?: Wish[];
  background?: string;
  cutouts?: Record<string, string>;
  layers: Layer[];
  items: WardrobeItem[];
  publications: Publication[];
  selected?: string;
  onSelect?: (id: string) => void;
  onMove?: (layer: Layer) => void;
}) {
  const [width, setWidth] = useState(300);
  return (
    <View
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      accessibilityLabel="Painel de composição do look"
      style={{
        width: '100%',
        aspectRatio: 3 / 4,
        backgroundColor: '#F6F1E7',
        borderRadius: 22,
        overflow: 'hidden',
      }}
    >
      {background && (
        <View style={{ position: 'absolute', inset: 0 }}>
          <Photo uri={background} contain label="Sua foto pessoal" />
        </View>
      )}
      {layers.map((layer) => (
        <CanvasLayer
          key={layer.id}
          layer={layer}
          uri={cutouts?.[layer.id]}
          scale={width / 360}
          wish={wishes.find((w) => w.id === layer.target)}
          item={items.find((i) => i.id === layer.target)}
          publication={publications.find((p) => p.id === layer.target)}
          selected={layer.id === selected}
          onSelect={onSelect ? () => onSelect(layer.id) : undefined}
          onMove={onMove}
        />
      ))}
      {!layers.length && !background && (
        <View className="flex-1 items-center justify-center p-8">
          <Label className="text-center text-sm">
            Comece por uma peça sua ou um detalhe da inspiração.
          </Label>
        </View>
      )}
    </View>
  );
}
