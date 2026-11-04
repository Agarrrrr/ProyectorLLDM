const outputLength = value => window.OutputViewport.length(value);
const lyricsPreview = new URLSearchParams(location.search).has('lyricsPreview');
if (!lyricsPreview) document.getElementById('idle-frame').src = '/idle.html';
const songFonts = new Map();
const songBackgrounds = new Map();
async function prepareSongFont(payload) {
  if (!payload?.appearance) return;
  const { font, fontUrl } = payload.appearance;
  if (!songFonts.has(fontUrl)) {
    const face = new FontFace('Song_' + font, `url("${fontUrl}")`, { weight: '800' });
    songFonts.set(fontUrl, face.load().then(loaded => document.fonts.add(loaded)));
  }
  await songFonts.get(fontUrl);
  const { background, backgroundUrl } = payload.appearance;
  if (background !== 'solid' && backgroundUrl) {
    if (!songBackgrounds.has(backgroundUrl)) {
      const image = new Image(); image.src = backgroundUrl;
      songBackgrounds.set(backgroundUrl, image.decode().catch(error => { songBackgrounds.delete(backgroundUrl); throw error; }));
    }
    await songBackgrounds.get(backgroundUrl);
  }
}
let outputStatus = { connected: false, revision: -1 };
let incomingRevision = -1;
function reportOutputStatus() {
  if (window.parent !== window) window.parent.postMessage({ type: 'TV_OUTPUT_STATUS', ...outputStatus }, location.origin);
}
window.addEventListener('message', event => {
  if (event.origin === location.origin && event.source === window.parent && event.data?.type === 'REQUEST_TV_STATUS') reportOutputStatus();
});

