import { useRef } from 'react';
import { Platform, Text, View } from 'react-native';
import { Button, Notice, colors } from '@/components/ui';
import { useTask } from '@/hooks/useData';
export function ShareCard({ lines }: { lines: string[] }) {
  const ref = useRef<View>(null),
    task = useTask();
  async function share() {
    await task.run(async () => {
      if (Platform.OS === 'web') {
        const canvas = document.createElement('canvas');
        canvas.width = 1080;
        canvas.height = 1350;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Não foi possível criar a imagem.');
        ctx.font = '500 34px sans-serif';
        const rows: { text: string; y: number }[] = [];
        let y = 280;
        for (const line of lines) {
          let row = '';
          for (const char of line) {
            if (ctx.measureText(row + char).width > 850) {
              rows.push({ text: row.trim(), y });
              y += 52;
              row = char;
            } else row += char;
          }
          rows.push({ text: row.trim(), y });
          y += 90;
        }
        canvas.height = Math.max(1350, y + 180);
        ctx.fillStyle = colors.canvas;
        ctx.fillRect(0, 0, 1080, canvas.height);
        ctx.fillStyle = '#D5F24A';
        ctx.fillRect(60, 60, 960, 120);
        ctx.fillStyle = '#17613E';
        ctx.font = '600 42px sans-serif';
        ctx.fillText('virtual closet.', 110, 140);
        ctx.font = '500 34px sans-serif';
        for (const row of rows) ctx.fillText(row.text, 110, row.y);
        ctx.font = '26px sans-serif';
        ctx.fillStyle = '#73786C';
        ctx.fillText('Virtual Closet', 110, canvas.height - 100);
        const blob = await new Promise<Blob>((resolve, reject) =>
          canvas.toBlob(
            (b) => (b ? resolve(b) : reject(new Error('Não foi possível exportar.'))),
            'image/png',
          ),
        );
        const url = URL.createObjectURL(blob),
          link = document.createElement('a');
        link.href = url;
        link.download = 'meu-mes-virtual-closet.png';
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        return;
      }
      const sharing = await import('expo-sharing');
      if (!(await sharing.isAvailableAsync()))
        throw new Error('O compartilhamento não está disponível neste aparelho.');
      const { captureRef } = await import('react-native-view-shot');
      const uri = await captureRef(ref, { format: 'png', quality: 1, result: 'tmpfile' });
      await sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Minha retrospectiva' });
    });
  }
  return (
    <View className="gap-4">
      <View
        ref={ref}
        collapsable={false}
        style={{
          backgroundColor: colors.canvas,
          padding: 24,
          borderRadius: 22,
          gap: 20,
          minHeight: 360,
        }}
      >
        <Text
          style={{
            fontFamily: 'DMSans_600SemiBold',
            color: '#17613E',
            fontSize: 22,
            backgroundColor: '#D5F24A',
            padding: 14,
            borderRadius: 14,
          }}
        >
          virtual closet.
        </Text>
        {lines.map((line, index) => (
          <Text
            key={index}
            style={{
              fontFamily: 'DMSans_500Medium',
              fontSize: index === 0 ? 22 : 16,
              color: '#20291F',
              lineHeight: index === 0 ? 30 : 25,
            }}
          >
            {line}
          </Text>
        ))}
        <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: '#73786C' }}>
          Virtual Closet
        </Text>
      </View>
      <Button
        title={
          Platform.OS === 'web'
            ? 'Baixar cartão da retrospectiva'
            : 'Compartilhar cartão da retrospectiva'
        }
        icon="image"
        busy={task.busy}
        onPress={() => void share()}
      />
      <Notice message={task.error} />
    </View>
  );
}
