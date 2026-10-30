# Ideias do Pedro — implementação e próximos passos

> Atualização de 09/10/2026: este arquivo registra a etapa das 12 ideias originais. O estado atual da visão ampliada, com integrações e pendências, está em [IMPLEMENTACAO-DO-BRAINSTORM.md](IMPLEMENTACAO-DO-BRAINSTORM.md). As afirmações abaixo sobre recursos exclusivos da prévia refletem a etapa de 06/10.

Referência preservada: `01. Pedro/ideias.md.md`, com as quatro imagens na mesma pasta. Atualizado em 06/10/2026 para a reunião do dia seguinte.

## Como interpretar a entrega

A prévia em `http://127.0.0.1:4175/preview` contém recursos experimentais interativos. Sugestões, favoritos, valores, estatísticas, desafio e planejamento usam o acervo **de exemplo** e o servidor local. As alterações duram enquanto esse servidor estiver ativo; “Recomeçar a prévia” restaura os exemplos. Não são dados do Supabase real do usuário.

Os filtros gerais e a base de movimento foram incorporados à interface/API do MVP, incluindo a filtragem remota antes da paginação e a leitura offline do cache. As outras telas novas exigem simultaneamente o flag `EXPO_PUBLIC_IDEAS_PREVIEW=1`, a URL fictícia de testes e plataforma web. O aplicativo conectado ao Supabase real continua com os fluxos anteriores até a integração dos novos modelos de dados.

## Destino de cada ideia

| #   | Ideia original                                                                   | O que entrou agora                                                                                                                                                                             | O que falta                                                                                                                                                                                                |
| --- | -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Sugestões de estilo usando o próprio closet e, opcionalmente, inspirações salvas | Início com sugestões por categoria, clima escolhido e ocasião. “Outra ideia”, preferência por favoritas e “Guardar look” criam combinações utilizáveis na prévia.                              | Pastas de inspiração, feed de outras pessoas, recomendação visual e mistura controlada de inspirações. Não sugerir que uma peça externa já pertence ao usuário.                                            |
| 2   | Gamificação e retorno ao app                                                     | Desafio opcional de usar quatro combinações diferentes nos últimos sete dias, com progresso calculado pelos registros.                                                                         | Preferências de desafios, metas configuráveis, conquistas e avaliação de retenção por utilidade. Não usar abertura do app como medida de uso de roupa.                                                     |
| 3   | IA para remover o fundo das fotos                                                | Pesquisa de caminho gratuito documentada abaixo.                                                                                                                                               | Prova de conceito local com fotos reais, avaliação de contornos e fluxo de correção. Nenhum botão finge remover fundos.                                                                                    |
| 4   | Sugestões conforme o clima do local                                              | Seletor de cenários “Ameno”, “Calor”, “Frio” e “Chuva”, com temperaturas explicitamente de exemplo. Calor prioriza shorts/jorts; frio acrescenta camada quando disponível.                     | Localização consentida ou cidade manual, previsão real, cache, indicação de horário/fonte e avaliação de termos de uso gratuito.                                                                           |
| 5   | Provador virtual                                                                 | Pesquisa de viabilidade e limites registrada abaixo.                                                                                                                                           | Modelo/licença, capacidade computacional, consentimento, exclusão de fotos e teste de qualidade. Não prometer medida ou caimento exato a partir de uma imagem.                                             |
| 6   | Eventos: festas, casamentos, viagens; looks ou peças                             | “Quero usar” no calendário: criar, editar e remover eventos, selecionar combinações e peças avulsas, intervalo de viagem, notas e contagem de peças únicas. Aceita eventos passados e futuros. | Tabelas reais com RLS, sincronização entre dispositivos, checklist de mala, distribuição de looks por dia da viagem e capas de evento.                                                                     |
| 7   | Looks futuros e lembretes na véspera/no dia                                      | Planejamento separado do histórico, calendário com seleção futura e preferência de lembrete. A tela informa que ainda não envia notificações.                                                  | Agendamento local no aparelho, permissões, fuso horário, horário preferido, cancelamento/reagendamento ao editar ou excluir e validação no iPhone.                                                         |
| 8   | Estatísticas divertidas e comparáveis                                            | Tela “Seu closet em números”: peças ativas, usos, aproveitamento registrado, combinações, peça/look mais usados, custo por uso, sem uso registrado, favoritas, maior/menor preço.              | Agregações reais completas no banco, períodos/filtros, consentimento e controles para compartilhar/comparar sem expor valores por padrão.                                                                  |
| 9   | “Quanto Custa o Outfit?!”                                                        | Card no início e painel de composição do valor, seleção de look, preços editáveis, total/subtotal e tratamento distinto de valor zero e preço desconhecido.                                    | Persistência real, moeda por item, custo de aquisição versus valor estimado e compartilhamento opcional. A referência é textual; não foram usados rosto, áudio ou vídeo do meme.                           |
| 10  | Revisão de contexto e ideias novas                                               | Oportunidades priorizadas no final deste documento, com hipóteses e métricas.                                                                                                                  | Validar com os dois convidados e usuários reais antes de ampliar o escopo.                                                                                                                                 |
| 11  | Filtros por parte do corpo/tipo geral                                            | Tudo, Parte de cima, Parte de baixo, Calçados, Acessórios e Outras peças, combinados com busca e filtros específicos.                                                                          | Expandir categorias quando houver bolsas, vestidos etc.; manter “Outras peças” sem inventar categoria.                                                                                                     |
| 12  | Identidade warm/cozy marcante                                                    | Paleta/DM Sans preservadas, cards com fotos, oliva para ação, amarelo suave para seleção, ícones de camadas e textos curtos. Novos recursos seguem a mesma linguagem visual.                   | Pesquisa de nome, disponibilidade de marca, guia editorial, acessibilidade e fluidez no aparelho, háptica discreta e eventual identidade sonora opcional. Não declarar exclusividade mundial sem pesquisa. |

