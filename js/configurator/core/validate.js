/**
 * 입력값 검증. errors 가 있으면 모델을 만들지 않는다.
 * warnings 는 만들 수는 있지만 실제 사용/출력에 문제가 될 수 있는 것.
 */
import { LIMITS, derive } from './params.js';

const MIN_SIDE   = 2;   // 홈 옆에 최소로 남아야 할 살
const MIN_BRIDGE = 8;   // 홈 앞쪽에 남아야 할 이끼 자리 폭
const MIN_WELL   = 4;   // 뒤쪽 웰 최소 깊이
const BED        = 250; // 일반 프린터 베드 기준
const DECK_MAX   = 60;  // 평면붙임 세면기 데크 (조사 근거)

const LABEL = {
  width: '가로', depth: '세로', notchWidth: '수전 홈 너비', notchDepth: '수전 홈 깊이',
};

export function validate(input) {
  const errors = [], warnings = [];
  const err  = (field, message) => errors.push({ field, message });
  const warn = (field, message) => warnings.push({ field, message });

  // 1) 숫자·범위
  for (const [key, [lo, hi]] of Object.entries(LIMITS)) {
    const v = input[key];
    if (!Number.isFinite(v))      err(key, `${LABEL[key]}: 숫자를 입력해줘`);
    else if (v < lo)              err(key, `${LABEL[key]}는 ${lo}mm 이상이어야 해 (지금 ${v})`);
    else if (v > hi)              err(key, `${LABEL[key]}는 ${hi}mm 이하여야 해 (지금 ${v})`);
  }
  if (errors.length) return { ok: false, errors, warnings, params: null };

  const p = derive(input);

  // 2) 기하학적으로 만들 수 있는가
  const sideLeft = p.notchX0 - (p.wall + p.cornerR);
  if (sideLeft < MIN_SIDE) {
    const max = Math.floor(p.width - 2 * (p.wall + p.cornerR + MIN_SIDE));
    err('notchWidth', `홈이 너무 넓어. 옆에 살이 ${sideLeft.toFixed(1)}mm 밖에 안 남아 — 이 가로(${p.width})에선 최대 ${max}mm`);
  }
  const bridge = p.notchY - 2 * p.wall;
  if (bridge < MIN_BRIDGE) {
    const max = Math.floor(p.depth - 2 * p.wall - MIN_BRIDGE);
    err('notchDepth', `홈이 너무 깊어. 앞쪽 이끼 자리가 ${bridge.toFixed(1)}mm 뿐이야 — 이 세로(${p.depth})에선 최대 ${max}mm`);
  }
  if (p.cornerR <= p.wall + 0.5)
    err('depth', `세로가 너무 작아서 모서리 라운드(R${p.cornerR.toFixed(1)})가 벽 두께(${p.wall})를 못 감싸`);
  if (p.wellRear < MIN_WELL)
    err('depth', `세로가 길어서 뒤쪽 웰이 ${p.wellRear.toFixed(1)}mm 밖에 안 남아 — 이끼가 안 들어가`);
  if (p.notchWidth >= p.width - 2 * p.wall)
    err('notchWidth', '홈이 가로 전체를 먹어버려');

  if (errors.length) return { ok: false, errors, warnings, params: p };

  // 3) 만들 수는 있지만 주의
  if (p.depth > DECK_MAX)
    warn('depth', `세로 ${p.depth}mm — 벽걸이·반다리 세면기는 수전 옆 평면이 약 60mm라 안 얹힌다. 상판 있는 세면대 전용`);
  if (p.width > BED || p.depth > BED)
    warn('width', `${Math.max(p.width, p.depth)}mm — 일반 프린터 베드(${BED})를 넘어. 분할 출력이 필요해`);
  if (p.notchWidth < 55)
    warn('notchWidth', `홈 ${p.notchWidth}mm — 수전 몸통이 Ø55까지 있어서 안 들어갈 수 있어`);
  if (p.slotXs.length < 3)
    warn('width', `배수 구멍이 ${p.slotXs.length}개뿐이야. 물이 잘 안 빠질 수 있어`);
  if (p.wellRear < 8)
    warn('depth', `뒤쪽 웰 깊이 ${p.wellRear.toFixed(1)}mm — 이끼가 얕게 깔려`);

  return { ok: true, errors, warnings, params: p };
}
