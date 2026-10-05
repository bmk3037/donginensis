using UnityEngine;
#if ENABLE_INPUT_SYSTEM
using UnityEngine.InputSystem;
using UnityEngine.InputSystem.Controls;
#endif

namespace Dongin.DigitalTwin
{
    /// <summary>
    /// 구 Input Manager / 신 Input System 패키지 어느 쪽 설정이든 동작하도록 감싼 입력 함수.
    /// (Unity 6 새 프로젝트는 기본이 Input System이라 UnityEngine.Input을 쓰면 예외가 난다)
    /// </summary>
    public static class InputCompat
    {
        public static Vector2 MousePosition
        {
            get
            {
#if ENABLE_INPUT_SYSTEM
                return Mouse.current != null ? Mouse.current.position.ReadValue() : Vector2.zero;
#else
                return Input.mousePosition;
#endif
            }
        }

        /// <summary>휠 한 칸 = 약 1.0</summary>
        public static float Scroll
        {
            get
            {
#if ENABLE_INPUT_SYSTEM
                return Mouse.current != null ? Mouse.current.scroll.ReadValue().y / 120f : 0f;
#else
                return Input.mouseScrollDelta.y;
#endif
            }
        }

        /// <summary>button: 0 왼쪽, 1 오른쪽, 2 가운데</summary>
        public static bool MouseDown(int button)
        {
#if ENABLE_INPUT_SYSTEM
            var b = MouseButton(button);
            return b != null && b.wasPressedThisFrame;
#else
            return Input.GetMouseButtonDown(button);
#endif
        }

        public static bool MouseUp(int button)
        {
#if ENABLE_INPUT_SYSTEM
            var b = MouseButton(button);
            return b != null && b.wasReleasedThisFrame;
#else
            return Input.GetMouseButtonUp(button);
#endif
        }

        public static bool MouseHeld(int button)
        {
#if ENABLE_INPUT_SYSTEM
            var b = MouseButton(button);
            return b != null && b.isPressed;
#else
            return Input.GetMouseButton(button);
#endif
        }

        /// <summary>알파벳 키(A~Z)만 지원</summary>
        public static bool KeyDown(KeyCode letter)
        {
#if ENABLE_INPUT_SYSTEM
            if (Keyboard.current == null || letter < KeyCode.A || letter > KeyCode.Z) return false;
            return Keyboard.current[Key.A + (letter - KeyCode.A)].wasPressedThisFrame;
#else
            return Input.GetKeyDown(letter);
#endif
        }

#if ENABLE_INPUT_SYSTEM
        static ButtonControl MouseButton(int button)
        {
            var m = Mouse.current;
            if (m == null) return null;
            return button == 0 ? m.leftButton : button == 1 ? m.rightButton : m.middleButton;
        }
#endif
    }
}
