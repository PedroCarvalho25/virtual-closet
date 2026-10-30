import { useState } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import {
  categories,
  fits,
  type ItemInput,
  type WardrobeItem,
  type Category,
  type Fit,
} from '@/types/domain';
import { saveItem } from '@/lib/api';
import type { PickedPhoto } from '@/lib/photos';
import { useTask } from '@/hooks/useData';
import { useAuth } from '@/stores/auth';
import { Button, Chip, Field, Label, Notice } from './ui';
import { PhotoField } from './PhotoField';
export function ItemForm({
  existing = null,
  initialPhoto = null,
  initialCategory = 'camiseta',
  onSaved,
  initialDefaults,
}: {
  existing?: WardrobeItem | null;
  initialPhoto?: PickedPhoto | null;
  initialCategory?: Category;
  initialDefaults?: Partial<ItemInput>;
  onSaved?: (result: { id: string; warning?: string | null }, form?: ItemInput) => void;
}) {
  const [form, setForm] = useState<ItemInput>(
    existing || {
      name: '',
      category: initialCategory,
      color: '',
      size: '',
      fit: null,
      brand: null,
      ...initialDefaults,
    },
  );
  const [detailsOpen, setDetailsOpen] = useState(!!existing?.fit || !!existing?.brand);
  const [photo, setPhoto] = useState<PickedPhoto | null>(initialPhoto);
  const [removed, setRemoved] = useState(false);
  const task = useTask();
  const { online } = useAuth();
  const change = <K extends keyof ItemInput>(key: K, value: ItemInput[K]) =>
    setForm((previous) => ({ ...previous, [key]: value }));
  const save = () => {
    void task.run(
      () => saveItem(form, existing, photo, removed),
      (result) =>
        onSaved
          ? onSaved(result, form)
          : router.replace({
              pathname: '/item/[id]',
              params: {
                id: result.id,
                notice: result.warning || 'Peça salva no seu guarda-roupa.',
              },
            }),
    );
  };
  return (
    <View className="gap-6">
      <PhotoField
        photo={photo}
        path={removed ? null : existing?.photo_path}
        onChange={(value, remove) => {
          setPhoto(value);
          setRemoved(remove);
        }}
        disabled={task.busy || !online}
      />
      <Field
        label="Nome da peça *"
        placeholder="Ex.: Camiseta branca favorita"
        maxLength={100}
        value={form.name}
        onChangeText={(v) => change('name', v)}
        editable={!task.busy}
      />
      <View className="gap-3">
        <Text className="font-medium text-xs text-ink">Categoria *</Text>
        <View className="flex-row flex-wrap gap-2">
          {Object.entries(categories).map(([value, label]) => (
            <Chip
              key={value}
              label={label}
              selected={form.category === value}
              onPress={() => {
                if (!task.busy)
                  setForm((previous) => ({
                    ...previous,
                    category: value as Category,
                    fit: value === 'tenis' ? null : previous.fit,
                  }));
              }}
            />
          ))}
        </View>
      </View>
      <View className="flex-row gap-4">
        <View className="flex-1">
          <Field
            label="Cor *"
            placeholder="Ex.: Off-white"
            maxLength={50}
            value={form.color}
            onChangeText={(v) => change('color', v)}
            editable={!task.busy}
          />
        </View>
        <View className="flex-1">
          <Field
            label={form.category === 'tenis' ? 'Numeração do calçado *' : 'Tamanho *'}
            placeholder={form.category === 'tenis' ? 'Ex.: 40 BR' : 'Ex.: M'}
            maxLength={30}
            value={form.size}
            onChangeText={(v) => change('size', v)}
            editable={!task.busy}
          />
        </View>
      </View>
      <Button
        title={detailsOpen ? 'Ocultar detalhes opcionais' : 'Adicionar marca ou caimento'}
        secondary
        small
        icon={detailsOpen ? 'minus' : 'plus'}
        disabled={task.busy}
        onPress={() => setDetailsOpen(!detailsOpen)}
      />
      {detailsOpen && form.category !== 'tenis' && (
        <View className="gap-3">
          <Label className="font-medium text-xs">Caimento · opcional</Label>
          <View className="flex-row flex-wrap gap-2">
            <Chip
              label="Não informado"
              selected={!form.fit}
              onPress={() => {
                if (!task.busy) change('fit', null);
              }}
            />
            {Object.entries(fits).map(([value, label]) => (
              <Chip
                key={value}
                label={label}
                selected={form.fit === value}
                onPress={() => {
                  if (!task.busy) change('fit', value as Fit);
                }}
              />
            ))}
          </View>
        </View>
      )}
      {detailsOpen && (
        <Field
          label="Marca · opcional"
          placeholder="Ex.: Sua marca favorita"
          maxLength={80}
          value={form.brand || ''}
          onChangeText={(v) => change('brand', v)}
          editable={!task.busy}
        />
      )}
      <Label className="text-xs text-muted">
        * Campos obrigatórios. A foto pode ficar para depois.
      </Label>
      <Notice message={task.error} />
      <Button
        title={
          existing ? 'Salvar alterações' : onSaved ? 'Guardar e continuar' : 'Guardar minha peça'
        }
        icon="check"
        busy={task.busy}
        disabled={!online}
        onPress={save}
      />
    </View>
  );
}
