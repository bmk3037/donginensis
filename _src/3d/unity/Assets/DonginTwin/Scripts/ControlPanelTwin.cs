using UnityEngine;
using UnityEngine.UI;

namespace Dongin.DigitalTwin
{
    /// <summary>
    /// control_panel_twin.glb 모델과 측정값을 연결한다.
    ///  - RightDoor_Hinge : 도어 리밋스위치 값(doorOpen) 또는 클릭으로 열고 닫음
    ///  - Lamp_Green/Red  : RUN = 녹색 점등, STOP = 적색 점등, FAULT = 적색 점멸
    ///  - HMI_Screen      : 실시간 운전값 표시
    ///  - 화면 왼쪽 위 대시보드에서 운전/정지/리셋 명령 전송
    /// 노드 이름은 _src/3d/build_glb.py 에서 정한 것과 같아야 한다.
    /// </summary>
    public class ControlPanelTwin : MonoBehaviour
    {
        [Header("Data")]
        public TelemetrySource source;

        [Header("Model")]
        [Tooltip("가져온 control_panel_twin.glb 인스턴스. 비우면 이 오브젝트의 자식에서 찾음")]
        public Transform model;

        [Header("Door")]
        public float doorOpenAngle = 110f;
        public float doorSpeed = 120f;

        [Header("Look")]
        public Color runColor = new Color(0.15f, 1f, 0.35f);
        public Color stopColor = new Color(1f, 0.15f, 0.1f);
        public float lampEmission = 4f;
        public bool showDashboard = true;

        Transform hinge, rightDoor, frontMarker;
        Quaternion hingeClosed;
        float doorSign = 1f, doorAngle;
        bool? doorOverride;        // 클릭으로 연 상태. 실제 도어 신호가 바뀌면 해제
        bool lastTelemetryDoor;
        Vector3 frontDir = Vector3.forward;

        Lamp green, red;
        Text hmiText;
        PanelTelemetry data;
        Rect dashRect;
        Vector2 pressPos;

        class Lamp
        {
            public Material material;
            public Light light;
            public Color color;
        }

        void Start()
        {
            if (!model) model = transform;
            if (!source) source = GetComponent<TelemetrySource>();

            hinge = Find(model, "RightDoor_Hinge");
            rightDoor = Find(model, "RightDoor");
            frontMarker = Find(model, "Front_Marker");
            if (!hinge || !rightDoor)
                Debug.LogError("[ControlPanelTwin] 'RightDoor_Hinge' 노드를 찾지 못했습니다. control_panel_twin.glb 를 model 에 지정했는지 확인하세요.");

            if (frontMarker)
            {
                Vector3 d = frontMarker.position - PanelBounds().center;
                d.y = 0f;
                if (d.sqrMagnitude > 1e-6f) frontDir = d.normalized;
            }

            AddColliders();
            if (hinge)
            {
                hingeClosed = hinge.localRotation;
                doorSign = DetectOpeningDirection();
            }

            Transform g = Find(model, "Lamp_Green"), r = Find(model, "Lamp_Red"), hmi = Find(model, "HMI_Screen");
            if (g) green = MakeLamp(g, runColor);
            if (r) red = MakeLamp(r, stopColor);
            if (hmi) hmiText = MakeHmi(hmi);

            if (source)
            {
                source.TelemetryReceived += OnTelemetry;
                if (source.Latest != null) OnTelemetry(source.Latest);
            }
        }

        void OnDestroy()
        {
            if (source) source.TelemetryReceived -= OnTelemetry;
        }

        void OnTelemetry(PanelTelemetry t)
        {
            data = t;
            if (t.doorOpen != lastTelemetryDoor)
            {
                lastTelemetryDoor = t.doorOpen;
                doorOverride = null;
            }
        }

        bool DoorTargetOpen => doorOverride ?? (data != null && data.doorOpen);

        public void ToggleDoor() => doorOverride = !DoorTargetOpen;

