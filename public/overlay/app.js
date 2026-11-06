const outputLength = value => window.OutputViewport.length(value);
const localPreferences = {
    get(key) { try { return localStorage.getItem(key); } catch { return null; } },
    set(key, value) { try { localStorage.setItem(key, value); } catch {} }
};
let hideTimer = null;
let exitTimer = null;
let pendingGraphicData = null;
let currentActiveKey = '';
let isTransitioning = false;
const isAppearancePreview = new URLSearchParams(location.search).has('appearancePreview');
let graphicDurations = { bannerDurationSeconds: 30, locationDurationSeconds: 75 };
function graphicDuration(data) {
    return data.durationMs ?? (data.type === 'drone' ? graphicDurations.locationDurationSeconds : graphicDurations.bannerDurationSeconds) * 1000;
}
function scheduleGraphicHide(delay) {
    if (hideTimer) clearTimeout(hideTimer);
    hideTimer = isAppearancePreview || delay <= 0 ? null : setTimeout(() => ocultarBanner(), delay);
}
function graphicExitDelay(classicDelay) {
    if (document.documentElement.dataset.bannerStyle !== 'angular') return classicDelay;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return 40;
    return 980;
}
const bannerWrapper = document.getElementById('bannerWrapper');
const bannerBody = document.getElementById('bannerBody');
const overlayContainer = document.getElementById('overlayContainer');
const broadcastWatermark = document.getElementById('broadcastWatermark');
const streamLogoBox = document.getElementById('streamLogoBox');
const droneWrapper = document.getElementById('droneWrapper');
const droneHeaderTag = document.getElementById('droneHeaderTag');
const droneMainText = document.getElementById('droneMainText');
const ministerBanner = document.getElementById('ministerBanner');
const ministerBody = document.getElementById('ministerBody');
const ministerNameText = document.getElementById('ministerNameText');
const ministerLocationText = document.getElementById('ministerLocationText');
const logoTint = document.createElement('span');
logoTint.className = 'logo-tint';
streamLogoBox.appendChild(logoTint);
window.addEventListener('graphics-changed', event => {
    const graphics = event.detail;
    graphicDurations = graphics;
    const root = document.documentElement;
    root.dataset.bannerStyle = graphics.bannerStyle;
    root.dataset.bannerTone = graphics.bannerTone;
    root.dataset.logoColor = graphics.logoColor;
    root.style.setProperty('--obs-logo-size', outputLength(graphics.logoSize));
    cambiarPosicion(`pos-${graphics.bannerPosition}`);
    cambiarPosicionLogo(graphics.logoPosition === 'hidden' ? 'hidden' : `watermark-${graphics.logoPosition}`);
    overlayContainer.style.paddingLeft = '';
    overlayContainer.style.paddingRight = '';
    if (graphics.logoPosition === graphics.bannerPosition) {
        overlayContainer.style[graphics.logoPosition.endsWith('left') ? 'paddingLeft' : 'paddingRight'] = outputLength(graphics.logoSize + 90);
    }
    window.LldmOverlayLayout.reset(bannerBody);
    window.LldmOverlayLayout.reset(droneWrapper.querySelector('.drone-card'));
    window.LldmOverlayLayout.fit(bannerBody, 130);
    window.LldmOverlayLayout.fit(droneWrapper.querySelector('.drone-card'), 220);
    if (ministerBody) {
        window.LldmOverlayLayout.reset(ministerBody);
        window.LldmOverlayLayout.fit(ministerBody, 150);
    }
});

if (window.obsstudio || window.location.search.includes('obs=1')) {
    document.getElementById('testPanel').classList.add('hidden');
}

const posGuardada = localPreferences.get('obs_banner_pos') || 'pos-top-right';
cambiarPosicion(posGuardada);

function cambiarPosicion(nuevaPos) {
    overlayContainer.className = 'overlay-container ' + nuevaPos;
    localPreferences.set('obs_banner_pos', nuevaPos);
    const select = document.querySelector('.test-panel select:nth-of-type(1)');
    if (select) select.value = nuevaPos;
}

