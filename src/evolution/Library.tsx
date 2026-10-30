import { useState } from 'react';
import { Linking, Text, View } from 'react-native';
import { router } from 'expo-router';
import * as Crypto from 'expo-crypto';
import { Button, Field, Label, Notice } from '@/components/ui';
import { ConfirmAction } from '@/components/ConfirmAction';
import { OutfitArtwork, OutfitCard } from '@/components/cards';
import { categories, type Category } from '@/types/domain';
import { createOutfit } from '@/lib/api';
import { civilDate } from '@/lib/dates';
import { useTask } from '@/hooks/useData';
import { useStudio } from '@/preview/store';
import { Card, Choices, EmptyLibrary, ItemChoices, type StyleProps } from './components';
import { remixRecipe, roleOf, sourceLink } from './core';
import { slotLabels, type Recipe } from './types';
import { recipeVersions } from './discovery-model';
const newRecipe = (): Recipe => ({
  id: Crypto.randomUUID(),
  title: '',
  folder: 'Minhas inspirações',
  source: '',
  note: '',
  slots: [],
});
export function Inspirations({
  data,
  e,
  act,
  busy,
  startCreating = false,
}: StyleProps & { startCreating?: boolean }) {
  const [draft, setDraft] = useState<Recipe | null>(() => (startCreating ? newRecipe() : null)),
    [category, setCategory] = useState<Category>('camiseta'),
    [color, setColor] = useState(''),
    [filter, setFilter] = useState('Tudo'),
    [error, setError] = useState<string | null>(null),
    [saved, setSaved] = useState(false);
  const folders = Object.fromEntries(
    ['Tudo', ...new Set(e.recipes.map((r) => r.folder || 'Minhas inspirações'))].map((f) => [f, f]),
  );
  async function save() {
    try {
      if (!draft?.title.trim() || !draft.slots.length)
        throw new Error('Dê um nome e adicione pelo menos uma peça à receita.');
      sourceLink(draft.source);
      if (await act({ action: 'recipe', recipe: draft })) {
        setDraft(null);
        setError(null);
        setSaved(true);
        if (startCreating) router.setParams({ create: undefined });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Confira a inspiração.');
    }
  }
  if (draft)
    return (
      <Card title="Nova inspiração">
        <Label className="text-xs text-muted">
          Salve referências mesmo sem ter as peças no closet.
        </Label>
        <Field
          label="Nome da inspiração"
          value={draft.title}
          onChangeText={(title) => setDraft({ ...draft, title })}
          maxLength={80}
        />
        <Field
          label="Pasta"
          value={draft.folder}
          onChangeText={(folder) => setDraft({ ...draft, folder })}
          maxLength={50}
        />
        <Field
          label="Link da referência · opcional"
          value={draft.source}
          onChangeText={(source) => setDraft({ ...draft, source })}
          autoCapitalize="none"
          maxLength={1000}
        />
        <Field
          label="O que você gostou nesse look?"
          value={draft.note}
          onChangeText={(note) => setDraft({ ...draft, note })}
          maxLength={500}
          multiline
        />
        <Text className="font-semibold text-base text-ink">As peças da receita</Text>
        {draft.slots.map((slot, index) => (
          <View key={index} className="gap-2 rounded-2xl bg-sage p-3">
            <Label className="text-sm">
              {categories[slot.category]} · {slot.color || 'Qualquer cor'}
            </Label>
            <Button
              title={`Remover peça ${index + 1}`}
              secondary
              small
              onPress={() =>
                setDraft({ ...draft, slots: draft.slots.filter((_, i) => i !== index) })
              }
            />
          </View>
        ))}
        <Choices values={categories} value={category} onChange={setCategory} />
        <Field
          label="Cor da peça de referência"
          value={color}
          onChangeText={setColor}
          maxLength={50}
        />
        <Button
          title="Adicionar peça à receita"
          icon="plus"
          secondary
          disabled={draft.slots.length >= 8}
          onPress={() => {
            setDraft({
              ...draft,
              slots: [...draft.slots, { role: roleOf(category), category, color: color.trim() }],
            });
            setColor('');
          }}
        />
        <Notice message={error} />
        <Button title="Guardar inspiração" busy={busy} onPress={() => void save()} />
        <Button
          title="Cancelar inspiração"
          secondary
          onPress={() => {
            setDraft(null);
            if (startCreating) router.setParams({ create: undefined });
          }}
        />
      </Card>
    );
  return (
    <>
      {saved && <Notice kind="success" message="Inspiração salva." />}
      <Button title="Nova inspiração" icon="plus" onPress={() => setDraft(newRecipe())} />
      <Choices values={folders} value={filter} onChange={setFilter} />
      {!e.recipes.length && (
        <EmptyLibrary
          title="Guarde a ideia de um look, sua origem e os detalhes que fazem você gostar dele."
          onCreate={() => setDraft(newRecipe())}
        />
      )}
      {e.recipes
        .filter((r) => filter === 'Tudo' || r.folder === filter)
        .map((r) => (
          <Card key={r.id} title={r.title}>
            <RecipePreview recipe={r} data={data} e={e} />
            <Label className="text-xs text-muted">
              {r.folder} · {r.slots.length} peças de referência
            </Label>
            <Label className="text-sm">{r.note}</Label>
            <View className="flex-row flex-wrap gap-2">
              {r.slots.map((s, i) => (
                <View key={i} className="rounded-xl bg-sage px-3 py-2">
                  <Label className="text-xs">
                    {categories[s.category]} · {s.color || 'Livre'}
                  </Label>
                </View>
              ))}
            </View>
            <Button
              title={`Remix de ${r.title}`}
              icon="shuffle"
              onPress={() =>
                router.push({ pathname: '/style', params: { view: 'remix', recipe: r.id } })
              }
            />
            {r.source && (
              <Button
                title="Abrir referência original"
                secondary
                onPress={() =>
                  void Linking.openURL(r.source).catch(() =>
                    setError('Não foi possível abrir esse link.'),
                  )
                }
              />
            )}
            <Button
              title={`Editar ${r.title}`}
              secondary
              onPress={() => setDraft({ ...r, slots: r.slots.map((s) => ({ ...s })) })}
            />
            <RecipeHistory recipe={r} data={data} e={e} />
            <ConfirmAction
              label={`Remover inspiração ${r.title}`}
              description="Remover a receita? Os looks que você já criou continuam no closet."
              busy={busy}
              onConfirm={() => void act({ action: 'remove_recipe', id: r.id })}
            />
          </Card>
        ))}
      <Notice message={error} />
      {!!e.recipes.length && !data.items.length && (
        <Button
          title="Voltar ao início"
          icon="arrow-right"
          secondary
          onPress={() => router.push('/discover')}
        />
      )}
    </>
  );
}
function RecipePreview({ recipe, data, e }: Pick<StyleProps, 'data' | 'e'> & { recipe: Recipe }) {
  const items = [
    ...new Map(
      remixRecipe(recipe, data, e).flatMap((slot) =>
        slot.chosen ? [[slot.chosen.id, slot.chosen] as const] : [],
      ),
    ).values(),
  ];
  if (!items.length) return null;
  return (
    <View className="gap-2">
      <View style={{ height: 240, borderRadius: 20, overflow: 'hidden' }}>
        <OutfitArtwork outfit={{ items, photo_path: null }} />
      </View>
      <Label className="text-xs text-muted">Uma possibilidade com peças do seu closet</Label>
    </View>
  );
}
function RecipeHistory({ recipe, data, e }: Pick<StyleProps, 'data' | 'e'> & { recipe: Recipe }) {
  const [expanded, setExpanded] = useState(false);
  const versions = recipeVersions(data, e, recipe.id);
  if (!versions.length) return null;
  return (
    <View className="gap-3">
      <Button
        title={`${expanded ? 'Ocultar' : 'Ver'} versões de ${recipe.title} · ${versions.length}`}
        secondary
        icon="git-branch"
        onPress={() => setExpanded(!expanded)}
      />
      {expanded && (
        <View className="gap-3 rounded-2xl bg-sage p-3">
          <Label className="text-xs text-muted">
            Inspiração → remixes guardados no seu closet. O histórico de uso continua separado.
          </Label>
          {versions.map((outfit) => (
            <OutfitCard key={outfit.id} outfit={outfit} />
          ))}
        </View>
      )}
    </View>
  );
}
export function Remix({ data, e, act, busy, recipeId }: StyleProps & { recipeId?: string }) {
  const [selected, setSelected] = useState(recipeId || e.recipes[0]?.id || ''),
    [overrides, setOverrides] = useState<Record<number, string>>({});
  const recipe = e.recipes.find((r) => r.id === selected) || e.recipes[0],
    task = useTask();
  if (!recipe)
    return (
      <EmptyLibrary
        title="Primeiro, guarde uma inspiração com as peças que compõem o look."
        onCreate={() => router.replace({ pathname: '/style', params: { view: 'inspirations' } })}
      />
    );
  const slots = remixRecipe(recipe, data, e),
    chosen = slots.map((s, index) =>
      overrides[index] ? s.options.find((i) => i.id === overrides[index]) || s.chosen : s.chosen,
    ),
    items = chosen.filter((i) => i !== null);
  const valid =
    items.length === slots.length && new Set(items.map((i) => i.id)).size === items.length;
  return (
    <>
      <Choices
        values={Object.fromEntries(e.recipes.map((r) => [r.id, r.title]))}
        value={recipe.id}
        onChange={(id) => {
          setSelected(id);
          setOverrides({});
        }}
      />
      <Card title="Remixar inspiração">
        <Label className="text-sm text-muted">
          Buscamos função, categoria e cor nas suas peças disponíveis. Você decide a composição
          final.
        </Label>
        {items.length > 0 && <MotionCollage items={items} />}
        {slots.map(({ slot, options, chosen: base }, index) => (
          <View key={index} className="gap-3">
            <Label className="font-medium text-sm">
              {slotLabels[slot.role]} · {slot.color || 'Cor livre'}
            </Label>
            {options.length ? (
              <ItemChoices
                items={options}
                selected={chosen[index] ? [chosen[index]!.id] : []}
                onSelect={(id) => setOverrides({ ...overrides, [index]: id })}
              />
            ) : (
              <Label className="text-xs text-muted">
                Ainda não há uma peça disponível para esse papel. Adicione uma peça ao closet ou
                ajuste a receita.
              </Label>
            )}
            {base && base.category !== slot.category && (
              <Label className="text-xs text-muted">
                Alternativa pela função da peça; a categoria original é diferente.
              </Label>
            )}
          </View>
        ))}
        {!valid && (
          <Notice
            kind="info"
            message="Complete cada parte com uma peça diferente para guardar o remix."
          />
        )}
        <Notice message={task.error} />
        <Button
          title="Guardar meu remix"
          icon="shuffle"
          busy={task.busy}
          disabled={!valid || busy}
          onPress={() =>
            void task.run(
              async () => {
                const result = await createOutfit(
                  items.map((i) => i.id),
                  `Remix · ${recipe.title}`.slice(0, 100),
                  null,
                );
                await useStudio.getState().load();
                const learned = await act({
                  action: 'decision',
                  decision: {
                    id: Crypto.randomUUID(),
                    date: civilDate(),
                    kind: 'accepted',
                    reason: 'Remix',
                    itemIds: items.map((i) => i.id),
                    outfitId: result.id,
                    recipeId: recipe.id,
                  },
                });
                return {
                  ...result,
                  notice: learned
                    ? ''
                    : 'Remix guardado. Não foi possível vincular sua origem na memória de estilo.',
                };
              },
              (r) =>
                router.push({ pathname: '/outfit/[id]', params: { id: r.id, notice: r.notice } }),
            )
          }
        />
      </Card>
    </>
  );
}
function MotionCollage({ items }: { items: StyleProps['data']['items'] }) {
  return (
    <View style={{ height: 260, borderRadius: 22, overflow: 'hidden' }}>
      <OutfitArtwork outfit={{ items, photo_path: null }} />
    </View>
  );
}
export { Wishlist } from '@/wishes/Library';
