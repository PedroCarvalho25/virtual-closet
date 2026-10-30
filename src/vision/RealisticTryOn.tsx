import { useEffect, useRef, useState } from 'react';
import { Platform, View } from 'react-native';
import { Button, Label, Notice } from '@/components/ui';
import { Photo } from '@/components/Photo';
import { Card, Choices } from '@/evolution/components';
import { useTask } from '@/hooks/useData';
import type { PickedPhoto } from '@/lib/photos';
import { canvasFor, loadImage } from './browser';
type Status = { ready: boolean; nonce: string };
export function RealisticTryOn({
  person,
  garment,
  onUse,
}: {
  person: PickedPhoto;
  garment: string;
  onUse: (photo: PickedPhoto) => void;
}) {
  const [status, setStatus] = useState<Status | null>(null),
    [category, setCategory] = useState<'tops' | 'bottoms' | 'one-pieces'>('tops');
  const [result, setResult] = useState<string | null>(null),
    [seconds, setSeconds] = useState(0);
  const job = useRef<{ id: string; nonce: string } | null>(null),
    alive = useRef(true),
    cancelled = useRef(false),
    task = useTask();
  const cancel = async () => {
    cancelled.current = true;
    const current = job.current;
    job.current = null;
    if (current)
      await fetch(`/__tryon/cancel?id=${current.id}`, {
        method: 'POST',
        headers: { 'X-Closet-Nonce': current.nonce },
      }).catch(() => {});
  };
  useEffect(() => {
    alive.current = true;
    if (Platform.OS === 'web')
      void fetch('/__tryon/status', { signal: AbortSignal.timeout(3000) })
        .then((r) => r.json())
        .then((value) => {
          if (alive.current) setStatus(value);
        })
        .catch(() => {});
    return () => {
      alive.current = false;
      void cancel();
    };
  }, []);
  if (!status?.ready)
    return (
      <Label className="text-xs text-muted">
        O provador realista está em desenvolvimento. Por enquanto, você pode montar as peças sobre
        sua foto e explorar a composição.
      </Label>
    );
  return (
    <Card title="Simulação experimental">
      <Label className="text-sm">
        Gere uma imagem com a peça selecionada. O processamento fica neste computador e pode levar
        até oito minutos. A imagem pode alterar detalhes e não garante tamanho ou caimento.
      </Label>
      <Choices
        values={{ tops: 'Parte de cima', bottoms: 'Parte de baixo', 'one-pieces': 'Peça única' }}
        value={category}
        onChange={setCategory}
      />
      <Button
        title="Gerar simulação com esta peça"
        busy={task.busy}
        onPress={() =>
          void task.run(
            async () => {
              cancelled.current = false;
              setResult(null);
              setSeconds(0);
              const image = await loadImage(garment),
                ratio = Math.min(1, 1200 / Math.max(image.width, image.height));
              const { canvas, context } = canvasFor(
                Math.round(image.width * ratio),
                Math.round(image.height * ratio),
              );
              context.fillStyle = '#FFFFFF';
              context.fillRect(0, 0, canvas.width, canvas.height);
              context.drawImage(image, 0, 0, canvas.width, canvas.height);
              const response = await fetch('/__tryon/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-Closet-Nonce': status.nonce },
                body: JSON.stringify({
                  person: person.base64,
                  garment: canvas.toDataURL('image/jpeg', 0.9).split(',')[1],
                  category,
                }),
                signal: AbortSignal.timeout(15000),
              });
              const started = await response.json();
              if (!response.ok) throw new Error(started.message);
              job.current = { id: started.id, nonce: status.nonce };
              if (!alive.current || cancelled.current) {
                await cancel();
                return null;
              }
              const at = Date.now();
              while (!cancelled.current && alive.current && Date.now() - at < 490000) {
                await new Promise((resolve) => setTimeout(resolve, 2500));
                if (cancelled.current || !alive.current) break;
                const check = await fetch(`/__tryon/job?id=${started.id}`, {
                  headers: { 'X-Closet-Nonce': status.nonce },
                  signal: AbortSignal.timeout(10000),
                });
                const body = await check.json();
                if (!check.ok) throw new Error(body.message);
                setSeconds(Math.round((Date.now() - at) / 1000));
                if (body.state === 'done') {
                  job.current = null;
                  if (body.error) throw new Error(body.error);
                  return `data:image/jpeg;base64,${body.base64}`;
                }
              }
              await cancel();
              return null;
            },
            (uri) => {
              if (uri) setResult(uri);
            },
          )
        }
      />
      {task.busy && (
        <>
          <Label className="text-xs">
            Processando há {seconds}s. Sua foto original está preservada.
          </Label>
          <Button title="Cancelar simulação" secondary onPress={() => void cancel()} />
        </>
      )}
      <Notice message={task.error} />
      {result && (
        <>
          <View style={{ width: '100%', aspectRatio: 3 / 4, overflow: 'hidden', borderRadius: 18 }}>
            <Photo uri={result} contain label="Simulação experimental de roupa" />
          </View>
          <Label className="text-xs text-muted">
            Resultado gerado para comparação privada. Confira roupa, rosto e proporções antes de
            usá-lo como referência.
          </Label>
          <Button
            title="Usar como base para experimentar outra peça"
            secondary
            onPress={() => onUse({ uri: result, base64: result.split(',')[1]! })}
          />
          <Button title="Descartar imagem gerada" secondary small onPress={() => setResult(null)} />
        </>
      )}
    </Card>
  );
}