        void Update()
        {
            HandleInput();

            if (hinge)
            {
                doorAngle = Mathf.MoveTowards(doorAngle, DoorTargetOpen ? doorOpenAngle : 0f, doorSpeed * Time.deltaTime);
                hinge.localRotation = hingeClosed * Quaternion.AngleAxis(doorSign * doorAngle, Vector3.up);
            }

            PanelState state = data != null ? data.State : PanelState.Stop;
            bool blink = Mathf.Repeat(Time.time * 2f, 1f) < 0.5f;
            SetLamp(green, data != null && state == PanelState.Run);
            SetLamp(red, data != null && (state == PanelState.Stop || (state == PanelState.Fault && blink)));

            if (hmiText) hmiText.text = HmiText();
        }

        void HandleInput()
        {
            Vector2 mp = InputCompat.MousePosition;
            bool overDashboard = showDashboard && dashRect.Contains(new Vector2(mp.x, Screen.height - mp.y));

            if (InputCompat.MouseDown(0)) pressPos = mp;
            // a click (not a drag) on the right door toggles it
            if (InputCompat.MouseUp(0) && !overDashboard && (mp - pressPos).sqrMagnitude < 25f && rightDoor)
            {
                Camera cam = Camera.main;
                if (cam && Physics.Raycast(cam.ScreenPointToRay(mp), out RaycastHit hit, 100f) && hit.transform.IsChildOf(rightDoor))
                    ToggleDoor();
            }

            if (InputCompat.KeyDown(KeyCode.D)) ToggleDoor();
            if (!source) return;
            if (InputCompat.KeyDown(KeyCode.S)) source.SendCommand(data != null && data.State == PanelState.Run ? "stop" : "start");
            if (InputCompat.KeyDown(KeyCode.R)) source.SendCommand("reset");
            if (InputCompat.KeyDown(KeyCode.F)) source.SendCommand("fault");
        }

        // ---------------------------------------------------------------- HMI

        string HmiText()
        {
            if (data == null)
                return "<b>NO DATA</b>\n" + (source ? source.StatusText : "no source");

            string stateLabel, stateColor;
            switch (data.State)
            {
                case PanelState.Run: stateLabel = "RUN"; stateColor = "#3CFF6E"; break;
                case PanelState.Fault: stateLabel = "FAULT"; stateColor = "#FF4040"; break;
                default: stateLabel = "STOP"; stateColor = "#FFC83C"; break;
            }
            string temp = data.panelTempC > 45f ? $"<color=#FFA030>{data.panelTempC:0.0}</color>" : $"{data.panelTempC:0.0}";
            string text =
                $"<b>{data.panelId}</b>   <color={stateColor}><b>{stateLabel}</b></color>\n" +
                $"FREQ    {data.frequencyHz:0.0} Hz\n" +
                $"CURR    {data.motorCurrentA:0.0} A\n" +
                $"POWER   {data.powerKw:0.0} kW\n" +
                $"SAVING  {data.energySavingPct:0} %\n" +
                $"TEMP    {temp} °C";
            if (data.HasAlarm) text += $"\n<color=#FF4040>! {data.alarms[0]}</color>";
            return text;
        }

        Text MakeHmi(Transform screen)
        {
            MeshFilter mf = screen.GetComponentInChildren<MeshFilter>();
            if (!mf || !mf.sharedMesh) return null;
            Vector3 size = Vector3.Scale(mf.sharedMesh.bounds.size, Abs(mf.transform.lossyScale));
            Vector3 center = mf.transform.TransformPoint(mf.sharedMesh.bounds.center);

            const float pixelWidth = 480f;
            var canvasGo = new GameObject("HMI_Live", typeof(RectTransform), typeof(Canvas));
            canvasGo.GetComponent<Canvas>().renderMode = RenderMode.WorldSpace;
            var rt = (RectTransform)canvasGo.transform;
            rt.sizeDelta = new Vector2(pixelWidth, pixelWidth * size.y / Mathf.Max(size.x, 1e-4f));
            rt.position = center + frontDir * 0.0015f;
            rt.rotation = Quaternion.LookRotation(-frontDir, Vector3.up);
            rt.localScale = Vector3.one * (size.x / pixelWidth);
            rt.SetParent(screen, true);

            var bg = new GameObject("Background", typeof(RectTransform), typeof(Image));
            Stretch(bg.transform, canvasGo.transform, 0f);
            bg.GetComponent<Image>().color = new Color(0.02f, 0.06f, 0.12f, 1f);

            var textGo = new GameObject("Text", typeof(RectTransform), typeof(Text));
            Stretch(textGo.transform, canvasGo.transform, 14f);
            var text = textGo.GetComponent<Text>();
            text.font = BuiltinFont();
            text.supportRichText = true;
            text.alignment = TextAnchor.UpperLeft;
            text.color = new Color(0.85f, 0.95f, 1f);
            text.resizeTextForBestFit = true;
            text.resizeTextMinSize = 8;
            text.resizeTextMaxSize = 34;
            return text;
        }

