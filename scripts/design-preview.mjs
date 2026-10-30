import { wishesSetup, wishesSql } from './wishes-setup.mjs';
import { tryOnService } from './tryon-service.mjs';
import { atelierSetup, atelierSql } from './atelier-setup.mjs';
import { personalizationMigration, personalizationSetup } from './personalization-setup.mjs';
// Local design preview and setup assistant. Never deployed or imported by the app.
import http from 'node:http';
import { Buffer } from 'node:buffer';
import { readFile, writeFile, rename } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createPreviewData, demoSession, demoUserId } from './preview-fixtures.mjs';
import { validSupabaseConfig } from '../src/lib/config.ts';
import { cutoutLocal, visionReady } from './local-vision.mjs';
import { presentation, presentationSteps } from './presentation.mjs';
import { identityFiles, identitySetup } from './identity-setup.mjs';
import { muralMigration, muralSetup } from './mural-setup.mjs';

const project = fileURLToPath(new URL('..', import.meta.url));
const root = path.resolve(project, process.argv[3] || '.tools/web-test');
const port = Number(process.argv[2] || 4175);
const origin = `http://127.0.0.1:${port}`;
const tryOn = tryOnService(project, origin);
const nonce = randomBytes(24).toString('hex');
let generation = randomBytes(12).toString('hex');
let fixture = createPreviewData({ showcase: true, socialFriends: true });
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.wasm': 'application/wasm',
  '.webmanifest': 'application/manifest+json',
  '.css': 'text/css',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf',
  '.woff2': 'font/woff2',
  '.json': 'application/json',
  '.ico': 'image/x-icon',
};
const style = `*{box-sizing:border-box}body{margin:0;background:#eceee6;color:#292d25;font:15px/1.6 system-ui,sans-serif}a{color:#41573c}h1{font-size:28px;letter-spacing:-1px;line-height:1.15;margin:12px 0}h2{font-size:18px}p{color:#646b5e}button,.button{font:inherit;font-weight:600;background:#41573c;color:white;border:0;border-radius:14px;padding:12px 18px;cursor:pointer;text-decoration:none;display:inline-block}button:disabled{opacity:.6;cursor:wait}.secondary{background:#fff;color:#41573c;border:1px solid #d8ddcf}input,textarea{font:inherit;width:100%;padding:12px;border:1px solid #cbd1c2;border-radius:12px;background:#fff;color:#292d25}label{display:block;margin:20px 0 6px;font-weight:600}.badge{display:inline-block;font-size:11px;letter-spacing:.6px;background:#e7edb8;border-radius:20px;padding:6px 12px;font-weight:700}.layout{display:flex;gap:64px;align-items:center;justify-content:center;min-height:100vh;padding:28px}.intro{max-width:320px}.phone{width:390px;height:min(844px,calc(100vh - 56px));min-height:600px;background:#faf9f6;border:7px solid #fff;border-radius:36px;overflow:hidden;box-shadow:0 20px 70px #29352618}iframe{border:0;width:100%;height:100%;background:#faf9f6}.panel{max-width:660px;background:#faf9f6;border-radius:28px;margin:36px auto;padding:32px}.steps{margin:24px 0;padding:20px;background:#fff;border-radius:18px}.status{white-space:pre-wrap;padding:12px 0;font-weight:500}.error{color:#9e342d}.actions{display:flex;gap:10px;flex-wrap:wrap;margin:20px 0}small{color:#73786c}details{margin:20px 0}summary{cursor:pointer;font-weight:600}@media(max-width:760px){.layout{display:block;padding:16px}.intro{max-width:420px;margin:0 auto 20px}.intro h1{font-size:22px}.intro p{margin:10px 0}.phone{width:100%;max-width:420px;height:780px;min-height:560px;margin:auto}.panel{margin:12px;padding:22px}}`;
function html(title, content, script = '') {
  return `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} · Virtual Closet</title><style>${style}</style><body>${content}${script ? `<script>${script}</script>` : ''}</body></html>`;
}
function seed() {
  return `if(localStorage.getItem('virtual-closet-preview-generation')!==${JSON.stringify(generation)}){for(const key of ['virtual-closet-auth-v1','virtual-closet-signed-out-v1','virtual-closet-cache-v1:${demoUserId}'])localStorage.removeItem(key);localStorage.setItem('virtual-closet-auth-v1',${JSON.stringify(JSON.stringify(demoSession()))});localStorage.setItem('virtual-closet-preview-generation',${JSON.stringify(generation)});}`;
}
const preview = () => {
  const { body, script } = presentation(nonce);
  return html('Prévia interativa', body, script);
};
const connect = () =>
  html(
    'Conectar meu closet',
    `<main class="panel"><span class="badge">CONFIGURAÇÃO GRATUITA · NESTE COMPUTADOR</span><h1>Vamos conectar seu closet.</h1><p>Você faz a entrada na sua conta diretamente no Supabase. Aqui, precisamos apenas de dois dados públicos do projeto.</p><details><summary>1. Preparar o banco de dados</summary><p>No Supabase, abra <strong>SQL Editor → New query</strong>. Copie o código abaixo, cole na consulta e clique em <strong>Run</strong> uma única vez, em um projeto novo.</p><button class="secondary" id="copy">Copiar código do banco</button><p id="copied" role="status"></p></details><details><summary>2. Preparar confirmação por e-mail</summary><p>Em <strong>Authentication → Sign In / Providers → User Signups</strong>, ative <strong>Confirm email</strong> e salve. A versão atual confirma o cadastro e os aparelhos novos. Veja os modelos de e-mail e a migração de identidade em <a href="/identity-setup">Preparar perfil e acesso</a>.</p></details><form id="connection"><h2>3. Conectar o aplicativo</h2><p>No Supabase, abra <strong>Connect → Framework</strong> e clique em <strong>Copy prompt</strong>, à direita de “Follow these steps”. Cole o texto inteiro abaixo. Vamos encontrar a URL e a chave pública para você.</p><label for="snippet">Cole aqui o texto copiado do Supabase</label><textarea id="snippet" name="snippet" rows="7" placeholder="Clique aqui e pressione Ctrl+V" autocomplete="off" spellcheck="false"></textarea><details><summary>Prefiro preencher os dois campos manualmente</summary><label for="url">Project URL</label><input id="url" name="url" type="url" placeholder="https://seu-projeto.supabase.co" autocomplete="off"><label for="key">Publishable key (chave pública)</label><input id="key" name="key" placeholder="sb_publishable_..." autocomplete="off" spellcheck="false"></details><p><small>Use o texto da opção Framework. Não precisamos da sua senha do banco.</small></p><button type="submit" id="save">Conectar meu projeto</button><div id="status" class="status" role="status" aria-live="polite"></div></form><a href="/preview">← Voltar à prévia com exemplos</a></main>`,
    `document.getElementById('copy').onclick=async()=>{const el=document.getElementById('copied');try{await navigator.clipboard.writeText(await(await fetch('/__migration')).text());el.textContent='Código copiado. Cole no SQL Editor e clique em Run.';}catch{el.textContent='Abra o arquivo supabase/migrations/202610050001_initial.sql na pasta do projeto e copie seu conteúdo.';}};document.getElementById('connection').onsubmit=async(event)=>{event.preventDefault();const button=document.getElementById('save'),status=document.getElementById('status');button.disabled=true;status.className='status';status.textContent='Verificando a conexão…';try{const response=await fetch('/__connect',{method:'POST',headers:{'Content-Type':'application/json','X-Closet-Nonce':'${nonce}'},body:JSON.stringify({snippet:document.getElementById('snippet').value,url:document.getElementById('url').value,key:document.getElementById('key').value})});const result=await response.json();status.textContent=result.message;if(!response.ok)status.className='status error';else {document.getElementById('key').value='';document.getElementById('snippet').value='';}}catch{status.className='status error';status.textContent='Não foi possível conectar. Confira se a tela local continua aberta e tente novamente.';}finally{button.disabled=false;}};`,
  );