// --- GESTIÓN DEL LOGO / MOSCA SIEMPRE VISIBLE ---
// Por defecto: Abajo Izquierda (solicitado por el usuario)
const urlParams = new URLSearchParams(window.location.search);
let posLogoInicial = 'watermark-bottom-left';
if (urlParams.has('logo_pos')) {
    posLogoInicial = urlParams.get('logo_pos');
} else if (localPreferences.get('obs_logo_pos_v2')) {
    posLogoInicial = localPreferences.get('obs_logo_pos_v2');
}
cambiarPosicionLogo(posLogoInicial);

function cambiarPosicionLogo(pos) {
    if (!broadcastWatermark) return;
    if (pos === 'hidden') {
        broadcastWatermark.style.display = 'none';
    } else {
        broadcastWatermark.style.display = 'flex';
        broadcastWatermark.className = 'broadcast-watermark ' + pos;
    }
    localPreferences.set('obs_logo_pos_v2', pos);
    const select = document.querySelector('.test-panel select:nth-of-type(2)');
    if (select) select.value = pos;
}

function activarBrilloLogo() {
    if (!streamLogoBox || document.documentElement.dataset.animateLogo === 'false') return;
    streamLogoBox.classList.remove('gleam-active');
    void streamLogoBox.offsetWidth; // Forzar reflow a 60 FPS
    streamLogoBox.classList.add('gleam-active');
    setTimeout(() => {
        streamLogoBox.classList.remove('gleam-active');
    }, 2700);
}

// Destello de prueba inmediato a los 2 segundos tras iniciar en OBS
setTimeout(activarBrilloLogo, 2000);

// Repetición automática cada minuto y medio (90 segundos = 90,000 ms)
const INTERVALO_BRILLO_LOGO = 90 * 1000;
setInterval(activarBrilloLogo, INTERVALO_BRILLO_LOGO);

const svgLocationPin = `
    <svg class="icon-svg" viewBox="0 0 24 24">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
    </svg>
`;

function getGraphicKey(data) {
    if (!data) return '';

    // Caso 0: Toma de Dron (Cuadro en medio)
    if (data.type === 'minister') {
        const min = String(data.minister || data.text || '').toLowerCase().trim();
        const loc = String(data.location || data.churchCity || '').toLowerCase().trim();
        return `minister:${min}:${loc}`;
    }
    if (data.type === 'drone') {
        const loc = String(data.location || data.text || 'tijuana').toLowerCase().trim();
        return `drone:${loc}`;
    }

    // Caso 1: Cartas y Presentaciones Apostólicas
    const isSpecial = data.type === 'special' ||
                      (data.book && /carta|presentaci/i.test(data.book)) ||
                      (typeof data.text === 'string' && /^(carta|presentaci)/i.test(data.text)) ||
                      (typeof data.fullText === 'string' && /^(carta|presentaci)/i.test(data.fullText));

    if (isSpecial) {
        const tag = /presentaci/i.test(data.book || data.text || data.fullText || '') ? 'pres' : 'carta';
        const fecha = String(data.date || data.fecha || '').toLowerCase().trim();
        const loc = String(data.location || data.locacion || '').toLowerCase().trim();
        const raw = String(data.text || data.fullText || data.book || '').toLowerCase().trim();
        return `spec:${tag}:${fecha}:${loc}:${raw}`;
    }

    // Caso 2: Citas bíblicas
    if (data.type === 'bible' || (data.book && data.chapterVerse)) {
        const book = String(data.book || '').toLowerCase().trim();
        const cv = String(data.chapterVerse || '').toLowerCase().trim();
        return `bib:${book}:${cv}`;
    }

    // Caso 3: Temas
    if (data.type === 'theme' || data.theme || (typeof data.text === 'string' && /^tema\s*[:-]\s*/i.test(data.text))) {
        const tema = String(data.theme || data.text || '').replace(/^tema\s*[:-]\s*/i, '').toLowerCase().trim();
        return `thm:${tema}`;
    }

    // Caso 4: Custom / Canto de Coro / Texto libre
    if (data.type === 'custom' || data.type === 'choir' || /coro/i.test(data.text || data.fullText || '')) {
        const custom = String(data.text || data.fullText || '').toLowerCase().trim();
        return `custom:${custom}`;
    }

    // Caso 5: Cantos del himnario y textos genéricos
    const raw = String(data.text || data.fullText || data.book || '')
        .replace(/\s*\([^)]*\)/g, '') // Ignorar contenido entre paréntesis () para comparar
        .replace(/\s{2,}/g, ' ')
        .toLowerCase()
        .trim();
    return `hymn:${raw}`;
}

