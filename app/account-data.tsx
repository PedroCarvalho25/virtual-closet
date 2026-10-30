import { useState } from 'react';
import { Button, Field, Label, Notice, Page, PageTitle, TopBar } from '@/components/ui';
import { Card } from '@/evolution/components';
import { ConfirmAction } from '@/components/ConfirmAction';
import { useTask } from '@/hooks/useData';
import { downloadData, downloadMediaBatch, eraseAccount, exportAccount } from '@/account/data';
import { sendDeviceCode } from '@/identity/api';
export default function AccountDataScreen() {
  const [mediaOffset, setMediaOffset] = useState(0),
    [mediaTotal, setMediaTotal] = useState<number | null>(null);
  const task = useTask(),
    [deleting, setDeleting] = useState(false),
    [code, setCode] = useState(''),
    [confirmation, setConfirmation] = useState(''),
    [progress, setProgress] = useState(''),
    [sentAt, setSentAt] = useState(0);
  return (
    <Page>
      <TopBar back title="Sua conta e seus dados" />
      <PageTitle title="Seu acervo é seu" />
      <Card title="Leve seus dados com você">
        <Label className="text-sm">
          Baixe seus dados em JSON: peças, looks, histórico, planos, referências, coleções e
          vínculos das imagens. O arquivo contém informações privadas da sua conta.
        </Label>
        <Button
          title="Exportar meus dados"
          icon="download"
          busy={task.busy}
          onPress={() =>
            void task.run(
              async () => downloadData(await exportAccount()),
              () =>
                task.setSuccess(
                  'Exportação preparada. As imagens são listadas por arquivo no campo media.',
                ),
            )
          }
        />
        <Button
          title={`Baixar minhas imagens · lote ${Math.floor(mediaOffset / 10) + 1}`}
          secondary
          icon="image"
          busy={task.busy}
          disabled={mediaTotal !== null && mediaOffset >= mediaTotal}
          onPress={() =>
            void task.run(
              () => downloadMediaBatch(mediaOffset),
              (result) => {
                setMediaOffset(result.next);
                setMediaTotal(result.total);
                task.setSuccess(
                  `${result.next} de ${result.total} imagens preparadas em arquivos ZIP.`,
                );
              },
            )
          }
        />
        <Label className="text-xs text-muted">
          As imagens são baixadas em lotes de dez para manter o aparelho responsivo. Fotografias
          editoriais do Mural não fazem parte do seu inventário.
        </Label>
      </Card>
      <Notice message={task.error} />
      <Notice message={task.success} kind="success" />
      <Card title="Encerrar minha conta">
        <Label className="text-sm">
          A exclusão remove suas imagens, seu closet, histórico, perfil, publicações e coleções
          próprias. Círculos criados por você também serão excluídos. As fotos do acervo editorial
          permanecem no Mural.
        </Label>
        <Label className="text-xs text-muted">
          Exporte o que deseja guardar antes de continuar. A limpeza começa após a confirmação e não
          pode ser desfeita. Se a conexão falhar durante a limpeza, retome por esta tela.
        </Label>
        {!deleting ? (
          <Button title="Preparar exclusão da conta" secondary onPress={() => setDeleting(true)} />
        ) : (
          <>
            <Button
              title="Enviar código de confirmação para meu e-mail"
              secondary
              busy={task.busy}
              onPress={() =>
                void task.run(
                  async () => {
                    if (Date.now() - sentAt < 60000)
                      throw new Error('Aguarde um minuto para reenviar.');
                    await sendDeviceCode();
                    setSentAt(Date.now());
                  },
                  () => task.setSuccess('Código enviado. Use-o em até dez minutos.'),
                )
              }
            />
            <Field
              label="Código recebido por e-mail"
              value={code}
              onChangeText={(v) => setCode(v.replace(/\D/g, ''))}
              maxLength={8}
              keyboardType="number-pad"
            />
            <Field
              label="Digite EXCLUIR MINHA CONTA"
              value={confirmation}
              onChangeText={setConfirmation}
              autoCapitalize="characters"
            />
            <ConfirmAction
              label="Excluir definitivamente minha conta"
              description="Confirmar a limpeza das imagens e a exclusão definitiva da conta? Esta ação não pode ser desfeita."
              busy={task.busy}
              onConfirm={() => void task.run(() => eraseAccount(code, confirmation, setProgress))}
            />
            <Button
              title="Manter minha conta"
              secondary
              disabled={task.busy}
              onPress={() => {
                setDeleting(false);
                setCode('');
                setConfirmation('');
              }}
            />
            {!!progress && <Label className="text-sm">{progress}</Label>}
          </>
        )}
      </Card>
    </Page>
  );
}
