import { useCallback, useState } from 'react';
import { Share, View } from 'react-native';
import { router } from 'expo-router';
import * as Crypto from 'expo-crypto';
import { Button, Field, Label, Loading, Notice } from '@/components/ui';
import { ConfirmAction } from '@/components/ConfirmAction';
import { client } from '@/lib/supabase';
import { writer } from '@/lib/api';
import { useData, useTask } from '@/hooks/useData';
import { useAuth } from '@/stores/auth';
import { ideasPreview } from '@/preview/config';
import { Card, Choices, type StyleProps } from './components';
import type { CircleAction, CircleData, CircleMessage } from './social';
import { categories } from '@/types/domain';
async function exchange(action?: CircleAction): Promise<CircleData> {
  if (action) writer();
  if (ideasPreview) {
    const r = await fetch('https://closet-test.supabase.co/preview/v1/circles', {
      method: action ? 'POST' : 'GET',
      headers: { 'Content-Type': 'application/json' },
      body: action ? JSON.stringify(action) : undefined,
      signal: AbortSignal.timeout(15000),
    });
    const result = await r.json();
    if (!r.ok) throw new Error(result.message || 'Não foi possível atualizar o círculo.');
    return result;
  }
  const result = action
    ? await client().rpc('circle_action', { p_action: action })
    : await client().rpc('circles_snapshot', {});
  if (result.error)
    throw new Error(
      'Não foi possível atualizar os círculos. Confira a conexão e a atualização gratuita do projeto.',
    );
  return result.data;
}
export function Circles({ data, e, act, busy }: StyleProps) {
  const load = useCallback(() => exchange(), []),
    result = useData(load),
    task = useTask(),
    userId = useAuth((s) => s.session?.user.id);
  const [selected, setSelected] = useState(''),
    [name, setName] = useState(e.profile.name),
    [title, setTitle] = useState(''),
    [token, setToken] = useState(''),
    [invite, setInvite] = useState(''),
    [body, setBody] = useState(''),
    [kind, setKind] = useState<CircleMessage['kind']>('request'),
    [outfits, setOutfits] = useState<string[]>([]),
    [parent, setParent] = useState<string | null>(null);
  const circle = result.data?.circles.find((c) => c.id === selected) || result.data?.circles[0];
  async function run(action: CircleAction) {
    await task.run(
      () => exchange(action),
      (r) => {
        setInvite(r.invite || '');
        setBody('');
        setParent(null);
        void result.refresh();
      },
    );
  }
  return (
    <>
      <Notice message={result.error} action={result.refresh} />
      <Notice message={task.error} />
      {result.loading && !result.data && <Loading />}
      <Card title="Seu círculo, suas escolhas">
        <Label className="text-sm text-muted">
          Entre por convite e compartilhe receitas de looks, pedidos e enquetes. Preços, fotos
          privadas e calendário não são enviados.
        </Label>
        <Field label="Seu nome no círculo" value={name} onChangeText={setName} maxLength={80} />
        <Field label="Nome do novo círculo" value={title} onChangeText={setTitle} maxLength={80} />
        <Button
          title="Criar círculo privado"
          icon="users"
          busy={task.busy}
          disabled={!name.trim() || !title.trim()}
          onPress={() => void run({ action: 'create', title, name })}
        />
        <Field
          label="Código de convite"
          value={token}
          onChangeText={setToken}
          autoCapitalize="none"
          maxLength={36}
        />
        <Button
          title="Entrar com convite"
          secondary
          disabled={!name.trim() || !token.trim() || task.busy}
          onPress={() => void run({ action: 'join', token: token.trim(), name })}
        />
      </Card>
      {circle && (
        <>
          <Choices
            values={Object.fromEntries(result.data!.circles.map((c) => [c.id, c.title]))}
            value={circle.id}
            onChange={(id) => {
              setSelected(id);
              setInvite('');
            }}
          />
          <Card title={circle.title}>
            <Label className="text-sm">{circle.members.map((m) => m.name).join(' · ')}</Label>
            {circle.ownerId === userId ? (
              <>
                <Button
                  title="Gerar convite de uso único"
                  secondary
                  disabled={task.busy}
                  onPress={() => void run({ action: 'invite', circleId: circle.id })}
                />
                {invite && (
                  <>
                    <Field label="Convite válido por sete dias" value={invite} editable={false} />
                    <Button
                      title="Compartilhar este convite"
                      icon="share-2"
                      onPress={() =>
                        void Share.share({
                          message: `Vamos montar looks juntos no Virtual Closet? Entre em Círculos de estilo e use este código: ${invite}. Convite de uso único, válido por sete dias.`,
                        }).catch(() => task.setError('Não foi possível abrir o compartilhamento.'))
                      }
                    />
                    <Button
                      title="Cancelar convite"
                      secondary
                      onPress={() => void run({ action: 'revoke_invite', circleId: circle.id })}
                    />
                  </>
                )}
                {circle.members
                  .filter((m) => m.id !== userId)
                  .map((m) => (
                    <ConfirmAction
                      key={m.id}
                      label={`Remover ${m.name}`}
                      description="Essa pessoa perderá o acesso a este círculo."
                      busy={task.busy}
                      onConfirm={() =>
                        void run({ action: 'remove_member', circleId: circle.id, userId: m.id })
                      }
                    />
                  ))}
                <ConfirmAction
                  label="Excluir círculo"
                  description="Excluir este círculo, seus convites e todas as mensagens? Esta ação não apaga closets pessoais."
                  busy={task.busy}
                  onConfirm={() => void run({ action: 'delete_circle', circleId: circle.id })}
                />
              </>
            ) : (
              <ConfirmAction
                label="Sair deste círculo"
                description="Você perderá acesso às mensagens e precisará de um novo convite para voltar."
                busy={task.busy}
                onConfirm={() => void run({ action: 'leave', circleId: circle.id })}
              />
            )}
          </Card>
          <Card title={parent ? 'Responder no contexto' : 'Uma ideia para compartilhar'}>
            <Choices
              values={{
                request: 'Pedir uma ideia',
                recipe: 'Receita de look',
                poll: 'Enquete A/B',
                comment: 'Conversar',
              }}
              value={kind}
              onChange={(v) => {
                setKind(v);
                setOutfits([]);
              }}
            />
            <Field
              label="Sua mensagem"
              value={body}
              onChangeText={setBody}
              multiline
              maxLength={500}
            />
            {['recipe', 'poll'].includes(kind) && (
              <>
                <Label className="text-xs">
                  {kind === 'poll' ? 'Escolha dois looks.' : 'Escolha um look.'} Compartilhamos
                  somente nome, categorias e cores.
                </Label>
                {data.outfits.map((o) => (
                  <Button
                    key={o.id}
                    title={`${outfits.includes(o.id) ? '✓ ' : ''}${o.name || 'Meu look'}`}
                    secondary
                    small
                    onPress={() =>
                      setOutfits(
                        outfits.includes(o.id)
                          ? outfits.filter((id) => id !== o.id)
                          : [...outfits, o.id].slice(-(kind === 'poll' ? 2 : 1)),
                      )
                    }
                  />
                ))}
              </>
            )}
            <Button
              title="Enviar ao círculo"
              busy={task.busy}
              disabled={
                !body.trim() ||
                (['recipe', 'poll'].includes(kind) && outfits.length !== (kind === 'poll' ? 2 : 1))
              }
              onPress={() =>
                void run({
                  action: 'message',
                  circleId: circle.id,
                  kind,
                  body,
                  outfitIds: outfits,
                  parentId: parent,
                })
              }
            />
            {parent && (
              <Button title="Cancelar resposta" secondary onPress={() => setParent(null)} />
            )}
          </Card>
          {circle.messages.map((m) => (
            <Card
              key={m.id}
              title={circle.members.find((x) => x.id === m.userId)?.name || 'Participante anterior'}
            >
              {m.parentId && (
                <Label className="text-xs text-muted">
                  Em resposta a:{' '}
                  {circle.messages.find((x) => x.id === m.parentId)?.body || 'mensagem anterior'}
                </Label>
              )}
              <Label>{m.body}</Label>
              {m.cards.map((card, index) => (
                <View key={index} className="gap-3 rounded-2xl bg-sage p-4">
                  <Label className="font-medium">
                    {m.kind === 'poll' ? `${index === 0 ? 'A' : 'B'} · ` : ''}
                    {card.title}
                  </Label>
                  {card.slots.map((s, i) => (
                    <Label key={i} className="text-xs">
                      {categories[s.category]} · {s.color}
                    </Label>
                  ))}
                  {m.kind === 'poll' && (
                    <Button
                      title={`Votar em ${index === 0 ? 'A' : 'B'} · ${m.votes.filter((v) => v.choice === index).length} voto(s)`}
                      secondary
                      disabled={task.busy}
                      onPress={() =>
                        void run({
                          action: 'vote',
                          circleId: circle.id,
                          messageId: m.id,
                          choice: index,
                        })
                      }
                    />
                  )}
                  <Button
                    title="Recriar no meu closet"
                    icon="shuffle"
                    disabled={busy}
                    onPress={() => {
                      const id = Crypto.randomUUID();
                      void act({
                        action: 'recipe',
                        recipe: {
                          id,
                          title: card.title.slice(0, 80),
                          folder: 'Do meu círculo',
                          source: '',
                          note: `Compartilhado por ${circle.members.find((x) => x.id === m.userId)?.name || 'participante'} em ${circle.title}`.slice(
                            0,
                            500,
                          ),
                          slots: card.slots.slice(0, 8),
                        },
                      }).then((ok) => {
                        if (ok)
                          router.push({
                            pathname: '/style',
                            params: { view: 'remix', recipe: id },
                          });
                      });
                    }}
                  />
                </View>
              ))}
              <Button
                title="Responder a esta mensagem"
                secondary
                small
                onPress={() => {
                  setParent(m.id);
                  setKind('comment');
                }}
              />
              {(m.userId === userId || circle.ownerId === userId) && (
                <ConfirmAction
                  label="Remover mensagem"
                  description="Remover esta mensagem e suas respostas do círculo?"
                  busy={task.busy}
                  onConfirm={() =>
                    void run({ action: 'delete_message', circleId: circle.id, messageId: m.id })
                  }
                />
              )}
            </Card>
          ))}
          <Label className="text-xs text-muted">
            Exibimos as 100 mensagens mais recentes. Receitas já copiadas para outro closet
            pertencem à biblioteca de quem as guardou.
          </Label>
        </>
      )}
    </>
  );
}
