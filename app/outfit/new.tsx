import { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { createOutfit } from '@/lib/api';
import type { PickedPhoto } from '@/lib/photos';
import { useTask } from '@/hooks/useData';
import { useAuth } from '@/stores/auth';
import { ItemBrowser } from '@/components/ItemBrowser';
import { PhotoField } from '@/components/PhotoField';
import { Button, Field, Label, Notice, Page, PageTitle, TopBar } from '@/components/ui';
export default function NewOutfitScreen() {
  const [selected, setSelected] = useState<string[]>([]);
  const [name, setName] = useState('');
  const [photo, setPhoto] = useState<PickedPhoto | null>(null);
  const [step, setStep] = useState(1);
  const task = useTask();
  const { online } = useAuth();
  if (step === 2)
    return (
      <Page>
        <TopBar back title="Novo outfit" />
            <Button title="Abrir editor visual" secondary icon="layers" onPress={() => router.push('/outfit/editor')} />
        <PageTitle title="Salvar look" />
        <Field
          label="Nome · opcional"
          placeholder="Ex.: Domingo sem pressa"
          maxLength={100}
          value={name}
          onChangeText={setName}
          editable={!task.busy}
        />
        <PhotoField
          photo={photo}
          onChange={(value) => setPhoto(value)}
          disabled={task.busy || !online}
        />
        <Notice
          kind="info"
          message={`${selected.length} peças selecionadas. A composição ficará fixa para preservar seu histórico. Para outra combinação, crie um novo outfit.`}
        />
        <Notice message={task.error} />
        <Button
          title="Salvar meu outfit"
          icon="check"
          busy={task.busy}
          disabled={!online}
          onPress={() => {
            void task.run(
              () => createOutfit(selected, name, photo),
              (result) => router.replace(`/outfit/${result.id}`),
            );
          }}
        />
        <Button
          title="Rever peças selecionadas"
          secondary
          disabled={task.busy}
          onPress={() => setStep(1)}
        />
      </Page>
    );
  return (
    <Page scroll={false}>
      <ItemBrowser
        selected={selected}
        onSelect={(item) =>
          setSelected((previous) =>
            previous.includes(item.id)
              ? previous.filter((id) => id !== item.id)
              : previous.length < 30
                ? [...previous, item.id]
                : previous,
          )
        }
        header={
          <>
            <TopBar back title="Novo outfit" />
            <Button title="Abrir editor visual" secondary icon="layers" onPress={() => router.push('/outfit/editor')} />
            <PageTitle
              title="Quais peças vão juntas?"
              subtitle="Toque nas peças para compor seu outfit. Selecione até 30."
            />
          </>
        }
      />
      <View className="gap-3 border-t border-line bg-canvas px-6 pb-8 pt-4">
        <Label className="text-center text-xs text-muted">
          {selected.length} {selected.length === 1 ? 'peça selecionada' : 'peças selecionadas'}
        </Label>
        <Button
          title="Continuar"
          icon="arrow-right"
          disabled={selected.length === 0 || !online}
          onPress={() => setStep(2)}
        />
      </View>
    </Page>
  );
}
