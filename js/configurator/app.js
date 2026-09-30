/**
 * S3 연결부 — Figma 러프 화면(index.html) ↔ 도안 생성 엔진(js/lib/moss/moss-engine.js).
 * 엔진은 수정하지 않고 import 만 한다. 이 파일은 입력칸·문구 자리·버튼에 로직만 붙인다.
 *
 *   앱 시작 1회 : initGeometry()                  (manifold-3d WASM 로드)
 *   값이 바뀔 때: validate(cm × FIELDS.scale → mm)
 *                 errors   → 해당 칸 근처에 문구, 버튼 막음
 *                 warnings → 문구만, 버튼 허용
 *   버튼        : buildPieces(r.params) → downloadAll(r.params, pieces)
 *                 조각 여러 개면 ZIP 하나, 하나면 STL 하나
 */
import { DEFAULTS, FIELDS, validate, initGeometry, buildPieces, downloadAll } from '../lib/moss/moss-engine.js';

const form = document.querySelector('[data-configurator]');
if (form) init(form);

function init(form) {
  const $ = s => form.querySelector(s);
  const button = $('[data-cfg-action]');
  const general = $('[data-cfg-message]');

  // 필드 키마다 입력칸 · 칩 · 문구 자리 (FIELDS 순서를 따른다)
  const fields = FIELDS.map(f => {
    const warn = form.querySelector(`[data-cfg-warn="${f.key}"]`);
    const text = warn && warn.querySelector('[data-cfg-warn-text]');
    return {
      ...f,
      input: form.querySelector(`[data-cfg-field="${f.key}"]`),
      chip: form.querySelector(`[data-cfg-chip="${f.key}"]`),
      msg: form.querySelector(`[data-cfg-msg="${f.key}"]`),   // 가로·세로
      warn, text, guide: text ? text.innerHTML : null,          // 뒤·옆: 원래 안내 문구 보관
    };
  }).filter(f => f.input);

  let ready = false;
  let result = null;

  /* ---- 입력칸 ---------------------------------------------------------- */
  // 숫자와 소수점 하나, 소수 한 자리까지
  const sanitize = raw => {
    let s = raw.replace(/[^0-9.]/g, '');
    const dot = s.indexOf('.');
    if (dot !== -1) s = s.slice(0, dot + 1) + s.slice(dot + 1).replace(/\./g, '').slice(0, 1);
    return s.slice(0, 6);
  };
  const toMm = (s, scale) => {
    if (s === '' || s === '.') return NaN;
    return Math.round(parseFloat(s) * scale * 1000) / 1000;   // 0.1cm × 10 부동소수 오차 정리
  };

  // 칩 폭(세로 칩은 높이)을 내용 길이에 맞춘다 — 러프 화면의 기존 동작
  const ruler = document.createElement('span');
  ruler.setAttribute('aria-hidden', 'true');
  ruler.style.cssText = 'position:absolute;visibility:hidden;white-space:pre;left:-9999px;top:0';
  form.appendChild(ruler);
  const fit = el => {
    const cs = getComputedStyle(el);
    ruler.style.font = cs.font;
    ruler.style.letterSpacing = cs.letterSpacing;
    ruler.style.writingMode = cs.writingMode;
    ruler.textContent = el.value || el.placeholder;
    const r = ruler.getBoundingClientRect();
    if (cs.writingMode.startsWith('vertical')) el.style.height = Math.ceil(r.height) + 2 + 'px';
    else el.style.width = Math.ceil(r.width) + 2 + 'px';
  };

  const values = () => Object.fromEntries(fields.map(f => [f.key, toMm(f.input.value, f.scale)]));

  /* ---- 검증 결과 표시 --------------------------------------------------- */
  function show(r) {
    for (const f of fields) {
      const e = r.errors.find(x => x.field === f.key);
      const w = r.warnings.find(x => x.field === f.key);
      const m = e || w;

      if (e) f.chip.setAttribute('data-invalid', ''); else f.chip.removeAttribute('data-invalid');
      f.input.setAttribute('aria-invalid', e ? 'true' : 'false');

      if (f.msg) {                                   // 가로·세로: 칩 근처 문구 자리
        f.msg.textContent = m ? m.message : '';
        if (w && !e) f.msg.setAttribute('data-tone', 'warn'); else f.msg.removeAttribute('data-tone');
      }
      if (f.text) {                                  // 뒤·옆: 안내 문구 자리에 표시, 없으면 원래 안내로
        if (m) f.text.textContent = m.message; else f.text.innerHTML = f.guide;
        if (m) f.warn.setAttribute('data-msg', ''); else f.warn.removeAttribute('data-msg');
        if (e) f.warn.setAttribute('data-active', ''); else f.warn.removeAttribute('data-active');
        if (w && !e) f.warn.setAttribute('data-tone', 'warn'); else f.warn.removeAttribute('data-tone');
      }
    }
  }

  function update() {
    result = validate(values());
    show(result);
    button.disabled = !ready || !result.ok;
  }

  /* ---- 이벤트 ---------------------------------------------------------- */
  for (const f of fields) {
    f.input.value = String(DEFAULTS[f.key] / f.scale);        // 기본값 47 / 18 / 9 / 15 cm
    fit(f.input);
    f.input.addEventListener('input', () => {
      const clean = sanitize(f.input.value);
      if (clean !== f.input.value) f.input.value = clean;
      fit(f.input);
      update();
    });
  }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => fields.forEach(f => fit(f.input)));

  // 버튼 클릭과 입력칸 Enter 모두 여기로 온다
  form.addEventListener('submit', e => {
    e.preventDefault();
    if (!ready || !result || !result.ok) return;
    try {
      const pieces = buildPieces(result.params);
      downloadAll(result.params, pieces);
      general.textContent = '';
    } catch (err) {
      general.textContent = `도안을 만들지 못했어요: ${err.message}`;
    }
  });

  /* ---- 엔진 준비 (앱 시작 시 1회) --------------------------------------- */
  button.disabled = true;
  button.setAttribute('aria-busy', 'true');
  update();
  initGeometry()
    .then(() => { ready = true; })
    .catch(err => { general.textContent = `도안 생성 엔진을 불러오지 못했어요: ${err.message}`; })
    .finally(() => { button.removeAttribute('aria-busy'); update(); });
}
