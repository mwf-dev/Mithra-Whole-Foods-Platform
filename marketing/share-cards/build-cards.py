import os,sys
from PIL import Image
S=sys.argv[1]; C=S+'/cards'
cards=[
 ('rice','rice-hero-1','Mithra rice for every South Indian meal','Ponni boiled · Sona Masoori · Idly rice · IR20 · Seeraga Samba · Hand pound ponni'),
 ('breakfast','breakfast-1','Your South Indian breakfast, sorted','Idly rice · Idli podi · Wood-pressed sesame oil · Pure cow ghee'),
 ('kids','kids-1','Wholesome mornings for little ones','Popped ragi flour · Nendran banana powder · Multi grain health mix · Paruthi paal mix'),
 ('essentials','essentials-1','The traditional kitchen, stocked','Wood-pressed peanut &amp; sesame oil · Pure cow ghee · Palm jaggery'),
 ('snacks','snacks-1','Tea-time snacks and old-kitchen sweets','Kai muruku · Manaparai muruku · Mixture · Kara boondi · Chikki · Kamarkat'),
 ('millets','millets-1','Unpolished millets that cook like rice','Barnyard · Finger · Foxtail · Little · Kodo · Red jowar'),
]
FONTS='<link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Inter:wght@500;600&display=block" rel="stylesheet">'
for name,src,head,sub in cards:
  im=Image.open(f'{S}/out/{src}.png').convert('RGB')
  im.save(f'{C}/{name}-scene.jpg',quality=92)
  r,g,b=im.getpixel((20,int(im.height*0.5)))
  r2,g2,b2=im.getpixel((20,20))
  bg=f'rgb({r},{g},{b})'; bgt=f'rgb({r2},{g2},{b2})'
  base=f'''<!doctype html><html><head><meta charset=utf-8>{FONTS}<style>
*{{margin:0;box-sizing:border-box}} body{{width:W;height:H;overflow:hidden;background:linear-gradient(180deg,{bgt},{bg});font-family:Inter,sans-serif;color:#FFF8EC;position:relative}}
.logo{{height:LOGOpx}} h1{{font-family:'DM Serif Display',serif;font-weight:400;line-height:1.05;letter-spacing:-.5px;text-shadow:0 2px 18px rgba(0,0,0,.25)}}
p{{opacity:.92;line-height:1.4;font-weight:500}} .pill{{display:inline-block;background:#FFF8EC;color:#1f2a14;font-weight:600;border-radius:999px}}
.scene{{position:absolute}} .fade{{position:absolute}}
</style></head><body>'''
  land=base.replace('W','1200px').replace('H','630px').replace('LOGO','64')+f'''
<img class=scene src="{name}-scene.jpg" style="right:0;top:0;height:630px;width:945px">
<div class=fade style="left:255px;top:0;width:220px;height:630px;background:linear-gradient(90deg,{bg},rgba(0,0,0,0))"></div>
<div style="position:absolute;left:60px;top:54px;width:520px">
<img class=logo src="mithra-wordmark-light.svg">
<h1 style="font-size:58px;margin-top:70px">{head}</h1>
<p style="font-size:20px;margin-top:22px">{sub}</p>
<span class=pill style="font-size:19px;padding:12px 22px;margin-top:34px">Shop now · Shipped from Exton, PA</span>
</div></body></html>'''
  sq=base.replace('W','1080px').replace('H','1080px').replace('LOGO','64')+f'''
<img class=scene src="{name}-scene.jpg" style="left:0;bottom:0;width:1080px;height:720px">
<div class=fade style="left:0;top:360px;width:1080px;height:140px;background:linear-gradient(180deg,{bgt},rgba(0,0,0,0))"></div>
<div style="position:absolute;left:64px;top:56px;width:952px">
<img class=logo src="mithra-wordmark-light.svg">
<h1 style="font-size:64px;margin-top:34px;max-width:700px">{head}</h1>
<p style="font-size:24px;margin-top:18px;max-width:430px">{sub}</p>
</div>
<span class=pill style="position:absolute;left:64px;bottom:56px;font-size:22px;padding:14px 26px">Shop now · Shipped from Exton, PA</span>
</body></html>'''
  open(f'{C}/{name}-1200x630.html','w').write(land)
  open(f'{C}/{name}-1080.html','w').write(sq)
print('ok')
