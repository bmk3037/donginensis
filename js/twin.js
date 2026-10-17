// 디지털트윈 시연 화면 (digital-twin.html · en/digital-twin.html 공통)
// TestBench #1(지능형제어반 2면 + 모터 2대)을 HVAC·ESS 실증 기계실 안에 띄우고, 시연용 모의 데이터로 상태 판정·게이지·3D를 함께 움직인다.
// 홈페이지 판은 외부 서버에 연결하지 않는다(실제 연결은 현장 앱 Unity). 3D 원본은 저장소 밖(구글 드라이브)에 두고 웹용으로 줄인 GLB만 files/twin/ 에 둔다.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const EN = document.documentElement.lang === 'en';
const LOCALE = EN ? 'en-US' : 'ko-KR';
const MODEL_TESTBED = new URL('../files/twin/testbench_01.glb', import.meta.url).href;
const MODEL_PLANT = new URL(EN ? '../files/twin/energy_room_en.glb' : '../files/twin/energy_room.glb', import.meta.url).href;

const T = EN ? {
  unit: ['Unit 1', 'Unit 2'], id1: 'ID pending',
  state: { RUN: 'Running · normal', STOP: 'Stopped · no rotation', WARNING: 'Warning · over threshold', ALARM: 'Alarm · inspect now', OFFLINE: 'No data · last values shown' },
  justNow: ' · received just now', ago: s => ` · received ${s} s ago`, wait: 'Waiting for data',
  warn: 'warning', alarm: 'alarm',
  wind: 'Winding temp', brg: 'Bearing temp', amp: 'Avg current', load: 'Load', pf: 'Power factor',
  gWind: 'Motor winding temp (max)', gBrg: 'Bearing temp (max)', gLoad: 'Load', gRpm: 'Speed',
  subAmp: (a, w, x) => `Avg current ${a} A (warning ${w} · alarm ${x})`, subPf: (p, w, x) => `Power factor ${p} (warning ${w} · alarm ${x} or lower)`,
  doorOpen: u => `Open ${u} door`, doorClose: u => `Close ${u} door`, all: 'All readings', allClose: 'Close readings',
  fail: 'Could not load the 3D model. Please refresh the page.',
  dPlc: 'PLC cards', dDi: 'Digital inputs', dMb: 'Modbus TCP', dMbSub: 'EOCR · Samhwa DSP-PRM', dJudge: 'Judgement indicators',
  rWU: 'Winding temp U', rWV: 'Winding temp V', rWW: 'Winding temp W', rDE: 'Bearing temp DE', rNDE: 'Bearing temp NDE', rRpm: 'Speed',
  rAmb: 'Ambient temp', rHum: 'Ambient humidity', sEnc: 'Encoder · TM3XHSC202',
  rV: p => `Voltage ${p}`, rI: p => `Current ${p}`, rIavg: 'Avg current', rKwh: 'Energy', rLoad: 'Load', rPf: 'Power factor',
  thReset: 'Defaults filled in. Press Save to apply.', thBlank: 'Some fields are empty or not numbers.',
  thOrder: 'Warning values must be lower than alarm values (temperature, current, load).',
  thPf: 'For power factor the warning value must be higher than the alarm value (e.g. 0.85 > 0.80).',
  thMin: 'Publish period and OFFLINE multiplier must be 1 or more.', thSaved: 'Saved. Applied to the judgement and gauges right away.',
  srcName: { sim: 'simulated data', supabase: 'Supabase (Realtime + REST fallback)', mqtt: 'MQTT over WebSocket' },
  connNow: s => `Now: simulated data${s ? ` · saved setting ${s}` : ''}`,
  cSim: 'Simulation needs no connection.', cUrl: 'Enter a server address starting with https:// or wss://.',
  cWeb: 'This homepage demo runs on simulated data only and does not connect to outside servers. Enter the same values in the connection settings of the site app (Unity) to connect to live data.',
  cMin: 'REST fallback period and reconnect interval must be 1 second or more.', cSaved: 'Saved (API key excluded). Device IDs show on the unit chips right away.',
} : {
  unit: ['1호기', '2호기'], id1: '장비 ID 매핑 예정',
  state: { RUN: '운전 · 정상', STOP: '정지 · 회전 없음', WARNING: '경고 · 임계값 넘음', ALARM: '위험 · 즉시 점검', OFFLINE: '통신 끊김 · 직전 값 표시' },
  justNow: ' · 수신 방금 전', ago: s => ` · 수신 ${s}초 전`, wait: '데이터 기다리는 중',
  warn: '경고', alarm: '위험',
  wind: '권선온도', brg: '베어링온도', amp: '평균전류', load: '부하율', pf: '역률',
  gWind: '모터 권선온도 (최고)', gBrg: '베어링 온도 (최고)', gLoad: '부하율', gRpm: '회전속도',
  subAmp: (a, w, x) => `평균전류 ${a} A (경고 ${w} · 위험 ${x})`, subPf: (p, w, x) => `역률 ${p} (경고 ${w} · 위험 ${x} 이하)`,
  doorOpen: u => `${u} 문 열기`, doorClose: u => `${u} 문 닫기`, all: '전체 계측', allClose: '전체 계측 닫기',
  fail: '3D 모델을 불러오지 못했습니다. 새로고침해 주세요.',
  dPlc: 'PLC 카드', dDi: '디지털 입력', dMb: 'Modbus TCP', dMbSub: 'EOCR · 삼화 DSP-PRM', dJudge: '판정 지표',
  rWU: '권선 온도 U', rWV: '권선 온도 V', rWW: '권선 온도 W', rDE: '베어링 온도 DE', rNDE: '베어링 온도 NDE', rRpm: '회전속도',
  rAmb: '대기 온도', rHum: '대기 습도', sEnc: '엔코더 · TM3XHSC202',
  rV: p => `전압 ${p}`, rI: p => `전류 ${p}`, rIavg: '평균 전류', rKwh: '전력량', rLoad: '부하율', rPf: '역률',
  thReset: '기본값을 채웠습니다. 저장을 눌러야 적용됩니다.', thBlank: '빈 칸이나 숫자가 아닌 값이 있습니다.',
  thOrder: '경고값은 위험값보다 작아야 합니다 (온도·전류·부하율).',
  thPf: '역률은 경고값이 위험값보다 커야 합니다 (예: 0.85 > 0.80).',
  thMin: '발행 주기와 OFFLINE 배수는 1 이상이어야 합니다.', thSaved: '저장했습니다. 상태 판정과 게이지에 바로 적용됩니다.',
  srcName: { sim: '시뮬레이션 데이터', supabase: 'Supabase (Realtime + REST 폴백)', mqtt: 'MQTT over WebSocket' },
  connNow: s => `현재: 시뮬레이션 데이터${s ? ` · 저장된 설정 ${s}` : ''}`,
  cSim: '시뮬레이션은 연결이 필요 없습니다.', cUrl: '서버 주소를 https:// 또는 wss:// 로 시작하게 입력하세요.',
  cWeb: '홈페이지 시연 화면은 모의 데이터로만 동작하며 외부 서버에 연결하지 않습니다. 같은 값을 현장 앱(Unity)의 연결 설정에 넣으면 실제 데이터로 연결됩니다.',
  cMin: 'REST 폴백 주기와 재연결 간격은 1초 이상이어야 합니다.', cSaved: '저장했습니다 (API 키 제외). 장비 ID 는 상단 호기 칩에 바로 반영됩니다.',
};

