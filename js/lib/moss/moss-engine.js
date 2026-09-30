/**
 * moss-engine.js — 이끼 플레이트 3피스 생성 엔진 (한 파일 버전)
 * 원본: src/core/{params.js, validate.js, geometry.js, stl.js}  ·  재생성: npm run bundle  ·  직접 수정하지 말 것
 *
 * 의존성: manifold-3d@3.5.4 (npm). npm 설치가 안 되는 환경이면 아래 import 한 줄을
 *   import Module from 'https://cdn.jsdelivr.net/npm/manifold-3d@3.5.4/manifold.js';
 * 로 바꾸면 된다.
 *
 * 사용법 (값은 mm. 화면이 cm 면 × 10):
 *   import { DEFAULTS, FIELDS, validate, initGeometry, buildPieces, downloadAll } from './moss-engine.js';
 *   await initGeometry();                        // 앱 시작 시 1회 (WASM 로드)
 *   const r = validate({ width, depth, rearGap, sideGap });
 *   // r.errors[i]   = { field, message }  → 해당 입력칸에 표시, 생성 버튼 막기
 *   // r.warnings[i] = { field, message }  → 표시만
 *   if (r.ok) downloadAll(r.params, buildPieces(r.params));   // 조각 여러 개면 ZIP, 하나면 STL
 *
 * 입력 키: width(설치 공간 가로) · depth(설치 공간 세로) · rearGap(세면대 뒤 공간) · sideGap(세면대 옆 공간)
 * rearGap·sideGap 은 0 이거나 20 이상. 0 이면 그 조각을 만들지 않는다.
 */
import Module from 'manifold-3d';

// ─────────────────────────── params.js ───────────────────────────
/**
 * 고정 상수 · 입력 정의 · 파생 규칙 (3피스 U자 트레이)
 * 순수 함수만. DOM/Three.js/WASM 의존 없음. 단위는 전부 mm.
 *
 *   뒤(벽)  y = depth
 *   ┌──────┬──────────────┬──────┐
 *   │      │   Piece 2    │      │  ← rearGap (세면대 뒤 공간)
 *   │  P1  ├──────────────┤  P3  │
 *   │      │    세면대     │      │
 *   └──────┘              └──────┘
 *   앞(사용자) y = 0
 *   ←side→                 ←side→    sideGap (세면대 옆 공간, 좌우 동일)
 *   ←────────── width ──────────→
 */

export const FIXED = Object.freeze({
  height: 18.0,          // 전체 높이
  wall: 2.8,             // 벽 두께
  floor: 3.0,            // 배수 쪽 바닥 두께
  maxRise: 2.5,          // 반대쪽 바닥이 더 두꺼워질 수 있는 최대치
  maxSlopeDeg: 1.5,      // 바닥 경사 상한
  slotW: 11.0,           // 배수 구멍 폭
  slotH: 5.0,            // 배수 구멍 높이
  slotDrop: 0.6,         // 배수 구멍 아랫단을 바닥면보다 이만큼 낮춘다 (물 고임 방지)
  slotPitch: 25.0,       // 배수 구멍 간격
  slotMargin: 5.0,       // 모서리·조인트에서 첫 구멍까지 여유
  arcSeg: 16,            // 모서리 원호 분할 수
  rRatio: 0.14,          // 모서리 R = 기준 치수 × 0.14
  rMin: 6, rMax: 30,
  // 도브테일 (Piece 2 의 촉이 Piece 1·3 의 홈으로 뒤에서 앞으로 밀려 들어간다)
  tenon: 10.0,           // 물림 길이
  clearance: 0.25,       // 끼움 공차
  rootHalf: 3.5,         // 촉 뿌리 반높이 (7mm)
  tipHalf: 7.0,          // 촉 끝 반높이 (14mm) → 벌어져서 좌우로 안 빠진다
                         // 기울기 0.35/mm → 이음새 유격 = 공차/sin(19.3°) ≈ 0.76mm (0.2/mm 였을 땐 1.27mm)
  lead: 1.5,             // 홈 입구 여유
  blockSide: 16.0,       // Piece 1·3 조인트 보강 블록 폭
  blockMid: 10.0,        // Piece 2 조인트 보강 블록 폭
  minGap: 20.0,          // 여유 공간은 0 이거나 이 값 이상
  minSinkW: 60.0,        // 세면대 폭(=가로 − 옆 공간×2) 최소
  minFront: 20.0,        // 옆 조각이 세면대 옆으로 뻗는 최소 길이 (세로 − 뒤 공간)
  bed: 250.0,            // 일반 프린터 베드 기준
});

