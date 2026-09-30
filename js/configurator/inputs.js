/* ==========================================================================
   Configurator — 입력 칩 뷰
   [data-cfg-field] 입력칸을 store와 양방향으로 연결한다.
   입력 문자열 정리(숫자·소수점만), 칩 폭 맞춤, touched 상태를 담당.
   ========================================================================== */
(function (Moss) {
  Moss.bindInputs = function (root, store, schema) {
    var inputs = {};
    var touched = {};
    var typing = null;         // 사용자가 지금 입력 중인 필드 (그 칸은 되쓰지 않음)
    var listeners = [];
    var maxDecimals = schema.decimals;

    root.querySelectorAll('[data-cfg-field]').forEach(function (el) {
      inputs[el.getAttribute('data-cfg-field')] = el;
    });

    // 폭 측정용 (placeholder와 입력값을 같은 글꼴로 잰다)
    var ruler = document.createElement('span');
    ruler.setAttribute('aria-hidden', 'true');
    ruler.style.cssText = 'position:absolute;visibility:hidden;white-space:pre;left:-9999px;top:0';
    root.appendChild(ruler);

    // 가로 칩은 폭을, 세로쓰기 칩은 높이를 내용 길이에 맞춘다
    function fit(el) {
      var cs = getComputedStyle(el);
      ruler.style.font = cs.font;
      ruler.style.letterSpacing = cs.letterSpacing;
      ruler.style.writingMode = cs.writingMode;
      ruler.style.textOrientation = cs.textOrientation;
      ruler.textContent = el.value || el.placeholder;
      var r = ruler.getBoundingClientRect();
      var vertical = cs.writingMode.indexOf('vertical') === 0;
      if (vertical) el.style.height = Math.ceil(r.height) + 2 + 'px';
      else el.style.width = Math.ceil(r.width) + 2 + 'px';
    }

    function sanitize(raw) {
      var s = raw.replace(/[^0-9.]/g, '');
      var dot = s.indexOf('.');
      if (dot !== -1) {
        s = s.slice(0, dot + 1) + s.slice(dot + 1).replace(/\./g, '');
        if (maxDecimals >= 0) s = s.slice(0, dot + 1 + maxDecimals);
      }
      return s.slice(0, 6);
    }

    function parse(s) {
      if (s === '' || s === '.') return null;
      var n = parseFloat(s);
      return isNaN(n) ? null : n;
    }

    function emitTouched() { listeners.forEach(function (fn) { fn(Object.assign({}, touched)); }); }

    Object.keys(inputs).forEach(function (key) {
      var el = inputs[key];
      fit(el);

      el.addEventListener('input', function () {
        var clean = sanitize(el.value);
        if (clean !== el.value) el.value = clean;
        fit(el);
        typing = key;
        store.set((function (p) { p[key] = parse(clean); return p; })({}));
        typing = null;
      });

      el.addEventListener('blur', function () {
        if (el.value === '.') { el.value = ''; fit(el); }
        if (!touched[key]) { touched[key] = true; emitTouched(); }
      });
    });

    // 외부에서 setValues로 값이 바뀌면 입력칸에 반영
    store.subscribe(function (values) {
      Object.keys(inputs).forEach(function (key) {
        var el = inputs[key];
        if (key === typing) return;
        var shown = parse(el.value);
        if (shown !== values[key]) {
          el.value = values[key] === null ? '' : String(values[key]);
          fit(el);
        }
      });
    });

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () { Object.keys(inputs).forEach(function (k) { fit(inputs[k]); }); });
    }

    return {
      inputs: inputs,
      getTouched: function () { return Object.assign({}, touched); },
      touchAll: function () { Object.keys(inputs).forEach(function (k) { touched[k] = true; }); emitTouched(); },
      onTouched: function (fn) { listeners.push(fn); },
      focus: function (key) { if (inputs[key]) inputs[key].focus(); }
    };
  };
})(window.Moss = window.Moss || {});
