import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { Switch, View } from 'react-native';
import { Button, Label, Loading, Notice } from '@/components/ui';
import { ConfirmAction } from '@/components/ConfirmAction';
import { Progress } from '@/components/motion';
import { ItemForm } from '@/components/ItemForm';
import { pickPhotoBatch } from '@/lib/photos';
import { clearCapture, readCapture, writeCapture, type CaptureQueue } from '@/lib/capture-queue';
import { useAuth } from '@/stores/auth';
import { useTask } from '@/hooks/useData';
import { Card } from './components';
export function ClosetSprint() {
  const [queue, setQueue] = useState<CaptureQueue>({ photos: [], index: 0 });
  const [ready, setReady] = useState(false),
    [reuse, setReuse] = useState(true);
  const [warning, setWarning] = useState<string | null>(null),
    task = useTask();
  const owner = useAuth((s) => s.session?.user.id);
  useEffect(() => {
    let alive = true;
    if (owner)
      void readCapture(owner)
        .then((q) => {
          if (alive) {
            setQueue(q);
            setReady(true);
          }
        })
        .catch(() => {
          if (alive) {
            setWarning('Não foi possível recuperar a sequência neste aparelho.');
            setReady(true);
          }
        });
    return () => {
      alive = false;
    };
  }, [owner]);
  async function persist(next: CaptureQueue) {
    if (!owner || owner !== useAuth.getState().session?.user.id) return;
    await writeCapture(owner, next);
    setQueue(next);
  }
  if (!ready) return <Loading />;
  return (
    <>
      <Card title="Seu closet, aos poucos">
        <Label>
          Escolha até dez fotos, uma peça por foto. A sequência fica guardada neste aparelho para
          continuar depois.
        </Label>
        <Label className="text-xs text-muted">
          As fotos pendentes não são publicadas. Ao sair da conta, a sequência local é descartada;
          as peças confirmadas continuam no closet.
        </Label>
        {!queue.photos.length ? (
          <Button
            title="Escolher fotos das minhas peças"
            icon="image"
            busy={task.busy}
            onPress={() =>
              void task.run(async () => {
                const photos = await pickPhotoBatch();
                if (photos.length) await persist({ photos, index: 0 });
              })
            }
          />
        ) : (
          <>
            <Progress
              value={queue.index / queue.photos.length}
              label="Peças confirmadas nesta sequência"
            />
            <Label>
              {queue.index} de {queue.photos.length} peças guardadas
            </Label>
            <View className="flex-row items-center gap-3">
              <Switch
                accessibilityLabel="Reutilizar atributos da peça anterior"
                value={reuse}
                onValueChange={setReuse}
              />
              <Label className="flex-1 text-sm">
                Reutilizar categoria, cor, tamanho e marca na próxima peça
              </Label>
            </View>
            <ConfirmAction
              label="Descartar fotos pendentes"
              description="As peças já confirmadas serão preservadas. Descartar a sequência neste aparelho?"
              onConfirm={() =>
                void task.run(async () => {
                  if (owner) await clearCapture(owner);
                  setQueue({ photos: [], index: 0 });
                })
              }
            />
          </>
        )}
        <Notice message={task.error || warning} />
      </Card>
      {queue.photos.length > queue.index ? (
        <ItemForm
          key={queue.index}
          initialPhoto={queue.photos[queue.index]}
          initialDefaults={reuse ? queue.defaults : undefined}
          onSaved={(result, form) => {
            const next = {
              ...queue,
              index: queue.index + 1,
              defaults: form
                ? {
                    category: form.category,
                    color: form.color,
                    size: form.size,
                    fit: form.fit,
                    brand: form.brand,
                  }
                : undefined,
            };
            setQueue(next);
            setWarning(result.warning || null);
            void persist(next).catch(() =>
              setWarning(
                'Peça salva, mas a posição da sequência não foi atualizada neste aparelho. Confira as peças antes de retomar após fechar o app.',
              ),
            );
          }}
        />
      ) : queue.photos.length > 0 ? (
        <Card title="Peças adicionadas">
          <Label>Suas peças já fazem parte do closet.</Label>
          <Button
            title="Ver minhas três ideias"
            onPress={() => router.replace({ pathname: '/style', params: { view: 'today' } })}
          />
          <Button
            title="Adicionar mais fotos"
            secondary
            onPress={() =>
              void task.run(async () => {
                if (owner) await clearCapture(owner);
                setQueue({ photos: [], index: 0 });
              })
            }
          />
        </Card>
      ) : null}
    </>
  );
}
