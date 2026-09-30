/* ==========================================================================
   Configurator — 입력값 상태 저장소
   값은 숫자 또는 null(미입력)로만 보관한다.
   ========================================================================== */
(function (Moss) {
  Moss.createStore = function (initial) {
    var state = Object.assign({}, initial);
    var listeners = [];

    return {
      get: function () { return Object.assign({}, state); },

      // patch: { key: number|null }. 실제로 바뀐 값이 있을 때만 알린다.
      set: function (patch) {
        var changed = false;
        Object.keys(patch).forEach(function (k) {
          if (!(k in state)) return;
          var v = patch[k];
          if (state[k] !== v) { state[k] = v; changed = true; }
        });
        if (changed) {
          var snapshot = this.get();
          listeners.slice().forEach(function (fn) { fn(snapshot); });
        }
        return changed;
      },

      subscribe: function (fn) {
        listeners.push(fn);
        return function () { listeners = listeners.filter(function (f) { return f !== fn; }); };
      }
    };
  };
})(window.Moss = window.Moss || {});
