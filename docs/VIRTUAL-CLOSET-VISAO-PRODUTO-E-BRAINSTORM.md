# Virtual Closet — visão de produto, inovação e plano de evolução

Documento mestre de brainstorm, produto, experiência, tecnologia e negócio.

Atualizado em 07/10/2026.

## 1. Resumo executivo

O Virtual Closet não deve ser apenas um catálogo digital de roupas nem uma cópia de uma rede social de moda. A melhor oportunidade é transformá-lo em uma inteligência pessoal de estilo: um produto que entende o que a pessoa possui, o que ela realmente usa, como se sente, quais situações enfrenta e quais inspirações deseja transformar em realidade.

A proposta central recomendada é:

> Um novo olhar para o que já é seu.

Na prática, o produto deve responder progressivamente melhor a cinco perguntas:

1. O que eu visto hoje?
2. Como posso recriar este look usando o que eu já tenho?
3. O que funciona para meu estilo, meu conforto e minha rotina?
4. Esta nova compra realmente acrescenta algo ao meu closet?
5. Como meu estilo e minha relação com as roupas estão evoluindo?

O crescimento não deve ser otimizado apenas para tempo de tela. A métrica central deve representar valor real:

> Quantas decisões de roupa o Virtual Closet ajudou a resolver satisfatoriamente nesta semana?

## 2. Estado atual do produto

O projeto já possui uma base concreta em Expo, React Native, TypeScript e Supabase.

### Produto real

- Cadastro e autenticação.
- Cadastro, edição, arquivamento e restauração de peças.
- Fotos privadas.
- Criação de outfits.
- Calendário de uso.
- Feed pessoal privado.
- Histórico e última utilização.
- Leitura offline limitada.

### Prévia experimental

- Página inicial com sugestões.
- Cenários de clima.
- Favoritos.
- Preços, custo por uso e valor do outfit.
- Estatísticas.
- Desafio leve.
- Eventos, viagens e planejamento de looks.

Esses recursos experimentais ainda precisam ser integrados ao banco e aos fluxos autenticados. A existência do protótipo, entretanto, é valiosa: permite validar a experiência antes de aumentar a complexidade do sistema.

## 3. Posicionamento recomendado

### O que o produto não deve ser

- Apenas um lugar para armazenar fotos de roupas.
- Um feed público genérico.
- Um aplicativo que exige horas de cadastro antes de entregar valor.
- Uma IA que produz sugestões visualmente bonitas, mas impraticáveis.
- Uma plataforma que incentiva compras para gerar receita.
- Um provador virtual que promete precisão de tamanho e caimento sem conseguir entregar.

### O que o produto deve ser

- Um assistente para decisões reais.
- Uma memória pessoal de estilo.
- Uma ponte entre inspiração e closet.
- Um sistema que aprende com o resultado de cada uso.
- Uma ferramenta para comprar melhor e usar mais.
- Um espaço social colaborativo, inicialmente privado e seguro.

## 4. Princípios de experiência

### Valor antes de esforço

O usuário deve receber uma primeira sugestão útil após cadastrar aproximadamente dez peças, sem precisar digitalizar o closet inteiro.

### Aprender por comportamento, não por interrogatório

Preferências devem ser inferidas de escolhas, rejeições, ajustes, usos e feedbacks curtos. Questionários longos devem ser opcionais.

### Sugestões explicáveis

Toda recomendação deve poder responder “por que este look?”:

- Compatível com o clima.
- Adequado à ocasião.
- Inclui uma peça esquecida.
- Usa cores que a pessoa costuma aceitar.
- Evita repetição recente.
- Está disponível e limpa.

### Controle humano

O usuário sempre pode trocar peças, corrigir categorias, rejeitar uma sugestão e ajustar preferências. A automação não deve esconder incerteza.

### Privacidade como parte do produto

Closet, preços, calendário, localização, medidas e fotos corporais são dados sensíveis. Compartilhamento deve ser granular e desativado por padrão.

### Retenção por utilidade

O produto deve aparecer nos momentos em que roupas importam: manhã, compra, viagem, evento, arrumação do closet e retrospectiva.

## 5. O ciclo principal do produto

O loop recomendado é:

