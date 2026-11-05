const { createHash, createHmac, timingSafeEqual } = require('node:crypto');

const hash = value => createHash('sha256').update(value).digest();
const cookieName = '__Host-proyector';
const destinations = new Set(['/control', '/pantalla', '/overlay', '/overlay?obs=1']);

function createHostedAccess({ origin, operatorKey, outputKey }) {
  const site = new URL(origin);
  if (site.protocol !== 'https:' || site.origin !== origin) throw new Error('PROYECTOR_PUBLIC_ORIGIN debe ser un origen HTTPS.');
  if (![operatorKey, outputKey].every(key => typeof key === 'string' && /^[\w-]{32,128}$/.test(key)) || operatorKey === outputKey) {
    throw new Error('Configura dos claves distintas de al menos 32 caracteres para la cabina y las pantallas.');
  }
  const operator = hash(operatorKey);
  const output = hash(outputKey);
  const operatorSession = createHmac('sha256', operatorKey).update(origin + '/operator').digest('base64url');
  const outputSession = createHmac('sha256', outputKey).update(origin + '/output').digest('base64url');
  function role(key) {
    if (typeof key !== 'string' || key.length > 128) return null;
    const candidate = hash(key);
    if (timingSafeEqual(candidate, operator)) return 'operator';
    if (timingSafeEqual(candidate, output)) return 'output';
    return null;
  }
  function requestRole(req) {
    const cookie = req.headers.cookie?.split(';').map(part => part.trim()).find(part => part.startsWith(cookieName + '='));
    const value = cookie?.slice(cookieName.length + 1);
    if (value?.length !== 43) return null;
    const candidate = Buffer.from(value);
    if (candidate.length !== 43) return null;
    if (timingSafeEqual(candidate, Buffer.from(operatorSession))) return 'operator';
    if (timingSafeEqual(candidate, Buffer.from(outputSession))) return 'output';
    return null;
  }
  function validRequest(req) {
    if (req.headers.host !== site.host || req.headers['sec-fetch-site'] === 'cross-site') return false;
    const needsOrigin = req.headers.upgrade || !['GET', 'HEAD'].includes(req.method);
    return req.headers.origin === origin || (!needsOrigin && !req.headers.origin);
  }
  function install(app) {
    app.post('/api/web/session', (req, res) => {
      const key = req.body?.key;
      const access = role(key);
      const destination = req.body?.destination;
      if (!access || !destinations.has(destination) || (access === 'output' && destination === '/control')) {
        return res.status(403).json({ error: 'La clave no permite abrir esta vista.' });
      }
      res.cookie(cookieName, access === 'operator' ? operatorSession : outputSession, { secure: true, httpOnly: true, sameSite: 'strict', path: '/' });
      return res.json({ destination });
    });
  }
  function protect(req, res, next, mobile) {
    const pathname = req.path.toLowerCase();
    const role = requestRole(req);
    if (pathname === '/api/updates' || pathname.startsWith('/api/updates/')) return res.sendStatus(404);
    if (pathname.startsWith('/api/backup') && role !== 'operator') return res.sendStatus(403);
    if (role === 'operator' || mobile) return next();
    const reading = ['GET', 'HEAD'].includes(req.method);
    const outputView = /^\/(?:pantalla|overlay|idle)(?:\.html)?\/?$/.test(pathname);
    if (reading && outputView && role !== 'output') {
      const view = pathname.startsWith('/overlay') ? '/overlay?obs=1' : '/pantalla';
      return res.redirect('/acceso.html?destino=' + encodeURIComponent(view));
    }
    if (reading && /^\/control(?:\.html)?\/?$/.test(pathname)) return res.redirect('/acceso.html');
    if (reading && role === 'output' && (
      ['/api/settings', '/api/lists'].includes(pathname) ||
      /^\/song-assets\/(?:image|font)-[a-f\d]{24}\.(?:ttf|otf|woff2?|png|jpg|webp)$/.test(pathname) ||
      /^\/uploads\/presentations\/pres_[a-f\d-]{36}\/slide_\d+\.png$/.test(pathname) ||
      ((pathname === '/carteleria' || pathname === '/carteleria/') && req.query.tv === '1')
    )) return next();
    if (!reading || pathname.startsWith('/api/') || pathname.startsWith('/uploads/') || pathname.startsWith('/song-assets/') ||
      pathname === '/carteleria' || pathname === '/carteleria/' || pathname.startsWith('/carteleria/index')) return res.sendStatus(403);
    return next();
  }
  return { origin, validRequest, install, protect, isOwner: req => requestRole(req) === 'operator', canView: req => requestRole(req) !== null };
}

module.exports = { createHostedAccess };