const $ = id => document.getElementById(id);
const f1 = v => v.toFixed(1);

// ---------------------------------------------------------------- thresholds & 5-level judgement (app defaults)
const TH_DEFAULT = { wind: [75, 85], brg: [60, 70], amp: [15, 18], load: [90, 100], pf: [0.85, 0.80], pfMinLoad: 0, pubSec: 3, offlineMul: 3, rotRpm: 30 };
const TH = JSON.parse(JSON.stringify(TH_DEFAULT));
const store = { get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} } };
const savedTh = store.get('dongin-twin-thresholds');
if (savedTh) for (const k of Object.keys(TH_DEFAULT)) if (k in savedTh) TH[k] = Array.isArray(TH[k]) ? [Number(savedTh[k][0]), Number(savedTh[k][1])] : Number(savedTh[k]);
const level = (v, [w, a]) => v >= a ? 2 : v >= w ? 1 : 0;
const pfLevel = d => d.rpm < TH.rotRpm || d.load < TH.pfMinLoad ? 0 : d.pf <= TH.pf[1] ? 2 : d.pf <= TH.pf[0] ? 1 : 0;
function judge(u, now) {
  if (!u.rx || now - u.rx > TH.pubSec * TH.offlineMul * 1000) return 'OFFLINE';
  const d = u.d;
  if (d.rpm < TH.rotRpm) return 'STOP';
  const lv = Math.max(level(d.windMax, TH.wind), level(d.brgMax, TH.brg), level(d.amp, TH.amp), level(d.load, TH.load), pfLevel(d));
  return lv === 2 ? 'ALARM' : lv === 1 ? 'WARNING' : 'RUN';
}
// which readings pushed the unit out of RUN — shown in words so the cause is read, not hunted for
function reasons(d) {
  const out = [];
  const chk = (name, v, th, unit) => { const lv = level(v, th); if (lv) out.push({ lv, t: `${name} ${f1(v)}${unit} ≥ ${lv === 2 ? T.alarm : T.warn} ${th[lv - 1]}${unit}` }); };
  chk(T.wind, d.windMax, TH.wind, '℃');
  chk(T.brg, d.brgMax, TH.brg, '℃');
  chk(T.amp, d.amp, TH.amp, 'A');
  chk(T.load, d.load, TH.load, '%');
  const p = pfLevel(d);
  if (p) out.push({ lv: p, t: `${T.pf} ${d.pf.toFixed(2)} ≤ ${p === 2 ? T.alarm : T.warn} ${TH.pf[p - 1].toFixed(2)}` });
  return out.sort((a, b) => b.lv - a.lv);
}

