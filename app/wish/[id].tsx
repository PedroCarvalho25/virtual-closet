import { useEffect, useState } from 'react';
import { Linking, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as Crypto from 'expo-crypto';
import {
  Button,
  Empty,
  Field,
  Label,
  Loading,
  Notice,
  Page,
  PageTitle,
  TopBar,
} from '@/components/ui';
import { Photo } from '@/components/Photo';
import { Disclosure } from '@/components/Disclosure';
import { ConfirmAction } from '@/components/ConfirmAction';
import { Card } from '@/evolution/components';
import { freshEvolution, slotLabels, type Wish } from '@/evolution/types';
import { purchaseInsight, sourceLink } from '@/evolution/core';
import { TraitFields } from '@/style/TraitFields';
import { useStudioScreen } from '@/preview/store';
import { priceCents, inputDate, planDate, money } from '@/preview/model';
import { pickPhoto, type PickedPhoto } from '@/lib/photos';
import { getPublication } from '@/social/api';
import { useTask } from '@/hooks/useData';
import { WishImage } from '@/wishes/WishImage';
import { CategoryField } from '@/wishes/CategoryField';
import { saveWish } from '@/wishes/api';
import { wishMatches } from '@/wishes/matches';

const newWish = (): Wish => ({
  id: Crypto.randomUUID(),
  title: '',
  category: 'outro',
  color: '',
  price: null,
  source: '',
  note: '',
  reflectUntil: null,
  revision: 0,
});
export default function WishScreen() {
  const { id = 'new', source } = useLocalSearchParams<{ id: string; source?: string }>();
  const state = useStudioScreen();
  if (!state.data)
    return (
      <Page>
        <TopBar back title="Desejos" />
        <Notice message={state.error} action={state.load} />
        {!state.error && <Loading />}
      </Page>
    );
  const e = state.data.evolution || freshEvolution(),
    existing = e.wishes.find((w) => w.id === id);
  if (id !== 'new' && !existing)
    return (
      <Page>
        <TopBar back title="Desejos" />
        <Empty
          title="Este desejo saiu da lista"
          description="Seus outros achados continuam em Desejos."
          action={<Button title="Ver meus desejos" onPress={() => router.replace('/wishes')} />}
        />
      </Page>
    );
  return (
    <WishContent key={`${id}:${source || ''}`} state={state} existing={existing} source={source} />
  );
}
function WishContent({
  state,
  existing,
  source,
}: {
  state: ReturnType<typeof useStudioScreen>;
  existing?: Wish;
  source?: string;
}) {
  const task = useTask(),
    [draft, setDraft] = useState<Wish>(() => (existing ? { ...existing } : newWish())),
    [editing, setEditing] = useState(!existing),
    [photo, setPhoto] = useState<PickedPhoto | null>(null);
  const [price, setPrice] = useState(
    existing?.price === null || existing?.price === undefined
      ? ''
      : String(existing.price / 100).replace('.', ','),
  );
  const [until, setUntil] = useState(
      existing?.reflectUntil ? inputDate(existing.reflectUntil) : '',
    ),
    [sourceLoading, setSourceLoading] = useState(!!source && !existing);
  const e = state.data!.evolution || freshEvolution(),
    w = existing || draft;
  useEffect(() => {
    if (!source || existing) return;
    let alive = true;
    void getPublication(source)
      .then((p) => {
        if (!p) throw new Error('Referência indisponível.');
        if (alive)
          setDraft((d) => ({
            ...d,
            title: d.title || p.title,
            color: d.color || p.colors[0] || '',
            media: { publicationId: p.id },
          }));
      })
      .catch(() => {
        if (alive)
          task.setError(
            'Não foi possível abrir essa referência. Volte ao Mural e tente novamente.',
          );
      })
      .finally(() => {
        if (alive) setSourceLoading(false);
      });
    return () => {
      alive = false;
    };
    // A new form resolves its source once; edits keep user-entered values.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source]);
  const matches = wishMatches(w, state.data!, e),
    similar = purchaseInsight(w, state.data!, e).similar;
  const edit = () => {
    setDraft({ ...w });
    setPrice(w.price === null ? '' : String(w.price / 100).replace('.', ','));
    setUntil(w.reflectUntil ? inputDate(w.reflectUntil) : '');
    setEditing(true);
  };
  return (
    <Page>
      <TopBar back title="Desejos" />
      <PageTitle
        title={editing ? (existing ? 'Ajustar desejo' : 'Um achado para depois') : w.title}
      />
      <Notice message={task.error || state.error} />
      {editing ? (
        <>
          <View style={{ height: 260 }}>
            {photo ? (
              <Photo uri={photo.uri} contain label="Foto do desejo" />
            ) : (
              <WishImage
                key={draft.media?.publicationId || draft.media?.photoPath || 'new'}
                wish={draft}
                credit
              />
            )}
          </View>
          {sourceLoading && <Loading />}
          <Button
            title={photo || draft.media?.photoPath ? 'Trocar foto' : 'Escolher uma foto'}
            secondary
            icon="image"
            busy={task.busy}
            onPress={() =>
              void task.run(
                () => pickPhoto(false),
                (p) => {
                  if (p) setPhoto(p);
                },
              )
            }
          />
          <Field
            label="Qual peça chamou sua atenção?"
            value={draft.title}
            onChangeText={(title) => setDraft({ ...draft, title })}
            maxLength={80}
          />
          <CategoryField
            value={draft.category}
            onChange={(category) => setDraft({ ...draft, category })}
          />
          <Field
            label="Cor"
            value={draft.color}
            onChangeText={(color) => setDraft({ ...draft, color })}
            maxLength={50}
          />
          <Button
            title="Guardar desejo"
            icon="bookmark"
            busy={task.busy}
            disabled={sourceLoading || !draft.title.trim()}
            onPress={() =>
              void task.run(
                async () => {
                  const next = {
                    ...draft,
                    price: priceCents(price),
                    source: sourceLink(draft.source),
                    reflectUntil: until.trim() ? planDate(until) : null,
                  };
                  return saveWish(next, photo);
                },
                (savedId) => {
                  setPhoto(null);
                  setEditing(false);
                  router.replace({ pathname: '/wish/[id]', params: { id: savedId } });
                },
              )
            }
          />
          <Disclosure title="Modelagem, textura e ocasião">
            <TraitFields
              value={draft.styling}
              onChange={(styling) => setDraft({ ...draft, styling })}
            />
            <Label className="text-xs text-muted">
              Preencha o que souber. Isso ajuda a escolher as combinações.
            </Label>
          </Disclosure>
          <Disclosure title="Preço, link e uma nota">
            <Field
              label="Preço em reais · opcional"
              value={price}
              onChangeText={setPrice}
              keyboardType="decimal-pad"
            />
            <Field
              label="Link do produto · opcional"
              value={draft.source}
              onChangeText={(source) => setDraft({ ...draft, source })}
              maxLength={1000}
              autoCapitalize="none"
            />
            <Field
              label="O que você gostou nessa peça?"
              value={draft.note}
              onChangeText={(note) => setDraft({ ...draft, note })}
              maxLength={500}
              multiline
            />
            <Field
              label="Revisitar em DD/MM/AAAA · opcional"
              value={until}
              onChangeText={setUntil}
              maxLength={10}
            />
          </Disclosure>
          {existing && (
            <Button
              title="Cancelar edição"
              secondary
              onPress={() => {
                setPhoto(null);
                setEditing(false);
              }}
            />
          )}
        </>
      ) : (
        <>
          <View style={{ height: 300 }}>
            <WishImage key={w.id + JSON.stringify(w.media)} wish={w} credit />
          </View>
          <View className="flex-row flex-wrap items-center gap-3">
            <Label className="text-xs text-muted">Na sua lista, ainda fora do closet</Label>
            {w.price !== null && <Label className="font-semibold">{money(w.price)}</Label>}
          </View>
          <Button
            title="Combinar no ateliê"
            icon="layers"
            onPress={() => router.push({ pathname: '/outfit/editor', params: { wish: w.id } })}
          />
          <View className="flex-row flex-wrap gap-2">
            <Button title="Editar desejo" secondary small onPress={edit} />
            <Button
              title="Ver todos os desejos"
              secondary
              small
              onPress={() => router.push('/wishes')}
            />
          </View>
          {!!w.note && <Label className="text-sm text-muted">{w.note}</Label>}
          {w.reflectUntil && (
            <Label className="text-xs text-muted">Revisitar em {inputDate(w.reflectUntil)}</Label>
          )}
          <Label className="font-bold text-xl">Com o que você já tem</Label>
          {!matches.length && (
            <Empty
              title="Ainda sem uma combinação"
              description="Faltam peças disponíveis para esta ideia. Você pode misturar livremente no ateliê ou adicionar outra peça ao closet."
              action={
                <Button title="Adicionar uma peça" onPress={() => router.push('/item/new')} />
              }
            />
          )}
          {matches.map((match, index) => (
            <Card key={match.key} title={match.title}>
              <View className="flex-row gap-2">
                <View style={{ flex: 1, height: 145 }}>
                  <WishImage wish={w} />
                </View>
                <View className="flex-1 gap-2">
                  {match.items.map((item) => (
                    <View key={item.id} className="flex-row items-center gap-2">
                      <View style={{ width: 52, height: 60 }}>
                        <Photo
                          path={item.photo_path}
                          category={item.category}
                          contain
                          label={item.name}
                        />
                      </View>
                      <Label className="flex-1 text-xs">{item.name}</Label>
                    </View>
                  ))}
                </View>
              </View>
              {match.reasons.map((reason) => (
                <Label key={reason} className="text-sm leading-5">
                  {reason}
                </Label>
              ))}
              {!!match.missing.length && (
                <Label className="text-xs text-muted">
                  Base parcial · falta{' '}
                  {match.missing.map((role) => slotLabels[role].toLowerCase()).join(' e ')} no
                  closet.
                </Label>
              )}
              <Button
                title={`Experimentar ideia ${index + 1}`}
                secondary
                onPress={() =>
                  router.push({
                    pathname: '/outfit/editor',
                    params: { wish: w.id, items: match.items.map((i) => i.id).join(',') },
                  })
                }
              />
            </Card>
          ))}
          {!!matches.length && (
            <Label className="text-xs text-muted">
              Ideias pelas cores e pelos detalhes que você informou. Abra no ateliê e veja o que tem
              a sua cara.
            </Label>
          )}
          {!!similar.length && (
            <Disclosure title={`${similar.length} peça(s) parecida(s) no closet`}>
              {similar.map((item) => (
                <Button
                  key={item.id}
                  title={item.name}
                  secondary
                  onPress={() => router.push({ pathname: '/item/[id]', params: { id: item.id } })}
                />
              ))}
            </Disclosure>
          )}
          {!!w.media?.publicationId && (
            <Button
              title="Voltar à referência no Mural"
              secondary
              icon="arrow-up-right"
              onPress={() =>
                router.push({
                  pathname: '/publication/[id]',
                  params: { id: w.media!.publicationId! },
                })
              }
            />
          )}
          {!!w.source && (
            <Button
              title="Ver link do produto"
              secondary
              icon="external-link"
              onPress={() =>
                void Linking.openURL(w.source).catch(() =>
                  task.setError('Não foi possível abrir esse link.'),
                )
              }
            />
          )}
          <Disclosure title="Organizar este desejo">
            <ConfirmAction
              label="Remover desejo"
              description="Retirar da sua lista? As peças do closet continuam guardadas."
              busy={state.busy}
              onConfirm={() =>
                void task.run(
                  async () => {
                    if (!(await state.act({ action: 'remove_wish', id: w.id })))
                      throw new Error('Não foi possível remover o desejo.');
                  },
                  () => router.replace('/wishes'),
                )
              }
            />
          </Disclosure>
        </>
      )}
    </Page>
  );
}
