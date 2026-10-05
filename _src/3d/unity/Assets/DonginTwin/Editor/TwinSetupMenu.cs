using System;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using Object = UnityEngine.Object;

namespace Dongin.DigitalTwin.EditorTools
{
    /// <summary>메뉴 Dongin > Setup Digital Twin Scene : 현재 씬에 모델·데이터·카메라·조명을 한 번에 배치</summary>
    public static class TwinSetupMenu
    {
        const string ModelName = "control_panel_twin";

        [MenuItem("Dongin/Setup Digital Twin Scene")]
        static void Setup()
        {
            GameObject prefab = FindModel();
            if (!prefab)
            {
                EditorUtility.DisplayDialog("Dongin Digital Twin",
                    $"{ModelName}.glb 를 찾지 못했습니다.\n\n1) Package Manager 에서 glTFast(com.unity.cloud.gltfast) 설치\n2) {ModelName}.glb 를 Assets/DonginTwin/Models 에 복사\n후 다시 실행하세요.",
                    "확인");
                return;
            }

            var root = new GameObject("DigitalTwin_ControlPanel");
            Undo.RegisterCreatedObjectUndo(root, "Setup Digital Twin");
            var model = (GameObject)PrefabUtility.InstantiatePrefab(prefab);
            model.transform.SetParent(root.transform, false);

            var sim = root.AddComponent<SimulatedTelemetrySource>();
            var http = root.AddComponent<HttpTelemetrySource>();
            http.enabled = false;   // 실제 서버 연결 시: 이걸 켜고 ControlPanelTwin.source 를 HTTP 로 변경
            var twin = root.AddComponent<ControlPanelTwin>();
            twin.source = sim;
            twin.model = model.transform;

            Camera cam = Camera.main;
            if (!cam)
            {
                var camGo = new GameObject("Main Camera") { tag = "MainCamera" };
                Undo.RegisterCreatedObjectUndo(camGo, "Setup Digital Twin");
                cam = camGo.AddComponent<Camera>();
                camGo.AddComponent<AudioListener>();
            }
            var orbit = cam.GetComponent<OrbitCameraController>();
            if (!orbit) orbit = Undo.AddComponent<OrbitCameraController>(cam.gameObject);
            orbit.target = model.transform;

            if (!FindLight())
            {
                var lightGo = new GameObject("Directional Light");
                Undo.RegisterCreatedObjectUndo(lightGo, "Setup Digital Twin");
                var light = lightGo.AddComponent<Light>();
                light.type = LightType.Directional;
                light.intensity = 1.1f;
                lightGo.transform.rotation = Quaternion.Euler(45f, -30f, 0f);
            }

            Selection.activeGameObject = root;
            EditorSceneManager.MarkSceneDirty(root.scene);
            Debug.Log("[Dongin] 디지털트윈 씬 구성 완료. Play 를 눌러 확인하세요.");
        }

        static GameObject FindModel()
        {
            foreach (string guid in AssetDatabase.FindAssets(ModelName))
            {
                string path = AssetDatabase.GUIDToAssetPath(guid);
                if (!path.EndsWith(".glb", StringComparison.OrdinalIgnoreCase) &&
                    !path.EndsWith(".gltf", StringComparison.OrdinalIgnoreCase)) continue;
                var go = AssetDatabase.LoadAssetAtPath<GameObject>(path);
                if (go) return go;
            }
            return null;
        }

        static Light FindLight()
        {
#if UNITY_2022_2_OR_NEWER
            return Object.FindFirstObjectByType<Light>();
#else
            return Object.FindObjectOfType<Light>();
#endif
        }
    }
}
