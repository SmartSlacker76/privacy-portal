/* Original pictograms and character artwork for the policy portal. */
(() => {
  const themes = {
    standard: { name: '표준', ink: '#17345d', tint: '#e9f2ff' },
    stone: { name: '돌하르방', ink: '#34384f', tint: '#f1eff6', art: '<ellipse cx="48" cy="78" rx="31" ry="8" fill="#b9bdc5"/><path d="M28 76 31 43h34l5 33Z" fill="#777481"/><path d="M29 40q-1 24 18 26 20-2 20-26Z" fill="#aaa6b0"/><path d="M22 40q4-21 26-22 21 0 27 22Z" fill="#6a6878"/><path d="M36 47h3m17 0h3m-13 4-2 7h6m-9 3q7 5 14 0M36 70l11-3m3 4 10 3" fill="none" stroke="#34384f" stroke-width="3.2" stroke-linecap="round"/>' },
    citrus: { name: '제주감귤', ink: '#643319', tint: '#fff0db', art: '<path d="M47 36q-5-18 18-20-1 15-18 20Z" fill="#367b4d"/><path d="M45 35q-4-14-13-15" stroke="#643319" fill="none" stroke-width="3"/><path d="M19 56q0-25 28-25 28 0 29 24 0 26-29 27-28 0-28-26Z" fill="#ff9e3f"/><path d="M30 43q-7 6-6 13" fill="none" stroke="#ffe2a3" stroke-width="4" stroke-linecap="round"/><path d="M36 55h1m19 0h1m-16 8q6 8 12 0" fill="none" stroke="#643319" stroke-width="3.4" stroke-linecap="round"/><circle cx="30" cy="63" r="3" fill="#ed6646"/><circle cx="62" cy="63" r="3" fill="#ed6646"/>' },
    peak: { name: '성산일출봉', ink: '#18473d', tint: '#dff6ed', art: '<circle cx="49" cy="33" r="15" fill="#ffab57"/><path d="M13 69 25 60 35 42 47 48 58 45 62 50 71 49 76 63 85 69Z" fill="#427950"/><path d="M26 63 34 51l7 0m17 2 9 3" stroke="#8cba75" stroke-width="2.5" fill="none"/><path d="M16 73h64l-9 8H29Z" fill="#55b4aa"/><path d="M43 59h1m13 0h1m-12 5q4 5 8 0" fill="none" stroke="#102f2a" stroke-width="3" stroke-linecap="round"/>' },
    diver: { name: '제주해녀', ink: '#2d3263', tint: '#ebeaff', art: '<path d="M25 78q2-20 22-22 18 0 23 22Z" fill="#34375a"/><path d="M27 48q0-24 20-24 20 0 20 23l-8 17H35Z" fill="#34375a"/><path d="M33 47h28v7q-1 12-14 12-13 0-14-12Z" fill="#f4b797"/><rect x="29" y="38" width="36" height="15" rx="7" fill="#66c9c3" stroke="#263052" stroke-width="3"/><path d="M42 58q5 5 10 0" fill="none" stroke="#633a42" stroke-width="2.5" stroke-linecap="round"/><circle cx="72" cy="69" r="10" fill="#ff9b47"/><path d="m66 62 10 15m-14-7 18-4" stroke="#874626" stroke-width="1.5"/><circle cx="73" cy="32" r="3" fill="#66c9c3"/><circle cx="82" cy="23" r="4" fill="none" stroke="#66c9c3" stroke-width="2"/>' },
    child: { name: '어린이', ink: '#532663', tint: '#f8e9ff', art: '<path d="m23 35 3-15 15 10h13l16-10 3 16q7 8 6 18-1 25-31 25T17 55q0-13 6-20Z" fill="#b871ca"/><path d="M22 59q0-10 12-11l14 8 15-8q12 3 12 11-3 16-27 16T22 59Z" fill="#fff0f8"/><path d="M35 52h1m23 0h1m-16 9 4 3 4-3m-4 3v3" fill="none" stroke="#532663" stroke-width="3" stroke-linecap="round"/><path d="m77 29 4-10 4 10 8 3-8 3-4 8-3-8-7-3Z" fill="#f8b84e"/>' }
  };
  const pictograms = {
    personal: 'M8 7a4 4 0 1 1 8 0 4 4 0 1 1-8 0m-4 14v-2a8 8 0 0 1 16 0v2Z',
    items: 'M4 5h16v15H4zM8 10h8m-8 5h5',
    sensitive: 'M12 21 4 13a5 5 0 1 1 8-6 5 5 0 1 1 8 6Z',
    unique: 'M14 4a5 5 0 1 1 0 9l-8 8H3v-4l8-8a5 5 0 0 1 3-5m3 4h.1',
    pseudo: 'M3 5q9 6 18 0l-2 9-7 6-7-6Zm4 5 2 1m6 0 2-1',
    cctv: 'M3 5h14l4 4-14 5Zm9 8 3 5h5m0-3v6M4 8v6',
    mobile: 'M9 10h6v6H9zm-1 1L5 7m11 4 3-4M8 16l-3 3m11-3 3 3M2 7h6m8 0h6M2 19h6m8 0h6',
    purpose: 'M2 12a10 10 0 1 0 20 0A10 10 0 1 0 2 12m5 0a5 5 0 1 0 10 0 5 5 0 1 0-10 0m5 0h.1',
    period: 'M6 3h12v3l-6 6 6 6v3H6v-3l6-6-6-6Z',
    provide: 'M3 7h17l-4-4m4 4-4 4M21 17H4l4-4m-4 4 4 4',
    entrust: 'M4 21V8h7V3h9v18m-12-8h.1m-.1 4h.1m7-9h1m-1 5h1m-1 4h1',
    abroad: 'M2 12a10 10 0 1 0 20 0A10 10 0 1 0 2 12m0 0h20M12 2q-8 10 0 20 8-10 0-20',
    auto: 'M14 3a7 7 0 0 0 7 7v2a9 9 0 1 1-9-9Zm-5 6h.1m5 7h.1m-7 0h.1',
    destroy: 'M4 6h16M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7m4-7v7',
    guardian: 'M3 20v-3a6 6 0 0 1 12 0v3m-9-12a3 3 0 1 1 6 0 3 3 0 1 1-6 0m11 2a2 2 0 1 1 4 0 2 2 0 1 1-4 0m0 5a4 4 0 0 1 5 4v1',
    rights: 'M14 4H5v16h14v-8m-9 2 2-5 7-6 3 3-7 7Z',
    safety: 'M12 2 3 6v6c0 5 5 8 9 10 4-2 9-5 9-10V6Zm-4 9 3 3 5-6',
    contact: 'M4 13v-2a8 8 0 0 1 16 0v2m-16 0h4v6H4Zm12 0h4v6h-4Zm4 6q0 3-6 3',
    access: 'M2 19V6h8l2 3h10l-2 10Zm10-5h6',
    remedy: 'M12 3v17m-6 1h12M3 7h18m-15 0-4 8h8Zm12 0-4 8h8Z',
    change: 'M20 8a9 9 0 0 0-15-2L3 9m0-5v5h5m-4 7a9 9 0 0 0 15 2l2-3m0 5v-5h-5',
    cert: 'M6 8a6 6 0 1 0 12 0A6 6 0 1 0 6 8m3 6-3 8 6-2 6 2-3-8',
    default: 'M5 3h10l4 4v14H5Zm9 0v6h5M8 12h8m-8 4h8'
  };
  const aliases = { video: 'cctv', health: 'sensitive', sensitive_open: 'sensitive', cpo: 'personal', agent: 'personal', passport: 'unique', driver: 'unique', alien: 'unique', additional: 'provide', rrn: 'items', behavior: 'auto', level: 'access' };
  const frames = { type: '<circle cx="48" cy="48" r="44"/>', step: '<path d="M25 6h46l23 42-23 42H25L2 48Z"/>', right: '<rect x="7" y="7" width="82" height="82" rx="17"/>' };
  const themeFor = (id) => Object.hasOwn(themes, id) ? themes[id] : themes.standard;
  const pathFor = (key) => {
    const id = Object.hasOwn(aliases, key) ? aliases[key] : key;
    return Object.hasOwn(pictograms, id) ? pictograms[id] : pictograms.default;
  };
  const url = (svg) => 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">' + svg + '</svg>').replace(/'/g, '%27');
  const glyph = (key, ink, transform) => '<path d="' + pathFor(key) + '" transform="' + transform + '" fill="none" stroke="' + ink + '" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round"/>';
  function icon(key, kind, id) {
    const theme = themeFor(id);
    const frame = Object.hasOwn(frames, kind) ? frames[kind] : frames.right;
    const largeCamera = ['video', 'cctv', 'mobile'].includes(key);
    const art = theme.art && (largeCamera
      ? '<g transform="translate(1 22) scale(.65)">' + theme.art + '</g><rect x="50" y="16" width="34" height="34" rx="11" fill="#fff"/>' + glyph(key, theme.ink, 'translate(54 20) scale(1.06)')
      : '<g transform="translate(0 -3)">' + theme.art + '</g><rect x="59" y="55" width="28" height="28" rx="9" fill="#fff"/>' + glyph(key, theme.ink, 'translate(62 58) scale(.9)'));
    return url('<g fill="' + theme.tint + '" stroke="' + theme.ink + '" stroke-width="2.8">' + frame + '</g>' + (art || glyph(key, theme.ink, 'translate(23 23) scale(2.08)')));
  }
  window.PolicyLabels = Object.freeze({
    themes: Object.freeze(Object.fromEntries(Object.entries(themes).map(([id, theme]) => [id, theme.name]))),
    icon,
    character: (id) => {
      const theme = themeFor(id);
      return url('<circle cx="48" cy="48" r="45" fill="' + theme.tint + '"/>' + (theme.art || glyph('safety', theme.ink, 'translate(23 23) scale(2.08)')));
    }
  });
})();
