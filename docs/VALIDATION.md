# Validação mais recente — mural, 14/10/2026

## 15/10 — Ateliê e novas jornadas

164 testes em 25 suítes; TypeScript/ESLint aprovados; cinco jornadas novas da prévia e três do build real passaram. Exportação iOS status 0, sem aparelho físico. Geração realista rejeitada por desempenho local (não habilitada). Novas migrações 7–9 testadas no pacote único, ainda não aplicadas ao serviço hospedado. [Evidência e limites](VALIDACAO-ATELIE-20261015.json), [entrega](ENTREGA-ATELIE-20261015.md).

147 testes locais aprovados, TypeScript sem erros e lint direcionado concluído. Onze cenários finais de navegador passaram (mural, primeiro uso, app conectado e conexões), incluindo 320/390/640, busca/cor, zoom/scroll, interações/persistência, envio/recebidos/download, publicação/exclusão e rollback. Os testes SQL aplicaram as cinco migrações e preservaram o ciclo privado com duas contas. Builds web real/prévia e export iOS local terminaram com status 0. Compilações e resultados completos: [VALIDACAO-MURAL-20261014.json](VALIDACAO-MURAL-20261014.json); [escopo e limites](ENTREGA-MURAL-20261014.md).

**Supabase hospedado — atualização 15/10:** quinta migração aplicada conforme Success do usuário; `social_query` e `social_action` existem e recusam chamadas anônimas (401/42501). [Evidência atual](VALIDACAO-ATIVACAO-MURAL-20261015.json). Não repetir SQL. Teste físico iPhone e fluxo autenticado do mural no serviço ainda pendentes. Os registros abaixo são históricos.

# Validação — atualizada em 14/10/2026

## 14/10 — delimitação da tela restaurada

Correção do usuário: `#FEEECE` somente dentro da área do app; laterais externas do desktop restauradas para `#ECEEE6`. Exports real e prévia aprovados, nas mesmas portas 4211 e 4226. Conferência no navegador em 1366 px: exterior `rgb(236, 238, 230)` e interior `rgb(254, 238, 206)`; em 390 px, interior preservado. Evidência: `.tools/frame-browser-check.json`.

## 14/10 — fundo #FEEECE

Alteração de cor pedida pelo usuário, posterior à revisão visual abaixo. Formatação aprovada; exports real e prévia com status 0. No navegador do app conectado, em sessão sem login, o fundo calculado foi `rgb(254, 238, 206)`. Evidência: `.tools/canvas-browser-check.json`. Mesmas origens locais: app 4211 e prévia 4226.


## 14/10 — avatar no início e revisão visual

[Entrega](ENTREGA-VISUAL-20261014.md) · [evidência](VALIDACAO-VISUAL-20261014.json).

- 28 testes de identidade/autenticação e TypeScript final aprovados.
- Lint completo aprovado na primeira rodada. A repetição final excedeu o limite de 90 s; lint dos oito arquivos alterados depois da aprovação passou. Não registrar a repetição completa como aprovada.
- Seis cenários finais de navegador aprovados; três cenários de primeiro uso também passaram na rodada anterior desta entrega. Foto adicionada/substituída/removida refletida na home, recarga, compartilhamento, conexões, código e aparelhos exercitados em fixtures locais.
- Home/perfil conferidos em 320, 390 e 640 px, inclusive @ com 24 caracteres. Oito pares de cor passaram em contraste AA para texto normal.
- Exports real e prévia finais com status 0. App atualizado em `http://127.0.0.1:4211`, preservando a origem local; prévia em `http://127.0.0.1:4226/preview`.
- Conta criada e foto alterada: relato e capturas do usuário. Não equivalem à validação completa de persistência hospedada/OTP/iPhone. Não refazer SMTP automaticamente.

## Diagnóstico do primeiro cadastro real — 14/10, após o ajuste de senha

As capturas de Logs → Auth identificaram rejeição do Gmail SMTP: **535 5.7.8 Username and Password not accepted**, provocando HTTP 500 no cadastro. Consultas públicas reconfirmaram cadastro habilitado e @ disponível. [Diagnóstico, correção manual e limites dos checks](DIAGNOSTICO-CADASTRO-20261014.md). Nova credencial SMTP e recebimento real do código ainda pendentes.

