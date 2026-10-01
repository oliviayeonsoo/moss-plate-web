/* ==========================================================================
   화면 폭 맞춤
   - 1440px 이상: 데스크톱 그대로
   - 1024~1439px: 1440 데스크톱 화면을 비율 그대로 축소 (.page에 zoom, css/base.css)
   - 1023px 이하: 모바일 배치 (css/mobile.css의 @media (max-width: 1023px))
   스크롤바가 생기고 없어질 때도 다시 맞추도록 html 크기를 지켜본다.
   ========================================================================== */
(function () {
  var DESIGN = 1440;
  var root = document.documentElement;
  // 모바일 여부는 css/mobile.css와 같은 media query로 판단한다 (스크롤바 폭 차이로 어긋나지 않게)
  var mobile = window.matchMedia('(max-width: 1023px)');

  function fit() {
    var w = root.clientWidth;
    var k = !mobile.matches && w < DESIGN ? w / DESIGN : 1;
    root.style.setProperty('--fit', k);
    if (k < 1) root.setAttribute('data-fit', ''); else root.removeAttribute('data-fit');
  }

  fit();
  window.addEventListener('resize', fit);
  if (window.ResizeObserver) new ResizeObserver(fit).observe(root);
})();