// ---------------------------------------------------------------- simulator (demo data only; null keeps the last valid value)
const MODES = {
  normal:   { wind: 69.5, brg: 52.4, load: 77.7, amp: 12.9, rpm: 1785, pf: 0.93 },
  overload: { wind: 78.2, brg: 62.1, load: 93.5, amp: 15.6, rpm: 1772, pf: 0.87 },
  danger:   { wind: 88.4, brg: 71.6, load: 104.2, amp: 18.6, rpm: 1761, pf: 0.79 },
  stop:     { wind: 31.0, brg: 28.5, load: 0, amp: 0, rpm: 0, pf: 0 },
};
const unit = (name, id, kwh, x) => ({ name, id, mode: 'normal', rx: 0, x: { ...x }, d: null, state: 'OFFLINE', kwh, di: [1, 0, 0, 1, 0, 0, 1, 0] });
const units = [unit(T.unit[0], 'MTR-A-001', 128456.0, MODES.normal),
               unit(T.unit[1], T.id1, 96210.0, { wind: 64.8, brg: 49.0, load: 71.2, amp: 11.8, rpm: 1788, pf: 0.92 })];
const env = { amb: 27.0, hum: 59.9 };

function publish(u, dt, now) {
  if (u.mode === 'offline') return;            // nothing arrives → OFFLINE after publish period × 3
  const tgt = MODES[u.mode];
  const k = 1 - Math.exp(-dt / (u.mode === 'stop' ? 6 : 3));
  for (const key in tgt) u.x[key] += (tgt[key] - u.x[key]) * k;
  const n = a => (Math.random() - 0.5) * a;
  const spin = u.x.rpm > TH.rotRpm;
  const wU = u.x.wind - 2.2 + n(0.3), wV = u.x.wind - 2.1 + n(0.3), wW = u.x.wind + n(0.3);
  const de = u.x.brg + n(0.3), nde = u.x.brg - 3.1 + n(0.3);
  const pf = Math.random() < 0.05 ? null : (spin ? u.x.pf + n(0.01) : 0);
  const amp = Math.max(0, u.x.amp + (spin ? n(0.2) : 0));
  const iR = spin ? amp * 1.012 + n(0.08) : 0, iS = spin ? amp * 0.991 + n(0.08) : 0, iT = spin ? 3 * amp - iR - iS : 0;
  u.d = {
    wU, wV, wW, windMax: Math.max(wU, wV, wW), de, nde, brgMax: Math.max(de, nde),
    load: Math.max(0, u.x.load + (spin ? n(0.8) : 0)), amp, iR, iS, iT,
    vRS: 381.2 + n(1.2), vST: 379.6 + n(1.2), vTR: 380.4 + n(1.2),
    rpm: Math.max(0, u.x.rpm + (spin ? n(3) : 0)), pf: pf ?? (u.d ? u.d.pf : 0),
  };
  u.rx = now;
  // demo only: the app reads kWh from the meter over Modbus
  u.kwh += Math.sqrt(3) * 380 * u.d.amp * u.d.pf / 1000 * dt / 3600;
  u.di[0] = spin ? 1 : 0;
  u.di[1] = u.mode === 'danger' ? 1 : 0;
}

// ---------------------------------------------------------------- gauges (value against warning / danger zones)
const GAUGES = [
  { key: 'wind', name: T.gWind, unit: '℃', min: 0, max: 100, get th() { return TH.wind; }, val: d => d.windMax, sub: d => `U ${f1(d.wU)} · V ${f1(d.wV)} · W ${f1(d.wW)}` },
  { key: 'brg', name: T.gBrg, unit: '℃', min: 0, max: 90, get th() { return TH.brg; }, val: d => d.brgMax, sub: d => `DE ${f1(d.de)} · NDE ${f1(d.nde)}` },
  { key: 'load', name: T.gLoad, unit: '%', min: 0, max: 120, get th() { return TH.load; }, val: d => d.load, sub: d => T.subAmp(f1(d.amp), TH.amp[0], TH.amp[1]), lv: d => Math.max(level(d.load, TH.load), level(d.amp, TH.amp)) },
  { key: 'rpm', name: T.gRpm, unit: 'RPM', min: 0, max: 1800, th: null, val: d => d.rpm, digits: 0, sub: d => T.subPf(d.pf.toFixed(2), TH.pf[0], TH.pf[1].toFixed(2)), lv: pfLevel },
];
function buildGauges() {
  $('gauges').innerHTML = GAUGES.map(g => {
    const pct = v => ((v - g.min) / (g.max - g.min)) * 100;
    const zones = g.th
      ? `<i class="ok" style="width:${pct(g.th[0])}%"></i><i class="warn" style="width:${pct(g.th[1]) - pct(g.th[0])}%"></i><i class="alarm" style="flex:1"></i>`
      : `<i class="neutral" style="flex:1"></i>`;
    // labels sit at their real positions on the bar (same scale as the zones and the marker)
    const at = (v, t) => `<span style="left:${pct(v)}%">${t}</span>`;
    const scale = g.th ? `${at(g.min, g.min)}${at(g.th[0], g.th[0])}${at(g.th[1], g.th[1])}${at(g.max, g.max)}` : `${at(g.min, g.min)}${at(g.max, `${g.max.toLocaleString(LOCALE)} ${g.unit}`)}`;
    return `<div class="g" id="g_${g.key}" data-lv="0"><span class="k">${g.name}</span><span class="v"><b id="gv_${g.key}">—</b><small>${g.unit}</small></span>
      <div class="track">${zones}</div><div class="mark"><b id="gm_${g.key}" style="left:0%"></b></div><div class="scale">${scale}</div><span class="sub" id="gs_${g.key}"></span></div>`;
  }).join('');
}
buildGauges();

