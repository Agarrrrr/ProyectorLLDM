const { splitIntoSlides } = require('../songs/pagination');

function installContentRoutes({ app, projectionState, publishProjection, settings }) {
  // Proyectar Tema Oficial LLDM
  app.post('/api/project/theme', (req, res) => {
    const church = settings.get().settings.church;
    const { title, churchName = church.name, churchAddress = church.address, date = "" } = req.body;
    if (!title) return res.status(400).json({ error: 'Título de tema requerido' });

    const today = date || new Date().toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    const slide = {
      type: 'theme',
      badge: 'TEMA',
      title: title.trim(),
      subtitle: [churchName, churchAddress].filter(Boolean).join(' • '),
      footer: today,
      lines: [title.trim()],
      text: title.trim()
    };

    projectionState.phase = 'active';
    projectionState.contentType = 'theme';
    projectionState.activeItem = { title, churchName, churchAddress, date: today };
    projectionState.slides = [slide];
    projectionState.currentSlideIndex = 0;

    publishProjection({ repeat: true });
    res.json({ success: true, state: projectionState });
  });

  // Proyectar Carta o Presentación Apostólica
  app.post('/api/project/special', (req, res) => {
    const { type = "Carta Apostólica", date = "", location = "", text = "" } = req.body;

    const headerInfo = [date, location].filter(Boolean).join(' • ');

    const slide = {
      type: 'special',
      badge: type.toUpperCase(),
      title: type,
      subtitle: headerInfo,
      lines: text ? text.split('\n').filter(Boolean) : [type],
      text: text || type,
      footer: location
    };

    projectionState.phase = 'active';
    projectionState.contentType = 'special';
    projectionState.activeItem = { type, date, location, text };
    projectionState.slides = [slide];
    projectionState.currentSlideIndex = 0;

    publishProjection({ repeat: true });
    res.json({ success: true, state: projectionState });
  });

  // Proyectar Cuadro Dron
  app.post('/api/project/drone', (req, res) => {
    const { location = settings.get().settings.church.city } = req.body;

    const slide = {
      type: 'drone',
      badge: 'TOMA AÉREA',
      title: location.trim(),
      lines: [location.trim()],
      text: location.trim(),
      footer: settings.get().settings.church.name
    };

    projectionState.phase = 'active';
    projectionState.contentType = 'drone';
    projectionState.activeItem = { location };
    projectionState.slides = [slide];
    projectionState.currentSlideIndex = 0;

    publishProjection({ repeat: true });
    res.json({ success: true, state: projectionState });
  });

  // Proyectar Texto Libre / Aviso
  app.post('/api/project/custom', (req, res) => {
    const { text, badge = "AVISO", maxLines = 4 } = req.body;
    if (!text) return res.status(400).json({ error: 'Texto requerido' });

    const rawLines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const chunks = splitIntoSlides(rawLines, maxLines);
    const slides = chunks.map((chunk, idx) => ({
      type: 'custom',
      badge: chunks.length > 1 ? `${badge.toUpperCase()} (${idx + 1}/${chunks.length})` : badge.toUpperCase(),
      lines: chunk,
      text: chunk.join('\n'),
      slideNum: idx + 1
    }));

    projectionState.phase = 'active';
    projectionState.contentType = 'custom';
    projectionState.activeItem = { text, badge };
    projectionState.slides = slides;
    projectionState.currentSlideIndex = 0;

    publishProjection({ repeat: true });
    res.json({ success: true, state: projectionState });
  });
}

module.exports = { installContentRoutes };
