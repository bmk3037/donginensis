using System;
using UnityEngine;

namespace Dongin.DigitalTwin
{
    /// <summary>
    /// 측정값 공급원의 공통 베이스. 시뮬레이터 / HTTP / (추가 시) MQTT·OPC UA 등을 같은 방식으로 꽂아 쓴다.
    /// </summary>
    public abstract class TelemetrySource : MonoBehaviour
    {
        public event Action<PanelTelemetry> TelemetryReceived;

        public PanelTelemetry Latest { get; private set; }
        public bool Connected { get; protected set; }
        public string StatusText { get; protected set; } = "";

        protected void Publish(PanelTelemetry telemetry)
        {
            Latest = telemetry;
            TelemetryReceived?.Invoke(telemetry);
        }

        /// <summary>제어 명령: start / stop / reset (시뮬레이터는 fault, door 추가 지원)</summary>
        public virtual void SendCommand(string command)
        {
            Debug.Log($"[{GetType().Name}] command '{command}' is not supported by this source.");
        }
    }
}
