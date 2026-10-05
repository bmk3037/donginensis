"""지능형제어반 GLB 생성: 사진(control-panel_3d_white.png)을 정면 텍스처로 펴서 박스 형상에 입힌다.

  python3 build_glb.py                                   # 문 열림(115도) -> control_panel.glb
  DOOR_DEG=0 OUT=control_panel_closed.glb python3 build_glb.py
"""
import os
import numpy as np, cv2, trimesh
from PIL import Image
from trimesh.visual.material import PBRMaterial
from trimesh.visual import TextureVisuals

HERE = os.path.dirname(os.path.abspath(__file__))

src = cv2.cvtColor(cv2.imread(os.path.join(HERE, 'control-panel_3d_white.png')), cv2.COLOR_BGR2RGB)

def rectify(quad, w, h):
    M = cv2.getPerspectiveTransform(np.float32(quad), np.float32([[0,0],[w,0],[w,h],[0,h]]))
    return cv2.warpPerspective(src, M, (w,h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)

# quads in the 2048px cutout (TL, TR, BR, BL)
tex_door  = rectify([(297,295),(868,270),(868,1828),(297,1800)], 768, 2048)
tex_inner = rectify([(918,305),(1422,295),(1422,1712),(918,1725)], 688, 1920)
tex_dinr  = rectify([(1458,282),(1715,197),(1715,1835),(1462,1760)], 768, 2048)

tex_rout = tex_door.copy().astype(np.float32)
for (a,b,c,d) in [(205,160,540,412),(98,452,272,692),(355,498,655,632)]:
    top = tex_rout[b-6:b-2, a:c].mean(0); bot = tex_rout[d+2:d+6, a:c].mean(0)   # per-column steel colour
    t = np.linspace(0,1,d-b)[:,None,None]
    tex_rout[b:d, a:c] = top*(1-t) + bot*t
tex_rout = cv2.GaussianBlur(tex_rout,(0,0),0.6).clip(0,255).astype(np.uint8)
grey = np.median(tex_door[200:600, 450:700].reshape(-1,3), axis=0)
print('door grey', grey)

# ---- dimensions (m) ----
H, W, D = 2.0, 0.76, 0.60      # cabinet height / section width / depth
T = 0.025                      # door thickness
PL = 0.10                      # plinth height
z_front = D/2

S = trimesh.Scene()
def mat(rgb, metal=0.25, rough=0.55, name=None):
    return PBRMaterial(name=name, baseColorFactor=[*(np.array(rgb)/255.0), 1.0], metallicFactor=metal, roughnessFactor=rough)
M_GREY  = mat(grey, name='steel_grey')
M_DARK  = mat((45,47,50), 0.1, 0.7, 'plinth_dark')
M_BLACK = mat((25,25,28), 0.1, 0.5, 'black_plastic')
M_METAL = mat((185,188,192), 0.9, 0.3, 'zinc')

def add(mesh, name, material, T_=None):
    mesh = mesh.copy()
    if material is not None:
        mesh.visual = trimesh.visual.TextureVisuals(uv=np.zeros((len(mesh.vertices),2)), material=material)
    if T_ is not None: mesh.apply_transform(T_)
    S.add_geometry(mesh, node_name=name, geom_name=name)

def box(ext, center):
    return trimesh.creation.box(extents=ext, transform=trimesh.transformations.translation_matrix(center))

def quad(w, h, img, uv=(0,0,1,1), name='q', mat_kw={}):
    u0,v0,u1,v1 = uv   # uv in image coords (0..1, top-left origin)
    v = np.array([[-w/2,-h/2,0],[w/2,-h/2,0],[w/2,h/2,0],[-w/2,h/2,0]])
    f = np.array([[0,1,2],[0,2,3]])
    tc = np.array([[u0,1-v1],[u1,1-v1],[u1,1-v0],[u0,1-v0]])
    m = trimesh.Trimesh(v, f, process=False)
    m.visual = TextureVisuals(uv=tc, material=PBRMaterial(name=name, baseColorTexture=Image.fromarray(img), metallicFactor=0.15, roughnessFactor=0.6, **mat_kw))
    return m

def tbox(w, h, d, img, uv, name):
    """box whose front (+z) face shows a sub-rectangle of img, other faces grey"""
    g = trimesh.Scene()
    b = box((w,h,d),(0,0,0)); b.visual = trimesh.visual.TextureVisuals(uv=np.zeros((8,2)), material=M_GREY)
    q = quad(w, h, img, uv, name+'_face'); q.apply_translation((0,0,d/2+0.0005))
    return [b, q]

def place(parts, name, T_):
    for i,p in enumerate(parts):
        p = p.copy(); p.apply_transform(T_)
        S.add_geometry(p, node_name=f'{name}_{i}', geom_name=f'{name}_{i}')

Tm = trimesh.transformations.translation_matrix
Rm = trimesh.transformations.rotation_matrix

body_h = H - PL
yb = PL + body_h/2

# ---------- LEFT SECTION (closed) ----------
add(box((W, body_h, D-T), (W/2, yb, -T/2)), 'L_body', M_GREY)
add(box((W, PL, D-0.04), (W/2, PL/2, -0.02)), 'L_plinth', M_DARK)
# door with photo texture
dw, dh = W-0.006, body_h-0.006
place(tbox(dw, dh, T, tex_door, (0,0,1,1), 'L_door'), 'L_door', Tm((W/2, yb, z_front-T/2)))
# raised details reusing door texture (uv in door image fraction)
def door_uv(px0,py0,px1,py1):
    return (px0/768, py0/2048, px1/768, py1/2048)
def door_pos(u,v):  # door-texture fraction -> world x,y on left door front
    return (u-0.5)*dw + W/2, (0.5-v)*dh + yb
def relief(px0,py0,px1,py1,depth,name):
    u0,v0,u1,v1 = door_uv(px0,py0,px1,py1)
    cx, cy = door_pos((u0+u1)/2, (v0+v1)/2)
    w, h = (u1-u0)*dw, (v1-v0)*dh
    place(tbox(w, h, depth, tex_door, (u0,v0,u1,v1), name), name, Tm((cx, cy, z_front+depth/2)))
# locate features in rectified door texture
import json
feat = json.load(open(os.path.join(HERE, 'features.json')))
for k,(x0,y0,x1,y1,dep) in feat.items(): relief(x0,y0,x1,y1,dep,k)

# ---------- RIGHT SECTION (door open) ----------
x0 = W; xc = W + W/2
fr = dict(l=0.042, r=0.031, t=0.045, b=0.12)    # front frame widths around opening
wall = 0.02
fd = 0.03
add(box((W, body_h, wall), (xc, yb, -D/2+wall/2)), 'R_back', M_GREY)
add(box((wall, body_h, D), (x0+wall/2, yb, 0)), 'R_side_L', M_GREY)
add(box((wall, body_h, D), (x0+W-wall/2, yb, 0)), 'R_side_R', M_GREY)
add(box((W, wall, D), (xc, H-wall/2, 0)), 'R_roof', M_GREY)
add(box((W, PL, D-0.04), (xc, PL/2, -0.02)), 'R_plinth', M_DARK)
add(box((W, fr['b'], D-fd), (xc, PL+fr['b']/2, -fd/2)), 'R_floor', mat((150,152,156), name='inner_floor'))
# front frame
fd = 0.03
add(box((fr['l'], body_h, fd), (x0+fr['l']/2, yb, z_front-fd/2)), 'R_frame_L', M_GREY)
add(box((fr['r'], body_h, fd), (x0+W-fr['r']/2, yb, z_front-fd/2)), 'R_frame_R', M_GREY)
add(box((W, fr['t'], fd), (xc, H-fr['t']/2, z_front-fd/2)), 'R_frame_T', M_GREY)
add(box((W, fr['b'], fd), (xc, PL+fr['b']/2, z_front-fd/2)), 'R_frame_B', M_GREY)
# interior mounting plate with photo (sits recessed)
ow = W - fr['l'] - fr['r']; oh = body_h - fr['t'] - fr['b']
ocx = x0 + fr['l'] + ow/2; ocy = PL + fr['b'] + oh/2
q = quad(ow, oh, tex_inner, name='R_interior'); q.apply_translation((ocx, ocy, -D/2+wall+0.06))
S.add_geometry(q, node_name='R_interior', geom_name='R_interior')
# inner side walls of the opening so the recess reads as depth
dep = D - wall - 0.06 - fd
for nm,x in [('R_jamb_L', x0+fr['l']), ('R_jamb_R', x0+W-fr['r'])]:
    add(box((0.004, oh, dep), (x, ocy, -D/2+wall+0.06+dep/2)), nm, M_GREY)
add(box((ow, 0.004, dep), (ocx, PL+fr['b'], -D/2+wall+0.06+dep/2)), 'R_sill', M_GREY)
add(box((ow, 0.004, dep), (ocx, H-fr['t'], -D/2+wall+0.06+dep/2)), 'R_head', M_GREY)

# open door: hinge on right edge, opened 115 deg outward
import os
ang = np.radians(float(os.environ.get('DOOR_DEG','115')))
door_parts = []
b = box((dw, dh, T), (0,0,0)); b.visual = trimesh.visual.TextureVisuals(uv=np.zeros((8,2)), material=M_GREY); door_parts.append(b)
qi = quad(dw, dh, tex_dinr, name='R_door_inner'); qi.apply_transform(Rm(np.pi,(0,1,0))); qi.apply_translation((0,0,-T/2-0.0005)); door_parts.append(qi)
# outer face: reuse lower louver area of left door texture for a matching look
qo = quad(dw, dh, tex_rout, name='R_door_outer')
qo.apply_translation((0,0,T/2+0.0005)); door_parts.append(qo)
hinge_x = x0 + W
Td = Tm((hinge_x, yb, z_front)) @ Rm(ang,(0,1,0)) @ Tm((-dw/2, 0, -T/2))
place(door_parts, 'R_door', Td)
# hinges
for i,yy in enumerate([PL+0.25, H-0.3]):
    c = trimesh.creation.cylinder(radius=0.012, height=0.14)
    c.apply_transform(Rm(np.pi/2,(1,0,0)))
    add(c, f'R_hinge_{i}', M_METAL, Tm((hinge_x+0.004, yy, z_front+0.004)))

# ---------- EYE BOLTS ----------
for i,x in enumerate([0.07, W-0.07, W+0.07, 2*W-0.07]):
    for zz in [0.0]:
        tor = trimesh.creation.torus(major_radius=0.028, minor_radius=0.007)
        add(tor, f'eyebolt_{i}', M_METAL, Tm((x, H+0.045, z_front-0.05)))
        add(trimesh.creation.cylinder(radius=0.012, height=0.02), f'eyebolt_nut_{i}', M_METAL, Tm((x, H+0.01, z_front-0.05)) @ Rm(np.pi/2,(1,0,0)))

# center on floor
S.apply_transform(Tm((-W, 0, 0)))
S.export(os.environ.get('OUT','control_panel.glb'))
print('ok', S.bounds)
