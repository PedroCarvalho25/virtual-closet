import { useEffect, useRef, useState } from 'react';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { usernameError } from './validation';
import { useIdentity } from './store';
import { useAuth } from '@/stores/auth';

// Keep a shared profile destination through login, device verification and setup.
export function ProfileLink() {
  const session = useAuth((s) => s.session);
  const authReady = useAuth((s) => s.ready);
  const identity = useIdentity();
  const ready =
    authReady &&
    !!session &&
    identity.status === 'verified' &&
    identity.owner === session.user.id &&
    !!identity.account?.profile;
  const [target, setTarget] = useState<string | null>(null);
  const handled = useRef<string | null>(null);
  useEffect(() => {
    const capture = (url: string | null) => {
      if (!url) return;
      const path = Linking.parse(url).path || '';
      const match = path.match(/(?:^|\/)u\/([a-zA-Z0-9._]+)\/?$/);
      if (match?.[1] && !usernameError(match[1])) setTarget(match[1].toLowerCase());
    };
    void Linking.getInitialURL()
      .then(capture)
      .catch(() => {});
    const listener = Linking.addEventListener('url', ({ url }) => {
      handled.current = null;
      capture(url);
    });
    return () => listener.remove();
  }, []);
  useEffect(() => {
    if (ready && target && handled.current !== target) {
      handled.current = target;
      router.replace({ pathname: '/u/[username]', params: { username: target } });
    }
  }, [ready, target]);
  return null;
}
