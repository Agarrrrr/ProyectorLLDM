const os = require('node:os');
const hostname = os.hostname().toLowerCase();

const loopback = address => ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(address);
function validLocalRequest(req) {
  try {
    const host = new URL(`http://${req.headers.host}`).hostname.replace(/^\[|\]$/g, '').toLowerCase();
    const allowed = new Set(['localhost', '127.0.0.1', '::1', hostname, `${hostname}.local`, req.socket.localAddress?.replace('::ffff:', '')]);
    if (!allowed.has(host)) return false;
    if (req.headers.origin) {
      const origin = new URL(req.headers.origin);
      if (origin.protocol !== 'http:' || origin.host !== req.headers.host) return false;
    } else if (!loopback(req.socket.remoteAddress) && !['GET', 'HEAD'].includes(req.method)) return false;
    return req.headers['sec-fetch-site'] !== 'cross-site';
  } catch { return false; }
}
function localSecurity(req, res, next) {
  if (!validLocalRequest(req)) return res.status(403).json({ error: 'Origen de conexión no permitido.' });
  res.setHeader('X-Content-Type-Options', 'nosniff');
  next();
}
module.exports = { localSecurity, validLocalRequest };
