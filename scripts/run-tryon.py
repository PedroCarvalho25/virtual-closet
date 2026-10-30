"""One bounded local inference. Photographs and output stay in memory."""
import base64
import io
import json
import os
import sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
WORK=ROOT/'.tools/tryon'
sys.path.insert(0,str(WORK/'env/Lib/site-packages'))
sys.path.insert(0,str(WORK/'source/src'))
os.environ['HF_HUB_OFFLINE']='1'
os.environ['TRANSFORMERS_OFFLINE']='1'

def main():
 from PIL import Image,ImageOps
 import torch
 from fashn_vton import TryOnPipeline
 torch.set_num_threads(min(6,os.cpu_count() or 2))
 Image.MAX_IMAGE_PIXELS=8_000_000
 raw=sys.stdin.buffer.read(8*1024*1024+1)
 if len(raw)>8*1024*1024: raise ValueError('Request too large')
 payload=json.loads(raw)
 if payload.get('category') not in ('tops','bottoms','one-pieces'): raise ValueError('Invalid category')
 def photo(value):
  data=base64.b64decode(value,validate=True)
  if len(data)>3*1024*1024: raise ValueError('Image too large')
  with Image.open(io.BytesIO(data)) as source:
   if source.width*source.height>8_000_000 or min(source.size)<64: raise ValueError('Invalid image size')
   source=ImageOps.exif_transpose(source).convert('RGBA')
   result=Image.new('RGBA',source.size,(255,255,255,255));result.alpha_composite(source)
   result=result.convert('RGB');result.thumbnail((1400,1400));return result
 person,garment=photo(payload['person']),photo(payload['garment'])
 pipeline=TryOnPipeline(weights_dir=str(WORK/'weights'),device='cpu')
 if os.environ.get('VC_TRYON_LOW_RES')=='1':
  from fashn_vton.preprocessing import AspectPreserveResize, ResizePad
  pipeline.tryon_model.input_shape=(432,288)
  pipeline.pre_resize=AspectPreserveResize(target_size=(432,432),mode='fit',backend='pil')
  pipeline.resize_pad_fn=ResizePad((288,432),backend='opencv')
 output=pipeline(person_image=person,garment_image=garment,category=payload['category'],garment_photo_type='flat-lay',segmentation_free=True,num_timesteps=20,num_samples=1,seed=42)
 buffer=io.BytesIO();output.images[0].save(buffer,format='JPEG',quality=90)
 print(json.dumps({'base64':base64.b64encode(buffer.getvalue()).decode(),'experimental':True}))

if __name__=='__main__':
 try: main()
 except Exception:
  print(json.dumps({'error':'Não foi possível gerar esta simulação neste computador. A prévia manual e sua foto original estão preservadas.'}))
  sys.exit(1)