const upgrade = () =>
  html(
    'Atualizar meu closet',
    `<main class="panel"><span class="badge">ATUALIZAÇÃO GRATUITA · SEU PROJETO ATUAL</span><h1>Mais possibilidades no seu closet.</h1><p>Esta atualização adiciona preferências, inspirações, viagens e círculos ao banco que você já criou. Suas peças, fotos e looks são preservados.</p><div class="steps"><h2>1. Copie a atualização</h2><button id="copy-upgrade">Copiar atualização</button><p id="copy-status" role="status"></p><h2>2. Abra seu projeto no Supabase</h2><p>No menu da esquerda, clique em <strong>SQL Editor</strong>. Abra uma consulta vazia pelo <strong>+</strong> ou <strong>New query</strong>.</p><h2>3. Cole e execute</h2><p>Pressione <strong>Ctrl+V</strong> e depois clique em <strong>Run</strong>. Execute uma única vez. Se aparecer <strong>Success. No rows returned</strong>, a atualização terminou.</p></div><p>Este código inclui apenas as duas migrações novas. Não execute novamente o código inicial do banco.</p><details><summary>Ver o código antes de copiar</summary><textarea id="sql-review" readonly rows="12" aria-label="SQL da atualização"></textarea></details><p>A prévia continua usando exemplos. Para testar sua conta real, abra o aplicativo pelo Expo Go após esta atualização.</p><a href="/preview">← Voltar à prévia</a></main>`,
    `let sql='';fetch('/__upgrade-migration').then(r=>{if(!r.ok)throw Error();return r.text()}).then(value=>{sql=value;document.getElementById('sql-review').value=value}).catch(()=>document.getElementById('copy-status').textContent='Não foi possível carregar. Reabra esta página.');document.getElementById('copy-upgrade').onclick=async()=>{const el=document.getElementById('copy-status');try{if(!sql)throw Error();await navigator.clipboard.writeText(sql);el.textContent='Atualização copiada. Agora siga o passo 2.'}catch{el.textContent='Abra Ver o código, selecione o texto com Ctrl+A e copie com Ctrl+C.'}};`,
  );
