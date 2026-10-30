# Conta de apresentação — @oarmandopintoofc

A preparação fica em **Minha conta → Preparar conta de apresentação**. A importação usa a sessão autenticada dessa conta. Até a ativação pelo titular, os arquivos estão prontos no app e não foram gravados na conta hospedada.

## Conteúdo

- 20 peças: 12 fotografias reais de referência e 8 ilustrações originais de catálogo. Há camisetas, camisas, jaqueta, moletom, poncho, calças, shorts, casaco, calçados, boné e cinto, com tamanhos e modelagens de exemplo.
- Cinco looks de quatro peças, com capa própria, paleta e explicação: Passeio leve; Camadas urbanas; Cinza em movimento; Noite de estampa; Texturas da tarde.
- Cinco registros explicitamente fictícios de uso, nos dias anteriores à primeira ativação.
- Dois planos de exemplo, para os dois dias seguintes à primeira ativação, sem lembretes.
- 12 perfis fictícios identificados na lista de seguidores. Eles aparecem apenas para o titular durante a apresentação, podem ser ocultados/removidos/restaurados, não são contas reais nem geram notificações. O contador público continua refletindo conexões reais.
- Roteiro com atalhos para peças, looks, calendário e comunidade de exemplo.

As fotografias preservam as cores originais. As ilustrações são desenhos planos com identificação explícita, não fotografias sintéticas. Nenhuma imagem ou registro desta preparação é publicado automaticamente no Mural. As imagens não representam peças realmente compradas ou usadas pelo titular.

## Implementação e continuidade

`src/showcase/api.ts` valida o proprietário autenticado e o @, envia 25 imagens ao bucket privado `closet-photos`, insere `wardrobe_items`, usa `create_outfit`, grava `wear_log` e usa `closet_apply` para histórias e planos. Não exige nova migração. Usa categorias do schema original; casaco, jaqueta, moletom, poncho, sapato e cinto entram como `outro` para manter compatibilidade com as seis migrações já aplicadas.

Os IDs das peças, dos registros de uso, dos planos e dos arquivos de imagem são derivados do proprietário e das chaves do catálogo. Repetir a preparação reaproveita o que já existe e conserva alterações posteriores, preferências de saudação, identidade pública, acervo e conexões reais. Uma resposta perdida de `create_outfit` é recuperada pela imagem determinística encontrada no snapshot seguinte. Uploads repetidos reconhecem erros de objeto existente e verificam acesso ao arquivo. Não há `upsert` em imagens, pois as políticas atuais não permitem atualização.

Um bloqueio no processo e Web Locks impedem importações simultâneas nas abas do mesmo navegador. Não há transação única entre dispositivos; executar a preparação em um aparelho de cada vez. Se interrompida, a tela oferece **Continuar preparação**. A importação concluída oferece **Conferir e completar acervo**. A data inicial é preservada nas retomadas.

As preferências ficam em `auth.user_metadata.closet_showcase_v1`, com dono, versão, data inicial, conclusão, visibilidade da comunidade e exemplos ocultos. São incluídas na exportação privada da conta. APIs públicas não leem esses metadados. Não há criação de usuários falsos em `auth.users` nem relações fictícias em tabelas de seguidores.

## Arquivos e imagens

- `app/account-demo.tsx`: revisão, progresso, ativação e roteiro.
- `src/showcase/model.ts` e `components.tsx`: estado por conta e comunidade fictícia.
- `src/showcase/catalog.json`: catálogo completo, fontes, licenças, recortes, dimensões e hashes SHA-256.
- `scripts/prepare-showcase.py` e `scripts/showcase-illustrations.py`: geração reproduzível dos recortes, desenhos e capas em `assets/showcase`.
- `tests/ui/showcase.spec.ts`: importação, persistência, preservação, repetição, interrupções e restrição à conta indicada.
- `tests/showcase.test.ts` e cenário de `tests/studio-database.test.ts`: integridade das imagens, isolamento das preferências e aceitação do catálogo pelas regras PostgreSQL reais.

As fotografias são reutilizadas do acervo local licenciado, com fontes mantidas nas histórias das peças. As cinco fotografias provenientes do catálogo CC0 têm autoria nominal e evidência Wikimedia; sete referências legadas registram o crédito Unsplash e a URL original, sem atribuir autoria nominal não confirmada. Referências adicionais em [PHOTO-SOURCES.md](PHOTO-SOURCES.md). As oito ilustrações foram criadas para este projeto.

## Limites de validação

Os testes locais usam fixtures isoladas e PostgreSQL/PGlite. Não equivalem à comprovação de carga na conta hospedada nem a um teste em aparelho físico. O titular precisa ativar a preparação no app autenticado. Não houve deploy público, acesso a senhas/tokens do navegador pessoal nem mensagens para terceiros. As pendências anteriores das migrações 7–9 e do provador realista continuam independentes desta entrega.

Validação concluída: TypeScript e ESLint aprovados; 169 testes de lógica/banco em 27 suítes; 11 cenários de navegador. Repetição adicional de 14 testes de banco/fixture após alinhar o simulador. As imagens foram conferidas visualmente no guarda-roupa em 320 px. Builds web real e prévia com status 0; versões e hashes em [VALIDACAO-CONTA-APRESENTACAO.json](VALIDACAO-CONTA-APRESENTACAO.json).
