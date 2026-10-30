import { useTheme } from '@/settings/Theme';
import { Text, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { Button, Icon, Label } from '@/components/ui';
import { MotionReveal, SoftPressable } from '@/components/motion';
import { WelcomeCollage } from '@/components/WelcomeCollage';
import { useAuth } from '@/stores/auth';
import { firstLookJourney } from './first-use';
import type { StyleProps } from './components';

export const openInspiration = () =>
  router.push({ pathname: '/style', params: { view: 'inspirations', create: '1' } });

export function FirstSteps({ data, e }: Pick<StyleProps, 'data' | 'e'>) {
  const colors = useTheme();
  const journey = firstLookJourney(data, e);
  const online = useAuth((s) => s.online);
  const compact = useWindowDimensions().width < 360;
  const empty = data.items.length === 0 && data.outfits.length === 0;
  const instruction = {
    top: ['Adicionar roupas', 'Camisetas, camisas ou blusas.', 'Adicionar uma parte de cima'],
    bottom: [
      'Complete o look',
      'Adicione uma calça, saia ou short.',
      'Adicionar uma parte de baixo',
    ],
    combine: [
      'Combine suas peças',
      'Sugestões com as roupas do seu closet.',
      'Escolher meu primeiro look',
    ],
    wear: ['Look salvo', 'Registre no calendário quando usar.', 'Abrir meu look guardado'],
    done: ['Seu closet', 'Roupas, looks e histórico de uso.', 'Explorar meu closet'],
  }[journey.next];
  const continueJourney = () => {
    if (journey.next === 'top' || journey.next === 'bottom')
      router.push({
        pathname: '/item/new',
        params: { category: journey.next === 'top' ? 'camiseta' : 'calca', journey: 'first-look' },
      });
    else if (journey.next === 'wear') router.push(`/outfit/${data.outfits[0]!.id}`);
    else router.push({ pathname: '/style', params: { view: 'today' } });
  };
  return (
    <View className="gap-5">
      {empty && (
        <View className="gap-3">
          <WelcomeCollage compact />
          <View className="flex-row gap-3">
            <SoftPressable
              accessibilityRole="button"
              accessibilityLabel="Montar look"
              disabled={!online}
              onPress={continueJourney}
              className={`flex-1 gap-4 rounded-[24px] bg-accent p-4 ${!online ? 'opacity-45' : ''}`}
              style={{ minHeight: 164 }}
            >
              <Icon name="sun" color={colors.onAccent} size={23} />
              <View className="flex-1 gap-2">
                <Text
                  className="font-display leading-[27px] tracking-[-0.5px] text-onAccent"
                  style={{ fontSize: compact ? 20 : 24 }}
                >
                  Montar{'\n'}look
                </Text>
              </View>
              <Icon name="arrow-up-right" color={colors.onAccent} size={20} />
            </SoftPressable>
            <SoftPressable
              accessibilityRole="button"
              accessibilityLabel="Salvar inspiração"
              disabled={!online}
              onPress={openInspiration}
              className={`flex-1 gap-4 rounded-[24px] bg-lemon p-4 ${!online ? 'opacity-45' : ''}`}
              style={{ minHeight: 164 }}
            >
              <Icon name="bookmark" color="#17613E" size={23} />
              <View className="flex-1 gap-2">
                <Text
                  className="font-display leading-[27px] tracking-[-0.5px] text-ink"
                  style={{ fontSize: compact ? 20 : 24 }}
                >
                  Salvar{'\n'}inspiração
                </Text>
              </View>
              <Icon name="arrow-up-right" color="#17613E" size={20} />
            </SoftPressable>
          </View>
        </View>
      )}
      {!empty && journey.next !== 'done' && (
        <MotionReveal trigger={journey.next}>
          <View className="gap-4 rounded-[24px] bg-sage p-5">
            <Text className="font-bold text-[22px] leading-7 text-ink">{instruction[0]}</Text>
            <Label className="text-sm leading-6 text-muted">{instruction[1]}</Label>
            <View
              className="flex-row gap-2"
              accessibilityLabel={`${journey.completed} de 4 etapas do primeiro look concluídas`}
            >
              {['Parte de cima', 'Parte de baixo', 'Look guardado', 'Uso registrado'].map(
                (label, index) => (
                  <View key={label} className="flex-1 gap-2">
                    <View
                      className={`h-1 rounded-full ${journey.steps[index] ? 'bg-accent' : 'bg-[#D4DBCC]'}`}
                    />
                    <Label className="text-[11px] leading-4 text-muted">{label}</Label>
                  </View>
                ),
              )}
            </View>
            {journey.next !== 'combine' && (
              <Button
                title={instruction[2]!}
                icon={journey.next === 'wear' ? 'arrow-right' : 'plus'}
                onPress={continueJourney}
                disabled={!online}
              />
            )}
          </View>
        </MotionReveal>
      )}
    </View>
  );
}
