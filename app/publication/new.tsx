import { useState } from 'react';
import { Image, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Button, Chip, Field, Label, Notice, Page, PageTitle, TopBar } from '@/components/ui';
import { useTask } from '@/hooks/useData';
import { useIdentity } from '@/identity/store';
import { useAuth } from '@/stores/auth';
import { pickSocialPhoto, publishPhoto, type SocialPhoto } from '@/social/media';
import { useMural } from '@/social/store';
import { colorFilters } from '@/social/types';
export default function PublishScreen() {
  const [photo, setPhoto] = useState<SocialPhoto | null>(null);
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [tags, setTags] = useState('');
  const [colors, setColors] = useState<string[]>([]);
  const [consent, setConsent] = useState(false);
  const profile = useIdentity((s) => s.account?.profile);
  const online = useAuth((s) => s.online);
  const task = useTask();
  return (
    <Page>
      <TopBar back title="Nova publicação" />
      <PageTitle title="Sua foto no mural." />
      <Notice message={task.error} />
      {!profile?.discoverable && (
        <Notice kind="info" message="Ative o perfil público em Minha conta para publicar." />
      )}
      {photo && (
        <Image
          source={{ uri: photo.uri }}
          accessibilityLabel="Prévia da foto escolhida"
          style={{
            width: '100%',
            height: 320,
            borderRadius: 24,
            backgroundColor: '#E8DEC6',
            resizeMode: 'contain',
          }}
        />
      )}
      <Button
        title={photo ? 'Trocar foto' : 'Escolher foto'}
        icon="image"
        secondary
        busy={task.busy}
        onPress={() =>
          void task.run(pickSocialPhoto, (value) => {
            if (value) setPhoto(value);
          })
        }
      />
      <Field
        label="Título"
        value={title}
        onChangeText={setTitle}
        maxLength={100}
        placeholder="O que chamou sua atenção?"
      />
      <Field
        label="Legenda (opcional)"
        value={caption}
        onChangeText={setCaption}
        maxLength={1200}
        multiline
      />
      <Field
        label="Tags (separadas por vírgula)"
        value={tags}
        onChangeText={setTags}
        maxLength={300}
        placeholder="urbano, tricô, conforto"
      />
      <View className="gap-2">
        <Text className="font-medium text-xs text-ink">Cores · até 5</Text>
        <View className="flex-row flex-wrap gap-2">
          {colorFilters.map(([name]) => (
            <Chip
              key={name}
              label={name}
              selected={colors.includes(name)}
              onPress={() =>
                setColors(
                  colors.includes(name)
                    ? colors.filter((c) => c !== name)
                    : colors.length < 5
                      ? [...colors, name]
                      : colors,
                )
              }
            />
          ))}
        </View>
      </View>
      <Chip
        label={
          consent
            ? '✓ Tenho direito de publicar esta imagem'
            : 'Tenho direito de publicar esta imagem'
        }
        selected={consent}
        onPress={() => setConsent(!consent)}
      />
      <Label className="text-xs leading-5 text-muted">
        Ao publicar, confirmo que esta é uma fotografia feita por uma pessoa, sem geração por IA. A
        foto será pública no mural e poderá ser salva, republicada e baixada. Seu closet e diário
        continuam privados.
      </Label>
      <Button
        title="Publicar no mural"
        icon="arrow-up-right"
        busy={task.busy}
        disabled={!online || !photo || !title.trim() || !consent || !profile?.discoverable}
        onPress={() =>
          void task.run(
            async () => {
              const normalized = tags
                .split(',')
                .map((t) => t.trim().replace(/^#+/, ''))
                .filter(Boolean);
              if (normalized.length > 12) throw new Error('Use no máximo 12 tags.');
              return publishPhoto(photo!, {
                title: title.trim(),
                caption: caption.trim(),
                tags: normalized,
                colors,
              });
            },
            (publication) => {
              void useIdentity.getState().refresh();
              useMural.getState().search({});
              router.replace({ pathname: '/publication/[id]', params: { id: publication.id } });
            },
          )
        }
      />
    </Page>
  );
}