// ---------------------------------------------------------------- three.js scene
const stage = $('stage');
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.95;
stage.prepend(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0e2244);
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.55;
// indoor plant room: bright ceiling LEDs over a grey epoxy floor
scene.add(new THREE.HemisphereLight(0xf2f5fa, 0x7d858f, 0.95));
const sun = new THREE.DirectionalLight(0xffffff, 1.4);
sun.position.set(4, 9, 6);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -5, right: 5, top: 5, bottom: -4, near: 1, far: 30 });
sun.shadow.bias = -0.0004;
scene.add(sun);

const camera = new THREE.PerspectiveCamera(40, 1, 0.05, 200);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.minDistance = 1.0;
controls.maxDistance = 12;
controls.maxPolarAngle = Math.PI * 0.48;

// views are framed so the HUD on the left never covers the equipment
const VIEWS = {
  all:   { target: [-0.6, 1.9, -3.0], pos: [3.6, 2.5, 7.6] },
  panel: { target: [-0.35, 1.15, 0.2], pos: [0.9, 1.45, 3.4] },
  motor: { target: [-0.3, 0.42, 1.0], pos: [1.2, 1.05, 3.0] },
};
let tween = null, userMoved = false, curView = 'all';
const narrow = () => stage.clientWidth < 900;
function viewOf(name) {
  const v = VIEWS[name];
  const t = new THREE.Vector3(...v.target);
  if (narrow()) t.x = 0;                       // no side HUD on phones
  const p = new THREE.Vector3(...v.pos).sub(new THREE.Vector3(...v.target)).multiplyScalar(Math.max(1, 1.25 / camera.aspect)).add(t);
  return { t, p };
}
function setView(name, instant) {
  curView = name;
  const { t, p } = viewOf(name);
  document.querySelectorAll('.seg button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.view === name)));
  if (instant) { controls.target.copy(t); camera.position.copy(p); controls.update(); return; }
  tween = { k: 0, p0: camera.position.clone(), t0: controls.target.clone(), p1: p, t1: t };
}
document.querySelectorAll('.seg button').forEach(b => b.onclick = () => { userMoved = false; setView(b.dataset.view); });
controls.addEventListener('start', () => { userMoved = true; tween = null; });
function resize() {
  const w = stage.clientWidth, h = stage.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  if (!userMoved && !tween) setView(curView, true);
}
new ResizeObserver(resize).observe(stage);
resize();

// ---------------------------------------------------------------- twin bindings (node names = Unity)
const twin = { rotors: [], doors: [], lamps: [[], []], hmi: [null, null], motors: [null, null], spin: 0 };
const DOOR_OPEN = [THREE.MathUtils.degToRad(95), THREE.MathUtils.degToRad(110)], DOOR_SPEED = THREE.MathUtils.degToRad(120);

function makeLamp(node, color) {
  const face = node.getObjectByName(node.name + '_face') || node;
  face.geometry.computeBoundingBox();
  const size = face.geometry.boundingBox.getSize(new THREE.Vector3());
  const d = Math.min(size.x, size.y) * 0.62;
  const mat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0, roughness: 0.25 });
  const lens = new THREE.Mesh(new THREE.SphereGeometry(0.5, 24, 12), mat);
  lens.scale.set(d, d, d * 0.35);
  lens.position.z = d * 0.1;
  face.add(lens);
  return { mat, color: new THREE.Color(color) };
}
function setLamp(l, on) {
  if (!l) return;
  l.mat.emissiveIntensity = on ? 3.2 : 0;
  l.mat.color.copy(l.color).multiplyScalar(on ? 1 : 0.28);
}
function makeHmi(node) {
  node.geometry.computeBoundingBox();
  const size = node.geometry.boundingBox.getSize(new THREE.Vector3());
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = Math.round(640 * size.y / size.x);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  node.geometry = new THREE.PlaneGeometry(size.x, size.y);
  node.material = new THREE.MeshBasicMaterial({ map: tex, toneMapped: false });
  return { canvas, ctx: canvas.getContext('2d'), tex };
}
const HMI_COL = { RUN: '#3CFF6E', STOP: '#9FB3CC', WARNING: '#FFC83C', ALARM: '#FF4A3D', OFFLINE: '#B9A6DF' };
function drawHmi(i) {
  const h = twin.hmi[i], u = units[i];
  if (!h) return;
  const { canvas: c, ctx, tex } = h;
  const W = c.width, H = c.height, d = u.d;
  ctx.fillStyle = '#06101E'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#0E2340'; ctx.fillRect(0, 0, W, 64);
  ctx.textBaseline = 'middle';
  ctx.font = '600 30px "IBM Plex Mono", monospace';
  ctx.fillStyle = '#DCEBFF'; ctx.textAlign = 'left'; ctx.fillText(`UNIT ${i + 1}`, 22, 33);
  ctx.fillStyle = HMI_COL[u.state]; ctx.textAlign = 'right'; ctx.fillText(u.state, W - 22, 33);
  const rows = d ? [['WIND', f1(d.windMax), '°C'], ['BRG', f1(d.brgMax), '°C'], ['LOAD', f1(d.load), '%'], ['CURR', f1(d.amp), 'A'], ['SPEED', d.rpm.toFixed(0), 'rpm']] : [];
  const top = 90, lh = (H - top - 16) / 5;
  rows.forEach(([k, v, un], r) => {
    const y = top + lh * r + lh / 2;
    ctx.textAlign = 'left'; ctx.font = '500 26px "IBM Plex Mono", monospace'; ctx.fillStyle = '#7F95B4'; ctx.fillText(k, 24, y);
    ctx.textAlign = 'right'; ctx.font = '600 34px "IBM Plex Mono", monospace'; ctx.fillStyle = u.state === 'OFFLINE' ? '#6F7E93' : '#EAF3FF'; ctx.fillText(v, W - 110, y);
    ctx.textAlign = 'left'; ctx.font = '500 24px "IBM Plex Mono", monospace'; ctx.fillStyle = '#7F95B4'; ctx.fillText(un, W - 98, y);
  });
  tex.needsUpdate = true;
}

