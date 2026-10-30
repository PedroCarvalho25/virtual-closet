import { router } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { client } from '@/lib/supabase';
import { validateAuth } from '@/lib/validation';
import { meetsSignupPasswordPolicy, SIGNUP_PASSWORD_HINT } from '@/lib/password';
import { useAuth } from '@/stores/auth';
import { useTask } from '@/hooks/useData';
import { Brand, Button, Field, Label, Notice, Page } from '@/components/ui';
import { WelcomeCollage } from '@/components/WelcomeCollage';
import { acceptInteractiveSession } from '@/lib/auth-session';
import { CodeVerification } from '@/identity/CodeVerification';
import { normalizeProfile, profileDraft, normalizeUsername } from '@/identity/validation';
import { usernameAvailable } from '@/identity/api';
import { SexChoices } from '@/identity/GreetingSettings';
import { greetingKey, type GreetingSex } from '@/identity/greetings';
export default function LoginScreen() {
  const [signup, setSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [sex, setSex] = useState<GreetingSex>('unspecified');
  const [verification, setVerification] = useState<{ email: string; sent: boolean } | null>(null);
  const task = useTask();
  const passwordError = signup && task.error === SIGNUP_PASSWORD_HINT;
  const { online, error: sessionError } = useAuth();
  const submit = () => {
    void task.run(async () => {
      if (!online) throw new Error('Conecte-se à internet para entrar ou criar uma conta.');
      validateAuth(email, password, signup);
      let profile;
      if (signup) {
        profile = normalizeProfile({ ...profileDraft(), firstName, lastName, username });
        if (!(await usernameAvailable(profile.username)))
          throw new Error('Esse @ já está em uso. Escolha outro nome de usuário.');
      }
      const result = signup
        ? await client().auth.signUp({
            email: email.trim(),
            password,
            options: {
              data: {
                first_name: profile!.firstName,
                last_name: profile!.lastName,
                username: profile!.username,
                [greetingKey]: { sex, preferredName: '', usePreferredName: false },
              },
            },
          })
        : await client().auth.signInWithPassword({ email: email.trim(), password });
      if (result.error?.code === 'email_not_confirmed') {
        setPassword('');
        setVerification({ email: email.trim(), sent: false });
        return;
      }
      if (result.error) throw result.error;
      if (result.data.session) await acceptInteractiveSession(result.data.session);
      if (signup && !result.data.session) {
        setVerification({ email: email.trim(), sent: true });
        setPassword('');
      }
    });
  };
  if (verification)
    return (
      <Page>
        <Brand />
        <CodeVerification
          email={verification.email}
          signup
          alreadySent={verification.sent}
          onCancel={() => {
            setVerification(null);
            setSignup(false);
            task.setError(null);
          }}
        />
      </Page>
    );
  return (
    <Page>
      <View className="py-5">
        <Brand />
      </View>
      <WelcomeCollage />
      {!signup && (
        <Button
          title="Esqueci minha senha"
          secondary
          small
          onPress={() => router.push('/recover')}
        />
      )}
      <View className="gap-5">
        <Text
          accessibilityRole="header"
          className="font-display text-[34px] tracking-[-1px] text-ink"
        >
          {signup ? 'Criar conta' : 'Entrar'}
        </Text>
        {signup && (
          <>
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Field
                  label="Nome"
                  value={firstName}
                  onChangeText={setFirstName}
                  maxLength={50}
                  textContentType="givenName"
                  autoComplete="given-name"
                  editable={!task.busy}
                />
              </View>
              <View className="flex-1">
                <Field
                  label="Sobrenome"
                  value={lastName}
                  onChangeText={setLastName}
                  maxLength={80}
                  textContentType="familyName"
                  autoComplete="family-name"
                  editable={!task.busy}
                />
              </View>
            </View>
            <Field
              label="Nome de usuário"
              placeholder="seu.estilo"
              value={username}
              onChangeText={(value) => setUsername(normalizeUsername(value))}
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={25}
              textContentType="username"
              autoComplete="username"
              editable={!task.busy}
            />
            <Label className="text-xs leading-5 text-muted">
              Seu @ é único e aparece em destaque no perfil. Depois de escolhido, pode mudar a cada
              30 dias.
            </Label>
            <SexChoices value={sex} onChange={setSex} disabled={task.busy} />
          </>
        )}
        <Field
          label="E-mail"
          placeholder="voce@exemplo.com"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          textContentType="emailAddress"
          autoComplete="email"
          value={email}
          onChangeText={setEmail}
          editable={!task.busy}
        />
        <View className="gap-2">
          <Field
            label="Senha"
            placeholder="Sua senha"
            secureTextEntry
            textContentType={signup ? 'newPassword' : 'password'}
            autoComplete={signup ? 'new-password' : 'current-password'}
            accessibilityHint={passwordError ? SIGNUP_PASSWORD_HINT : undefined}
            value={password}
            onChangeText={(value) => {
              setPassword(value);
              if (passwordError && meetsSignupPasswordPolicy(value)) task.setError(null);
            }}
            editable={!task.busy}
            onSubmitEditing={submit}
          />
          {passwordError && (
            <Text
              accessibilityRole="alert"
              accessibilityLiveRegion="polite"
              className="font-sans text-[10px] leading-4 text-[#B33A32]"
            >
              {SIGNUP_PASSWORD_HINT}
            </Text>
          )}
        </View>
        <Notice message={(passwordError ? null : task.error) || sessionError} />
        <Notice message={task.success} kind="success" />
        <Button
          title={signup ? 'Criar minha conta' : 'Entrar no meu closet'}
          icon="arrow-right"
          busy={task.busy}
          disabled={!online}
          onPress={submit}
        />
        <Button
          title={signup ? 'Já tenho uma conta' : 'Primeira vez? Criar conta'}
          secondary
          disabled={task.busy}
          onPress={() => {
            setSignup(!signup);
            task.setError(null);
            task.setSuccess(null);
          }}
        />
      </View>
      <Label className="text-center text-[11px] leading-5 text-muted">
        Roupas, fotos e publicações são privadas.
      </Label>
    </Page>
  );
}