async function readBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 13 * 1024 * 1024) throw new Error('BODY_LIMIT');
    chunks.push(chunk);
  }
  const data = Buffer.concat(chunks);
  return String(req.headers['content-type']).includes('application/json')
    ? JSON.parse(data.toString() || '{}')
    : data;
}
http
  .createServer(async (req, res) => {
    const send = (status, content, type = 'application/json') => {
      res.writeHead(status, {
        'Content-Type': type,
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'no-referrer',
        'Content-Security-Policy': "frame-ancestors 'self'",
      });
      res.end(type.startsWith('application/json') ? JSON.stringify(content) : content);
    };
    try {
      if (req.headers.host !== `127.0.0.1:${port}`)
        return send(403, { message: 'Use o endereço local 127.0.0.1.' });
      if (req.headers.origin && req.headers.origin !== origin)
        return send(403, { message: 'Origem não permitida.' });
      const url = new URL(req.url, origin);
      if (await tryOn(req, res, url)) return;
      if (url.pathname === '/wishes-setup') {
        const { body, script } = wishesSetup();
        return send(200, html('Ativar desejos visuais', body, script), 'text/html; charset=utf-8');
      }
      if (url.pathname === '/__wishes-sql') return send(200, wishesSql(project), 'text/plain; charset=utf-8');
      if (url.pathname === '/atelier-setup') {
        const { body, script } = atelierSetup();
        return send(200, html('Preparar ateliê',body,script),'text/html; charset=utf-8');
      }
      if (url.pathname === '/__atelier-sql') return send(200,atelierSql(project),'text/plain; charset=utf-8');
      if (url.pathname === '/__image-tools' && req.method === 'GET')
        return send(200, { ready: visionReady(project), nonce });
      if (url.pathname === '/__cutout') {
        if (req.method !== 'POST' || req.headers['x-closet-nonce'] !== nonce)
          return send(403, { message: 'Reabra a prévia e tente novamente.' });
        try {
          const body = await readBody(req);
          return send(200, await cutoutLocal(project, body.base64));
        } catch (error) {
          return send(400, { message: error.message });
        }
      }
      if (url.pathname === '/__health')
        return send(200, { app: 'virtual-closet-preview', version: 'presentation-2026-10-09' });
      if (url.pathname === '/preview') return send(200, preview(), 'text/html; charset=utf-8');
      if (url.pathname === '/identity-setup') {
        const { body, script } = identitySetup();
        return send(
          200,
          html('Preparar perfil e acesso', body, script),
          'text/html; charset=utf-8',
        );
      }
      if (url.pathname === '/personalization-setup') {
        const { body, script } = personalizationSetup();
        return send(200, html('Atualizar Virtual Closet', body, script), 'text/html; charset=utf-8');
      }
      if (url.pathname === '/__personalization-sql') {
        return send(200, await readFile(path.join(project, personalizationMigration)), 'text/plain; charset=utf-8');
      }
      if (url.pathname === '/mural-setup') {
        const { body, script } = muralSetup();
        return send(200, html('Ativar mural', body, script), 'text/html; charset=utf-8');
      }
      if (url.pathname === '/__mural-sql') {
        return send(200, await readFile(path.join(project, muralMigration)), 'text/plain; charset=utf-8');
      }
      if (url.pathname === '/__identity-file') {
        const name = url.searchParams.get('name');
        const file = Object.hasOwn(identityFiles, name) ? identityFiles[name] : null;
        if (!file) return send(404, { message: 'Arquivo não encontrado.' });
        return send(
          200,
          await readFile(path.join(project, file), 'utf8'),
          'text/plain; charset=utf-8',
        );
      }
      if (url.pathname === '/upgrade') return send(200, upgrade(), 'text/html; charset=utf-8');
      if (url.pathname === '/__upgrade-migration') {
        const migrations = [];
        for (const filename of [
          '202610090001_style_studio.sql',
          '202610090002_style_circles.sql',
        ]) {
          const sql = await readFile(path.join(project, 'supabase/migrations', filename), 'utf8');
          migrations.push(sql.replace(/^begin;\s*$/gm, '').replace(/^commit;\s*$/gm, ''));
        }
        return send(
          200,
          `-- Atualizacao incremental: executar uma vez no projeto existente.\nbegin;\n${migrations.join('\n')}\ncommit;\n`,
          'text/plain; charset=utf-8',
        );
      }
      if (url.pathname === '/connect') return send(200, connect(), 'text/html; charset=utf-8');
      if (url.pathname === '/__migration')
        return send(
          200,
          await readFile(path.join(project, 'supabase/migrations/202610050001_initial.sql')),
          'text/plain; charset=utf-8',
        );
      if (url.pathname === '/__reset' || url.pathname === '/__connect') {
        if (req.method !== 'POST' || req.headers['x-closet-nonce'] !== nonce)
          return send(403, { message: 'Reabra a tela de configuração e tente novamente.' });
        const body = await readBody(req);
        if (url.pathname === '/__reset') {
          fixture = createPreviewData({
            showcase: body.showcase === true,
            showcaseAccount: body.showcaseAccount === true,
            empty: body.empty === true,
            needsVerification: body.needsVerification === true,
            socialFriends: body.socialFriends === true || body.showcase === true,
          });
          generation = randomBytes(12).toString('hex');
          return send(200, { ok: true });
        }
        // Pasted setup instructions are treated only as text. Never execute them.
        const snippet = typeof body.snippet === 'string' ? body.snippet : '';
        const pastedUrl = snippet.match(
          /SUPABASE_URL\s*=\s*["']?(https:\/\/[a-z0-9-]+\.supabase\.co)/i,
        )?.[1];
        const pastedKey = snippet.match(
          /SUPABASE_(?:PUBLISHABLE_KEY|ANON_KEY)\s*=\s*["']?([A-Za-z0-9_.-]+)/,
        )?.[1];
        const projectUrl = String(pastedUrl || body.url || '')
          .trim()
          .replace(/\/$/, '');
        const key = String(pastedKey || body.key || '').trim();
        if (
          !validSupabaseConfig(projectUrl, key) ||
          /[\r\n\s"'`#$\\]/.test(key) ||
          projectUrl.includes('closet-test')
        )
          return send(400, {
            message:
              'Não encontrei uma URL e uma chave pública válidas. Copie o texto de Connect → Framework → Copy prompt e cole o conteúdo inteiro. Senhas e chaves secretas não são aceitas.',
          });
        let response;
        try {
          response = await fetch(`${projectUrl}/auth/v1/settings`, {
            headers: { apikey: key },
            signal: AbortSignal.timeout(12000),
            redirect: 'error',
          });
        } catch {
          return send(400, {
            message:
              'Não consegui alcançar esse projeto. Confira a URL, sua internet e se o projeto terminou de iniciar.',
          });
        }
        if (!response.ok)
          return send(400, {
            message:
              'O Supabase não aceitou essa chave. Copie a Publishable key do mesmo projeto e tente novamente.',
          });
        const settings = await response.json();
        const envPath = path.join(project, '.env.local');
        let old = '';
        try {
          old = await readFile(envPath, 'utf8');
        } catch (error) {
          if (error.code !== 'ENOENT') throw error;
        }
        const preserved = old
          .split(/\r?\n/)
          .filter((line) => !/^\s*EXPO_PUBLIC_SUPABASE_(URL|PUBLISHABLE_KEY)\s*=/.test(line))
          .join('\n')
          .trim();
        const env = `${preserved ? `${preserved}\n` : ''}EXPO_PUBLIC_SUPABASE_URL=${projectUrl}\nEXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=${key}\n`;
        const temp = `${envPath}.${nonce}.tmp`;
        await writeFile(temp, env, { mode: 0o600 });
        await rename(temp, envPath);
        console.log('Configuração pública salva em .env.local. Reinicie o Expo para aplicar.');
        return send(200, {
          message: `Projeto conectado e configuração salva neste computador. Avise no chat que a conexão foi concluída para abrirmos no iPhone.${settings.mailer_autoconfirm ? ' Ative Confirm email e prepare os modelos em /identity-setup para usar a nova verificação.' : ' Prepare os modelos e o envio em /identity-setup para confirmar cadastro e aparelhos.'}`,
        });
      }
      if (url.pathname === '/preview-sw.js')
        return send(
          200,
          await readFile(path.join(project, 'scripts/preview-sw.js')),
          'text/javascript',
        );
      if (url.pathname === '/preview-app')
        return send(
          200,
          html(
            'Abrindo a prévia',
            '<p style="padding:24px" id="message">Abrindo seu closet de exemplo…</p>',
            `${seed()}(async()=>{try{await navigator.serviceWorker.register('/preview-sw.js',{scope:'/'});await navigator.serviceWorker.ready;if(!navigator.serviceWorker.controller)await new Promise(resolve=>navigator.serviceWorker.addEventListener('controllerchange',resolve,{once:true}));location.replace(${JSON.stringify(url.searchParams.get('start') === 'account' ? '/account' : url.searchParams.get('start') === 'wardrobe' ? '/wardrobe' : presentationSteps.some(([view]) => view === url.searchParams.get('view') && view !== 'discover') ? '/style?view=' + url.searchParams.get('view') : '/discover')});}catch{document.getElementById('message').textContent='Não foi possível abrir a prévia. Use o Edge ou Chrome neste computador.';}})();`,
          ),
          'text/html; charset=utf-8',
        );
      if (url.pathname.startsWith('/__fixture/')) {
        url.pathname = url.pathname.replace('/__fixture', '');
        const body = ['GET', 'HEAD'].includes(req.method) ? null : await readBody(req);
        const result = await fixture.handle(url, req.method, body, req.headers);
        if (result.photo) {
          const photo =
            result.photo.buffer ||
            (await readFile(
              result.photo.muralFile
                ? path.join(project, 'assets/mural', result.photo.muralFile)
                : path.join(project, 'docs/preview-assets', result.photo.file),
            ));
          return send(200, photo, 'image/jpeg');
        }
        return send(result.status, result.data ?? null);
      }
      const file = path.resolve(root, `.${decodeURIComponent(url.pathname)}`);
      if (file !== root && !file.startsWith(`${root}${path.sep}`)) return send(403, {});
      let content,
        extension = path.extname(file);
      try {
        content = await readFile(file);
      } catch {
        content = await readFile(path.join(root, 'index.html'));
        extension = '.html';
      }
      if (extension === '.html')
        content = content.toString().replace('</head>', `<script>${seed()}</script></head>`);
      send(
        200,
        extension === '.json' ? JSON.parse(content.toString()) : content,
        mime[extension] || 'application/octet-stream',
      );
    } catch (error) {
      send(error.message === 'BODY_LIMIT' ? 413 : 500, {
        message: 'Não foi possível concluir. Confira os dados e tente novamente.',
      });
    }
  })
  .listen(port, '127.0.0.1', () =>
    console.log(`Prévia: ${origin}/preview\nConfiguração: ${origin}/connect`),
  );
