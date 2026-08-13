const { runExpress } = require('../../../src/next-express');

export default async function handler(req, res) {
  if (process.env.NODE_ENV !== 'production') {
    delete require.cache[require.resolve('../../../server')];
  }
  const { app } = require('../../../server');
  const path = Array.isArray(req.query.path) ? req.query.path.join('/') : '';
  const qs = new URL(req.url, 'http://localhost').searchParams;
  qs.delete('path');
  const normalizedUrl = `/${path}${qs.size ? `?${qs}` : ''}`;
  req.url = normalizedUrl;
  req.originalUrl = normalizedUrl;
  delete req._parsedUrl;
  delete req._parsedAppUrl;
  delete req._parsedOriginalUrl;
  delete req.path;
  delete req._path;

  const origSend = res.send;
  res.send = function (body) {
    if (typeof body === 'string' && !res.getHeader('content-type')) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
    }
    return origSend.call(this, body);
  };

  await runExpress(app, req, res);
}
