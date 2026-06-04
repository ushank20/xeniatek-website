const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const STATIC_DIR = path.join(__dirname, 'raas-tech');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain',
  '.xml': 'application/xml',
  '.pdf': 'application/pdf',
};

const SECURITY_HEADERS = {
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
};

function parseBody(req) {
  return new Promise((resolve) => {
    let raw = '';
    req.on('data', chunk => raw += chunk);
    req.on('end', () => {
      try {
        const ct = req.headers['content-type'] || '';
        if (ct.includes('application/json')) {
          resolve(JSON.parse(raw));
        } else {
          const obj = {};
          new URLSearchParams(raw).forEach((v, k) => {
            obj[k] = obj[k] !== undefined ? [].concat(obj[k], v) : v;
          });
          resolve(obj);
        }
      } catch { resolve({}); }
    });
  });
}

function buildEmail(fields) {
  const skip = new Set(['_captcha', '_subject', '_next', '_honey']);
  const rows = Object.entries(fields)
    .filter(([k, v]) => !skip.has(k) && v !== '' && v != null)
    .map(([k, v]) => {
      const val = (Array.isArray(v) ? v.join(', ') : String(v))
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
      const label = k.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
      return `<tr>
        <td style="padding:10px 16px;font-weight:600;color:#1D0E82;white-space:nowrap;border-bottom:1px solid #eee;vertical-align:top;width:160px;">${label}</td>
        <td style="padding:10px 16px;border-bottom:1px solid #eee;color:#333;">${val}</td>
      </tr>`;
    }).join('');

  return `<!DOCTYPE html><html><body style="margin:0;padding:0;font-family:Arial,sans-serif;">
  <div style="max-width:600px;margin:24px auto;border:1px solid #ddd;border-radius:8px;overflow:hidden;">
    <div style="background:#100F2E;padding:20px 24px;">
      <h2 style="color:#fff;margin:0;font-size:1.1rem;">${(fields._subject || 'New Form Submission').replace(/</g,'&lt;')} — XeniaTek</h2>
    </div>
    <table style="width:100%;border-collapse:collapse;">${rows}</table>
    <div style="background:#f5f5f5;padding:12px 24px;font-size:0.75rem;color:#999;">Submitted via XeniaTek website</div>
  </div></body></html>`;
}

function sendEmail(fields) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      from: 'XeniaTek <onboarding@resend.dev>',
      to: ['ushank.tech@gmail.com'],
      reply_to: fields.email || undefined,
      subject: fields._subject || 'New Form Submission — XeniaTek',
      html: buildEmail(fields),
    });

    const req = https.request({
      hostname: 'api.resend.com',
      path: '/emails',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) resolve(JSON.parse(data));
        else reject(new Error(`Resend ${res.statusCode}: ${data}`));
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function serveFile(res, filePath) {
  const content = fs.readFileSync(filePath);
  res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream', ...SECURITY_HEADERS });
  res.end(content);
}

function serve404(res) {
  const p = path.join(STATIC_DIR, '404.html');
  res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8', ...SECURITY_HEADERS });
  res.end(fs.existsSync(p) ? fs.readFileSync(p) : 'Not found');
}

http.createServer(async (req, res) => {

  // POST /api/contact — form handler
  if (req.method === 'POST' && req.url.startsWith('/api/contact')) {
    const isAjax = (req.headers.accept || '').includes('application/json');
    const json = (code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); };
    const redirect = (url) => { res.writeHead(302, { Location: url }); res.end(); };

    if (!process.env.RESEND_API_KEY) {
      console.error('RESEND_API_KEY not set');
      return isAjax ? json(500, { success: 'false' }) : redirect('/?error=1');
    }
    try {
      const fields = await parseBody(req);
      await sendEmail(fields);
      console.log('Email sent:', fields._subject || 'form submission');
      return isAjax ? json(200, { success: 'true' }) : redirect(fields._next || '/contact?sent=1');
    } catch (err) {
      console.error('Email error:', err.message);
      return isAjax ? json(500, { success: 'false' }) : redirect('/?error=1');
    }
  }

  // Static file serving with clean URLs
  let urlPath = req.url.split('?')[0];

  if (urlPath.length > 1 && urlPath.endsWith('/')) {
    res.writeHead(301, { Location: urlPath.slice(0, -1) });
    return res.end();
  }

  const candidates = [
    path.join(STATIC_DIR, urlPath),
    path.join(STATIC_DIR, urlPath + '.html'),
    path.join(STATIC_DIR, urlPath, 'index.html'),
  ];

  for (const p of candidates) {
    if (fs.existsSync(p) && fs.statSync(p).isFile()) return serveFile(res, p);
  }

  serve404(res);

}).listen(PORT, () => console.log(`XeniaTek server running on port ${PORT}`));