function onTestbed(gltf) {
  const m = gltf.scene;
  m.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  scene.add(m);
  // coupled shaft: Motor B is mounted 180° about Y, so its local +X points the other way
  [['Motor_A_Rotor', 1], ['Motor_B_Rotor', -1], ['Coupling_Rotor', 1]].forEach(([n, s]) => { const o = m.getObjectByName(n); if (o) twin.rotors.push({ o, s }); });
  twin.doors = ['LeftDoor', 'RightDoor'].map((n, i) => ({ hinge: m.getObjectByName(n + '_Hinge'), door: m.getObjectByName(n), angle: 0, open: false, max: DOOR_OPEN[i] }));
  ['', '_2'].forEach((sfx, i) => {
    const g = m.getObjectByName('Lamp_Green' + sfx), r = m.getObjectByName('Lamp_Red' + sfx), s = m.getObjectByName('HMI_Screen' + sfx);
    twin.lamps[i] = [g && makeLamp(g, 0x2BFF6A), r && makeLamp(r, 0xFF2A1A)];
    if (s) twin.hmi[i] = makeHmi(s);
  });
  twin.motors = [m.getObjectByName('Motor_A'), m.getObjectByName('Motor_B')];
}
const loads = [];   // rotating loads in the background plant room (Load_*_Rotor)
function onPlant(gltf) {
  const f = gltf.scene;
  f.traverse(o => {
    if (o.isMesh) o.receiveShadow = true;
    if (/^Load_.*_Rotor$/.test(o.name)) loads.push(o);
  });
  scene.add(f);
}
// both models stream with one progress bar
const got = [0, 0], size = [0, 0];
const progress = () => { const t = size[0] + size[1]; if (t) $('loadbar').style.width = (5 + 90 * (got[0] + got[1]) / t) + '%'; };
const load = (url, i) => new Promise((ok, ng) => new GLTFLoader().load(url, ok, e => { got[i] = e.loaded; size[i] = e.total || size[i]; progress(); }, ng));
$('loadbar').style.width = '5%';
Promise.all([load(MODEL_TESTBED, 0).then(onTestbed), load(MODEL_PLANT, 1).then(onPlant)])
  .then(() => { $('loading').hidden = true; window.twinReady = true; })
  .catch(err => { $('loadText').textContent = T.fail; console.error(err); });

