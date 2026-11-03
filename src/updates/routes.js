function installUpdateRoutes({ app, service }) {
  const local = req => ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress);
  app.get('/api/updates', (req, res) => { res.setHeader('Cache-Control', 'no-store'); res.json({ ...service.snapshot(), canConfigure: local(req) }); });
  app.use('/api/updates', (req, res, next) => {
    if (!local(req)) return res.status(403).json({ error: 'Administra las actualizaciones desde localhost en la PC del templo.' });
    next();
  });
  app.put('/api/updates/preferences', (req, res, next) => { try { res.json(service.configure(req.body)); } catch (error) { next(error); } });
}
module.exports = { installUpdateRoutes };
