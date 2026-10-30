import { afterAll, beforeAll, expect, it } from 'vitest';
import http from 'node:http';
import path from 'node:path';
import { tryOnService, validTryOnRequest } from '../scripts/tryon-service.mjs';
let server, origin;
beforeAll(async () => {
  server = http.createServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
  const handler = tryOnService(path.resolve('.tools/nonexistent-validation-runtime'), origin);
  server.on('request', (req, res) => void handler(req, res, new URL(req.url, origin)));
});
afterAll(async () => {
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
});
it('requires same-origin nonce and actual runtime validation before receiving images', async () => {
  expect(
    (await fetch(origin + '/__tryon/status', { headers: { Origin: 'https://another.example' } }))
      .status,
  ).toBe(403);
  const status = await (await fetch(origin + '/__tryon/status')).json();
  expect(status.ready).toBe(false);
  expect((await fetch(origin + '/__tryon/start', { method: 'POST' })).status).toBe(403);
  expect(
    (
      await fetch(origin + '/__tryon/start', {
        method: 'POST',
        headers: { 'X-Closet-Nonce': status.nonce },
      })
    ).status,
  ).toBe(503);
});
it('bounds image data and accepts only supported garment categories', () => {
  const sample = { person: 'A'.repeat(100), garment: 'A'.repeat(100), category: 'tops' };
  expect(validTryOnRequest(sample)).toBe(true);
  expect(validTryOnRequest({ ...sample, person: 'https://external.example/photo' })).toBe(false);
  expect(validTryOnRequest({ ...sample, person: 'A'.repeat(4200001) })).toBe(false);
  expect(validTryOnRequest({ ...sample, category: 'unknown' })).toBe(false);
});
