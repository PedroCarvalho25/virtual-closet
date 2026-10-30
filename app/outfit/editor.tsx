import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { router, useLocalSearchParams } from 'expo-router';
import { Button, Chip, Field, Label, Loading, Notice, Page, TopBar } from '@/components/ui';
import { Disclosure } from '@/components/Disclosure';
import { CategoryField } from '@/wishes/CategoryField';
import { ConfirmAction } from '@/components/ConfirmAction';
import { Card, Choices, ItemChoices } from '@/evolution/components';
import { Canvas } from '@/atelier/Canvas';
import { atelier } from '@/atelier/api';
import { changeLayers, clampLayer, ownItems, redo, undo, type History } from '@/atelier/model';
import type { Design, Layer } from '@/atelier/types';
import { fetchOutfit } from '@/lib/api';
import { useStudioScreen } from '@/preview/store';
import { useTask } from '@/hooks/useData';
import { useAuth } from '@/stores/auth';
import { closetCache } from '@/stores/cache';
import { getPublication } from '@/social/api';
import type { Publication } from '@/social/types';
import { type Category } from '@/types/domain';
import { freshEvolution } from '@/evolution/types';
import { remixRecipe, roleOf } from '@/evolution/core';

export default function EditorScreen() {
  const params = useLocalSearchParams<{
    id?: string;
    source?: string;
    outfit?: string;
    wish?: string;
    items?: string;
  }>();
  const studio = useStudioScreen(),
    task = useTask();
  const owner = useAuth((s) => s.session?.user.id);
  const key = `vc-draft:${owner}:${params.id || params.source || params.outfit || (params.wish ? `wish:${params.wish}:${params.items || ''}` : 'new')}`;
  const [design, setDesign] = useState<Design | null>(null);
  const [history, setHistory] = useState<History>({ past: [], present: [], future: [] });
  const [selected, setSelected] = useState('');
  const [publications, setPublications] = useState<Publication[]>([]);
  const [versions, setVersions] = useState<Design[]>([]),
    [compare, setCompare] = useState('');
  const [category, setCategory] = useState<Category>('camiseta'),
    [color, setColor] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const loaded = useRef(false);
  useEffect(() => {
    let alive = true;
    loaded.current = false;
    void (async () => {
      const all = await atelier();
      let d = params.id ? all.designs.find((v) => v.id === params.id) : undefined;
      if (params.id && !d) throw new Error('Este rascunho não está disponível.');
      const local = await AsyncStorage.getItem(key);
      if (local && !d?.outfitId) {
        const draft = JSON.parse(local) as Design;
        const remote = all.designs.find((v) => v.id === draft.id);
        if (remote?.outfitId) d = remote;
        else if (remote && draft.revision === remote.revision) d = draft;
        else if (remote) d = remote;
        else if (draft.revision === 0) d = draft;
      }
      d ||= {
        id: Crypto.randomUUID(),
        title: 'Minha composição',
        note: '',
        layers: [],
        sourceId: params.source || null,
        parentId: null,
        outfitId: null,
        revision: 0,
      };
      if (params.outfit && !d.layers.length) {
        const original = await fetchOutfit(params.outfit);
        d = {
          ...d,
          title: `${original.name || 'Meu look'} · nova versão`.slice(0, 100),
          layers: original.items
            .filter((item) => !item.archived_at)
            .map((item, i) =>
              clampLayer({
                id: Crypto.randomUUID(),
                kind: 'item',
                target: item.id,
                x: 15 + (i % 3) * 105,
                y: 25 + Math.floor(i / 3) * 130,
                width: 100,
                height: 130,
                rotation: 0,
              }),
            ),
        };
      }
      if (params.wish && !d.layers.length) {
        const own = new Set((params.items || '').split(',').filter(Boolean));
        const store = await import('@/preview/store');
        if (!store.useStudio.getState().data) await store.useStudio.getState().load();
        const data = store.useStudio.getState().data;
        const wish = data?.evolution?.wishes.find((w) => w.id === params.wish);
        if (!wish) throw new Error('Este desejo não está disponível. Abra sua lista novamente.');
        const chosen = (data?.items || []).filter(
          (i) =>
            own.has(i.id) &&
            !i.archived_at &&
            (!data?.evolution?.details[i.id] ||
              data.evolution.details[i.id]?.state === 'available'),
        );
        d = {
          ...d,
          title: wish.title,
          sourceId: wish.media?.publicationId || null,
          layers: [
            {
              id: Crypto.randomUUID(),
              kind: 'wish',
              target: wish.id,
              x: 18,
              y: 30,
              width: 170,
              height: 260,
              rotation: -3,
            },
            ...chosen
              .slice(0, 4)
              .map((item, i) =>
                clampLayer({
                  id: Crypto.randomUUID(),
                  kind: 'item',
                  target: item.id,
                  x: 195,
                  y: 18 + i * 110,
                  width: 135,
                  height: 145,
                  rotation: i % 2 ? 3 : 0,
                }),
              ),
          ],
        };
      }
      const refs = [
        ...new Set(
          [
            d.sourceId,
            ...d.layers.filter((l) => l.kind === 'reference').map((l) => l.target),
          ].filter(Boolean),
        ),
      ] as string[];
      const photos = (
        await Promise.all(refs.map((id) => getPublication(id).catch(() => null)))
      ).filter(Boolean) as Publication[];
      if (!alive) return;
      setPublications(photos);
      setVersions(all.designs);
      setDesign(d);
      setHistory({ past: [], present: d.layers, future: [] });
      loaded.current = true;
    })().catch((e) => {
      if (alive) setLocalError(e instanceof Error ? e.message : 'Não foi possível abrir o ateliê.');
    });
    return () => {
      alive = false;
      loaded.current = false;
    };
  }, [key, params.id, params.source, params.outfit, params.wish, params.items]);
  useEffect(() => {
    if (!design || !loaded.current || design.outfitId) return;
    const timer = setTimeout(() => {
      if (owner !== useAuth.getState().session?.user.id) return;
      void AsyncStorage.setItem(key, JSON.stringify({ ...design, layers: history.present })).catch(
        () =>
          setLocalError(
            'Não foi possível guardar o rascunho neste aparelho. Use Salvar rascunho para guardar na sua conta.',
          ),
      );
    }, 500);
    return () => clearTimeout(timer);
  }, [design, history.present, key, owner]);
  useEffect(() => {
    const version = versions.find((v) => v.id === compare);
    const missing = [
      ...new Set(
        version?.layers
          .filter((l) => l.kind === 'reference' && !publications.some((p) => p.id === l.target))
          .map((l) => l.target) || [],
      ),
    ];
    if (!missing.length) return;
    let alive = true;
    void Promise.all(missing.map((id) => getPublication(id).catch(() => null))).then((rows) => {
      if (alive && rows.some(Boolean))
        setPublications((current) => [
          ...new Map(
            [...current, ...(rows.filter(Boolean) as Publication[])].map((p) => [p.id, p]),
          ).values(),
        ]);
    });
    return () => {
      alive = false;
    };
  }, [compare, versions, publications]);
  if (!design || !studio.data)
    return (
      <Page>
        <TopBar back title="Ateliê visual" />
        <Notice message={localError || studio.error} />
        {!localError && !studio.error && <Loading />}
      </Page>
    );
  const editable = !design.outfitId;
  const layer = history.present.find((l) => l.id === selected);
  const source = publications.find((p) => p.id === design.sourceId);
  const e = studio.data.evolution || freshEvolution();
  const available = studio.data.items.filter(
    (i) => !i.archived_at && (!e.details[i.id] || e.details[i.id]?.state === 'available'),
  );
  const update = (layers: Layer[]) => setHistory((h) => changeLayers(h, layers));
  const alter = (change: Partial<Layer>) => {
    if (!layer) return;
    const reference = publications.find((p) => p.id === layer.target);
    if (reference && change.crop)
      change = {
        ...change,
        height:
          (layer.width * reference.height * change.crop.height) /
          (reference.width * change.crop.width),
      };
    update(history.present.map((l) => (l.id === layer.id ? clampLayer({ ...l, ...change }) : l)));
  };
  const add = (kind: Layer['kind'], target: string) => {
    if (history.present.length >= 30) return;
    const id = Crypto.randomUUID(),
      n = history.present.length;
    const reference = kind === 'reference' ? publications.find((p) => p.id === target) : null;
    update([
      ...history.present,
      clampLayer({
        id,
        kind,
        target,
        x: 20 + (n % 3) * 85,
        y: 30 + (n % 4) * 70,
        width: 130,
        height: reference ? (130 * reference.height) / reference.width : 170,
        rotation: 0,
      }),
    ]);
    setSelected(id);
  };
  const save = async (): Promise<Design> => {
    const result = await atelier<Design>({
      action: 'save_design',
      id: design.id,
      design: { ...design, layers: history.present },
    });
    setDesign(result);
    setVersions((v) => [result, ...v.filter((d) => d.id !== result.id)]);
    await AsyncStorage.setItem(key, JSON.stringify(result));
    return result;
  };
  const variant = versions.find((v) => v.id === compare);
  const recipe = {
    id: Crypto.randomUUID(),
    title: design.title.slice(0, 80),
    folder: 'Do Mural',
    source: source?.sourceUrl || '',
    note: design.note.slice(0, 500),
    slots: [{ role: roleOf(category), category, color }],
  };
  const suggestions = remixRecipe(recipe, studio.data, e)[0];
  return (
    <Page>
      <TopBar back title="Ateliê visual" />
      <Notice message={localError || task.error} />
      <Notice message={task.success} kind="success" />
      <Field
        label="Nome da composição"
        value={design.title}
        maxLength={100}
        editable={editable}
        onChangeText={(title) => setDesign({ ...design, title })}
      />
      <Canvas
        layers={history.present}
        items={studio.data.items}
        publications={publications}
        wishes={e.wishes}
        selected={selected}
        onSelect={editable ? setSelected : undefined}
        onMove={
          editable
            ? (changed) => update(history.present.map((l) => (l.id === changed.id ? changed : l)))
            : undefined
        }
      />
      {editable && (
        <>
          <Button
            title="Salvar rascunho na minha conta"
            icon="save"
            busy={task.busy}
            onPress={() =>
              void task.run(save, () => task.setSuccess('Rascunho salvo na sua conta.'))
            }
          />
          <Label className="text-xs text-muted">
            O look guarda só as peças que você tem. Seu desejo fica nesta composição.
          </Label>
          <Button
            title="Salvar minhas peças como look"
            secondary
            disabled={!ownItems({ ...design, layers: history.present }).length}
            busy={task.busy}
            onPress={() =>
              void task.run(
                async () => {
                  const saved = await save();
                  const result = await atelier<Design>({
                    action: 'save_outfit',
                    id: saved.id,
                    revision: saved.revision,
                  });
                  closetCache.invalidate();
                  setDesign(result);
                  await AsyncStorage.setItem(key, JSON.stringify(result));
                  return result;
                },
                () =>
                  task.setSuccess(
                    'Look salvo. A composição está preservada e você pode criar outra versão.',
                  ),
              )
            }
          />
        </>
      )}
      <Label className="text-xs text-muted">
        {editable
          ? 'Arraste para posicionar. Os controles abaixo também funcionam sem gestos.'
          : 'Composição preservada com o look. Crie uma versão para experimentar.'}{' '}
        Referências são recortes visuais; não representam caimento no corpo.
      </Label>
      {editable && (
        <View className="flex-row flex-wrap gap-2">
          <Button
            small
            secondary
            title="Desfazer"
            disabled={!history.past.length}
            onPress={() => setHistory(undo)}
          />
          <Button
            small
            secondary
            title="Refazer"
            disabled={!history.future.length}
            onPress={() => setHistory(redo)}
          />
        </View>
      )}
      {editable && layer && (
        <Card title="Ajustar elemento">
          <View className="flex-row flex-wrap gap-2">
            <Button small secondary title="Esquerda" onPress={() => alter({ x: layer.x - 10 })} />
            <Button small secondary title="Direita" onPress={() => alter({ x: layer.x + 10 })} />
            <Button small secondary title="Subir" onPress={() => alter({ y: layer.y - 10 })} />
            <Button small secondary title="Descer" onPress={() => alter({ y: layer.y + 10 })} />
            <Button
              small
              secondary
              title="Ampliar"
              onPress={() => alter({ width: layer.width * 1.1, height: layer.height * 1.1 })}
            />
            <Button
              small
              secondary
              title="Reduzir"
              onPress={() => alter({ width: layer.width / 1.1, height: layer.height / 1.1 })}
            />
            <Button
              small
              secondary
              title="Girar à esquerda"
              onPress={() => alter({ rotation: layer.rotation - 15 })}
            />
            <Button
              small
              secondary
              title="Girar à direita"
              onPress={() => alter({ rotation: layer.rotation + 15 })}
            />
            <Button
              small
              secondary
              title="Trazer à frente"
              onPress={() => update([...history.present.filter((l) => l.id !== layer.id), layer])}
            />
            <Button
              small
              secondary
              title="Enviar para trás"
              onPress={() => update([layer, ...history.present.filter((l) => l.id !== layer.id)])}
            />
            <Button
              small
              secondary
              title="Remover elemento"
              onPress={() => {
                update(history.present.filter((l) => l.id !== layer.id));
                setSelected('');
              }}
            />
          </View>
          {layer.kind === 'reference' && (
            <>
              <Label className="text-sm">Recorte da referência</Label>
              <View className="flex-row flex-wrap gap-2">
                {[
                  ['Foto inteira', 0, 1],
                  ['Parte de cima', 0.15, 0.4],
                  ['Parte de baixo', 0.5, 0.5],
                  ['Detalhe central', 0.3, 0.3],
                ].map(([label, y, height]) => (
                  <Chip
                    key={String(label)}
                    label={String(label)}
                    selected={false}
                    onPress={() =>
                      alter({ crop: { x: 0, y: Number(y), width: 1, height: Number(height) } })
                    }
                  />
                ))}
              </View>
              <Label className="text-xs text-muted">
                O recorte preserva a fotografia. Você escolhe o detalhe; o app não identifica nem
                inventa uma peça.
              </Label>
            </>
          )}
        </Card>
      )}
      {source && (
        <Card title="Sua inspiração">
          <Label>{source.title}</Label>
          <Label className="text-xs text-muted">{source.credit}</Label>
          {editable && (
            <Button
              title="Adicionar recorte da inspiração"
              secondary
              icon="crop"
              disabled={history.present.length >= 30}
              onPress={() => add('reference', source.id)}
            />
          )}
          <Button
            title="Experimentar sobre minha foto"
            secondary
            onPress={() => router.push({ pathname: '/try-on', params: { source: source.id } })}
          />
          <Button
            title="Ver foto e créditos de origem"
            secondary
            small
            onPress={() => router.push(`/publication/${source.id}`)}
          />
        </Card>
      )}
      {editable && (
        <>
          <Disclosure title="Buscar uma peça parecida no meu closet">
            <Label className="text-sm">
              Escolha uma peça e uma cor da referência. As sugestões usam suas roupas disponíveis.
            </Label>
            <CategoryField value={category} onChange={setCategory} />
            <Field
              label="Cor que chamou sua atenção"
              value={color}
              onChangeText={setColor}
              maxLength={50}
            />
            {suggestions?.options.map((i) => (
              <Button
                key={i.id}
                title={`Experimentar ${i.name}`}
                secondary
                small
                onPress={() => add('item', i.id)}
              />
            ))}
            {!suggestions?.options.length && (
              <Label className="text-sm">
                Nenhuma peça disponível nessa categoria. Você pode usar outra peça do closet ou
                manter a referência na montagem.
              </Label>
            )}
            <Button
              title="Guardar esta ideia como receita"
              secondary
              busy={studio.busy}
              onPress={() =>
                void studio.act({ action: 'recipe', recipe }).then((ok) => {
                  if (ok) task.setSuccess('Receita guardada na biblioteca Do Mural.');
                })
              }
            />
          </Disclosure>
          <Card title="Misture com seu closet">
            <ItemChoices
              items={available}
              selected={ownItems({ ...design, layers: history.present })}
              label="Adicionar ao painel"
              onSelect={(id) => add('item', id)}
            />
          </Card>
        </>
      )}
      <Field
        label="O que funciona nesta versão?"
        value={design.note}
        maxLength={1200}
        multiline
        editable={editable}
        onChangeText={(note) => setDesign({ ...design, note })}
      />
      <Button
        title="Criar uma nova versão"
        secondary
        busy={task.busy}
        onPress={() =>
          void task.run(
            async () => {
              const parent = design.outfitId ? design : await save();
              return atelier<Design>({
                action: 'save_design',
                id: Crypto.randomUUID(),
                design: {
                  ...parent,
                  title: `${parent.title.slice(0, 82)} · versão`,
                  parentId: parent.id,
                  outfitId: null,
                  revision: 0,
                },
              });
            },
            (v) => router.replace({ pathname: '/outfit/editor', params: { id: v.id } }),
          )
        }
      />
      {versions.filter((v) => v.id !== design.id).length > 0 && (
        <Card title="Comparar composições">
          <Choices
            values={{
              '': 'Escolher versão',
              ...Object.fromEntries(
                versions.filter((v) => v.id !== design.id).map((v) => [v.id, v.title]),
              ),
            }}
            value={compare}
            onChange={setCompare}
          />
          {variant && (
            <>
              <Canvas
                layers={variant.layers}
                items={studio.data.items}
                publications={publications}
                wishes={e.wishes}
              />
              <Label className="text-sm">{variant.note || variant.title}</Label>
            </>
          )}
        </Card>
      )}
      {design.outfitId && (
        <Button
          title="Abrir look salvo"
          secondary
          onPress={() => router.push(`/outfit/${design.outfitId}`)}
        />
      )}
      {!!design.revision && (
        <ConfirmAction
          label="Excluir composição do ateliê"
          description="Excluir este rascunho ou composição? Looks e registros de uso já salvos são preservados."
          busy={task.busy}
          onConfirm={() =>
            void task.run(
              async () => {
                await atelier({ action: 'delete_design', id: design.id });
                await AsyncStorage.removeItem(key);
              },
              () => router.replace('/atelier'),
            )
          }
        />
      )}
    </Page>
  );
}
