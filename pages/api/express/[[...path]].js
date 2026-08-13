const { runExpress } = require('../../../src/next-express');

export const config = {
  api: {
    bodyParser: false,
    responseLimit: false,
  },
};

export default async function handler(req, res) {
  try {
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
  } catch (err) {
    console.error('[API ERROR]:', err);
    if (!res.headersSent) {
      res.status(500).send(`<h1>Server Error</h1><p>${err?.message || 'Unknown error'}</p>`);
    }
  }
}