O app agora distingue erros conhecidos de envio, limite de códigos, e-mail recusado/inválido e indisponibilidade de Auth. **27 testes focados, um cenário de navegador e TypeScript aprovados**; formatação/diff aprovados. Build real com status 0 e configuração conferida, servido em `http://127.0.0.1:4211/login`. O cenário interceptou as operações remotas, preservou os campos e confirmou a mensagem sem diagnóstico privado. Lint desta rodada sem aprovação registrada por limites de execução/espera no Windows; não confundir com a aprovação da rodada anterior abaixo. A prévia em 4215 permanece na versão anterior.

## Ajuste de senha e configuração hospedada — 14/10/2026

[Resultados, builds e hashes desta rodada](VALIDACAO-CADASTRO-20261014.json). Esta verificação é focada no cadastro; não representa reexecução da suíte ampla de identidade abaixo.

- **33 testes em três arquivos, status 0:** 12 de política de senha e tradução de erro, 15 de domínio e seis de sessão. Cadastro exige mínimo oito caracteres, maiúscula, minúscula, número e um dos símbolos documentados pelo Supabase. Espaços e emojis não substituem o símbolo; login não aplica a nova complexidade a senhas antigas.
- **Código:** TypeScript e ESLint completo finais concluíram com status 0; formatação e `git diff --check` aprovados. Sem alteração de dependências ou migração nova.
- **Sete cenários de navegador, todos status 0 nos builds finais:** aviso em 320/390 px, recusa `weak_password` do servidor, troca cadastro/login, login com senha antiga, cadastro com nome/@ e código, aparelho novo/reconhecido/revogado e abertura da versão real sem dados de exemplo. Senha inválida não envia cadastro. O aviso só aparece após tentativa, não duplica o cartão de erro e desaparece ao corrigir. A recusa do servidor foi simulada com o cabeçalho de versão correto da API Supabase.
- **Layout:** capturas `44-senha-320.png` e `44-senha-390.png`; texto vermelho de 10 px, altura de uma linha de 16 px, sem overflow horizontal. Não há truncamento nem bloqueio de ampliação de fonte por acessibilidade. Captura de 320 px inspecionada visualmente. Sem teste de iPhone físico.
- **Builds:** exportações real e prévia concluídas separadamente, cache limpo e configuração conferida nos bundles. Endereços atuais: app `http://127.0.0.1:4210/login`, prévia `http://127.0.0.1:4215/preview`, preparação `http://127.0.0.1:4215/identity-setup`.
- **Preparação:** a página começa pelo template Confirm signup e registra SQL/regras de acesso como concluídos. Os dois modelos servidos correspondem aos arquivos locais e contêm `{{ .Token }}`. O caminho corrigido de Confirm email é **Authentication → Sign In / Providers → User Signups**, fora do diálogo Email.

O usuário confirmou aplicação da quarta migração, OTP de seis dígitos/600 segundos e senha forte. A RPC pública de identidade respondeu 200 após a aplicação; o endpoint público Auth respondeu 200 em 14/10 às 16:30 UTC, com e-mail habilitado e `mailer_autoconfirm: false`. **Não repetir nenhuma das quatro migrações.** Templates, SMTP, recebimento real de código e persistência autenticada hospedada continuam pendentes. Nenhum envio real, conta hospedada de teste ou publicação nesta rodada.

Tentativas intermediárias não contam como aprovação: o layout de 11 px quebrava em duas linhas em 320 px; a fixture de erro não incluía o cabeçalho de versão necessário ao SDK; compilações/verificações também excederam prazos no Windows. O tamanho final e a fixture foram corrigidos, e as exportações foram concluídas em processos separados. Os registros históricos abaixo preservam o estado de suas próprias datas; não substituem esta atualização.

## Entrega de identidade e Minha conta — 13/10/2026

[Implementação, privacidade e ativação hospedada](ENTREGA-IDENTIDADE-20261013.md). [Consolidado com resultados individuais e hashes](VALIDACAO-IDENTIDADE-20261013.json).

