// Displays the local Expo Go QR code; does not publish the application.
import http from 'node:http';
import os from 'node:os';
import { toQR } from 'toqr';

const interfaces = Object.entries(os.networkInterfaces());
const wifi = interfaces.find(([name]) => /wi-?fi|wireless/i.test(name))?.[1];
const address = wifi?.find((item) => item.family === 'IPv4' && !item.internal)?.address;
const target = process.argv[2] || (address ? `exp://${address}:8081` : '');
if (!/^exp:\/\/\d{1,3}(?:\.\d{1,3}){3}:\d{2,5}$/.test(target)) {
  throw new Error('Informe o endereço exp://IP-DO-COMPUTADOR:8081 mostrado pelo Expo.');
}
const matrix = toQR(target);
const side = Math.sqrt(matrix.length);
const cells = [...matrix]
  .flatMap((value, index) =>
    value
      ? [
          `<rect x="${(index % side) + 4}" y="${Math.floor(index / side) + 4}" width="1" height="1"/>`,
        ]
      : [],
  )
  .join('');
const qr = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${side + 8} ${side + 8}" role="img" aria-label="QR code para abrir o Virtual Closet no Expo Go" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="white"/><g fill="#172017">${cells}</g></svg>`;
const page = `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Abrir no iPhone · Virtual Closet</title><style>*{box-sizing:border-box}body{background:#eceee6;color:#292d25;font:16px/1.6 system-ui;margin:0;padding:32px 16px}main{max-width:550px;margin:auto;padding:32px;background:#faf9f6;border-radius:28px}h1{font-size:28px;line-height:1.15;letter-spacing:-1px}svg{display:block;max-width:300px;margin:24px auto;border-radius:16px}small{color:#666e60}a{color:#41573c}.badge{font-size:11px;background:#e7edb8;border-radius:20px;padding:8px 12px;font-weight:700}#status{font-weight:600;color:#41573c}li{margin:12px 0}code{font-size:13px;word-break:break-all}</style><main><span class="badge">SEU APLICATIVO · EXPO GO GRATUITO</span><h1>Seu closet, no seu iPhone.</h1><p id="status" role="status">Conferindo se o aplicativo está pronto…</p>${qr}<ol><li>Deixe o iPhone e este computador no <strong>mesmo Wi-Fi</strong>.</li><li>Abra a <strong>Câmera do iPhone</strong> e aponte para este código.</li><li>Toque no aviso para abrir com o <strong>Expo Go</strong>.</li></ol><p>No primeiro acesso, o aplicativo pode levar um pouco mais de tempo para carregar.</p><p><small>Deixe este computador ligado durante o teste. Use sua conta pessoal dentro do aplicativo; não precisa enviar senhas pelo chat.</small></p><details><summary>Endereço de conexão</summary><code>${target}</code></details></main><script>async function check(){try{const response=await fetch('/status');const data=await response.json();document.getElementById('status').textContent=data.ready?'Pronto para abrir no iPhone.':'O aplicativo está iniciando. Aguarde um instante…';}catch{document.getElementById('status').textContent='O servidor local precisa ser iniciado novamente.';}}check();setInterval(check,5000);</script></html>`;
http
  .createServer(async (req, res) => {
    if (req.headers.host !== '127.0.0.1:4176') {
      res.writeHead(403);
      res.end();
      return;
    }
    if (req.url === '/status') {
      let ready = false;
      try {
        const response = await fetch('http://localhost:8081/status', {
          signal: AbortSignal.timeout(2000),
        });
        ready = (await response.text()).includes('packager-status:running');
      } catch {
        /* Expo may still be starting. */
      }
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify({ ready }));
      return;
    }
    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'Content-Security-Policy': "frame-ancestors 'none'",
    });
    res.end(page);
  })
  .listen(4176, '127.0.0.1', () => console.log(`iPhone: http://127.0.0.1:4176 | Expo: ${target}`));
