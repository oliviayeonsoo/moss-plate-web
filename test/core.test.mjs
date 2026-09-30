/** 브라우저 없이 코어 검증: node test/core.test.mjs */
import { DEFAULTS, derive } from '../js/configurator/core/params.js';
import { validate } from '../js/configurator/core/validate.js';
import { buildMesh } from '../js/configurator/core/geometry.js';
import { toBinarySTL } from '../js/configurator/core/stl.js';

let fail = 0;
const ok = (cond, msg) => { console.log(`${cond ? ' ok ' : 'FAIL'}  ${msg}`); if (!cond) fail++; };
const near = (a, b, t = 0.05) => Math.abs(a - b) <= t;

console.log('── 파생 규칙 ──');
const d60 = derive({ ...DEFAULTS, depth: 60 });
const d180 = derive({ ...DEFAULTS, depth: 180, width: 470, notchWidth: 170, notchDepth: 90 });
ok(near(d60.cornerR, 8.4),   `깊이 60 → 모서리 R ${d60.cornerR.toFixed(2)} (기존 설계 8)`);
ok(near(d180.cornerR, 25.2), `깊이 180 → 모서리 R ${d180.cornerR.toFixed(2)} (기존 설계 25)`);
ok(near(d60.slopeDeg, 1.5),  `깊이 60 → 경사 ${d60.slopeDeg.toFixed(2)}° (기존 1.5)`);
ok(near(d180.slopeDeg, 0.8), `깊이 180 → 경사 ${d180.slopeDeg.toFixed(2)}° (기존 0.8)`);
ok(d60.slotXs.length === 9,  `가로 250 → 배수 구멍 ${d60.slotXs.length}개 (기존 9)`);

console.log('\n── 메시 무결성 ──');
for (const [name, input] of [
  ['기본 250×60',  {}],
  ['470×180',      { width: 470, depth: 180, notchWidth: 170, notchDepth: 90 }],
  ['작은 120×45',  { width: 120, depth: 45, notchWidth: 40, notchDepth: 16 }],
  ['깊은 300×250', { width: 300, depth: 250, notchWidth: 80, notchDepth: 60 }],
]) {
  const v = validate({ ...DEFAULTS, ...input });
  if (!v.ok) { ok(false, `${name}: 검증 실패 — ${v.errors[0].message}`); continue; }
  const m = buildMesh(v.params);
  const vol = m.stats.volume;
  const key = a => `${m.positions[a].toFixed(3)},${m.positions[a+1].toFixed(3)},${m.positions[a+2].toFixed(3)}`;
  const edges = new Map();
  for (let t = 0; t < m.triangleCount; t++) {
    for (let e = 0; e < 3; e++) {
      const i = (t * 3 + e) * 3, j = (t * 3 + (e + 1) % 3) * 3;
      const k = `${key(i)}|${key(j)}`, r = `${key(j)}|${key(i)}`;
      if (edges.has(r)) { const c = edges.get(r) - 1; c ? edges.set(r, c) : edges.delete(r); }
      else edges.set(k, (edges.get(k) || 0) + 1);
    }
  }
  const closed = edges.size === 0;
  ok(vol > 0 && closed,
     `${name}: 삼각형 ${m.triangleCount}, 부피 ${(vol/1000).toFixed(1)}cm³, ` +
     `PETG ${(vol/1000*1.27).toFixed(0)}g, 닫힘=${closed ? 'O' : `X(열린모서리 ${edges.size})`}`);
  const stl = toBinarySTL(m);
  ok(stl.byteLength === 84 + m.triangleCount * 50, `${name}: STL ${(stl.byteLength/1024).toFixed(0)}KB`);
}

console.log('\n── 검증 규칙 ──');
for (const [patch, expectOk, label] of [
  [{ width: 50 },        false, '가로 하한'],
  [{ notchWidth: 240 },  false, '홈이 너무 넓음'],
  [{ notchDepth: 55 },   false, '홈이 너무 깊음'],
  [{ depth: 180 },       true,  '깊이 180 (경고만)'],
  [{ width: 400 },       true,  '가로 400 (베드 경고)'],
]) {
  const v = validate({ ...DEFAULTS, ...patch });
  ok(v.ok === expectOk, `${label}: ok=${v.ok} err=${v.errors.length} warn=${v.warnings.length}` +
     (v.errors[0] ? ` — "${v.errors[0].message.slice(0, 40)}…"` : ''));
}

console.log(fail ? `\n실패 ${fail}건` : '\n전부 통과');
process.exit(fail ? 1 : 0);
