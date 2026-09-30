/* ==========================================================================
   Configurator — 연결부 + 외부 공개 API
   각 모듈을 조립하고 window.MossConfigurator 로 인터페이스를 연다.

   외부(STL 생성 모듈)에서 쓰는 방법:
     MossConfigurator.onChange(function (values, result) { ... })
     MossConfigurator.onGenerate(function (values) { return exportStl(values); })
     MossConfigurator.setPreview({ mount, update, destroy })
     MossConfigurator.getValues() / setValues({ width: 60 }) / validate()

   values = { width, height, backGap, sideGap }  // 단위 cm, 미입력은 null
   ========================================================================== */
(function (Moss) {
  var form = document.querySelector('[data-configurator]');
  if (!form) return;

  var schema = Moss.configuratorSchema;
  var initial = {};
  schema.fields.forEach(function (f) { initial[f.key] = null; });

  var store = Moss.createStore(initial);
  var inputs = Moss.bindInputs(form, store, schema);
  var feedback = Moss.createFeedback(form, schema);
  var preview = Moss.createPreviewSlot(form.querySelector('[data-cfg-preview]'));

  var changeHandlers = [];
  var generateHandler = null;

  function validate() { return Moss.validateConfigurator(store.get(), schema); }

  function refresh() {
    var result = validate();
    feedback.render(result, inputs.getTouched());
    return result;
  }

  store.subscribe(function (values) {
    var result = refresh();
    preview.update(values, result);
    changeHandlers.forEach(function (fn) { fn(values, result); });
  });
  inputs.onTouched(refresh);

  Moss.bindAction(form, function () {
    inputs.touchAll();
    var result = refresh();
    if (!result.valid) {
      var firstKey = schema.fields.map(function (f) { return f.key; })
        .filter(function (k) { return result.errors[k]; })[0];
      inputs.focus(firstKey);
      return;
    }
    if (!generateHandler) {
      feedback.setMessage('STL 생성 기능은 곧 연결될 예정이에요.', 'info');
      return;
    }
    feedback.setMessage('');
    return generateHandler(store.get());
  });

  window.MossConfigurator = {
    schema: schema,
    getValues: function () { return store.get(); },
    setValues: function (patch) { store.set(patch); },
    validate: validate,
    onChange: function (fn) {
      changeHandlers.push(fn);
      return function () { changeHandlers = changeHandlers.filter(function (f) { return f !== fn; }); };
    },
    onGenerate: function (fn) { generateHandler = fn; },
    setPreview: function (adapter) { preview.setAdapter(adapter); },
    setMessage: function (text, tone) { feedback.setMessage(text, tone); }
  };
})(window.Moss = window.Moss || {});
