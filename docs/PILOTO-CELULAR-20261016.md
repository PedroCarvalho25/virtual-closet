# Piloto em celular — Virtual Closet

## Objetivo e estado
Validar descoberta, desejo e composição com poucas peças, sem ensinar cada toque. O piloto usa conta própria; @oarmandopintoofc permanece a conta exclusiva de apresentação. Testes em navegador com viewport móvel não substituem um aparelho físico.

## Preparação
1. Aplicar somente a migração 10 pela página local `/wishes-setup`, depois das nove anteriores.
2. No computador, usar `npm start` na pasta do projeto (Expo Go). O app usa a configuração pública já existente em `.env.local`; não copiar credenciais do navegador.
3. Deixar celular e computador na mesma rede. Abrir o QR exibido pelo Expo; no iPhone, o Expo Go deve suportar a versão do SDK usada pelo projeto. `npm run iphone:qr` cria uma página local com QR e verificação de disponibilidade.
4. O endereço 127.0.0.1 do computador não abre no celular. Não distribuir esse endereço a convidados. A versão PWA instalável fora do computador requer uma origem HTTPS e uma etapa de hospedagem ainda não realizada.

## Sessão de 15 minutos
Peça ao participante que realize estas tarefas, sem explicar a localização dos botões:
- Encontrar no Mural uma roupa que usaria e guardar como desejo.
- Identificar o que combina com as quatro primeiras peças do próprio closet.
- Experimentar uma sugestão no Ateliê, trocar uma peça e guardar a composição.
- Voltar ao app e encontrar novamente a composição.
- Comparar dois desejos e explicar com suas palavras o que a comparação oferece.
- Alterar uma preferência de acessibilidade e localizar novamente os desejos.

Observe tempo para localizar a primeira ação, toques sem resultado, rolagem perdida, corte de texto com fonte ampliada, teclado cobrindo campos, retorno de link externo e reação ao erro de conexão. Registre aparelho, sistema e versão do build. Colete observações sem fotografias pessoais, nomes ou e-mails no relatório.

## Critérios de saída
- Todas as tarefas críticas concluídas sem intervenção do moderador.
- Nenhum dado de outra conta ou foto pessoal exposto.
- Desejos continuam fora das peças possuídas e do histórico de uso.
- Reabrir o app preserva desejos e rascunhos salvos.
- Fonte ampliada, contraste e redução de movimento mantêm as ações acessíveis.
- Ausência de travamento ao voltar de uma fonte externa ou alternar rede.

## Provador realista
O recurso ainda não está liberado. A avaliação local anterior em CPU chegou a 480,5 segundos sem imagem final; o marcador continua `usable: false`. A revisão atual do código confirma float32 em CPU, modelo próximo de 1 bilhão de parâmetros e caminho acelerado CUDA, indisponível na GPU Iris Xe deste computador. Reduzir etapas só para mostrar uma imagem não validaria preservação da roupa, rosto ou proporções.

Antes de liberar: produzir resultados com fotos públicas de teste em hardware adequado, revisar roupa/rosto/proporções, medir latência e pico de memória, comprovar cancelamento/descarte e testar peças de cima, de baixo e únicas. O limite de oito minutos é um teto de interrupção do experimento, não uma meta do produto. Não contratar serviço nem transmitir fotos pessoais para terceiros para contornar essa limitação.

## Registro
- Navegador móvel: 20 cenários distintos aprovados nesta entrega; comparação inspecionada em 320 px. Evidência em `VALIDACAO-DESEJOS-20261016.json`.
- iOS/Android físico: pendente de execução em aparelho.
- Sessão autenticada hospedada após migração 10: pendente.
- PWA hospedada com HTTPS e acesso restrito: preparada como próxima etapa; sem deploy nesta rodada.