function isAnyGraphicActive() {
    const bannerOn = bannerWrapper && (bannerWrapper.classList.contains('active') || bannerWrapper.classList.contains('exiting'));
    const droneOn = droneWrapper && (droneWrapper.classList.contains('active') || droneWrapper.classList.contains('exiting'));
    const ministerOn = ministerBanner && (ministerBanner.classList.contains('active') || ministerBanner.classList.contains('exiting'));
    return bannerOn || droneOn || ministerOn;
}

function isAnyGraphicExiting() {
    const bannerEx = bannerWrapper && bannerWrapper.classList.contains('exiting');
    const droneEx = droneWrapper && droneWrapper.classList.contains('exiting');
    const ministerEx = ministerBanner && ministerBanner.classList.contains('exiting');
    return bannerEx || droneEx || ministerEx;
}

function mostrarGrafico(data) {
    if (!data) return;

    const raw = String(data.text || data.fullText || data.book || data.location || data.minister || '').trim();
    if (!raw && !data.book && !data.theme && !data.chapterVerse && !data.location) {
        pendingGraphicData = null;
        ocultarBanner(true);
        return;
    }

    const newKey = getGraphicKey(data);
    if (!newKey) return;

    // 1. Si es exactamente el mismo gráfico que ya está en pantalla o mostrándose (eco de OBS / Broadcast):
    if ((isAnyGraphicActive() || isTransitioning) && currentActiveKey === newKey) {
        console.log('Ignorando duplicado de gráfico ya activo:', newKey);
        if (!isAnyGraphicExiting()) {
            if (hideTimer) clearTimeout(hideTimer);
            scheduleGraphicHide(graphicDuration(data));
        }
        return;
    }

    // 2. Si el faldón o cuadro de dron ya está activo en pantalla o en proceso de salida con OTRO gráfico:
    // Se queda en la lista de espera (cola), se completa la salida del gráfico actual,
    // y al terminar la salida, entra limpiamente el nuevo gráfico desde cero.
    if (isAnyGraphicActive() || isTransitioning) {
        console.log(`Lista de espera: Gráfico ocupado con [${currentActiveKey}]. Encolando [${newKey}]`);
        pendingGraphicData = data;
        if (!isAnyGraphicExiting()) {
            ocultarBanner(false);
        }
        return;
    }

    // 3. Si estaba completamente cerrado desde cero: desplegar directamente
    desplegarGrafico(data);
}

function preventShortWidows(text) {
    if (!text) return '';
    let clean = String(text).trim();
    clean = clean.replace(/(^|[ \t]+)([a-zA-ZáéíóúÁÉÍÓÚñÑ]{1,2})[ \t]+(?=[a-zA-ZáéíóúÁÉÍÓÚñÑ]{4,})/g, '$1$2\u00A0');
    clean = clean.replace(/[ \t]+([a-zA-ZáéíóúÁÉÍÓÚñÑ0-9\.,;:!?\(\)\-]{1,4})$/, '\u00A0$1');
    return clean;
}