## Fluidez e detalhes de conforto

Requisito adicional explícito do usuário nesta entrega. Implementado com React Native Animated, sem novo pacote: leve escala ao pressionar botões/cards, transição curta de abas, pulso do coração ao favoritar, troca suave das sugestões e progressos animados. O foco dos campos também recebe destaque visual. Duração breve, nenhuma animação contínua, cancelamento ao desmontar e driver nativo fora da web.

A preferência de reduzir movimento é lida uma vez pelo provider e acompanhada por um listener; no modo reduzido, movimentos e transições das fotos são desativados. O teste de navegador verificou resposta ao toque normal e reduzida. A sensação de fluidez no iPhone, leitor de tela e eventual feedback háptico continuam para validação física; não há medição de FPS.

## Critérios usados nos números

- Favoritos são uma escolha explícita; “mais usado” vem dos registros de uso. São conceitos diferentes.
- Um registro corresponde a um outfit em uma data; duplicatas do mesmo outfit/dia são descartadas na contagem. As peças dessa composição recebem esse uso.
- Planos futuros e eventos não aumentam usos, custo por uso nem progresso do desafio.
- “Closet já usado” = peças ativas com pelo menos um uso registrado / peças ativas. Não é uma afirmação sobre roupas usadas fora do aplicativo.
- O desafio considera looks distintos nos últimos sete dias, incluindo hoje. É opcional e não exige uso diário consecutivo.
- Preços são inteiros em centavos, em BRL nesta prévia. `0` é informado como zero; ausência de preço continua desconhecida. Totais incompletos são chamados de **subtotal conhecido**.
- Custo por uso é preço informado / usos registrados da peça. Não divide por zero nem estima preço de mercado.
- A mala usa IDs únicos das peças dos outfits selecionados mais as peças avulsas. A mesma calça em dois looks conta uma vez na mala.

## Caminhos gratuitos pesquisados

### Remoção de fundo