const stageIdle = document.getElementById('stage-idle');
    const stageActive = document.getElementById('stage-active');
    const stageCarteleria = document.getElementById('stage-carteleria');
    const carteleriaFrame = document.getElementById('carteleria-frame');
    const layerA = document.getElementById('layer-a');
    const layerB = document.getElementById('layer-b');

    let currentLayer = 'A';
    let lastRenderKey = '';

    // ==============================================================
    // PREVENCIÓN DE PALABRAS COLGADAS CORTAS SIN CREAR FRASES IRROMPIBLES
    // ==============================================================
    function preventShortWidows(text) {
      if (!text) return '';
      let clean = String(text).trim();

      // 1. Unir conectores de 1-2 letras (a, y, de, en, el, la, al) únicamente cuando les sigue una palabra de >= 4 letras
      // Así nunca se encadenan frases largas que provoquen desbordamiento horizontal
      clean = clean.replace(/(^|[ \t])([a-zA-ZáéíóúÁÉÍÓÚñÑ]{1,2})[ \t]+(?=[a-zA-ZáéíóúÁÉÍÓÚñÑ]{4,})/gi, '$1$2\u00A0');

      // 2. Si la última palabra de la línea es corta (<= 4 caracteres, ej: "Dios", "fe", "paz", "luz", "ti", "Él"),
      // unirla únicamente a la palabra inmediata anterior para que no cuelgue sola
      clean = clean.replace(/[ \t]+([a-zA-ZáéíóúÁÉÍÓÚñÑ0-9\.,;:!?\(\)\-]{1,4})$/, '\u00A0$1');

      return clean;
    }

    function buildSlideHtml(payload) {
      if (!payload || !payload.type || payload.type === 'idle') {
        return '';
      }

      // 1. HIMNO O CORO - SOLO NÚMERO Y TÍTULO (CARÁTULA)
      if (payload.isTitleOnly && (payload.type === 'hymn' || payload.type === 'choir')) {
        const numText = payload.type === 'choir'
          ? (payload.badge || 'CANTO DEL CORO')
          : (payload.hymnNumber ? `HIMNO ${payload.hymnNumber}` : (payload.badge || 'HIMNO'));
        const titleText = payload.title || payload.hymnTitle || payload.choirTitle || '';
        return `
          <div class="hymn-title-only-container">
            <div class="hymn-cover-number">${escapeHtml(numText)}</div>
            <div class="hymn-cover-title">${escapeHtml(preventShortWidows(titleText))}</div>
          </div>
        `;
      }

      // 2. Letras: conservar la estrofa y ajustar su tipografía al lienzo.
      if (payload.type === 'hymn' || payload.type === 'choir') {
        const lines = payload.displayLines || (payload.lines && payload.lines.length > 0 ? payload.lines : (payload.text ? payload.text.split('\n') : []));
        const visualCount = payload.visualLineCount || lines.reduce((acc, l) => acc + (String(l).trim().length > 22 ? 2 : 1), 0);
        let countClass = 'lines-count-4';
        if (visualCount === 1) countClass = 'lines-count-1';
        else if (visualCount === 2) countClass = 'lines-count-2';
        else if (visualCount === 3) countClass = 'lines-count-3';
        else countClass = 'lines-count-4';

        // Indicador en pantalla: Solo para CORO. Las estrofas NO llevan texto "Estrofa" en pantalla
        // Y NUNCA se muestra (1/2) en lo que se proyecta porque es un índice interno del operador
        const rawBaseLabel = payload.baseSectionLabel !== undefined
          ? payload.baseSectionLabel
          : (payload.sectionLabel ? payload.sectionLabel.replace(/\s*\(\d+\/\d+\)$/, '') : '');
        const isChorus = /^(?:Coro)\b/i.test(String(rawBaseLabel || '').trim()) || payload.sectionType === 'chorus';
        const baseLabel = isChorus ? 'CORO' : payload.appearance?.showVerseNumber ? String(payload.sectionLabel || '').replace(/\s*\(\d+\/\d+\)$/, '') : '';

        const chunkIdx = payload.chunkIndex || 0;
        const isFirstPart = payload.isFirstChunk !== undefined ? payload.isFirstChunk : (chunkIdx === 0);

        let indicatorHtml = '';
        if (baseLabel) {
          const partClass = isFirstPart ? 'first-part' : 'continuation-part';
          // NUNCA agregar (1/2) ni sufijos numéricos en pantalla
          indicatorHtml = `<div class="hymn-subtle-indicator ${partClass}">${escapeHtml(baseLabel)}</div>`;
        }

        const linesHtml = lines.map(line => `<div class="hymn-line">${escapeHtml(payload.displayLines ? line : preventShortWidows(line))}</div>`).join('');
        return `
          <div class="hymn-lines-container song-layout ${countClass}" style="--song-font-size: ${outputLength(Math.max(24, Math.min(400, Number(payload.fontSize) || 156)))}">
            ${indicatorHtml}
            ${linesHtml}
          </div>
        `;
      }

      // 3. SANTA BIBLIA - SOLO CITA O CITA + TEXTO
      if (payload.type === 'bible') {
        if (payload.mode === 'text') {
          const title = payload.title || payload.reference || 'SANTA BIBLIA';
          const version = payload.version && payload.version !== 'RVR1960'
            ? `<span class="bible-version-badge">${escapeHtml(payload.version)}</span>` : '';
          const formattedLines = payload.displayLines?.map(line =>
            `<div class="bible-text-line">${escapeHtml(line).replace(/\[(\d+)\]/g, '<span class="bible-verse-num">$1</span>')}</div>`
          );
          const bodyHtml = formattedLines?.length ? formattedLines.join('') : payload.verses?.length ? payload.verses.map(verse =>
            `<span class="bible-verse-num">${escapeHtml(String(verse.number))}${verse.part > 1 ? 'b' : ''}</span> ${escapeHtml(verse.text)}`
          ).join(' ') : escapeHtml(payload.text || '');

          return `
            <div class="bible-text-display-container">
              <div class="bible-text-header">
                <div class="bible-citation-title">${escapeHtml(title)}</div>
                ${version}
              </div>
              <div class="bible-text-body${formattedLines?.length ? ' bible-text-measured' : ''}"${payload.fontSize ? ` style="font-size:${outputLength(payload.fontSize)}"` : ''}>
                ${bodyHtml}
              </div>
            </div>
          `;
        }

        let bookName = payload.book || '';
        let numText = payload.chapterVerse || payload.text || '';

        // Si no viene dividido explícitamente, extraer de reference
        if (!bookName && payload.reference) {
          const match = payload.reference.match(/^(.+?)\s+(\d+.*)$/);
          if (match) {
            bookName = match[1];
            numText = match[2];
          } else {
            bookName = payload.reference;
            numText = '';
          }
        }

        return `
          <div class="bible-display-original">
            <div class="display-book-title">${escapeHtml(bookName.toUpperCase())}</div>
            ${numText ? `<div class="display-chapter-verse-number">${escapeHtml(numText)}</div>` : ''}
          </div>
        `;
      }

      // 4. TEMA OFICIAL LLDM (LETRAS MASIVAS CON ESCALA DINÁMICA Y SIN PALABRAS HUÉRFANAS CORTAS)
      if (payload.type === 'theme') {
        const titleText = payload.title || payload.text || '';
        const churchText = payload.subtitle || 'La Luz del Mundo';
        const dateText = payload.footer || '';

        const len = titleText.trim().length;
        let sizeClass = 'theme-size-regular';
        if (len <= 28) {
          sizeClass = 'theme-size-giant';
        } else if (len <= 55) {
          sizeClass = 'theme-size-large';
        } else if (len <= 85) {
          sizeClass = 'theme-size-medium';
        } else {
          sizeClass = 'theme-size-regular';
        }

        return `
          <div class="theme-display-container">
            <div class="theme-main-title ${sizeClass}">${escapeHtml(preventShortWidows(titleText))}</div>
            <div class="theme-church-subtitle">${escapeHtml(preventShortWidows(churchText))}</div>
            ${dateText ? `<div class="theme-date-footer">${escapeHtml(preventShortWidows(dateText))}</div>` : ''}
          </div>
        `;
      }

      // 5. CARTA O PRESENTACIÓN APOSTÓLICA
      if (payload.type === 'special') {
        const titleText = payload.title || 'Carta Apostólica';
        const dateText = payload.subtitle || '';
        const locationText = payload.footer || '';
        return `
          <div class="special-display-container">
            <div class="special-main-title">${escapeHtml(titleText)}</div>
            ${dateText ? `<div class="special-date">${escapeHtml(dateText)}</div>` : ''}
            ${locationText ? `<div class="special-location">${escapeHtml(locationText)}</div>` : ''}
          </div>
        `;
      }

      // 6. TEXTO LIBRE O AVISO
      if (payload.type === 'custom' || payload.type === 'drone') {
        const lines = payload.lines && payload.lines.length > 0 ? payload.lines : (payload.text ? payload.text.split('\n') : []);
        const count = lines.length;
        let countClass = count <= 2 ? 'lines-count-2' : (count === 3 ? 'lines-count-3' : 'lines-count-4');
        const linesHtml = lines.map(line => `<div class="hymn-line">${escapeHtml(preventShortWidows(line))}</div>`).join('');
        return `
          <div class="hymn-lines-container ${countClass}">
            ${linesHtml}
          </div>
        `;
      }

      // 7. PRESENTACIÓN POWERPOINT / PDF
      if (payload.type === 'presentation') {
        const imgUrl = payload.imageUrl || '';
        if (!imgUrl) return '';
        return `
          <div class="presentation-display-container">
            <img src="${imgUrl}" class="presentation-slide-image" alt="Diapositiva" />
          </div>
        `;
      }

      return '';
    }

    let textMeasure;
    function referenceTextWidth(element, size) {
      textMeasure ??= document.createElement('canvas').getContext('2d');
      const style = getComputedStyle(element);
      const spacing = (parseFloat(style.letterSpacing) || 0) / window.OutputViewport.scale();
      textMeasure.font = `${style.fontStyle} ${style.fontWeight} ${size}px ${style.fontFamily}`;
      const text = element.textContent;
      return textMeasure.measureText(text).width + [...text].length * spacing;
    }

    function autoScaleBibleSoloCita(container) {
      const bookEl = container.querySelector('.display-book-title');
      const numEl = container.querySelector('.display-chapter-verse-number');
      // Measure text in design units so a small preview makes the same decision.
      const maxW = 1780;

      if (bookEl) {
        let size = 240;
        bookEl.style.fontSize = outputLength(size);
        while (referenceTextWidth(bookEl, size) > maxW && size > 90) {
          size -= 4;
          bookEl.style.fontSize = outputLength(size);
        }
      }

      if (numEl) {
        let size = 290;
        numEl.style.fontSize = outputLength(size);
        while (referenceTextWidth(numEl, size) > maxW && size > 100) {
          size -= 4;
          numEl.style.fontSize = outputLength(size);
        }
      }
    }

    // ==============================================================
    // AUTO-AJUSTE EN EL ÁREA RELATIVA DE SALIDA
    // Los cantos compilados conservan los renglones configurados por el operador.
    // Las medidas de referencia se convierten al tamaño real del lienzo.
    // ==============================================================
    function autoFitSlideContent(container) {
      // Browser scroll metrics are integer CSS pixels, including in small frames.
      const maxH = Math.ceil(window.OutputViewport.pixels(980));
      const maxW = Math.ceil(window.OutputViewport.pixels(1780));

      // 1. Letras de Himnos y Avisos (Máximo 4 líneas visuales reales renderizadas a escala 1.5x)
      const hymnContainer = container.querySelector('.hymn-lines-container');
      if (hymnContainer) {
        const lines = hymnContainer.querySelectorAll('.hymn-line');
        if (lines.length > 0) {
          let currentSize = (parseFloat(window.getComputedStyle(lines[0]).fontSize) / window.OutputViewport.scale()) || 156;

          const countRenderedVisualLines = () => {
            let totalVisual = 0;
            for (let i = 0; i < lines.length; i++) {
              const comp = window.getComputedStyle(lines[i]);
              const lh = parseFloat(comp.lineHeight) || window.OutputViewport.pixels(currentSize * 1.14);
              const h = lines[i].offsetHeight;
              const vLines = Math.max(1, Math.round(h / lh));
              totalVisual += vLines;
            }
            return totalVisual;
          };

          const hasOverflow = () => {
            if (hymnContainer.scrollHeight > maxH) return true;
            if (!hymnContainer.classList.contains('song-layout') && countRenderedVisualLines() > 4) return true;
            for (let i = 0; i < lines.length; i++) {
              if (lines[i].scrollWidth > maxW) return true;
            }
            return false;
          };

          while (hasOverflow() && currentSize > (hymnContainer.classList.contains('song-layout') ? 24 : 56)) {
            currentSize = Math.max(hymnContainer.classList.contains('song-layout') ? 24 : 56, currentSize - 2);
            for (let i = 0; i < lines.length; i++) {
              lines[i].style.fontSize = outputLength(currentSize);
            }
            if (!hymnContainer.classList.contains('song-layout') && currentSize < 110) {
              hymnContainer.style.gap = outputLength(10);
            }
          }
        }
      }

      // 2. Carátula de Himno (Solo Número y Título)
      const hymnCoverContainer = container.querySelector('.hymn-title-only-container');
      if (hymnCoverContainer) {
        const coverTitle = hymnCoverContainer.querySelector('.hymn-cover-title');
        if (coverTitle) {
          let currentSize = (parseFloat(window.getComputedStyle(coverTitle).fontSize) / window.OutputViewport.scale()) || 95;
          while ((hymnCoverContainer.scrollHeight > maxH || coverTitle.scrollWidth > maxW) && currentSize > 50) {
            currentSize -= 2;
            coverTitle.style.fontSize = outputLength(currentSize);
          }
        }
      }

      // 3. Temas Oficiales
      const themeContainer = container.querySelector('.theme-display-container');
      if (themeContainer) {
        const titleEl = themeContainer.querySelector('.theme-main-title');
        if (titleEl) {
          let currentSize = (parseFloat(window.getComputedStyle(titleEl).fontSize) / window.OutputViewport.scale()) || 120;
          while ((themeContainer.scrollHeight > maxH || titleEl.scrollWidth > maxW) && currentSize > 56) {
            currentSize -= 2;
            titleEl.style.fontSize = outputLength(currentSize);
          }
        }
      }

      // 4. Carta o Presentación Apostólica
      const specialContainer = container.querySelector('.special-display-container');
      if (specialContainer) {
        const specialTitle = specialContainer.querySelector('.special-main-title');
        if (specialTitle) {
          let currentSize = (parseFloat(window.getComputedStyle(specialTitle).fontSize) / window.OutputViewport.scale()) || 110;
          while ((specialContainer.scrollHeight > maxH || specialContainer.scrollWidth > maxW) && currentSize > 52) {
            currentSize -= 2;
            specialTitle.style.fontSize = outputLength(currentSize);
          }
        }
      }

      // 5. Cita y Texto Bíblico
      const bibleTextContainer = container.querySelector('.bible-text-display-container');
      if (bibleTextContainer) {
        const bodyEl = bibleTextContainer.querySelector('.bible-text-body');
        if (bodyEl && !bodyEl.classList.contains('bible-text-measured')) {
          let currentSize = (parseFloat(window.getComputedStyle(bodyEl).fontSize) / window.OutputViewport.scale()) || 64;
          while ((bibleTextContainer.scrollHeight > maxH || bodyEl.scrollWidth > maxW) && currentSize > 28) {
            currentSize -= 2;
            bodyEl.style.fontSize = outputLength(currentSize);
          }
        }
      }
    }

    let pendingList = null;
    let listReady = { revision: -1, key: '' };
    function clearLayers() {
      for (const layer of [layerA, layerB]) {
        layer.style.transition = 'none'; layer.classList.remove('active'); layer.replaceChildren();
        void layer.offsetHeight; layer.style.transition = '';
      }
    }
    function revealList() {
      if (!pendingList || listReady.revision !== incomingRevision || listReady.key !== pendingList.listKey) return false;
      clearLayers(); stageActive.classList.remove('visible'); stageIdle.classList.add('hidden'); stageCarteleria.classList.remove('hidden');
      outputStatus = { connected: true, revision: incomingRevision }; reportOutputStatus(); return true;
    }
    async function renderDisplay(payload, revision) {
      if (!payload || payload.phase === 'idle' || payload.type === 'idle') {
        pendingList = null; clearLayers(); stageActive.classList.remove('visible'); stageCarteleria.classList.add('hidden'); stageIdle.classList.remove('hidden');
        lastRenderKey = 'idle'; return true;
      }
      if (payload.type === 'carteleria') {
        pendingList = payload;
        if (!carteleriaFrame.src.includes('/carteleria')) carteleriaFrame.src = '/carteleria?tv=1';
        if (lastRenderKey !== 'carteleria') {
          clearLayers(); stageActive.classList.remove('visible'); stageIdle.classList.remove('hidden'); stageCarteleria.classList.add('hidden');
        }
        lastRenderKey = 'carteleria'; return revealList();
      }
      pendingList = null;
      await prepareSongFont(payload);
      if (revision !== incomingRevision) return false;
      const newKey = JSON.stringify(payload);
      if (newKey === lastRenderKey) return true;
      if (payload.imageUrl) {
        const image = new Image(); image.src = payload.imageUrl;
        try { await image.decode(); } catch { return false; }
        if (revision !== incomingRevision) return false;
      }
      const html = buildSlideHtml(payload);
      const targetLayer = currentLayer === 'A' ? layerB : layerA;
      const outgoingLayer = currentLayer === 'A' ? layerA : layerB;
      targetLayer.style.transition = 'none'; targetLayer.classList.remove('active');
      targetLayer.innerHTML = html;
      const appearance = payload.appearance;
      if (appearance) {
        targetLayer.style.setProperty('--song-family', 'Song_' + appearance.font);
        targetLayer.style.setProperty('--song-variation', '"wght" ' + (appearance.fontWeight || 800));
        targetLayer.style.setProperty('--song-color', payload.sectionType === 'chorus' ? appearance.chorusColor : appearance.color);
        targetLayer.style.setProperty('--song-indicator', appearance.indicatorColor);
        stageActive.style.background = appearance.background === 'solid' ? appearance.backgroundColor : `url("${appearance.backgroundUrl}") center / cover no-repeat`;
      } else { stageActive.style.background = ''; }
      void targetLayer.offsetHeight;
      await document.fonts.ready;
      if (revision !== incomingRevision) return false;
      if (payload.type === 'bible' && payload.mode !== 'text') autoScaleBibleSoloCita(targetLayer);
      autoFitSlideContent(targetLayer);
      void targetLayer.offsetHeight; targetLayer.style.transition = '';
      // Only reveal the stage after its incoming layer has been replaced and fitted.
      stageCarteleria.classList.add('hidden'); stageIdle.classList.add('hidden'); stageActive.classList.add('visible');
      outgoingLayer.classList.remove('active'); outgoingLayer.replaceChildren(); targetLayer.classList.add('active');
      currentLayer = currentLayer === 'A' ? 'B' : 'A'; lastRenderKey = newKey;
      return true;
    }

    function escapeHtml(str) {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }

    // Comunicación con iframe de Cartelería y atajos de teclado
    window.addEventListener('message', (event) => {
      if (event.origin !== location.origin || event.source !== carteleriaFrame?.contentWindow || !event.data) return;
      if (event.data.type === 'LIST_OUTPUT_READY') { listReady = event.data; revealList(); return; }
      const act = event.data.action || event.data.type;
      if (act === 'EXIT_CARTELERIA') {
        fetch('/api/control/action', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'CLEAR_PROJECTION' })
        }).catch(() => {});
      }
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        fetch('/api/control/action', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'NEXT_SLIDE' })
        }).catch(console.error);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        fetch('/api/control/action', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'PREV_SLIDE' })
        }).catch(console.error);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        fetch('/api/control/action', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'NEXT_SECTION' })
        }).catch(console.error);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        fetch('/api/control/action', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'PREV_SECTION' })
        }).catch(console.error);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        fetch('/api/control/action', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'CLEAR_PROJECTION' })
        }).catch(() => {});
      }
    });

    function connectWs() {
      const loc = window.location;
      const wsUrl = (loc.protocol === 'https:' ? 'wss://' : 'ws://') + loc.host + '/ws?view=output';
      const socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        console.log('[OBS DISPLAY] Conectado a Cabina de Proyección LLDM');
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'STATE_UPDATE' && data.state) {
            const revision = data.state.revision ?? 0;
            incomingRevision = revision;
            document.fonts.ready.then(async () => {
              if (incomingRevision !== revision || socket.readyState !== WebSocket.OPEN) return;
              const committed = await renderDisplay(data.state.displayPayload, revision);
              if (!committed) return;
              requestAnimationFrame(() => {
                if (incomingRevision !== revision || socket.readyState !== WebSocket.OPEN) return;
              outputStatus.revision = revision;
              outputStatus.connected = true;
                reportOutputStatus();
              });
            });
          } else if (data.type === 'CARTELERIA_CMD') {
            if (carteleriaFrame && carteleriaFrame.contentWindow) {
              carteleriaFrame.contentWindow.postMessage({ type: data.action, action: data.action }, location.origin);
            }
          }
        } catch (e) {
          console.error('[OBS DISPLAY] Error procesando mensaje WS:', e);
        }
      };

      socket.onclose = () => {
    outputStatus.connected = false;
    reportOutputStatus();
        setTimeout(connectWs, 2000);
      };

      socket.onerror = (err) => {
        socket.close();
      };
    }

    if (!lyricsPreview) connectWs();

if (lyricsPreview) window.addEventListener('message', async event => {
  if (event.origin !== location.origin || event.source !== parent || event.data?.type !== 'LYRICS_PREVIEW') return;
  const revision = ++incomingRevision;
  try { await renderDisplay(event.data.slide, revision); }
  catch (error) { parent.postMessage({ type: 'LYRICS_PREVIEW_ERROR', error: 'No se pudo cargar la fuente o el fondo. Elige otro archivo y revisa la vista previa.' }, location.origin); }
});
