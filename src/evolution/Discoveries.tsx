import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { Photo } from '@/components/Photo';
import { OutfitCard } from '@/components/cards';
import { Button, Label } from '@/components/ui';
import { Progress } from '@/components/motion';
import { civilDate, formatDate } from '@/lib/dates';
import { Card, type StyleProps } from './components';
import { personalDiscoveries } from './discovery-model';

export function Stories({ data, e }: StyleProps) {
  const stories = data.items.filter((i) => e.details[i.id]?.story.trim());
  return (
    <>
      <Label className="text-sm leading-6 text-muted">
        Algumas peças guardam mais do que um look. As histórias que você escreve ficam reunidas
        aqui, só para você.
      </Label>
      {!stories.length && (
        <Card title="Toda peça pode guardar uma lembrança">
          <Label className="text-sm text-muted">
            Conte de onde veio uma favorita, quem presenteou ou o momento que ela acompanhou.
          </Label>
          <Button
            title="Contar a história de uma peça"
            icon="plus"
            onPress={() => router.push('/style?view=closet')}
          />
        </Card>
      )}
      {stories.map((item) => (
        <Card key={item.id}>
          <View style={{ height: 260, borderRadius: 20, overflow: 'hidden' }}>
            <Photo path={item.photo_path} label={item.name} category={item.category} />
          </View>
          <Text className="font-semibold text-lg text-ink">{item.name}</Text>
          <Label className="text-sm leading-6">{e.details[item.id]!.story}</Label>
          {!!item.last_worn_date && (
            <Label className="text-xs text-muted">
              Último uso registrado · {formatDate(item.last_worn_date)}
            </Label>
          )}
          <Button
            title={`Revisitar ${item.name}`}
            secondary
            onPress={() =>
              router.push({ pathname: '/style', params: { view: 'closet', item: item.id } })
            }
          />
        </Card>
      ))}
    </>
  );
}

export function Discoveries({ data, e, act, busy }: StyleProps) {
  const today = civilDate();
  const progress = personalDiscoveries(data, e, today);
  if (!e.profile.challenges)
    return (
      <Card title="Desafios opcionais">
        <Label className="text-sm text-muted">
          Os desafios estão desligados nas suas preferências. Você pode voltar quando quiser.
        </Label>
        <Button
          title="Ativar pequenas descobertas"
          busy={busy}
          onPress={() =>
            void act({ action: 'profile', profile: { ...e.profile, challenges: true } })
          }
        />
      </Card>
    );
  const cards = [
    {
      title: 'Uma peça, três estilos',
      value: progress.reuse,
      total: 3,
      detail: progress.item
        ? `${progress.item.name} acompanhou ${progress.reuse} ${progress.reuse === 1 ? 'combinação diferente' : 'combinações diferentes'}.`
        : 'Experimente uma favorita em três combinações diferentes.',
      view: 'today',
    },
    {
      title: 'Quatro combinações, sete dias',
      value: progress.variety,
      total: 4,
      detail: 'Cada combinação vestida conta uma vez. Repetir continua sendo bem-vindo.',
      view: 'today',
    },
    {
      title: 'Da inspiração para a vida',
      value: progress.remixes,
      total: 1,
      detail: 'Recrie uma receita com suas peças, guarde o remix e registre quando usar.',
      view: 'remix',
    },
  ];
  return (
    <>
      <Label className="text-sm leading-6 text-muted">
        Convites para explorar seu closet, sem pressa e sem perder pontos. O progresso considera
        somente usos registrados.
      </Label>
      <Label className="text-xs text-muted">
        Últimos sete dias · {formatDate(progress.since)} a {formatDate(today)}
      </Label>
      {cards.map((card) => (
        <Card key={card.title} title={card.title}>
          <Text className="font-semibold text-3xl text-accent">
            {Math.min(card.value, card.total)}{' '}
            <Text className="text-base text-muted">de {card.total}</Text>
          </Text>
          <Progress value={card.value / card.total} label={card.title} />
          <Label className="text-sm leading-6 text-muted">{card.detail}</Label>
          {card.value >= card.total ? (
            <Label className="font-medium text-sm text-accent">
              Uma descoberta que já faz parte da sua semana.
            </Label>
          ) : (
            <Button
              title={`Explorar: ${card.title}`}
              secondary
              onPress={() => router.push({ pathname: '/style', params: { view: card.view } })}
            />
          )}
        </Card>
      ))}
      {!!progress.outfits.length && (
        <Card title="Combinações que fizeram parte da semana">
          {progress.outfits.slice(0, 4).map((outfit) => (
            <OutfitCard key={outfit.id} outfit={outfit} />
          ))}
        </Card>
      )}
    </>
  );
}
