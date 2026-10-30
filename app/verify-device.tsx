import { Page, Brand, Notice } from '@/components/ui';
import { useAuth } from '@/stores/auth';
import { signOutOnDevice } from '@/lib/auth-session';
import { CodeVerification } from '@/identity/CodeVerification';
import { useTask } from '@/hooks/useData';
export default function VerifyDeviceScreen() {
  const email = useAuth((s) => s.session?.user.email);
  const task = useTask();
  return (
    <Page>
      <Brand />
      {email && <CodeVerification email={email} onCancel={() => void task.run(signOutOnDevice)} />}
      <Notice message={task.error} />
    </Page>
  );
}
