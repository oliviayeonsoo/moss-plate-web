/**
 * 고정 상수 · 기본값 · 파생 규칙
 * 순수 함수만. DOM/Three.js 의존 없음.
 */

/** 사용자가 바꾸지 않는 값 (현재 검증본 기준) */
export const FIXED = Object.freeze({
  height: 18.0,        // 전체 높이
  wall: 2.8,           // 벽 두께
  floor: 3.0,          // 앞쪽 바닥 두께
  maxRearRise: 2.5,    // 뒤쪽 바닥이 앞보다 두꺼워질 수 있는 최대치
  maxSlopeDeg: 1.5,    // 바닥 경사 상한
  slotW: 11.0,         // 배수 슬롯 폭
  slotH: 5.0,          // 배수 슬롯 높이
  slotPitch: 25.0,     // 슬롯 간격 목표
  slotEdgeMargin: 5.0, // 모서리 라운드 끝에서 첫 슬롯까지 여유
  arcSeg: 12,          // 원호 분할 수 (클수록 매끈·무거움)
});

/** 입력 기본값 */
export const DEFAULTS = Object.freeze({
  width: 250,
  depth: 60,
  notchWidth: 64,
  notchDepth: 32,
});

/** 입력 허용 범위 [min, max] */
export const LIMITS = Object.freeze({
  width: [80, 800],
  depth: [40, 400],
  notchWidth: [30, 500],
  notchDepth: [8, 300],
});

/** 입력 항목 메타 (UI 가 이걸 읽어서 폼을 그린다) */
export const FIELDS = Object.freeze([
  { key: 'width',       label: '가로',        unit: 'mm', step: 5 },
  { key: 'depth',       label: '세로 (깊이)', unit: 'mm', step: 5 },
  { key: 'notchWidth',  label: '수전 홈 너비', unit: 'mm', step: 2 },
  { key: 'notchDepth',  label: '수전 홈 깊이', unit: 'mm', step: 2 },
]);

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const rad = d => d * Math.PI / 180;

/** 배수 슬롯 중심 x 좌표들 */
function slotPositions(p) {
  const a = p.cornerR + p.slotEdgeMargin + p.slotW / 2;
  const b = p.width - p.cornerR - p.slotEdgeMargin - p.slotW / 2;
  const span = b - a;
  if (span <= 0) return [];
  if (span < p.slotPitch) return [(a + b) / 2];
  const n = Math.floor(span / p.slotPitch) + 1;
  return Array.from({ length: n }, (_, i) => a + span * i / (n - 1));
}

/**
 * 입력값 → 파생값 포함 전체 파라미터
 * 규칙:
 *  - 모서리 R = 깊이 × 0.14 (6~30 제한)  … 깊이 60→8.4, 180→25.2
 *  - 바닥 경사 = min(1.5°, atan(2.5 / 깊이)) … 뒤쪽이 과도하게 두꺼워지는 걸 방지
 *  - 홈 모서리 R = min(14, 홈깊이/2-1, 홈너비/2-1)
 */
export function derive(input) {
  const p = { ...FIXED, ...DEFAULTS, ...input };

  p.cornerR  = clamp(p.depth * 0.14, 6, 30);
  p.notchR   = clamp(Math.min(14, p.notchDepth / 2 - 1, p.notchWidth / 2 - 1), 0, 14);
  p.slopeDeg = Math.min(p.maxSlopeDeg, Math.atan2(p.maxRearRise, p.depth) * 180 / Math.PI);

  const tanS   = Math.tan(rad(p.slopeDeg));
  p.floorFront = p.floor;
  p.floorRear  = p.floor + p.depth * tanS;
  p.wellFront  = p.height - p.floorFront;
  p.wellRear   = p.height - p.floorRear;

  // 슬롯은 안쪽 바닥면(앞) 높이에서 시작해야 물이 안 고인다
  p.slotZ0 = p.floor + p.wall * tanS;
  p.slotZ1 = p.slotZ0 + p.slotH;
  p.slotXs = slotPositions(p);

  // 노치(수전 홈) 범위
  p.notchX0 = p.width / 2 - p.notchWidth / 2;
  p.notchX1 = p.width / 2 + p.notchWidth / 2;
  p.notchY  = p.depth - p.notchDepth;

  return p;
}
