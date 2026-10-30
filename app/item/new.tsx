import { ItemForm } from '@/components/ItemForm';
import { OfflineNotice } from '@/components/OfflineNotice';
import { Page, PageTitle, TopBar } from '@/components/ui';
import { router, useLocalSearchParams } from 'expo-router';
import { categories, type Category } from '@/types/domain';
export default function NewItemScreen() {
  const params = useLocalSearchParams<{ category?: string; journey?: string }>();
  const category =
    params.category && Object.hasOwn(categories, params.category)
      ? (params.category as Category)
      : 'camiseta';
  const guided = params.journey === 'first-look';
  return (
    <Page>
      <TopBar back title="Nova peça" />
      <PageTitle title="O que vamos guardar?" />
      <OfflineNotice />
      <ItemForm
        initialCategory={category}
        onSaved={
          guided
            ? (result) =>
                router.dismissTo({
                  pathname: '/discover',
                  params: {
                    saved: result.id,
                    ...(result.warning ? { warning: result.warning } : {}),
                  },
                })
            : undefined
        }
      />
    </Page>
  );
}