| Verificação                                      | Resultado e alcance                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Regras, banco, API, fotos, sessão e concorrência | **114 testes em 17 arquivos aprovados**, status 0. Inclui 17 casos SQL de identidade, quatro de validação, cinco de fotos e três de concorrência do estado de identidade.                                                                                                                                                                                                                                                                                                                                                                                                      |
| PostgreSQL local                                 | Aplicadas as quatro migrações em PGlite isolado. Confirmados isolamento, prova OTP recente, recusa de metadados forjados, reconhecimento, revogação, limite do @, privacidade, conexões, limpeza de fotos e compatibilidade dos RPCs existentes. Não equivale a sessão hospedada.                                                                                                                                                                                                                                                                                              |
| Interface                                        | **29 cenários aprovados no consolidado**, todos com status 0 na execução selecionada de cada cenário. Oito foram reconferidos nos builds finais; a regressão ampla antecedeu apenas o ajuste visual do contador para nunca começar em 61 segundos. Resultados individuais no consolidado. Cadastro/código, aparelho reconhecido e separado, revogação, nome/@, edição, upload/remover foto, reload, compartilhamento sem localhost, conexão/bloqueio/remoção e destino após login. Regressões de peças, outfits, diário, calendário, offline, inspirações, viagens e círculos. |
| Web                                              | Exportações separadas real e prévia, com cache limpo e configuração conferida no bundle. Build sem configuração também exportado e testado. A tela real de cadastro foi aberta sem enviar uma inscrição.                                                                                                                                                                                                                                                                                                                                                                       |
| iOS                                              | Exportação concluída com status 0, incluindo SecureStore. Não houve instalação ou execução no iPhone físico.                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Layout                                           | Capturas 40–42 revisadas: cartão oliva/argila, 390/320 px e código. Sem overflow horizontal nos cenários de conta testados. Foto carregada após recarregar; reduzir movimento respeitado pelo componente compartilhado. Sem medição de FPS.                                                                                                                                                                                                                                                                                                                                    |
| Preparação hospedada                             | `/identity-setup` serve exatamente a única migração nova e os dois templates; conteúdo comparado byte a byte, nomes não autorizados retornam 404. Nenhuma execução no banco ou envio real de e-mail.                                                                                                                                                                                                                                                                                                                                                                           |

Uma tentativa intermediária de foto usou um seletor HTML inadequado; a imagem estava visível, e o teste foi corrigido para o elemento real e sua largura carregada. O servidor do caso sem configuração estava desligado na primeira rodada; foi gerado e iniciado antes da validação final. O cenário antigo de colagem excedeu o timeout: a investigação direta identificou um seletor desatualizado para o rótulo acessível da aba. O teste também precisava restaurar seus próprios exemplos depois do cenário de aparelho desconhecido. Ambos foram corrigidos; colagens e helper passaram. Os timeouts intermediários estão preservados e não contam como aprovações. O teste antigo de recorte local por IA não foi reexecutado: não faz parte desta mudança.

Leitura pública em 13/10 às 21:20 UTC: Auth HTTP 200, e-mail habilitado, confirmação automática ainda ativa; nova RPC de identidade HTTP 404. Nenhuma escrita ou envio de e-mail nessa verificação. A migração de identidade ainda não foi aplicada pelo agente no Supabase. Confirmação de e-mail, templates e SMTP aguardam configuração. Não afirmar persistência real autenticada, recebimento real de código, domínio publicado, MFA forte ou teste físico. `npm audit` reporta 26 ocorrências (22 altas/4 moderadas); detalhes e compatibilidade de upgrades no registro de entrega.

## Entrega de primeiro uso — 13/10/2026, posterior à auditoria

Entrada por praticidade/inspiração, progresso derivado de dados, `DailyLook` compartilhado, cadastro progressivo, contraste, movimento reduzido e proteção de snapshots. [Detalhes da entrega](ENTREGA-PRIMEIRO-USO-20261013.md).

Consolidado verificável: [VALIDACAO-PRIMEIRO-USO-20261013.json](VALIDACAO-PRIMEIRO-USO-20261013.json). TypeScript e ESLint finais encerraram com **status 0**; uma tentativa intermediária de lint ultrapassou o prazo e a execução final direta completou em 42 segundos. Os hashes dos bundles e resultados individuais dos 17 cenários estão preservados no consolidado.