        static void Stretch(Transform child, Transform parent, float padding)
        {
            var rt = (RectTransform)child;
            rt.SetParent(parent, false);
            rt.anchorMin = Vector2.zero;
            rt.anchorMax = Vector2.one;
            rt.offsetMin = new Vector2(padding, padding);
            rt.offsetMax = new Vector2(-padding, -padding);
        }

        static Font BuiltinFont()
        {
            // Unity 2022.2+ ships "LegacyRuntime.ttf"; older versions "Arial.ttf"
            foreach (string name in new[] { "LegacyRuntime.ttf", "Arial.ttf" })
            {
                try
                {
                    Font f = Resources.GetBuiltinResource<Font>(name);
                    if (f) return f;
                }
                catch (System.ArgumentException) { }
            }
            return null;
        }

        // -------------------------------------------------------------- lamps

        Lamp MakeLamp(Transform lamp, Color color)
        {
            Transform face = Find(lamp, lamp.name + "_face") ?? lamp;
            MeshFilter mf = face.GetComponentInChildren<MeshFilter>();
            if (!mf || !mf.sharedMesh) return null;
            Vector3 size = Vector3.Scale(mf.sharedMesh.bounds.size, Abs(mf.transform.lossyScale));
            Vector3 center = mf.transform.TransformPoint(mf.sharedMesh.bounds.center);
            float d = Mathf.Min(size.x, size.y) * 0.62f;

            // flattened sphere = lamp lens; uses the pipeline's default lit material so it works in Built-in and URP
            GameObject lens = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            lens.name = lamp.name + "_Lens";
            Destroy(lens.GetComponent<Collider>());
            lens.transform.SetPositionAndRotation(center + frontDir * (d * 0.1f), Quaternion.LookRotation(frontDir));
            lens.transform.localScale = new Vector3(d, d, d * 0.35f);
            lens.transform.SetParent(lamp, true);
            Renderer rend = lens.GetComponent<Renderer>();
            Material m = rend.material;
            m.EnableKeyword("_EMISSION");

            var lightGo = new GameObject(lamp.name + "_Light");
            lightGo.transform.position = center + frontDir * 0.06f;
            lightGo.transform.SetParent(lamp, true);
            Light light = lightGo.AddComponent<Light>();
            light.type = LightType.Point;
            light.range = 0.35f;
            light.color = color;
            light.intensity = 0f;

            return new Lamp { material = m, light = light, color = color };
        }

        void SetLamp(Lamp lamp, bool on)
        {
            if (lamp == null) return;
            lamp.material.color = on ? lamp.color : lamp.color * 0.3f;
            lamp.material.SetColor("_EmissionColor", on ? lamp.color * lampEmission : Color.black);
            lamp.light.intensity = on ? 0.8f : 0f;
        }

        // -------------------------------------------------------------- helpers

        /// <summary>
        /// glTF(오른손 좌표계) → Unity(왼손) 변환 때문에 회전 부호가 뒤집힐 수 있어
        /// 문을 살짝 돌려 보고 정면 쪽으로 나오는 방향을 고른다.
        /// </summary>
        float DetectOpeningDirection()
        {
            Vector3 before = MeshCenter(rightDoor);
            hinge.localRotation = hingeClosed * Quaternion.AngleAxis(20f, Vector3.up);
            Vector3 after = MeshCenter(rightDoor);
            hinge.localRotation = hingeClosed;
            return Vector3.Dot(after - before, frontDir) >= 0f ? 1f : -1f;
        }

