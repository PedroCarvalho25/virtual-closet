// Local static server for browser tests and preview; never used as an app backend.
import { tryOnService } from './tryon-service.mjs';
import { fileURLToPath } from 'node:url';
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
const root = path.resolve(process.argv[2] || 'dist');
const port = Number(process.argv[3] || 4173);
const tryOn = tryOnService(fileURLToPath(new URL('..', import.meta.url)), `http://127.0.0.1:${port}`);
const mime = {
  '.html': 'text/html',
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
http
  .createServer(async (req, res) => {
    try {
      const url = new URL(req.url, `http://127.0.0.1:${port}`);
      if (await tryOn(req, res, url)) return;
      const route = decodeURIComponent(url.pathname);
      const file = path.resolve(root, `.${route}`);
      if (file !== root && !file.startsWith(`${root}${path.sep}`)) {
        res.writeHead(403);
        res.end();
        return;
      }
      let content;
      let extension = path.extname(file);
      try {
        content = await readFile(file);
      } catch {
        content = await readFile(path.join(root, 'index.html'));
        extension = '.html';
      }
      res.writeHead(200, {
        'Content-Type': mime[extension] || 'application/octet-stream',
        'Cache-Control': 'no-store',
      });
      res.end(content);
    } catch {
      res.writeHead(500);
      res.end('Preview unavailable');
    }
  })
  .listen(port, '127.0.0.1', () => console.log(`Local preview http://127.0.0.1:${port}`));
