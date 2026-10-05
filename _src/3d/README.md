# 3D 변환용 지능형제어반 사진

| 파일 | 용도 |
|---|---|
| `control-panel_3d_white.png` | 순백 배경 (2048×2048). 대부분의 Image-to-3D 서비스 입력용 |
| `control-panel_3d_transparent.png` | 투명 배경 PNG. 배경 제거를 직접 하는 서비스나 합성용 |

- 원본: `img/sites/lh2-panel-overview.jpg` (LH2 충전소 지능형제어반)
- 처리: 제어반 영역 크롭 → BiRefNet 배경 제거 → 푸른 야간 색조 보정 → 흰 배경 중앙 배치
- 참고: 원본이 1344px 사진이라 2배 확대됨. 디테일이 부족하면 더 큰 원본 사진으로 다시 만들 것.

## 3D 모델 (GLB)

| 파일 | 내용 |
|---|---|
| `control_panel_open.glb` | 오른쪽 문 115° 열림 (내부 부품 사진 보임) |
| `control_panel_closed.glb` | 양쪽 문 닫힘 |
| `unity/Assets/DonginTwin/Models/control_panel_twin.glb` | 디지털트윈용: 문 경첩 피벗, 램프·HMI 노드 분리 → [unity/README.md](unity/README.md) |
| `control_panel_preview.png` | 미리보기 렌더 (열림 정면·3/4, 닫힘 3/4 좌·우) |

- 실제 크기(미터) 기준: 폭 1.52 × 높이 2.0(아이볼트 포함 2.08) × 깊이 0.6, 좌측 하단 바닥 기준 Y-up
- 박스 형상(외함·문·플린스·아이볼트·힌지·손잡이·HMI·버튼 돌출)에 원본 사진을 정면으로 펴서 텍스처로 입힌 방식
- 재생성: `pip install trimesh opencv-python-headless pillow numpy` 후 `python3 build_glb.py`
  (기본 출력은 디지털트윈용 GLB. `DOOR_DEG`로 문 각도, `OUT`으로 파일명 지정. 부품 돌출 위치는 `features.json`)
- 열어보기: Windows "3D 뷰어", https://gltf-viewer.donmccurdy.com , Blender 등
