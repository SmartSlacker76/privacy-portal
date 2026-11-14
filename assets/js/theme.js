/* 테마 — 기본은 시스템(OS) 설정을 따릅니다.
 * <html data-theme>      : 실제 적용된 테마 ("light" | "dark")
 * <html data-theme-pref> : 사용자가 고른 값 ("system" | "light" | "dark")
 * 모든 페이지의 <head>에서 먼저 실행되어야 색이 번쩍이지 않습니다. */
(function () {
  var KEY = 'hondi.theme';
  var mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

  function pref() {
    try {
      var v = localStorage.getItem(KEY);
      if (v === 'light' || v === 'dark' || v === 'system') return v;
      // 구버전 키 호환
      var o = localStorage.getItem('theme');
      if (o === 'light' || o === 'dark') return o;
    } catch (e) {}
    return 'system';
  }
  function apply(p) {
    p = (p === 'light' || p === 'dark') ? p : 'system';
    var eff = p === 'system' ? (mq && mq.matches ? 'dark' : 'light') : p;
    var r = document.documentElement;
    r.setAttribute('data-theme', eff);
    r.setAttribute('data-theme-pref', p);
    try { localStorage.setItem(KEY, p); } catch (e) {}
    try {
      document.querySelectorAll('.theme-row button').forEach(function (b) {
        b.setAttribute('aria-pressed', String(b.dataset.theme === p));
      });
    } catch (e) {}
    return eff;
  }

  apply(pref());

  // 시스템 설정이 바뀌면 'system'일 때만 따라갑니다.
  if (mq) {
    var onChange = function () { if (pref() === 'system') apply('system'); };
    if (mq.addEventListener) mq.addEventListener('change', onChange);
    else if (mq.addListener) mq.addListener(onChange);
  }
  // 다른 탭에서 바꾼 경우에도 반영
  window.addEventListener('storage', function (e) { if (e.key === KEY) apply(pref()); });

  window.HondiTheme = { get: pref, set: apply };
})();
