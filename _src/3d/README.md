# 3D 변환용 지능형제어반 사진

| 파일 | 용도 |
|---|---|
| `control-panel_3d_white.png` | 순백 배경 (2048×2048). 대부분의 Image-to-3D 서비스 입력용 |
| `control-panel_3d_transparent.png` | 투명 배경 PNG. 배경 제거를 직접 하는 서비스나 합성용 |

- 원본: `img/sites/lh2-panel-overview.jpg` (LH2 충전소 지능형제어반)
- 처리: 제어반 영역 크롭 → BiRefNet 배경 제거 → 푸른 야간 색조 보정 → 흰 배경 중앙 배치
- 참고: 원본이 1344px 사진이라 2배 확대됨. 디테일이 부족하면 더 큰 원본 사진으로 다시 만들 것.
