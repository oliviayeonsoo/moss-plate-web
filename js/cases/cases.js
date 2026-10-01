/* ==========================================================================
   S4. 사례 갤러리 — 카드 렌더 + 순환 캐러셀
   window.MOSS_CASES 데이터를 <template data-case-template>로 찍어낸다.
   좌우 버튼을 누르면 한 칸씩 이동하고, 끝에서 처음으로 이어진다.
   ========================================================================== */
(function () {
  var root = document.querySelector('[data-cases]');
  var template = document.querySelector('[data-case-template]');
  if (!root || !template) return;

  var track = root.querySelector('[data-cases-track]');
  var prevBtn = root.querySelector('[data-cases-prev]');
  var nextBtn = root.querySelector('[data-cases-next]');
  var data = window.MOSS_CASES || [];
  var VISIBLE = 3;                  // 데스크톱 한 화면 카드 수 (모바일은 CSS --cases-visible: 1)
  var DURATION = 420;
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- 렌더 ------------------------------------------------------------ */
  // 이미지가 있으면 <img>, 없으면 같은 크기의 회색 자리 표시
  function renderMedia(box, item) {
    if (item.image) {
      var img = document.createElement('img');
      img.src = item.image;
      img.alt = item.alt || item.title || '';
      img.loading = 'lazy';
      img.decoding = 'async';
      box.appendChild(img);
    } else {
      box.classList.add('case-card__media--placeholder');
      box.setAttribute('role', 'img');
      box.setAttribute('aria-label', (item.title || '사례') + ' 이미지 준비 중');
    }
  }

  function renderCard(item) {
    var li = template.content.firstElementChild.cloneNode(true);
    renderMedia(li.querySelector('.case-card__media'), item);
    li.querySelector('.case-card__title').textContent = item.title || '';
    li.querySelector('.case-card__desc').textContent = item.description || '';

    // 링크가 있으면 카드 내용 전체를 <a>로 감싼다
    if (item.link) {
      var a = document.createElement('a');
      a.className = 'case-card__link';
      a.href = item.link;
      while (li.firstChild) a.appendChild(li.firstChild);
      li.appendChild(a);
    }
    return li;
  }

  // 카드 수가 보이는 칸 수와 같으면 한 벌 더 이어 붙여 넘길 때 빈칸이 생기지 않게 한다
  // (복제본은 항상 화면 밖에 있어 syncVisibility에서 inert 처리된다)
  var rendered = data.length === VISIBLE ? data.concat(data) : data;
  rendered.forEach(function (item) { track.appendChild(renderCard(item)); });

  // 지금 한 화면에 보이는 카드 수 (css/cases.css, css/mobile.css의 --cases-visible)
  function visible() {
    var v = parseInt(getComputedStyle(root).getPropertyValue('--cases-visible'), 10);
    return v > 0 ? v : VISIBLE;
  }
  // 보이는 칸보다 카드가 많을 때만 넘길 수 있다
  var navigable = false;

  /* ---- 캐러셀 ---------------------------------------------------------- */
  var busy = false;

  // 카드 한 칸 이동 거리 (offsetLeft: 1024~1439px의 화면 축소(zoom)와 무관한 CSS px 값)
  function step() {
    var cards = track.children;
    if (cards.length < 2) return 0;
    return cards[1].offsetLeft - cards[0].offsetLeft;
  }

  // 화면 밖 카드는 포커스/스크린리더 대상에서 뺀다
  function syncVisibility() {
    var n = visible();
    Array.prototype.forEach.call(track.children, function (li, i) {
      var hidden = i >= n;
      li.inert = hidden;
      if (hidden) li.setAttribute('aria-hidden', 'true'); else li.removeAttribute('aria-hidden');
    });
  }

  function slide(from, to, done) {
    track.style.transition = 'none';
    track.style.transform = 'translateX(' + from + 'px)';
    if (reduceMotion) { track.style.transform = 'translateX(' + to + 'px)'; done(); return; }
    void track.offsetWidth;                               // 시작 위치 확정
    track.style.transition = 'transform ' + DURATION + 'ms var(--ease)';
    track.style.transform = 'translateX(' + to + 'px)';
    var finished = false;
    function end() { if (finished) return; finished = true; track.removeEventListener('transitionend', end); done(); }
    track.addEventListener('transitionend', end);
    setTimeout(end, DURATION + 80);                       // transitionend 누락 대비
  }

  function reset() {
    track.style.transition = 'none';
    track.style.transform = '';
    syncVisibility();
    busy = false;
  }

  function next() {
    if (busy || !navigable) return;
    busy = true;
    slide(0, -step(), function () {
      track.appendChild(track.firstElementChild);         // 맨 앞 카드를 맨 뒤로
      reset();
    });
  }

  function prev() {
    if (busy || !navigable) return;
    busy = true;
    var s = step();
    track.insertBefore(track.lastElementChild, track.firstElementChild);  // 맨 뒤 카드를 맨 앞으로
    slide(-s, 0, reset);
  }

  nextBtn.addEventListener('click', next);
  prevBtn.addEventListener('click', prev);

  root.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowRight') { e.preventDefault(); next(); }
    if (e.key === 'ArrowLeft')  { e.preventDefault(); prev(); }
  });

  // 한 화면에 다 들어가면(데스크톱 3장 미만, 모바일 1장) 넘길 것이 없으니 버튼을 숨긴다
  function syncLayout() {
    if (busy) return;
    navigable = track.children.length > visible();
    prevBtn.hidden = !navigable;
    nextBtn.hidden = !navigable;
    syncVisibility();
  }
  syncLayout();
  window.addEventListener('resize', syncLayout);
})();