// ---------------------------------------------------------------- interaction
let sel = 0;
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
let down = null;
function pickDoor(ev) {
  const r = renderer.domElement.getBoundingClientRect();
  ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  let best = null;
  twin.doors.forEach((d, i) => { const h = d.door && ray.intersectObject(d.door, true)[0]; if (h && (!best || h.distance < best.h.distance)) best = { i, h }; });
  return best ? best.i : -1;
}
renderer.domElement.addEventListener('pointerdown', ev => { down = { x: ev.clientX, y: ev.clientY }; });
renderer.domElement.addEventListener('pointerup', ev => {
  if (down && Math.hypot(ev.clientX - down.x, ev.clientY - down.y) < 6) {
    const i = pickDoor(ev);
    if (i >= 0) { twin.doors[i].open = !twin.doors[i].open; selectUnit(i); }
  }
  down = null;
});
renderer.domElement.addEventListener('pointermove', ev => { if (!ev.buttons) renderer.domElement.style.cursor = pickDoor(ev) >= 0 ? 'pointer' : ''; });

function selectUnit(i) {
  sel = i;
  document.querySelectorAll('.unit').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.u === i)));
  $('mode').value = units[i].mode;
  render();
}
document.querySelectorAll('.unit').forEach(b => b.onclick = () => selectUnit(+b.dataset.u));
$('mode').onchange = e => { units[sel].mode = e.target.value; render(); };
$('bDoor').onclick = () => { const d = twin.doors[sel]; if (d) { d.open = !d.open; render(); } };
let drawerOpen = false;
$('bAll').onclick = () => {
  drawerOpen = !drawerOpen;
  $('drawer').hidden = !drawerOpen;
  $('bAll').setAttribute('aria-expanded', String(drawerOpen));
  $('bAll').textContent = drawerOpen ? T.allClose : T.all;
  render();
};

