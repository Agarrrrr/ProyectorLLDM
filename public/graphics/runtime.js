// Shared appearance for the real TV and OBS outputs; previews stay local.
(() => {
  const preview = new URLSearchParams(location.search).has('appearancePreview');
  if (preview) document.documentElement.dataset.preview = 'true';
  let revision = -1, draftShown = false;
  function renderCustomBackground(bg) {
    const container = document.getElementById('custom-background');
    const badge = document.getElementById('transparent-preview-badge');
    if (badge) badge.hidden = !(preview && bg === 'transparent');
    if (!container) return;
    const img = document.getElementById('custom-background-img');
    const video = document.getElementById('custom-background-video');
    const frame = document.getElementById('custom-background-frame');
    if (['institutional', 'classic', 'transparent'].includes(bg)) {
      container.hidden = true;
      if (img) { img.hidden = true; img.removeAttribute('src'); }
      if (video) { video.hidden = true; video.pause?.(); video.removeAttribute('src'); }
      if (frame) { frame.hidden = true; frame.src = 'about:blank'; }
      return;
    }
    const url = bg.startsWith('preset-')
      ? '/graphics/song-backgrounds/' + bg.slice('preset-'.length) + '.svg'
      : '/song-assets/' + encodeURIComponent(bg);
    container.hidden = false;
    const isVideo = bg.startsWith('bg-vid-');
    const isHtml = bg.startsWith('bg-html-');
    if (img) {
      img.hidden = isVideo || isHtml;
      if (!img.hidden && img.getAttribute('src') !== url) img.src = url;
      else if (img.hidden) img.removeAttribute('src');
    }
    if (video) {
      video.hidden = !isVideo;
      if (isVideo) {
        if (video.getAttribute('src') !== url) {
          video.src = url;
          video.play?.().catch(() => {});
        }
      } else {
        video.pause?.();
        video.removeAttribute('src');
      }
    }
    if (frame) {
      frame.hidden = !isHtml;
      if (isHtml) {
        if (frame.getAttribute('src') !== url) frame.src = url;
      } else {
        frame.src = 'about:blank';
      }
    }
  }
  function apply(settings) {
    if (!settings?.graphics) return;
    const graphics = settings.graphics;
    const bg = graphics.background || 'institutional';
    document.documentElement.dataset.background = bg;
    document.documentElement.dataset.backgroundMode = ['institutional', 'classic', 'transparent'].includes(bg) ? bg : 'custom';
    for (const key of ['animateBackground', 'animateLogo', 'showGlow']) {
      document.documentElement.dataset[key] = String(graphics[key] !== false);
    }
    renderCustomBackground(bg);
    window.dispatchEvent(new CustomEvent('graphics-changed', { detail: graphics }));
  }
  function acceptState(state) {
    if (!state?.settings || state.settingsRevision <= revision || (preview && draftShown)) return;
    revision = state.settingsRevision;
    apply(state.settings);
  }
  window.LldmGraphics = { acceptState };
  if (new URLSearchParams(location.search).get('lite') === '1') return;
  if (!preview) fetch('/api/settings').then(r => r.json()).then(s => acceptState({ settings: s.settings, settingsRevision: s.revision })).catch(console.error);
  if (preview) window.addEventListener('message', event => {
    if (event.origin !== location.origin || event.source !== parent || event.data?.type !== 'GRAPHICS_PREVIEW') return;
    draftShown = true;
    apply(event.data.settings);
    if (event.data.hideGraphic) window.ocultarBanner?.(true);
    else if (event.data.graphic) window.desplegarGrafico?.(event.data.graphic);
  });
  // The overlay already owns a connection for banner events.
  if (!preview && document.getElementById('stage')) {
    function connect() {
      const socket = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws?view=output`);
      socket.onmessage = event => {
        try { const data = JSON.parse(event.data); if (data.type === 'STATE_UPDATE') acceptState(data.state); } catch (error) { console.error(error); }
      };
      socket.onclose = () => setTimeout(connect, 2000);
      socket.onerror = () => socket.close();
    }
    connect();
  }
})();
