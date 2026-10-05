using UnityEngine;

namespace Dongin.DigitalTwin
{
    /// <summary>오른쪽 드래그 회전, 휠 확대/축소, 가운데 드래그 이동. 시작 시 대상의 정면 3/4 뷰로 맞춘다.</summary>
    public class OrbitCameraController : MonoBehaviour
    {
        public Transform target;
        [Tooltip("정면에서 옆으로 돌린 시작 각도")]
        public float startYawOffset = 25f;
        public float startPitch = 12f;
        public float rotateSpeed = 0.25f;
        public float zoomStep = 0.12f;
        public float panSpeed = 0.0015f;
        public float minDistance = 0.8f;
        public float maxDistance = 15f;

        Vector3 pivot;
        float yaw, pitch, distance = 4f;
        Vector2 lastMouse;

        void Start()
        {
            pitch = startPitch;
            if (!target) return;

            Bounds b = TargetBounds();
            pivot = b.center;
            distance = Mathf.Clamp(b.extents.magnitude * 2.6f, minDistance, maxDistance);

            Transform marker = FindChild(target, "Front_Marker");
            Vector3 front = marker ? marker.position - pivot : -transform.forward;
            front.y = 0f;
            if (front.sqrMagnitude < 1e-6f) front = Vector3.back;
            // camera sits at pivot - forward * distance, so forward must point against the panel's front
            yaw = Mathf.Atan2(-front.x, -front.z) * Mathf.Rad2Deg + startYawOffset;
            lastMouse = InputCompat.MousePosition;
            Apply();
        }

        void LateUpdate()
        {
            Vector2 mouse = InputCompat.MousePosition;
            Vector2 delta = mouse - lastMouse;
            lastMouse = mouse;

            if (InputCompat.MouseHeld(1))
            {
                yaw += delta.x * rotateSpeed;
                pitch = Mathf.Clamp(pitch - delta.y * rotateSpeed, -10f, 80f);
            }
            if (InputCompat.MouseHeld(2))
                pivot -= (transform.right * delta.x + transform.up * delta.y) * panSpeed * distance;

            float scroll = InputCompat.Scroll;
            if (Mathf.Abs(scroll) > 0.01f)
                distance = Mathf.Clamp(distance * (1f - scroll * zoomStep), minDistance, maxDistance);

            Apply();
        }

        void Apply()
        {
            Quaternion rot = Quaternion.Euler(pitch, yaw, 0f);
            transform.SetPositionAndRotation(pivot - rot * Vector3.forward * distance, rot);
        }

        Bounds TargetBounds()
        {
            Renderer[] rs = target.GetComponentsInChildren<Renderer>();
            if (rs.Length == 0) return new Bounds(target.position, Vector3.one);
            Bounds b = rs[0].bounds;
            foreach (Renderer r in rs) b.Encapsulate(r.bounds);
            return b;
        }

        static Transform FindChild(Transform root, string name)
        {
            if (root.name == name) return root;
            foreach (Transform c in root)
            {
                Transform hit = FindChild(c, name);
                if (hit) return hit;
            }
            return null;
        }
    }
}
