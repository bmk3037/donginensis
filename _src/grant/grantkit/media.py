"""사진 정리(회전 보정·축소)와 촬영일, DOCX/XLSX → PDF 변환."""
from __future__ import annotations

import datetime as dt
import io
import shutil
import subprocess
from pathlib import Path

from PIL import Image, ImageOps

try:                                    # iPhone HEIC photos
    from pillow_heif import register_heif_opener
    register_heif_opener()
except ImportError:
    pass

IMG_EXT = {'.jpg', '.jpeg', '.png', '.webp', '.bmp', '.tif', '.tiff', '.heic'}


def is_image(p: Path) -> bool:
    return p.suffix.lower() in IMG_EXT


def prepare(path: Path, max_px: int = 1800) -> tuple[bytes, tuple[int, int]]:
    """EXIF 방향대로 세우고 긴 변 max_px 로 줄인 JPEG 바이트와 (w, h)."""
    with Image.open(path) as im:
        im = ImageOps.exif_transpose(im)
        if im.mode not in ('RGB', 'L'):
            bg = Image.new('RGB', im.size, 'white')
            bg.paste(im, mask=im.split()[-1] if im.mode in ('RGBA', 'LA') else None)
            im = bg
        im.thumbnail((max_px, max_px), Image.LANCZOS)
        buf = io.BytesIO()
        im.convert('RGB').save(buf, 'JPEG', quality=85, optimize=True)
        return buf.getvalue(), im.size


def taken_date(path: Path) -> tuple[dt.date | None, str]:
    """(날짜, 출처) — EXIF 촬영일이 없으면 None. 파일 수정일은 근거로 쓰지 않는다."""
    try:
        with Image.open(path) as im:
            exif = im.getexif()
            raw = exif.get_ifd(0x8769).get(36867) or exif.get(306)   # DateTimeOriginal / DateTime
            if raw:
                return dt.datetime.strptime(str(raw)[:10], '%Y:%m:%d').date(), 'EXIF'
    except Exception:
        pass
    return None, '촬영일 정보 없음'


# ---- PDF --------------------------------------------------------------------------------

_fonts_ready = False


def _ensure_fonts():
    """LibreOffice 가 한글을 그리도록 Pretendard 를 사용자 글꼴로 등록 (컨테이너에 한글 글꼴이 없음)."""
    global _fonts_ready
    if _fonts_ready:
        return
    from .project import FONTS
    target = Path.home() / '.local/share/fonts/grantkit'
    if FONTS.exists() and not any(target.glob('*.otf')):
        target.mkdir(parents=True, exist_ok=True)
        for f in FONTS.glob('*.otf'):
            shutil.copy(f, target / f.name)
        subprocess.run(['fc-cache', '-f', str(target)], capture_output=True)
    _fonts_ready = True


def to_pdf(src: Path, out_dir: Path) -> Path | None:
    exe = shutil.which('soffice') or shutil.which('libreoffice')
    if not exe:
        return None
    _ensure_fonts()
    r = subprocess.run([exe, '--headless', '--convert-to', 'pdf', '--outdir', str(out_dir), str(src)],
                       capture_output=True, text=True, timeout=240)
    pdf = out_dir / (src.stem + '.pdf')
    return pdf if r.returncode == 0 and pdf.exists() else None
