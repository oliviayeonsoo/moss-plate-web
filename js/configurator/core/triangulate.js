/** 단순 다각형(구멍 없음, CCW) 이어클리핑 삼각분할 */
const area2 = (a, b, c) =>
  (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);

const inside = (p, a, b, c) =>
  area2(a, b, p) >= -1e-9 && area2(b, c, p) >= -1e-9 && area2(c, a, p) >= -1e-9;

/** @returns {number[][]} 정점 인덱스 3개짜리 배열 */
export function triangulate(pts) {
  const n = pts.length;
  if (n < 3) return [];
  let idx = [...Array(n).keys()];
  const out = [];
  let guard = n * n + 16;

  while (idx.length > 3 && guard-- > 0) {
    let cut = false;
    for (let i = 0; i < idx.length; i++) {
      const L = idx.length;
      const i0 = idx[(i - 1 + L) % L], i1 = idx[i], i2 = idx[(i + 1) % L];
      const a = pts[i0], b = pts[i1], c = pts[i2];
      if (area2(a, b, c) <= 1e-9) continue;            // 볼록 정점만 후보
      let clean = true;
      for (const j of idx) {
        if (j === i0 || j === i1 || j === i2) continue;
        if (inside(pts[j], a, b, c)) { clean = false; break; }
      }
      if (!clean) continue;
      out.push([i0, i1, i2]);
      idx.splice(i, 1);
      cut = true;
      break;
    }
    if (!cut) break;                                   // 퇴화 — 남은 건 버린다
  }
  if (idx.length === 3) out.push([idx[0], idx[1], idx[2]]);
  return out;
}

/** 신발끈 공식 면적 (CCW 이면 양수) */
export function polygonArea(pts) {
  let s = 0;
  for (let i = 0, n = pts.length; i < n; i++) {
    const a = pts[i], b = pts[(i + 1) % n];
    s += a[0] * b[1] - b[0] * a[1];
  }
  return s / 2;
}
