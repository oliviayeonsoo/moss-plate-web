/**
 * 2D 윤곽 생성.
 * 바깥 루프와 안쪽 루프를 "같은 구조"로 만들어서 인덱스가 1:1 대응되게 한다.
 * (그래야 벽을 사각형으로 이어 붙일 수 있다)
 */
import { polygonArea } from './triangulate.js';

const TAU4 = Math.PI / 2;

function arc(cx, cy, r, a0, a1, seg, out, skipFirst, skipLast) {
  const i0 = skipFirst ? 1 : 0;
  const i1 = skipLast ? seg - 1 : seg;
  for (let i = i0; i <= i1; i++) {
    const t = a0 + (a1 - a0) * i / seg;
    out.push([cx + r * Math.cos(t), cy + r * Math.sin(t)]);
  }
}

/**
 * 뒤쪽 가운데가 U 로 파인 라운드 사각형 루프 (CCW).
 * 앞변에는 cuts 의 x 좌표마다 정점을 추가로 박는다 (배수 슬롯 경계용).
 */
function makeLoop({ x0, y0, x1, y1, cr, nx0, nx1, ny, nr, seg, cuts }) {
  const P = [];

  // 앞변: (x0+cr, y0) → (x1-cr, y0)
  const fa = x0 + cr, fb = x1 - cr;
  const fx = [fa, ...cuts.filter(x => x > fa + 1e-6 && x < fb - 1e-6).sort((a, b) => a - b), fb];
  fx.forEach(x => P.push([x, y0]));
  const frontEdges = fx.length - 1;              // 앞변이 차지하는 edge 개수

  arc(x1 - cr, y0 + cr, cr, -TAU4, 0, seg, P, true, false);        // 앞-오른
  arc(x1 - cr, y1 - cr, cr, 0, TAU4, seg, P, false, false);        // 뒤-오른
  P.push([nx1, y1]);
  P.push([nx1, ny + nr]);
  arc(nx1 - nr, ny + nr, nr, 0, -TAU4, seg, P, true, false);       // 홈-오른
  P.push([nx0 + nr, ny]);
  arc(nx0 + nr, ny + nr, nr, -TAU4, -Math.PI, seg, P, true, false);// 홈-왼
  P.push([nx0, y1]);
  arc(x0 + cr, y1 - cr, cr, TAU4, Math.PI, seg, P, false, false);  // 뒤-왼
  arc(x0 + cr, y0 + cr, cr, Math.PI, Math.PI * 1.5, seg, P, false, true); // 앞-왼

  return { pts: P, frontEdges, frontXs: fx };
}

/**
 * @returns {{outer, inner, slotEdge, mossArea}}
 *   outer/inner : [x,y][]  (길이 동일, 인덱스 대응)
 *   slotEdge    : boolean[]  edge i (= pts[i]→pts[i+1]) 가 배수 슬롯 개구부인지
 *   mossArea    : 이끼가 깔리는 면적 (mm²)
 */
export function buildProfiles(p) {
  const seg = p.arcSeg;
  const cuts = [];
  for (const xc of p.slotXs) cuts.push(xc - p.slotW / 2, xc + p.slotW / 2);

  const outer = makeLoop({
    x0: 0, y0: 0, x1: p.width, y1: p.depth,
    cr: p.cornerR,
    nx0: p.notchX0, nx1: p.notchX1, ny: p.notchY, nr: p.notchR,
    seg, cuts,
  });

  // 안쪽 루프: 벽 두께만큼 안으로. 홈은 반대로 벽 두께만큼 넓어진다.
  const inner = makeLoop({
    x0: p.wall, y0: p.wall, x1: p.width - p.wall, y1: p.depth - p.wall,
    cr: p.cornerR - p.wall,
    nx0: p.notchX0 - p.wall, nx1: p.notchX1 + p.wall,
    ny: p.notchY - p.wall, nr: p.notchR + p.wall,
    seg, cuts,
  });

  if (outer.pts.length !== inner.pts.length) {
    throw new Error(`윤곽 정점 수 불일치 (${outer.pts.length} vs ${inner.pts.length})`);
  }

  // 앞변 edge 중 슬롯 구간 표시
  const slotEdge = new Array(outer.pts.length).fill(false);
  for (let i = 0; i < outer.frontEdges; i++) {
    const mid = (outer.frontXs[i] + outer.frontXs[i + 1]) / 2;
    slotEdge[i] = p.slotXs.some(xc => Math.abs(mid - xc) < p.slotW / 2 - 1e-6);
  }

  return {
    outer: outer.pts,
    inner: inner.pts,
    slotEdge,
    mossArea: polygonArea(inner.pts),
  };
}
