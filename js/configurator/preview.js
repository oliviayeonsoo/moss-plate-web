/* ==========================================================================
   Configurator — 3D preview 자리
   실제 렌더러는 외부 모듈이 adapter로 넣는다. 지금은 비어 있다.

   adapter 형태:
     {
       mount(el)                  // 최초 1회, preview 요소 전달
       update(values, result)     // 입력값이 바뀔 때마다
       destroy()                  // 선택
     }
   ========================================================================== */
(function (Moss) {
  Moss.createPreviewSlot = function (el) {
    var adapter = null;
    var last = null;

    return {
      el: el,

      setAdapter: function (next) {
        if (adapter && adapter.destroy) adapter.destroy();
        adapter = next || null;
        el.hidden = !adapter;
        if (adapter && adapter.mount) adapter.mount(el);
        if (adapter && last) adapter.update(last.values, last.result);
      },

      update: function (values, result) {
        last = { values: values, result: result };
        if (adapter && adapter.update) adapter.update(values, result);
      }
    };
  };
})(window.Moss = window.Moss || {});
