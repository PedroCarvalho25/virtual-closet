import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ScrollView, Switch, Text, TextInput, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { fetchItems } from '@/lib/api';
import { itemGroups, type ItemGroup } from '@/lib/item-groups';
import { usePagedData } from '@/hooks/useData';
import { useClosetCache } from '@/stores/cache';
import { filterCachedItems } from '@/lib/validation';
import { categories, type Category, type WardrobeItem } from '@/types/domain';
import { ItemCard } from './cards';
import { Button, Chip, Empty, Icon, IconButton, Label, Loading, Notice, colors } from './ui';
import { OfflineNotice } from './OfflineNotice';

export function ItemBrowser({
  header,
  footer,
  selected,
  onSelect,
}: {
  header?: ReactNode;
  footer?: ReactNode;
  selected?: string[];
  onSelect?: (item: WardrobeItem) => void;
}) {
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<Category | null>(null);
  const [group, setGroup] = useState<ItemGroup | null>(null);
  const [archived, setArchived] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setQuery(search), 280);
    return () => clearTimeout(timer);
  }, [search]);
  const selectionMode = !!selected;
  const filters = useMemo(
    () => ({ search: query, category, group, archived: selectionMode ? false : archived }),
    [query, category, group, archived, selectionMode],
  );
  const { items } = useClosetCache();
  const cached = useMemo(() => filterCachedItems(items, filters), [items, filters]);
  const load = useCallback((page: number) => fetchItems(filters, page), [filters]);
  const result = usePagedData(load, cached);
  return (
    <FlashList
      data={result.data}
      masonry
      numColumns={2}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 80 }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      refreshing={result.loading && result.data.length > 0}
      onRefresh={result.refresh}
      onEndReached={result.more}
      onEndReachedThreshold={0.4}
      renderItem={({ item }) => (
        <View style={{ paddingHorizontal: 6 }}>
          <ItemCard
            item={item}
            selected={selected ? selected.includes(item.id) : undefined}
            onPress={onSelect ? () => onSelect(item) : undefined}
          />
        </View>
      )}
      ListHeaderComponent={
        <View className="gap-3 px-1.5 pb-3">
          {header}
          <OfflineNotice />
          <View className="flex-row items-center gap-2">
            <View className="min-h-12 flex-1 flex-row items-center gap-2.5 rounded-2xl bg-paper px-4">
              <Icon name="search" size={18} color={colors.muted} />
              <TextInput
                accessibilityLabel="Buscar peças por nome ou cor"
                placeholder="Buscar no seu closet"
                placeholderTextColor="#92988B"
                value={search}
                onChangeText={setSearch}
                className="min-h-12 flex-1 font-sans text-[13px] text-ink"
              />
            </View>
            {!selectionMode && (
              <View className={`rounded-2xl ${showOptions || archived ? 'bg-lemon' : 'bg-paper'}`}>
                <IconButton
                  icon="sliders"
                  label="Filtros do guarda-roupa"
                  onPress={() => setShowOptions(!showOptions)}
                />
              </View>
            )}
          </View>
          {showOptions && !selectionMode && (
            <View className="flex-row items-center justify-between rounded-2xl bg-paper px-4 py-2">
              <Label className="text-xs">Mostrar arquivadas</Label>
              <Switch
                accessibilityLabel="Mostrar arquivadas"
                value={archived}
                onValueChange={setArchived}
                trackColor={{ true: colors.accent }}
              />
            </View>
          )}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 7 }}
          >
            <Chip
              label="Tudo"
              selected={!group && !category}
              onPress={() => {
                setGroup(null);
                setCategory(null);
              }}
            />
            {Object.entries(itemGroups).map(([value, entry]) => (
              <Chip
                key={value}
                label={entry.label}
                selected={group === value}
                onPress={() => {
                  setGroup(value as ItemGroup);
                  setCategory(null);
                }}
              />
            ))}
          </ScrollView>
          {(showOptions || selectionMode) && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 7 }}
            >
              {Object.entries(categories)
                .filter(
                  ([value]) => !group || (itemGroups[group].categories as string[]).includes(value),
                )
                .map(([value, label]) => (
                  <Chip
                    key={value}
                    label={label}
                    selected={category === value}
                    onPress={() => setCategory(category === value ? null : (value as Category))}
                  />
                ))}
            </ScrollView>
          )}
          <View className="flex-row items-center justify-between px-0.5">
            <Text className="font-medium text-[11px] text-muted">
              {result.data.length}
              {result.hasMore ? '+' : ''} {result.data.length === 1 ? 'peça' : 'peças'}
              {archived ? ' · incluindo arquivadas' : ''}
            </Text>
            {selectionMode && (
              <Text className="font-semibold text-[11px] text-accent">
                {selected.length} selecionadas
              </Text>
            )}
          </View>
          <Notice message={result.error} action={result.refresh} />
        </View>
      }
      ListEmptyComponent={
        result.loading ? (
          <Loading />
        ) : result.error ? null : (
          <Empty
            title={query || category || group ? 'Nenhuma peça por aqui' : 'Vamos abrir espaço?'}
            description={
              query || category || group
                ? 'Tente outro nome, cor ou categoria.'
                : 'Adicione sua primeira peça para começar a organizar o seu closet.'
            }
            icon="grid"
          />
        )
      }
      ListFooterComponent={
        <View className="gap-4 px-1.5">
          {result.loading && result.data.length > 0 && <Loading />}
          {result.hasMore && !result.loading && (
            <Button title="Carregar mais peças" secondary onPress={result.more} />
          )}
          {footer}
        </View>
      }
    />
  );
}
