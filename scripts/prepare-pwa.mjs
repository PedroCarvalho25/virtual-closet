import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
export function preparePwa(output, mode, builtAt) {
  const shell = [
    '/index.html',
    ...readdirSync(path.join(output, '_expo/static'), { recursive: true })
      .filter((file) => /\.(js|css)$/.test(String(file)))
      .map((file) => '/_expo/static/' + String(file).replaceAll('\\', '/')),
  ];
  const sw = `const CACHE=${JSON.stringify(`virtual-closet-shell-${mode}-${builtAt}`)};
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(${JSON.stringify(shell)}))));
self.addEventListener('message',event=>{if(event.data?.type==='ACTIVATE_UPDATE')self.skipWaiting();});
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('virtual-closet-shell-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);
 if(request.method!=='GET'||url.origin!==self.location.origin)return;
 if(request.mode==='navigate') { event.respondWith(fetch(request).catch(()=>caches.open(CACHE).then(cache=>cache.match('/index.html'))));return; }
 const asset=url.pathname.startsWith('/_expo/static/')||url.pathname.startsWith('/assets/')||url.pathname.startsWith('/vision/');
 if(!asset||url.search)return;
 event.respondWith(caches.open(CACHE).then(async cache=>{const old=await cache.match(request);if(old)return old;const response=await fetch(request);if(response.ok&&response.type==='basic')await cache.put(request,response.clone());return response;}));
});`;
  writeFileSync(path.join(output, 'sw.js'), sw);
  const file = path.join(output, 'index.html');
  let html = readFileSync(file, 'utf8');
  html = html
    .replace(
      /<html([^>]*)>/,
      (_, attrs) => '<html' + attrs.replace(/\s+lang="[^"]*"/g, '') + ' lang="pt-BR">',
    )
    .replace(
      '</head>',
      '<link rel="manifest" href="/manifest.webmanifest"><link rel="apple-touch-icon" href="/pwa/icon-192.png"><meta name="theme-color" content="#FEEECE"><meta name="apple-mobile-web-app-capable" content="yes"></head>',
    );
  writeFileSync(file, html);
}
