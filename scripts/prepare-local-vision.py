"""One-time free local model setup. No personal photos are read or transmitted."""
import hashlib
import subprocess
import sys
import urllib.request
from pathlib import Path
root = Path(__file__).resolve().parents[1]
runtime = root / '.tools' / 'vision-runtime'
models = root / '.tools' / 'models'
runtime.mkdir(parents=True, exist_ok=True)
models.mkdir(parents=True, exist_ok=True)
subprocess.run([sys.executable, '-m', 'pip', 'install', '--target', str(runtime), 'onnxruntime', 'numpy', 'Pillow'], check=True, timeout=240)
url = 'https://github.com/danielgatis/rembg/releases/download/v0.0.0/u2netp.onnx'
data = urllib.request.urlopen(url, timeout=45).read(8*1024*1024)
if hashlib.md5(data).hexdigest() != '8e83ca70e441ab06c318d82300c84806':
    raise RuntimeError('The model checksum did not match; nothing was activated.')
(models / 'u2netp.onnx').write_bytes(data)
print('LOCAL_VISION_READY')
