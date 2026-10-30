import { Loading, Notice, Page, PageTitle, TopBar } from '@/components/ui';
import { Wishlist } from '@/wishes/Library';
import { useStudioScreen } from '@/preview/store';
import { freshEvolution } from '@/evolution/types';
export default function WishesScreen() {
  const state = useStudioScreen();
  return (
    <Page>
      <TopBar back title="Desejos" />
      <PageTitle
        title="Ficou na sua cabeça?"
        subtitle="Guarde a peça. Experimente as possibilidades."
      />
      <Notice message={state.error} action={state.load} />
      {state.data ? (
        <Wishlist
          data={state.data}
          e={state.data.evolution || freshEvolution()}
          act={state.act}
          busy={state.busy}
        />
      ) : (
        !state.error && <Loading />
      )}
    </Page>
  );
}