1. Capturar: adicionar peças, inspirações, compras e looks usados.
2. Entender: organizar atributos, contexto e preferências.
3. Sugerir: apresentar poucas opções contextualizadas.
4. Escolher: permitir ajuste rápido.
5. Vestir: registrar a decisão com o mínimo de atrito.
6. Aprender: recolher conforto, confiança e resultado.
7. Melhorar: usar o feedback na próxima recomendação.

Cada volta do ciclo aumenta a utilidade do aplicativo. Esse é o principal mecanismo de retenção e também a base de uma vantagem competitiva acumulativa.

## 6. A inovação central: Look DNA e Remix com meu closet

### Conceito

Um look publicado ou salvo não deve ser apenas uma fotografia. Ele deve ter uma estrutura reutilizável, o Look DNA:

- Papéis das peças: base, parte de baixo, camada, calçado e acessórios.
- Silhueta.
- Paleta e contraste.
- Nível de formalidade.
- Clima e estação.
- Ocasião.
- Sensação desejada.
- Regras visuais importantes.

Ao tocar em “Remix com meu closet”, o sistema procura equivalentes funcionais entre as peças reais do usuário.

### Exemplo de experiência

Look original:

- Camiseta branca oversized.
- Jeans escuro reto.
- Tênis caramelo.
- Estética casual confortável.

Resultado personalizado:

- Camiseta branca boxy do usuário.
- Jeans preto favorito.
- Tênis marrom disponível.
- Alternativa com jaqueta para queda de temperatura.

O usuário pode:

- Usar hoje.
- Guardar como outfit.
- Trocar uma única peça.
- Adaptar para trabalho, chuva ou noite.
- Agendar.
- Pedir a opinião de amigos.
- Publicar sua versão.

### Valor para o usuário

- Transforma inspiração em ação.
- Reduz compras por imitação.
- Torna o feed útil mesmo quando ninguém possui as mesmas peças.
- Faz o conteúdo social melhorar o closet pessoal.

### Valor estratégico

Pinterest ajuda a salvar. TikTok ajuda a descobrir. Instagram ajuda a mostrar. O Virtual Closet pode ajudar a executar.

Cada remix alimenta o Style Graph e cria uma árvore social de versões. O conteúdo fica estruturado, reutilizável e progressivamente mais personalizado.

### Implementação operacional

Fase inicial:

1. Criar receitas manuais para looks com papéis e atributos.
2. Mapear categorias e cores do look às peças existentes.
3. Calcular candidatos por regras determinísticas.
4. Exibir de uma a três opções por papel.
5. Permitir substituição manual.
6. Salvar o resultado como outfit e registrar sua origem.

Fase inteligente:

1. Gerar embeddings visuais e textuais das peças.
2. Calcular similaridade por função, forma, cor, textura e formalidade.
3. Incorporar preferências e feedbacks.
4. Ranquear remixes por contexto e histórico.
5. Explicar os principais fatores da escolha.

Entidades sugeridas:

- look_recipes
- look_recipe_slots
- inspirations
- inspiration_items
- remixes
- remix_items
- recommendation_feedback

## 7. Sistemas fundamentais

### 7.1 Style Memory

O sistema deve aprender não apenas com likes, mas com o que aconteceu quando a pessoa vestiu o look.

Feedback rápido após o uso:

- Confortável.
- Confiante.
- Adequado ao clima.
- Adequado à ocasião.
- Usaria novamente.

Também devem existir motivos de rejeição:

- Calor ou frio.
- Repeti recentemente.
- Peça indisponível.
- Não combina comigo.
- Formal ou casual demais.
- Não quero esta cor hoje.

#### Implementação

- Adicionar outfit_feedback vinculado ao wear_log.
- Usar escalas curtas e campos opcionais.
- Guardar tags de motivo, não apenas uma nota média.
- Atualizar preferências derivadas de forma assíncrona.
- Permitir apagar o histórico de personalização.
- Nunca inferir características corporais sensíveis sem consentimento.

### 7.2 Três opções para hoje

A home deve oferecer uma decisão curta:

- Seguro: alinhado ao comportamento conhecido.
- Criativo: uma variação coerente.
- Redescoberta: inclui uma peça pouco usada.

Cada opção deve ter:

