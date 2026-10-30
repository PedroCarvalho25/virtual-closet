import { Brand, Page, PageTitle } from '@/components/ui';
import { useAuth } from '@/stores/auth';
import { useIdentity } from '@/identity/store';
import { ProfileForm } from '@/identity/ProfileForm';
import { profileDraft } from '@/identity/validation';
export default function CompleteProfileScreen() {
  const metadata = useAuth((s) => s.session?.user.user_metadata);
  return (
    <Page>
      <Brand />
      <PageTitle title="Seu perfil" subtitle="Foto, bio e estilo." />
      <ProfileForm
        initial={profileDraft(metadata)}
        onSaved={(account) => useIdentity.getState().accept(account)}
      />
    </Page>
  );
}
