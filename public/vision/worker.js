/* Local worker; no photographs leave the device. U2Netp Apache-2.0 / ONNX Runtime MIT. */
/* global ort, importScripts */
importScripts('/vision/ort.wasm.min.js');
ort.env.wasm.wasmPaths = '/vision/';
ort.env.wasm.numThreads = 1;
ort.env.wasm.proxy = false;
self.onmessage = async event => {
  try {
    const pixels = new Uint8ClampedArray(event.data.pixels);
    let max = 0;
    for (let i = 0; i < pixels.length; i++) if (i % 4 !== 3) max = Math.max(max, pixels[i]);
    if (!max) throw new Error('No visible object');
    const input = new Float32Array(3*320*320), means = [.485,.456,.406], std = [.229,.224,.225];
    for (let i = 0; i < 320*320; i++) for (let c = 0; c < 3; c++) input[c*320*320+i] = (pixels[i*4+c]/max-means[c])/std[c];
    const session = await ort.InferenceSession.create('/vision/u2netp.onnx', { executionProviders: ['wasm'], graphOptimizationLevel: 'all' });
    const output = await session.run({ [session.inputNames[0]]: new ort.Tensor('float32', input, [1,3,320,320]) });
    const pred = output[session.outputNames[0]].data;
    let low = Infinity, high = -Infinity;
    for (const v of pred) { low = Math.min(low, v); high = Math.max(high, v); }
    if (high-low < 0.000001) throw new Error('No reliable mask');
    const mask = Uint8ClampedArray.from(pred, v => (v-low)/(high-low)*255);
    await session.release(); self.postMessage({ mask: mask.buffer }, [mask.buffer]);
  } catch { self.postMessage({ error: 'Não foi possível separar o fundo. Tente uma foto da peça sozinha.' }); }
};
