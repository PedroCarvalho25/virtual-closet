import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Progress } from '@/components/motion';
import { ideasPreview } from '@/preview/config';
import { useStudioScreen } from '@/preview/store';
import { money, outfitCost, priceCents, studioStats } from '@/preview/model';
import { Favorite, SectionTitle, Tag } from '@/preview/components';
import { Photo } from '@/components/Photo';
import { OutfitArtwork } from '@/components/cards';
import {
  Button,
  Chip,
  Empty,
  Field,
  Icon,
  Label,
  Loading,
  Notice,
  Page,
  PageTitle,
  TopBar,
} from '@/components/ui';

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <View className="flex-1 gap-1 rounded-[22px] bg-paper p-4">
      <Text className="font-semibold text-[27px] tracking-[-1px] text-accent">{value}</Text>
      <Label className="text-[11px] text-muted">{label}</Label>
    </View>
  );
}
export default function Insights() {
  const params = useLocalSearchParams<{ view?: string }>();
  const [section, setSection] = useState(params.view === 'values' ? 'values' : 'overview');
  const [selected, setSelected] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [price, setPrice] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { data, act, busy, error: remoteError, load } = useStudioScreen();
  if (!data)
    return (
      <Page>
        <TopBar back title="Meu closet" />
        <Notice message={remoteError} action={load} />
        {!remoteError && <Loading />}
      </Page>
    );
  const stats = studioStats(data);
  const outfit = data.outfits.find((o) => o.id === selected) || data.outfits[0];
  const cost = outfitCost(outfit?.items.map((i) => i.id) || [], data.prices);
  const favoriteItems = data.items.filter((i) => data.favorite_items.includes(i.id));
  const favoriteOutfits = data.outfits.filter((o) => data.favorite_outfits.includes(o.id));
  const leader = stats.rankItems[0],
    favoriteLook = stats.rankOutfits[0];
  return (
    <Page>
      <TopBar back title="Meu closet" />
      <PageTitle title="Seu closet em números" />
      <Tag>
        {ideasPreview ? 'Dados de exemplo · valores em reais' : 'Seu closet · valores em reais'}
      </Tag>
      <View className="flex-row gap-2">
        {[
          ['overview', 'Resumo'],
          ['favorites', 'Favoritos'],
          ['values', 'Valores'],
        ].map(([id, label]) => (
          <View key={id} className="flex-1">
            <Chip
              label={label!}
              selected={section === id}
              onPress={() => {
                setSection(id!);
                setFeedback(null);
                setError(null);
              }}
            />
          </View>
        ))}
      </View>
      <Notice message={remoteError} action={load} />
      <Notice message={error} />
      <Notice message={feedback} kind="success" />
      {section === 'overview' && (
        <>
          <View className="gap-3">
            <View className="flex-row gap-3">
              <Metric value={String(stats.active.length)} label="peças no closet" />
              <Metric value={String(stats.totalUses)} label="usos registrados" />
            </View>
            <View className="flex-row gap-3">
              <Metric
                value={`${stats.active.length ? Math.round((stats.usedItems / stats.active.length) * 100) : 0}%`}
                label="do closet já usado"
              />
              <Metric value={String(data.outfits.length)} label="combinações criadas" />
            </View>
          </View>
          <SectionTitle
            title="As que vivem com você"
            subtitle="Favorito é escolha. Mais usado vem do seu histórico."
          />
          {leader ? (
            <View className="flex-row items-center gap-4 rounded-[24px] bg-paper p-4">
              <View className="h-28 w-24 overflow-hidden rounded-2xl">
                <Photo path={leader.photo_path} category={leader.category} />
              </View>
              <View className="flex-1 gap-2">
                <Tag>Peça mais usada</Tag>
                <Text className="font-semibold text-sm text-ink">{leader.name}</Text>
                <Label className="text-xs text-muted">
                  {stats.itemUses[leader.id]} usos registrados
                </Label>
                {data.prices[leader.id] !== undefined && (
                  <Text className="font-medium text-xs text-accent">
                    {money(Math.round(data.prices[leader.id]! / stats.itemUses[leader.id]!))} por
                    uso
                  </Text>
                )}
              </View>
            </View>
          ) : (
            <Empty
              title="Seu histórico começa agora"
              description="Registre o primeiro uso para descobrir suas peças mais usadas."
            />
          )}
          {favoriteLook && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Abrir combinação mais usada"
              onPress={() => router.push(`/outfit/${favoriteLook.id}`)}
              className="flex-row items-center gap-4 rounded-[24px] bg-paper p-4"
            >
              <View className="h-24 w-24 overflow-hidden rounded-2xl">
                <OutfitArtwork outfit={favoriteLook} />
              </View>
              <View className="flex-1 gap-2">
                <Tag>Look mais usado</Tag>
                <Text className="font-semibold text-sm text-ink">
                  {favoriteLook.name || 'Uma boa combinação'}
                </Text>
                <Label className="text-xs text-muted">
                  {stats.outfitUses[favoriteLook.id]} usos
                </Label>
              </View>
              <Icon name="arrow-up-right" size={18} />
            </Pressable>
          )}
          <View className="gap-3 rounded-[24px] bg-lemon p-5">
            <View className="flex-row items-center gap-2">
              <Icon name="award" color="#17613E" />
              <Text className="font-semibold text-base text-accent">
                Seu ritmo, suas descobertas
              </Text>
            </View>
            <Label className="text-xs leading-5 text-accent">
              {Math.min(stats.weekCount, 4)} de 4 combinações diferentes usadas nos últimos 7 dias.
              O desafio é redescobrir seu closet, sem precisar comprar.
            </Label>
            <Progress value={stats.weekCount / 4} label="Progresso do desafio de combinações" />
            <Button
              title="Registrar um look"
              secondary
              small
              onPress={() => router.push('/calendar')}
            />
          </View>
          <SectionTitle
            title="Ainda esperando uma estreia"
            subtitle={`${stats.unused.length} peças sem uso registrado.`}
          />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 12 }}
          >
            {stats.unused.map((item) => (
              <Pressable
                key={item.id}
                accessibilityRole="button"
                accessibilityLabel={`Abrir ${item.name}`}
                onPress={() => router.push(`/item/${item.id}`)}
                style={{ width: 130 }}
                className="gap-2"
              >
                <View className="h-36 overflow-hidden rounded-2xl">
                  <Photo path={item.photo_path} category={item.category} />
                </View>
                <Text className="font-medium text-xs text-ink">{item.name}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <Label className="text-[10px] leading-4 text-muted">
            Os números consideram registros de uso, não planos futuros. “Sem uso” significa sem
            registro no app. Custo por uso usa o preço informado, sem estimar valor de mercado.
          </Label>
        </>
      )}
      {section === 'favorites' && (
        <>
          <SectionTitle
            title="Suas escolhas favoritas"
            subtitle="Toque no coração das peças e combinações para guardar suas preferidas."
          />
          <SectionTitle title={`Peças · ${favoriteItems.length}`} />
          {favoriteItems.map((item) => (
            <View key={item.id} className="flex-row items-center gap-3 rounded-[20px] bg-paper p-3">
              <View className="h-20 w-16 overflow-hidden rounded-xl">
                <Photo path={item.photo_path} category={item.category} />
              </View>
              <View className="flex-1 gap-1">
                <Text className="font-semibold text-sm text-ink">{item.name}</Text>
                <Label className="text-xs text-muted">
                  {item.color}
                  {item.archived_at ? ' · Arquivada' : ''}
                </Label>
              </View>
              <Favorite id={item.id} />
            </View>
          ))}
          {!favoriteItems.length && (
            <Label className="text-xs text-muted">Suas peças favoritas vão aparecer aqui.</Label>
          )}
          <SectionTitle title={`Combinações · ${favoriteOutfits.length}`} />
          {favoriteOutfits.map((o) => (
            <View key={o.id} className="flex-row items-center gap-3 rounded-[20px] bg-paper p-3">
              <View className="h-20 w-20 overflow-hidden rounded-xl">
                <OutfitArtwork outfit={o} />
              </View>
              <View className="flex-1">
                <Text className="font-semibold text-sm text-ink">
                  {o.name || 'Uma boa combinação'}
                </Text>
              </View>
              <Favorite kind="outfit" id={o.id} />
            </View>
          ))}
          <Button
            title="Escolher favoritas no guarda-roupa"
            secondary
            onPress={() => router.push('/wardrobe')}
          />
        </>
      )}
      {section === 'values' && (
        <>
          <SectionTitle
            title="Quanto Custa o Outfit?!"
            subtitle="Preço por peça e total do look."
          />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 7 }}
          >
            {data.outfits.map((o) => (
              <Chip
                key={o.id}
                label={o.name || 'Sem nome'}
                selected={outfit?.id === o.id}
                onPress={() => setSelected(o.id)}
              />
            ))}
          </ScrollView>
          {outfit && (
            <View className="gap-4 rounded-[24px] bg-paper p-4">
              <View className="h-52 overflow-hidden rounded-[20px]">
                <OutfitArtwork outfit={outfit} />
              </View>
              <View className="flex-row items-end justify-between gap-3">
                <View className="gap-1">
                  <Label className="text-xs text-muted">
                    {cost.complete ? 'Total declarado' : 'Subtotal conhecido'}
                  </Label>
                  <Text className="font-semibold text-[30px] tracking-[-1px] text-accent">
                    {money(cost.total)}
                  </Text>
                </View>
                <Label className="text-xs text-muted">
                  {cost.known}/{cost.count} preços
                </Label>
              </View>
              {outfit.items.map((i) => (
                <View key={i.id} className="flex-row justify-between gap-3">
                  <Label className="flex-1 text-xs">{i.name}</Label>
                  <Text className="font-medium text-xs text-ink">
                    {data.prices[i.id] === undefined ? 'Não informado' : money(data.prices[i.id]!)}
                  </Text>
                </View>
              ))}
              {!cost.complete && (
                <Label className="text-xs leading-5 text-muted">
                  Faltam valores. Peças sem preço não são contadas como gratuitas.
                </Label>
              )}
            </View>
          )}
          <View className="gap-2 rounded-[24px] bg-sage p-5">
            <Label className="text-xs text-muted">Valor informado no closet</Label>
            <Text className="font-semibold text-[27px] text-accent">{money(stats.value)}</Text>
            <Label className="text-xs text-muted">
              {stats.priced.length} de {stats.active.length} peças ativas com preço
            </Label>
            {stats.priced.length > 0 && (
              <>
                <Label className="text-xs">
                  Menor valor: {stats.priced[0]!.name} · {money(data.prices[stats.priced[0]!.id]!)}
                </Label>
                <Label className="text-xs">
                  Maior valor: {stats.priced.at(-1)!.name} ·{' '}
                  {money(data.prices[stats.priced.at(-1)!.id]!)}
                </Label>
              </>
            )}
          </View>
          <SectionTitle
            title="Os valores das suas peças"
            subtitle="Experimente editar um preço. Os totais são recalculados."
          />
          {stats.active.map((item) => (
            <View key={item.id} className="gap-3 rounded-[20px] bg-paper p-3">
              <View className="flex-row items-center gap-3">
                <View className="h-16 w-14 overflow-hidden rounded-xl">
                  <Photo path={item.photo_path} category={item.category} />
                </View>
                <View className="flex-1 gap-1">
                  <Text className="font-semibold text-xs text-ink">{item.name}</Text>
                  <Label className="text-xs text-muted">
                    {data.prices[item.id] === undefined
                      ? 'Preço não informado'
                      : money(data.prices[item.id]!)}
                  </Label>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Editar preço de ${item.name}`}
                  onPress={() => {
                    setEditing(item.id);
                    setPrice(
                      data.prices[item.id] === undefined
                        ? ''
                        : (data.prices[item.id]! / 100).toFixed(2).replace('.', ','),
                    );
                    setError(null);
                    setFeedback(null);
                  }}
                  className="h-11 w-11 items-center justify-center"
                >
                  <Icon name="edit-2" size={18} />
                </Pressable>
              </View>
              {editing === item.id && (
                <>
                  <Field
                    label={`Preço de ${item.name} em reais`}
                    value={price}
                    onChangeText={setPrice}
                    keyboardType="decimal-pad"
                    placeholder="Ex.: 129,90"
                    maxLength={12}
                  />
                  <Label className="text-[10px] text-muted">
                    Deixe em branco para marcar como não informado.
                  </Label>
                  <View className="flex-row gap-2">
                    <View className="flex-1">
                      <Button
                        title="Salvar preço"
                        small
                        busy={busy}
                        onPress={() => {
                          try {
                            const cents = priceCents(price);
                            setError(null);
                            void act({ action: 'price', id: item.id, cents }).then((ok) => {
                              if (ok) {
                                setEditing(null);
                                setFeedback(
                                  ideasPreview
                                    ? 'Preço atualizado na prévia.'
                                    : 'Preço atualizado.',
                                );
                              }
                            });
                          } catch (e) {
                            setError(e instanceof Error ? e.message : 'Preço inválido.');
                          }
                        }}
                      />
                    </View>
                    <View className="flex-1">
                      <Button
                        title="Cancelar"
                        small
                        secondary
                        disabled={busy}
                        onPress={() => setEditing(null)}
                      />
                    </View>
                  </View>
                  {error && <Notice message={error} />}
                </>
              )}
            </View>
          ))}
        </>
      )}
    </Page>
  );
}
