from pathlib import Path
from PIL import Image,ImageOps,ImageDraw,ImageFont
import json,hashlib
import runpy
illustrations = runpy.run_path(str(Path(__file__).with_name('showcase-illustrations.py')))
r=Path.cwd(); out=r/'assets/showcase'; out.mkdir(exist_ok=True)
cat=json.loads((r/'src/social/catalog-data.json').read_text(encoding='utf-8'))
# Crops isolate the garment being catalogued. No recolouring or generated photos.
entries=[
('tee','Camiseta branca essencial','camiseta','Branco','M','boxy','tee',None),
('shirt','Camisa branca de manga longa','camisa','Branco','M','normal','shirt',None),
('botanical','Camisa estampada noturna','camisa','Preto e bege','M','normal',24,None),
('stripe','Camiseta listrada curta','camiseta','Vermelho e branco','M','cropped',26,[.20,.15,.68,.64]),
('jacket','Jaqueta jeans ampla','outro','Azul médio','G','oversized',7,[.10,.01,.89,.43]),
('sweat','Moletom cinza leve','outro','Cinza claro','M','normal',27,[.31,.22,.72,.56]),
('knit','Poncho de tricô creme','outro','Creme','G','oversized','knit',None),
('denim','Jeans azul profundo','calca','Azul escuro','40','normal','denim',None),
('light-denim','Jeans claro de barra dobrada','calca','Azul claro','42','baggy',19,[.57,.02,.99,.98]),
('chino','Calça chino areia','calca','Areia','40','normal',7,[.21,.38,.83,.92]),
('gray-pants','Calça cinza de barra curta','calca','Cinza claro','40','cropped',27,[.30,.50,.74,.93]),
('shorts','Jorts azul lavado','jorts','Azul lavado','42','normal','shorts',None),
('camel-coat','Casaco caramelo longo','outro','Caramelo','G','oversized',19,[0,.12,.24,.95]),
('tan-shoes','Tênis caramelo','tenis','Caramelo','40',None,'sneakers',None),
('high-top','Tênis preto de cano alto','tenis','Preto e branco','40',None,5,[.10,.27,.90,.98]),
('burgundy-shoes','Sapato de couro vinho','outro','Vinho','40',None,40,[.22,.06,.76,.86]),
('gray-shoes','Tênis de malha grafite','tenis','Grafite','40',None,36,[.05,.15,.95,.96]),
('cap','Boné branco minimalista','bone_aba_curta','Branco','Único','normal','cap',None),
('belt','Cinto de couro marrom','outro','Marrom','M',None,23,[.455,.04,.55,.94]),
('tailored','Calça de alfaiataria cinza','calca','Cinza médio','40','normal',23,[.55,.015,.995,.34]),
]
legacy={'tee':'photo-1521572163474-6864f9cf17ab','shirt':'photo-1598033129183-c4f50c736f10','knit':'photo-1434389677669-e08b4cac3105','denim':'photo-1542272604-787c3835535d','shorts':'photo-1591195853828-11db59a44f6b','sneakers':'photo-1549298916-b41d501d3772','cap':'photo-1588850561407-ed78c282e89b'}
items=[]
for key,name,category,color,size,fit,source,crop in entries:
 if isinstance(source,int):
  c=cat[source-1]; path=r/'assets/mural'/f"{c['key']}-full.jpg"; credit=c['credit']; link=c['evidenceUrl']; license='CC0 1.0'
 else:
  path=r/'docs/preview-assets'/f'{source}.jpg'; credit='Unsplash · fotografia de catálogo'; link='https://images.unsplash.com/'+legacy[source]; license='Unsplash License'
 img=Image.open(path).convert('RGB')
 if crop:
  w,h=img.size; img=img.crop(tuple(round(a*b) for a,b in zip(crop,(w,h,w,h))))
 kind='photograph'
 if key in illustrations['ILLUSTRATED']:
  img=illustrations['illustrate'](key); kind='illustration'; crop=None
  credit='Virtual Closet · ilustração original de catálogo'; link='Acervo local de apresentação do Virtual Closet'; license='Criada para uso neste projeto'
 img.thumbnail((1000,1200)); img.save(out/f'{key}.jpg',quality=90,optimize=True)
 items.append(dict(key=key,name=name,category=category,color=color,size=size,fit=fit,brand=None,kind=kind,credit=credit,source=link,license=license,crop=crop,width=img.width,height=img.height,sha256=hashlib.sha256((out/f'{key}.jpg').read_bytes()).hexdigest()))
