# Virtual Closet — da apresentação ao primeiro negócio

Atualizado em 13/10/2026. O usuário relatou que a apresentação de hoje foi um sucesso. O objetivo passa a ser construir uma empresa com marca, aplicativo, serviço e um modelo de receita validado. Este plano complementa a visão de produto; não declara concluídos os recursos futuros.

## 1. Decisão recomendada

Avançar em ciclos: definir público e proposta → validar o app com contas reais → consolidar identidade → disponibilizar um piloto web → observar uso recorrente → testar uma oferta paga → ampliar o que tiver evidência de valor.

O desenvolvimento e o piloto devem caber em serviços gratuitos. Receita, lucro e capacidade de escala ainda não foram demonstrados. Um plano gratuito tem cotas; custos de atendimento, pagamentos e operação devem entrar nas contas quando houver venda.

O usuário esclareceu que a apresentação foi apenas a introdução do projeto e que o professor ainda não definiu a próxima entrega. A orientação é continuar evoluindo ideias, funcionalidades, implementação, front, fluidez, aplicativo, empresa e marca, sem aguardar uma nova tarefa acadêmica. A sequência abaixo organiza essa evolução contínua e não é uma promessa de calendário.

Público inicial confirmado pelo usuário: universitários e jovens profissionais, incluindo também pessoas que gostam de moda e de guardar inspirações. A ambição é alcançar progressivamente qualquer pessoa com interesse em roupas e estilo. O PowerPoint existente credita Pedro Carvalho, Alexander Haug e Carlos Braga; responsabilidades, disponibilidade e participação atual de cada pessoa ainda não foram confirmadas. Isso não impede preparar a base técnica.

### Público, necessidades e alcance

O público inicial reúne perfis que podem se sobrepor. Para desenhar e testar o produto, separar duas motivações de uso:

| Motivação | Situação a investigar | Primeiro resultado a testar |
| --- | --- | --- |
| Praticidade no dia a dia | Escolher roupa para estudo, trabalho ou outras ocasiões e aproveitar melhor as próprias peças | Montar e salvar uma combinação útil com poucas peças cadastradas |
| Inspiração e expressão pessoal | Guardar referências, organizar ideias e experimentar combinações | Guardar uma inspiração de forma simples, reencontrá-la e depois recriá-la com o próprio closet |

Essas motivações orientam a próxima experiência inicial; não são módulos novos já implementados. Evitar obrigar quem começa por inspiração a cadastrar todo o armário, ou exigir interesse intenso em moda de quem busca praticidade. Usar o mesmo produto, com entradas flexíveis e acesso às demais funções.

A marca deve acolher diferentes estilos, gêneros, idades e orçamentos, sem impor um padrão único de beleza ou presumir roupas caras. O grupo inicial de pesquisa não deve aparecer como uma restrição permanente de acesso ou como o único público representado na identidade.

O interesse amplo por roupas é uma oportunidade a investigar. Ele não mede automaticamente quantas pessoas usarão um closet digital ou pagarão por ele. A expansão será guiada por necessidades observadas, uso recorrente e capacidade de atender cada grupo. Não apresentar a população inteira como mercado validado.

## 2. O que existe e o que precisa ser comprovado

| Base existente | Próxima comprovação |
| --- | --- |
| Prévia com closet, looks, inspirações, remix, calendário e sistemas pessoais | Conseguir completar essas jornadas com contas e fotos reais no Supabase hospedado |
| Cadastro/login, banco e armazenamento privados preparados | Duas contas isoladas, sessão ao reabrir, saída sem dados de outra conta e recuperação de acesso |
| Migrações aplicadas com sucesso, segundo confirmação do usuário | Teste de comportamento no serviço hospedado; não reaplicar SQL |
| Visual fotográfico, paleta e movimentos discretos | Identidade própria consistente e uso confortável no iPhone 12 |
| Recorte automático local na demonstração | Solução compatível com distribuição; o Python local não acompanha uma hospedagem estática |
| Visão de premium, profissionais e serviços | Oferta, capacidade de entrega, disposição de pagar e margem reais |

Fonte de escopo: [matriz de implementação](IMPLEMENTACAO-DO-BRAINSTORM.md). Os testes documentados em [VALIDATION.md](VALIDATION.md) pertencem à rodada anterior; não foram executados novamente neste planejamento. O relato de sucesso da apresentação não comprova retenção, vendas ou todos os fluxos de produção.

## 3. Empresa, marca e serviço

**Problema inicial a investigar:** a pessoa tem roupas e referências, mas demora para transformar isso em uma escolha que funciona no seu dia.

