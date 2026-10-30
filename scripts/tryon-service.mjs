// Local, same-origin bridge only. Never deployed as a public service.
import { Buffer } from 'node:buffer';
import { spawn } from 'node:child_process';
import { randomBytes, randomUUID } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
export function validTryOnRequest(body) {
  return (
    !!body &&
    ['tops', 'bottoms', 'one-pieces'].includes(body.category) &&
    ['person', 'garment'].every(
      (key) =>
        typeof body[key] === 'string' &&
        body[key].length >= 100 &&
        body[key].length <= 4200000 &&
        /^[A-Za-z0-9+/]+={0,2}$/.test(body[key]),
    )
  );
}
export function tryOnService(root, origin) {
  const nonce = randomBytes(24).toString('hex');
  const jobs = new Map();
  let active = null;
  const ready = () => {
    try {
      return (
        existsSync(path.join(root, '.tools/tryon/ready.json')) &&
        JSON.parse(readFileSync(path.join(root, '.tools/tryon/validation.json'), 'utf8')).usable ===
          true
      );
    } catch {
      return false;
    }
  };
  return async function handle(req, res, url) {
    if (!url.pathname.startsWith('/__tryon')) return false;
    const send = (status, data) => {
      res.writeHead(status, {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      });
      res.end(JSON.stringify(data));
      return true;
    };
    if (
      req.headers.host !== new URL(origin).host ||
      (req.headers.origin && req.headers.origin !== origin)
    )
      return send(403, { message: 'Origem não permitida.' });
    if (url.pathname === '/__tryon/status' && req.method === 'GET')
      return send(200, { ready: ready(), nonce, mode: 'local-cpu-experimental' });
    if (req.headers['x-closet-nonce'] !== nonce)
      return send(403, { message: 'Reabra o provador.' });
    const id = url.searchParams.get('id');
    if (url.pathname === '/__tryon/job' && req.method === 'GET') {
      const job = jobs.get(id);
      if (!job) return send(404, { message: 'Simulação indisponível ou expirada.' });
      if (job.result) {
        const result = job.result;
        jobs.delete(id);
        clearTimeout(job.expiry);
        return send(200, { state: 'done', ...result });
      }
      return send(200, { state: 'running' });
    }
    if (url.pathname === '/__tryon/cancel' && req.method === 'POST') {
      const job = jobs.get(id);
      if (job) {
        job.child.kill();
        clearTimeout(job.timer);
        clearTimeout(job.expiry);
        jobs.delete(id);
        if (active === id) active = null;
      }
      return send(200, { cancelled: true });
    }
    if (url.pathname !== '/__tryon/start' || req.method !== 'POST')
      return send(404, { message: 'Rota indisponível.' });
    if (!ready())
      return send(503, { message: 'A geração realista ainda não foi validada neste computador.' });
    if (active)
      return send(409, { message: 'Uma simulação já está em andamento neste computador.' });
    let bytes = 0;
    const chunks = [];
    for await (const chunk of req) {
      bytes += chunk.length;
      if (bytes > 9 * 1024 * 1024) return send(413, { message: 'Use imagens menores.' });
      chunks.push(chunk);
    }
    let body;
    try {
      body = JSON.parse(Buffer.concat(chunks).toString());
    } catch {
      return send(400, { message: 'Imagens inválidas.' });
    }
    if (!validTryOnRequest(body))
      return send(400, { message: 'Confira as imagens e a categoria.' });
    if (active) return send(409, { message: 'Uma simulação já está em andamento.' });
    const jobId = randomUUID(),
      child = spawn('python', [path.join(root, 'scripts/run-tryon.py')], {
        cwd: root,
        windowsHide: true,
        stdio: ['pipe', 'pipe', 'pipe'],
      });
    const job = { child, result: null, output: '', timer: null, expiry: null };
    jobs.set(jobId, job);
    active = jobId;
    const finish = (result) => {
      if (!jobs.has(jobId)) return;
      clearTimeout(job.timer);
      job.result = result;
      job.output = '';
      if (active === jobId) active = null;
      job.expiry = setTimeout(() => jobs.delete(jobId), 60000);
      job.expiry.unref?.();
    };
    job.timer = setTimeout(() => {
      child.kill();
      finish({ error: 'A simulação excedeu oito minutos. A foto original foi preservada.' });
    }, 480000);
    child.stdout.on('data', (chunk) => {
      job.output += chunk;
      if (job.output.length > 5000000) {
        child.kill();
        finish({ error: 'O resultado ficou muito grande.' });
      }
    });
    child.stderr.resume();
    child.on('error', () => finish({ error: 'Não foi possível iniciar o processador local.' }));
    child.on('close', (code) => {
      if (job.result) return;
      try {
        const result = JSON.parse(job.output);
        finish(
          code === 0 && result.base64 ? result : { error: result.error || 'Falha na simulação.' },
        );
      } catch {
        finish({ error: 'Não foi possível ler o resultado.' });
      }
    });
    child.stdin.on('error', () => {});
    child.stdin.end(JSON.stringify(body));
    body = null;
    return send(202, { id: jobId, state: 'running' });
  };
}
