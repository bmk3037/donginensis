# 혁신제품 안내문 원본

`files/innov/`의 홍보용 안내문을 만드는 원본입니다. 홈페이지에 공개되는 자료이므로 핵심특허 내용·내부 일정·원가·외국산 비율은 넣지 않습니다.

내부용 **추진 전략(DI-IN-02, 대외비)** 은 공개하지 않고 `files/innov/private/`에 암호화해서만 올립니다(자료실 혁신제품 폴더의 🔒 행, 비밀번호 필요). 원본 PDF·생성 스크립트는 저장소 밖에 보관합니다. 암호화 방법은 `_src/private/README.md`를 보세요.

| 파일 | 내용 |
|---|---|
| `DI-IN-01.html` | 지능형 제어반 혁신제품 안내 (A4 1쪽, Pretendard) |
| `render.js` | PDF 생성 → `files/innov/DI-IN-01_Rev00.pdf` |

고치는 방법: `DI-IN-01.html` 수정 → `NODE_PATH=$(npm root -g) node _src/innov/render.js` (Playwright). 1쪽을 넘으면 `OVERFLOW`가 출력됩니다.
