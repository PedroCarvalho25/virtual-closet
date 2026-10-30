import { useMemo } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { Page, TopBar } from '@/components/ui';
import { Mural } from '@/social/Mural';
import type { MuralMode } from '@/social/types';
export default function MuralScreen() {
  const { mode, author, color } = useLocalSearchParams<{
    mode?: MuralMode;
    author?: string;
    color?: string;
  }>();
  const query = useMemo(() => ({ mode: mode || 'all', author, color }), [mode, author, color]);
  return (
    <Page scroll={false}>
      <Mural initialQuery={query} header={<TopBar back title="Publicações" />} />
    </Page>
  );
}