**Proposta provisória:** um espaço para descobrir o próprio estilo, guardar inspirações e transformar as roupas que já se tem em combinações para a vida real.

**Frase de trabalho:** “Um novo olhar para o que já é seu.” É uma proposta de linguagem, sem pesquisa de disponibilidade concluída.

**Produto:** um closet pessoal que ajuda a cadastrar, combinar, recriar uma inspiração e registrar o que funcionou. A primeira jornada deve entregar valor com poucas peças; completar todo o armário não deve ser obrigatório.

**Serviço inicial a validar:** uma sessão assistida de organização e montagem de combinações com o próprio acervo, entregando um pequeno lookbook dentro do app. Antes de vender, definir quem atende, qual sua experiência, escopo, duração, revisões e prazo. A equipe não deve anunciar consultoria especializada sem ter quem a preste.

**Experiência da empresa:** descoberta da proposta → primeiro acesso → primeira combinação útil → uso durante a semana → ajuda quando necessário → retorno e eventual contratação. O atendimento, as mensagens e a entrega do serviço fazem parte da marca.

### Entrega de identidade

- Briefing de público, personalidade, promessa e referências, aproveitando os comentários recebidos na apresentação.
- Manter Virtual Closet como nome de trabalho. Pesquisar nome, INPI, domínio e perfis antes de decidir uma marca definitiva; busca preliminar não equivale a registro ou liberação jurídica.
- Criar alternativas de logotipo e símbolo em SVG, ícone do app e versões para fundos claros/escuros.
- Consolidar paleta, tipografia, fotografia, ilustração, tom de voz e movimento em um manual curto, aplicável ao app, site e materiais acadêmicos.
- Partir de #FAF9F6, #292D25, #41573C, #E7EDB8 e DM Sans; verificar contraste por combinação e respeitar reduzir movimento.
- Usar fotos e elementos com autorização/licença compatível. A referência de Pinterest orienta a descoberta visual; a identidade deve ter expressão própria.

Entregável verificável: kit visual acompanhado de aplicação em três telas principais, página de apresentação e material da faculdade. A identidade ainda será criada e avaliada; este documento é o briefing inicial.

## 4. Sequência de execução

| Ciclo | Entrega concreta | Critério para avançar |
| --- | --- | --- |
| 1. Público e proposta | Uma página com problema, público inicial, benefício, hipótese de receita e roteiro de entrevistas | Pessoas do público relatam situações recentes em que o problema ocorreu; escopo inicial escolhido |
| 2. Primeira versão real | Contas, fotos, closet, look, inspiração/remix e histórico persistentes | Jornada completa com duas contas de teste, reabertura e isolamento; falhas impeditivas corrigidas |
| 3. Marca e experiência | Kit de identidade e jornada inicial mais simples | Pessoas conseguem compreender a proposta e obter um primeiro resultado com pouca orientação |
| 4. Piloto fechado | Link HTTPS, acesso restrito ao grupo inicial, versão adaptada ao celular e canal de suporte | Participantes usam em seus aparelhos; dados e acesso se mantêm corretos; cotas acompanhadas |
| 5. Receita experimental | Uma oferta com preço, entrega e custos explícitos | Interesse confirmado por contratação real e entrega satisfatória, com margem calculada |
| 6. Expansão | Melhorias priorizadas pelo uso, distribuição e plano financeiro | Uso recorrente, qualidade, atendimento e economia sustentam aumentar o grupo |

Marca e pesquisa podem avançar junto com a preparação técnica. A abertura do piloto depende da validação do produto. Uma futura entrega acadêmica deve aproveitar os avanços e ser ajustada aos critérios do professor quando forem conhecidos.

## 5. Primeira entrega técnica recomendada

Objetivo: o usuário abrir o app real, cadastrar peças próprias, montar um look, sair e voltar encontrando seus dados — com outra conta sem acesso a eles.

1. Conferir a configuração autenticada sem expor `.env.local`, reaproveitando as migrações já aplicadas. Preparar duas contas de teste com autorização dos participantes.
2. Validar entrada, sessão, saída, foto, cadastro/edição, combinação, registro de uso e inspiração/remix no serviço real. Verificar que planejar não marca uso e que fotos continuam privadas.
3. Resolver o acesso do piloto. Avaliar login Google via Supabase como caminho gratuito que dispensa e-mails enviados pelo app; configurar e testar consentimento, URLs de retorno e contas permitidas. Se mantivermos senha por e-mail, resolver confirmação e recuperação com entrega confiável. A configuração pessoal atual, com confirmação desligada, precisa ser revista antes de abrir cadastros.
4. Preparar exportação e exclusão dos dados/conta, informações de privacidade, contato de suporte e recuperação/backup testados para o piloto. Dados de fotos e banco precisam ser considerados separadamente no backup.
5. Preparar a versão web instalável: manifesto, ícones, HTTPS, abertura das rotas e atualização previsível. Cache privado deve ser separado por usuário e limpo na saída. O service worker da demonstração não é a implementação de produção.
6. Testar navegador de computador e Safari/iPhone 12: teclado, galeria, fotos, rolagem, retomada e conexão instável. Oferecer alternativas claras onde uma capacidade nativa não estiver disponível na web.

