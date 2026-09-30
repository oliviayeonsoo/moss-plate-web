/**
 * 파라미터 → 삼각형 메시.
 * 불리언(CSG) 없이 닫힌 면을 직접 구성한다. 결정론적이고 빠르다.
 *
 * 구성 면:
 *   ① 바닥(z=0)  ② 바깥벽  ③ 윗면 림  ④ 안쪽벽  ⑤ 배수 슬롯 터널  ⑥ 바닥 윗면(경사)
 */
import { triangulate } from './triangulate.js';
import { buildProfiles } from './profile.js';

export function buildMesh(p) {
  const { outer, inner, slotEdge, mossArea } = buildProfiles(p);
  const N = outer.length;
  const H = p.height;
  const tanS = Math.tan(p.slopeDeg * Math.PI / 180);
  const ftop = y => p.floor + y * tanS;          // 안쪽 바닥면 높이

  const tris = [];
  const T = (a, b, c) => tris.push(a, b, c);
  const Q = (a, b, c, d) => { T(a, b, c); T(a, c, d); };
  const P3 = (pt, z) => [pt[0], pt[1], z];

  // ① 바닥 (법선 -Z → 반시계를 뒤집는다)
  for (const [i, j, k] of triangulate(outer))
    T(P3(outer[i], 0), P3(outer[k], 0), P3(outer[j], 0));

  // ② 바깥벽 — 모든 구간을 슬롯 높이에서 똑같이 끊는다 (T자 정점 방지)
  const ZL = [0, p.slotZ0, p.slotZ1, H];
  for (let i = 0; i < N; i++) {
    const a = outer[i], b = outer[(i + 1) % N];
    for (let k = 0; k < 3; k++) {
      if (k === 1 && slotEdge[i]) continue;                 // 여기가 배수 창
      Q(P3(a, ZL[k]), P3(b, ZL[k]), P3(b, ZL[k + 1]), P3(a, ZL[k + 1]));
    }
  }

  // ③ 윗면 림 (법선 +Z)
  for (let i = 0; i < N; i++) {
    const j = (i + 1) % N;
    Q(P3(outer[i], H), P3(outer[j], H), P3(inner[j], H), P3(inner[i], H));
  }

  // ④ 안쪽벽 (법선은 웰 안쪽) — 바깥벽과 같은 높이에서 끊어 정점을 맞춘다
  //    바닥 경사 상한(maxRearRise 2.5) 때문에 ftop < slotZ1 은 항상 성립한다
  for (let i = 0; i < N; i++) {
    const j = (i + 1) % N;
    const a = inner[i], b = inner[j];
    const za = ftop(a[1]), zb = ftop(b[1]), zc = p.slotZ1;
    if (za < zc - 1e-9 && zb < zc - 1e-9) {
      if (!slotEdge[i]) Q(P3(a, za), P3(a, zc), P3(b, zc), P3(b, zb));  // 개구부 아래
      Q(P3(a, zc), P3(a, H), P3(b, H), P3(b, zc));                      // 개구부 위
    } else {
      Q(P3(a, za), P3(a, H), P3(b, H), P3(b, zb));
    }
  }

  // ⑤ 배수 슬롯 터널 (바닥면·천장면 + 양 끝 마구리)
  for (let i = 0; i < N; i++) {
    if (!slotEdge[i]) continue;
    const j = (i + 1) % N;
    const o0 = outer[i], o1 = outer[j], n0 = inner[i], n1 = inner[j];
    Q(P3(o0, p.slotZ0), P3(o1, p.slotZ0), P3(n1, p.slotZ0), P3(n0, p.slotZ0)); // 아래 (+Z)
    Q(P3(o0, p.slotZ1), P3(n0, p.slotZ1), P3(n1, p.slotZ1), P3(o1, p.slotZ1)); // 위 (-Z)
    const prev = (i - 1 + N) % N;
    if (!slotEdge[prev])                                                        // 시작 마구리
      Q(P3(o0, p.slotZ0), P3(n0, p.slotZ0), P3(n0, p.slotZ1), P3(o0, p.slotZ1));
    if (!slotEdge[j])                                                           // 끝 마구리
      Q(P3(o1, p.slotZ0), P3(o1, p.slotZ1), P3(n1, p.slotZ1), P3(n1, p.slotZ0));
  }

  // ⑥ 바닥 윗면 (앞이 얇고 뒤가 두껍다 → 물이 앞으로 흐름)
  for (const [i, j, k] of triangulate(inner))
    T(P3(inner[i], ftop(inner[i][1])),
      P3(inner[j], ftop(inner[j][1])),
      P3(inner[k], ftop(inner[k][1])));

  // Float32Array 로 굽기 + 면법선 계산
  const count = tris.length / 3;
  const positions = new Float32Array(tris.length * 3);
  const normals = new Float32Array(tris.length * 3);
  for (let t = 0; t < count; t++) {
    const a = tris[t * 3], b = tris[t * 3 + 1], c = tris[t * 3 + 2];
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
    const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const L = Math.hypot(nx, ny, nz) || 1;
    nx /= L; ny /= L; nz /= L;
    for (let v = 0; v < 3; v++) {
      const q = (t * 3 + v) * 3, s = [a, b, c][v];
      positions[q] = s[0]; positions[q + 1] = s[1]; positions[q + 2] = s[2];
      normals[q] = nx; normals[q + 1] = ny; normals[q + 2] = nz;
    }
  }

  return {
    positions, normals, triangleCount: count,
    stats: {
      triangleCount: count,
      mossArea,                                   // mm²
      volume: meshVolume(positions, count),       // mm³
      slotCount: p.slotXs.length,
      cornerR: p.cornerR,
      slopeDeg: p.slopeDeg,
      wellFront: p.wellFront,
      wellRear: p.wellRear,
      size: [p.width, p.depth, p.height],
    },
  };
}

/** 부호 있는 부피 (닫힌 메시 검증 + 무게 추정용) */
export function meshVolume(pos, count) {
  let v = 0;
  for (let t = 0; t < count; t++) {
    const o = t * 9;
    const ax = pos[o],     ay = pos[o + 1], az = pos[o + 2];
    const bx = pos[o + 3], by = pos[o + 4], bz = pos[o + 5];
    const cx = pos[o + 6], cy = pos[o + 7], cz = pos[o + 8];
    v += (ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx)) / 6;
  }
  return v;
}
