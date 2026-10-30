import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { ItemBrowser } from '@/components/ItemBrowser';
import { Icon, Page, PageTitle, TopBar } from '@/components/ui';
export default function WardrobeScreen() {
  return (
    <Page scroll={false}>
      <ItemBrowser
        header={
          <>
            <TopBar />
            <View className="pb-1">
              <PageTitle title="Meu guarda-roupa" />
            </View>
          </>
        }
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Adicionar peça"
        onPress={() => router.push('/item/new')}
        className="absolute bottom-5 right-5 h-14 w-14 items-center justify-center rounded-[20px] bg-accent active:opacity-80"
        style={{ boxShadow: '0 6px 20px #29372426' }}
      >
        <Icon name="plus" size={26} color="#fff" />
      </Pressable>
    </Page>
  );
}