/** 입력 기본값 (실측 도면: 가로 47 · 세로 18 · 뒤 9 · 옆 15 cm) */
export const DEFAULTS = Object.freeze({
  width: 470,
  depth: 180,
  rearGap: 90,
  sideGap: 150,
});

/** 입력 허용 범위 [min, max] (mm) */
export const LIMITS = Object.freeze({
  width:   [40, 1200],
  depth:   [20, 600],
  rearGap: [0, 600],
  sideGap: [0, 600],
});

/**
 * 입력 항목 메타. UI 는 이것만 보고 폼을 만든다.
 * 화면 단위는 cm, 코어는 mm. scale 로 변환한다.
 */
export const FIELDS = Object.freeze([
  { key: 'width',   label: '설치 공간 가로', unit: 'cm', scale: 10, step: 0.5 },
  { key: 'depth',   label: '설치 공간 세로', unit: 'cm', scale: 10, step: 0.5 },
  { key: 'rearGap', label: '세면대 뒤 공간', unit: 'cm', scale: 10, step: 0.5,
    hint: '세면대로부터 최소 2cm는 띄워주세요. 공간이 없으면 0' },
  { key: 'sideGap', label: '세면대 옆 공간', unit: 'cm', scale: 10, step: 0.5,
    hint: '세면대로부터 최소 2cm는 띄워주세요. 공간이 없으면 0' },
]);

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const deg = r => r * 180 / Math.PI;

/** a~b 구간에 배수 구멍 중심을 간격 pitch 로 배치 */
function spread(a, b, pitch) {
  if (b < a - 1e-9) return [];
  const span = b - a;
  if (span < pitch) return [(a + b) / 2];
  const n = Math.floor(span / pitch) + 1;
  return Array.from({ length: n }, (_, i) => a + span * i / (n - 1));
}

function slope(p, span) {
  const d = Math.min(p.maxSlopeDeg, deg(Math.atan2(p.maxRise, span)));
  return { slopeDeg: d, rise: span * Math.tan(d * Math.PI / 180) };
}

/**
 * 입력 → 조각별 사양.
 * 옆 공간 0 이면 Piece 1·3 을, 뒤 공간 0 이면 Piece 2 를 만들지 않는다.
 */
