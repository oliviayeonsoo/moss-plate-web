/**
 * S3 엔진(js/lib/moss/moss-engine.js) 검증: node test/engine.test.mjs
 * 원본 test/core.test.mjs 는 받지 못해서, 이식 요구사항의 확인 항목을 그대로 검사한다.
 * 엔진 코드는 import 만 하고 수정하지 않는다.
 */
import {
  DEFAULTS, FIELDS, validate, initGeometry, buildPieces, toBinarySTL, toZip, fileName,
} from '../js/lib/moss/moss-engine.js';

let fail = 0;
const ok = (cond, msg) => { console.log(`${cond ? ' ok ' : 'FAIL'}  ${msg}`); if (!cond) fail++; };

// 화면 입력(cm) → 코어 입력(mm): FIELDS[i].scale
const fromCm = cm => Object.fromEntries(FIELDS.map(f => [f.key, cm[f.key] * f.scale]));

// 닫힌 메시인지: 모든 모서리를 정확히 두 삼각형이 공유해야 한다
function watertight(piece) {
  const P = piece.positions, key = i => `${P[i].toFixed(4)},${P[i + 1].toFixed(4)},${P[i + 2].toFixed(4)}`;
  const edges = new Map();
  for (let t = 0; t < piece.triangleCount; t++) {
    const v = [0, 1, 2].map(k => key(t * 9 + k * 3));
    for (const [a, b] of [[0, 1], [1, 2], [2, 0]]) {
      const e = v[a] < v[b] ? v[a] + '|' + v[b] : v[b] + '|' + v[a];
      edges.set(e, (edges.get(e) || 0) + 1);
    }
  }
  return [...edges.values()].every(c => c === 2);
}

await initGeometry();

console.log('── 입력 정의 ──');
ok(FIELDS.map(f => f.key).join() === 'width,depth,rearGap,sideGap', `입력 키: ${FIELDS.map(f => f.key).join(', ')}`);
ok(FIELDS.every(f => f.scale === 10 && f.unit === 'cm'), '화면 단위 cm, scale 10');
ok(DEFAULTS.width === 470 && DEFAULTS.depth === 180 && DEFAULTS.rearGap === 90 && DEFAULTS.sideGap === 150,
   '기본값 47 / 18 / 9 / 15 cm');

console.log('\n── 1) 기본값 47/18/9/15 → 3조각 ZIP ──');
const r1 = validate(fromCm({ width: 47, depth: 18, rearGap: 9, sideGap: 15 }));
ok(r1.ok && r1.errors.length === 0, `검증 통과 (errors ${r1.errors.length}, warnings ${r1.warnings.length})`);
const p1 = buildPieces(r1.params);
ok(p1.length === 3, `조각 ${p1.length}개: ${p1.map(q => q.name).join(', ')}`);
for (const q of p1) {
  const stl = toBinarySTL(q, q.label);
  ok(watertight(q) && stl.byteLength === 84 + 50 * q.triangleCount,
     `${q.label}: 삼각형 ${q.triangleCount}, ${q.size.map(v => v.toFixed(1)).join('×')}mm, 부피 ${(q.volume / 1000).toFixed(1)}cm³, 배수 ${q.slotCount}개, 닫힘`);
}
const zip = new Uint8Array(toZip(p1.map(q => ({ name: fileName(r1.params, q), data: toBinarySTL(q, q.label) }))));
const dv = new DataView(zip.buffer), eocd = zip.length - 22;
ok(dv.getUint32(0, true) === 0x04034b50 && dv.getUint32(eocd, true) === 0x06054b50 && dv.getUint16(eocd + 10, true) === 3,
   `ZIP 구조 정상, 항목 3개 (${(zip.length / 1024).toFixed(0)}KB)`);
const w = +(r1.params.width / 10).toFixed(1), d = +(r1.params.depth / 10).toFixed(1);
ok(`moss_${w}x${d}cm_${p1.length}pieces.zip` === 'moss_47x18cm_3pieces.zip', 'ZIP 파일명 moss_47x18cm_3pieces.zip');

console.log('\n── 2) 옆 공간 0 → STL 1개 ──');
const r2 = validate(fromCm({ width: 47, depth: 18, rearGap: 9, sideGap: 0 }));
const p2 = r2.ok ? buildPieces(r2.params) : [];
ok(r2.ok && p2.length === 1 && watertight(p2[0]), `조각 ${p2.length}개 (${p2.map(q => q.name).join()}), 경고 "${r2.warnings[0]?.message}"`);

console.log('\n── 3) 뒤 공간 1 → 에러, 생성 안 함 ──');
const r3 = validate(fromCm({ width: 47, depth: 18, rearGap: 1, sideGap: 15 }));
ok(!r3.ok && r3.errors[0]?.field === 'rearGap', `ok=${r3.ok}, field=${r3.errors[0]?.field}, "${r3.errors[0]?.message}"`);

console.log('\n── 빈칸 → 에러 ──');
const r4 = validate({ ...fromCm({ width: 47, depth: 18, rearGap: 9, sideGap: 15 }), width: NaN });
ok(!r4.ok && r4.errors[0]?.field === 'width', `ok=${r4.ok}, "${r4.errors[0]?.message}"`);

console.log(fail ? `\n${fail}개 실패` : '\n전부 통과');
process.exit(fail ? 1 : 0);
