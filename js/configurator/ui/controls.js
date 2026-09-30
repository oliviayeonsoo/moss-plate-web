/**
 * 입력 폼 (S3). core/params.js 의 FIELDS · LIMITS 만 보고 그린다.
 * 항목이 늘거나 줄면 자동으로 따라간다. Figma 디자인이 오면 이 파일만 갈아끼운다.
 *
 * 계약 (원본 컨피규레이터 ui/controls.js 와 같음)
 *   createControls(root, initialValues, onChange) → { values, applyValidation, set }
 *   - 값이 바뀌면 onChange(values)
 *   - applyValidation(result) : errors → 해당 필드 막힘 표시, warnings → 주의 표시
 */
import { FIELDS, LIMITS } from '../core/params.js';

export function createControls(root, initial, onChange) {
  const values = { ...initial };
  const fields = {};

  for (const f of FIELDS) {
    const [lo, hi] = LIMITS[f.key];
    const id = `cfg-${f.key}`;
    const row = document.createElement('div');
    row.className = 'cfg-field';
    row.innerHTML = `
      <label class="cfg-field__label" for="${id}">${f.label}</label>
      <span class="cfg-field__box">
        <input class="cfg-field__input" id="${id}" type="number" inputmode="decimal"
               step="${f.step}" min="${lo}" max="${hi}" value="${values[f.key]}"
               aria-describedby="${id}-msg">
        <span class="cfg-field__unit">${f.unit}</span>
      </span>
      <span class="cfg-field__range">${lo}–${hi}</span>
      <p class="cfg-field__msg" id="${id}-msg" aria-live="polite"></p>`;
    const input = row.querySelector('input');
    input.addEventListener('input', () => {
      values[f.key] = input.value === '' ? NaN : Number(input.value);
      onChange({ ...values });
    });
    fields[f.key] = { row, input, msg: row.querySelector('.cfg-field__msg') };
    root.appendChild(row);
  }

  function applyValidation(result) {
    for (const t of Object.values(fields)) {
      t.row.removeAttribute('data-state');
      t.input.removeAttribute('aria-invalid');
      t.msg.textContent = '';
    }
    for (const e of result.errors) {
      const t = fields[e.field]; if (!t) continue;
      t.row.setAttribute('data-state', 'error');
      t.input.setAttribute('aria-invalid', 'true');
      if (!t.msg.textContent) t.msg.textContent = e.message;
    }
    for (const w of result.warnings) {
      const t = fields[w.field]; if (!t || t.row.dataset.state === 'error') continue;
      t.row.setAttribute('data-state', 'warn');
      if (!t.msg.textContent) t.msg.textContent = w.message;
    }
  }

  function set(patch) {
    Object.assign(values, patch);
    for (const [k, v] of Object.entries(patch)) if (fields[k]) fields[k].input.value = v;
    onChange({ ...values });
  }

  return { values: () => ({ ...values }), applyValidation, set };
}