export function derive(input) {
  const p = { ...FIXED, ...DEFAULTS, ...input };
  const W = p.width, H = p.depth, S = p.sideGap, R = p.rearGap;
  const hasSide = S > 0, hasRear = R > 0;
  const joined = hasSide && hasRear;
  const sm = p.slotMargin + p.slotW / 2;

  p.hasSide = hasSide;
  p.hasRear = hasRear;
  p.joined = joined;
  p.sinkWidth = hasSide ? W - 2 * S : W;
  p.pieces = [];

  if (hasSide) {
    const free = joined ? H - R : H;                       // 세면대를 마주보는 안쪽 변 길이
    const r = Math.min(clamp(H * p.rRatio, p.rMin, p.rMax), S / 2 - 0.5, H / 2 - 0.5, free - 0.5);
    const { slopeDeg, rise } = slope(p, S);
    const yEnd = joined ? free : H - r;
    const left = {
      role: 'left', name: 'piece1', label: 'Piece 1 (왼쪽)',
      x0: 0, x1: S, y0: 0, y1: H,
      cornerR: Math.max(0, r),
      // 둥근 모서리: [앞왼, 앞오른, 뒤오른, 뒤왼]. 조인트가 있으면 뒤오른은 각지게
      corners: [true, true, !joined, true],
      drain: 'right',                                      // 세면대 쪽 벽
      slopeDeg, rise,
      slots: spread(r + sm, yEnd - sm, p.slotPitch),
      socket: joined,
    };
    p.pieces.push(left);
    p.pieces.push({ ...left, role: 'right', name: 'piece3', label: 'Piece 3 (오른쪽)', mirrorOf: 'left' });
  }

  if (hasRear) {
    const x0 = hasSide ? S : 0, x1 = hasSide ? W - S : W;
    const y0 = hasSide ? H - R : 0, y1 = hasSide ? H : R;
    const r = joined ? 0 : Math.min(clamp(R * p.rRatio, p.rMin, p.rMax), R / 2 - 0.5, (x1 - x0) / 2 - 0.5);
    const end = joined ? p.blockMid : r;
    const { slopeDeg, rise } = slope(p, R);
    p.pieces.push({
      role: 'mid', name: 'piece2', label: 'Piece 2 (가운데)',
      x0, x1, y0, y1,
      cornerR: Math.max(0, r),
      corners: joined ? [false, false, false, false] : [true, true, true, true],
      drain: 'front',
      slopeDeg, rise,
      slots: spread(x0 + end + sm, x1 - end - sm, p.slotPitch),
      tenons: joined,
    });
    // 가운데 조각을 목록 중간으로 (P1, P2, P3 순서)
    p.pieces.sort((a, b) => ({ left: 0, mid: 1, right: 2 })[a.role] - ({ left: 0, mid: 1, right: 2 })[b.role]);
  }

  return p;
}

// ─────────────────────────── validate.js ───────────────────────────
/**
 * 입력 검증. errors 가 있으면 모델을 만들지 않는다.
 * warnings 는 만들 수는 있지만 알려야 하는 것. 메시지는 화면 단위(cm)로 쓴다.
 */
const LABEL = {
  width: '설치 공간 가로', depth: '설치 공간 세로',
  rearGap: '세면대 뒤 공간', sideGap: '세면대 옆 공간',
};
const cm = v => `${+(v / 10).toFixed(1)}cm`;