// ---------------------------------------------------------------- panels
const kwhFmt = v => v.toLocaleString(LOCALE, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
function render() {
  const now = performance.now();
  units.forEach((u, i) => {
    $('p' + i).dataset.s = u.state;
    $('p' + i).textContent = u.state;
    $('v' + i).textContent = u.d && u.state !== 'OFFLINE' ? `${f1(u.d.windMax)}℃ · ${u.d.rpm.toFixed(0)} rpm · ${f1(u.d.amp)} A` : u.id;
  });
  const u = units[sel], d = u.d;
  $('head').dataset.s = u.state;
  $('hName').textContent = u.name;
  $('hId').textContent = u.id;
  $('hState').textContent = u.state;
  const ago = u.rx ? Math.round((now - u.rx) / 1000) : null;
  $('hDesc').textContent = ago === null ? T.wait : T.state[u.state] + (ago < 1 ? T.justNow : T.ago(ago));
  const rs = d && (u.state === 'WARNING' || u.state === 'ALARM') ? reasons(d) : [];
  $('hReason').hidden = rs.length === 0;
  $('hReason').textContent = rs.map(r => r.t).join('\n');
  $('hReason').style.whiteSpace = 'pre-line';
  $('hud').classList.toggle('stale', u.state === 'OFFLINE');
  if (d) GAUGES.forEach(g => {
    const v = g.val(d);
    $('gv_' + g.key).textContent = v.toFixed(g.digits ?? 1);
    $('gs_' + g.key).textContent = g.sub(d);
    $('gm_' + g.key).style.left = Math.min(100, Math.max(0, (v - g.min) / (g.max - g.min) * 100)) + '%';
    $('g_' + g.key).dataset.lv = g.lv ? g.lv(d) : g.th ? level(v, g.th) : 0;
  });
  $('di').innerHTML = u.di.map((x, i) => `<i class="${x && u.state !== 'OFFLINE' ? 'on' : ''}" title="DI ${i + 1}"></i>`).join('');
  $('amb').textContent = f1(env.amb);
  $('hum').textContent = f1(env.hum);
  $('kwh').textContent = kwhFmt(u.kwh);
  $('bDoor').textContent = twin.doors[sel]?.open ? T.doorClose(u.name) : T.doorOpen(u.name);
  const t = new Date();
  $('clock').textContent = [t.getHours(), t.getMinutes(), t.getSeconds()].map(n => String(n).padStart(2, '0')).join(':');
  if (drawerOpen) renderDrawer(u);
}
function renderDrawer(u) {
  const d = u.d;
  const v = (x, unit, digits = 1) => d ? `${x.toFixed(digits)} <small>${unit}</small>` : '—';
  const row = (k, val, src = '') => `<tr><td>${k}${src ? `<span class="src">${src}</span>` : ''}</td><td>${val}</td></tr>`;
  const pt = 'PT100 · TM3TI4', ai = '4~20 mA · TM3AI4';
  $('drawer').innerHTML = `
    <h3>${T.dPlc} <small>${u.name}</small></h3>
    <table>
      ${row(T.rWU, v(d?.wU, '℃'), pt)}${row(T.rWV, v(d?.wV, '℃'), pt)}${row(T.rWW, v(d?.wW, '℃'), pt)}
      ${row(T.rDE, v(d?.de, '℃'), pt)}${row(T.rNDE, v(d?.nde, '℃'), pt)}
      ${row(T.rRpm, v(d?.rpm, 'RPM', 0), T.sEnc)}
      ${row(T.rAmb, `${f1(env.amb)} <small>℃</small>`, ai)}${row(T.rHum, `${f1(env.hum)} <small>%</small>`, ai)}
    </table>
    <h3>${T.dDi} <small>TM3DI8</small></h3>
    <div class="di">${u.di.map((x, i) => `<span class="${x && u.state !== 'OFFLINE' ? 'on' : ''}">DI${i + 1} ${x && u.state !== 'OFFLINE' ? 'ON' : 'OFF'}</span>`).join('')}</div>
    <h3>${T.dMb} <small>${T.dMbSub}</small></h3>
    <table>
      ${row(T.rV('R-S'), v(d?.vRS, 'V'))}${row(T.rV('S-T'), v(d?.vST, 'V'))}${row(T.rV('T-R'), v(d?.vTR, 'V'))}
      ${row(T.rI('R'), v(d?.iR, 'A'))}${row(T.rI('S'), v(d?.iS, 'A'))}${row(T.rI('T'), v(d?.iT, 'A'))}${row(T.rIavg, v(d?.amp, 'A'))}
      ${row(T.rKwh, `${kwhFmt(u.kwh)} <small>kWh</small>`)}
    </table>
    <h3>${T.dJudge}</h3>
    <table>${row(T.rLoad, v(d?.load, '%'))}${row(T.rPf, d ? d.pf.toFixed(2) : '—')}</table>`;
}

// floating labels over each motor: centred above it, kept inside the stage, and stacked when the two would collide
const tagEls = [$('tagA'), $('tagB')], tmp = new THREE.Vector3();
function placeTags() {
  const w = stage.clientWidth, h = stage.clientHeight;
  const at = twin.motors.map((mo, i) => {
    const el = tagEls[i];
    if (!mo) return null;
    mo.getWorldPosition(tmp);
    tmp.y += 0.5;
    tmp.project(camera);
    const vis = tmp.z < 1 && Math.abs(tmp.x) < 1.05 && Math.abs(tmp.y) < 1.05;
    el.hidden = !vis;
    if (!vis) return null;
    const u = units[i], d = u.d;
    el.dataset.s = u.state;
    el.innerHTML = `<small>${u.name}</small>${d ? `${f1(d.windMax)}℃ · ${d.rpm.toFixed(0)} rpm` : '—'}`;
    const tw = el.offsetWidth, th = el.offsetHeight;
    return { el, tw, th, x: Math.min(w - tw / 2 - 6, Math.max(tw / 2 + 6, (tmp.x + 1) / 2 * w)), y: (1 - tmp.y) / 2 * h };
  });
  const [A, B] = at;
  if (A && B && Math.abs(A.x - B.x) < (A.tw + B.tw) / 2 + 6 && Math.abs(A.y - B.y) < A.th + 6) A.y = Math.min(A.y, B.y) - B.th - 6;
  at.forEach(t => { if (t) { t.el.style.left = t.x + 'px'; t.el.style.top = t.y + 'px'; } });
}

// ---------------------------------------------------------------- loop
const clock = new THREE.Clock();
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
let lastPub = performance.now(), lastUi = 0;
units.forEach(u => publish(u, 0.01, lastPub));
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.1);
  const now = performance.now();
  if (now - lastPub >= TH.pubSec * 1000) {                // wall-clock publishing: slow tablets never look offline
    const s = (now - lastPub) / 1000;
    units.forEach(u => publish(u, s, now));
    env.amb += (27.0 - env.amb) * 0.05 + (Math.random() - 0.5) * 0.06;
    env.hum += (59.9 - env.hum) * 0.05 + (Math.random() - 0.5) * 0.2;
    lastPub = now;
  }
  units.forEach(u => { u.state = judge(u, now); });
  if (now - lastUi >= 250) { lastUi = now; render(); drawHmi(0); drawHmi(1); }

  // coupled shaft, shown at a readable speed (1800 rpm → 1.2 rev/s)
  const rpm = Math.max(...units.map(u => (u.state === 'OFFLINE' || !u.d ? 0 : u.d.rpm)));
  twin.spin += (rpm / 1800 * 1.2 * Math.PI * 2 - twin.spin) * (1 - Math.exp(-dt / 0.8));
  twin.rotors.forEach(r => r.o.rotateX(r.s * twin.spin * dt));
  if (!reduceMotion) loads.forEach(o => o.rotateX(Math.PI * 2 * dt));
  twin.doors.forEach(d => {
    if (!d.hinge) return;
    const step = DOOR_SPEED * dt;
    d.angle += Math.max(-step, Math.min(step, (d.open ? d.max : 0) - d.angle));
    d.hinge.rotation.y = d.angle;
  });
  const blink = (now / 500 | 0) % 2 === 0;
  units.forEach((u, i) => {
    const [g, r] = twin.lamps[i], s = u.state;
    setLamp(g, s === 'RUN' || s === 'WARNING' || s === 'ALARM');
    setLamp(r, s === 'STOP' || (s === 'WARNING' && blink) || s === 'ALARM');
  });

  if (tween) {
    tween.k = Math.min(1, tween.k + dt / 0.8);
    const e = tween.k < 0.5 ? 2 * tween.k * tween.k : 1 - (-2 * tween.k + 2) ** 2 / 2;
    camera.position.lerpVectors(tween.p0, tween.p1, e);
    controls.target.lerpVectors(tween.t0, tween.t1, e);
    if (tween.k >= 1) tween = null;
  }
  controls.update();
  renderer.render(scene, camera);
  placeTags();
});
render();
document.fonts?.ready.then(() => { drawHmi(0); drawHmi(1); });

