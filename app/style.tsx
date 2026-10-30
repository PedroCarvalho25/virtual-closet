import { useLocalSearchParams } from 'expo-router';
import { Loading, Notice, Page, PageTitle, TopBar } from '@/components/ui';
import { Tag } from '@/preview/components';
import { useStudioScreen } from '@/preview/store';
import { ideasPreview } from '@/preview/config';
import { freshEvolution } from '@/evolution/types';
import { Today, StyleLab, StyleMemory } from '@/evolution/Everyday';
import { Inspirations, Remix, Wishlist } from '@/evolution/Library';
import { OperationalCloset, StyleProfileScreen, TravelDetails, Wrapped } from '@/evolution/Life';
import { Circles } from '@/evolution/Circles';
import { ClosetSprint } from '@/evolution/Sprint';
import { StyleHub, stylePages } from '@/evolution/Hub';
import { Discoveries, Stories } from '@/evolution/Discoveries';

export default function StyleScreen() {
  const params = useLocalSearchParams<{
    view?: string;
    recipe?: string;
    item?: string;
    plan?: string;
    create?: string;
  }>();
  const state = useStudioScreen(),
    view = params.view || 'hub',
    page = stylePages[view];
  const props = state.data
    ? {
        data: state.data,
        e: state.data.evolution || freshEvolution(),
        act: state.act,
        busy: state.busy,
      }
    : null;
  return (
    <Page key={view}>
      <TopBar back title="Meu espaço de estilo" />
      <PageTitle title={page?.title || 'Explorar'} subtitle={page?.detail} />
      {ideasPreview && <Tag>Prévia com dados de exemplo</Tag>}
      <Notice message={state.error} action={state.load} />
      {!props ? (
        !state.error && <Loading />
      ) : view === 'sprint' ? (
        <ClosetSprint />
      ) : view === 'today' ? (
        <Today {...props} />
      ) : view === 'inspirations' ? (
        <Inspirations {...props} startCreating={params.create === '1'} />
      ) : view === 'remix' ? (
        <Remix {...props} recipeId={params.recipe} />
      ) : view === 'memory' ? (
        <StyleMemory {...props} />
      ) : view === 'lab' ? (
        <StyleLab {...props} />
      ) : view === 'wishlist' ? (
        <Wishlist {...props} />
      ) : view === 'closet' ? (
        <OperationalCloset {...props} itemId={params.item} />
      ) : view === 'travel' ? (
        <TravelDetails {...props} planId={params.plan} />
      ) : view === 'wrapped' ? (
        <Wrapped {...props} />
      ) : view === 'profile' ? (
        <StyleProfileScreen {...props} />
      ) : view === 'circles' ? (
        <Circles {...props} />
      ) : view === 'stories' ? (
        <Stories {...props} />
      ) : view === 'challenges' ? (
        <Discoveries {...props} />
      ) : (
        <StyleHub {...props} />
      )}
    </Page>
  );
}
