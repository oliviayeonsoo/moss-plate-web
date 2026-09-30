/* ==========================================================================
   Configurator — 검증 (순수 함수)
   validate(values, schema) → { valid, errors: { key: message } }
   ========================================================================== */
(function (Moss) {
  Moss.validateConfigurator = function (values, schema) {
    var errors = {};

    schema.fields.forEach(function (f) {
      var v = values[f.key];
      if (v === null || v === undefined || isNaN(v)) {
        errors[f.key] = f.messages.required;
        return;
      }
      if (f.allowZero && v === 0) return;
      var tooSmall = f.minExclusive ? v <= f.min : v < f.min;
      if (tooSmall) errors[f.key] = f.messages.min;
    });

    (schema.rules || []).forEach(function (r) {
      if (errors[r.target]) return;
      var ready = r.needs.every(function (k) { return values[k] !== null && !errors[k]; });
      if (ready && !r.test(values)) errors[r.target] = r.message;
    });

    return { valid: Object.keys(errors).length === 0, errors: errors };
  };
})(window.Moss = window.Moss || {});
