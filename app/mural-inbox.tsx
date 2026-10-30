import { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { Button, Empty, Label, Loading, Notice, Page, PageTitle, TopBar } from '@/components/ui';
import { SoftPressable } from '@/components/motion';
import { useData, useTask } from '@/hooks/useData';
import { getInbox, socialAction } from '@/social/api';
import { SocialImage } from '@/social/Photo';
import type { ReceivedShare } from '@/social/types';

export default function InboxScreen() {
  const state = useData(useCallback(() => getInbox(), []));
  const task = useTask();
  const [extra, setExtra] = useState<ReceivedShare[]>([]);
  const [end, setEnd] = useState(false);
  const shares = [...new Map([...(state.data || []), ...extra].map((s) => [s.id, s])).values()];
  return (
    <Page>
      <TopBar back title="Recebidos" />
      <PageTitle title="Entre amigos." />
      <Notice message={state.error || task.error} action={() => void state.refresh()} />
      {state.loading && !state.data ? (
        <Loading />
      ) : shares.length === 0 ? (
        <Empty
          title="Nenhuma foto recebida"
          description="As referências enviadas pelos seus amigos aparecem aqui."
          icon="inbox"
        />
      ) : (
        shares.map((share) => (
          <SoftPressable
            key={share.id}
            accessibilityRole="button"
            accessibilityLabel={`Abrir foto enviada por ${share.sender.firstName}: ${share.publication.title}`}
            onPress={() =>
              void task.run(
                () => socialAction({ action: 'read', id: share.id }),
                () =>
                  router.push({
                    pathname: '/publication/[id]',
                    params: { id: share.publication.id },
                  }),
              )
            }
            className="flex-row items-center gap-4 rounded-2xl bg-paper p-3"
          >
            <SocialImage
              path={share.publication.thumbPath}
              label={share.publication.title}
              style={{ width: 78, height: 94, borderRadius: 12 }}
            />
            <View className="flex-1 gap-1">
              <Label className="text-xs text-accent">@{share.sender.username}</Label>
              <Text className="font-bold text-base text-ink">{share.publication.title}</Text>
              <Label className="text-xs text-muted">{share.read ? 'Visto' : 'Novo'}</Label>
            </View>
          </SoftPressable>
        ))
      )}
      {shares.length >= 30 && !end && (
        <Button
          title="Carregar mais recebidos"
          secondary
          busy={task.busy}
          onPress={() => {
            const last = shares.at(-1)!;
            void task.run(
              () => getInbox({ at: last.createdAt, id: last.id }),
              (rows) => {
                setExtra([...extra, ...rows]);
                setEnd(rows.length < 30);
              },
            );
          }}
        />
      )}
    </Page>
  );
}
