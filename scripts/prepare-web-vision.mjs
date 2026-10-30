import { copyFileSync, mkdirSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('..', import.meta.url));
const target = path.join(root, 'public/vision');
mkdirSync(target, { recursive: true });
const model = path.join(root, '.tools/models/u2netp.onnx');
if (
  createHash('md5').update(readFileSync(model)).digest('hex') !== '8e83ca70e441ab06c318d82300c84806'
)
  throw new Error('O modelo de recorte não passou na verificação de integridade.');
copyFileSync(model, path.join(target, 'u2netp.onnx'));
for (const file of ['ort.wasm.min.js', 'ort-wasm-simd-threaded.mjs', 'ort-wasm-simd-threaded.wasm'])
  copyFileSync(path.join(root, 'node_modules/onnxruntime-web/dist', file), path.join(target, file));