function desplegarGrafico(data) {
    if (hideTimer) {
        clearTimeout(hideTimer);
        hideTimer = null;
    }
    if (exitTimer) {
        clearTimeout(exitTimer);
        exitTimer = null;
    }

    isTransitioning = false;
    currentActiveKey = getGraphicKey(data);

    // A) CASO ESPECIAL: Cuadro de Dron (Toma Aérea centrada en medio)
    if (data.type === 'minister') {
        if (bannerWrapper.classList.contains('active') || bannerWrapper.classList.contains('exiting')) {
            bannerWrapper.classList.remove('active', 'exiting');
        }
        if (droneWrapper && (droneWrapper.classList.contains('active') || droneWrapper.classList.contains('exiting'))) {
            droneWrapper.classList.remove('active', 'exiting');
        }

        const minText = (data.minister || data.text || 'MINISTRO').trim();
        const locText = (data.location || data.churchCity || '').trim();
        ministerNameText.textContent = preventShortWidows(minText);
        ministerLocationText.textContent = preventShortWidows(locText);
        ministerLocationText.style.display = locText ? '' : 'none';

        window.LldmOverlayLayout.fit(ministerBody, 150);
        document.fonts.ready.then(() => window.LldmOverlayLayout.fit(ministerBody, 150));
        ministerBanner.classList.remove('exiting', 'active');
        void ministerBanner.offsetWidth;

        requestAnimationFrame(() => {
            ministerBanner.classList.add('active');
        });

        scheduleGraphicHide(graphicDuration(data));
        return;
    }
    if (ministerBanner && (ministerBanner.classList.contains('active') || ministerBanner.classList.contains('exiting'))) {
        ministerBanner.classList.remove('active', 'exiting');
    }
    if (data.type === 'drone') {
        if (bannerWrapper.classList.contains('active') || bannerWrapper.classList.contains('exiting')) {
            bannerWrapper.classList.remove('active', 'exiting');
        }

        const locText = data.location || data.text || "Ubicación";
        const tagText = data.tag || "LA LUZ DEL MUNDO";
        droneHeaderTag.textContent = tagText;
        droneMainText.textContent = preventShortWidows(locText);
        window.LldmOverlayLayout.fit(droneWrapper.querySelector('.drone-card'), 220);
        document.fonts.ready.then(() => window.LldmOverlayLayout.fit(droneWrapper.querySelector('.drone-card'), 220));
        droneWrapper.classList.remove('exiting', 'active');
        void droneWrapper.offsetWidth;

        requestAnimationFrame(() => {
            droneWrapper.classList.add('active');
        });

        scheduleGraphicHide(graphicDuration(data));
        return;
    }

    // B) CASOS NORMALES: Faldón Estándar (Biblia, Himnario, Temas, Cartas, Coro/Texto Libre)
    if (droneWrapper && (droneWrapper.classList.contains('active') || droneWrapper.classList.contains('exiting'))) {
        droneWrapper.classList.remove('active', 'exiting');
    }

    const raw = String(data.text || data.fullText || data.book || '').trim();
    let html = '';

    // 1. Detección de Casos Especiales: Carta Apostólica y Presentación Apostólica
    const isSpecial = data.type === 'special' ||
                      (data.book && /carta|presentaci/i.test(data.book)) ||
                      /^(carta|presentaci)/i.test(raw);

    if (isSpecial) {
        let tag = 'CARTA APOSTÓLICA';
        if (/presentaci/i.test(data.book || raw)) {
            tag = 'PRESENTACIÓN APOSTÓLICA';
        }

        let fecha = (data.date || data.fecha || '').trim();
        let locacion = (data.location || data.locacion || '').trim();

        // Si viene como texto combinado "Carta Apostólica - Fecha - Locación" o "Carta Apostólica - Fecha"
        if (!fecha && raw) {
            const parts = raw.split(/\s*[-–—]\s*/);
            if (parts.length === 2) {
                fecha = parts[1].trim();
            } else if (parts.length > 2) {
                fecha = parts[1].trim();
                locacion = parts.slice(2).join(' - ').trim();
            }
        }

        // 1. Sin fecha ni locación: Título único limpio y prominente (ej: "CARTA APOSTÓLICA")
        if (!fecha && !locacion) {
            html = `<div class="main-title single-line">${escapeHtml(tag)}</div>`;
        } else if (!fecha && locacion) {
            // 2. Sin fecha pero con locación: Etiqueta dorada con el tipo y título con la locación y pin
            html = `
                <div class="category-tag">${escapeHtml(tag)}</div>
                <div class="main-title" style="display: flex; align-items: center; gap: 0.5rem;">
                    ${svgLocationPin} <span>${escapeHtml(preventShortWidows(locacion))}</span>
                </div>
            `;
        } else {
            // 3. Caso normal con fecha (y locación opcional)
            html = `
                <div class="category-tag">${escapeHtml(tag)}</div>
                <div class="main-title">${escapeHtml(preventShortWidows(fecha))}</div>
                ${locacion ? `<div class="sub-detail">${svgLocationPin} <span>${escapeHtml(preventShortWidows(locacion))}</span></div>` : ''}
            `;
        }
    } else if (data.type === 'bible' || (data.book && data.chapterVerse)) {
        html = `
            <div class="bible-layout">
                <span class="bible-book">${escapeHtml(data.book)}</span>
                <span class="bible-verse">${escapeHtml(data.chapterVerse)}</span>
            </div>
        `;
    } else if (data.type === 'theme' || data.theme || (typeof data.text === 'string' && /^tema\s*[:-]\s*/i.test(data.text))) {
        let temaTexto = data.theme || data.text || '';
        temaTexto = temaTexto.replace(/^tema\s*[:-]\s*/i, '').trim();
        html = `
            <div class="category-tag">TEMA</div>
            <div class="main-title">${escapeHtml(preventShortWidows(temaTexto))}</div>
        `;
    } else if (data.type === 'custom' || data.type === 'choir' || /^(?:(?:el\s+)?coro(?:\s+canta)?|canto\s*(?:de|del)?\s*coro|himno\s*(?:de|del)?\s*coro)/i.test(raw)) {
        // 4. Texto libre, Cantos del Coro o Anuncio "El Coro Canta"
        const choirRegex = /^(?:(?:el\s+)?coro(?:\s+canta)?|canto\s*(?:de|del)?\s*coro|himno\s*(?:de|del)?\s*coro)(?:\s*[:-]\s*(.*))?$/i;
        const choirMatch = raw.match(choirRegex);

        if (choirMatch || data.tag === 'CORO DE LA IGLESIA' || data.type === 'choir') {
            let songTitle = '';
            if (choirMatch && choirMatch[1]) {
                songTitle = choirMatch[1].trim();
            } else if (data.songTitle) {
                songTitle = data.songTitle.trim();
            } else if (data.text && !/^(?:el\s+)?coro(?:\s+canta)?$/i.test(data.text)) {
                songTitle = data.text.trim();
            }

            if (songTitle) {
                html = `
                    <div class="category-tag">CORO DE LA IGLESIA</div>
                    <div class="main-title">${escapeHtml(preventShortWidows(songTitle))}</div>
                `;
            } else {
                html = `
                    <div class="category-tag">ALABANZA</div>
                    <div class="main-title">EL CORO CANTA</div>
                `;
            }
        } else {
            const noticeMatch = raw.match(/^(aviso|nota|anuncio)\s*[:-]\s*(.*)$/i);
            if (noticeMatch) {
                const tag = noticeMatch[1].toUpperCase();
                const title = noticeMatch[2].trim();
                html = `
                    <div class="category-tag">${escapeHtml(tag)}</div>
                    <div class="main-title">${escapeHtml(preventShortWidows(title))}</div>
                `;
            } else {
                html = `<div class="main-title single-line">${escapeHtml(preventShortWidows(raw))}</div>`;
            }
        }
    } else {
        // 5. Cantos del Himnario: Eliminar todo lo que esté entre paréntesis ()
        const cleanHymnRaw = raw.replace(/\s*\([^)]*\)/g, '').replace(/\s{2,}/g, ' ').trim();
        const hymnRegex = /^(?:canto|himno)?\s*#?\s*(\d{1,4})\s*[-:.]?\s*(.*)$/i;
        const hymnMatch = cleanHymnRaw.match(hymnRegex);
        if (hymnMatch) {
            const num = hymnMatch[1];
            let title = (hymnMatch[2] || '').replace(/^[-:.]\s*/, '').trim();
            html = `
                <div class="hymn-layout">
                    <span class="hymn-num">${escapeHtml(num)}</span>
                    <span class="hymn-title">${escapeHtml(preventShortWidows(title || 'CANTO'))}</span>
                </div>
            `;
        } else {
            html = `<div class="main-title single-line">${escapeHtml(preventShortWidows(cleanHymnRaw))}</div>`;
        }
    }

    bannerBody.innerHTML = html;

    // Ajuste uniforme SOLO si el contenido es excepcionalmente largo y excede el ancho seguro
    const hymnLayout = bannerBody.querySelector('.hymn-layout');
    if (hymnLayout) {
        const hymnNum = hymnLayout.querySelector('.hymn-num');
        const hymnTitle = hymnLayout.querySelector('.hymn-title');
        const totalLen = (hymnNum ? hymnNum.textContent.length : 0) + (hymnTitle ? hymnTitle.textContent.length : 0);
        if (totalLen > 50) {
            if (hymnNum) hymnNum.style.fontSize = outputLength(30);
            if (hymnTitle) hymnTitle.style.fontSize = outputLength(30);
        } else if (totalLen > 38) {
            if (hymnNum) hymnNum.style.fontSize = outputLength(35);
            if (hymnTitle) hymnTitle.style.fontSize = outputLength(35);
        }
    }

    const bibleLayout = bannerBody.querySelector('.bible-layout');
    if (bibleLayout) {
        const bibleBook = bibleLayout.querySelector('.bible-book');
        const bibleVerse = bibleLayout.querySelector('.bible-verse');
        const totalLen = (bibleBook ? bibleBook.textContent.length : 0) + (bibleVerse ? bibleVerse.textContent.length : 0);
        if (totalLen > 50) {
            if (bibleBook) bibleBook.style.fontSize = outputLength(30);
            if (bibleVerse) bibleVerse.style.fontSize = outputLength(30);
        } else if (totalLen > 38) {
            if (bibleBook) bibleBook.style.fontSize = outputLength(35);
            if (bibleVerse) bibleVerse.style.fontSize = outputLength(35);
        }
    }

    const mainTitleEl = bannerBody.querySelector('.main-title');
    if (mainTitleEl) {
        const len = mainTitleEl.textContent.length;
        if (len > 50) {
            mainTitleEl.style.fontSize = outputLength(30);
        } else if (len > 38) {
            mainTitleEl.style.fontSize = outputLength(35);
        }
    }

    window.LldmOverlayLayout.fit(bannerBody, 130);
    document.fonts.ready.then(() => window.LldmOverlayLayout.fit(bannerBody, 130));

    // Entrada completa desde cero con animación a 60 FPS
    bannerWrapper.classList.remove('exiting', 'active');
    void bannerWrapper.offsetWidth;

    requestAnimationFrame(() => {
        bannerWrapper.classList.add('active');
    });

    scheduleGraphicHide(graphicDuration(data));
}