- Motivo da sugestão.
- Clima e ocasião considerados.
- Botão para trocar uma peça.
- Ação “Vou usar”.
- Ação “Não hoje” com justificativa rápida.

Começar com regras é preferível a lançar uma IA opaca. A inteligência pode crescer quando houver feedback real.

### 7.3 Style Lab

Pequenas escolhas entre duas opções ensinam o gosto do usuário de maneira divertida:

- Look A ou B.
- Com ou sem camada.
- Mais clean ou mais marcante.
- Qual seria usado em determinada ocasião.
- Qual peça deveria ser substituída.

Limitar o deck diário evita um feed infinito artificial. As escolhas podem alimentar pesos de cor, silhueta, formalidade, repetição e ousadia.

### 7.4 Clima pessoal

Temperatura isolada não descreve conforto.

O sistema deve considerar:

- Sensibilidade pessoal ao frio e calor.
- Chuva, vento e umidade.
- Período do dia.
- Ambiente externo ou com ar-condicionado.
- Deslocamento.
- Preferência por camadas.
- Disponibilidade real das peças.

Começar com cenário selecionado manualmente. Depois integrar uma fonte de clima com cache, consentimento de localização, cidade manual e indicação da atualização.

### 7.5 Antes de comprar

O usuário envia foto, print ou link de uma peça desejada. O produto avalia:

- Peças semelhantes já existentes.
- Quantidade de combinações novas.
- Compatibilidade com o closet.
- Lacunas que impedem o uso.
- Sobreposição de função.
- Estimativa conservadora de custo por uso.
- Possíveis remixes.

Não deve existir uma nota moral. O objetivo é clareza para decidir.

#### Implementação

Fase um:

- Wishlist manual.
- Categoria, cor, preço e foto.
- Busca por itens semelhantes.
- Contagem de outfits potenciais por regras.
- Período opcional de reflexão.

Fase dois:

- Importação de link ou print.
- Extração assistida de atributos.
- Similaridade visual.
- Simulação de combinações.
- Comparação entre candidatos.

### 7.6 Eventos, viagens e Plano A/Plano B

O planejamento atual deve evoluir para:

- Outfit principal e alternativas.
- Atividades por dia.
- Clima por destino.
- Checklist de peças únicas.
- Lembretes para lavar, passar ou separar.
- Estado da mala.
- Itens esquecidos.
- Registro do que realmente foi usado.
- Reutilização de uma mala anterior.

Eventos não devem ser contados como uso antes de acontecer.

### 7.7 Closet operacional

Cada peça pode assumir um estado:

- Disponível.
- Suja.
- Lavando.
- Em conserto.
- Emprestada.
- Guardada.
- Para vender.
- Para doar.

Sugestões devem excluir peças indisponíveis. Estados podem ser temporários e ter lembretes.

### 7.8 Círculos de estilo

Começar social com grupos pequenos:

- Amigos.
- Família.
- Casal.
- Grupo de viagem.
- Personal stylist.

Funcionalidades:

- Pedido “monte um look para mim”.
- Enquete A ou B.
- Compartilhamento de um subconjunto do closet.
- Remix privado.
- Comentários contextuais.
- Coordenação de grupo.

O público nunca deve receber preço, localização, agenda ou inventário completo por padrão.

### 7.9 Style Wrapped

Retrospectiva mensal ou anual:

- Peça protagonista.
- Cor dominante.
- Outfit mais repetido.
- Peça redescoberta.
- Melhor custo por uso.
- Quantidade de combinações.
- Eventos marcantes.
- Evolução visual.
- Mosaico do período.

Gerar cards compartilháveis e permitir ocultar preços e outras informações.

### 7.10 Memória emocional

Uma peça pode guardar:

- Origem.
- Pessoa que presenteou.
- Fotos usando.
- Eventos importantes.
- História curta.
- Motivo da despedida.

Isso transforma o closet em uma memória pessoal, não apenas inventário.

## 8. Onboarding e captura

O maior risco da categoria é exigir muito trabalho antes de entregar utilidade.

### Closet Sprint

1. Adicionar dez peças favoritas.
2. Remover fundo e sugerir atributos.
3. Confirmar somente campos inseguros.
4. Gerar os primeiros outfits.
5. Convidar o usuário a continuar aos poucos.

### Formas de entrada

