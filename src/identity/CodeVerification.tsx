import { useEffect, useRef, useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { client } from '@/lib/supabase';
import { acceptInteractiveSession } from '@/lib/auth-session';
import { useAuth } from '@/stores/auth';
import { useTask } from '@/hooks/useData';
import { Button, Icon, Label, Notice } from '@/components/ui';
import { identityError, sendDeviceCode } from './api';
import { normalizeCode } from './validation';
const sends = new Map<string, { at: number; request?: Promise<void> }>();
export function CodeVerification({
  email,
  signup = false,
  alreadySent = false,
  onCancel,
}: {
  email: string;
  signup?: boolean;
  alreadySent?: boolean;
  onCancel: () => void;
}) {
  const [code, setCode] = useState('');
  const [sentAt, setSentAt] = useState(() => (alreadySent ? Date.now() : 0));
  const [now, setNow] = useState(() => Date.now());
  const task = useTask();
  const online = useAuth((s) => s.online);
  const focused = useRef<TextInput>(null);
  const key = `${signup ? 'signup' : 'device'}:${email}`;
  const remaining = Math.min(60, Math.max(0, Math.ceil((sentAt + 60000 - now) / 1000)));
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  async function send() {
    const previous = sends.get(key);
    if (previous?.request) {
      await previous.request;
      setSentAt(previous.at);
      return;
    }
    if (previous && Date.now() - previous.at < 60000) {
      setSentAt(previous.at);
      return;
    }
    const at = Date.now();
    const request = (async () => {
      if (signup) {
        const { error } = await client().auth.resend({ type: 'signup', email });
        if (error) throw identityError(error);
      } else await sendDeviceCode();
    })();
    sends.set(key, { at, request });
    try {
      await request;
      sends.set(key, { at });
      setSentAt(at);
      setCode('');
      task.setSuccess('Código enviado. Confira também a pasta de spam.');
    } catch (error) {
      sends.delete(key);
      throw error;
    }
  }
  useEffect(() => {
    if (alreadySent) sends.set(key, { at: Date.now() });
    else if (online) void task.run(send);
    // Exactly one initial send per recipient/mode; retries are explicit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return (
    <View className="gap-5">
      <View className="h-16 w-16 items-center justify-center rounded-[24px] bg-lemon">
        <Icon name="mail" size={27} color="#17613E" />
      </View>
      <Text
        accessibilityRole="header"
        className="font-display text-[32px] leading-9 tracking-[-1px] text-ink"
      >
        {signup ? 'Confirme seu e-mail.' : 'Confirme este dispositivo'}
      </Text>
      <Label className="text-sm leading-6 text-muted">
        {signup
          ? 'Para começar, confirme o código de seis dígitos enviado para'
          : 'Confirme que é você com o código de seis dígitos enviado para'}{' '}
        <Text className="font-semibold text-ink">{email}</Text>.
      </Label>
      <TextInput
        ref={focused}
        accessibilityLabel="Código de 6 dígitos"
        value={code}
        onChangeText={(value) => setCode(normalizeCode(value))}
        maxLength={12}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        autoCorrect={false}
        editable={!task.busy && online}
        selectTextOnFocus
        onSubmitEditing={() => {
          if (code.length === 6) void confirm();
        }}
        style={{
          height: 76,
          borderRadius: 22,
          borderWidth: 1,
          borderColor: code.length === 6 ? '#17613E' : '#D4DBCC',
          backgroundColor: '#FFFFFF',
          color: '#20291F',
          fontFamily: 'DMSans_600SemiBold',
          fontSize: 30,
          textAlign: 'center',
          letterSpacing: 12,
          paddingLeft: 12,
        }}
        placeholder="000000"
        placeholderTextColor="#929989"
      />
      <Notice message={task.error} />
      <Notice message={task.success} kind="success" />
      <Button
        title={signup ? 'Confirmar meu cadastro' : 'Confirmar este dispositivo'}
        icon="check"
        busy={task.busy}
        disabled={!online || code.length !== 6}
        onPress={() => void confirm()}
      />
      <Button
        title={
          remaining ? `Reenviar em ${remaining}s` : sentAt ? 'Reenviar código' : 'Enviar código'
        }
        secondary
        disabled={!online || task.busy || remaining > 0}
        onPress={() => void task.run(send)}
      />
      <Label className="text-xs leading-5 text-muted">
        {signup
          ? 'O código vale por poucos minutos. Você pode colar os seis dígitos de uma vez.'
          : 'Este aparelho será reconhecido por 90 dias. Você pode removê-lo a qualquer momento em Minha conta.'}
      </Label>
      <Button
        title={signup ? 'Voltar ao acesso' : 'Usar outra conta'}
        secondary
        disabled={task.busy}
        onPress={onCancel}
      />
    </View>
  );
  async function confirm() {
    await task.run(async () => {
      if (!/^\d{6}$/.test(code)) throw new Error('Digite os seis dígitos do seu código.');
      const { data, error } = await client().auth.verifyOtp({
        email,
        token: code,
        type: signup ? 'signup' : 'email',
      });
      if (error) throw identityError(error);
      if (!data.session) throw new Error('Não foi possível confirmar. Peça um novo código.');
      await acceptInteractiveSession(data.session);
    });
  }
}
