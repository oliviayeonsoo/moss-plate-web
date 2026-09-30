/* ==========================================================================
   S1. 서울 지도 — 확대/축소, 드래그 이동, 마커 툴팁, 축척
   file:// 로 열어도 동작하도록 모듈이 아닌 일반 스크립트로 둔다.
   ========================================================================== */
(function () {
  var root = document.querySelector('[data-seoul-map]');
  if (!root) return;

  var viewport = root.querySelector('[data-map-viewport]');
  var stage = root.querySelector('[data-map-stage]');
  var markers = Array.prototype.slice.call(root.querySelectorAll('.seoul-map__marker'));
  var tooltip = root.querySelector('[data-map-tooltip]');
  var tipName = tooltip.querySelector('[data-tooltip-name]');
  var tipAddr = tooltip.querySelector('[data-tooltip-address]');
  var tipAddr2 = tooltip.querySelector('[data-tooltip-address2]');
  var tipLink = tooltip.querySelector('[data-tooltip-link]');
  var zoomIn = root.querySelector('[data-zoom="in"]');
  var zoomOut = root.querySelector('[data-zoom="out"]');
  var scaleEl = root.querySelector('[data-map-scale]');
  var scaleLabel = root.querySelector('[data-scale-label]');

  /* ---- 설정 ------------------------------------------------------------ */
  var ZOOMS = [1, 1.5, 2, 2.5, 3];
  var SEOUL_EW_KM = 36.78;          // 서울 동서 길이
  var MAP_INK_RATIO = 1572 / 1589;  // 스테이지 폭 중 지도 잉크가 차지하는 비율
  var SCALE_STEPS_KM = [1, 2, 5, 10];
  var SCALE_MAX_PX = 64;

  // 러프 툴팁 기하 (마커 중심 기준, px)
  var TIP_LEFT_FROM_MARKER = 41;    // 툴팁 왼쪽 끝 = 마커 x - 41
  var TIP_GAP = 30;                 // 툴팁 본문 아래 끝 = 마커 y - 30
  var TAIL_TIP_FROM_MARKER = 9;     // 꼬리 끝 x = 마커 x + 9
  var TAIL_TIP_IN_SVG = 0;          // 꼬리 SVG 안에서 끝점 x
  var EDGE = 10;                    // 패널 안쪽 여백

  var zi = 0;
  var tx = 0, ty = 0;
  var pinned = null;
  var hovered = null;

  /* ---- 확대/이동 -------------------------------------------------------- */
  function z() { return ZOOMS[zi]; }

  function clampPan() {
    var w = stage.offsetWidth, h = stage.offsetHeight;
    var mx = (w * (z() - 1)) / 2 + 40;
    var my = (h * (z() - 1)) / 2 + 40;
    if (z() === 1) { tx = 0; ty = 0; return; }
    tx = Math.max(-mx, Math.min(mx, tx));
    ty = Math.max(-my, Math.min(my, ty));
  }

  function apply() {
    clampPan();
    root.style.setProperty('--z', z());
    stage.style.transform = 'translate(' + tx + 'px,' + ty + 'px) scale(' + z() + ')';
    zoomIn.disabled = zi === ZOOMS.length - 1;
    zoomOut.disabled = zi === 0;
    if (z() > 1) root.setAttribute('data-zoomed', ''); else root.removeAttribute('data-zoomed');
    updateScale();
    followTooltip(320);
  }

  function setZoom(next) {
    next = Math.max(0, Math.min(ZOOMS.length - 1, next));
    if (next === zi) return;
    var ratio = ZOOMS[next] / z();
    tx *= ratio; ty *= ratio;       // 화면 중심 기준 유지
    zi = next;
    apply();
  }

  zoomIn.addEventListener('click', function () { setZoom(zi + 1); });
  zoomOut.addEventListener('click', function () { setZoom(zi - 1); });

  var drag = null;
  viewport.addEventListener('pointerdown', function (e) {
    if (z() === 1 || e.target.closest('.seoul-map__marker')) return;
    drag = { x: e.clientX, y: e.clientY, tx: tx, ty: ty };
    viewport.setPointerCapture(e.pointerId);
    root.setAttribute('data-dragging', '');
  });
  viewport.addEventListener('pointermove', function (e) {
    if (!drag) return;
    tx = drag.tx + (e.clientX - drag.x);
    ty = drag.ty + (e.clientY - drag.y);
    clampPan();
    stage.style.transform = 'translate(' + tx + 'px,' + ty + 'px) scale(' + z() + ')';
    placeTooltip();
  });
  function endDrag() {
    if (!drag) return;
    drag = null;
    root.removeAttribute('data-dragging');
  }
  viewport.addEventListener('pointerup', endDrag);
  viewport.addEventListener('pointercancel', endDrag);

  /* ---- 축척 ------------------------------------------------------------ */
  function updateScale() {
    var pxPerKm = (stage.offsetWidth * MAP_INK_RATIO * z()) / SEOUL_EW_KM;
    var km = SCALE_STEPS_KM[0];
    for (var i = 0; i < SCALE_STEPS_KM.length; i++) {
      if (SCALE_STEPS_KM[i] * pxPerKm <= SCALE_MAX_PX) km = SCALE_STEPS_KM[i];
    }
    scaleEl.style.setProperty('--scale-w', Math.round(km * pxPerKm) + 'px');
    scaleLabel.textContent = km + 'km';
  }

  /* ---- 툴팁 ------------------------------------------------------------ */
  function active() { return hovered || pinned; }

  function fill(m) {
    tipName.textContent = m.dataset.name;
    tipAddr.textContent = m.dataset.address || '';
    tipAddr2.textContent = m.dataset.address2 || '';
    tipLink.href = m.dataset.href || '#';
    tipLink.setAttribute('aria-label', m.dataset.name + ' 자세히 보기');
  }

  function placeTooltip() {
    var m = active();
    if (!m) { tooltip.hidden = true; return; }
    tooltip.hidden = false;

    var box = root.getBoundingClientRect();
    var r = m.getBoundingClientRect();
    var mx = r.left + r.width / 2 - box.left - root.clientLeft;
    var my = r.top + r.height / 2 - box.top - root.clientTop;
    var tw = tooltip.offsetWidth, th = tooltip.offsetHeight;
    var W = root.clientWidth, H = root.clientHeight;

    var left = mx - TIP_LEFT_FROM_MARKER;
    left = Math.max(EDGE, Math.min(W - tw - EDGE, left));

    var top = my - TIP_GAP - th;
    var placement = 'above';
    if (top < EDGE) { top = my + TIP_GAP; placement = 'below'; }

    var tailX = mx + TAIL_TIP_FROM_MARKER - left - TAIL_TIP_IN_SVG;
    tailX = Math.max(12, Math.min(tw - 30, tailX));

    tooltip.style.left = left + 'px';
    tooltip.style.top = top + 'px';
    tooltip.style.setProperty('--tail-x', tailX + 'px');
    tooltip.setAttribute('data-placement', placement);

    // 마커가 패널 밖으로 밀려났으면 숨김
    var outside = mx < 0 || my < 0 || mx > W || my > H;
    tooltip.style.visibility = outside ? 'hidden' : '';
  }

  function show() {
    var m = active();
    markers.forEach(function (el) {
      el.setAttribute('aria-expanded', el === m ? 'true' : 'false');
      if (el === m) el.setAttribute('aria-describedby', 'map-tooltip');
      else el.removeAttribute('aria-describedby');
    });
    if (m) fill(m);
    placeTooltip();
  }

  // 확대 애니메이션 동안 마커를 따라가도록 매 프레임 위치 갱신
  var followUntil = 0;
  function followTooltip(ms) {
    var start = !followUntil || performance.now() > followUntil;
    followUntil = performance.now() + ms;
    if (!start) return;
    (function loop() {
      placeTooltip();
      if (performance.now() < followUntil) requestAnimationFrame(loop);
      else followUntil = 0;
    })();
  }

  // 마커에서 툴팁(화살표 버튼)으로 커서를 옮길 수 있게 잠깐 기다렸다 닫는다
  var leaveTimer = 0;
  function hoverOn(m) { clearTimeout(leaveTimer); hovered = m; show(); }
  function hoverOff() {
    clearTimeout(leaveTimer);
    leaveTimer = setTimeout(function () { hovered = null; show(); }, 180);
  }

  markers.forEach(function (m) {
    m.setAttribute('aria-controls', 'map-tooltip');
    m.addEventListener('mouseenter', function () { hoverOn(m); });
    m.addEventListener('mouseleave', hoverOff);
    m.addEventListener('focus', function () { hoverOn(m); });
    m.addEventListener('blur', hoverOff);
    m.addEventListener('click', function () { pinned = m; hoverOn(m); });
  });

  tooltip.addEventListener('mouseenter', function () { clearTimeout(leaveTimer); });
  tooltip.addEventListener('mouseleave', hoverOff);

  /* ---- 초기 상태: 러프처럼 기본 마커(강동구) 툴팁을 펼쳐 둔다 ---------- */
  pinned = root.querySelector('.seoul-map__marker[data-default]');
  apply();
  show();

  if (document.fonts && document.fonts.ready) document.fonts.ready.then(placeTooltip);
  window.addEventListener('resize', placeTooltip);
})();
