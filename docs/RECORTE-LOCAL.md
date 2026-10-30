# Remoção de fundo gratuita

## Atualização de 15/10/2026 — navegador e PWA

O botão principal agora é **Remover fundo neste aparelho**. Ele executa U2Netp em um Web Worker com ONNX Runtime Web/WASM, inclusive na versão conectada. O navegador baixa o modelo (aproximadamente 4,6 MB) e o runtime (aproximadamente 14,2 MB) da própria origem do app; a fotografia não é enviada para inferência em serviço externo. Após salvar uma peça, a imagem confirmada é enviada ao armazenamento privado normal da conta.

Foi testado no Chrome com fotos reais e retomada da fila após recarregar. Há prazo de 45 segundos e desfazer. A instalação PWA pode guardar o runtime como arquivo estático; não guarda as fotos pessoais no service worker. Safari/iPhone físico ainda requer validação. O Expo Go não usa esse worker.

O provador oferece também contorno manual para isolar a roupa de uma referência. Remover o fundo de uma pessoa não é o mesmo que separar sua roupa. Esse recorte e a sobreposição visual não simulam tecido ou caimento. A avaliação da geração realista está em [ENTREGA-ATELIE-20261015.md](ENTREGA-ATELIE-20261015.md).

`node scripts/prepare-web-vision.mjs` verifica o checksum e copia os assets conhecidos. Licenças de U2Net, rembg e ONNX Runtime acompanham `public/vision`. O helper Python antigo abaixo permanece como alternativa apenas no computador.

## Helper anterior, somente neste computador

O recortador funciona na prévia web local em `127.0.0.1:4175`. Ao selecionar uma foto, use **Remover fundo neste computador**, confira o resultado e, se necessário, **Desfazer recorte** antes de salvar. O arquivo de origem na galeria/disco não é alterado. A versão enviada ao closet após confirmar é a foto que está na tela; ainda não há armazenamento permanente das duas versões no Supabase.

O processamento usa CPU e o modelo pequeno **U2Netp**. As fotos não são enviadas para serviços de IA. O resultado é JPEG com fundo branco quente, compatível com o contrato atual de fotos privadas. O recorte não é um provador virtual e não separa com precisão uma roupa do corpo da pessoa. Fotos da peça sozinha funcionam melhor; ainda não há pincel de correção de máscara.

## Instalação e operação

Já preparado neste computador. Para outra instalação com Python compatível:

```powershell
python scripts/prepare-local-vision.py
```

O script instala dependências apenas em `.tools/vision-runtime`, baixa o modelo em `.tools/models` e verifica o checksum conhecido. Requer internet somente para instalar/baixar o modelo. O uso posterior do modelo é local. Nenhuma assinatura ou chave de API é necessária.

Dependências verificadas nesta máquina: Python 3.14.7, onnxruntime 1.31.0, numpy 2.5.3, Pillow 12.3.0. A instalação ocupa espaço em disco e o processamento usa recursos do computador. `.tools` não é versionada nem incluída no aplicativo.

O servidor aceita um processamento por vez, usa um prazo de 30 segundos, limita tamanho de requisição/imagem e exige origem local e um token da sessão do servidor. A interface apresenta erro e preserva a foto selecionada se o processamento falhar. O helper não imprime fotos ou base64 nos logs. O teste com `docs/preview-assets/cap.jpg` gerou `.tools/cutout-cap.jpg`, revisado visualmente.

## Licenças e origem

- U²-Net, de Xuebin Qin e colaboradores: <https://github.com/xuebinqin/U-2-Net>. Código sob Apache-2.0; cópia em `licenses/U2Net-APACHE-2.0.txt`.
- Distribuição do modelo U2Netp pelo rembg: <https://github.com/danielgatis/rembg/releases/download/v0.0.0/u2netp.onnx>. MD5 de referência: `8e83ca70e441ab06c318d82300c84806`, usado como verificação de integridade do download conhecido.
- Normalização de entrada baseada na sessão U2netp do rembg, de Daniel Gatis e colaboradores: <https://github.com/danielgatis/rembg/blob/main/rembg/sessions/u2netp.py>. MIT; licença em `licenses/rembg-MIT.txt`.
- A implementação local adapta a inferência/normalização e compõe a máscara sobre fundo opaco. Não instala o rembg completo, não faz reconhecimento de atributos e não executa embeddings.

O Expo Go no iPhone não executa este processo Python. Para levar recorte ao aparelho sem serviço pago, falta avaliar um runtime/modelo compatível com execução no dispositivo ou um serviço próprio com custo operacional conhecido. O botão não promete essa função onde ela não está disponível.