export function validate(input) {
  const errors = [], warnings = [];
  const err  = (field, message) => errors.push({ field, message });
  const warn = (field, message) => warnings.push({ field, message });

  // 1) 숫자 · 범위
  for (const [key, [lo, hi]] of Object.entries(LIMITS)) {
    const v = input[key];
    if (!Number.isFinite(v)) err(key, `${LABEL[key]}: 숫자를 입력해주세요`);
    else if (v < lo)         err(key, `${LABEL[key]}는 ${cm(lo)} 이상이어야 해요`);
    else if (v > hi)         err(key, `${LABEL[key]}는 ${cm(hi)} 이하여야 해요`);
  }
  if (errors.length) return { ok: false, errors, warnings, params: null };

  // 2) 여유 공간은 0 이거나 2cm 이상
  for (const key of ['rearGap', 'sideGap']) {
    const v = input[key];
    if (v > 0 && v < FIXED.minGap)
      err(key, `${LABEL[key]}은 0이거나 ${cm(FIXED.minGap)} 이상이어야 해요 (지금 ${cm(v)})`);
  }
  if (input.rearGap === 0 && input.sideGap === 0)
    err('sideGap', '뒤 공간과 옆 공간이 모두 0이라 만들 조각이 없어요');
  if (errors.length) return { ok: false, errors, warnings, params: null };

  const p = derive(input);

  // 3) 조합이 성립하는가
  if (p.rearGap > p.depth)
    err('rearGap', `뒤 공간(${cm(p.rearGap)})이 설치 공간 세로(${cm(p.depth)})보다 커요`);
  if (p.hasSide && p.sinkWidth < FIXED.minSinkW)
    err('sideGap', `옆 공간을 빼고 나면 세면대 폭이 ${cm(p.sinkWidth)}밖에 안 남아요. ` +
                   `옆 공간은 최대 ${cm(Math.floor((p.width - FIXED.minSinkW) / 2))}까지 가능해요`);
  if (p.joined && p.depth - p.rearGap < FIXED.minFront)
    err('depth', `세로에서 뒤 공간을 빼면 ${cm(p.depth - p.rearGap)}뿐이라 옆 조각이 세면대 옆으로 뻗지 못해요. ` +
                 `세로를 ${cm(p.rearGap + FIXED.minFront)} 이상으로 해주세요`);
  if (errors.length) return { ok: false, errors, warnings, params: p };

  // 4) 만들 수는 있지만 알려야 하는 것
  if (!p.hasSide)
    warn('sideGap', '옆 공간이 0이라 가운데 조각(Piece 2) 하나만 만들어요');
  if (p.hasSide && !p.hasRear)
    warn('rearGap', '뒤 공간이 0이라 좌우 조각 두 개만 만들어요. 서로 연결되지 않은 따로 된 조각이에요');

  for (const s of p.pieces) {
    const w = (s.x1 - s.x0) + (s.tenons ? 2 * FIXED.tenon : 0);
    const d = s.y1 - s.y0;
    const big = Math.max(w, d);
    if (big > FIXED.bed)
      warn(s.role === 'mid' ? 'width' : 'depth',
           `${s.label}가 ${cm(big)}라 일반 프린터 베드(${cm(FIXED.bed)})보다 커요`);
    if (s.slots.length === 0)
      warn(s.role === 'mid' ? 'rearGap' : 'depth',
           `${s.label}에 배수 구멍이 들어갈 자리가 없어요 (세면대를 마주보는 변이 짧아요)`);
    const inner = (s.role === 'mid' ? d : s.x1 - s.x0) - 2 * FIXED.wall;
    if (inner < 15)
      warn(s.role === 'mid' ? 'rearGap' : 'sideGap',
           `${s.label}의 이끼 자리 폭이 ${cm(inner)}로 좁아요`);
  }

  return { ok: true, errors, warnings, params: p };
}

// ─────────────────────────── geometry.js ───────────────────────────
/**
 * 조각 사양 → 닫힌 3D 메시. manifold-3d(WASM) 로 불리언 연산.
 * 결정론적: 같은 입력이면 항상 같은 메시. 외부 서비스 호출 없음.
 *
 * 사용법:  await initGeometry();  const pieces = buildPieces(derive(values));
 */
let wasm = null;

/**
 * WASM 로드 (한 번만). 브라우저·Node 공통.
 * 번들러가 manifold.wasm 경로를 못 찾으면 옵션으로 넘긴다:
 *   initGeometry({ locateFile: () => '/manifold.wasm' })
 */
export async function initGeometry(options) {
  if (!wasm) { wasm = await Module(options); wasm.setup(); }
  return wasm;
}

/** 모서리별로 둥글릴지 고르는 사각형 윤곽 (CCW) */
function roundedRect(x0, y0, x1, y1, r, [fl, fr, br, bl], seg) {
  const P = [];
  const corner = (on, cx, cy, sx, sy, a0) => {
    if (!on || r <= 0) { P.push([cx, cy]); return; }
    const ox = cx + sx * r, oy = cy + sy * r;
    for (let i = 0; i <= seg; i++) {
      const t = (a0 + 90 * i / seg) * Math.PI / 180;
      P.push([ox + r * Math.cos(t), oy + r * Math.sin(t)]);
    }
  };
  corner(fl, x0, y0, +1, +1, 180);
  corner(fr, x1, y0, -1, +1, 270);
  corner(br, x1, y1, -1, -1, 0);
  corner(bl, x0, y1, +1, -1, 90);
  return P;
}