- Foto individual.
- Lote de fotos.
- Foto de outfit com separação assistida.
- Screenshot.
- URL de produto.
- Comprovante de compra.
- Item semelhante de um catálogo.
- Cadastro no momento do uso.

### Requisitos de UX

- Mostrar progresso.
- Permitir desfazer.
- Preservar a foto original.
- Indicar confiança da automação.
- Não bloquear o uso por campos secundários.
- Evitar falhas silenciosas em processamento.
- Processar em segundo plano quando seguro.

## 9. Gamificação com propósito

Evitar recompensas por abrir o aplicativo ou permanecer nele.

Desafios recomendados:

- Uma peça, três estilos.
- Quatro combinações em sete dias.
- Redescobrir uma peça esquecida.
- Recriar uma inspiração sem comprar.
- Semana cápsula.
- Repetir um look mudando apenas uma peça.
- Usar novamente uma peça de baixo custo por uso.

Regras:

- Participação opcional.
- Sem punição por quebrar sequência.
- Sem ranking público obrigatório.
- Progresso baseado em uso real.
- Recomendações adaptadas ao tamanho do closet.
- Linguagem sem culpa.

## 10. Banco ampliado de ideias

### Descoberta e personalização

- Busca por sensação: confortável, elegante, discreto, criativo ou marcante.
- Uniformes pessoais: fórmulas que sempre funcionam.
- Controle de ousadia das sugestões.
- “Troque somente uma peça”.
- “Faça este look funcionar no trabalho”.
- Explicação visual de harmonia e contraste.
- Sugestão de combinações nunca usadas.
- Modo sem compras.
- Recomendação baseada no tempo disponível para se arrumar.

### Organização

- Múltiplos closets e locais.
- Estações e armazenamento.
- Controle de empréstimos.
- Cuidados, lavagem e manutenção.
- Reparos e alterações.
- Detecção de duplicatas.
- Registro de tamanho por marca.
- Busca visual dentro do próprio closet.

### Vida real

- Widget com opções do dia.
- Registro rápido por selfie.
- Lembrete de preparar roupas na noite anterior.
- Calendário de dress code.
- Mala com peso estimado.
- Coordenação de looks de casal ou grupo.
- Sugestão baseada em mobilidade e sensibilidade.
- Histórico “quando usei isto pela última vez?”.

### Social e criação

- Árvore de remixes.
- Desafios privados.
- Pedidos de styling.
- Enquetes temporárias.
- Pastas colaborativas.
- Cartão compartilhável de look.
- Receita de look sem revelar marcas ou preços.
- Créditos ao criador do look original.
- Curadoria por pessoas, não apenas algoritmos.

### Compra, desapego e sustentabilidade

- Alerta de item semelhante.
- Quantidade de looks desbloqueados por uma compra.
- Wishlist com período de reflexão.
- Meta voluntária de no-buy.
- Custo por uso.
- Sugestão de conserto, doação ou venda.
- Histórico da peça antes do desapego.
- Estimativas ambientais explicitamente aproximadas.

## 11. Provador virtual

O provador é atraente para demonstrações, mas não deve prometer tamanho ou caimento exatos.

Riscos:

- Alto custo computacional.
- Licenças restritivas.
- Resultados inconsistentes.
- Mudança indevida de corpo ou rosto.
- Privacidade de fotos corporais.
- Expectativa incorreta sobre tecido e tamanho.

Antes de implementá-lo:

1. Definir o caso de uso exato.
2. Selecionar modelo com licença comercial válida.
3. Medir custo e latência.
4. Definir retenção e exclusão das imagens.
5. Testar diversidade corporal, poses e sobreposições.
6. Rotular a imagem como visualização aproximada.
7. Permitir apagar imediatamente os arquivos.

Uma etapa intermediária mais segura é criar composições visuais e remixes usando as fotos isoladas das peças.

## 12. Identidade de marca e linguagem visual

A direção warm/cozy deve ser mantida, mas precisa de uma assinatura própria.

### Elementos recomendados

- Camadas que se empilham como peças de um look.
- Linhas discretas inspiradas em costura.
- Tags e etiquetas como estruturas informativas.
- Transições de dobrar, separar e encaixar.
- Háptica curta ao completar uma combinação.
- Paleta secundária derivada das cores do closet.
- Animação característica no remix.

