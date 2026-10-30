import { RealisticTryOn } from '@/vision/RealisticTryOn';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, View } from 'react-native';
import * as Crypto from 'expo-crypto';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Button, Label, Notice, Page, PageTitle, TopBar } from '@/components/ui';
import { Card, ItemChoices } from '@/evolution/components';
import { Canvas } from '@/atelier/Canvas';
import type { Layer } from '@/atelier/types';
import { clampLayer } from '@/atelier/model';
import { CutoutPicker } from '@/vision/CutoutPicker';
import { pickPhoto, signedPhoto, type PickedPhoto } from '@/lib/photos';
import { loadImage } from '@/vision/browser';
import { getPublication } from '@/social/api';
import { socialPhotoUrl } from '@/social/media';
import type { Publication } from '@/social/types';
import { useStudioScreen } from '@/preview/store';
import { useTask } from '@/hooks/useData';

export default function TryOnScreen() {
  const { source } = useLocalSearchParams<{ source?: string }>(),
    task = useTask(),
    studio = useStudioScreen();
  const [original, setOriginal] = useState<PickedPhoto | null>(null);
  const [person, setPerson] = useState<PickedPhoto | null>(null),
    [publication, setPublication] = useState<Publication | null>(null);
  const [layers, setLayers] = useState<Layer[]>([]),
    [cutouts, setCutouts] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState(''),
    [cutting, setCutting] = useState<{
      uri: string;
      ratio: number;
      target: string;
      kind: Layer['kind'];
    } | null>(null);
  const [comparison, setComparison] = useState<{
    background: string;
    layers: Layer[];
    cutouts: Record<string, string>;
  } | null>(null);
  const [showComparison, setShowComparison] = useState(false);
  const focused = useRef(false);
  const clearPreview = useCallback(() => {
    setPerson(null);
    setOriginal(null);
    setLayers([]);
    setCutouts({});
    setComparison(null);
    setCutting(null);
    setSelected('');
    setShowComparison(false);
  }, []);
  useFocusEffect(
    useCallback(() => {
      focused.current = true;
      return () => {
        focused.current = false;
        clearPreview();
      };
    }, [clearPreview]),
  );
  useEffect(() => {
    let alive = true;
    if (source)
      void getPublication(source)
        .then((p) => {
          if (alive) setPublication(p);
        })
        .catch(() => {});
    return () => {
      alive = false;
    };
  }, [source]);
  const active = layers.find((l) => l.id === selected);
  const adjust = (patch: Partial<Layer>) =>
    active &&
    setLayers(layers.map((l) => (l.id === active.id ? clampLayer({ ...l, ...patch }) : l)));
  const beginCutout = (kind: Layer['kind'], target: string, path: string) =>
    task.run(
      async () => {
        const uri = kind === 'reference' ? await socialPhotoUrl(path) : await signedPhoto(path);
        const image = await loadImage(uri);
        return { uri, ratio: image.width / image.height, kind, target };
      },
      (result) => {
        if (focused.current) setCutting(result);
      },
    );
  return (
    <Page>
      <TopBar back title="Provador · prévia visual" />
      <PageTitle
        title="Uma ideia, sobre você"
        subtitle="Misture uma referência com suas peças em uma prévia por sobreposição."
      />
      <Notice message={task.error || studio.error} />
      <Label className="text-sm text-muted">
        Esta prévia ajuda a observar cores e proporções. Não simula tamanho, tecido ou caimento
        real. Sua foto e os recortes ficam apenas nesta tela e são descartados ao sair.
      </Label>
      <Button
        title={person ? 'Trocar minha foto' : 'Escolher minha foto para a prévia'}
        icon="camera"
        busy={task.busy}
        onPress={() =>
          void task.run(
            () => pickPhoto(false),
            (p) => {
              if (p && focused.current) {
                clearPreview();
                setPerson(p);
                setOriginal(p);
              }
            },
          )
        }
      />
      {person && (
        <>
          <Canvas
            background={showComparison && comparison ? comparison.background : person.uri}
            layers={showComparison && comparison ? comparison.layers : layers}
            cutouts={showComparison && comparison ? comparison.cutouts : cutouts}
            items={studio.data?.items || []}
            publications={publication ? [publication] : []}
            selected={selected}
            onSelect={!showComparison ? setSelected : undefined}
            onMove={
              !showComparison
                ? (next) => setLayers(layers.map((l) => (l.id === next.id ? next : l)))
                : undefined
            }
          />
          <Label className="text-xs text-muted">
            Use uma foto sua de frente, com boa luz e a região do corpo visível. Arraste e ajuste
            cada peça.
          </Label>
          {active && !showComparison && (
            <Card title="Posicionar sobre sua foto">
              <View className="flex-row flex-wrap gap-2">
                <Button
                  small
                  secondary
                  title="Esquerda"
                  onPress={() => adjust({ x: active.x - 10 })}
                />
                <Button
                  small
                  secondary
                  title="Direita"
                  onPress={() => adjust({ x: active.x + 10 })}
                />
                <Button
                  small
                  secondary
                  title="Subir"
                  onPress={() => adjust({ y: active.y - 10 })}
                />
                <Button
                  small
                  secondary
                  title="Descer"
                  onPress={() => adjust({ y: active.y + 10 })}
                />
                <Button
                  small
                  secondary
                  title="Ampliar peça"
                  onPress={() => adjust({ width: active.width * 1.1, height: active.height * 1.1 })}
                />
                <Button
                  small
                  secondary
                  title="Reduzir peça"
                  onPress={() => adjust({ width: active.width / 1.1, height: active.height / 1.1 })}
                />
                <Button
                  small
                  secondary
                  title="Girar peça"
                  onPress={() =>
                    adjust({ rotation: active.rotation >= 180 ? -180 : active.rotation + 10 })
                  }
                />
                <Button
                  small
                  secondary
                  title="Trazer peça à frente"
                  onPress={() => setLayers([...layers.filter((l) => l.id !== active.id), active])}
                />
                <Button
                  small
                  secondary
                  title="Retirar peça da prévia"
                  onPress={() => {
                    setLayers(layers.filter((l) => l.id !== active.id));
                    setSelected('');
                  }}
                />
              </View>
            </Card>
          )}
          <Button
            title="Guardar versão A nesta sessão"
            secondary
            onPress={() => {
              setComparison({
                background: person.uri,
                layers: structuredClone(layers),
                cutouts: { ...cutouts },
              });
              setShowComparison(false);
            }}
          />
          {comparison && (
            <Button
              title={showComparison ? 'Voltar à versão B' : 'Comparar com a versão A'}
              secondary
              onPress={() => setShowComparison(!showComparison)}
            />
          )}
          <Button title="Apagar minha foto e esta prévia" secondary onPress={clearPreview} />
        </>
      )}
      {person && active && cutouts[active.id] && (
        <RealisticTryOn
          key={active.id}
          person={person}
          garment={cutouts[active.id]!}
          onUse={(photo) => {
            setPerson(photo);
            setLayers([]);
            setCutouts({});
            setSelected('');
          }}
        />
      )}
      {original && person !== original && (
        <Button
          title="Restaurar minha foto original"
          secondary
          onPress={() => setPerson(original)}
        />
      )}
      {Platform.OS === 'web' ? (
        <>
          {publication && (
            <Card title="A peça que chamou sua atenção">
              <Label>{publication.title}</Label>
              <Label className="text-xs text-muted">{publication.credit}</Label>
              <Label className="text-sm">
                A peça aparece inteira, com boa luz e sem partes cobertas? Se estiver cortada, de
                costas ou escondida por outras roupas, o recorte pode não servir.
              </Label>
              <Button
                title="Selecionar a peça nesta referência"
                secondary
                icon="scissors"
                busy={task.busy}
                disabled={!person || layers.length >= 12}
                onPress={() => void beginCutout('reference', publication.id, publication.fullPath)}
              />
            </Card>
          )}
          {person && (
            <Card title="Alternar com minhas peças">
              <ItemChoices
                items={(studio.data?.items || []).filter((i) => i.photo_path && !i.archived_at)}
                selected={layers.filter((l) => l.kind === 'item').map((l) => l.target)}
                label="Preparar peça"
                onSelect={(id) => {
                  const i = studio.data?.items.find((i) => i.id === id);
                  if (i?.photo_path && layers.length < 12)
                    void beginCutout('item', id, i.photo_path);
                }}
              />
            </Card>
          )}
          {cutting && (
            <Card title="Recorte somente a roupa">
              <CutoutPicker
                key={cutting.target}
                uri={cutting.uri}
                ratio={cutting.ratio}
                onCutout={(uri) => {
                  const id = Crypto.randomUUID();
                  setLayers([
                    ...layers,
                    {
                      id,
                      kind: cutting.kind,
                      target: cutting.target,
                      x: 100,
                      y: 125,
                      width: 145,
                      height: 190,
                      rotation: 0,
                    },
                  ]);
                  setCutouts({ ...cutouts, [id]: uri });
                  setSelected(id);
                  setCutting(null);
                  setShowComparison(false);
                }}
              />
              <Button title="Cancelar este recorte" secondary onPress={() => setCutting(null)} />
            </Card>
          )}
        </>
      ) : (
        <Label>Para recortar roupas e montar a prévia, use a versão do app no navegador.</Label>
      )}
    </Page>
  );
}
