"""홈페이지 공유 미리보기 그림(og:image) — 첫 화면 제어반 장면 + 「설비를 제어하고, 데이터를 연결하다.」
쓰는 법: python3 _src/seo/make_og_home.py kr img/og_image_v5.jpg  /  … en img/og_image_v5_en.jpg (영문 페이지용)
바꿀 때는 파일 이름 버전(v5→v6)을 올리고 모든 페이지의 og:image를 함께 고친다(카카오톡 미리보기 캐시 때문).
"""
import sys
from PIL import Image, ImageDraw, ImageFont
import numpy as np
SITE='/home/user/donginensis'; F=f'{SITE}/_src/profile/fonts'
bg=Image.open(f'{SITE}/video/hero_f_poster.jpg').convert('RGB').resize((1200,675),Image.LANCZOS).crop((0,22,1200,652))
a=np.asarray(bg).astype(np.float32)
x=np.linspace(0,1,1200)[None,:,None]; shade=np.clip(1-(x-0.12)/0.5,0,1)*0.55   # 왼쪽을 조금 어둡게 (글자 읽기)
a=a*(1-shade)+np.array([5,11,22],np.float32)*shade
im=Image.fromarray(a.clip(0,255).astype(np.uint8)); d=ImageDraw.Draw(im)
lg=Image.open(f'{SITE}/img/logo_white.png').convert('RGBA'); lg=lg.resize((int(lg.width*44/lg.height),44),Image.LANCZOS); im.paste(lg,(80,170),lg)
lang=sys.argv[1]
if lang=='kr': lines=['설비를 제어하고,','데이터를 연결하다.']; size=80; kick=''
else: lines=['Controlling equipment,','connecting data.']; size=60; kick=''
fk=ImageFont.truetype(f'{F}/Pretendard-Bold.otf',22); ft=ImageFont.truetype(f'{F}/Pretendard-ExtraBold.otf',size)
xk=80
for ch in kick: d.text((xk,232),ch,font=fk,fill=(143,193,255)); xk+=fk.getlength(ch)+5
y=262
for i,l in enumerate(lines):
    d.text((78,y),l,font=ft,fill=(255,255,255)); y+=int(size*1.22)
w=ft.getlength(lines[1]); d.rectangle((80,y+10,80+w,y+16),fill=(232,62,48))
d.text((80,560),'donginensis.com',font=ImageFont.truetype(f'{F}/Pretendard-SemiBold.otf',22),fill=(200,212,228))
im.save(sys.argv[2],quality=86,optimize=True,progressive=True)
