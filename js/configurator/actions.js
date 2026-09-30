/* ==========================================================================
   Configurator — CTA (stl 파일 생성하기)
   폼 submit(버튼 클릭 또는 Enter)을 받아 onSubmit에 넘기고,
   onSubmit이 Promise를 돌려주면 끝날 때까지 버튼을 busy 상태로 둔다.
   ========================================================================== */
(function (Moss) {
  Moss.bindAction = function (form, onSubmit) {
    var button = form.querySelector('[data-cfg-action]');
    var busy = false;

    function setBusy(on) {
      busy = on;
      button.setAttribute('aria-busy', on ? 'true' : 'false');
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (busy) return;
      var out = onSubmit();
      if (out && typeof out.then === 'function') {
        setBusy(true);
        out.then(function () { setBusy(false); }, function () { setBusy(false); });
      }
    });

    return { button: button, setBusy: setBusy };
  };
})(window.Moss = window.Moss || {});