function ocultarBanner(cancelarCola = false) {
    if (cancelarCola) {
        pendingGraphicData = null;
    }

    if (hideTimer) {
        clearTimeout(hideTimer);
        hideTimer = null;
    }

    // 1. Si el Cuadro Dron está activo o saliendo
    if (ministerBanner && (ministerBanner.classList.contains('active') || ministerBanner.classList.contains('exiting'))) {
        if (ministerBanner.classList.contains('exiting')) return;

        ministerBanner.classList.remove('active');
        ministerBanner.classList.add('exiting');
        isTransitioning = true;

        if (exitTimer) clearTimeout(exitTimer);

        exitTimer = setTimeout(() => {
            ministerBanner.classList.remove('exiting');
            exitTimer = null;
            isTransitioning = false;
            currentActiveKey = '';

            if (pendingGraphicData) {
                const nextData = pendingGraphicData;
                pendingGraphicData = null;
                setTimeout(() => {
                    desplegarGrafico(nextData);
                }, 120);
            }
        }, graphicExitDelay(1150));
        return;
    }
    if (droneWrapper && (droneWrapper.classList.contains('active') || droneWrapper.classList.contains('exiting'))) {
        if (droneWrapper.classList.contains('exiting')) return;

        droneWrapper.classList.remove('active');
        droneWrapper.classList.add('exiting');
        isTransitioning = true;

        if (exitTimer) clearTimeout(exitTimer);

        exitTimer = setTimeout(() => {
            droneWrapper.classList.remove('exiting');
            exitTimer = null;
            isTransitioning = false;
            currentActiveKey = '';

            if (pendingGraphicData) {
                const nextData = pendingGraphicData;
                pendingGraphicData = null;
                setTimeout(() => {
                    desplegarGrafico(nextData);
                }, 120);
            }
        }, graphicExitDelay(1850));
        return;
    }

    // 2. Si el faldón estándar está en medio de salir
    if (bannerWrapper.classList.contains('exiting')) {
        return;
    }

    if (bannerWrapper.classList.contains('active')) {
        bannerWrapper.classList.remove('active');
        bannerWrapper.classList.add('exiting');
        isTransitioning = true;

        if (exitTimer) {
            clearTimeout(exitTimer);
        }

        exitTimer = setTimeout(() => {
            bannerWrapper.classList.remove('exiting');
            exitTimer = null;
            isTransitioning = false;
            currentActiveKey = '';

            // Si hay un gráfico esperando en la lista de espera (cambio antes de tiempo):
            if (pendingGraphicData) {
                const nextData = pendingGraphicData;
                pendingGraphicData = null;

                // Breve pausa de 120ms para que la salida termine limpiamente y se inicie la entrada
                setTimeout(() => {
                    desplegarGrafico(nextData);
                }, 120);
            }
        }, graphicExitDelay(1150));
    } else {
        // No estaba activo ni saliendo
        isTransitioning = false;
        currentActiveKey = '';
        if (pendingGraphicData) {
            const nextData = pendingGraphicData;
            pendingGraphicData = null;
            desplegarGrafico(nextData);
        }
    }
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

// Conexión directa al WebSocket central de Cabina de Proyección LLDM (para control en red local LAN)
function connectCabinaWS() {
    try {
        const host = window.location.host || 'localhost:4000';
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${host}/ws?view=output`;
        const pWs = new WebSocket(wsUrl);

        pWs.onopen = () => {
            console.log('[OVERLAY LLDM] Conectado al WebSocket central:', wsUrl);
        };

        pWs.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'STATE_UPDATE') {
                    window.LldmGraphics?.acceptState(data.state);
                } else if (new URLSearchParams(location.search).has('appearancePreview')) {
                    // A settings preview must never follow live production events.
                    return;
                } else if (data.type === 'OVERLAY_EVENT' && data.payload) {

                    mostrarGrafico(data.payload);
                } else if (data.type === 'OVERLAY_HIDE' || data.action === 'hide') {
                    ocultarBanner(true);
                }
            } catch (e) {
                console.error('Error parseando mensaje WS en overlay:', e);
            }
        };

        pWs.onclose = () => {
            setTimeout(connectCabinaWS, 3000);
        };

        pWs.onerror = () => {
            pWs.close();
        };
    } catch (err) {
        console.warn('Error iniciando conexión WebSocket central:', err);
    }
}
if (!isAppearancePreview) connectCabinaWS();

function probarBiblia(libro, cv) {
    mostrarGrafico({ type: 'bible', book: libro, chapterVerse: cv });
}

function probarCarta(titulo, fecha, lugar) {
    mostrarGrafico({ type: 'special', book: titulo, date: fecha, location: lugar });
}

function probarTema(tema) {
    mostrarGrafico({ type: 'theme', theme: tema });
}

function probarCanto(textoCanto) {
    mostrarGrafico({ type: 'hymn', text: textoCanto });
}

function probarDron(lugar) {
    mostrarGrafico({ type: 'drone', location: lugar, tag: 'LA LUZ DEL MUNDO' });
}

function probarCoro(texto) {
    mostrarGrafico({ type: 'custom', text: texto });
}

function probarMinistro(nombre, lugar) {
    mostrarGrafico({ type: 'minister', minister: nombre, location: lugar });
}
