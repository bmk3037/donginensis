"""지능형제어반 GLB 생성: 사진(control-panel_3d_white.png)을 정면 텍스처로 펴서 박스 형상에 입힌다.

  python3 build_glb.py                                        # 디지털트윈용(문 닫힘, 경첩 피벗) -> unity/Assets/DonginTwin/Models/control_panel_twin.glb
  DOOR_DEG=115 OUT=control_panel_open.glb python3 build_glb.py
  DOOR_DEG=0   OUT=control_panel_closed.glb python3 build_glb.py

노드 계층 (Unity 스크립트가 이름으로 찾음):
  ControlPanel
   ├ LeftSection ─ LeftDoor ─ HMI, HMI_Screen, Keypad, Selector_Switch, Lamp_Green, Lamp_Red, Handle
   ├ RightSection ─ RightDoor_Hinge(경첩 축, Y축 회전) ─ RightDoor
   ├ EyeBolts
   └ Front_Marker (제어반 정면 방향 표시용 빈 노드)
단위 m, Y-up, 정면 +Z (glTF 규약).
"""
import json
import os

import cv2
import numpy as np
import trimesh
from PIL import Image
from trimesh.visual import TextureVisuals
from trimesh.visual.material import PBRMaterial

HERE = os.path.dirname(os.path.abspath(__file__))
DOOR_DEG = float(os.environ.get('DOOR_DEG', '0'))
OUT = os.environ.get('OUT', os.path.join(HERE, 'unity', 'Assets', 'DonginTwin', 'Models', 'control_panel_twin.glb'))

src = cv2.cvtColor(cv2.imread(os.path.join(HERE, 'control-panel_3d_white.png')), cv2.COLOR_BGR2RGB)


