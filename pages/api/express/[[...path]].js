const { app } = require('../../../server');
const { runExpress } = require('../../../src/next-express');

export const config = {
  api: {
    bodyParser: false,
    externalResolver: true,
    responseLimit: false
  }
};

export default async function handler(req, res) {
  const path = Array.isArray(req.query.path) ? req.query.path.join('/') : '';
  const qs = new URL(req.url, 'http://localhost').searchParams;
  qs.delete('path');
  const normalizedUrl = `/${path}${qs.size ? `?${qs}` : ''}`;
  req.url = normalizedUrl;
  req.originalUrl = normalizedUrl;

  const origSend = res.send;
  res.send = function (body) {
    if (typeof body === 'string' && !res.getHeader('content-type')) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
    }
    return origSend.call(this, body);
  };

  await runExpress(app, req, res);
}
