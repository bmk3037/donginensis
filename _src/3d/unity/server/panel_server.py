"""지능형제어반 디지털트윈용 REST 서버 (Unity HttpTelemetrySource 가 조회).

  python3 panel_server.py                         # 가상 데이터
  python3 panel_server.py --modbus 192.168.0.10   # 실제 인버터/PLC (Modbus TCP) 값 사용

  GET  /api/panel            -> {"panelId":..,"state":"RUN",...}   (Unity PanelTelemetry 와 같은 키)
  POST /api/panel/command    <- {"command":"start"|"stop"|"reset"|"fault"|"door"}

Modbus 모드는 REGISTER_MAP 의 주소를 현장 장비(인버터/PLC) 매뉴얼에 맞게 고쳐야 한다.
표준 라이브러리만으로 동작하고, --modbus 를 쓸 때만 `pip install pymodbus` 가 필요하다.
"""
import argparse
import json
import math
import random
import threading
import time
from datetime import datetime
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

# ---------------------------------------------------------------- simulator

class SimulatedPanel:
    """인버터로 펌프/팬을 구동하는 제어반. 전력 ∝ 주파수³ (상사 법칙)."""

    def __init__(self, panel_id='LH2-CP-01', rated_kw=22.0, rated_a=42.0, setpoint_hz=45.0):
        self.panel_id, self.rated_kw, self.rated_a, self.setpoint_hz = panel_id, rated_kw, rated_a, setpoint_hz
        self.running, self.fault, self.door_open = True, False, False
        self.fault_text = ''
        self.hz, self.temp_c, self.ambient_c = 0.0, 30.0, 24.0
        self.t0 = self.last = time.monotonic()
        self.lock = threading.Lock()

    def _step(self):
        now = time.monotonic()
        dt, self.last = now - self.last, now
        t = now - self.t0
        target = min(60.0, max(0.0, self.setpoint_hz + 3 * math.sin(t * 0.15))) if self.running and not self.fault else 0.0
        step = 5.0 * dt
        self.hz += max(-step, min(step, target - self.hz))
        load = (self.hz / 60.0) ** 3
        temp_target = self.ambient_c + 4 + 18 * load - (2 if self.door_open else 0)
        self.temp_c += (temp_target - self.temp_c) * (1 - math.exp(-dt / 40.0))
        return load

    def snapshot(self):
        with self.lock:
            load = self._step()
            spinning = self.hz > 0.1
            alarms = [self.fault_text] if self.fault else (['Panel temperature high'] if self.temp_c > 45 else [])
            return {
                'panelId': self.panel_id,
                'state': 'FAULT' if self.fault else 'RUN' if self.running else 'STOP',
                'frequencyHz': round(self.hz, 2),
                'motorCurrentA': round(self.rated_a * (0.3 + 0.7 * load) + random.uniform(-0.3, 0.3), 2) if spinning else 0.0,
                'powerKw': round(self.rated_kw * load, 2),
                'energySavingPct': round((1 - load) * 100, 1) if spinning else 0.0,
                'panelTempC': round(self.temp_c, 2),
                'dcBusV': round(540 + random.uniform(-3, 3), 1),
                'doorOpen': self.door_open,
                'alarms': alarms,
                'timestamp': datetime.now().isoformat(timespec='seconds'),
            }

    def command(self, cmd):
        with self.lock:
            if cmd == 'start':
                if self.fault:
                    return False, 'reset the fault first'
                self.running = True
            elif cmd == 'stop':
                self.running = False
            elif cmd == 'reset':
                self.fault, self.fault_text = False, ''
            elif cmd == 'fault':
                self.fault, self.running, self.fault_text = True, False, 'Overcurrent (OC)'
            elif cmd == 'door':
                self.door_open = not self.door_open
            else:
                return False, f'unknown command {cmd!r}'
        return True, 'ok'


# ------------------------------------------------------------------- modbus

# 예시 맵 — 실제 주소/배율은 장비 매뉴얼 기준으로 수정할 것.
# (holding register 주소, 배율): 값 = 레지스터 * 배율
REGISTER_MAP = {
    'frequencyHz': (0, 0.01),
    'motorCurrentA': (1, 0.1),
    'powerKw': (2, 0.1),
    'panelTempC': (3, 0.1),
    'dcBusV': (4, 1.0),
}
STATUS_REGISTER = 10          # bit0 = 운전, bit1 = 고장, bit2 = 도어 열림
COMMAND_REGISTER = 20         # 1 = 운전, 2 = 정지, 4 = 리셋
COMMAND_CODES = {'start': 1, 'stop': 2, 'reset': 4}


