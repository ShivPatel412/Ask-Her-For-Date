function runExpress(app, req, res) {
  const originalSend = res.send;
  const originalEnd = res.end;

  if (typeof originalSend === 'function') {
    res.send = function (body) {
      if (typeof body === 'string' && !res.getHeader('content-type')) {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
      }
      return originalSend.call(this, body);
    };
  }

  if (typeof originalEnd === 'function') {
    res.end = function (chunk, encoding, cb) {
      if (typeof chunk === 'string' && !res.getHeader('content-type') && (chunk.trimStart().startsWith('<') || chunk.trimStart().startsWith('<!'))) {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
      }
      return originalEnd.call(this, chunk, encoding, cb);
    };
  }

  return new Promise((resolve, reject) => {
    let settled = false;
    const done = error => {
      if (settled) return;
      settled = true;
      error ? reject(error) : resolve();
    };
    res.once('finish', () => done());
    res.once('close', () => done());
    app(req, res, done);
  });
}

module.exports = { runExpress };
