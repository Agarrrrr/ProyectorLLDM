export function decorateSongCard(card, slide, index, total) {
  card.dataset.section = slide.sectionLabel || 'Título';
  card.tabIndex = 0;
  card.setAttribute('role', 'button');
  card.setAttribute('aria-label', `${slide.sectionLabel || 'Título'}, pantalla ${index + 1} de ${total}`);
  card.addEventListener('keydown', event => {
    if (event.key === 'Enter') {
      event.preventDefault();
      card.click();
    }
  });
  if (index === total - 1) {
    const end = document.createElement('div');
    end.className = 'song-end-marker'; end.textContent = 'FIN DEL CANTO'; card.appendChild(end);
  }
}

export function updateSongProgress(grid, state, matches) {
  let progress = grid.previousElementSibling;
  if (!progress?.classList.contains('song-progress')) {
    progress = document.createElement('p'); progress.className = 'song-progress';
    progress.setAttribute('role', 'status'); progress.setAttribute('aria-live', 'polite');
    grid.before(progress);
  }
  progress.hidden = !matches;
  if (!matches) return;
  const index = state.currentSlideIndex, slide = state.slides[index];
  const current = slide.isTitleOnly ? 'Título' : slide.sectionLabel || 'Canto';
  const next = state.slides[index + 1];
  progress.textContent = `En TV: ${current} · ${index + 1} de ${state.slides.length} · ${next ? 'Sigue: ' + (next.sectionLabel || 'Canto') : 'Fin del canto'}`;
}

export function revealCurrentCard(grid, matches, index) {
  if (!grid || !matches) return;
  const card = grid.querySelector('.active-slide');
  if (!card) return;

  const tabPane = grid.closest('.tab-pane');
  if (tabPane && !tabPane.classList.contains('active')) return;

  requestAnimationFrame(() => {
    const behavior = matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth';

    // 1. Si el grid tiene scroll interno propio (ej: PC / escritorio con overflow-y: auto)
    if (grid.scrollHeight > grid.clientHeight + 4) {
      if (index === 0) {
        grid.scrollTo({ top: 0, behavior });
        return;
      }
      const gridRect = grid.getBoundingClientRect();
      const cardRect = card.getBoundingClientRect();
      const padding = 20;

      if (cardRect.top < gridRect.top + padding) {
        grid.scrollBy({ top: cardRect.top - (gridRect.top + padding), behavior });
      } else if (cardRect.bottom > gridRect.bottom - padding) {
        grid.scrollBy({ top: cardRect.bottom - (gridRect.bottom - padding), behavior });
      }
      return;
    }

    // 2. Si el grid no tiene scroll interno propio (móvil/tablet donde scrollea el contenedor padre o la página)
    const tabsBar = document.querySelector('.tabs-bar');
    const topLimit = (tabsBar ? tabsBar.getBoundingClientRect().bottom : 50) + 16;
    const footer = document.querySelector('footer');
    const bottomLimit = (footer && footer.offsetHeight > 0 ? footer.getBoundingClientRect().top : window.innerHeight) - 16;

    const cardRect = card.getBoundingClientRect();
    if (cardRect.top < topLimit || cardRect.bottom > bottomLimit) {
      card.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior });
    }
  });
}