| Verificação                                   | Evidência e resultado                                                                                                                                                                                                                                                                                                                     |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Regras, API, SQL local, cache, sessão e fotos | **85 testes em 13 arquivos**, status 0. Inclui 3 casos da jornada e 5 de concorrência dos snapshots.                                                                                                                                                                                                                                      |
| Navegador com fixtures                        | **16 cenários, todos com status 0**, em `.tools/ui-runs/2026-10-13T19-51-30-477Z/results.json`. Primeiro uso com foto, reload e relogin; inspiração sem acervo; cadastro/confirmar e-mail; arquivo/restauração; saída offline; uso explícito; disponibilidade; sugestões; favoritos/preços; planos; movimento; apresentação e comparação. |
| Build real, sem enviar cadastro               | **1 cenário com status 0**, em `.tools/ui-runs/2026-10-13T19-54-24-730Z/results.json`. Tela de cadastro acessível, sem badge de prévia e sem chamadas para o domínio fictício. Não criou conta.                                                                                                                                           |
| Exportação web                                | Prévia `.tools/web-preview-1791920778212` e real `.tools/web-real-1791920989660`, ambas status 0. Configuração conferida no bundle, sem imprimir valores.                                                                                                                                                                                 |
| Supabase Auth público                         | `GET /auth/v1/settings` respondeu **200** em 13/10 às 19:53 UTC; e-mail habilitado, cadastro permitido, confirmação automática habilitada no projeto pessoal. `.tools/first-use-auth-settings.json`. Nenhuma sessão autenticada testada.                                                                                                  |
| Layout e imagens                              | 320 e 390 px sem overflow horizontal do documento nos cenários testados. Fotos carregadas e opacas; rótulos inferiores abreviados em 320 px. Capturas 30–35 revisadas.                                                                                                                                                                    |
| Movimento                                     | Mudança de composição anima e retorna ao repouso; brilho termina com opacidade zero. Com reduzir movimento, composição fica estável e o brilho não é renderizado. Resposta ao toque também testada. Sem medição de FPS.                                                                                                                   |
| Contraste                                     | Texto muted `#626A5C`: **5,34:1** no canvas, **5,62:1** no branco, **4,92:1** no sage, **4,61:1** no limão e **4,78:1** no blush. Cálculo em `.tools/first-use-contrast.json`; não equivale a auditoria completa de acessibilidade.                                                                                                       |

Durante os testes, corrigidos retorno do cadastro que duplicava o início, reabertura de inspiração vazia ao recarregar, estado dos filtros para leitores de tela e rótulos cortados no viewport estreito. O primeiro teste de movimento falhou por procurar `aria-selected` em botões; a implementação web agora usa `aria-pressed`, validado na execução final. O cache Metro reutilizou a configuração de prévia em uma exportação intermediária: o build agora limpa o cache e rejeita bundles cuja configuração não corresponde ao modo solicitado.

Os testes de navegador foram executados por cenário, com timeout e status individual; **nenhum dos 17 processos finais excedeu o prazo**. Isso não resolve por inferência o timeout antigo do recorte local, que não foi reexecutado nesta entrega. Não houve publicação, nova migração hospedada, validação autenticada no Supabase nem execução física no iPhone. Pedro confirmou ainda não ter conta no app; o próximo passo manual é criá-la na tela conectada.

## Auditoria de continuidade e sessão — 13/10/2026

Após a consolidação do contexto, a suíte existente foi reexecutada: **70/70 testes aprovados**. Foram adicionados seis testes de sessão e um de fotos; quatro asserções falharam antes das correções, reproduzindo logout da conta nova por resposta antiga, logout após renovação de token, exceção de transporte e URL antiga retornando após limpeza.

Correções em `src/lib/auth-session.ts`, `src/components/SessionProvider.tsx` e `src/lib/photos.ts`: validar revisão/proprietário/token antes da saída por revogação, tratar falha de transporte na verificação e descartar assinatura que terminou após limpeza do cache. Revogação confirmada da sessão atual continua encerrando o acesso.

| Verificação final                 | Resultado                                                                                          |
| --------------------------------- | -------------------------------------------------------------------------------------------------- |
| Regras/API/SQL/fotos/cache/sessão | **77 testes em 11 arquivos aprovados**, status 0; `.tools/context-audit-tests-20261013.json`       |
| TypeScript                        | `npm run typecheck`, status 0                                                                      |
| ESLint                            | `npm run lint`, status 0                                                                           |
| Visual                            | Revisão estática das capturas 29/30/34, ícone e referências; sem novo Playwright ou medição de FPS |
| Builds e serviço hospedado        | Não executados nesta rodada; exports anteriores não contêm estas correções                         |

