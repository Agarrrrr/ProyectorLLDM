const mobileQuery = '(max-width: 899px), (pointer: coarse) and (max-width: 1366px)';

export function initializeFloatingMonitor() {
  const media = matchMedia(mobileQuery);
  const panel = document.querySelector('.right-monitor-column');
  const handle = panel.querySelector('.monitor-card-header');
  const tabs = document.querySelector('.tabs-bar');
  const footer = document.querySelector('footer');
  let position = { x: 1, y: 1 };
  let drag = null;
  let customized = false;
  let scheduled = false;
  try {
    const saved = JSON.parse(sessionStorage.getItem('tv-monitor-position'));
    if (Number.isFinite(saved?.x) && Number.isFinite(saved?.y)) {
      customized = true;
      position = { x: Math.max(0, Math.min(1, saved.x)), y: Math.max(0, Math.min(1, saved.y)) };
    }
  } catch {}

  function bounds() {
    const viewport = window.visualViewport;
    const left = viewport?.offsetLeft || 0;
    const top = viewport?.offsetTop || 0;
    const width = viewport?.width || innerWidth;
    const height = viewport?.height || innerHeight;
    const panelRect = panel.getBoundingClientRect();
    const tabRect = tabs.getBoundingClientRect();
    const footerRect = footer.getBoundingClientRect();
    const footerVisible = footerRect.height > 0 && footerRect.top >= top && footerRect.bottom <= top + height + 2;
    const minX = left + 10;
    const minY = Math.max(top + 10, Math.min(tabRect.bottom + 10, top + height - panelRect.height - 10));
    return {
      minX, minY,
      maxX: Math.max(minX, left + width - panelRect.width - 10),
      maxY: Math.max(minY, (footerVisible ? footerRect.top : top + height) - panelRect.height - 10)
    };
  }

  function place() {
    scheduled = false;
    if (!media.matches) {
      for (const property of ['left', 'top', 'right', 'bottom', '--pip-preview-max-height']) panel.style.removeProperty(property);
      return;
    }
    const viewport = window.visualViewport;
    const top = viewport?.offsetTop || 0;
    const bottom = top + (viewport?.height || innerHeight);
    const footerRect = footer.getBoundingClientRect();
    const bottomEdge = footerRect.height > 0 && footerRect.top >= top && footerRect.bottom <= bottom + 2 ? footerRect.top : bottom;
    const topEdge = Math.max(top + 10, tabs.getBoundingClientRect().bottom + 10);
    const notice = panel.querySelector('.connection-notice');
    const noticeHeight = notice.hidden ? 0 : notice.getBoundingClientRect().height;
    const imageHeight = Math.max(0, bottomEdge - topEdge - handle.getBoundingClientRect().height - noticeHeight - 12);
    panel.style.setProperty('--pip-preview-max-height', `${imageHeight}px`);
    if (!customized) position = { x: 1, y: innerWidth > innerHeight && innerHeight < 500 ? 0 : 1 };
    const area = bounds();
    panel.style.left = `${area.minX + (area.maxX - area.minX) * position.x}px`;
    panel.style.top = `${area.minY + (area.maxY - area.minY) * position.y}px`;
    panel.style.right = 'auto';
    panel.style.bottom = 'auto';
  }

  function schedule() {
    if (!scheduled) { scheduled = true; requestAnimationFrame(place); }
  }

  handle.addEventListener('pointerdown', event => {
    if (!media.matches || event.target.closest('button') || !event.isPrimary || event.button !== 0) return;
    const rect = panel.getBoundingClientRect();
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY, left: rect.left, top: rect.top };
    handle.setPointerCapture(event.pointerId);
    panel.classList.add('is-dragging');
    event.preventDefault();
  });
  handle.addEventListener('pointermove', event => {
    if (!drag || drag.id !== event.pointerId) return;
    const area = bounds();
    const left = Math.max(area.minX, Math.min(area.maxX, drag.left + event.clientX - drag.x));
    const top = Math.max(area.minY, Math.min(area.maxY, drag.top + event.clientY - drag.y));
    customized = true;
    position = {
      x: area.maxX === area.minX ? 0 : (left - area.minX) / (area.maxX - area.minX),
      y: area.maxY === area.minY ? 0 : (top - area.minY) / (area.maxY - area.minY)
    };
    place();
  });
  function endDrag() {
    if (!drag) return;
    drag = null;
    panel.classList.remove('is-dragging');
    try { sessionStorage.setItem('tv-monitor-position', JSON.stringify(position)); } catch {}
  }
  handle.addEventListener('pointerup', endDrag);
  handle.addEventListener('pointercancel', endDrag);
  handle.addEventListener('lostpointercapture', endDrag);
  media.addEventListener('change', schedule);
  window.addEventListener('resize', schedule);
  window.visualViewport?.addEventListener('resize', schedule);
  window.visualViewport?.addEventListener('scroll', schedule);
  const observer = new ResizeObserver(schedule);
  observer.observe(panel);
  observer.observe(tabs);
  observer.observe(footer);
  place();
}
