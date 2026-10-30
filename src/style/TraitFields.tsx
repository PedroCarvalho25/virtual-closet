import { View } from 'react-native';
import { Label } from '@/components/ui';
import { Choices } from '@/evolution/components';
import { readTraits, volumes, textures, occasions, type StyleTraits } from './traits';
export function TraitFields({
  value,
  onChange,
}: {
  value?: StyleTraits;
  onChange: (value: StyleTraits) => void;
}) {
  const traits = readTraits(value);
  return (
    <View className="gap-3">
      <Label className="text-sm">Modelagem</Label>
      <Choices
        values={volumes}
        value={traits.volume}
        onChange={(volume) => onChange({ ...traits, volume })}
      />
      <Label className="text-sm">Textura ou estampa</Label>
      <Choices
        values={textures}
        value={traits.texture}
        onChange={(texture) => onChange({ ...traits, texture })}
      />
      <Label className="text-sm">Ocasião</Label>
      <Choices
        values={occasions}
        value={traits.occasion}
        onChange={(occasion) => onChange({ ...traits, occasion })}
      />
    </View>
  );
}
