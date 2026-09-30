/**
 * S3 컨피규레이터 배선. 입력 → 검증 → 메시 생성 → 뷰어 / 통계 / 다운로드.
 * 계산은 core/, 그리기는 viewer/, 폼·표시는 ui/ 가 한다. 이 파일은 연결만 한다.
 *
 * 생명주기
 *  - 뷰어는 S3 가 화면 근처에 오면 mount (WebGL 컨텍스트를 늦게 만든다)
 *  - pagehide 에서 dispose (렌더 루프 · ResizeObserver · GPU 자원 해제)
 *  - 입력은 requestAnimationFrame 으로 묶어 한 프레임에 한 번만 재생성
 */
import { DEFAULTS } from './core/params.js';
import { validate } from './core/validate.js';
import { buildMesh } from './core/geometry.js';
import { downloadSTL } from './core/stl.js';
import { createViewer } from './viewer/viewer.js';
import { createControls } from './ui/controls.js';
import { createStats } from './ui/stats.js';

const root = document.querySelector('[data-configurator]');
if (root) init(root);

function init(root) {
  const $ = s => root.querySelector(s);
  const stage = $('[data-cfg-stage]');
  const download = $('[data-cfg-download]');
  const general = $('[data-cfg-general]');
  const stats = createStats($('[data-cfg-stats]'), $('[data-cfg-fixed]'));

  let viewer = null;
  let current = null;        // 마지막으로 성공한 { mesh, params }
  let needsFrame = true;     // 다음 성공 메시에서 시점 맞춤

  /* ---- 뷰어 mount / unmount ---- */
  function mountViewer() {
    if (viewer) return;
    viewer = createViewer(stage);
    if (current) showMesh(current.mesh);
  }
  function unmountViewer() {
    if (!viewer) return;
    viewer.dispose();
    viewer = null;
    needsFrame = true;
  }
  function showMesh(mesh) {
    if (!viewer) return;
    viewer.update(mesh);
    if (needsFrame) {
      needsFrame = false;
      // 컨테이너 크기가 잡힌 뒤에 맞춰야 화면 중앙에 온다
      requestAnimationFrame(() => { if (viewer) { viewer.resize(); viewer.frame(mesh); } });
    }
  }

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(entries => {
      if (entries.some(e => e.isIntersecting)) { mountViewer(); io.disconnect(); }
    }, { rootMargin: '400px 0px' });
    io.observe(stage);
  } else {
    mountViewer();
  }
  window.addEventListener('pagehide', unmountViewer);
  window.addEventListener('pageshow', e => { if (e.persisted) mountViewer(); });

  /* ---- 입력 → 검증 → 생성 ---- */
  function render(values) {
    const result = validate(values);
    controls.applyValidation(result);
    general.textContent = '';

    if (!result.ok) {
      download.disabled = true;
      stats.setStale(true);
      return;
    }

    let mesh;
    try {
      mesh = buildMesh(result.params);
    } catch (e) {
      general.textContent = `모델 생성 실패: ${e.message}`;
      download.disabled = true;
      stats.setStale(true);
      return;
    }

    current = { mesh, params: result.params };
    showMesh(mesh);
    stats.render(mesh.stats, result.params);
    stats.setStale(false);
    download.disabled = false;
  }

  let pending = null;
  function schedule(values) {
    const first = pending === null;
    pending = values;
    if (first) requestAnimationFrame(() => { const v = pending; pending = null; render(v); });
  }

  const controls = createControls($('[data-cfg-fields]'), DEFAULTS, schedule);

  /* ---- 버튼 ---- */
  download.addEventListener('click', () => {
    if (!current || download.disabled) return;
    const p = current.params;
    downloadSTL(current.mesh, `moss_tray_${p.width}x${p.depth}.stl`);
  });
  $('[data-cfg-reset]').addEventListener('click', () => { needsFrame = true; controls.set(DEFAULTS); });
  $('[data-cfg-refit]').addEventListener('click', () => { if (viewer && current) viewer.frame(current.mesh); });

  render(DEFAULTS);
}