Vitest precisou de execução fora do sandbox após `spawn EPERM`. A primeira tentativa de lint excedeu o prazo; a final terminou em aproximadamente 54 segundos. Não houve uso de credenciais reais, aplicação de migração hospedada ou teste no iPhone. Diagnóstico, prioridades e alcance em [DIAGNOSTICO-E-CONTINUIDADE-20261013.md](DIAGNOSTICO-E-CONTINUIDADE-20261013.md).

## Rodada para a apresentação de terça — evidência de 09/10

Destino confirmado: navegador no computador, terça-feira **13/10/2026 de manhã**. Guia de uso em [APRESENTACAO-TERCA.md](APRESENTACAO-TERCA.md).

| Verificação desta rodada | Resultado                                                                                                                                                                                                                                                                             |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TypeScript e lint        | Passaram após a implementação dos novos componentes; lint dos scripts/roteiro de teste também passou.                                                                                                                                                                                 |
| Regras/API/SQL           | **70 testes em 10 arquivos passaram**, incluindo três novos casos de desafios: período atravessando o ano, duplicatas/futuro/planejamento e origem de remixes. `.tools/presentation-regression.log`.                                                                                  |
| Exportação web           | **Status 0** em `.tools/presentation-build-result.json`. Build com configuração fictícia, sem leitura da configuração real.                                                                                                                                                           |
| Cenários do navegador    | **20 cenários concluíram suas asserções; 19 processos encerraram com status 0.** O cenário de recorte passou nas interações, mas saiu com status 1 por timeout de encerramento. Isso não é uma suíte integral com status 0. Consolidado em `.tools/presentation-final-evidence.json`. |
| Novas interações         | Roteiro com dez capítulos, comparação, reset confirmado, versões de remix, histórias e desafios passaram. Teste confirma que a apresentação cabe em **1366×768** sem rolagem externa.                                                                                                 |
| Revisão visual           | **15 telas**, nenhum `pageerror`, imagem quebrada ou transbordamento horizontal do documento em 320 px. Apresentação cabe em 1366×768. `.tools/presentation-visual-result.json`; capturas 27–34. O helper também teve timeout ao fechar o navegador depois de gravar o resultado.     |
| Movimento                | O cenário de resposta ao toque e movimento reduzido passou. Não houve medição de FPS nem certificação em outros computadores.                                                                                                                                                         |
| Supabase hospedado       | Usuário confirmou **Success. No rows returned** nas migrações incrementais. Ainda sem teste autenticado dos novos fluxos no serviço. Não solicitar SQL novamente.                                                                                                                     |
| iPhone                   | Continua sem teste físico. O export iOS registrado na seção anterior é da etapa anterior ao hub/histórias/comparação desta rodada; não tratá-lo como export final destes novos componentes.                                                                                           |

### Encerramento do navegador: pendência conhecida da ferramenta

A execução conjunta parou entre arquivos, embora as asserções executadas passassem. Separar por arquivo não eliminou o problema. A execução de cada cenário com um navegador novo permitiu verificar todos e delimitar o caso que continuou falhando no encerramento: **recorte/desfazer/cadastro sequencial**, depois de confirmar todas as asserções. Navegar para about:blank antes do descarte não resolveu o encerramento. A inspeção visual independente também registrou `BROWSER_CLOSE_TIMEOUT` depois das 15 telas.

`scripts/test-ui.mjs` agora descobre os cenários e executa cada um em seu próprio processo, preserva logs/status em `.tools/ui-runs`, continua os casos independentes depois de uma falha e devolve status 1 se qualquer cenário falhar ou exceder o prazo. `npm run test:ui:run` usa esse executor. **Não afirmar que todos os problemas de encerramento foram corrigidos** e não repetir ciclos amplos sem mudança ou uma hipótese nova. Nenhum navegador pessoal foi encerrado.

Evidência consolidada: nove cenários com status 0 em `.tools/ui-runs/2026-10-09T19-13-47-636Z`, seguidos pelos onze restantes em `.tools/ui-runs/2026-10-09T19-17-26-253Z` (dez status 0 e o recorte com status 1 após as asserções). Logs das tentativas anteriores estão preservados.

## Evidência da primeira ampliação de 09/10

Os resultados abaixo descrevem a etapa anterior à preparação específica de terça. Use os números e limites da seção acima como estado mais recente.

## Estado da entrega

