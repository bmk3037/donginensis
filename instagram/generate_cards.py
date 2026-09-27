#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
동인엔시스 인스타그램 카드뉴스 생성기
- instagram/posts.json 의 콘텐츠(홈페이지 문구 그대로)를 읽어
- instagram/output/<post_id>/slide_XX.jpg (1080x1350, 4:5) 이미지를 만든다.
- 캡션은 instagram/output/<post_id>/caption.txt 로 함께 출력한다.

사용법:
  python3 instagram/generate_cards.py            # posts.json의 모든 게시물
  python3 instagram/generate_cards.py 02_intelligent_panel   # 특정 게시물만
"""
import json
import os
import re
import sys
import textwrap

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.dirname(ROOT)
OUT = os.path.join(ROOT, "output")
FONTS = os.path.join(ROOT, "fonts")

W, H = 1080, 1350  # Instagram 4:5 세로형
PAD = 72

# 동인엔시스 브랜드 컬러 (css/style.css 와 동일)
BLUE = (24, 87, 165)
BLUE_D = (15, 63, 126)
BLUE_DD = (10, 42, 85)
RED = (232, 62, 48)
INK = (17, 27, 46)
SUB = (90, 101, 119)
WHITE = (255, 255, 255)
LINE = (226, 231, 238)
BG2 = (245, 247, 250)


def font(weight, size):
    path = os.path.join(FONTS, f"Pretendard-{weight}.otf")
    return ImageFont.truetype(path, size)


F_BLACK = "Black"
F_XB = "ExtraBold"
F_BOLD = "Bold"
F_MED = "Medium"
F_REG = "Regular"


def load_bg(path, size=(W, H)):
    clean = path[3:] if path.startswith("../") else path
    im = Image.open(os.path.join(SITE, clean)).convert("RGB")
    iw, ih = im.size
    tw, th = size
    scale = max(tw / iw, th / ih)
    im = im.resize((int(iw * scale) + 1, int(ih * scale) + 1), Image.LANCZOS)
    iw, ih = im.size
    x = (iw - tw) // 2
    y = (ih - th) // 2
    return im.crop((x, y, x + tw, y + th))


def gradient_overlay(im, direction="down", color=BLUE_DD, strength=0.86):
    """이미지 위에 어두운 그라디언트를 얹어 텍스트 가독성을 확보한다."""
    im = im.copy()
    overlay = Image.new("RGB", im.size, color)
    mask = Image.new("L", im.size, 0)
    md = ImageDraw.Draw(mask)
    w, h = im.size
    steps = 240
    for i in range(steps):
        t = i / (steps - 1)
        if direction == "down":
            y0 = int(h * t / steps * steps)
        if direction == "down":
            y0 = int(h * (t))
            a = int(255 * strength * (t ** 1.4))
            md.rectangle([0, y0, w, y0 + h // steps + 2], fill=a)
        elif direction == "up":
            y0 = int(h * (1 - t))
            a = int(255 * strength * (t ** 1.4))
            md.rectangle([0, y0, w, y0 + h // steps + 2], fill=a)
        elif direction == "full":
            md.rectangle([0, 0, w, h], fill=int(255 * strength))
    return Image.composite(overlay, im, mask)


def dark_wash(im, color=BLUE_DD, alpha=0.5):
    overlay = Image.new("RGB", im.size, color)
    return Image.blend(im, overlay, alpha)


# ---------- 텍스트 유틸 (강조 *텍스트* → 블루) ----------

def parse_spans(s):
    """'*강조*' 마크업을 (text, is_accent) 스팬 리스트로 분리."""
    parts = re.split(r"(\*[^*]+\*)", s)
    spans = []
    for p in parts:
        if not p:
            continue
        if p.startswith("*") and p.endswith("*") and len(p) > 1:
            spans.append((p[1:-1], True))
        else:
            spans.append((p, False))
    return spans


def wrap_multiline(draw, text, fnt_reg, fnt_accent, max_width):
    """줄바꿈(\n)을 존중하면서 각 줄을 max_width 안에 들어가도록 단어 단위로 감싼다.
    반환: [[(word, is_accent), ...], ...]  (줄 리스트, 각 줄은 (word, accent) 리스트)
    """
    out_lines = []
    for raw_line in text.split("\n"):
        spans = parse_spans(raw_line)
        # 스팬을 (word, accent) 토큰으로 쪼갠다. 한글은 띄어쓰기 기준.
        tokens = []
        for txt, accent in spans:
            for word in re.findall(r"\S+|\s+", txt):
                if word.strip() == "":
                    continue
                tokens.append((word, accent))
        if not tokens:
            out_lines.append([])
            continue
        cur = []
        cur_w = 0
        space_w = draw.textlength(" ", font=fnt_reg)
        for word, accent in tokens:
            fnt = fnt_accent if accent else fnt_reg
            ww = draw.textlength(word, font=fnt)
            add = ww if not cur else space_w + ww
            if cur and cur_w + add > max_width:
                out_lines.append(cur)
                cur = [(word, accent)]
                cur_w = ww
            else:
                cur.append((word, accent))
                cur_w += add
        if cur:
            out_lines.append(cur)
    return out_lines


def draw_rich_text(draw, xy, text, size_reg, max_width, fill=INK, accent=BLUE,
                    weight=F_XB, accent_weight=None, line_gap=1.12, align="left"):
    accent_weight = accent_weight or weight
    fnt_reg = font(weight, size_reg)
    fnt_acc = font(accent_weight, size_reg)
    lines = wrap_multiline(draw, text, fnt_reg, fnt_acc, max_width)
    x0, y = xy
    line_h = int(size_reg * line_gap)
    for line in lines:
        # 줄 폭 계산 (정렬용)
        space_w = draw.textlength(" ", font=fnt_reg)
        total_w = 0
        for i, (word, acc) in enumerate(line):
            fnt = fnt_acc if acc else fnt_reg
            total_w += draw.textlength(word, font=fnt)
            if i < len(line) - 1:
                total_w += space_w
        x = x0 if align == "left" else x0 - total_w / 2
        for i, (word, acc) in enumerate(line):
            fnt = fnt_acc if acc else fnt_reg
            draw.text((x, y), word, font=fnt, fill=(accent if acc else fill))
            x += draw.textlength(word, font=fnt) + space_w
        y += line_h
    return y


def wrap_plain(draw, text, fnt, max_width):
    lines = []
    for raw in text.split("\n"):
        words = raw.split(" ")
        cur = ""
        for w in words:
            trial = (cur + " " + w).strip()
            if draw.textlength(trial, font=fnt) <= max_width or not cur:
                cur = trial
            else:
                lines.append(cur)
                cur = w
        lines.append(cur)
    return lines


def draw_plain_block(draw, xy, text, fnt, max_width, fill, line_gap=1.35, align="left"):
    x0, y = xy
    for line in wrap_plain(draw, text, fnt, max_width):
        w = draw.textlength(line, font=fnt)
        x = x0 if align == "left" else x0 - w / 2
        draw.text((x, y), line, font=fnt, fill=fill)
        y += int(fnt.size * line_gap)
    return y


def kicker(draw, xy, text, color=BLUE):
    x, y = xy
    fnt = font(F_BOLD, 30)
    draw.rectangle([x, y + 14, x + 44, y + 18], fill=RED)
    draw.text((x + 58, y), text, font=fnt, fill=color)
    return y + 50


def rounded_rect(draw, box, radius, fill=None, outline=None, width=1):
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def footer_brand(im, draw, dark=True, scrim=False):
    if scrim:
        # 사진 위에 얹히는 흰 글자의 가독성을 위해 하단에 어두운 스크림을 깐다.
        overlay = Image.new("RGB", (W, 110), BLUE_DD)
        mask = Image.new("L", (W, 110))
        for yy in range(110):
            mask.paste(int(190 * (yy / 110)), (0, yy, W, yy + 1))
        crop = im.crop((0, H - 110, W, H))
        blended = Image.composite(overlay, crop, mask)
        im.paste(blended, (0, H - 110))
    color = WHITE if dark else INK
    sub = (215, 224, 236) if dark else SUB
    fnt = font(F_BOLD, 26)
    fnt2 = font(F_MED, 22)
    y = H - 64
    draw.text((PAD, y), "DONG-IN ENSIS", font=fnt, fill=color)
    w = draw.textlength("donginensis.com", font=fnt2)
    draw.text((W - PAD - w, y + 2), "donginensis.com", font=fnt2, fill=sub)


def base_canvas(color=WHITE):
    im = Image.new("RGB", (W, H), color)
    return im, ImageDraw.Draw(im)


# ---------- 슬라이드 렌더러 ----------

def render_cover(slide):
    bg = load_bg(slide["bg"])
    bg = gradient_overlay(bg, "up", BLUE_DD, 0.92)
    im = bg.copy()
    draw = ImageDraw.Draw(im)
    y = kicker(draw, (PAD, 96), slide.get("kicker", ""), color=(255, 255, 255))
    y += 18
    y = draw_rich_text(draw, (PAD, y), slide["title"], 66, W - PAD * 2,
                        fill=WHITE, accent=(255, 170, 130) if False else (140, 190, 250),
                        weight=F_XB, line_gap=1.16)
    y += 22
    if slide.get("sub"):
        draw_plain_block(draw, (PAD, y), slide["sub"], font(F_MED, 30), W - PAD * 2,
                          fill=(225, 233, 245), line_gap=1.4)
    footer_brand(im, draw, dark=True, scrim=True)
    return im


def render_timeline(slide):
    im, draw = base_canvas(WHITE)
    y = 96
    y = kicker(draw, (PAD, y), slide.get("kicker", ""))
    y += 14
    y = draw_rich_text(draw, (PAD, y), slide["title"], 50, W - PAD * 2, fill=INK, accent=BLUE, weight=F_XB)
    y += 44
    items = slide["items"]
    n = len(items)
    top = y
    bottom = H - 150
    avail = bottom - top
    row_h = avail // n
    for i, (tag, title, body) in enumerate(items):
        ry = top + i * row_h
        # 타임라인 축
        cx = PAD + 8
        draw.ellipse([cx - 8, ry + 6, cx + 8, ry + 22], fill=RED if i == n - 1 else BLUE)
        if i < n - 1:
            draw.line([cx, ry + 22, cx, ry + row_h + 6], fill=LINE, width=3)
        tx = PAD + 44
        fnt_tag = font(F_BOLD, 26)
        draw.text((tx, ry), tag, font=fnt_tag, fill=RED if i == n - 1 else BLUE)
        fnt_title = font(F_XB, 34)
        draw.text((tx, ry + 38), title, font=fnt_title, fill=INK)
        draw_plain_block(draw, (tx, ry + 82), body, font(F_REG, 25), W - tx - PAD, fill=SUB, line_gap=1.32)
    if slide.get("note"):
        fnt = font(F_MED, 22)
        draw.text((PAD, H - 96), "※ " + slide["note"], font=fnt, fill=SUB)
    footer_brand(im, draw, dark=False)
    return im


def render_stats(slide):
    im, draw = base_canvas(BG2)
    y = 110
    y = kicker(draw, (PAD, y), slide.get("kicker", ""))
    y += 14
    y = draw_rich_text(draw, (PAD, y), slide["title"], 50, W - PAD * 2, fill=INK, accent=BLUE, weight=F_XB)
    y += 60
    items = slide["items"]
    cols = 2
    gap = 24
    cell_w = (W - PAD * 2 - gap) // cols
    cell_h = 210
    rows = (len(items) + cols - 1) // cols
    grid_h = rows * cell_h + (rows - 1) * gap
    avail_h = (H - 150) - y
    if grid_h < avail_h:
        y += (avail_h - grid_h) // 2
    for i, (num, label, sub) in enumerate(items):
        col = i % cols
        row = i // cols
        x = PAD + col * (cell_w + gap)
        cy = y + row * (cell_h + gap)
        rounded_rect(draw, [x, cy, x + cell_w, cy + cell_h], 6, fill=WHITE, outline=LINE, width=2)
        draw.rectangle([x, cy, x + 6, cy + cell_h], fill=BLUE if row % 2 == 0 else RED)
        draw.text((x + 32, cy + 30), num, font=font(F_BLACK, 56), fill=INK)
        draw.text((x + 32, cy + 100), label, font=font(F_BOLD, 26), fill=BLUE)
        draw.text((x + 32, cy + 140), sub, font=font(F_REG, 22), fill=SUB)
    footer_brand(im, draw, dark=False)
    return im


def render_list(slide):
    im, draw = base_canvas(WHITE)
    y = 100
    y = kicker(draw, (PAD, y), slide.get("kicker", ""))
    y += 14
    y = draw_rich_text(draw, (PAD, y), slide["title"], 50, W - PAD * 2, fill=INK, accent=BLUE, weight=F_XB)
    y += 50
    items = slide["items"]
    n = len(items)
    avail = H - 150 - y
    row_h = avail // n
    for i, (no, title, body) in enumerate(items):
        ry = y + i * row_h
        draw.line([PAD, ry, W - PAD, ry], fill=LINE, width=2)
        badge_col = BLUE
        draw.ellipse([PAD, ry + 26, PAD + 56, ry + 82], fill=badge_col)
        fnt_no = font(F_BOLD, 26 if len(no) <= 2 else 20)
        bbox = draw.textbbox((0, 0), no, font=fnt_no)
        bw, bh = bbox[2] - bbox[0], bbox[3] - bbox[1]
        draw.text((PAD + 28 - bw / 2, ry + 54 - bh / 2 - bbox[1]), no, font=fnt_no, fill=WHITE)
        tx = PAD + 84
        draw.text((tx, ry + 24), title, font=font(F_BOLD, 32), fill=INK)
        if body:
            draw_plain_block(draw, (tx, ry + 68), body, font(F_REG, 24), W - tx - PAD, fill=SUB, line_gap=1.3)
    footer_brand(im, draw, dark=False)
    return im


def render_issue(slide):
    im, draw = base_canvas(BLUE_DD)
    y = 120
    draw.text((PAD, y), slide["no"], font=font(F_BOLD, 30), fill=(150, 195, 255))
    y += 56
    y = draw_rich_text(draw, (PAD, y), slide["title"], 58, W - PAD * 2, fill=WHITE, accent=(255, 255, 255),
                        weight=F_XB, line_gap=1.18)
    y += 30
    draw.line([PAD, y, PAD + 70, y], fill=RED, width=4)
    y += 36
    y = draw_plain_block(draw, (PAD, y), slide["body"], font(F_MED, 30), W - PAD * 2, fill=(210, 221, 238), line_gap=1.45)
    if slide.get("chips"):
        y += 30
        cx = PAD
        cy = y
        for c in slide["chips"]:
            fnt = font(F_BOLD, 22)
            tw = draw.textlength(c, font=fnt)
            bw = tw + 36
            if cx + bw > W - PAD:
                cx = PAD
                cy += 58
            rounded_rect(draw, [cx, cy, cx + bw, cy + 44], 22, outline=(120, 160, 210), width=2)
            draw.text((cx + 18, cy + 10), c, font=fnt, fill=(220, 230, 245))
            cx += bw + 14
    footer_brand(im, draw, dark=True)
    return im


def render_chips(slide):
    im, draw = base_canvas(WHITE)
    y = 110
    y = kicker(draw, (PAD, y), slide.get("kicker", ""))
    y += 14
    y = draw_rich_text(draw, (PAD, y), slide["title"], 50, W - PAD * 2, fill=INK, accent=BLUE, weight=F_XB)
    y += 56

    # 칩 레이아웃을 먼저 계산해 전체 블록 높이를 구하고, 남은 공간에 세로 중앙 정렬한다.
    fnt = font(F_BOLD, 28)
    bh = 64
    row_gap = 18
    rows = []
    cur_row = []
    cx = 0
    for i, c in enumerate(slide["items"]):
        tw = draw.textlength(c, font=fnt)
        bw = tw + 44
        if cx + bw > W - PAD * 2 and cur_row:
            rows.append(cur_row)
            cur_row = []
            cx = 0
        cur_row.append((c, bw))
        cx += bw + 16
    if cur_row:
        rows.append(cur_row)
    block_h = len(rows) * bh + (len(rows) - 1) * row_gap
    note_h = 0
    fnt_note = font(F_MED, 26)
    note_lines = wrap_plain(draw, slide.get("note", ""), fnt_note, W - PAD * 2) if slide.get("note") else []
    if note_lines:
        note_h = 36 + len(note_lines) * int(fnt_note.size * 1.4)
    avail_h = (H - 150) - y
    total_h = block_h + note_h
    if total_h < avail_h:
        y += (avail_h - total_h) // 2

    cy = y
    for row in rows:
        cx = PAD
        for i, (c, bw) in enumerate(row):
            main = (row is rows[0] and i == 0)
            rounded_rect(draw, [cx, cy, cx + bw, cy + bh], 4,
                         fill=BLUE if main else WHITE, outline=None if main else LINE, width=2)
            draw.text((cx + 22, cy + 16), c, font=fnt, fill=WHITE if main else INK)
            cx += bw + 16
        cy += bh + row_gap
    if note_lines:
        draw_plain_block(draw, (PAD, cy + 20), slide["note"], fnt_note, W - PAD * 2, fill=SUB, line_gap=1.4)
    footer_brand(im, draw, dark=False)
    return im


def render_flow(slide):
    im, draw = base_canvas(BG2)
    y = 100
    y = kicker(draw, (PAD, y), slide.get("kicker", ""))
    y += 14
    y = draw_rich_text(draw, (PAD, y), slide["title"], 46, W - PAD * 2, fill=INK, accent=BLUE, weight=F_XB)
    y += 50
    items = slide["items"]
    mark = slide.get("mark")
    good = slide.get("good", False)
    n = len(items)

    box_w = W - PAD * 2
    fnt_label = font(F_BOLD, 27)
    box_h = []
    for label in items:
        lines = wrap_plain(draw, label, fnt_label, box_w - 56)
        box_h.append(max(84, 40 + len(lines) * int(fnt_label.size * 1.3)))
    conn_h = 30
    block_h = sum(box_h) + conn_h * (n - 1)
    avail_h = (H - 150) - y
    if block_h < avail_h:
        y += (avail_h - block_h) // 2

    ry = y
    for i, label in enumerate(items):
        h = box_h[i]
        is_mark = (i == mark)
        col = RED if (is_mark and not good) else (BLUE if (is_mark and good) else INK)
        rounded_rect(draw, [PAD, ry, W - PAD, ry + h], 6,
                     fill=(255, 240, 238) if (is_mark and not good) else (WHITE if not (is_mark and good) else (232, 241, 251)),
                     outline=col, width=3 if is_mark else 2)
        draw_plain_block(draw, (PAD + 28, ry + (h - int(fnt_label.size * 1.3) * len(wrap_plain(draw, label, fnt_label, box_w - 56))) // 2),
                          label, fnt_label, box_w - 56, fill=col, line_gap=1.25)
        if is_mark and slide.get("mark_note"):
            fnt_note = font(F_BOLD, 22)
            note = slide["mark_note"]
            draw.text((W - PAD - draw.textlength(note, font=fnt_note), ry - 32), note, font=fnt_note, fill=col)
        ry += h
        if i < n - 1:
            ax = W // 2
            draw.line([ax, ry + 6, ax, ry + conn_h - 6], fill=SUB, width=3)
            ry += conn_h
    footer_brand(im, draw, dark=False)
    return im


def render_split(slide):
    im, draw = base_canvas(WHITE)
    y = 100
    y = kicker(draw, (PAD, y), slide.get("kicker", ""))
    y += 14
    y = draw_rich_text(draw, (PAD, y), slide["title"], 48, W - PAD * 2, fill=INK, accent=BLUE, weight=F_XB)
    y += 40
    col_gap = 20
    col_w = (W - PAD * 2 - col_gap) // 2
    # 항목 텍스트를 미리 측정해 카드 높이를 내용에 맞춘다.
    fnt_item = font(F_MED, 21)
    content_h = 30 + 40 + 48
    for it in slide["left"][2]:
        content_h += len(wrap_plain(draw, it, fnt_item, col_w - 56)) * 30 + 14
    col_h = content_h + 30
    avail_h = (H - 150) - y
    if col_h < avail_h:
        y += (avail_h - col_h) // 3
    col_top = y
    for i, (name, sub, items) in enumerate([slide["left"], slide["right"]]):
        x = PAD + i * (col_w + col_gap)
        accent = BLUE if i == 0 else RED
        rounded_rect(draw, [x, col_top, x + col_w, col_top + col_h], 6, fill=BG2, outline=LINE, width=2)
        draw.rectangle([x, col_top, x + col_w, col_top + 6], fill=accent)
        ty = col_top + 30
        draw.text((x + 24, ty), name, font=font(F_XB, 26), fill=accent)
        ty += 40
        draw.text((x + 24, ty), sub, font=font(F_MED, 20), fill=SUB)
        ty += 48
        for it in items:
            fnt = font(F_MED, 21)
            lines = wrap_plain(draw, it, fnt, col_w - 56)
            draw.ellipse([x + 24, ty + 8, x + 32, ty + 16], fill=accent)
            ly = ty
            for ln in lines:
                draw.text((x + 40, ly), ln, font=fnt, fill=INK)
                ly += 30
            ty = ly + 14
    footer_brand(im, draw, dark=False)
    return im


def render_photo(slide):
    bg = load_bg(slide["bg"])
    bg = gradient_overlay(bg, "up", BLUE_DD, 0.82)
    im = bg.copy()
    draw = ImageDraw.Draw(im)
    tag = slide.get("tag", "")
    fnt_tag = font(F_BOLD, 26)
    tw = draw.textlength(tag, font=fnt_tag)
    rounded_rect(draw, [PAD, 96, PAD + tw + 36, 96 + 48], 4, fill=RED)
    draw.text((PAD + 18, 108), tag, font=fnt_tag, fill=WHITE)
    y = H - 240
    draw.text((PAD, y), slide["title"], font=font(F_XB, 48), fill=WHITE)
    y += 62
    draw.text((PAD, y), slide["spec"], font=font(F_BOLD, 32), fill=(150, 195, 255))
    footer_brand(im, draw, dark=True, scrim=True)
    return im


def render_cta(slide):
    im, draw = base_canvas(BLUE)
    # 대각 악센트
    draw.polygon([(W, 0), (W, H * 0.4), (W * 0.55, 0)], fill=BLUE_D)
    draw.rectangle([0, H - 10, W, H], fill=RED)
    y = H * 0.34
    y = draw_rich_text(draw, (PAD, int(y)), slide["title"], 56, W - PAD * 2, fill=WHITE, accent=(255, 210, 90),
                        weight=F_XB, line_gap=1.22)
    y += 26
    if slide.get("sub"):
        draw_plain_block(draw, (PAD, int(y)), slide["sub"], font(F_MED, 28), W - PAD * 2, fill=(225, 235, 250), line_gap=1.4)
    footer_brand(im, draw, dark=True)
    return im


RENDERERS = {
    "cover": render_cover,
    "timeline": render_timeline,
    "stats": render_stats,
    "list": render_list,
    "issue": render_issue,
    "chips": render_chips,
    "flow": render_flow,
    "split": render_split,
    "photo": render_photo,
    "cta": render_cta,
}


def build_post(post, defaults):
    pid = post["id"]
    out_dir = os.path.join(OUT, pid)
    os.makedirs(out_dir, exist_ok=True)
    for i, slide in enumerate(post["slides"], 1):
        renderer = RENDERERS.get(slide["type"])
        if not renderer:
            print(f"  ! unknown slide type: {slide['type']}")
            continue
        im = renderer(slide)
        path = os.path.join(out_dir, f"slide_{i:02d}.jpg")
        im.save(path, quality=92)
        print(f"  -> {path}")

    tags = " ".join(defaults["hashtags"] + post.get("hashtags", []))
    caption = post["caption"].strip() + "\n\n" + tags + "\n\n" + defaults["handle"] + " · " + defaults["website"]
    with open(os.path.join(out_dir, "caption.txt"), "w", encoding="utf-8") as f:
        f.write(caption)
    print(f"  caption: {os.path.join(out_dir, 'caption.txt')}")


def main():
    with open(os.path.join(ROOT, "posts.json"), encoding="utf-8") as f:
        data = json.load(f)
    defaults = data["defaults"]
    only = sys.argv[1] if len(sys.argv) > 1 else None
    for post in data["posts"]:
        if only and post["id"] != only:
            continue
        print(f"[{post['id']}]")
        build_post(post, defaults)


if __name__ == "__main__":
    main()
