import { useState } from 'react';
import { Modal, ScrollView, View } from 'react-native';
import { Button, Label } from '@/components/ui';
import { categories, type Category } from '@/types/domain';
export function CategoryField({
  value,
  onChange,
}: {
  value: Category;
  onChange: (value: Category) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        title={`Tipo de peça: ${categories[value]}`}
        secondary
        icon="chevron-down"
        onPress={() => setOpen(true)}
      />
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View className="flex-1 justify-center bg-black/35 p-5">
          <View className="max-h-[80%] gap-3 rounded-[24px] bg-canvas p-5">
            <Label className="font-bold text-xl">Que peça é essa?</Label>
            <ScrollView contentContainerStyle={{ gap: 8 }}>
              {(Object.entries(categories) as [Category, string][]).map(([key, label]) => (
                <Button
                  key={key}
                  title={label}
                  secondary={value !== key}
                  onPress={() => {
                    onChange(key);
                    setOpen(false);
                  }}
                />
              ))}
            </ScrollView>
            <Button title="Fechar tipos de peça" secondary onPress={() => setOpen(false)} />
          </View>
        </View>
      </Modal>
    </>
  );
}