def rectify(quad, w, h):
    M = cv2.getPerspectiveTransform(np.float32(quad), np.float32([[0, 0], [w, 0], [w, h], [0, h]]))
    return cv2.warpPerspective(src, M, (w, h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)


# quads in the 2048px cutout (TL, TR, BR, BL)
tex_door = rectify([(297, 295), (868, 270), (868, 1828), (297, 1800)], 768, 2048)
tex_inner = rectify([(918, 305), (1422, 295), (1422, 1712), (918, 1725)], 688, 1920)
tex_dinr = rectify([(1458, 282), (1715, 197), (1715, 1835), (1462, 1760)], 768, 2048)

# right door outer face = left door with HMI/keypad/buttons painted out
tex_rout = tex_door.copy().astype(np.float32)
for (a, b, c, d) in [(205, 160, 540, 412), (98, 452, 272, 692), (355, 498, 655, 632)]:
    top = tex_rout[b - 6:b - 2, a:c].mean(0)
    bot = tex_rout[d + 2:d + 6, a:c].mean(0)  # per-column steel colour
    t = np.linspace(0, 1, d - b)[:, None, None]
    tex_rout[b:d, a:c] = top * (1 - t) + bot * t
tex_rout = cv2.GaussianBlur(tex_rout, (0, 0), 0.6).clip(0, 255).astype(np.uint8)
grey = np.median(tex_door[200:600, 450:700].reshape(-1, 3), axis=0)

# ---- dimensions (m) ----
H, W, D = 2.0, 0.76, 0.60  # cabinet height / section width / depth
T = 0.025                  # door thickness
PL = 0.10                  # plinth height
z_front = D / 2
body_h = H - PL
yb = PL + body_h / 2
dw, dh = W - 0.006, body_h - 0.006   # door size

Tm = trimesh.transformations.translation_matrix
Rm = trimesh.transformations.rotation_matrix

S = trimesh.Scene()


def mat(rgb, metal=0.25, rough=0.55, name=None):
    return PBRMaterial(name=name, baseColorFactor=[*(np.array(rgb) / 255.0), 1.0],
                       metallicFactor=metal, roughnessFactor=rough)


M_GREY = mat(grey, name='steel_grey')
M_DARK = mat((45, 47, 50), 0.1, 0.7, 'plinth_dark')
M_FLOOR = mat((150, 152, 156), name='inner_floor')
M_METAL = mat((185, 188, 192), 0.9, 0.3, 'zinc')


def group(name, parent, matrix=None):
    S.graph.update(frame_from=parent, frame_to=name, matrix=np.eye(4) if matrix is None else matrix)


def add(mesh, name, parent, material=None, matrix=None):
    mesh = mesh.copy()
    if material is not None:
        mesh.visual = TextureVisuals(uv=np.zeros((len(mesh.vertices), 2)), material=material)
    S.add_geometry(mesh, node_name=name, geom_name=name, parent_node_name=parent,
                   transform=np.eye(4) if matrix is None else matrix)


def box(ext, center=(0, 0, 0)):
    return trimesh.creation.box(extents=ext, transform=Tm(center))


def quad(w, h, img, uv=(0, 0, 1, 1), name='q'):
    u0, v0, u1, v1 = uv  # uv in image coords (0..1, top-left origin)
    v = np.array([[-w / 2, -h / 2, 0], [w / 2, -h / 2, 0], [w / 2, h / 2, 0], [-w / 2, h / 2, 0]])
    f = np.array([[0, 1, 2], [0, 2, 3]])
    tc = np.array([[u0, 1 - v1], [u1, 1 - v1], [u1, 1 - v0], [u0, 1 - v0]])
    m = trimesh.Trimesh(v, f, process=False)
    m.visual = TextureVisuals(uv=tc, material=PBRMaterial(
        name=name, baseColorTexture=Image.fromarray(img), metallicFactor=0.15, roughnessFactor=0.6))
    return m


def textured_box(name, parent, w, h, d, img, uv, matrix):
    """grey box whose front (+z) face shows a sub-rectangle of img; children: <name>_body, <name>_face"""
    group(name, parent, matrix)
    add(box((w, h, d)), name + '_body', name, M_GREY)
    add(quad(w, h, img, uv, name + '_face'), name + '_face', name, matrix=Tm((0, 0, d / 2 + 0.0005)))


ROOT = 'ControlPanel'
group(ROOT, S.graph.base_frame, Tm((-W, 0, 0)))   # cabinet centred on x=0

# ---------- LEFT SECTION (closed door with operator controls) ----------
group('LeftSection', ROOT)
add(box((W, body_h, D - T), (W / 2, yb, -T / 2)), 'L_body', 'LeftSection', M_GREY)
add(box((W, PL, D - 0.04), (W / 2, PL / 2, -0.02)), 'L_plinth', 'LeftSection', M_DARK)

group('LeftDoor', 'LeftSection', Tm((W / 2, yb, z_front - T / 2)))
add(box((dw, dh, T)), 'LeftDoor_Panel', 'LeftDoor', M_GREY)
add(quad(dw, dh, tex_door, name='LeftDoor_Face'), 'LeftDoor_Face', 'LeftDoor', matrix=Tm((0, 0, T / 2 + 0.0005)))

TEX_W, TEX_H = tex_door.shape[1], tex_door.shape[0]


def door_rect(px0, py0, px1, py1):
    """door-texture pixel rect -> (uv, width, height, centre x, centre y) in LeftDoor local space"""
    uv = (px0 / TEX_W, py0 / TEX_H, px1 / TEX_W, py1 / TEX_H)
    w, h = (uv[2] - uv[0]) * dw, (uv[3] - uv[1]) * dh
    cx, cy = ((uv[0] + uv[2]) / 2 - 0.5) * dw, (0.5 - (uv[1] + uv[3]) / 2) * dh
    return uv, w, h, cx, cy


feat = json.load(open(os.path.join(HERE, 'features.json')))
for name, (x0, y0, x1, y1, depth) in feat.items():
    uv, w, h, cx, cy = door_rect(x0, y0, x1, y1)
    textured_box(name, 'LeftDoor', w, h, depth, tex_door, uv, Tm((cx, cy, T / 2 + depth / 2)))

# live HMI display surface (same pixels as the photo until Unity draws on it)
sx0, sy0, sx1, sy1 = 258, 205, 485, 358
uv, w, h, cx, cy = door_rect(sx0, sy0, sx1, sy1)
hmi_depth = feat['HMI'][4]
add(quad(w, h, tex_door, uv, 'HMI_Screen'), 'HMI_Screen', 'LeftDoor',
    matrix=Tm((cx, cy, T / 2 + hmi_depth + 0.0008)))

# ---------- RIGHT SECTION (open-able door, interior photo) ----------
group('RightSection', ROOT)
x0, xc = W, W + W / 2
fr = dict(l=0.042, r=0.031, t=0.045, b=0.12)  # front frame widths around the opening
wall, fd = 0.02, 0.03
P = 'RightSection'
add(box((W, body_h, wall), (xc, yb, -D / 2 + wall / 2)), 'R_back', P, M_GREY)
add(box((wall, body_h, D), (x0 + wall / 2, yb, 0)), 'R_side_L', P, M_GREY)
add(box((wall, body_h, D), (x0 + W - wall / 2, yb, 0)), 'R_side_R', P, M_GREY)
add(box((W, wall, D), (xc, H - wall / 2, 0)), 'R_roof', P, M_GREY)
add(box((W, PL, D - 0.04), (xc, PL / 2, -0.02)), 'R_plinth', P, M_DARK)
add(box((W, fr['b'], D - fd), (xc, PL + fr['b'] / 2, -fd / 2)), 'R_floor', P, M_FLOOR)
add(box((fr['l'], body_h, fd), (x0 + fr['l'] / 2, yb, z_front - fd / 2)), 'R_frame_L', P, M_GREY)
add(box((fr['r'], body_h, fd), (x0 + W - fr['r'] / 2, yb, z_front - fd / 2)), 'R_frame_R', P, M_GREY)
add(box((W, fr['t'], fd), (xc, H - fr['t'] / 2, z_front - fd / 2)), 'R_frame_T', P, M_GREY)
add(box((W, fr['b'], fd), (xc, PL + fr['b'] / 2, z_front - fd / 2)), 'R_frame_B', P, M_GREY)

ow, oh = W - fr['l'] - fr['r'], body_h - fr['t'] - fr['b']
ocx, ocy = x0 + fr['l'] + ow / 2, PL + fr['b'] + oh / 2
z_plate = -D / 2 + wall + 0.06
add(quad(ow, oh, tex_inner, name='R_Interior'), 'R_Interior', P, matrix=Tm((ocx, ocy, z_plate)))
dep = D - wall - 0.06 - fd
for nm, x in [('R_jamb_L', x0 + fr['l']), ('R_jamb_R', x0 + W - fr['r'])]:
    add(box((0.004, oh, dep), (x, ocy, z_plate + dep / 2)), nm, P, M_GREY)
add(box((ow, 0.004, dep), (ocx, PL + fr['b'], z_plate + dep / 2)), 'R_sill', P, M_GREY)
add(box((ow, 0.004, dep), (ocx, H - fr['t'], z_plate + dep / 2)), 'R_head', P, M_GREY)

# door: pivot node sits on the hinge axis (right edge, front face); rotate it about local Y to open
hinge_x = x0 + W
group('RightDoor_Hinge', P, Tm((hinge_x, yb, z_front)) @ Rm(np.radians(DOOR_DEG), (0, 1, 0)))
group('RightDoor', 'RightDoor_Hinge', Tm((-dw / 2, 0, -T / 2)))
add(box((dw, dh, T)), 'RightDoor_Panel', 'RightDoor', M_GREY)
add(quad(dw, dh, tex_rout, name='RightDoor_Outer'), 'RightDoor_Outer', 'RightDoor', matrix=Tm((0, 0, T / 2 + 0.0005)))
add(quad(dw, dh, tex_dinr, name='RightDoor_Inner'), 'RightDoor_Inner', 'RightDoor',
    matrix=Tm((0, 0, -T / 2 - 0.0005)) @ Rm(np.pi, (0, 1, 0)))
for i, yy in enumerate([PL + 0.25, H - 0.3]):
    add(trimesh.creation.cylinder(radius=0.012, height=0.14), f'R_hinge_{i}', P, M_METAL,
        Tm((hinge_x + 0.004, yy, z_front + 0.004)) @ Rm(np.pi / 2, (1, 0, 0)))

# ---------- EYE BOLTS ----------
group('EyeBolts', ROOT)
for i, x in enumerate([0.07, W - 0.07, W + 0.07, 2 * W - 0.07]):
    add(trimesh.creation.torus(major_radius=0.028, minor_radius=0.007), f'eyebolt_{i}', 'EyeBolts', M_METAL,
        Tm((x, H + 0.045, z_front - 0.05)))
    add(trimesh.creation.cylinder(radius=0.012, height=0.02), f'eyebolt_nut_{i}', 'EyeBolts', M_METAL,
        Tm((x, H + 0.01, z_front - 0.05)) @ Rm(np.pi / 2, (1, 0, 0)))

# empty marker 1 m in front of the cabinet centre: lets Unity tell which way is "front"
group('Front_Marker', ROOT, Tm((W, 1.0, z_front + 1.0)))

S.export(OUT)
print('wrote', OUT, 'bounds', S.bounds.round(3).tolist())
