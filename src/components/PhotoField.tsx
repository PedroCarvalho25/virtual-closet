import { cutoutOnDevice } from '@/vision/browser';
import { useEffect, useState } from 'react';
import { Platform, View } from 'react-native';
import { pickPhoto, type PickedPhoto } from '@/lib/photos';
import { useTask } from '@/hooks/useData';
import { Button, Label, Notice } from './ui';
import { Photo } from './Photo';
export function PhotoField({
  photo,
  path,
  onChange,
  disabled,
}: {
  photo: PickedPhoto | null;
  path?: string | null;
  onChange: (value: PickedPhoto | null, removed: boolean) => void;
  disabled?: boolean;
}) {
  const task = useTask();
  const [vision, setVision] = useState<{ ready: boolean; nonce: string } | null>(null);
  const [original, setOriginal] = useState<PickedPhoto | null>(null);
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    let active = true;
    void fetch('/__image-tools', { signal: AbortSignal.timeout(2000) })
      .then((r) => r.json())
      .then((result) => {
        if (active && result.ready) setVision(result);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);
  const choose = (camera: boolean) => {
    void task.run(
      () => pickPhoto(camera),
      (value) => {
        if (value) {
          setOriginal(null);
          onChange(value, false);
        }
      },
    );
  };
  return (
    <View className="gap-3">
      <Label className="font-medium text-xs">Foto · opcional</Label>
      <View className="h-56 overflow-hidden rounded-card">
        <Photo path={path} uri={photo?.uri} label="Prévia da foto selecionada" />
      </View>
      {photo && Platform.OS === 'web' && !original && <>
        <Button title="Remover fundo neste aparelho" secondary icon="scissors" busy={task.busy} disabled={disabled} onPress={() => void task.run(async () => {
          const uri = await cutoutOnDevice(photo.uri); return { uri, base64: uri.split(',')[1]! };
        }, result => { setOriginal(photo); onChange(result, false); })} />
        <Label className="text-xs text-muted">A foto fica neste aparelho. Funciona melhor com a peça sozinha; confira o recorte antes de salvar.</Label>
      </>}
      {photo && vision?.ready && !original && (
        <>
          <Button
            title="Remover fundo neste computador"
            icon="scissors"
            secondary
            busy={task.busy}
            disabled={disabled}
            onPress={() =>
              void task.run(
                async () => {
                  const response = await fetch('/__cutout', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'X-Closet-Nonce': vision.nonce },
                    body: JSON.stringify({ base64: photo.base64 }),
                    signal: AbortSignal.timeout(35000),
                  });
                  const result = await response.json();
                  if (!response.ok) throw new Error(result.message);
                  return {
                    uri: `data:image/jpeg;base64,${result.base64}`,
                    base64: result.base64,
                  } as PickedPhoto;
                },
                (result) => {
                  setOriginal(photo);
                  onChange(result, false);
                },
              )
            }
          />
          <Label className="text-xs text-muted">
            Processado aqui, sem enviar a foto a uma IA online. Funciona melhor com a peça sozinha;
            confira o contorno.
          </Label>
        </>
      )}
      {original && (
        <Button
          title="Desfazer recorte"
          secondary
          disabled={disabled || task.busy}
          onPress={() => {
            onChange(original, false);
            setOriginal(null);
          }}
        />
      )}
      <View className="flex-row gap-3">
        <View className="flex-1">
          <Button
            title="Galeria"
            icon="image"
            secondary
            small
            onPress={() => choose(false)}
            disabled={disabled || task.busy}
          />
        </View>
        <View className="flex-1">
          <Button
            title="Câmera"
            icon="camera"
            secondary
            small
            onPress={() => choose(true)}
            disabled={disabled || task.busy}
          />
        </View>
      </View>
      {(photo || path) && (
        <Button
          title="Remover foto"
          secondary
          small
          disabled={disabled || task.busy}
          onPress={() => {
            setOriginal(null);
            onChange(null, true);
          }}
        />
      )}
      <Notice message={task.error} />
    </View>
  );
}
