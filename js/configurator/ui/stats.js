/**
 * 결과 통계 표시 (S3). mesh.stats 와 검증된 params 만 받는다.
 * 계산식은 원본 컨피규레이터 ui/app.js 의 paintStats 와 같다.
 */
import { FIXED } from '../core/params.js';

const PETG_DENSITY = 1.27;   // g/cm³

export function createStats(root, fixedEl) {
  if (fixedEl) {
    fixedEl.textContent =
      `고정값 · 높이 ${FIXED.height} · 벽 ${FIXED.wall} · 바닥 ${FIXED.floor} · 배수구 ${FIXED.slotW}×${FIXED.slotH} mm`;
  }

  function render(s, p) {
    const g = s.volume / 1000 * PETG_DENSITY;
    const rows = [
      ['조립 크기',   `${p.width} × ${p.depth} × ${p.height} mm`],
      ['이끼 면적',   `${(s.mossArea / 100).toFixed(1)} cm²`],
      ['웰 깊이',     `앞 ${p.wellFront.toFixed(1)} → 뒤 ${p.wellRear.toFixed(1)} mm`],
      ['재료 (PETG)', `약 ${g.toFixed(0)} g`],
      ['바닥 두께',   `앞 ${p.floorFront.toFixed(1)} → 뒤 ${p.floorRear.toFixed(1)} mm`],
      ['모서리 R',    `${p.cornerR.toFixed(1)} mm`],
      ['바닥 경사',   `${p.slopeDeg.toFixed(2)}°`],
      ['배수 구멍',   `${s.slotCount}개`],
      ['삼각형',      `${s.triangleCount.toLocaleString()}개`],
    ];
    root.innerHTML = rows
      .map(([k, v]) => `<div class="cfg-stat"><dt>${k}</dt><dd>${v}</dd></div>`).join('');
  }

  // 검증 실패 시 마지막 성공 결과를 흐리게 남겨 둔다
  function setStale(on) { root.toggleAttribute('data-stale', on); }

  return { render, setStale };
}