looks=[
 dict(key='passeio',name='Passeio leve',items=['tee','shorts','tan-shoes','cap'],palette=['#ece9df','#7a9cbb','#ae733e'],note='Branco e jeans lavado deixam a composição leve. O caramelo aquece a base, e o boné repete o branco sem acrescentar outra cor.'),
 dict(key='urbano',name='Camadas urbanas',items=['stripe','denim','jacket','high-top'],palette=['#b44445','#244763','#152431'],note='A camiseta curta equilibra a jaqueta ampla. Jeans escuro e tênis preto alongam a base; as listras vermelhas são o ponto de atenção.'),
 dict(key='cinza',name='Cinza em movimento',items=['sweat','gray-pants','gray-shoes','cap'],palette=['#c1c3c3','#969ba1','#3c4149'],note='Tons de cinza criam continuidade. A barra curta mostra o tênis de malha, e o boné branco ilumina a composição sem acrescentar uma cor forte.'),
 dict(key='noite',name='Noite de estampa',items=['botanical','denim','burgundy-shoes','belt'],palette=['#202226','#ded2b7','#662e3c'],note='A estampa fica concentrada na camisa. O jeans escuro dá uma base limpa; vinho e couro marrom entram como detalhes quentes para sair.'),
 dict(key='texturas',name='Texturas da tarde',items=['shirt','chino','knit','tan-shoes'],palette=['#f1eadd','#d2bf94','#b4814f'],note='Branco, creme e areia formam uma gradação suave. A camisa estrutura o poncho amplo e a calça reta equilibra o volume da parte de cima.'),
]
fontpath=r/'node_modules/@expo-google-fonts/dm-sans/700Bold/DMSans_700Bold.ttf'
font=ImageFont.truetype(str(fontpath),45) if fontpath.exists() else ImageFont.truetype('C:/Windows/Fonts/arialbd.ttf',45)
small=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',20)
for look in looks:
 canvas=Image.new('RGB',(1000,1200),'#FEEECE'); d=ImageDraw.Draw(canvas)
 d.text((50,38),look['name'],fill='#19372a',font=font)
 d.text((50,101),'VIRTUAL CLOSET / APRESENTAÇÃO',fill='#5e6b5e',font=small)
 boxes=[(45,165,465,700),(505,165,955,710),(45,755,565,1130),(605,755,955,1130)]
 for key,box in zip(look['items'],boxes):
  x1,y1,x2,y2=box; im=Image.open(out/f'{key}.jpg'); fitted=ImageOps.contain(im,(x2-x1,y2-y1))
  canvas.paste(fitted,(x1+(x2-x1-fitted.width)//2,y1+(y2-y1-fitted.height)//2))
 for i,c in enumerate(look['palette']):d.ellipse((827+i*38,110,851+i*38,134),fill=c)
 canvas.save(out/f"look-{look['key']}.jpg",quality=90,optimize=True)
(r/'src/showcase').mkdir(exist_ok=True)
(r/'src/showcase/catalog.json').write_text(json.dumps({'items':items,'looks':looks},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
lines=['// Licensed photos and original illustrations, prepared by scripts/prepare-showcase.py.','export const showcaseImages: Record<string, number> = {']
for key in [i['key'] for i in items]+['look-'+l['key'] for l in looks]: lines.append(f"  '{key}': require('../../assets/showcase/{key}.jpg'),")
lines.append('};')
(r/'src/showcase/images.ts').write_text('\n'.join(lines)+'\n',encoding='utf-8')
sheet=Image.new('RGB',(1200,1000),'#eee8da'); d=ImageDraw.Draw(sheet)
for i,item in enumerate(items):
 im=ImageOps.contain(Image.open(out/f"{item['key']}.jpg"),(226,200)); x=(i%5)*240; y=(i//5)*250
 sheet.paste(im,(x+(230-im.width)//2,y)); d.text((x+4,y+203),item['name'],fill='black')
sheet.save(r/'.tools/showcase-contact-sheet.jpg')
print('20 peças e cinco capas preparadas: 12 fotografias reais e 8 ilustrações originais.')
