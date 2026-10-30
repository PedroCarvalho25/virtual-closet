import { useRef, useState } from 'react';
import { router } from 'expo-router';
import { client, recoveryClient } from '@/lib/supabase';
import { acceptInteractiveSession } from '@/lib/auth-session';
import { meetsSignupPasswordPolicy, SIGNUP_PASSWORD_HINT } from '@/lib/password';
import { Button, Field, Label, Notice, Page, PageTitle, TopBar } from '@/components/ui';
import { useTask } from '@/hooks/useData';
export default function RecoverScreen() {
  const isolated = useRef<ReturnType<typeof recoveryClient> | null>(null);
  const [email, setEmail] = useState(''),
    [code, setCode] = useState(''),
    [password, setPassword] = useState(''),
    [again, setAgain] = useState('');
  const [sent, setSent] = useState(false),
    [sentAt, setSentAt] = useState(0),
    task = useTask();
  const api = () => (isolated.current ||= recoveryClient());
  return (
    <Page>
      <TopBar back title="Recuperar acesso" />
      <PageTitle
        title="Seu closet espera por você"
        subtitle="Confirme seu e-mail para escolher uma nova senha."
      />
      <Field
        label="E-mail da conta"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        editable={!sent && !task.busy}
      />
      {!sent ? (
        <Button
          title="Enviar código para recuperar acesso"
          busy={task.busy}
          onPress={() =>
            void task.run(async () => {
              if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
                throw new Error('Confira seu e-mail.');
              const { error } = await api().auth.signInWithOtp({
                email: email.trim(),
                options: { shouldCreateUser: false },
              });
              if (
                error &&
                !['otp_disabled', 'user_not_found', 'signup_disabled'].includes(error.code || '')
              )
                throw new Error(
                  'Não foi possível enviar agora. Aguarde um minuto e tente novamente.',
                );
              setSentAt(Date.now());
              setSent(true);
            })
          }
        />
      ) : (
        <>
          <Label className="text-sm">
            Se houver uma conta com esse e-mail, você receberá um código. Confira também o spam.
          </Label>
          <Field
            label="Código recebido por e-mail"
            value={code}
            onChangeText={(v) => setCode(v.replace(/\D/g, ''))}
            maxLength={8}
            keyboardType="number-pad"
            autoComplete="one-time-code"
          />
          <Field
            label="Nova senha"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
          />
          <Label className="text-xs text-muted">{SIGNUP_PASSWORD_HINT}</Label>
          <Field
            label="Repetir nova senha"
            value={again}
            onChangeText={setAgain}
            secureTextEntry
            autoCapitalize="none"
          />
          <Button
            title="Salvar nova senha e entrar"
            busy={task.busy}
            onPress={() =>
              void task.run(async () => {
                if (!meetsSignupPasswordPolicy(password)) throw new Error(SIGNUP_PASSWORD_HINT);
                if (again !== password) throw new Error('As senhas precisam ser iguais.');
                if (!/^\d{6,8}$/.test(code)) throw new Error('Digite o código recebido.');
                const existing = (await api().auth.getSession()).data.session;
                if (
                  !existing ||
                  existing.user.email?.toLowerCase() !== email.trim().toLowerCase()
                ) {
                  const verified = await api().auth.verifyOtp({
                    email: email.trim(),
                    token: code,
                    type: 'email',
                  });
                  if (verified.error || !verified.data.session)
                    throw new Error('Código inválido ou expirado. Peça um novo código.');
                }
                const updated = await api().auth.updateUser({ password });
                if (updated.error)
                  throw new Error(
                    'A senha não foi aceita. Confira os requisitos e tente novamente.',
                  );
                const session = (await api().auth.getSession()).data.session;
                if (!session)
                  throw new Error('Senha atualizada. Volte ao acesso e entre com a nova senha.');
                setPassword('');
                setAgain('');
                setCode('');
                const transfer = await client().auth.setSession({
                  access_token: session.access_token,
                  refresh_token: session.refresh_token,
                });
                if (transfer.error || !transfer.data.session)
                  throw new Error('Senha atualizada. Volte ao acesso e entre com a nova senha.');
                await acceptInteractiveSession(transfer.data.session);
                router.replace('/discover');
              })
            }
          />
          <Button
            title="Solicitar outro código ou corrigir e-mail"
            secondary
            busy={task.busy}
            onPress={() => {
              if (Date.now() - sentAt < 60000)
                task.setError('Aguarde um minuto antes de reenviar.');
              else {
                setSent(false);
                setCode('');
              }
            }}
          />
        </>
      )}
      <Notice message={task.error} />
    </Page>
  );
}