        static Vector3 MeshCenter(Transform root)
        {
            Vector3 sum = Vector3.zero;
            int n = 0;
            foreach (MeshFilter mf in root.GetComponentsInChildren<MeshFilter>())
            {
                if (!mf.sharedMesh) continue;
                sum += mf.transform.TransformPoint(mf.sharedMesh.bounds.center);
                n++;
            }
            return n > 0 ? sum / n : root.position;
        }

        Bounds PanelBounds()
        {
            Renderer[] rs = model.GetComponentsInChildren<Renderer>();
            if (rs.Length == 0) return new Bounds(model.position, Vector3.zero);
            Bounds b = rs[0].bounds;
            foreach (Renderer r in rs) b.Encapsulate(r.bounds);
            return b;
        }

        /// <summary>
        /// 클릭 판정용. BoxCollider 는 메시 Read/Write 설정과 무관하게 동작한다
        /// (런타임 MeshCollider 는 Read/Write 가 꺼진 메시에서 빌드 시 오류).
        /// </summary>
        void AddColliders()
        {
            if (!rightDoor) return;
            foreach (MeshFilter mf in rightDoor.GetComponentsInChildren<MeshFilter>())
                if (mf.sharedMesh && !mf.GetComponent<Collider>())
                    mf.gameObject.AddComponent<BoxCollider>();   // auto-fits the mesh bounds
        }

        static Transform Find(Transform root, string name)
        {
            if (root.name == name) return root;
            foreach (Transform child in root)
            {
                Transform hit = Find(child, name);
                if (hit) return hit;
            }
            return null;
        }

        static Vector3 Abs(Vector3 v) => new Vector3(Mathf.Abs(v.x), Mathf.Abs(v.y), Mathf.Abs(v.z));

        // ------------------------------------------------------------ dashboard

        void OnGUI()
        {
            if (!showDashboard) return;
            dashRect = new Rect(12, 12, 320, 330);
            GUILayout.BeginArea(dashRect, GUI.skin.box);
            var title = new GUIStyle(GUI.skin.label) { fontStyle = FontStyle.Bold, fontSize = 15 };
            GUILayout.Label("지능형제어반 디지털트윈", title);
            GUILayout.Label("데이터: " + (source ? $"{source.StatusText} ({(source.Connected ? "연결됨" : "끊김")})" : "없음"));

            if (data != null)
            {
                GUILayout.Label($"상태: {data.State}   주파수 {data.frequencyHz:0.0} Hz");
                GUILayout.Label($"전류 {data.motorCurrentA:0.0} A   전력 {data.powerKw:0.0} kW");
                GUILayout.Label($"절감률 {data.energySavingPct:0} %   반내 온도 {data.panelTempC:0.0} °C");
                GUILayout.Label($"DC 링크 {data.dcBusV:0} V   도어 {(data.doorOpen ? "열림" : "닫힘")}");
                GUILayout.Label("알람: " + (data.HasAlarm ? string.Join(", ", data.alarms) : "없음"));
            }

            GUILayout.BeginHorizontal();
            if (GUILayout.Button("운전 (S)") && source) source.SendCommand("start");
            if (GUILayout.Button("정지") && source) source.SendCommand("stop");
            if (GUILayout.Button("리셋 (R)") && source) source.SendCommand("reset");
            GUILayout.EndHorizontal();
            GUILayout.BeginHorizontal();
            if (GUILayout.Button("문 열기/닫기 (D)")) ToggleDoor();
            if (source is SimulatedTelemetrySource && GUILayout.Button("고장 발생 (F)")) source.SendCommand("fault");
            GUILayout.EndHorizontal();

            var small = new GUIStyle(GUI.skin.label) { fontSize = 11, wordWrap = true };
            GUILayout.Label("오른쪽 드래그: 회전 · 휠: 확대 · 가운데 드래그: 이동 · 오른쪽 문 클릭: 열기/닫기", small);
            GUILayout.EndArea();
        }
    }
}
