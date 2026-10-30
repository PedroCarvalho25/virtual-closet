import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
let busy = false;
export function visionReady(root) {
  return existsSync(path.join(root, '.tools/models/u2netp.onnx'));
}
export async function cutoutLocal(root, base64) {
  if (!visionReady(root)) throw new Error('O recortador local ainda não foi preparado.');
  if (busy) throw new Error('Outra foto está sendo preparada. Tente novamente em alguns segundos.');
  if (
    typeof base64 !== 'string' ||
    base64.length > 2800000 ||
    !/^[A-Za-z0-9+/]*={0,2}$/.test(base64)
  )
    throw new Error('Escolha uma foto menor para continuar.');
  busy = true;
  try {
    return await new Promise((resolve, reject) => {
      const child = spawn('python', [path.join(root, 'scripts/remove-background.py')], {
        cwd: root,
        windowsHide: true,
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      let output = '';
      const timer = setTimeout(() => {
        child.kill();
        reject(new Error('O recorte demorou demais. O original continua preservado.'));
      }, 30000);
      child.on('error', () => {
        clearTimeout(timer);
        reject(new Error('Não foi possível iniciar o recortador local.'));
      });
      child.stdout.on('data', (chunk) => {
        output += chunk;
        if (output.length > 3500000) {
          child.kill();
          reject(new Error('A imagem ficou muito grande.'));
        }
      });
      child.stderr.resume();
      child.on('close', (code) => {
        clearTimeout(timer);
        try {
          const result = JSON.parse(output);
          if (code !== 0 || !result.base64)
            reject(new Error(result.error || 'Não foi possível recortar a foto.'));
          else resolve(result);
        } catch {
          reject(new Error('Não foi possível recortar esta foto. O original foi preservado.'));
        }
      });
      child.stdin.on('error', () => {});
      child.stdin.end(JSON.stringify({ base64 }));
    });
  } finally {
    busy = false;
  }
}