// ---------------------------------------------------------------- settings dialogs
const thKeys = ['wind', 'brg', 'amp', 'load', 'pf'];
function fillTh(src) {
  thKeys.forEach(k => { $(`t_${k}0`).value = src[k][0]; $(`t_${k}1`).value = src[k][1]; });
  ['pfMinLoad', 'pubSec', 'offlineMul'].forEach(k => { $('t_' + k).value = src[k]; });
}
function showMsg(id, text, kind) { const m = $(id); m.hidden = !text; m.textContent = text || ''; m.className = 'msg' + (kind ? ' ' + kind : ''); }
$('bTh').onclick = () => { fillTh(TH); showMsg('thMsg', ''); $('dlgTh').showModal(); };
$('thClose').onclick = () => $('dlgTh').close();
$('thReset').onclick = () => { fillTh(TH_DEFAULT); showMsg('thMsg', T.thReset); };
$('thSave').onclick = () => {
  const n = id => Number($(id).value);
  const next = {};
  for (const k of thKeys) next[k] = [n(`t_${k}0`), n(`t_${k}1`)];
  for (const k of ['pfMinLoad', 'pubSec', 'offlineMul']) next[k] = n('t_' + k);
  const bad = [...thKeys.flatMap(k => next[k]), next.pfMinLoad, next.pubSec, next.offlineMul].some(v => !Number.isFinite(v));
  if (bad) return showMsg('thMsg', T.thBlank, 'err');
  if (['wind', 'brg', 'amp', 'load'].find(k => next[k][0] >= next[k][1])) return showMsg('thMsg', T.thOrder, 'err');
  if (next.pf[0] <= next.pf[1]) return showMsg('thMsg', T.thPf, 'err');
  if (next.pubSec < 1 || next.offlineMul < 1) return showMsg('thMsg', T.thMin, 'err');
  Object.assign(TH, next);
  store.set('dongin-twin-thresholds', next);
  buildGauges(); render();
  showMsg('thMsg', T.thSaved, 'ok');
};

const CONN_DEFAULT = { src: 'sim', url: '', table: 'telemetry', poll: 3, id0: 'MTR-A-001', id1: '', retry: 5, auto: 'on' };
const conn = Object.assign({}, CONN_DEFAULT, store.get('dongin-twin-connection') || {});
function applyConn() {
  units[0].id = conn.id0 || 'MTR-A-001';
  units[1].id = conn.id1 || T.id1;
  $('connNow').textContent = T.connNow(conn.src !== 'sim' ? T.srcName[conn.src] : '');
  render();
}
$('bConn').onclick = () => {
  ['src', 'url', 'table', 'poll', 'id0', 'id1', 'retry', 'auto'].forEach(k => { $('c_' + k).value = conn[k]; });
  showMsg('connMsg', '');
  $('dlgConn').showModal();
};
$('connClose').onclick = () => { $('c_key').value = ''; $('dlgConn').close(); };
$('connTest').onclick = () => {
  if ($('c_src').value === 'sim') return showMsg('connMsg', T.cSim, 'ok');
  if (!/^https?:\/\/|^wss?:\/\//.test($('c_url').value)) return showMsg('connMsg', T.cUrl, 'err');
  showMsg('connMsg', T.cWeb);               // the homepage demo never sends anything to an outside server
};
$('connSave').onclick = () => {
  const v = k => $('c_' + k).value.trim();
  const poll = Number(v('poll')), retry = Number(v('retry'));
  if (!(poll >= 1) || !(retry >= 1)) return showMsg('connMsg', T.cMin, 'err');
  Object.assign(conn, { src: v('src'), url: v('url'), table: v('table'), poll, id0: v('id0'), id1: v('id1'), retry, auto: v('auto') });
  store.set('dongin-twin-connection', conn);          // API 키는 저장하지 않음
  $('c_key').value = '';
  applyConn();
  showMsg('connMsg', T.cSaved, 'ok');
};
applyConn();