/**
 * 한 조각 만들기. 반환되는 Manifold 는 호출자가 delete 해야 한다.
 * own(o) 로 등록한 중간 객체는 끝에 한꺼번에 지운다.
 */
function buildPiece(p, s, own) {
  const { Manifold, CrossSection } = wasm;
  const H = p.height, BIG = 4000;

  const outline = own(CrossSection.ofPolygons([roundedRect(s.x0, s.y0, s.x1, s.y1, s.cornerR, s.corners, p.arcSeg)]));
  let wellCs = own(outline.offset(-p.wall, 'Miter'));

  // 조인트 보강 블록 자리는 이끼 자리(웰)에서 뺀다
  const blocks = [];
  if (s.socket) blocks.push([s.x1 - p.blockSide, p.depth - p.rearGap, s.x1, s.y1]);
  if (s.tenons) {
    blocks.push([s.x0, s.y0, s.x0 + p.blockMid, s.y1]);
    blocks.push([s.x1 - p.blockMid, s.y0, s.x1, s.y1]);
  }
  for (const [a, b, c, d] of blocks) {
    const blk = own(CrossSection.ofPolygons([[[a, b], [c, b], [c, d], [a, d]]]));
    wellCs = own(wellCs.subtract(blk));
  }

  let body = own(outline.extrude(H));

  // 웰: 벽은 수직으로 두고 바닥만 기울인다 (배수 벽 쪽이 낮다)
  let well = own(own(wellCs.extrude(H + 30)).translate([0, 0, p.floor]));
  const slab = own(own(Manifold.cube([BIG, BIG, BIG])).translate([-BIG / 2, -BIG / 2, -BIG]));
  let below;
  if (s.drain === 'right') {        // 오른쪽(x1) 벽으로 배수 → 왼쪽으로 갈수록 바닥이 높다
    below = own(own(slab.rotate([0, s.slopeDeg, 0])).translate([s.x1, 0, p.floor]));
  } else {                          // 앞(y0) 벽으로 배수 → 뒤로 갈수록 바닥이 높다
    below = own(own(slab.rotate([s.slopeDeg, 0, 0])).translate([0, s.y0, p.floor]));
  }
  well = own(well.subtract(below));
  body = own(body.subtract(well));

  // 배수 구멍
  const z0 = p.floor - p.slotDrop;
  for (const c of s.slots) {
    let cut;
    if (s.drain === 'right') {
      cut = own(own(Manifold.cube([p.wall + 4, p.slotW, p.slotH]))
        .translate([s.x1 - p.wall - 2, c - p.slotW / 2, z0]));
    } else {
      cut = own(own(Manifold.cube([p.slotW, p.wall + 4, p.slotH]))
        .translate([c - p.slotW / 2, s.y0 - 2, z0]));
    }
    body = own(body.subtract(cut));
  }

  // 도브테일: 옆 모양이 사다리꼴(뿌리 10 → 끝 14mm)인 촉을 y 방향으로 밀어 끼운다
  const zc = H / 2;
  const wedge = (xr, xt, hr, ht, ya, yb, lead = 0) => {
    const prof = [[xt, ht], [xr, hr]];
    if (lead) prof.push([xr + lead, hr]);
    const pts = [];
    for (const y of [ya, yb]) for (const [x, h] of prof) pts.push([x, y, zc - h], [x, y, zc + h]);
    return own(Manifold.hull(pts));
  };
  const c = p.clearance;
  if (s.socket) {
    // 앞쪽은 막혀 있어서(스토퍼) 뒤에서 밀어 넣으면 정확히 제자리에서 멈춘다
    const ya = p.depth - p.rearGap, yb = p.depth + 2;
    body = own(body.subtract(wedge(s.x1, s.x1 - p.tenon - c, p.rootHalf + c, p.tipHalf + c, ya, yb, p.lead)));
  }
  if (s.tenons) {
    body = own(body.add(wedge(s.x0, s.x0 - p.tenon, p.rootHalf, p.tipHalf, s.y0, s.y1)));
    body = own(body.add(wedge(s.x1, s.x1 + p.tenon, p.rootHalf, p.tipHalf, s.y0, s.y1)));
  }

  return { manifold: body, mossArea: wellCs.area() };
}