Resultado esperado deste ciclo: versão real pronta para um pequeno grupo, com evidências dos testes. Não foi implementada ou publicada uma nova versão nesta rodada de planejamento.

## 6. Distribuição gratuita recomendada

Começar com um aplicativo web instalável, também chamado PWA. A pessoa acessa um link HTTPS no Safari e pode adicioná-lo à Tela de Início. Essa rota evita depender da App Store para o piloto e permite usar o serviço fora da rede do computador.

| Necessidade | Caminho inicial | Limite ou verificação |
| --- | --- | --- |
| Site e aplicação web | Avaliar Cloudflare Pages Free, com subdomínio do provedor | Confirmar tamanho dos arquivos, rotas, condições vigentes e compatibilidade do export antes de publicar |
| Banco, contas e fotos | Supabase Free já existente | Acompanhar banco, imagens e transferência; compressão e quantidade do piloto precisam caber nas cotas |
| Recomendações | Motor de regras já implementado | Medir utilidade; refinamento não depende obrigatoriamente de API de IA |
| Recorte de fotos | Investigar processamento no navegador e/ou fluxo manual adequado | Exige teste de memória, velocidade, licença e qualidade no iPhone; não declarar paridade com recorte local antes disso |
| Identidade e materiais | SVG, fontes licenciadas e ferramentas gratuitas | Domínio próprio e registro de marca são decisões posteriores com custos a verificar |
| Acompanhamento | Eventos mínimos próprios e observação consentida | Registrar ações, contagens e tempos necessários; evitar copiar fotos, textos privados ou todo o inventário para analytics |

O PWA não herda automaticamente lembretes locais, widgets, háptica ou outras capacidades nativas. Cada função precisa ser verificada e sua disponibilidade comunicada. Expo Go continua útil para testar a experiência nativa existente.

Não publicar o servidor local de apresentação: ele inclui rotas de configuração, atualização e demonstração. A hospedagem real deve receber somente os artefatos e endpoints apropriados. Nenhuma publicação foi feita por este plano.

## 7. Pesquisa e piloto

Proposta inicial: conversar com 5–8 pessoas, incluindo universitários/jovens profissionais e pessoas que guardam inspirações de moda, e depois convidar 10–20 participantes para um piloto de duas semanas. Registrar se cada pessoa busca praticidade, inspiração ou ambas; os grupos podem se sobrepor. Os números são um ponto de partida operacional, sem pretensão de representar o mercado. Convites e contatos serão feitos pela equipe; nenhum foi enviado pelo agente.

Perguntas úteis nas entrevistas:

- Conte a última vez que você demorou para escolher roupa. Como resolveu?
- Onde guarda referências? Já tentou reproduzir uma com o que tinha?
- Já cadastrou roupas em algum app? O que fez continuar ou abandonar?
- Já gastou dinheiro para resolver esse problema? Com o quê?

Observar a primeira sessão sem conduzir cada clique e respeitando o objetivo escolhido pela pessoa: começar por poucas peças e uma combinação, ou por guardar e reencontrar uma referência. Depois testar a ligação entre inspiração e closet. Registrar dúvidas e tempo com consentimento. A entrada por referências deve usar as capacidades que estiverem realmente disponíveis, sem simular importação automática ou um feed público.

### Medição

| Pergunta | Medida proposta |
| --- | --- |
| A pessoa percebe valor logo? | Tempo até o primeiro resultado útil da jornada escolhida: combinação aprovada ou inspiração guardada e reencontrada; alvo inicial de até cinco minutos a validar |
| O começo funciona? | Medir por jornada: participantes que completaram o primeiro resultado útil / participantes que iniciaram aquela jornada. Uma pessoa pode usar ambas; não somar percentuais nem contar a pessoa duas vezes no total |
| Ela volta por vontade própria? | Ativados que fizeram uma ação útil na segunda semana / ativados elegíveis com duas semanas completas |
| O app ajuda na vida real? | Decisões assistidas avaliadas positivamente por usuário ativo por semana, como proposto na visão de produto |
| Há oportunidade de receita? | Ofertas apresentadas, contratações efetivas, preço, entrega, reembolsos e margem |
| A operação cabe no gratuito? | Espaço das fotos, banco, transferência e tempo de suporte por participante |

