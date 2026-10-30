"""Local CPU cutout based on U2Netp (Apache-2.0); never uploads photographs.
Inference normalization follows rembg's MIT-licensed U2netpSession.
"""
import base64
import io
import json
import sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / '.tools' / 'vision-runtime'))
import numpy as np
import onnxruntime as ort
from PIL import Image, ImageOps

def cutout(raw):
    if len(raw) > 2 * 1024 * 1024:
        raise ValueError('Image too large')
    Image.MAX_IMAGE_PIXELS = 20_000_000
    with Image.open(io.BytesIO(raw)) as source:
        if source.width * source.height > 20_000_000:
            raise ValueError('Too many pixels')
        image = ImageOps.exif_transpose(source).convert('RGB')
    if max(image.size) > 2000:
        image.thumbnail((2000, 2000))
    resized = np.array(image.resize((320, 320), Image.Resampling.LANCZOS), dtype=np.float32)
    maximum = float(resized.max())
    if maximum <= 0:
        raise ValueError('No visible object')
    resized /= maximum
    resized = (resized - np.array([.485, .456, .406], dtype=np.float32)) / np.array([.229, .224, .225], dtype=np.float32)
    tensor = resized.transpose(2, 0, 1)[None, ...].astype(np.float32)
    options = ort.SessionOptions()
    options.intra_op_num_threads = 2
    options.inter_op_num_threads = 1
    session = ort.InferenceSession(str(ROOT / '.tools' / 'models' / 'u2netp.onnx'), sess_options=options, providers=['CPUExecutionProvider'])
    pred = session.run(None, {session.get_inputs()[0].name: tensor})[0][0, 0]
    lo, hi = float(pred.min()), float(pred.max())
    if hi - lo < 1e-6:
        raise ValueError('No reliable mask')
    mask = Image.fromarray(np.clip((pred-lo)/(hi-lo)*255, 0, 255).astype(np.uint8)).resize(image.size, Image.Resampling.LANCZOS)
    # Opaque warm-white JPEG keeps the app's existing safe private-photo contract.
    result = Image.new('RGB', image.size, (250, 249, 246))
    result.paste(image, mask=mask)
    output = io.BytesIO()
    result.save(output, format='JPEG', quality=90, optimize=True)
    return output.getvalue()

if __name__ == '__main__':
    try:
        request = sys.stdin.buffer.read(3 * 1024 * 1024 + 1)
        if len(request) > 3 * 1024 * 1024:
            raise ValueError('Request too large')
        payload = json.loads(request)
        result = cutout(base64.b64decode(payload['base64'], validate=True))
        print(json.dumps({'base64': base64.b64encode(result).decode()}))
    except Exception:
        print(json.dumps({'error': 'Não foi possível recortar esta foto. O original foi preservado; tente uma foto da peça sozinha.'}))
        sys.exit(1)