### Paleta atual

- Canvas: #FAF9F6.
- Ink: #292D25.
- Olive: #41573C.
- Lemon: #E7EDB8.
- Sage: #EEF1E8.
- Blush: #F7EAE4.

### Tom de voz

- Humano.
- Direto.
- Acolhedor.
- Sem julgamento.
- Sem jargão de IA.
- Sem pressionar compras.

Exemplos:

- “Um novo olhar para o que já é seu.”
- “Três ideias para o seu dia.”
- “Quer trocar uma peça?”
- “Esta peça abre novas combinações.”
- “Não hoje” em vez de “Não gostei”.

O nome Virtual Closet é descritivo, mas genérico. Uma futura etapa de naming deve avaliar disponibilidade jurídica, domínio, lojas e pronúncia antes de qualquer mudança.

## 13. Arquitetura técnica recomendada

### Stack preservada

- Expo e React Native.
- TypeScript.
- Expo Router.
- Supabase Auth, PostgreSQL e Storage.
- Zustand para estado e cache limitado.
- RLS em todas as entidades privadas.

### Módulos de domínio futuros

#### Personalização

- style_profiles
- style_preferences
- recommendation_events
- recommendation_feedback
- outfit_feedback

#### Inspiração e remix

- inspirations
- inspiration_items
- look_recipes
- look_recipe_slots
- remixes
- remix_items

#### Planejamento

- events
- event_days
- event_outfits
- event_items
- notification_preferences

#### Social

- profiles
- circles
- circle_members
- styling_requests
- styling_proposals
- comments
- reactions

#### Closet operacional

- item_states
- item_loans
- item_repairs
- item_care
- wishlist_items

### Regras de dados

- Toda entidade privada deve possuir proprietário explícito.
- Relações devem validar que todos os registros pertencem ao mesmo usuário.
- Preços devem usar centavos e moeda explícita.
- Planejamento futuro não deve alterar histórico.
- Recomendações devem registrar versão e motivos.
- Fotos devem continuar em bucket privado.
- Dados sociais devem usar visibilidade explícita.
- Exclusão de conta e exportação devem ser planejadas antes de distribuição pública.

### Motor de recomendação

#### Primeira versão

Usar regras transparentes:

- Compatibilidade de categoria.
- Clima.
- Ocasião.
- Disponibilidade.
- Repetição recente.
- Favoritos.
- Peças esquecidas.
- Preferências declaradas.

#### Evolução

- Embeddings visuais e textuais.
- Ranking personalizado.
- Aprendizado por feedback.
- Diversidade controlada.
- Explicação dos fatores.
- Testes A/B éticos.

Uma arquitetura híbrida é preferível: regras garantem segurança e coerência; modelos melhoram similaridade e ranking.

### Processamento de imagens

- Conservar o original privado.
- Criar derivativos para catálogo.
- Executar remoção de fundo de forma assíncrona.
- Mostrar estado de processamento.
- Permitir correção e desfazer.
- Não enviar fotos pessoais a serviços sem política clara.
- Avaliar execução local ou serviço próprio conforme custo e licença.

## 14. Estratégia social

### Fase inicial

- Feed pessoal.
- Compartilhamento direto.
- Círculos privados.
- Enquetes.
- Pedidos de styling.

### Fase de rede

- Perfis públicos opcionais.
- Receitas de look.
- Remix e atribuição.
- Busca por estilo e ocasião.
- Moderação e denúncia.
- Controles de comentários.

### Evitar no começo

- Contagem pública como principal incentivo.
- Feed global sem conteúdo suficiente.
- Mensagens abertas de desconhecidos.
- Exposição automática do closet.
- Localização associada a eventos.
- Ranking que favoreça apenas popularidade.

## 15. Modelo de negócio

### Plano gratuito

- Closet essencial.
- Outfits.
- Histórico.
- Calendário.
- Sugestões limitadas.
- Círculo pequeno.

### Plano premium

- Style Memory avançada.
- Remix inteligente.
- Antes de comprar.
- Estatísticas e retrospectivas completas.
- Mais círculos e planejamento.
- Importação e processamento avançado.

### Serviços