Sistemas pessoais, receitas/remix, wishlist, planejamento e círculos privados implementados; transporte Supabase real preparado em duas migrações incrementais. **O usuário confirmou em 09/10 Success. No rows returned ao executar a atualização hospedada.** Não reaplicar. Essa confirmação não substitui o teste autenticado de persistência real. A prévia continua usando exemplos locais. A visão completa tem pendências explícitas em [IMPLEMENTACAO-DO-BRAINSTORM.md](IMPLEMENTACAO-DO-BRAINSTORM.md).

A evidência histórica de 06/10 está preservada em `history/VALIDATION-20261006.md`. Não usar os números antigos de 45 testes/10 cenários como validação desta versão.

| Verificação                                             | Evidência e alcance                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TypeScript                                              | Passou na base ampliada e após a correção final das fotos. Não valida comportamento físico do iPhone.                                                                                                                                                                                                                                                                                                                                                     |
| ESLint                                                  | Passou. Uma repetição varrendo a raiz excedeu 120s; a chamada explícita aos diretórios de código terminou com sucesso. O script lint agora enumera fonte/configuração para evitar artefatos locais.                                                                                                                                                                                                                                                       |
| Testes de regras, fotos, cache, API e SQL               | **67 testes em 9 arquivos passaram**. `evolution-delivery.log` e `evolution-delivery-results.json` registram o resultado.                                                                                                                                                                                                                                                                                                                                 |
| Novas migrations                                        | **11 testes locais** com initial + studio + circles em PostgreSQL/PGlite. Isolamento entre contas, anônimo, escrita direta, preços, datas, quotas do Lab, referências estrangeiras, feedback com uso, checklist e convites.                                                                                                                                                                                                                               |
| Export web sem configuração e com configuração fictícia | Passou sem ler `.env.local` real, inclusive após a correção final das fotos: status 0 em `.tools/evolution-photo-results.json`. Export configurado em `.tools/web-test`; configuração em `.tools/web-setup`.                                                                                                                                                                                                                                              |
| Export iOS                                              | Passou em `.tools/ios-evolution`, inclusive após a correção final das fotos: status 0 em `.tools/evolution-photo-results.json`. É bundle Hermes, não build assinado nem execução no aparelho.                                                                                                                                                                                                                                                             |
| Expo Doctor                                             | **21/21 passaram** em `evolution-export.log`. Não houve mudança de dependências depois.                                                                                                                                                                                                                                                                                                                                                                   |
| Navegação no Chrome e Edge                              | Os **17 cenários passaram** em ambos, incluindo os sete fluxos ampliados. A execução final no Chrome após a correção das fotos registra `17 passed (3.0m)`, mas **o processo saiu com status 1 por timeout no encerramento**, com dois erros fora dos cenários. Logs `.tools/ui-evolution-final.log` e `ui-evolution-final-result.json`.                                                                                                                  |
| Recorte local                                           | Modelo U2Netp instalado com checksum; foto de boné processada e revisada. A UI de recorte/desfazer e a confirmação sequencial de fotos passaram também no cenário final do Chrome.                                                                                                                                                                                                                                                                        |
| Visual e fotos                                          | Revisão final de **13 telas** no Chrome: nenhum `pageerror` e nenhum transbordamento horizontal do documento em 320 px, registrados em `.tools/style-visual-result.json`. Capturas 19–26 revisadas; fotos visíveis em sugestões, remix, wishlist, viagem, hub e retrospectiva. O teste de regressão verifica imagem decodificada e opacidade após 500 ms e passou. Não é uma medição de FPS nem certificação de todos os elementos em todos os aparelhos. |

## Cenários de navegador

MVP: tela sem configuração, cadastro/edição de peça, outfit, uso/duplicidade, post/remoção, arquivamento/restauração, offline, saída e login; layout de tela pequena; foto/colagem; rejeição de chave secreta e origem externa pelo assistente.

Ideias anteriores: sugestão por cenário/ocasião, favorito, edição de preço/ausente/zero, plano criado/editado/removido sem alterar wear_log e movimento normal/reduzido.

Novos: peça lavando excluída das opções; inspiração manual → remix com origem e sem uso automático; wishlist sem entrar no inventário; feedback em uso existente; limite de três escolhas do Lab; checklist da viagem persistente; cartão PNG com preço desativado; círculo/enquete/voto/remix com dados redigidos; recorte/desfazer; cadastro sequencial com gravação somente ao confirmar; hub em 320 px; atualização SQL que não contém o schema inicial.

Testes usam domínio fictício e API local. Nada foi enviado a pessoas reais, nenhum usuário fictício foi criado no Supabase hospedado e nenhum login/senha real foi solicitado pelo agente.

