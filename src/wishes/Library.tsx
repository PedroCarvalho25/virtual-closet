import { useState } from 'react';
import { Linking, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Button, Empty, Field, Label, Notice } from '@/components/ui';
import { SoftPressable } from '@/components/motion';
import { Disclosure } from '@/components/Disclosure';
import { Card, Choices, type StyleProps } from '@/evolution/components';
import { money } from '@/preview/model';
import { categories } from '@/types/domain';
import { purchaseInsight } from '@/evolution/core';
import { WishImage } from './WishImage';
import { wishMatches } from './matches';

export function Wishlist({ data, e }: StyleProps) {
  const [compare, setCompare] = useState(false);
  return (
    <>
      <View className="gap-2">
        <Button title="Guardar um desejo" icon="plus" onPress={() => router.push('/wish/new')} />
        {e.wishes.length > 1 && (
          <Button
            title={compare ? 'Fechar comparação' : 'Comparar'}
            secondary
            small
            icon="columns"
            onPress={() => setCompare(!compare)}
          />
        )}
      </View>
      {e.profile.noBuy && (
        <Label className="text-xs text-muted">
          Seu modo sem compras está ativo. A lista continua aqui para quando quiser revisitar.
        </Label>
      )}
      {!e.wishes.length && (
        <Empty
          title="Gostou? Guarda aqui."
          description="Uma peça do Mural, um achado da rua ou uma ideia para depois."
          icon="heart"
          action={
            <Button title="Explorar o Mural" secondary onPress={() => router.push('/mural')} />
          }
        />
      )}
      {compare && e.wishes.length > 1 && <WishComparison data={data} e={e} />}
      <View className="flex-row items-start gap-3">
        {[0, 1].map((column) => (
          <View key={column} className="flex-1 gap-5">
            {e.wishes
              .filter((_, i) => i % 2 === column)
              .map((wish) => (
                <SoftPressable
                  key={wish.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Abrir desejo ${wish.title}`}
                  onPress={() => router.push({ pathname: '/wish/[id]', params: { id: wish.id } })}
                  className="gap-2"
                >
                  <View style={{ aspectRatio: column === 0 ? 0.8 : 1 }}>
                    <WishImage wish={wish} />
                  </View>
                  <Text className="font-semibold text-[15px] leading-5 text-ink">{wish.title}</Text>
                  <Label className="text-xs text-muted">
                    {wish.price === null ? categories[wish.category] : money(wish.price)}
                  </Label>
                </SoftPressable>
              ))}
          </View>
        ))}
      </View>
    </>
  );
}
function WishComparison({ data, e }: Pick<StyleProps, 'data' | 'e'>) {
  const [left, setLeft] = useState(e.wishes[0]!.id),
    [right, setRight] = useState(e.wishes[1]!.id),
    [uses, setUses] = useState(''),
    [error, setError] = useState('');
  const a = e.wishes.find((w) => w.id === left) || e.wishes[0]!,
    b =
      e.wishes.find((w) => w.id === right && w.id !== a.id) || e.wishes.find((w) => w.id !== a.id)!;
  const n = Number(uses),
    valid = Number.isSafeInteger(n) && n > 0;
  return (
    <Card title="Qual faz mais sentido agora?">
      <Choices
        values={Object.fromEntries(e.wishes.map((w) => [w.id, w.title]))}
        value={a.id}
        onChange={setLeft}
      />
      <Choices
        values={Object.fromEntries(
          e.wishes.filter((w) => w.id !== a.id).map((w) => [w.id, w.title]),
        )}
        value={b.id}
        onChange={setRight}
      />
      <View className="flex-row items-start gap-3">
        {[a, b].map((w) => {
          const matches = wishMatches(w, data, e),
            similar = purchaseInsight(w, data, e).similar;
          return (
            <View key={w.id} className="flex-1 gap-3">
              <View style={{ aspectRatio: 0.8 }}>
                <WishImage wish={w} />
              </View>
              <Label className="font-bold text-sm">{w.title}</Label>
              <Label className="text-sm">{w.price === null ? 'Sem preço' : money(w.price)}</Label>
              <Label className="text-xs text-muted">
                {similar.length
                  ? `${similar.length} semelhante(s) no closet`
                  : 'Sem peça da mesma categoria e cor'}
              </Label>
              <Label className="text-xs">
                {matches.length
                  ? `${matches.length} ideia(s) para experimentar`
                  : 'Ainda faltam peças para combinar'}
              </Label>
              {!!w.note && <Label className="text-xs text-muted">{w.note}</Label>}
              {valid && w.price !== null && (
                <Label className="text-xs">
                  {money(Math.round(w.price / n))} por uso imaginado
                </Label>
              )}
              <Button
                title={`Ver ${w.title}`}
                secondary
                small
                onPress={() => router.push({ pathname: '/wish/[id]', params: { id: w.id } })}
              />
              {!!w.source && (
                <Button
                  title={`Abrir link de ${w.title}`}
                  secondary
                  small
                  icon="external-link"
                  onPress={() =>
                    void Linking.openURL(w.source).catch(() =>
                      setError('Não foi possível abrir esse link.'),
                    )
                  }
                />
              )}
            </View>
          );
        })}
      </View>
      <Disclosure title="Pensar no custo por uso">
        <Field
          label="Quantas vezes imagino usar cada peça?"
          value={uses}
          onChangeText={setUses}
          keyboardType="number-pad"
          maxLength={5}
        />
        <Label className="text-xs text-muted">
          O mesmo número de usos vale para as duas peças. É uma conta sua, não uma previsão.
        </Label>
      </Disclosure>
      <Notice message={error} />
    </Card>
  );
}
