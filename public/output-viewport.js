(() => {
  // Reference coordinates describe proportions, never a rendering resolution cap.
  const width = 1920, height = 1080;
  const canvases = document.querySelectorAll('[data-output-canvas]');
  const scale = () => Math.min(window.innerWidth / width, window.innerHeight / height);
  window.OutputViewport = Object.freeze({
    scale,
    pixels: value => value * scale(),
    length: value => `${value / 16}rem`
  });
  function resize() {
    const factor = scale();
    for (const canvas of canvases) {
      canvas.style.width = '120rem';
      canvas.style.height = '67.5rem';
      canvas.style.left = `${(window.innerWidth - width * factor) / 2}px`;
      canvas.style.top = `${(window.innerHeight - height * factor) / 2}px`;
    }
  }
  let scheduled;
  window.addEventListener('resize', () => {
    cancelAnimationFrame(scheduled);
    scheduled = requestAnimationFrame(resize);
  });
  resize();
})();
