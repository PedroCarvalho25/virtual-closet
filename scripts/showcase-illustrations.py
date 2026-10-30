"""Original flat garment illustrations; deliberately drawings, never synthetic photos."""
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ILLUSTRATED = {'stripe', 'jacket', 'sweat', 'gray-pants', 'light-denim', 'camel-coat', 'belt', 'tailored'}

def illustrate(key):
    image = Image.new('RGB', (1000, 1200), '#f4f0e7')
    shapes = Image.new('RGBA', image.size)
    d = ImageDraw.Draw(shapes)
    line = '#414c49'
    def poly(points, color):
        d.polygon(points, fill=color)
        d.line(points + [points[0]], fill=line, width=4, joint='curve')
    def seam(points, color='#78817c', width=3):
        d.line(points, fill=color, width=width, joint='curve')
    if key in {'stripe', 'sweat', 'jacket'}:
        bottom = 710 if key == 'stripe' else 850 if key == 'sweat' else 870
        fill = {'stripe': '#e9e1d5', 'sweat': '#bfc4c4', 'jacket': '#547893'}[key]
        short = key == 'stripe'
        points = [(390,230),(300,270),(125,440 if short else 700),(230,510 if short else 755),
                  (315,390),(310,bottom),(690,bottom),(685,390),(770,510 if short else 755),
                  (875,440 if short else 700),(700,270),(610,230),(585,270),(415,270)]
        poly(points, fill)
        if short:
            mask = Image.new('L', image.size); md = ImageDraw.Draw(mask); md.polygon(points, fill=255)
            stripes = Image.new('RGBA', image.size); sd = ImageDraw.Draw(stripes)
            for y in range(310,bottom,55): sd.rectangle((90,y,910,y+20),fill='#a5474b')
            stripes.putalpha(Image.composite(stripes.getchannel('A'), Image.new('L',image.size), mask))
            shapes.alpha_composite(stripes); d = ImageDraw.Draw(shapes)
            seam([(319,bottom-15),(681,bottom-15)],'#70675e')
        elif key == 'sweat':
            d.rectangle((313,bottom-48,687,bottom-3),fill='#aab2b2')
            seam([(313,bottom-48),(687,bottom-48)])
            for x in range(322,682,13): seam([(x,bottom-42),(x,bottom-10)],'#bdc3c2',2)
            poly([(375,600),(430,575),(570,575),(625,600),(625,720),(375,720)],'#b5bdbc')
            seam([(375,600),(418,649)]); seam([(625,600),(582,649)])
        else:
            poly([(390,230),(495,291),(432,352),(366,269)],'#7894aa')
            poly([(610,230),(505,291),(568,352),(634,269)],'#7894aa')
            seam([(500,300),(500,bottom)],'#d0c5a5',4)
            for x in (350,550):
                poly([(x,390),(x+100,390),(x+100,515),(x+50,538),(x,515)],'#66879f')
                seam([(x,419),(x+100,419)],'#c3baa1',3)
                d.ellipse((x+45,400,x+55,410),fill='#b5a270')
            for y in range(357,bottom-25,84): d.ellipse((487,y,499,y+12),fill='#c5ad77')
            seam([(321,bottom-37),(684,bottom-37)],'#c3baa1')
        if key != 'jacket':
            d.arc((396,217,604,313),0,180,fill=line,width=14)
            d.arc((396,217,604,313),0,180,fill='#dadbd2' if key=='sweat' else '#9c4347',width=8)
    elif key in {'gray-pants','light-denim','tailored'}:
        fill = {'gray-pants':'#a9afb1','light-denim':'#93b6ca','tailored':'#727b80'}[key]
        wide = key == 'light-denim'
        end = 900 if key == 'gray-pants' else 1000
        poly([(310,220),(690,220),(724,410),(760 if wide else 673,end),
              (539,end),(500,492),(461,end),(240 if wide else 327,end),(276,410)],fill)
        seam([(306,257),(694,257)],'#555f61',4)
        seam([(495,258),(495,403),(518,440)],'#555f61')
        seam([(313,285),(352,318),(347,378)],'#677c85')
        seam([(687,285),(648,318),(653,378)],'#677c85')
        for x in (333,448,552,666):
            d.rectangle((x-5,221,x+5,270),fill=fill,outline='#56656b',width=2)
        d.ellipse((512,231,522,241),fill='#c0b08a')
        if key == 'tailored':
            seam([(396,295),(400,436),(390,end-23)],'#abb1b0',2)
            seam([(604,295),(600,436),(610,end-23)],'#abb1b0',2)
        else:
            for x1,x2 in ((243 if wide else 328,460),(540,757 if wide else 672)):
                d.rectangle((x1,end-38,x2,end),fill='#b3c8cc' if wide else '#8d9699',outline=line,width=3)
    elif key == 'camel-coat':
        poly([(392,192),(299,237),(149,753),(239,784),(316,419),(292,1010),
              (708,1010),(684,419),(761,784),(851,753),(701,237),(608,192)],'#b79065')
        poly([(392,192),(493,300),(428,418),(354,285)],'#d0ac80')
        poly([(608,192),(507,300),(572,418),(646,285)],'#d0ac80')
        seam([(500,320),(500,1005)],'#755c40')
        d.rectangle((303,558,698,590),fill='#9c7951',outline=line,width=3)
        d.rectangle((475,551,535,598),outline='#dbc390',width=8)
        for y in (464,653,777):
            for x in (458,542): d.ellipse((x-8,y-8,x+8,y+8),fill='#664f3c')
        for x in (334,586): seam([(x,673),(x+75,656)],'#6d5840',6)
    else:
        poly([(157,414),(843,414),(884,446),(843,478),(157,478)],'#775439')
        poly([(175,690),(775,690),(821,722),(775,754),(175,754)],'#775439')
        d.rounded_rectangle((144,393,260,498),radius=16,outline='#b79859',width=18)
        seam([(152,445),(257,445)],'#b79859',10)
        for x in range(650,824,30): d.ellipse((x,441,x+9,450),fill='#eee4cf')
        seam([(278,425),(838,425)],'#b7936b',2)
        seam([(192,742),(771,742)],'#b7936b',2)
    shadow = shapes.getchannel('A').filter(ImageFilter.GaussianBlur(13))
    layer = Image.new('RGB',image.size,'#d8d5cb')
    image.paste(layer,(0,12),shadow)
    image.paste(shapes,(0,0),shapes)
    d = ImageDraw.Draw(image)
    font = ImageFont.truetype('C:/Windows/Fonts/arial.ttf',22)
    d.text((65,65),'VC / ESTUDO DE FORMA',font=font,fill='#5f7067')
    d.text((65,1120),'ILUSTRAÇÃO DE CATÁLOGO',font=font,fill='#5f7067')
    return image
