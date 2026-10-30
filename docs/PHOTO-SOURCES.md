# Fotos de exemplo

As fotos abaixo são do Unsplash, baixadas em 06/10/2026. Uso sujeito à [licença gratuita do Unsplash](https://unsplash.com/license). Não são fotos do guarda-roupa do usuário, endosso das pessoas retratadas ou conteúdo gerado por IA. Nenhuma API paga é usada.

| Arquivo em `docs/preview-assets` | Fonte original                                               |
| -------------------------------- | ------------------------------------------------------------ |
| tee.jpg                          | https://images.unsplash.com/photo-1521572163474-6864f9cf17ab |
| denim.jpg                        | https://images.unsplash.com/photo-1542272604-787c3835535d    |
| sneakers.jpg                     | https://images.unsplash.com/photo-1549298916-b41d501d3772    |
| shirt.jpg                        | https://images.unsplash.com/photo-1598033129183-c4f50c736f10 |
| knit.jpg                         | https://images.unsplash.com/photo-1434389677669-e08b4cac3105 |
| look.jpg                         | https://images.unsplash.com/photo-1483985988355-763728e1935b |
| closet.jpg                       | https://images.unsplash.com/photo-1445205170230-053b83016050 |
| street.jpg                       | https://images.unsplash.com/photo-1515886657613-9f3515b0c78f |

A prévia local usa `tee`, `denim`, `sneakers`, `shirt` e `knit`. As três versões reduzidas em `assets/welcome` são recortes de `tee`, `knit` e `closet`, incluídos nas telas de boas-vindas. Elas ficam no pacote local, sem requisição a um CDN no uso normal.

No aplicativo conectado, as peças, combinações e posts vêm da conta autenticada. O servidor local `scripts/design-preview.mjs` mantém fixtures em uma exportação de teste com URL e chave fictícias; o aplicativo de produção não registra o service worker da prévia. A preparação opcional de `@oarmandopintoofc`, documentada em [CONTA-APRESENTACAO.md](CONTA-APRESENTACAO.md), permite ao titular importar referências licenciadas e ilustrações para seu próprio acervo privado.

## Novas fotos para as ideias da apresentação

- `cap.jpg`: https://images.unsplash.com/photo-1588850561407-ed78c282e89b — boné branco.
- `shorts.jpg`: https://images.unsplash.com/photo-1591195853828-11db59a44f6b — shorts jeans.

Baixadas em 06/10/2026 para a prévia local, sob a mesma licença gratuita do Unsplash. Não são fotos do usuário.


## Acervo do mural — 14/10/2026

Oito fontes acima foram selecionadas para o acervo real: street, knit, sneakers, denim, shirt, tee, cap e closet. Download em 14/10/2026; versões maiores com até 2200 px de largura quando disponíveis, sem ampliar o arquivo de origem. Os pares JPEG estão em `assets/mural/<nome>-full.jpg` e `<nome>-thumb.jpg`; `src/social/catalog-data.json` registra fonte, dimensões, crédito e SHA-256 de cada versão maior.

Licença conferida: [Unsplash License](https://unsplash.com/license), [uso pessoal/comercial](https://help.unsplash.com/en/articles/2612315-can-i-use-unsplash-images-for-personal-or-commercial-projects) e [crédito](https://help.unsplash.com/en/articles/2612337-do-i-have-to-give-credit-to-a-contributor-when-i-use-their-image). O acervo apresenta crédito Unsplash e acesso à fonte original. Não há alegação de endosso das pessoas ou marcas retratadas; não usar as fotos como depoimentos ou identidade de usuários reais.

A quinta migração adiciona apenas oito registros identificados como **Acervo**. São arquivos públicos incluídos no pacote e não consomem o bucket privado de uploads. Fotos de usuários reais são escolhidas e publicadas explicitamente. As publicações fictícias de Lia/Marina/Ian existem apenas no servidor local da prévia e têm legenda indicando exemplo e fonte Unsplash. Não há coleta ou scraping de Pinterest.


## Seleção fotográfica atual — 15/10/2026

A seleção atual tem 48 fotografias distintas, com autoria nominal e licença CC0 documentadas em registros históricos de 2017 ou anteriores. Inventário completo em [PHOTO-PROVENANCE-20261015.json](PHOTO-PROVENANCE-20261015.json): página de origem, evidência Wikimedia Commons, arquivo histórico Internet Archive, data, dimensões e SHA-256. As versões grandes têm largura entre 2.000 e 2.200 px; miniaturas de até 520 × 720. Todas foram inspecionadas visualmente e regravadas sem EXIF.

Os arquivos CC0 derivam da fase histórica do Unsplash sob CC0; a evidência específica de cada foto foi preservada. O app exibe crédito/fonte e não precisa chamar os sites externos durante a navegação. Oito seeds antigos são mantidos por compatibilidade, fora da seleção após a sexta migração enquanto seus créditos são revisados; inventário antigo em `src/social/catalog-legacy.json`. As fotografias da prévia são exemplos, nunca uploads atribuídos a usuários reais.

A verificação se baseia no registro histórico e na proveniência; não usa um detector visual de IA nem certifica todas as condições jurídicas de uso da imagem de pessoas. A declaração no formulário de publicação não equivale a verificação automática de uploads.
