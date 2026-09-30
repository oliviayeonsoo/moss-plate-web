/* ==========================================================================
   MOSS_SITE 설정을 [data-site-link] / [data-site-image] 요소에 적용
   ========================================================================== */
(function () {
  var site = window.MOSS_SITE || {};
  var links = site.links || {};
  var images = site.images || {};
  var EXTERNAL = /^https?:\/\//;

  document.querySelectorAll('[data-site-link]').forEach(function (a) {
    var key = a.getAttribute('data-site-link');
    var value = links[key];
    if (!value) return;

    if (key === 'email') {
      a.href = 'mailto:' + value;
      a.textContent = value;                    // 표시 주소도 설정값과 맞춘다
      return;
    }
    a.href = value;
    if (EXTERNAL.test(value)) {
      a.target = '_blank';
      a.rel = 'noopener';
    }
  });

  // 이미지는 경로가 있고 실제로 불러와졌을 때만 보인다
  document.querySelectorAll('[data-site-image]').forEach(function (img) {
    var src = images[img.getAttribute('data-site-image')];
    if (!src) return;
    img.addEventListener('load', function () { img.hidden = false; });
    img.addEventListener('error', function () { img.hidden = true; });
    img.src = src;
  });
})();
