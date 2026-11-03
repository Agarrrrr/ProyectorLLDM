const motions = new WeakMap();
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
function stop(element) {
  const current = motions.get(element);
  motions.delete(element);
  delete element.dataset.closing;
  current?.animations.forEach(animation => animation.cancel());
}
function content(element) {
  return element.querySelector('.lyrics-modal-window, .shortcuts-modal-card') || element;
}
export function openSurface(element, show) {
  stop(element);
  show();
  if (reduced()) return;
  const card = content(element);
  const animations = [element.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 180, easing: 'ease-out' }),
    card.animate([{ translate: '0 8px', scale: '.99' }, { translate: '0 0', scale: '1' }], { duration: 240, easing: 'cubic-bezier(.2,.8,.2,1)' })];
  const motion = { kind: 'open', animations }; motions.set(element, motion);
  Promise.allSettled(animations.map(animation => animation.finished)).then(() => { if (motions.get(element) === motion) motions.delete(element); });
}
export function closeSurface(element, hide) {
  if (!element) return;
  if (motions.get(element)?.kind === 'close') return;
  stop(element);
  if (reduced()) { hide(); return; }
  element.dataset.closing = 'true';
  const animations = [element.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 150, easing: 'ease-in', fill: 'forwards' }),
    content(element).animate([{ translate: '0 0' }, { translate: '0 5px' }], { duration: 150, easing: 'ease-in', fill: 'forwards' })];
  const motion = { kind: 'close', animations }; motions.set(element, motion);
  Promise.allSettled(animations.map(animation => animation.finished)).then(() => {
    if (motions.get(element) !== motion) return;
    hide(); stop(element);
  });
}

// The pulse confirms a press, never the success of a network operation.
document.addEventListener('click', event => {
  if (!(event.target instanceof Element)) return;
  const button = event.target.closest('button, [role="button"]');
  if (!button || button.disabled || reduced()) return;
  button.animate([{ outline: '2px solid #dfbb6a80', outlineOffset: '0px' }, { outline: '2px solid transparent', outlineOffset: '3px' }], { duration: 320, easing: 'ease-out' });
}, { capture: true });
