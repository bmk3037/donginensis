using System;

namespace Dongin.DigitalTwin
{
    public enum PanelState { Stop, Run, Fault }

    /// <summary>
    /// 제어반 1회 측정값. JSON 필드 이름이 그대로 서버(API) 응답 키가 된다.
    /// 예) {"panelId":"LH2-CP-01","state":"RUN","frequencyHz":45.2,"motorCurrentA":31.0,
    ///      "powerKw":9.4,"energySavingPct":57,"panelTempC":33.1,"dcBusV":540,
    ///      "doorOpen":false,"alarms":[],"timestamp":"2026-10-05T10:00:00"}
    /// </summary>
    [Serializable]
    public class PanelTelemetry
    {
        public string panelId = "";
        public string state = "STOP";      // RUN / STOP / FAULT
        public float frequencyHz;          // 인버터 출력 주파수
        public float motorCurrentA;        // 모터 전류
        public float powerKw;              // 소비 전력
        public float energySavingPct;      // 정속 운전 대비 절감률
        public float panelTempC;           // 제어반 내부 온도
        public float dcBusV;               // 인버터 DC 링크 전압
        public bool doorOpen;              // 도어 리밋스위치
        public string[] alarms = new string[0];
        public string timestamp = "";

        public PanelState State
        {
            get
            {
                switch ((state ?? "").Trim().ToUpperInvariant())
                {
                    case "RUN":
                    case "RUNNING":
                    case "1":
                        return PanelState.Run;
                    case "FAULT":
                    case "TRIP":
                    case "ALARM":
                    case "2":
                        return PanelState.Fault;
                    default:
                        return PanelState.Stop;
                }
            }
        }

        public bool HasAlarm => alarms != null && alarms.Length > 0;
    }
}
