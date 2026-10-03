"""네이버 스마트플레이스 등록용 사진 생성: python3 build.py -> photos/"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageEnhance

ROOT = Path(__file__).resolve().parents[2]
OUT = Path(__file__).parent / "photos"
FONT = ROOT / "_src/profile/fonts"
OUT.mkdir(exist_ok=True)

def crop(src, ratio, size, cx=0.5, cy=0.5):
    im = Image.open(ROOT / src).convert("RGB")
    w, h = im.size
    if w / h > ratio:
        nw = int(h * ratio); x = int((w - nw) * cx); im = im.crop((x, 0, x + nw, h))
    else:
        nh = int(w / ratio); y = int((h - nh) * cy); im = im.crop((0, y, w, y + nh))
    return im.resize(size, Image.LANCZOS)

def font(weight, px):
    return ImageFont.truetype(str(FONT / f"Pretendard-{weight}.otf"), px)

def cover(size, name):
    W, H = size
    im = crop("video/hero_poster.jpg", W / H, size)
    im = ImageEnhance.Brightness(im).enhance(0.55)
    shade = Image.new("RGBA", size, (6, 24, 58, 0))
    d = ImageDraw.Draw(shade)
    for y in range(H):  # 위쪽을 더 어둡게
        d.line([(0, y), (W, y)], fill=(6, 24, 58, int(200 * (1 - y / H) + 40)))
    im = Image.alpha_composite(im.convert("RGBA"), shade)
    logo = Image.open(ROOT / "img/logo_white.png").convert("RGBA")
    lw = int(W * 0.42); logo = logo.resize((lw, int(logo.height * lw / logo.width)), Image.LANCZOS)
    m = int(W * 0.075)
    im.alpha_composite(logo, (m, m))
    d = ImageDraw.Draw(im)
    y = m + logo.height + int(H * 0.09)
    d.text((m, y), "지능형 제어반 · 제조·해양 DX/AX", font=font("SemiBold", int(W * 0.036)), fill=(150, 190, 255))
    y += int(W * 0.075)
    big = font("ExtraBold", int(W * 0.068))
    for line in ["설비 제어부터", "클라우드 연결까지,", "지능형 제어반 하나로."]:
        d.text((m, y), line, font=big, fill="white"); y += int(W * 0.088)
    d.rectangle([m, y + 6, m + int(W * 0.12), y + 12], fill=(232, 62, 48))
    d.text((m, H - m - int(W * 0.04)), "1991년 설립 · 750+ 프로젝트 · 혁신프리미어 1000",
           font=font("Regular", int(W * 0.032)), fill=(220, 230, 245))
    im.convert("RGB").save(OUT / name, quality=92)

cover((1200, 1200), "01_대표_커버_1x1.jpg")
cover((1200, 900), "01_대표_커버_4x3.jpg")

PHOTOS = [  # (원본, 파일명, 가로중심)
    ("img/field-panel.jpg", "02_지능형제어반_펌프설비.jpg", 0.15),
    ("img/control-panel.jpg", "03_지능형제어반_모터설비.jpg", 0.5),
    ("img/sites/lh2-panel-overview.jpg", "04_적용_액화수소충전소.jpg", 0.62),
    ("img/sites/lng-engine.jpg", "05_적용_LNG선기관실.jpg", 0.4),
    ("img/sites/wind-crane.jpg", "06_적용_해상풍력설치선.jpg", 0.4),
    ("img/sites/steel-blower.jpg", "07_적용_제철송풍기.jpg", 0.45),
    ("img/apps/mfg-panel-line.jpg", "08_적용_생산라인.jpg", 0.5),
    ("img/apps/h2-vessel.jpg", "09_적용_수소추진선박.jpg", 0.5),
    ("img/apps/marine-lng-panel.jpg", "10_적용_선박기관실_점검.jpg", 0.5),
    ("img/apps/marine-deck.jpg", "11_적용_해상플랜트_갑판.jpg", 0.4),
    ("img/sites/port-crane.jpg", "12_적용_항만크레인.jpg", 0.3),
    ("img/apps/h2-vessel-system.jpg", "13_적용_수소추진선박_제어실.jpg", 0.5),
    ("img/apps/mfg-auto.jpg", "14_적용_자동차생산라인.jpg", 0.5),
    ("img/apps/mfg-food.jpg", "15_적용_식품공장.jpg", 0.5),
    ("img/apps/mfg-vibration.jpg", "16_예지보전_진동점검.jpg", 0.5),
    ("img/apps/dc-chiller.jpg", "17_적용_데이터센터_냉동기.jpg", 0.5),
    ("img/apps/dc-cooling-tower.jpg", "18_적용_데이터센터_냉각탑.jpg", 0.5),
    ("img/apps/dc-noc.jpg", "19_데이터_관제모니터링.jpg", 0.5),
]
for src, name, cx in PHOTOS:
    crop(src, 4 / 3, (1200, 900), cx).save(OUT / name, quality=92)
print("ok", len(list(OUT.glob("*.jpg"))))