/** Manifold → 비인덱스 삼각형 배열 + 면 법선 */
function toTriangles(m) {
  const mesh = m.getMesh();
  const { numProp, vertProperties: vp, triVerts: tv } = mesh;
  const n = tv.length / 3;
  const positions = new Float32Array(n * 9), normals = new Float32Array(n * 9);
  for (let t = 0; t < n; t++) {
    const v = [0, 1, 2].map(k => { const i = tv[t * 3 + k] * numProp; return [vp[i], vp[i + 1], vp[i + 2]]; });
    const [a, b, cc] = v;
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
    const vx = cc[0] - a[0], vy = cc[1] - a[1], vz = cc[2] - a[2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const L = Math.hypot(nx, ny, nz) || 1; nx /= L; ny /= L; nz /= L;
    for (let k = 0; k < 3; k++) {
      const o = t * 9 + k * 3;
      positions.set(v[k], o);
      normals[o] = nx; normals[o + 1] = ny; normals[o + 2] = nz;
    }
  }
  return { positions, normals, triangleCount: n };
}

/**
 * @returns 조각 배열. 각 조각의 positions 는 "조립 위치" 좌표.
 *   STL 로 내보낼 땐 stl.js 가 min 을 원점으로 옮긴다.
 */
export function buildPieces(p) {
  if (!wasm) throw new Error('initGeometry() 를 먼저 호출해야 해');
  const { Manifold } = wasm;
  const trash = [];
  const own = o => { trash.push(o); return o; };
  const out = [];

  try {
    let leftM = null;
    for (const s of p.pieces) {
      let m, mossArea;
      if (s.mirrorOf === 'left') {
        // 오른쪽 = 왼쪽을 가로 중앙 기준으로 거울 반사 (좌우 대칭 보장)
        m = own(own(leftM.mirror([1, 0, 0])).translate([p.width, 0, 0]));
        mossArea = out.find(q => q.role === 'left').mossArea;
      } else {
        ({ manifold: m, mossArea } = buildPiece(p, s, own));
        if (s.role === 'left') leftM = m;
      }
      if (m.status() !== 'NoError') throw new Error(`${s.label} 메시 오류: ${m.status()}`);
      const bb = m.boundingBox();
      out.push({
        role: s.role, name: s.name, label: s.label,
        ...toTriangles(m),
        min: [bb.min[0], bb.min[1], bb.min[2]],
        size: [bb.max[0] - bb.min[0], bb.max[1] - bb.min[1], bb.max[2] - bb.min[2]],
        volume: m.volume(),
        mossArea,
        slopeDeg: s.slopeDeg,
        rise: s.rise,
        slotCount: s.slots.length,
        cornerR: s.cornerR,
      });
    }
  } finally {
    for (const o of trash) { try { o.delete(); } catch { /* 이미 해제됨 */ } }
  }
  return out;
}

// ─────────────────────────── stl.js ───────────────────────────
/**
 * 조각 메시 → binary STL, 여러 조각 → ZIP(무압축). 외부 라이브러리 없음.
 * toBinarySTL / toZip 은 순수 함수(Node 에서도 동작), download* 만 브라우저 전용.
 */

/** 조각 하나 → binary STL. 출력용으로 최소 좌표를 원점(0,0,0)에 맞춘다 */
export function toBinarySTL(piece, header = 'moss plate') {
  const n = piece.triangleCount;
  const [ox, oy, oz] = piece.min ?? [0, 0, 0];
  const buf = new ArrayBuffer(84 + n * 50);
  const dv = new DataView(buf);
  const head = new Uint8Array(buf, 0, 80);
  for (let i = 0; i < Math.min(header.length, 79); i++) head[i] = header.charCodeAt(i) & 0x7f;
  dv.setUint32(80, n, true);
  let o = 84;
  for (let t = 0; t < n; t++) {
    const q = t * 9;
    for (let k = 0; k < 3; k++) { dv.setFloat32(o, piece.normals[q + k], true); o += 4; }
    for (let v = 0; v < 3; v++) {
      dv.setFloat32(o,     piece.positions[q + v * 3]     - ox, true);
      dv.setFloat32(o + 4, piece.positions[q + v * 3 + 1] - oy, true);
      dv.setFloat32(o + 8, piece.positions[q + v * 3 + 2] - oz, true);
      o += 12;
    }
    dv.setUint16(o, 0, true); o += 2;
  }
  return buf;
}

const CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(bytes) {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = CRC[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** [{name, data:ArrayBuffer}] → ZIP(ArrayBuffer). 무압축(store) */
export function toZip(files) {
  const enc = new TextEncoder();
  const parts = [], central = [];
  let offset = 0;
  for (const f of files) {
    const name = enc.encode(f.name);
    const data = new Uint8Array(f.data);
    const crc = crc32(data);
    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(4, 20, true);
    local.setUint16(8, 0, true);            // store
    local.setUint32(14, crc, true);
    local.setUint32(18, data.length, true);
    local.setUint32(22, data.length, true);
    local.setUint16(26, name.length, true);
    parts.push(new Uint8Array(local.buffer), name, data);

    const cen = new DataView(new ArrayBuffer(46));
    cen.setUint32(0, 0x02014b50, true);
    cen.setUint16(4, 20, true);
    cen.setUint16(6, 20, true);
    cen.setUint32(16, crc, true);
    cen.setUint32(20, data.length, true);
    cen.setUint32(24, data.length, true);
    cen.setUint16(28, name.length, true);
    cen.setUint32(42, offset, true);
    central.push(new Uint8Array(cen.buffer), name);
    offset += 30 + name.length + data.length;
  }
  const cenSize = central.reduce((s, a) => s + a.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(8, files.length, true);
  end.setUint16(10, files.length, true);
  end.setUint32(12, cenSize, true);
  end.setUint32(16, offset, true);
  const all = [...parts, ...central, new Uint8Array(end.buffer)];
  const out = new Uint8Array(all.reduce((s, a) => s + a.length, 0));
  let p = 0;
  for (const a of all) { out.set(a, p); p += a.length; }
  return out.buffer;
}

/** 파일명 규칙: moss_470x180_piece1.stl */
export function fileName(params, piece) {
  const w = +(params.width / 10).toFixed(1), d = +(params.depth / 10).toFixed(1);
  return `moss_${w}x${d}cm_${piece.name}.stl`;
}

function save(buffer, filename, type) {
  const url = URL.createObjectURL(new Blob([buffer], { type }));
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** 조각 하나 저장 (브라우저 전용) */
export function downloadSTL(params, piece) {
  save(toBinarySTL(piece, piece.label), fileName(params, piece), 'model/stl');
}

/** 전 조각을 ZIP 하나로 저장 (브라우저 전용). 조각이 하나면 STL 로 바로 */
export function downloadAll(params, pieces) {
  if (pieces.length === 1) return downloadSTL(params, pieces[0]);
  const files = pieces.map(q => ({ name: fileName(params, q), data: toBinarySTL(q, q.label) }));
  const w = +(params.width / 10).toFixed(1), d = +(params.depth / 10).toFixed(1);
  save(toZip(files), `moss_${w}x${d}cm_${pieces.length}pieces.zip`, 'application/zip');
}