## Problemas encontrados e corrigidos

- Comparação CASE na validação SQL precisava de parênteses; a migração foi corrigida e revalidada.
- Validadores endurecidos para strings, booleans, datas, papéis da receita, dono dos registros e limite diário do Lab no servidor.
- Home antiga passou a excluir peças indisponíveis, como a área de três opções/remix.
- Preferências de sensação/temperatura/variação passaram a atuar no ranking; desafios podem ser desligados.
- Feedback existente volta preenchido; falha de vínculo de memória após salvar look informa que o look já foi guardado.
- Edição do período de uma viagem reconcilia dias e checklist sem apagar tarefas válidas.
- Votos são removidos quando um participante sai ou é retirado do círculo.
- Falha de sincronização de notificação passa a gerar aviso.
- Cartão PNG ajusta altura ao conteúdo para não cortar nomes longos.
- Fotos web: imagem podia carregar e terminar com opacidade zero na transição do Expo Image. Mantida exibição direta na web e transição nativa no iPhone, respeitando reduzir movimento. As animações ao redor das fotos continuam.

## Limites de ferramentas observados

A primeira exportação excedeu 180s; o prazo foi ampliado para 300s por export e as exportações posteriores passaram. `.tools/evolution-check-results.json` mantém a falha inicial; não apagar nem descrevê-la como resultado final. `.tools/evolution-delivery-results.json` registra posteriormente testes/web/iOS com status 0.

Uma busca no novo teste procurava “Calça” enquanto a interface usa “Calças”; o seletor foi corrigido. O primeiro runner ficou preso no encerramento após a falha/trace. Reexecuções com trace desligado executaram todos os 17 cenários com sucesso, mas **Edge e Chrome apresentaram timeout ao encerrar os processos de teste no Windows**. A opção `VIRTUAL_CLOSET_EXTERNAL_SERVERS=1` separa os servidores do runner, mas não eliminou esse problema. Na execução final, houve dois erros fora dos testes: `Timed out waiting 180s for the test suite to run` e `Timed out waiting 180s for the teardown for load tests to run`; o status final é 1. Não dizer que trocar para Chrome resolveu o encerramento ou que a suíte terminou com status 0. A inspeção visual independente concluiu 13 telas e gravou o resultado; seu log não registra timeout de fechamento. Não declarar teste do iPhone nem zero defeitos a partir disso.

As capturas automáticas iniciais feitas durante transições não eram evidência suficiente; a revisão visual é feita com imagens carregadas e movimento estabilizado. Inventário em `screenshots/README.md`.

## O que precisa ser validado fora desta máquina

1. Atualização hospedada confirmada pelo usuário com Success. **Não reaplicar nenhuma das três migrações.** O próximo passo hospedado é teste autenticado, não instalação.
2. Criar/entrar numa conta dentro do app e verificar persistência no Supabase real, inclusive duas contas e um círculo privado consentido.
3. No iPhone 12: câmera/galeria, HEIC/JPEG, permissões negadas/limitadas, fila de fotos, teclado, safe areas, retomada, offline, compartilhamento PNG, háptica e notificações locais.
4. Testar fluidez/FPS e memória com acervos reais e maiores. Snapshot completo do usuário evita totais truncados, mas ainda não foi avaliado sob carga elevada.
5. Completar recuperação/exportação/exclusão de conta, política de privacidade e moderação antes de distribuição pública. Esta rodada não publicou nem distribuiu um aplicativo independente.

## Dependências e gratuidade

Instalação de expo-notifications, expo-haptics, expo-sharing e react-native-view-shot compatíveis com SDK 57. O log da instalação registra **26 ocorrências de vulnerabilidade transitiva (4 moderadas e 22 altas)**. Isso não é uma nova auditoria de produção nem afirmação de que todas são exploráveis no aplicativo. O relatório histórico descreve advisories de ferramentas; o conjunto precisa continuar acompanhado. Não foi usado `npm audit fix --force` nem override indiscriminado.

Recorte usa dependências/modelo locais gratuitos, licenças documentadas em [RECORTE-LOCAL.md](RECORTE-LOCAL.md). Nenhum gasto, publicação, build remoto EAS, SMTP, assinatura Apple ou API de IA paga foi contratado. Supabase Free e hardware local têm limites; não se promete serviço ilimitado.
