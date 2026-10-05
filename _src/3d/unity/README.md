# 지능형제어반 디지털트윈 (Unity)

`control_panel_twin.glb` 3D 모델에 실시간 운전 데이터를 연결한 Unity 디지털트윈 예제입니다.

- **도어**: 도어 리밋스위치 신호(`doorOpen`)에 맞춰 오른쪽 문이 열리고 닫힘. 문을 클릭하거나 `D` 키로도 열고 닫을 수 있음
- **표시등**: 운전(RUN)이면 녹색, 정지(STOP)면 적색, 고장(FAULT)이면 적색 점멸
- **HMI 화면**: 모델의 터치패널 위치에 주파수·전류·전력·절감률·반내 온도·알람을 실시간 표시
- **대시보드**(화면 왼쪽 위): 운전·정지·리셋 명령 전송, 데이터 연결 상태 표시
- **카메라**: 오른쪽 드래그로 회전, 휠로 확대·축소, 가운데 드래그로 이동

## 폴더 구성

```
Assets/DonginTwin/
  Models/control_panel_twin.glb      3D 모델 (문 경첩 피벗, 램프·HMI 노드 분리)
  Scripts/
    PanelTelemetry.cs                데이터 형식 (JSON 키 = 필드 이름)
    TelemetrySource.cs               데이터 공급원 공통 베이스
    SimulatedTelemetrySource.cs      가상 데이터 (장비 없이 시연)
    HttpTelemetrySource.cs           REST API 조회 + 명령 전송
    ControlPanelTwin.cs              모델 ↔ 데이터 연결 (도어·램프·HMI·대시보드)
    OrbitCameraController.cs         마우스 카메라
    InputCompat.cs                   구/신 Input System 모두 지원
  Editor/TwinSetupMenu.cs            메뉴 한 번으로 씬 구성
server/panel_server.py               테스트용 REST 서버 (가상 데이터 / Modbus TCP)
```

## 실행 방법

1. **Unity 프로젝트 만들기**: Unity 2021.3 LTS 이상(2022.3 LTS, Unity 6 권장), 3D(Built-in) 또는 URP 템플릿
2. **glTFast 설치**: `Window > Package Manager > + > Add package by name…`에 `com.unity.cloud.gltfast` 입력
3. **폴더 복사**: 이 저장소의 `Assets/DonginTwin` 폴더를 프로젝트의 `Assets`에 그대로 복사
4. **씬 구성**: 메뉴 `Dongin > Setup Digital Twin Scene` 실행. 모델·데이터·카메라·조명이 자동으로 배치됨
5. **Play**: 처음에는 가상 데이터로 동작함. 대시보드의 `고장 발생` 버튼(`F` 키)으로 고장 상태도 확인 가능

## 실제 데이터 연결

### 1) 테스트 서버로 HTTP 연결 확인

```bash
cd server
python3 panel_server.py                 # http://localhost:8080/api/panel
```

Unity에서는 `DigitalTwin_ControlPanel` 오브젝트를 다음과 같이 바꿉니다.
- `HttpTelemetrySource`를 켜고 `SimulatedTelemetrySource`는 끔
- `ControlPanelTwin`의 `Source` 칸에 `HttpTelemetrySource`를 지정
- `Edit > Project Settings > Player > Other Settings > Allow downloads over HTTP`를 **Always allowed**로 변경 (https 주소를 쓰면 필요 없음)

### 2) 현장 인버터·PLC (Modbus TCP)

```bash
pip install pymodbus
python3 panel_server.py --modbus 192.168.0.10 --unit 1
```

`panel_server.py`의 `REGISTER_MAP`, `STATUS_REGISTER`, `COMMAND_REGISTER` 주소와 배율은 **예시값**입니다.
현장 인버터·PLC 매뉴얼에 맞게 고쳐 써야 합니다.

### API 형식

```
GET  /api/panel
{"panelId":"LH2-CP-01","state":"RUN","frequencyHz":45.2,"motorCurrentA":31.2,"powerKw":9.4,
 "energySavingPct":57.3,"panelTempC":33.1,"dcBusV":541,"doorOpen":false,"alarms":[],
 "timestamp":"2026-10-05T10:00:00"}

POST /api/panel/command   {"command":"start" | "stop" | "reset"}
```

기존 SCADA나 엣지 서버가 이 형식의 JSON만 내보내면 Unity 쪽 코드는 그대로 쓸 수 있습니다.
MQTT나 OPC UA로 받으려면 `TelemetrySource`를 상속한 클래스를 하나 추가하면 됩니다.

## 모델 노드 이름

스크립트는 아래 노드를 **이름으로** 찾습니다. 모델을 다시 만들 때도 이름을 유지해야 합니다.
모델 생성 스크립트: `_src/3d/build_glb.py`

| 노드 | 용도 |
|---|---|
| `RightDoor_Hinge` | 오른쪽 문 경첩 축 (Y축 회전) |
| `RightDoor` | 클릭 판정 |
| `Lamp_Green`, `Lamp_Red` | 운전·정지 표시등 |
| `HMI_Screen` | 실시간 화면 표시 위치 |
| `Front_Marker` | 제어반 정면 방향 기준 (빈 노드) |

## 검증 범위

- C# 스크립트는 Unity 2021 참조 어셈블리로 컴파일해 오류와 경고가 없음을 확인했습니다. 신 Input System 분기도 컴파일로 확인했습니다.
- `panel_server.py`는 가상 데이터 모드와, 가상 Modbus 장비를 붙인 모드 모두 동작을 확인했습니다.
- Unity 에디터에서 직접 실행해 보지는 않았습니다. 처음 Play할 때 Console 창의 메시지를 확인해 주세요.
