"""Prepare an isolated, local-only research runtime. No user images are downloaded or uploaded.

FASHN VTON Apache-2.0 at an immutable commit, with automatic human parsing removed.
Only a manually isolated garment and segmentation-free person conditioning are supported.
No SegFormer / fashn-human-parser package or weights are installed.
"""
import hashlib
import io
import json
import os
import subprocess
import sys
import urllib.request
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WORK = ROOT / '.tools' / 'tryon'
SOURCE = WORK / 'source'
COMMIT = '7c0f10af3f91ad4048fe9729c470a13ef905d25a'
MODELS = {
 'model.safetensors': ('fashn-ai/fashn-vton-1.5', '7720683168567eb5a2a4c67f15116c6e29c83ded', 'model.safetensors'),
 'dwpose/yolox_l.onnx': ('fashn-ai/DWPose', '548b5df25b84d9f4aac0611dfa1c2a7a12f15571', 'yolox_l.onnx'),
 'dwpose/dw-ll_ucoco_384.onnx': ('fashn-ai/DWPose', '548b5df25b84d9f4aac0611dfa1c2a7a12f15571', 'dw-ll_ucoco_384.onnx'),
}

def request(url):
 return urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'VirtualCloset-LocalResearch/1.0'}), timeout=40)

def prepare_source():
 SOURCE.mkdir(parents=True, exist_ok=True)
 with request(f'https://api.github.com/repos/fashn-AI/fashn-vton-1.5/zipball/{COMMIT}') as response:
  archive = zipfile.ZipFile(io.BytesIO(response.read(15 * 1024 * 1024)))
 for member in archive.infolist():
  parts = Path(member.filename).parts[1:]
  if not parts or member.is_dir() or not (parts[0] == 'src' or parts == ('LICENSE',)):
   continue
  target = (SOURCE / Path(*parts)).resolve()
  if not target.is_relative_to(SOURCE.resolve()): raise ValueError('Unsafe archive path')
  target.parent.mkdir(parents=True, exist_ok=True);target.write_bytes(archive.read(member))
 pipeline = SOURCE / 'src/fashn_vton/pipeline.py'
 text = pipeline.read_text(encoding='utf-8')
 text = text.replace('from fashn_human_parser import CATEGORY_TO_BODY_COVERAGE, FashnHumanParser\n','')
 for line in ['    BODY_COVERAGE_TO_FASHN_LABELS,\n','    FASHN_LABELS_TO_IDS,\n','    create_clothing_agnostic_image,\n','    create_garment_image,\n','        self._setup_hp_model()\n']:
  text = text.replace(line,'')
 start = text.index('    def _setup_hp_model(');end = text.index('    @torch.inference_mode()',start)
 text = text[:start] + text[end:]
 start = text.index('        # Human parsing');end = text.index('        # Resize/pad',start)
 text = text[:start] + '''        # Virtual Closet: the garment was manually isolated by its owner.
        # No human-parser model is loaded, downloaded, or called.
        if not segmentation_free or garment_photo_type != "flat-lay":
            raise ValueError("Only manually isolated garments are supported")
        ca_image = person_image_np.copy()
        garment_image_processed = garment_image_np.copy()

''' + text[end:]
 pipeline.write_text(text, encoding='utf-8')
 (SOURCE / 'src/fashn_vton/preprocessing/__init__.py').write_text('from .transforms import AspectPreserveResize, ResizePad\n',encoding='utf-8')
 (ROOT / 'licenses').mkdir(exist_ok=True)
 (ROOT / 'licenses/FASHN-VTON-APACHE-2.0.txt').write_bytes((SOURCE / 'LICENSE').read_bytes())

def main():
 WORK.mkdir(parents=True,exist_ok=True)
 prepare_source()
 executable = WORK / 'env/Scripts/python.exe' if os.name == 'nt' else WORK / 'env/bin/python'
 if not executable.exists(): subprocess.run([sys.executable,'-m','venv',str(WORK/'env')],check=True,timeout=90)
 subprocess.run([str(executable),'-m','pip','install','--disable-pip-version-check','--timeout','30','--retries','0',
  'torch','torchvision','onnxruntime','opencv-python','pillow','einops','safetensors','tqdm','matplotlib'],check=True,timeout=600)
 hashes={}
 for relative,(repo,revision,name) in MODELS.items():
  target = WORK/'weights'/relative;target.parent.mkdir(parents=True,exist_ok=True)
  if not target.exists():
   print('Downloading model file: '+relative,flush=True)
   temporary=target.with_suffix(target.suffix+'.partial')
   with request(f'https://huggingface.co/{repo}/resolve/{revision}/{name}') as response, temporary.open('wb') as output:
    expected=int(response.headers.get('Content-Length','0'));total=0
    while chunk:=response.read(1024*1024):
     output.write(chunk);total+=len(chunk)
     if total%(64*1024*1024)==0: print(f'{relative}: {total//(1024*1024)} MB',flush=True)
   if expected and total!=expected: raise ValueError('Incomplete model file')
   temporary.replace(target)
  digest=hashlib.sha256()
  with target.open('rb') as handle:
   while chunk:=handle.read(1024*1024): digest.update(chunk)
  hashes[relative]={'repo':repo,'revision':revision,'sha256':digest.hexdigest(),'bytes':target.stat().st_size}
 env={**os.environ,'PYTHONPATH':str(SOURCE/'src')}
 subprocess.run([str(executable),'-c','from fashn_vton import TryOnPipeline; print("Runtime import OK")'],env=env,check=True,timeout=60)
 installed=subprocess.check_output([str(executable),'-m','pip','freeze'],text=True,timeout=30)
 (WORK/'requirements.lock.txt').write_text(installed,encoding='utf-8')
 (WORK/'ready.json').write_text(json.dumps({'commit':COMMIT,'models':hashes,'mode':'manual-garment-segmentation-free','qualityValidated':False},indent=2),encoding='utf-8')
 print('Local research runtime ready. Quality validation is still required.',flush=True)

if __name__=='__main__':
 try: main()
 except Exception as error:
  WORK.mkdir(parents=True,exist_ok=True)
  (WORK/'setup-error.txt').write_text(type(error).__name__+': '+str(error),encoding='utf-8')
  print('Preparation failed: '+type(error).__name__,flush=True)
  raise