Apresentar contagens junto de percentuais; em grupo pequeno, uma pessoa muda muito o resultado. Separar dados de demonstração, testes e usuários reais. Elogios, cadastros e intenção de pagar são sinais diferentes de uso recorrente e venda.

## 8. Modelo de receita e rentabilidade

Começar testando **uma** fonte de receita. Hipóteses preservadas:

1. Serviço assistido de organização/combinações: pode validar valor com poucos clientes, se existir capacidade de atendimento.
2. Assinatura por conveniências recorrentes: testar depois de observar quais tarefas realmente se repetem. Preço e limites do plano gratuito ainda não estão definidos.
3. Ferramenta para profissionais e seus clientes: avaliar se as entrevistas apontarem esse público. Marketplace, repasses e afiliados ficam para uma etapa com operação preparada.

Não bloquear recursos atuais ou instalar cobrança só porque a assinatura aparece no brainstorm. Uma oferta precisa descrever exatamente o que entrega e estar disponível para quem contratar.

Contas mínimas, em planilha editável na etapa financeira:

- Receita = clientes pagantes × preço efetivamente cobrado.
- Margem por venda = preço − taxas de pagamento − tributos aplicáveis − custo variável da entrega − provisão de reembolsos.
- Resultado do período = receita − custos variáveis − custos fixos − remuneração do trabalho considerado na operação.
- Ponto de equilíbrio = custos fixos / margem positiva por venda, usando a mesma unidade de período e sem contar o mesmo custo duas vezes.

Separar dinheiro desembolsado de horas da equipe, mesmo que o trabalho estudantil inicialmente não seja remunerado. Preparar cenários conservador, intermediário e otimista com hipóteses explícitas. Não projetar lucro apenas multiplicando usuários por preço.

Antes da venda real, definir responsável pela entrega, atendimento, cancelamento/reembolso e enquadramento da atividade com orientação aplicável. O material acadêmico pode apresentar hipóteses financeiras antes disso, claramente identificadas como simulação.

## 9. Entrega acadêmica e responsabilidades

Pacote recomendado para a próxima etapa, ajustável à rubrica da faculdade:

- Resumo executivo e modelo de negócio de uma página.
- Pesquisa com público e comparação de alternativas verificadas, incluindo como as pessoas resolvem o problema hoje.
- Kit de marca e demonstração de aplicação da identidade.
- App com jornada real e evidências de testes.
- Desenho do serviço: contratação, preparação, entrega, suporte e retorno.
- Planilha financeira com custos, cenários, margem e ponto de equilíbrio.
- Resultados do piloto, riscos observados, prioridades seguintes e apresentação atualizada.

O agente pode executar código, protótipos, materiais, cálculos e documentação. A equipe participa das escolhas de negócio, entrevistas, testes físicos e atendimento. Logins e eventuais consentimentos são feitos pelo titular nas telas oficiais, sem enviar senhas pelo chat.

Próximo passo recomendado: iniciar a primeira entrega técnica da seção 5, incorporando os dois perfis de uso confirmados à pesquisa e ao briefing de marca. As responsabilidades e a disponibilidade da equipe ainda precisam ser esclarecidas; os créditos do PowerPoint já identificam Pedro Carvalho, Alexander Haug e Carlos Braga. Não há prazo acadêmico definido e não é necessário aguardar um. A visão completa continua registrada; o piloto determina a ordem das próximas funcionalidades.

## 10. Referências consultadas em 13/10/2026

- [Apple — transformar um site em app no iPhone](https://support.apple.com/pt-br/guide/iphone/iphea86e5236/ios).
- [Expo — progressive web apps](https://docs.expo.dev/guides/progressive-web-apps/).
- [Expo — publicação web](https://docs.expo.dev/distribution/publishing-websites/).
- [Supabase — planos e preços](https://supabase.com/pricing).
- [Supabase — limites do serviço padrão de e-mail](https://supabase.com/docs/guides/auth/auth-smtp).
- [Cloudflare Pages — preços de assets e funções](https://developers.cloudflare.com/pages/functions/pricing/).
- [Cloudflare Pages — limites](https://developers.cloudflare.com/pages/platform/limits/).

As referências sustentam a rota proposta; não comprovam que a aplicação atual já está publicada, instalada ou compatível em todas as funções. Rever condições antes da configuração.
