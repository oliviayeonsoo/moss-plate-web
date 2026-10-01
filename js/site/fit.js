/* ==========================================================================
   화면 폭 맞춤
   - 1440px 이상: 데스크톱 그대로
   - 768~1439px: 1440 데스크톱 화면을 비율 그대로 축소 (.page에 zoom, css/base.css)
   - 767px 이하: 모바일 배치 (각 CSS의 @media (max-width: 767px))
   스크롤바가 생기고 없어질 때도 다시 맞추도록 html 크기를 지켜본다.
   ========================================================================== */
(function () {
  var DESIGN = 1440;
  var MOBILE_MAX = 767;
  var root = document.documentElement;

  function fit() {
    var w = root.clientWidth;
    var k = w > MOBILE_MAX && w < DESIGN ? w / DESIGN : 1;
    root.style.setProperty('--fit', k);
    if (k < 1) root.setAttribute('data-fit', ''); else root.removeAttribute('data-fit');
  }

  fit();
  window.addEventListener('resize', fit);
  if (window.ResizeObserver) new ResizeObserver(fit).observe(root);
})();
