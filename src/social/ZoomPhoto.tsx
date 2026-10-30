import { usePreferences } from '@/settings/preferences';
/* eslint-disable react-hooks/refs, react-hooks/purity -- PanResponder invokes gesture callbacks after render; the compiler does not recognize its callback contract. */
import { useEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, Platform, View } from 'react-native';
import { IconButton, Label } from '@/components/ui';
import { SocialImage } from './Photo';
import type { Publication } from './types';
export function ZoomPhoto({
  publication: p,
  onLike,
}: {
  publication: Publication;
  onLike: () => void;
}) {
  const doubleTap = usePreferences((s) => s.doubleTap);
  const like = useRef(onLike);
  const enabled = useRef(doubleTap);
  useEffect(() => {
    like.current = onLike;
    enabled.current = doubleTap;
  }, [onLike, doubleTap]);
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [frame, setFrame] = useState({ width: 300, height: 400 });
  const live = useRef({ zoom, position, frame });
  useEffect(() => {
    live.current = { zoom, position, frame };
  }, [zoom, position, frame]);
  const start = useRef({ zoom: 1, x: 0, y: 0, distance: 0 });
  const lastTap = useRef(0);
  const changeZoom = (value: number) => {
    setZoom(Math.max(1, Math.min(4, value)));
    setPosition({ x: 0, y: 0 });
  };
  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (event) => {
          const t = event.nativeEvent.touches;
          const current = live.current;
          start.current = {
            zoom: current.zoom,
            x: current.position.x,
            y: current.position.y,
            distance:
              t.length > 1 ? Math.hypot(t[0]!.pageX - t[1]!.pageX, t[0]!.pageY - t[1]!.pageY) : 0,
          };
        },
        onPanResponderMove: (event, gesture) => {
          const t = event.nativeEvent.touches;
          if (t.length > 1) {
            const distance = Math.hypot(t[0]!.pageX - t[1]!.pageX, t[0]!.pageY - t[1]!.pageY);
            if (!start.current.distance) {
              start.current.distance = distance;
              start.current.zoom = live.current.zoom;
            }
            setZoom(
              Math.max(1, Math.min(4, (start.current.zoom * distance) / start.current.distance)),
            );
            setPosition({ x: 0, y: 0 });
          } else if (live.current.zoom > 1) {
            const maxX = (live.current.frame.width * (live.current.zoom - 1)) / 2,
              maxY = (live.current.frame.height * (live.current.zoom - 1)) / 2;
            setPosition({
              x: Math.max(-maxX, Math.min(maxX, start.current.x + gesture.dx)),
              y: Math.max(-maxY, Math.min(maxY, start.current.y + gesture.dy)),
            });
          }
        },
        onPanResponderRelease: (_, gesture) => {
          if (!start.current.distance && Math.abs(gesture.dx) + Math.abs(gesture.dy) < 8) {
            const now = Date.now();
            if (enabled.current && now - lastTap.current < 300) {
              like.current();
              lastTap.current = 0;
              return;
            }
            lastTap.current = now;
          }
        },
      }),
    [],
  );
  return (
    <View className="gap-2">
      <View
        accessibilityLabel="Foto com zoom; dois toques para curtir, controles para ampliar"
        {...responder.panHandlers}
        onLayout={(e) => setFrame(e.nativeEvent.layout)}
        style={[
          {
            width: '100%',
            height: Math.min(520, Math.max(320, (frame.width * p.height) / p.width)),
            overflow: 'hidden',
            borderRadius: 24,
            backgroundColor: '#E8DEC6',
          },
          Platform.OS === 'web' ? ({ touchAction: 'none' } as never) : {},
        ]}
      >
        <View
          style={{
            width: '100%',
            height: '100%',
            transform: [{ translateX: position.x }, { translateY: position.y }, { scale: zoom }],
          }}
        >
          <SocialImage
            path={p.fullPath}
            label={p.title}
            fit="contain"
            style={{ width: '100%', height: '100%' }}
          />
        </View>
      </View>
      <View className="flex-row items-center justify-center gap-3">
        <IconButton
          icon="minus"
          label="Reduzir imagem"
          disabled={zoom <= 1}
          onPress={() => changeZoom(zoom - 0.5)}
        />
        <Label className="text-xs">{Math.round(zoom * 100)}%</Label>
        <IconButton
          icon="plus"
          label="Ampliar imagem"
          disabled={zoom >= 4}
          onPress={() => changeZoom(zoom + 0.5)}
        />
        <IconButton
          icon="maximize"
          label="Restaurar tamanho da imagem"
          onPress={() => changeZoom(1)}
        />
      </View>
    </View>
  );
}
