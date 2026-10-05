using System;
using System.Collections;
using System.Text;
using UnityEngine;
using UnityEngine.Networking;

namespace Dongin.DigitalTwin
{
    /// <summary>
    /// REST API를 주기적으로 조회한다.
    ///   GET  {url}          → PanelTelemetry JSON
    ///   POST {url}/command  ← {"command":"start"}
    /// 테스트 서버: _src/3d/unity/server/panel_server.py
    /// http:// 주소를 쓰려면 Player Settings > Other Settings > Allow downloads over HTTP 를 허용해야 한다.
    /// </summary>
    public class HttpTelemetrySource : TelemetrySource
    {
        public string url = "http://localhost:8080/api/panel";
        public float pollInterval = 0.5f;
        public int timeoutSeconds = 3;

        void OnEnable()
        {
            StartCoroutine(PollLoop());
        }

        void OnDisable()
        {
            StopAllCoroutines();
            Connected = false;
        }

        IEnumerator PollLoop()
        {
            while (true)
            {
                yield return Poll();
                yield return new WaitForSeconds(pollInterval);
            }
        }

        IEnumerator Poll()
        {
            using (var req = UnityWebRequest.Get(url))
            {
                req.timeout = timeoutSeconds;
                UnityWebRequestAsyncOperation op;
                try
                {
                    op = req.SendWebRequest();
                }
                catch (InvalidOperationException e)
                {
                    Connected = false;
                    StatusText = "HTTP blocked: " + e.Message;
                    yield break;
                }
                yield return op;

                if (req.result != UnityWebRequest.Result.Success)
                {
                    Connected = false;
                    StatusText = req.error;
                    yield break;
                }

                PanelTelemetry telemetry;
                try
                {
                    telemetry = JsonUtility.FromJson<PanelTelemetry>(req.downloadHandler.text);
                }
                catch (ArgumentException e)
                {
                    Connected = false;
                    StatusText = "Bad JSON: " + e.Message;
                    yield break;
                }
                Connected = true;
                StatusText = "HTTP " + url;
                Publish(telemetry);
            }
        }

        public override void SendCommand(string command)
        {
            StartCoroutine(PostCommand(command));
        }

        IEnumerator PostCommand(string command)
        {
            byte[] body = Encoding.UTF8.GetBytes("{\"command\":\"" + command + "\"}");
            using (var req = new UnityWebRequest(url.TrimEnd('/') + "/command", UnityWebRequest.kHttpVerbPOST))
            {
                req.uploadHandler = new UploadHandlerRaw(body);
                req.downloadHandler = new DownloadHandlerBuffer();
                req.SetRequestHeader("Content-Type", "application/json");
                req.timeout = timeoutSeconds;
                UnityWebRequestAsyncOperation op;
                try
                {
                    op = req.SendWebRequest();
                }
                catch (InvalidOperationException e)
                {
                    Debug.LogWarning("[HttpTelemetrySource] " + e.Message);
                    yield break;
                }
                yield return op;
                if (req.result != UnityWebRequest.Result.Success)
                    Debug.LogWarning($"[HttpTelemetrySource] command '{command}' failed: {req.error}");
            }
        }
    }
}