- Marketplace de stylists verificados.
- Sessões e lookbooks pagos.
- Curadorias temáticas.
- Serviços de organização de closet.

### Comércio responsável

Afiliados podem existir apenas quando houver uma lacuna real e com separação clara entre recomendação e publicidade. O produto nunca deve reduzir a qualidade da recomendação para vender.

### Receitas futuras

- Assinaturas.
- Comissão de serviços.
- Ferramentas profissionais para stylists.
- Recursos premium para criadores.
- Revenda ou doação assistida.

Não vender dados pessoais de closet, corpo, localização ou comportamento deve ser um princípio de confiança.

## 16. Métricas

### North Star

Decisões de roupa assistidas e avaliadas positivamente por usuário ativo por semana.

### Ativação

- Tempo até a primeira sugestão útil.
- Percentual que adiciona dez peças.
- Percentual que cria ou aceita o primeiro outfit.

### Valor recorrente

- Semanas com escolha, planejamento ou registro.
- Aceitação de sugestões.
- Outfits usados após recomendação.
- Remixes concluídos.
- Eventos planejados.

### Qualidade

- Rejeição por clima, conforto ou incoerência.
- Peças sugeridas indisponíveis.
- Correções em atributos automáticos.
- Tempo para cadastrar uma peça.

### Negócio

- Conversão para premium.
- Retenção por coorte.
- Uso de recursos premium.
- Receita por usuário pagante.
- Custo de processamento por recomendação.

Tempo de tela e notificações abertas são métricas secundárias, não objetivos do produto.

## 17. Roadmap recomendado

### Horizonte 1 — fundação útil

- Testar o MVP no iPhone.
- Integrar favoritos, preços, estatísticas e eventos.
- Implementar remoção de fundo e cadastro progressivo.
- Criar feedback pós-uso.
- Entregar as três opções para hoje.
- Adicionar notificações locais controladas.

### Horizonte 2 — diferenciação

- Construir o Style Graph.
- Lançar Look DNA e Remix com meu closet.
- Criar Style Lab.
- Implementar Antes de comprar.
- Personalizar clima.
- Lançar Style Wrapped.

### Horizonte 3 — rede e escala

- Círculos de estilo.
- Pedidos colaborativos.
- Receitas públicas e árvores de remix.
- Ferramentas para stylists e criadores.
- Desapego e comércio responsável.
- Experimentos de provador virtual.

## 18. Testes antes de escalar

### Teste do primeiro valor

Convidar pessoas para cadastrar dez peças e observar:

- Quanto tempo levam.
- Onde hesitam.
- Quando recebem a primeira sugestão útil.
- Se aceitariam repetir o processo.

### Teste do Remix

Apresentar inspirações e medir:

- Se a pessoa entende o conceito sem explicação.
- Se reconhece suas próprias peças no resultado.
- Se usaria a combinação.
- Quais substituições faz.

### Teste do Antes de comprar

Usar itens reais desejados pelos participantes:

- A análise muda a decisão?
- A compatibilidade parece confiável?
- Quais informações seriam decisivas?

### Teste de retenção

Executar um piloto de duas a quatro semanas e observar ocasiões naturais de retorno, sem pressionar abertura diária.

## 19. Priorização

| Conceito | Valor | Diferenciação | Retenção | Complexidade |
| --- | --- | --- | --- | --- |
| Cadastro rápido e progressivo | Muito alto | Média | Alta | Média |
| Style Memory | Muito alto | Alta | Muito alta | Média |
| Remix com meu closet | Muito alto | Muito alta | Muito alta | Média/alta |
| Antes de comprar | Muito alto | Muito alta | Alta | Média/alta |
| Três opções para hoje | Alta | Média | Muito alta | Baixa/média |
| Círculos privados | Alta | Alta | Alta | Média |
| Style Wrapped | Média/alta | Média | Alta | Média |
| Closet operacional | Alta | Alta | Média | Alta |
| Provador virtual | Média | Baixa/média | Baixa | Muito alta |
| Rede pública completa | Incerta | Baixa | Incerta | Muito alta |

## 20. Visão de empresa

O Virtual Closet pode ocupar um espaço entre organização pessoal, recomendação, moda, memória e consumo consciente.

Sua vantagem não estará em possuir uma única função de IA. Estará na conexão entre:

