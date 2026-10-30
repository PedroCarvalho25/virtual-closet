# Revisão de regressão — 15/10/2026

**Resultado final:** duas falhas do app corrigidas, 166 testes de lógica/banco e 58 cenários únicos de navegador aprovados; TypeScript, ESLint e exportação iOS aprovados. App atualizado em <http://127.0.0.1:4211/discover> (build `2026-10-15T22:54:35.440Z`) e prévia em <http://127.0.0.1:4235/preview-app> (build `2026-10-15T22:53:48.455Z`).

A execução completa do navegador teve 56 aprovações e duas expectativas antigas de textos: confirmação do cadastro em lote e descrição da sugestão diária. Foram ajustadas à interface atual, preservando as verificações de persistência e conteúdo das peças/looks. Ambas passaram na repetição; um terceiro cenário repetido registrou a imagem corrigida. A primeira exportação iOS atingiu timeout; a repetição com a configuração local do Expo e cache existente terminou com status 0. Isso é compilação, sem teste físico.

Evidência visual: [duplicação reproduzida](screenshots/65-bug-duplicacao-antes.png) e [publicação corrigida](screenshots/66-publicacao-corrigida.png).

## Problemas encontrados e corrigidos

### Fotos duplicadas na publicação

O usuário relatou que a foto se repetia várias vezes depois de visitar a fonte externa e voltar ao app. A reprodução local confirmou que a imagem era duplicada quando a indicação de republicação passava a aparecer. A mesma atualização pode chegar na revalidação da publicação ao voltar à aba.

`ZoomPhoto` e `CreativeNote` eram elementos irmãos com a mesma chave React (`p.id`). Quando os elementos condicionais anteriores mudavam, a reconciliação podia deixar uma foto antiga na página e montar outra. As chaves agora incluem o tipo do componente: `photo:${p.id}` e `note:${p.id}`.

O novo teste reproduz a visita à fonte da mesma fotografia do relato, simula mudança de republicação enquanto a aba está oculta e retorna ao app três vezes. Verifica uma única foto, um único caderno, preservação da anotação ainda não salva, endereço correto e funcionamento dos controles. Outro teste repete republicar/desfazer três vezes. Antes da correção, esperava uma foto e encontrou duas; com a correção, passou.

### Foto em branco sem recuperação

Um teste de falha de rede no arquivo de alta resolução mostrou que a tentativa automática reutilizava o componente de imagem já em erro. Como o endereço local continuava igual, o componente não tentava carregar outra vez e não oferecia o botão de recuperação.

O componente da imagem agora recebe uma chave vinculada à tentativa. Há uma tentativa automática e, se ela falhar, o botão **Recarregar foto**. O teste bloqueia o arquivo, confere a presença do botão, libera o arquivo e verifica que a fotografia retorna em alta resolução.

## Escopo de revisão

| Área | Fluxos e falhas cobertos |
| --- | --- |
| Mural e publicação | Busca, cores, paginação, rolagem, dois toques, curtir/descurtir, salvar/remover, republicar/desfazer, origem/autoria, zoom, caderno, download, envios simulados, publicação e exclusão simuladas |
| Retorno e erros | Fonte externa, falha na abertura da fonte, mudança de republicação durante ausência, imagem indisponível, perda/retorno de conexão, reversão de ação otimista com falha |
| Conta | Cadastro, senha inválida, entrega de e-mail recusada simulada, código de aparelho, login, logout offline, perfil, foto, seguir/bloquear/remover, privacidade, banner, saudações, tema e acessibilidade |
| Closet e criação | Peças, filtros, favoritos, preços, looks, uso explícito, arquivamento, inspiração, recomendações, viagens, retrospectiva, círculos simulados e comparação |
| Ateliê | Coleções, convites simulados, capas/notas, rascunhos/versões, referências com roupas próprias, foto pessoal local, recorte e fila de fotos retomável |
| Portabilidade e proteção | JSON/ZIP, shell offline, ausência de dados privados no cache de arquivos estáticos, testes de autorização e integridade em banco local, layouts estreitos e redução de movimento |

## Ambientes e limites

Os testes de escrita usam contas e serviços simulados locais ou banco PGlite em memória. Os testes do build conectado interceptam autenticação quando necessário; nenhum e-mail real, publicação real, convite real ou exclusão de conta real faz parte desta rodada. Não foi acessada a sessão pessoal do usuário.

A prévia com login automático e o servidor estático para cadastro/login precisam de origens distintas. Uma execução inicial foi interrompida depois de detectar essa configuração incorreta; não foi considerada aprovação da suíte. A regressão usa `4235` para a prévia, `4240` para o servidor estático isolado e `4211` para o app conectado.

As verificações automatizadas não equivalem a testar todas as combinações possíveis, aparelho iPhone/Android físico ou persistência autenticada no Supabase hospedado. O pacote SQL 7–9 do ateliê continua independente e pendente de confirmação de aplicação. Nenhuma nova migração é necessária para as correções desta rodada. Não houve publicação pública, agentes, serviços pagos ou commits.

Resultados finais e versões: [VALIDACAO-REGRESSAO-20261015.json](VALIDACAO-REGRESSAO-20261015.json).
