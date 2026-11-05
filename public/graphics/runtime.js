// Shared appearance for the real TV and OBS outputs; previews stay local.
(() => {
  const preview = new URLSearchParams(location.search).has('appearancePreview');
  let revision = -1, draftShown = false;
  function apply(settings) {
    if (!settings?.graphics) return;
    const graphics = settings.graphics;
    document.documentElement.dataset.background = graphics.background;
    for (const key of ['animateBackground', 'animateLogo', 'showGlow']) {
      document.documentElement.dataset[key] = String(graphics[key] !== false);
    }
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