O projeto [rembg](https://github.com/danielgatis/rembg) oferece execução local com CPU/ONNX e código sob licença MIT. É um candidato para uma prova de conceito sem API paga. Verificar também a licença dos pesos do modelo selecionado e seu custo de execução, sem tratar “open source” como hospedagem gratuita ilimitada.

Começar com fotos de peças sozinhas, em cabide ou sobre uma superfície. Remover o fundo de uma foto com uma pessoa pode preservar a pessoa inteira; **isolar a roupa no corpo exige segmentação adicional**. Conservar o original, permitir desfazer e testar tecidos claros, renda, transparências e bordas finas. Não enviar fotos pessoais a demos públicas para fazer a prova.

### Clima

[Open-Meteo](https://open-meteo.com/en/terms) é uma opção sem chave para protótipos de uso não comercial, dentro das cotas. Seus dados são CC BY 4.0, mas o **serviço hospedado gratuito tem restrição de uso não comercial**. Não confundir licença dos dados com direito de usar o endpoint gratuitamente em qualquer negócio.

Para uma versão comercial sem mensalidade, avaliar uma fonte pública compatível com a área atendida ou infraestrutura própria já disponível. Até validar os termos, manter seleção manual de cenário como alternativa gratuita e funcional. A integração deve ter cache por cidade, consentimento de localização, atualização explícita e tratamento de falha; não inferir impermeabilidade ou conforto térmico só pela categoria da peça.

Fontes: https://open-meteo.com/en/pricing e https://open-meteo.com/en/terms.

### Provador virtual

Há projetos abertos como [IDM-VTON](https://github.com/yisol/IDM-VTON), mas código e checkpoints indicam **CC BY-NC-SA 4.0**, com restrição não comercial. Há também exigências de GPU e limites de qualidade em mãos, pose, sobreposições e conservação da identidade da pessoa. Uma demonstração disponível na internet não garante infraestrutura gratuita para nosso aplicativo.

O primeiro experimento viável pode ser um **painel de composição** com fotos das peças, já presente. Um provador com foto do corpo deve ser uma etapa própria: selecionar modelo com licença adequada, medir latência em hardware disponível, permitir exclusão das imagens e avaliar resultados com consentimento. Imagem gerada é uma visualização aproximada, não validação de tamanho, tecido ou caimento real.

### Lembretes

A documentação do [Expo Notifications SDK 57](https://docs.expo.dev/versions/v57.0.0/sdk/notifications/) permite avaliar notificações locais agendadas sem criar um serviço pago de push. O pacote ainda não foi adicionado ao app. Validar suporte e permissões no iPhone real, controlar horários/fusos, cancelar agendamentos antigos e respeitar o limite do sistema. Notificações remotas têm requisitos diferentes de build/credenciais; não prometer essa distribuição no Expo Go.

## Próxima integração com o produto real

1. Validar o MVP atual no iPhone e recolher o retorno da apresentação. Não repetir a migration inicial já aplicada.
2. Criar uma **nova migration incremental**, separada da inicial, para favoritos, valores, eventos e relações com outfits/peças. Toda linha deve ter proprietário e RLS; relações precisam validar o mesmo dono e regras de arquivamento.
3. Manter preços em centavos e moeda explícita. Regras de grants não devem permitir troca de `user_id` ou leitura entre contas.
4. Eventos têm datas civis próprias e não escrevem em `wear_log`. Preferências de lembrete precisam de fuso e identificadores para cancelamento no aparelho.
5. Estatísticas reais devem usar agregações completas no servidor. Não calcular KPIs globais apenas nos 24 itens da primeira página ou nos limites do cache offline.
6. Reutilizar a apresentação visual existente, substituindo `src/preview/store.ts` por dados autenticados reais. Retirar o bloqueio de protótipo somente depois dessa integração e dos testes entre duas contas.
7. Definir persistência/cache da nova informação por usuário; eliminar dados locais na troca de conta. Planejar exclusão/backup antes de ampliar distribuição.

## Oportunidades para discutir na reunião

| Ideia                            | Utilidade para o usuário                                       | Como testar sem gastar                                                           |
| -------------------------------- | -------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Cápsula de sete dias             | Montar uma semana com poucas peças e mais combinações          | Gerar uma lista pelas peças existentes e perguntar quais looks realmente usaria. |
| Mala sem repetição desnecessária | Mostrar peças compartilhadas entre os looks da viagem          | Acrescentar checklist à contagem única que já existe na prévia.                  |
| “Antes de comprar”               | Ver o que uma peça desejada acrescentaria ao closet            | Simular manualmente uma peça de inspiração, mantendo-a fora do acervo possuído.  |
| Redescobrir uma esquecida        | Dar uma nova chance a uma peça com pouco uso registrado        | Sugerir um look com essa peça, sem pressionar compras.                           |
| Diário visual do mês             | Relembrar os looks preferidos e pequenas mudanças de estilo    | Mosaico derivado dos registros e compartilhamento opt-in.                        |
| Repetir com intenção             | Desafio de combinar a mesma peça de três formas                | Usar IDs de peças/outfits para medir variedade, sem ranking obrigatório.         |
| Pastas com contexto              | Guardar inspiração para trabalho, festa, estação ou viagem     | Protótipo de pastas com origem, notas e aviso “não está no meu closet”.          |
| Cartão compartilhável do look    | Mostrar composição, ocasião e preço somente se a pessoa quiser | Gerar uma imagem local com controles explícitos de privacidade.                  |

Para a reunião, priorizar três perguntas: **O que você usaria toda semana? O que ficou confuso? Qual informação você não gostaria de compartilhar?** Medir utilidade e vontade de voltar, sem assumir que mais notificações ou mais tempo de tela significam um produto melhor.
