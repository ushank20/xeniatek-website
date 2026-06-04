const express = require('express');
const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const STATIC_DIR = path.join(__dirname, 'raas-tech');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Security headers (replaces serve.json headers)
app.use((req, res, next) => {
  res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  res.setHeader('X-DNS-Prefetch-Control', 'on');
  next();
});

function getTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_PASS,
    },
  });
}

function buildEmail(fields) {
  const skip = new Set(['_captcha', '_subject', '_next', '_honey']);
  const rows = Object.entries(fields)
    .filter(([k, v]) => !skip.has(k) && v !== '' && v !== undefined)
    .map(([k, v]) => {
      const val = Array.isArray(v) ? v.join(', ') : String(v).replace(/\n/g, '<br>');
      const label = k.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
      return `<tr>
        <td style="padding:10px 16px;font-weight:600;color:#1D0E82;white-space:nowrap;border-bottom:1px solid #eee;vertical-align:top;width:160px;">${label}</td>
        <td style="padding:10px 16px;border-bottom:1px solid #eee;color:#333;">${val}</td>
      </tr>`;
    }).join('');

  return `<!DOCTYPE html><html><body style="margin:0;padding:0;font-family:Arial,sans-serif;">
  <div style="max-width:600px;margin:24px auto;border:1px solid #ddd;border-radius:8px;overflow:hidden;">
    <div style="background:#100F2E;padding:20px 24px;">
      <h2 style="color:#fff;margin:0;font-size:1.1rem;">${fields._subject || 'New Form Submission'} — XeniaTek</h2>
    </div>
    <table style="width:100%;border-collapse:collapse;">${rows}</table>
    <div style="background:#f5f5f5;padding:12px 24px;font-size:0.75rem;color:#999;">
      Submitted via XeniaTek website
    </div>
  </div>
  </body></html>`;
}

app.post('/api/contact', async (req, res) => {
  const isAjax = (req.headers.accept || '').includes('application/json');
  const fields = req.body;

  if (!process.env.GMAIL_USER || !process.env.GMAIL_PASS) {
    console.error('GMAIL_USER or GMAIL_PASS env vars not set');
    if (isAjax) return res.status(500).json({ success: 'false' });
    return res.redirect('/?error=1');
  }

  try {
    await getTransporter().sendMail({
      from: `"XeniaTek Website" <${process.env.GMAIL_USER}>`,
      to: process.env.GMAIL_USER,
      replyTo: fields.email || undefined,
      subject: fields._subject || 'New Form Submission — XeniaTek',
      html: buildEmail(fields),
    });

    if (isAjax) return res.json({ success: 'true' });
    return res.redirect(fields._next || '/contact.html?sent=1');
  } catch (err) {
    console.error('Mailer error:', err.message);
    if (isAjax) return res.status(500).json({ success: 'false' });
    return res.redirect('/?error=1');
  }
});

// Serve static files — extensions:['html'] enables clean URLs (/about → about.html)
app.use(express.static(STATIC_DIR, { extensions: ['html'] }));

// Strip trailing slash + serve 404 page
app.use((req, res) => {
  if (req.path.length > 1 && req.path.endsWith('/')) {
    return res.redirect(301, req.path.slice(0, -1));
  }
  const p404 = path.join(STATIC_DIR, '404.html');
  if (fs.existsSync(p404)) return res.status(404).sendFile(p404);
  res.status(404).send('Not found');
});

app.listen(PORT, () => console.log(`XeniaTek server running on port ${PORT}`));
