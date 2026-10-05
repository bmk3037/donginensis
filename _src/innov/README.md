# 혁신제품 안내문 원본

`files/innov/`의 홍보용 안내문을 만드는 원본입니다. 홈페이지에 공개되는 자료이므로 핵심특허 내용·내부 일정·원가·외국산 비율은 넣지 않습니다.

| 파일 | 내용 |
|---|---|
| `DI-IN-01.html` | 지능형 제어반 혁신제품 안내 (A4 1쪽, Pretendard) |
| `render.js` | PDF 생성 → `files/innov/DI-IN-01_Rev00.pdf` |

고치는 방법: `DI-IN-01.html` 수정 → `NODE_PATH=$(npm root -g) node _src/innov/render.js` (Playwright). 1쪽을 넘으면 `OVERFLOW`가 출력됩니다.
