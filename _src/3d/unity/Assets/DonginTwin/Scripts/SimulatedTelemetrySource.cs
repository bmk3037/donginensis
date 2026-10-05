using System;
using UnityEngine;
using Random = UnityEngine.Random;

namespace Dongin.DigitalTwin
{
    /// <summary>
    /// 실제 장비 없이 트윈을 시연하기 위한 가상 데이터.
    /// 인버터(VFD)로 펌프/팬을 구동하는 상황: 전력 ∝ 주파수³ (팬·펌프 상사 법칙).
    /// </summary>
    public class SimulatedTelemetrySource : TelemetrySource
    {
        public string panelId = "LH2-CP-01";
        public float ratedPowerKw = 22f;
        public float ratedCurrentA = 42f;
        [Tooltip("운전 주파수 설정값 (Hz)")]
        public float setpointHz = 45f;
        public float rampHzPerSec = 5f;
        public float ambientC = 24f;
        public float publishInterval = 0.2f;
        [Tooltip("분당 랜덤 고장 발생 확률 (0 = 발생 안 함)")]
        public float faultsPerMinute;

        bool running = true;
        bool fault;
        bool doorOpen;
        string faultText = "";
        float hz;
        float tempC;
        float timer;

        void Start()
        {
            tempC = ambientC + 6f;
            Connected = true;
            StatusText = "Simulator";
        }

        void Update()
        {
            float dt = Time.deltaTime;
            if (faultsPerMinute > 0f && running && !fault && Random.value < faultsPerMinute * dt / 60f)
                Trip("Overcurrent (OC)");

            // process demand swings slowly around the setpoint
            float targetHz = running && !fault ? Mathf.Clamp(setpointHz + Mathf.Sin(Time.time * 0.15f) * 3f, 0f, 60f) : 0f;
            hz = Mathf.MoveTowards(hz, targetHz, rampHzPerSec * dt);

            float load = Mathf.Pow(hz / 60f, 3f);
            float tempTarget = ambientC + 4f + 18f * load - (doorOpen ? 2f : 0f);
            tempC = Mathf.Lerp(tempC, tempTarget, 1f - Mathf.Exp(-dt / 40f));

            timer += dt;
            if (timer < publishInterval) return;
            timer = 0f;

            bool spinning = hz > 0.1f;
            string[] alarms = fault ? new[] { faultText }
                : tempC > 45f ? new[] { "Panel temperature high" }
                : new string[0];

            Publish(new PanelTelemetry
            {
                panelId = panelId,
                state = fault ? "FAULT" : running ? "RUN" : "STOP",
                frequencyHz = hz,
                motorCurrentA = spinning ? ratedCurrentA * (0.3f + 0.7f * load) + Random.Range(-0.3f, 0.3f) : 0f,
                powerKw = ratedPowerKw * load,
                energySavingPct = spinning ? (1f - load) * 100f : 0f,
                panelTempC = tempC,
                dcBusV = 540f + Random.Range(-3f, 3f),
                doorOpen = doorOpen,
                alarms = alarms,
                timestamp = DateTime.Now.ToString("s"),
            });
        }

        void Trip(string reason)
        {
            fault = true;
            running = false;
            faultText = reason;
        }

        public override void SendCommand(string command)
        {
            switch ((command ?? "").ToLowerInvariant())
            {
                case "start":
                    if (!fault) running = true;
                    break;
                case "stop":
                    running = false;
                    break;
                case "reset":
                    fault = false;
                    faultText = "";
                    break;
                case "fault":
                    Trip("Overcurrent (OC)");
                    break;
                case "door":
                    doorOpen = !doorOpen;
                    break;
                default:
                    base.SendCommand(command);
                    break;
            }
        }
    }
}
