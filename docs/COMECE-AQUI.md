# Virtual Closet no seu iPhone 12 — sem pagar

Você não precisa de Mac, Xcode, cartão de crédito ou assinatura Apple Developer para usar o app pelo **Expo Go**. O computador deve permanecer ligado com o Expo rodando. A publicação como aplicativo independente na App Store é outra etapa e exige a assinatura paga da Apple; ela não faz parte deste caminho gratuito.

## Acompanhamento atual

Em 06/10/2026, o usuário confirmou que criou o projeto, executou o SQL com “Success. No rows returned” e desativou a confirmação de e-mail. **Não repetir o SQL inicial.** A conexão local também foi concluída e verificada. O Expo Go já está instalado. Falta abrir e testar no iPhone quando o usuário chegar em casa, pois não tem acesso ao Wi-Fi da empresa.

O usuário prefere uma instrução por vez. Não solicitar senha pelo chat nem entregar vários caminhos de menu simultaneamente.

**Atualização de 09/10/2026:** o usuário executou as duas migrações incrementais e confirmou **Success. No rows returned**. Não executar novamente. A apresentação de terça será no computador; siga [o guia da apresentação](APRESENTACAO-TERCA.md). Os passos de criação abaixo são uma referência para uma instalação nova. Consulte [o contexto atual](../RETOMAR-NO-GPT-6-ASTRA.md).

## 1. Crie seu Supabase gratuito

1. Abra https://supabase.com/dashboard/sign-up e crie sua conta.
2. Crie uma organização **Free** e um novo projeto. Escolha a região mais próxima. Guarde a senha do banco em seu gerenciador de senhas; ela não entra no aplicativo.
3. Espere o projeto terminar de iniciar.
4. No **SQL Editor**, abra uma consulta, cole todo o conteúdo de `supabase/migrations/202610050001_initial.sql` e execute uma vez. Use um projeto novo: a migration cria tabelas, regras e bucket.
5. O botão **Connect**, no topo do projeto, reúne os dados de conexão. Na versão do painel mostrada pelo usuário, a aba **Framework** exibe as variáveis públicas do aplicativo; a captura confirmou esse nome. O nome da variável pode começar por `NEXT_PUBLIC_` ou `VITE_`; o assistente local precisa apenas do valor da URL e da chave pública. A chave `anon` legada também é aceita. Nunca use `service_role`, `sb_secret_...` ou uma conexão `postgresql://`. Os caminhos dos menus laterais mudam entre versões do painel.

Não precisa contratar Storage, instalar Docker ou criar outro backend. O bucket privado `closet-photos` já é criado pelo SQL.

## 2. Escolha a confirmação de e-mail

Para testar sozinho, gratuitamente e sem configurar um serviço de e-mail, em **Authentication → Sign In / Providers → Email**, desative **Confirm email**. Faça isso apenas no seu projeto pessoal de desenvolvimento. Você poderá criar sua conta pelo aplicativo e entrar imediatamente.

O serviço padrão de e-mail do Supabase tem limites e restrições de destinatários; ele não é um serviço de envio geral. Se você mantiver a confirmação habilitada, configure um SMTP que aceite seus destinatários. Há provedores com cotas gratuitas, mas nenhum é necessário para o teste pessoal acima. O app informa que a conta aguarda confirmação e não simula login.

Com confirmação habilitada, o link pode terminar em uma página web configurada em **Authentication → URL Configuration → Site URL**. Depois de confirmar, volte ao Expo Go e entre com e-mail/senha. O MVP não depende de abrir uma sessão por deep link. Não prometa confirmação por um redirect inexistente.

## 3. Conecte o projeto

Com o assistente local em execução, abra http://127.0.0.1:4175/connect no computador. Em **Connect → Framework**, clique em **Copy prompt**, à direita de **Follow these steps**. Cole tudo na caixa **Cole aqui o texto copiado do Supabase** e clique em **Conectar meu projeto**. O assistente extrai somente a URL e a chave pública, sem executar o texto. Os dois campos manuais continuam disponíveis como alternativa. O assistente valida a chave e salva o arquivo local automaticamente. Não envie esses valores no chat.

A URL tem o formato `https://seu-projeto.supabase.co`. A chave pública começa com `sb_publishable_`. A URL e a chave identificam o projeto; as regras RLS do banco protegem os dados. A senha do banco não entra no aplicativo.

Se o assistente não estiver em execução, quem estiver dando suporte deve iniciar `node scripts/design-preview.mjs` na pasta do projeto. Como alternativa técnica, copie `.env.example` para `.env.local` e configure `EXPO_PUBLIC_SUPABASE_URL` e `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Esse arquivo é ignorado pelo Git.

## 4. Abra no iPhone

1. Na App Store do iPhone 12, instale **Expo Go**, gratuitamente. Mantenha o iOS e o Expo Go atualizados para a versão compatível com o SDK do projeto.
2. Coloque iPhone e computador na **mesma rede Wi-Fi**.
3. No computador, execute:

```powershell
npm install
npm start
```

4. Leia o QR code do terminal pela **Câmera do iPhone**, e toque no link para abrir o Expo Go. Se o Expo solicitar conta, use uma conta Expo gratuita.
5. Crie sua conta no aplicativo. Cadastre uma peça, crie um outfit, registre o uso e faça seu primeiro post privado.

Se ainda aparecer a tela de configuração, pare o terminal com `Ctrl+C` e execute `npm start -- --clear`. Confira os dois valores do arquivo e se você aplicou o SQL.

Se o celular não conectar: evite rede de convidados, desative temporariamente VPN no aparelho e use uma rede que permita comunicação entre dispositivos. Caso o Windows peça autorização para Node/Expo, permita na sua rede **privada**. Não é preciso abrir o computador à internet. Um hotspot pessoal também pode ser usado se ambos os dispositivos conseguirem se alcançar.

Para abrir no navegador do computador: `npm run web`. Esse teste ajuda a revisar as telas, mas não substitui os testes de câmera/permissões no iPhone.

## 5. Teste rápido no aparelho

- Cadastre uma camiseta com foto da galeria. Abra, edite e confira se a foto continua correta.
- Cadastre um tênis: o caimento deve desaparecer; a numeração é obrigatória.
- Negue a câmera uma vez e confira a orientação. Depois permita em Ajustes e tente novamente. Cancele uma escolha de foto e confirme que o formulário continua intacto.
- Crie um outfit com as duas peças. Registre hoje e uma data anterior; repita o mesmo dia para conferir a mensagem de duplicidade.
- Arquive uma peça e confirme que ela continua no outfit. Restaure-a.
- Publique e remova um post. O outfit e o uso devem permanecer.
- Após carregar peças/outfits, desligue a rede. Consulte o que já foi carregado; salvar deve ficar bloqueado. Reconecte e confira a atualização.
- Saia, entre com uma segunda conta e confira que os dados da primeira não aparecem.

## Limites do custo zero

O Supabase Free tem cotas. Na consulta feita durante a implementação: 500 MB de banco, 1 GB de arquivos e cotas de tráfego; projetos gratuitos podem ser pausados por inatividade. Confira os valores atuais em https://supabase.com/pricing. As fotos são comprimidas e limitadas a 2 MB, geralmente bem menores. Não habilite upgrades pagos nem recursos fora do plano gratuito.

Se o projeto atingir uma cota, preserve seus dados, exporte um backup e reduza imagens/arquivos órfãos antes de considerar outra solução. Não existe armazenamento gratuito ilimitado garantido. O MVP não depende de IA, domínio pago, anúncios ou APIs cobradas por uso.