class ModbusPanel:
    def __init__(self, host, port=502, unit=1, panel_id='LH2-CP-01', rated_kw=22.0):
        from pymodbus.client import ModbusTcpClient
        self.client = ModbusTcpClient(host, port=port)
        self.unit, self.panel_id, self.rated_kw = unit, panel_id, rated_kw
        self.lock = threading.Lock()

    def _call(self, fn, *args, **kw):
        # pymodbus renamed the unit-id keyword: slave (3.x) -> device_id (3.10+)
        for key in ('device_id', 'slave'):
            try:
                return fn(*args, **{key: self.unit}, **kw)
            except TypeError:
                continue
        raise RuntimeError('unsupported pymodbus version')

    def snapshot(self):
        with self.lock:
            if not self.client.connected and not self.client.connect():
                raise ConnectionError('modbus connect failed')
            top = max(max(a for a, _ in REGISTER_MAP.values()), STATUS_REGISTER) + 1
            rr = self._call(self.client.read_holding_registers, 0, count=top)
            if rr.isError():
                raise ConnectionError(str(rr))
        regs = rr.registers
        out = {k: round(regs[a] * s, 2) for k, (a, s) in REGISTER_MAP.items()}
        status = regs[STATUS_REGISTER]
        running, fault, door = bool(status & 1), bool(status & 2), bool(status & 4)
        load = min(1.0, out['powerKw'] / self.rated_kw) if self.rated_kw else 0.0
        out.update({
            'panelId': self.panel_id,
            'state': 'FAULT' if fault else 'RUN' if running else 'STOP',
            'energySavingPct': round((1 - load) * 100, 1) if running else 0.0,
            'doorOpen': door,
            'alarms': ['Drive fault'] if fault else [],
            'timestamp': datetime.now().isoformat(timespec='seconds'),
        })
        return out

    def command(self, cmd):
        if cmd not in COMMAND_CODES:
            return False, f'command {cmd!r} not mapped for modbus'
        with self.lock:
            if not self.client.connected and not self.client.connect():
                return False, 'modbus connect failed'
            rr = self._call(self.client.write_register, COMMAND_REGISTER, COMMAND_CODES[cmd])
        return (not rr.isError()), str(rr)


# --------------------------------------------------------------------- http

def make_handler(panel):
    class Handler(BaseHTTPRequestHandler):
        def _send(self, code, body):
            data = json.dumps(body, ensure_ascii=False).encode()
            self.send_response(code)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Content-Length', str(len(data)))
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(data)

        def do_GET(self):
            if self.path.rstrip('/') == '/api/panel':
                try:
                    self._send(200, panel.snapshot())
                except Exception as e:  # device unreachable etc.
                    self._send(503, {'error': str(e)})
            else:
                self._send(404, {'error': 'use GET /api/panel or POST /api/panel/command'})

        def do_POST(self):
            if self.path.rstrip('/') != '/api/panel/command':
                return self._send(404, {'error': 'not found'})
            try:
                length = int(self.headers.get('Content-Length', 0))
                cmd = str(json.loads(self.rfile.read(length) or b'{}').get('command', '')).lower()
            except (ValueError, AttributeError):
                return self._send(400, {'error': 'body must be {"command": "..."}'})
            ok, msg = panel.command(cmd)
            self._send(200 if ok else 400, {'ok': ok, 'message': msg})

        def log_message(self, fmt, *args):
            pass

    return Handler


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--host', default='0.0.0.0')
    ap.add_argument('--port', type=int, default=8080)
    ap.add_argument('--panel-id', default='LH2-CP-01')
    ap.add_argument('--modbus', metavar='HOST', help='인버터/PLC Modbus TCP 주소 (없으면 가상 데이터)')
    ap.add_argument('--modbus-port', type=int, default=502)
    ap.add_argument('--unit', type=int, default=1, help='Modbus unit(slave) id')
    a = ap.parse_args()

    panel = (ModbusPanel(a.modbus, a.modbus_port, a.unit, a.panel_id) if a.modbus
             else SimulatedPanel(a.panel_id))
    server = ThreadingHTTPServer((a.host, a.port), make_handler(panel))
    mode = f'modbus {a.modbus}:{a.modbus_port}' if a.modbus else 'simulator'
    print(f'[panel_server] {mode} -> http://localhost:{a.port}/api/panel')
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == '__main__':
    main()
