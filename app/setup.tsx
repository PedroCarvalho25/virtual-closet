import { useState } from 'react';
import { Linking, Text, View } from 'react-native';
import { WelcomeCollage } from '@/components/WelcomeCollage';
import { Brand, Button, Icon, Label, Notice, Page } from '@/components/ui';
export default function SetupScreen() {
  const [help, setHelp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <Page>
      <View className="py-5">
        <Brand />
      </View>
      <WelcomeCollage />
      <View className="gap-3 pt-2">
        <Text
          accessibilityRole="header"
          className="font-semibold text-[30px] leading-[36px] tracking-[-1px] text-ink"
        >
          Um lugar para tudo{`\n`}o que você adora vestir.
        </Text>
        <Label className="text-[13px] leading-6 text-muted">
          Guarde suas peças, monte combinações e encontre seu próximo look no que você já tem.
        </Label>
      </View>
      <View className="gap-4 rounded-[22px] bg-sage p-5">
        <View className="flex-row items-center gap-2">
          <Icon name="link" size={17} />
          <Text className="font-semibold text-[13px] text-ink">Falta conectar seu closet</Text>
        </View>
        <Label className="text-[13px] leading-6 text-muted">
          Vamos conectar o lugar onde suas fotos e peças ficarão guardadas. A configuração é
          gratuita e feita uma única vez.
        </Label>
        <Button
          title="Abrir Supabase gratuito"
          icon="arrow-up-right"
          onPress={() => {
            void Linking.openURL('https://supabase.com/dashboard').catch(() =>
              setError('Abra supabase.com/dashboard no navegador.'),
            );
          }}
        />
        <Label className="text-[11px] leading-5 text-muted">
          No computador, siga o assistente de configuração ou o guia COMECE-AQUI. Nenhuma senha
          precisa ser compartilhada.
        </Label>
      </View>
      <Button
        title={help ? 'Ocultar instruções do iPhone' : 'Como testar no meu iPhone?'}
        secondary
        onPress={() => setHelp(!help)}
      />
      {help && (
        <Notice
          kind="info"
          message="Instale o Expo Go pela App Store. Depois da configuração, mantenha o iPhone e o computador no mesmo Wi-Fi e leia o QR code que o Expo mostra no computador. Não precisa pagar assinatura da Apple."
        />
      )}
      <Notice message={error} />
      <View className="flex-row items-center justify-center gap-2">
        <Icon name="lock" size={12} />
        <Label className="text-[11px] text-muted">Seu closet é privado. Só você tem acesso.</Label>
      </View>
    </Page>
  );
}
