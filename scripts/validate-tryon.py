"""Bounded private benchmark using existing public demo photographs, never user photos."""
import base64, io, json, os, subprocess, sys, time
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]; WORK=ROOT/'.tools/tryon'
sys.path.insert(0,str(WORK/'env/Lib/site-packages'))
from PIL import Image, ImageDraw
source=Image.open(ROOT/'docs/preview-assets/tee.jpg').convert('RGB')
mask=Image.new('L',source.size);ImageDraw.Draw(mask).polygon([(145,92),(248,47),(280,88),(340,105),(393,91),(437,48),(543,101),(590,269),(501,304),(520,620),(371,656),(158,604),(181,307),(106,272)],fill=255)
garment=Image.new('RGB',source.size,'white');garment.paste(source,mask=mask)
buffer=io.BytesIO();garment.save(buffer,format='JPEG',quality=90)
payload={'person':base64.b64encode((ROOT/'assets/mural/street-full.jpg').read_bytes()).decode(),'garment':base64.b64encode(buffer.getvalue()).decode(),'category':'tops'}
start=time.monotonic();result={'usable':False,'input':'existing public demo photos; manually isolated T-shirt','steps':20,'device':'cpu','resolution':'432x288' if os.environ.get('VC_TRYON_LOW_RES')=='1' else '864x576','reason':'awaiting quality review'}
with (WORK/'validation-stderr.log').open('w',encoding='utf-8') as log:
 child=subprocess.Popen([sys.executable,str(ROOT/'scripts/run-tryon.py')],stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=log,cwd=ROOT)
 try:
  stdout,_=child.communicate(json.dumps(payload).encode(),timeout=480)
  data=json.loads(stdout)
  if child.returncode==0 and data.get('base64'):
   (WORK/'validation-result.jpg').write_bytes(base64.b64decode(data['base64']));result['generated']=True
  else: result['reason']=data.get('error','process failure')
 except subprocess.TimeoutExpired:
  child.kill();child.communicate();result['reason']='exceeded 480 second local CPU deadline'
 except Exception as error: result['reason']=type(error).__name__
result['elapsedSeconds']=round(time.monotonic()-start,1)
(WORK/'validation.json').write_text(json.dumps(result,indent=2),encoding='utf-8')
print(json.dumps(result),flush=True)
