# Capturas da interface

Capturas de 06/10/2026 feitas no Microsoft Edge. Não são imagens do aplicativo executando nativamente no iPhone nem dados de uma conta real do usuário.

- `01-configuracao.png`: tela sem conexão configurada.
- `02-guarda-roupa-fixture.png`: peça criada pelo teste automatizado, sem foto.
- `03-calendario-fixture.png`: registro de uso criado pelo teste.
- `04-feed-fixture.png`: post criado pelo teste.
- `05-previa-redesign.png`: página de apresentação da prévia, identificada como dados de exemplo.
- `06-closet-redesign.png`: guarda-roupa com fotos locais de exemplo.
- `07-combinacoes-redesign.png`: combinações com montagem das fotos das peças.
- `08-feed-redesign.png`: feed privado com exemplos.
- `09-inicio-ideias.png`: sugestões por clima de exemplo e ocasião, 390×844.
- `10-inicio-descobertas.png`: atalhos de estatísticas/valores, desafio e próximo evento.
- `11-estatisticas-ideias.png`: resumo de usos e peças mais usadas.
- `12-valores-ideias.png`: composição do preço do outfit em BRL.
- `13-favoritos-ideias.png`: favoritos do acervo de exemplo.
- `14-agenda-ideias.png`: calendário de planos separado do histórico de uso.
- `15-planejar-viagem.png`: início do formulário de viagem.
- `16-planejar-detalhes.png`: looks, lembrete sem notificação e ações do formulário.
- `17-closet-favoritos.png`: guarda-roupa com grupos amplos e corações.
- `18-apresentacao-ideias.png`: página da reunião com a prévia em moldura, 1280×980.

As quatro primeiras usam viewport de 390×844 e interceptação da API no Playwright. As capturas 05–08 mostram o app na moldura da prévia; a área interna é um pouco menor por causa da borda. As capturas 09–17 mostram a aplicação web diretamente em 390×844, consumindo a API fictícia local. A captura 18 é a página de apresentação. Fotos e fontes estão documentadas em `../PHOTO-SOURCES.md`. Animações foram verificadas por interação; screenshots não demonstram fluidez.

Fixtures nunca são carregadas pelo aplicativo de produção como alternativa a erro de rede, login ou backend.

## Ampliação de 09/10/2026

Capturas finais locais do Chrome em dimensão de iPhone 12; exemplos fictícios. Não equivalem a testes nativos. As capturas 20–23 usam a densidade do dispositivo emulado; 19 e 24–26 usam escala 1 para facilitar a inspeção.

- `19-espaco-de-estilo.png`: entrada para os sistemas pessoais.
- `20-remix.png`: inspiração convertida em candidatos do closet.
- `21-antes-de-comprar.png`: desejo manual, similares e custo hipotético por uso.
- `22-preparar-viagem.png`: mala e preparação.
- `23-circulos.png`: enquete privada usando receitas sem fotos/preços.
- `24-tres-ideias.png`: opções contextuais com explicação.
- `25-retrospectiva.png`: resultados dos usos do período.
- `26-cadastro-progressivo.png`: escolha de fotos para confirmação sequencial.

A revisão final aguardou imagens/transições estabilizarem antes das capturas. Fotos visíveis confirmadas após a correção do cross-dissolve web. Treze telas foram percorridas sem erros de execução nem transbordamento horizontal do documento em 320 px. A tela usa ScrollView; capturas mostram o trecho visível, não necessariamente todos os controles de uma página longa. Listas horizontais de peças têm rolagem própria. Evidências de interações e limitações em `../VALIDATION.md`.

## Preparação da apresentação de terça, 13/10

- `27-apresentacao-terca.png`: roteiro interativo na comparação de desejos.
- `28-comparar-desejos.png`: seleção dos dois candidatos em tela estreita.
- `29-hub-visual.png`: entrada e cartões em duas colunas.
- `30-inspiracoes-visuais.png`: receita com colagem das peças candidatas.
- `31-historias.png`: álbum pessoal de histórias.
- `32-descobertas.png`: progresso por usos reais dos últimos sete dias.
- `33-mosaico.png`: tela de retrospectiva; o mosaico fica abaixo do trecho inicial capturado.
- `34-apresentacao-visual.png`: apresentação final em 1366×768, com controles visíveis.

Quinze áreas foram percorridas na revisão final, sem imagens quebradas, pageerror ou transbordamento horizontal do documento em 320 px. Capturas 29–34 usam escala 1. O helper excedeu seu prazo de encerramento do navegador após gravar os resultados; isso está documentado em VALIDATION.md.
