/* ==========================================================================
   Configurator — 검증 결과 표시
   touched된 필드의 오류만 보여준다: 칩 주황, 해당 안내문 강조, 메시지 한 줄.
   ========================================================================== */
(function (Moss) {
  Moss.createFeedback = function (root, schema) {
    var chips = {};
    var warns = {};
    root.querySelectorAll('[data-cfg-chip]').forEach(function (el) { chips[el.getAttribute('data-cfg-chip')] = el; });
    root.querySelectorAll('[data-cfg-warn]').forEach(function (el) { warns[el.getAttribute('data-cfg-warn')] = el; });
    var message = root.querySelector('[data-cfg-message]');
    var order = schema.fields.map(function (f) { return f.key; });

    function toggle(el, attr, on) {
      if (!el) return;
      if (on) el.setAttribute(attr, ''); else el.removeAttribute(attr);
    }

    return {
      render: function (result, touched) {
        var first = null;
        order.forEach(function (key) {
          var show = !!(touched[key] && result.errors[key]);
          toggle(chips[key], 'data-invalid', show);
          toggle(warns[key], 'data-active', show);
          var input = chips[key] && chips[key].querySelector('input');
          if (input) input.setAttribute('aria-invalid', show ? 'true' : 'false');
          if (show && !first) first = key;
        });
        this.setMessage(first ? result.errors[first] : '');
        return first;
      },

      // 상태 메시지 (tone: 'error' | 'info')
      setMessage: function (text, tone) {
        message.textContent = text || '';
        if (tone === 'info') message.setAttribute('data-tone', 'info');
        else message.removeAttribute('data-tone');
      }
    };
  };
})(window.Moss = window.Moss || {});
