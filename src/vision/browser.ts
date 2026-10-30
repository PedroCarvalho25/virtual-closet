// Browser-only primitives are called only behind a Platform.OS === 'web' guard.
export async function loadImage(uri: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    const timeout = setTimeout(() => {
      image.src = '';
      reject(new Error('A foto demorou para carregar.'));
    }, 20000);
    image.onload = () => {
      clearTimeout(timeout);
      resolve(image);
    };
    image.onerror = () => {
      clearTimeout(timeout);
      reject(new Error('Não foi possível preparar esta imagem.'));
    };
    image.src = uri;
  });
}
export function canvasFor(width: number, height: number) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Este navegador não oferece edição de imagens.');
  return { canvas, context };
}
export async function cutoutOnDevice(uri: string, transparent = false): Promise<string> {
  const image = await loadImage(uri),
    small = canvasFor(320, 320);
  small.context.drawImage(image, 0, 0, 320, 320);
  const pixels = small.context.getImageData(0, 0, 320, 320).data;
  const mask = await new Promise<Uint8ClampedArray>((resolve, reject) => {
    const worker = new Worker('/vision/worker.js');
    const timer = setTimeout(() => {
      worker.terminate();
      reject(
        new Error('O recorte demorou demais neste aparelho. Sua foto original está preservada.'),
      );
    }, 45000);
    worker.onerror = () => {
      clearTimeout(timer);
      worker.terminate();
      reject(new Error('O recortador não está disponível neste navegador.'));
    };
    worker.onmessage = (event) => {
      clearTimeout(timer);
      worker.terminate();
      if (event.data.error) reject(new Error(event.data.error));
      else resolve(new Uint8ClampedArray(event.data.mask));
    };
    worker.postMessage({ pixels: pixels.buffer }, [pixels.buffer]);
  });
  const matte = small.context.createImageData(320, 320);
  for (let i = 0; i < mask.length; i++) {
    matte.data[i * 4] = 255;
    matte.data[i * 4 + 1] = 255;
    matte.data[i * 4 + 2] = 255;
    matte.data[i * 4 + 3] = mask[i]!;
  }
  small.context.putImageData(matte, 0, 0);
  const ratio = Math.min(1, 1400 / Math.max(image.width, image.height)),
    width = Math.round(image.width * ratio),
    height = Math.round(image.height * ratio);
  const result = canvasFor(width, height);
  result.context.drawImage(image, 0, 0, width, height);
  result.context.globalCompositeOperation = 'destination-in';
  result.context.drawImage(small.canvas, 0, 0, width, height);
  result.context.globalCompositeOperation = 'destination-over';
  if (!transparent) {
    result.context.fillStyle = '#FAF9F6';
    result.context.fillRect(0, 0, width, height);
  }
  return result.canvas.toDataURL(transparent ? 'image/png' : 'image/jpeg', 0.9);
}
export async function polygonCutout(
  uri: string,
  points: { x: number; y: number }[],
): Promise<string> {
  if (points.length < 3) throw new Error('Marque ao menos três pontos em volta da peça.');
  const image = await loadImage(uri);
  const left = Math.max(0, Math.min(...points.map((p) => p.x))),
    top = Math.max(0, Math.min(...points.map((p) => p.y)));
  const right = Math.min(1, Math.max(...points.map((p) => p.x))),
    bottom = Math.min(1, Math.max(...points.map((p) => p.y)));
  if (right - left < 0.04 || bottom - top < 0.04)
    throw new Error('Selecione uma área maior da roupa.');
  const result = canvasFor(
    Math.round((right - left) * image.width),
    Math.round((bottom - top) * image.height),
  );
  result.context.beginPath();
  points.forEach((p, i) => {
    const x = (p.x - left) * image.width,
      y = (p.y - top) * image.height;
    if (i) result.context.lineTo(x, y);
    else result.context.moveTo(x, y);
  });
  result.context.closePath();
  result.context.clip();
  result.context.drawImage(image, -left * image.width, -top * image.height);
  return result.canvas.toDataURL('image/png');
}