- Inventário real.
- Contexto da vida.
- Histórico de uso.
- Preferências aprendidas.
- Inspirações estruturadas.
- Colaboração.
- Decisões de compra.

Quanto mais a pessoa usa o produto, mais difícil fica substituí-lo por uma ferramenta genérica, porque o valor está na memória acumulada e na personalização.

## 21. Manifesto

Seu closet já possui histórias, escolhas e possibilidades.

O Virtual Closet existe para ajudá-lo a enxergar melhor o que já é seu, decidir com menos esforço, experimentar com mais confiança e comprar com mais consciência.

Não é apenas sobre roupa.

É sobre identidade, rotina, memória e expressão.

## 22. Referências de mercado

- Whering: https://whering.co.uk/
- Acloset: https://www.acloset.app/
- Indyx: https://www.myindyx.com/how-it-works
- Stylebook: https://www.stylebookapp.com/features.html
- Cladwell: https://cladwell.com/app
- Pinterest 2025 results: https://www.sec.gov/Archives/edgar/data/1506293/000150629326000058/pins-20260407.htm

As referências servem para mapear padrões da categoria. Elas não substituem testes com usuários do Virtual Closet.

## 23. Roteiro de fala da apresentação introdutória

### Slide 1 — Virtual Closet

Apresente o projeto como uma inteligência pessoal de estilo, não apenas como um armário digital. Use a frase “um novo olhar para o que já é seu” como síntese.

### Slide 2 — O paradoxo

Explique que o problema não é simplesmente falta de roupas. As pessoas têm peças, referências e opções, mas tudo está desconectado no momento da decisão.

### Slide 3 — A proposta

Mostre as quatro ocasiões que o produto pretende resolver: decidir o look, recriar uma inspiração, avaliar uma compra e entender a evolução do próprio estilo.

### Slide 4 — O produto já existe

Deixe claro que não é apenas uma ideia acadêmica. Há um aplicativo funcional e uma prévia visual em evolução. Diferencie honestamente o que já está integrado do que ainda é protótipo.

### Slide 5 — Style Memory

Explique que cada uso ensina alguma coisa. O app observa escolhas e recebe feedback curto sobre conforto, confiança e contexto para melhorar as próximas sugestões.

### Slide 6 — Remix com meu closet

Faça uma pausa nesta página. Ela contém a inovação central: transformar qualquer inspiração em uma versão executável com as roupas reais de quem está olhando.

### Slide 7 — Cinco sistemas

Mostre que as funcionalidades não são um amontoado. Elas formam um sistema contínuo: decidir, aprender, recriar, planejar e comprar melhor.

### Slide 8 — Momentos reais

Percorra um dia comum. O produto tem razões naturais para ser usado de manhã, durante uma descoberta, em uma compra, após o uso e no planejamento da semana.

### Slide 9 — Vantagem competitiva

Explique que o diferencial cresce com o tempo. Closet, histórico, contexto e comportamento formam o Style Graph pessoal.

### Slide 10 — Social com propósito

Defenda o início por círculos privados. Amigos podem ajudar a montar looks usando somente as peças autorizadas, antes de o projeto assumir os custos de uma rede pública.

### Slide 11 — Negócio

Apresente o modelo freemium, a assinatura premium e o ecossistema de stylists e criadores. Reforce que monetização não deve prejudicar a recomendação.

### Slide 12 — Concorrência

Reconheça que a categoria já possui boas ferramentas. A tese do Virtual Closet está na conexão entre inspiração, peças reais, aprendizado e decisão.

### Slide 13 — Roadmap

Mostre disciplina: primeiro entregar utilidade, depois diferenciação e somente então rede e escala. Não tentar desenvolver tudo simultaneamente também é uma decisão de produto.

### Slide 14 — Encerramento

Finalize com a ideia de que a inspiração deve virar possibilidade e a possibilidade deve virar vida real.

### Cuidados durante a apresentação

- Não afirmar que recursos experimentais já estão integrados ao aplicativo real.
- Não prometer precisão de tamanho ou caimento no provador virtual.
- Não apresentar estimativas de mercado sem fonte.
- Não descrever IA como substituta do gosto da pessoa.
- Mostrar ambição acompanhada de uma ordem de execução realista.

