const fs = require('fs');
const path = require('path');

const STATIC_DIR = path.join(__dirname, 'raas-tech');
const BLOG_DIR = path.join(STATIC_DIR, 'blog');
const BLOG_INDEX = path.join(STATIC_DIR, 'blog.html');
const JOBS_FILE = path.join(__dirname, 'data', 'jobs.json');
const JOBS_HTML = path.join(STATIC_DIR, 'jobs.html');
const BASE_URL = 'https://xeniatek-website-production.up.railway.app';

// ── Sessions ──────────────────────────────────────────────────────────────────
const sessions = new Map();

function genToken() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function parseCookies(header = '') {
  const c = {};
  header.split(';').forEach(s => {
    const [k, ...v] = s.trim().split('=');
    if (k) c[k.trim()] = v.join('=').trim();
  });
  return c;
}

function isAuth(req) {
  const token = parseCookies(req.headers.cookie).admin_tok;
  if (!token) return false;
  const exp = sessions.get(token);
  if (!exp || Date.now() > exp) { sessions.delete(token); return false; }
  return true;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function slugify(title) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function formatBody(raw) {
  if (!raw.trim()) return '';
  if (raw.trim().startsWith('<')) return raw;
  return raw.split(/\n\n+/).map(p => `<p>${p.trim().replace(/\n/g, '<br>')}</p>`).filter(p => p !== '<p></p>').join('\n      ');
}

function monthName(dateStr) {
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const d = new Date(dateStr + 'T12:00:00');
  return `${months[d.getMonth()]} ${d.getFullYear()}`;
}

function getPosts() {
  if (!fs.existsSync(BLOG_DIR)) return [];
  return fs.readdirSync(BLOG_DIR)
    .filter(f => f.endsWith('.html'))
    .map(f => {
      const slug = f.replace('.html', '');
      const html = fs.readFileSync(path.join(BLOG_DIR, f), 'utf8');
      const title = (html.match(/<title>([^|<]+)/) || [])[1]?.trim() || slug;
      const tag = (html.match(/<span class="blog-tag">([^<]+)/) || [])[1] || '';
      const date = (html.match(/"datePublished":"([^"]+)"/) || [])[1] || '';
      return { slug, title, tag, date, file: f };
    })
    .sort((a, b) => (b.date > a.date ? 1 : -1));
}

// ── HTML templates ─────────────────────────────────────────────────────────────
const CSS = `
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Segoe UI',Arial,sans-serif;background:#0d0c26;color:#e0e0f0;min-height:100vh}
  .top-bar{background:#1D0E82;padding:14px 32px;display:flex;align-items:center;justify-content:space-between}
  .top-bar h1{color:#fff;font-size:1.1rem;font-weight:700}
  .top-bar a{color:#77BF00;text-decoration:none;font-size:0.85rem}
  .wrap{max-width:860px;margin:40px auto;padding:0 24px}
  .card{background:#16153a;border:1px solid #2a2860;border-radius:12px;padding:28px 32px;margin-bottom:24px}
  h2{font-size:1.15rem;color:#fff;margin-bottom:20px;font-weight:700}
  label{display:block;font-size:0.8rem;color:#a0a0c0;margin-bottom:6px;font-weight:600;text-transform:uppercase;letter-spacing:.04em}
  input[type=text],input[type=date],input[type=number],input[type=password],select,textarea{
    width:100%;background:#0d0c26;border:1px solid #2a2860;border-radius:8px;
    color:#e0e0f0;font-size:0.95rem;padding:10px 14px;outline:none;font-family:inherit}
  input:focus,select:focus,textarea:focus{border-color:#7B61FF}
  textarea{resize:vertical;line-height:1.6}
  .row{display:grid;grid-template-columns:1fr 1fr;gap:16px}
  .row3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px}
  .fg{margin-bottom:18px}
  .btn{display:inline-block;padding:11px 26px;border-radius:8px;font-weight:700;font-size:0.9rem;cursor:pointer;border:none;text-decoration:none}
  .btn-primary{background:#77BF00;color:#fff}
  .btn-secondary{background:#2a2860;color:#e0e0f0}
  .btn-danger{background:#c0392b;color:#fff;font-size:0.8rem;padding:6px 14px}
  .post-list{list-style:none}
  .post-list li{display:flex;align-items:center;justify-content:space-between;padding:12px 0;border-bottom:1px solid #2a2860}
  .post-list li:last-child{border-bottom:none}
  .post-title{font-size:0.95rem;color:#e0e0f0}
  .post-meta{font-size:0.78rem;color:#7070a0;margin-top:3px}
  .post-actions{display:flex;gap:8px;flex-shrink:0;margin-left:16px}
  .tag-chip{background:#1D0E82;color:#a0b0ff;padding:2px 8px;border-radius:4px;font-size:0.75rem}
  .tip{font-size:0.78rem;color:#6060a0;margin-top:6px}
  .alert{background:#1a0e0e;border:1px solid #c0392b;color:#e07070;padding:12px 16px;border-radius:8px;margin-bottom:20px;font-size:0.9rem}
  .success{background:#0e1a0e;border:1px solid #27ae60;color:#70e070;padding:12px 16px;border-radius:8px;margin-bottom:20px;font-size:0.9rem}
`;

function page(title, body) {
  return `<!DOCTYPE html><html lang="en"><head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="robots" content="noindex,nofollow">
  <title>${title} — XeniaTek Admin</title>
  <style>${CSS}</style>
</head><body>
<div class="top-bar">
  <h1>✦ XeniaTek Blog Admin</h1>
  <div style="display:flex;gap:20px;align-items:center">
    <a href="/admin">Dashboard</a>
    <a href="/admin/new">+ New Post</a>
    <a href="/admin/logout">Logout</a>
  </div>
</div>
<div class="wrap">${body}</div>
</body></html>`;
}

function loginPage(err) {
  return `<!DOCTYPE html><html lang="en"><head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="robots" content="noindex,nofollow">
  <title>Admin Login — XeniaTek</title>
  <style>${CSS}
    body{display:flex;align-items:center;justify-content:center}
    .login-box{background:#16153a;border:1px solid #2a2860;border-radius:16px;padding:40px 48px;width:100%;max-width:400px;text-align:center}
    .login-box h1{color:#fff;font-size:1.3rem;margin-bottom:8px}
    .login-box p{color:#7070a0;font-size:0.88rem;margin-bottom:28px}
  </style>
</head><body>
  <div class="login-box">
    <h1>✦ XeniaTek Admin</h1>
    <p>Blog management portal</p>
    ${err ? `<div class="alert">${err}</div>` : ''}
    <form method="POST" action="/admin/login">
      <div class="fg" style="text-align:left">
        <label>Password</label>
        <input type="password" name="password" placeholder="Enter admin password" autofocus required>
      </div>
      <button class="btn btn-primary" type="submit" style="width:100%;margin-top:8px">Log In</button>
    </form>
  </div>
</body></html>`;
}

// ── Blog post HTML generator ───────────────────────────────────────────────────
function generatePost({ title, slug, tag, date, readTime, excerpt, body }) {
  const bodyHtml = formatBody(body);
  const dateDisplay = monthName(date);
  const dateISO = date;
  const url = `${BASE_URL}/blog/${slug}.html`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <meta name="theme-color" content="#100F2E">
  <title>${title} | XeniaTek</title>
  <meta name="description" content="${excerpt.replace(/"/g, '&quot;')}">
  <meta name="robots" content="index, follow">
  <meta property="og:title" content="${title} | XeniaTek">
  <meta property="og:description" content="${excerpt.replace(/"/g, '&quot;')}">
  <meta property="og:type" content="article">
  <meta property="og:url" content="${url}">
  <meta property="og:image" content="${BASE_URL}/images/hero-banner.webp">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:site" content="@xeniatek">
  <meta name="twitter:title" content="${title} | XeniaTek">
  <meta name="twitter:description" content="${excerpt.replace(/"/g, '&quot;')}">
  <meta name="twitter:image" content="${BASE_URL}/images/hero-banner.webp">
  <link rel="icon" type="image/png" href="../images/favicon.png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Kumbh+Sans:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="../css/style.css">
  <link rel="canonical" href="${url}">
  <link rel="sitemap" type="application/xml" title="Sitemap" href="/sitemap.xml">
</head>
<body>
<a href="#main-content" class="skip-nav">Skip to main content</a>

<header class="header-wrap">
  <div class="navbar">
    <a href="../index.html" class="logo">
      <div class="logo-box">
        <img src="../images/logo.webp" alt="XeniaTek Logo" style="height: 70px; width: auto;" fetchpriority="high">
      </div>
      <span class="logo-text">XeniaTek: The X Factor in ServiceNow Help</span>
    </a>
    <nav class="nav-links">
      <a href="../index.html">Home</a>
      <a href="../about.html">About Us</a>
      <a href="../services.html">Services</a>
      <a href="../partners.html">Partners &amp; Clients</a>
      <a href="../jobs.html">Jobs</a>
      <a href="../contact.html" class="btn-contact">Contact Us</a>
    </nav>
    <button class="hamburger" id="hamburger" aria-label="Toggle menu">
      <span></span><span></span><span></span>
    </button>
  </div>
  <div class="mobile-drawer" id="mobileDrawer">
    <a href="../index.html">Home</a>
    <a href="../about.html">About Us</a>
    <a href="../services.html">Services</a>
    <a href="../partners.html">Partners &amp; Clients</a>
    <a href="../jobs.html">Jobs</a>
    <a href="../contact.html" class="btn-contact">Contact Us</a>
  </div>
</header>
<main id="main-content">
<div class="page-banner-wrap">
  <div class="page-banner">
    <div class="page-banner-bg"></div>
    <div class="page-banner-content reveal">
      <h1 class="page-banner-title">${title}</h1>
      <div class="page-breadcrumb">
        <a href="../index.html">Home</a>
        <span class="sep">›</span>
        <a href="../blog.html">Blog</a>
        <span class="sep">›</span>
        <span class="current">${title}</span>
      </div>
    </div>
  </div>
</div>

<article class="blog-article-wrap reveal">
  <div class="blog-article-inner">
    <div class="blog-article-meta" style="margin-bottom:16px">
      <span class="blog-tag">${tag}</span>
      <span class="blog-date" style="margin-left:12px;color:#666;font-size:0.9rem">${dateDisplay} &nbsp;·&nbsp; ${readTime} min read</span>
    </div>
    <div class="blog-article-body">
      ${bodyHtml}
    </div>
  </div>
</article>

<section class="blog-cta-section reveal" style="background:#f4f6ff;padding:48px 24px;text-align:center;margin:48px 0">
  <div style="max-width:600px;margin:0 auto">
    <h3 style="font-size:1.4rem;color:#1D0E82;margin-bottom:12px">Ready to Work with a ServiceNow Expert?</h3>
    <p style="color:#555;margin-bottom:24px">XeniaTek connects Minneapolis enterprises with top ServiceNow talent — fast, specialized, and personal.</p>
    <a href="../contact.html" class="btn-contact" style="background:#1D0E82;color:#fff;padding:13px 32px;border-radius:8px;font-weight:700;text-decoration:none">Talk to Our Team &rarr;</a>
  </div>
</section>

</main>
<footer class="site-footer">
  <div class="footer-inner">
    <div class="footer-brand">
      <div class="footer-logo-box">
        <img src="../images/ushanklogo.webp" alt="Ushank Tech | XeniaTek Logo" style="width: 150px; height: auto;">
      </div>
      <div class="footer-business-line">
        <span class="business-name">Ushank Tech</span> <span class="doing-business">doing business as</span> <span class="business-name">XeniaTek</span>
      </div>
      <p class="footer-tagline">Empowering businesses with innovative technology solutions.</p>
      <div class="footer-social">
        <a href="https://www.linkedin.com/company/xeniatek" target="_blank" rel="noopener noreferrer" aria-label="XeniaTek on LinkedIn" class="footer-social-link">
          <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
        </a>
      </div>
    </div>
    <div class="footer-col">
      <div class="footer-col-title">Quick links</div>
      <div class="footer-links">
        <a href="../about.html">About Us</a>
        <a href="../teams.html">Our Team</a>
        <a href="../services.html">Services</a>
        <a href="../partners.html">Partners &amp; Clients</a>
        <a href="../contact.html">Contact Us</a>
      </div>
    </div>
    <div class="footer-col">
      <div class="footer-col-title">Services</div>
      <div class="footer-links">
        <a href="../services.html">Capacity on Demand</a>
        <a href="../services.html">Flexible Models</a>
        <a href="../services.html">Module &amp; Backlog Execution</a>
        <a href="../services.html">Referrals &amp; Mentoring</a>
      </div>
    </div>
    <div class="footer-col">
      <div class="footer-col-title">Get In Touch</div>
      <div class="footer-contact">
        <div class="footer-contact-item"><span>Phone:</span> +1-952-270-8453</div>
        <div class="footer-contact-item"><span>Email:</span> info@XeniaTek.com</div>
        <div class="footer-contact-item"><span>Address:</span> XeniaTek – Minneapolis, Minnesota</div>
      </div>
    </div>
  </div>
  <div class="footer-bottom">
    <div class="footer-bottom-inner">
      <span class="footer-copy">Copyright &copy; 2026 Xeniatek. All Rights Reserved. | <a href="../privacy.html" style="color: rgba(255,255,255,0.6);">Privacy Policy</a></span>
    </div>
  </div>
</footer>

<button class="scroll-top" id="scrollTop" aria-label="Scroll to top">&#8679;</button>
<script type="application/ld+json">
{"@context":"https://schema.org","@type":"Article","headline":"${title.replace(/"/g, '\\"')}","description":"${excerpt.replace(/"/g, '\\"')}","author":{"@type":"Organization","name":"XeniaTek","url":"${BASE_URL}"},"publisher":{"@type":"Organization","name":"XeniaTek","logo":{"@type":"ImageObject","url":"${BASE_URL}/images/logo.webp"}},"datePublished":"${dateISO}","dateModified":"${dateISO}","mainEntityOfPage":"${url}"}
</script>
<script type="application/ld+json">
{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"Home","item":"${BASE_URL}/"},{"@type":"ListItem","position":2,"name":"Blog","item":"${BASE_URL}/blog.html"},{"@type":"ListItem","position":3,"name":"${title.replace(/"/g, '\\"')}","item":"${url}"}]}
</script>
<script src="../js/main.js"></script>
<div id="exit-popup" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:10000;align-items:center;justify-content:center;">
  <div style="background:#fff;border-radius:20px;padding:48px 40px;max-width:480px;width:90%;text-align:center;position:relative;">
    <button onclick="document.getElementById('exit-popup').style.display='none';localStorage.setItem('exitPopupSeen','1');" style="position:absolute;top:16px;right:20px;background:none;border:none;font-size:1.4rem;cursor:pointer;color:#888;" aria-label="Close">&#x2715;</button>
    <div style="font-size:2.5rem;margin-bottom:12px;">&#x1F4CA;</div>
    <h3 style="font-size:1.4rem;font-weight:700;color:#1D0E82;margin-bottom:10px;">Before you go...</h3>
    <p style="font-size:0.95rem;color:#3a3a4a;line-height:1.65;margin-bottom:24px;">Get the free <strong>2026 ServiceNow Salary Guide</strong> &mdash; salary ranges for 10 roles, from Administrator to CTA.</p>
    <a href="../salary-guide.html" onclick="document.getElementById('exit-popup').style.display='none';localStorage.setItem('exitPopupSeen','1');" style="display:inline-block;background:#77BF00;color:#fff;padding:13px 32px;border-radius:8px;font-weight:700;text-decoration:none;font-size:0.95rem;">Get the Free Guide &rarr;</a>
    <p style="font-size:0.78rem;color:#999;margin-top:14px;">No spam. Unsubscribe anytime.</p>
  </div>
</div>
<script>
(function(){
  if(localStorage.getItem('exitPopupSeen')) return;
  var shown=false;
  document.addEventListener('mouseleave',function(e){
    if(e.clientY<=0&&!shown){shown=true;document.getElementById('exit-popup').style.display='flex';}
  });
})();
</script>
</body>
</html>`;
}

// ── Update blog.html index ─────────────────────────────────────────────────────
function addCardToBlogIndex({ title, slug, tag, date, readTime, excerpt }) {
  if (!fs.existsSync(BLOG_INDEX)) return;
  let html = fs.readFileSync(BLOG_INDEX, 'utf8');
  const card = `
  <!-- Card: ${slug} -->
  <article class="blog-card">
    <div class="blog-card-body">
      <span class="blog-tag">${tag}</span>
      <div class="blog-card-title">${title}</div>
      <p class="blog-card-excerpt">${excerpt}</p>
      <div class="blog-card-meta">${monthName(date)} &nbsp;·&nbsp; ${readTime} min read</div>
      <a href="blog/${slug}.html" class="blog-card-link">Read More &#8594;</a>
    </div>
  </article>
`;
  html = html.replace('<div class="blog-grid">', `<div class="blog-grid">${card}`);
  fs.writeFileSync(BLOG_INDEX, html, 'utf8');
}

// ── Jobs helpers ─────────────────────────────────────────────────────────────
function getJobs() {
  try {
    if (!fs.existsSync(JOBS_FILE)) return [];
    return JSON.parse(fs.readFileSync(JOBS_FILE, 'utf8'));
  } catch { return []; }
}

function saveJobs(jobs) {
  fs.mkdirSync(path.dirname(JOBS_FILE), { recursive: true });
  fs.writeFileSync(JOBS_FILE, JSON.stringify(jobs, null, 2), 'utf8');
  rebuildJobsHtml(jobs);
}

function jobCardHtml(job) {
  return `
    <!-- job:${job.id} -->
    <div class="job-card reveal">
      <div class="job-card-header">
        <div class="job-card-icon">
          <svg viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="4" y="8" width="20" height="14" rx="2" stroke="#7ed321" stroke-width="1.7"/>
            <path d="M10 8V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="#7ed321" stroke-width="1.7"/>
            <path d="M4 14h20" stroke="#7ed321" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
        </div>
        <div>
          <div class="job-card-title">${job.title}</div>
          <div class="job-card-type">${job.type}</div>
        </div>
      </div>
      <p class="job-card-desc">${job.description}</p>
      <a href="${job.applyUrl || 'contact.html'}" class="job-card-apply">Apply Now <i class="fas fa-arrow-right"></i></a>
    </div>`;
}

function rebuildJobsHtml(jobs) {
  if (!fs.existsSync(JOBS_HTML)) return;
  let html = fs.readFileSync(JOBS_HTML, 'utf8');
  const cards = jobs.map(jobCardHtml).join('\n');
  html = html.replace(/(<!-- JOBS_START -->)[\s\S]*?(<!-- JOBS_END -->)/, `$1\n${cards}\n$2`);
  fs.writeFileSync(JOBS_HTML, html, 'utf8');
}

// ── Request handler ───────────────────────────────────────────────────────────
function handleAdmin(req, res) {
  const url = req.url.split('?')[0];
  const query = new URLSearchParams(req.url.includes('?') ? req.url.split('?')[1] : '');

  const send = (code, html, headers = {}) => {
    res.writeHead(code, { 'Content-Type': 'text/html; charset=utf-8', ...headers });
    res.end(html);
  };
  const redirect = (loc, headers = {}) => { res.writeHead(302, { Location: loc, ...headers }); res.end(); };

  // Login
  if (url === '/admin/login' && req.method === 'POST') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      const params = new URLSearchParams(body);
      const pw = params.get('password');
      const expected = process.env.ADMIN_PASSWORD;
      if (!expected) return send(200, loginPage('ADMIN_PASSWORD env var not set on Railway.'));
      if (pw === expected) {
        const token = genToken();
        sessions.set(token, Date.now() + 8 * 60 * 60 * 1000); // 8 hours
        return redirect('/admin', { 'Set-Cookie': `admin_tok=${token}; Path=/; HttpOnly; SameSite=Strict` });
      }
      send(200, loginPage('Incorrect password.'));
    });
    return;
  }

  // Logout
  if (url === '/admin/logout') {
    const token = parseCookies(req.headers.cookie).admin_tok;
    if (token) sessions.delete(token);
    return redirect('/admin');
  }

  // Auth gate
  if (!isAuth(req)) return send(200, loginPage());

  // ── Dashboard ──────────────────────────────────────────────────────────────
  if (url === '/admin' || url === '/admin/') {
    const posts = getPosts();
    const msg = query.get('msg');
    const rows = posts.map(p => `
      <li>
        <div>
          <div class="post-title">${p.title} <span class="tag-chip">${p.tag}</span></div>
          <div class="post-meta">${p.date} &nbsp;·&nbsp; <a href="/blog/${p.slug}.html" target="_blank" style="color:#7B61FF">View</a></div>
        </div>
        <div class="post-actions">
          <a href="/admin/edit?slug=${p.slug}" class="btn btn-secondary" style="font-size:0.8rem;padding:6px 14px">Edit</a>
          <form method="POST" action="/admin/delete" style="display:inline" onsubmit="return confirm('Delete this post?')">
            <input type="hidden" name="slug" value="${p.slug}">
            <button type="submit" class="btn btn-danger">Delete</button>
          </form>
        </div>
      </li>`).join('');

    const jobs = getJobs();
    const jobRows = jobs.map((j, i) => `
      <li>
        <div>
          <div class="post-title">${j.title}</div>
          <div class="post-meta">${j.type}</div>
        </div>
        <div class="post-actions">
          <a href="/admin/jobs/edit?id=${j.id}" class="btn btn-secondary" style="font-size:0.8rem;padding:6px 14px">Edit</a>
          <form method="POST" action="/admin/jobs/delete" style="display:inline" onsubmit="return confirm('Delete this job?')">
            <input type="hidden" name="id" value="${j.id}">
            <button type="submit" class="btn btn-danger">Delete</button>
          </form>
        </div>
      </li>`).join('');

    return send(200, page('Dashboard', `
      ${msg === 'saved' ? '<div class="success">✓ Saved successfully!</div>' : ''}
      ${msg === 'deleted' ? '<div class="success">Deleted.</div>' : ''}
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
          <h2 style="margin:0">Job Postings (${jobs.length})</h2>
          <a href="/admin/jobs/new" class="btn btn-primary">+ New Job</a>
        </div>
        ${jobs.length ? `<ul class="post-list">${jobRows}</ul>` : '<p style="color:#6060a0">No jobs yet.</p>'}
      </div>
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
          <h2 style="margin:0">Blog Posts (${posts.length})</h2>
          <a href="/admin/new" class="btn btn-primary">+ New Post</a>
        </div>
        ${posts.length ? `<ul class="post-list">${rows}</ul>` : '<p style="color:#6060a0">No posts yet.</p>'}
      </div>`));
  }

  // ── New Post form ──────────────────────────────────────────────────────────
  if (url === '/admin/new' && req.method === 'GET') {
    return send(200, page('New Post', postForm({})));
  }

  // ── Edit Post form ─────────────────────────────────────────────────────────
  if (url === '/admin/edit' && req.method === 'GET') {
    const slug = query.get('slug');
    const file = path.join(BLOG_DIR, slug + '.html');
    if (!slug || !fs.existsSync(file)) return redirect('/admin');
    const html = fs.readFileSync(file, 'utf8');

    // Extract fields from existing HTML
    const title = (html.match(/<title>([^|<]+)/) || [])[1]?.trim() || '';
    const excerpt = (html.match(/<meta name="description" content="([^"]+)"/) || [])[1] || '';
    const tag = (html.match(/<span class="blog-tag">([^<]+)/) || [])[1] || '';
    const date = (html.match(/"datePublished":"([^"]+)"/) || [])[1] || '';
    const readTimeMatch = html.match(/(\d+) min read/);
    const readTime = readTimeMatch ? readTimeMatch[1] : '5';
    // Extract body from blog-article-body div
    const bodyMatch = html.match(/<div class="blog-article-body">([\s\S]*?)<\/div>\s*<\/div>\s*<\/article>/);
    const body = bodyMatch ? bodyMatch[1].trim() : '';

    return send(200, page('Edit Post', postForm({ title, slug, tag, date, readTime, excerpt, body, editing: true })));
  }

  // ── Save Post ──────────────────────────────────────────────────────────────
  if (url === '/admin/save' && req.method === 'POST') {
    let raw = '';
    req.on('data', c => raw += c);
    req.on('end', () => {
      const p = new URLSearchParams(raw);
      const title = p.get('title')?.trim() || '';
      const slugInput = p.get('slug')?.trim();
      const slug = slugInput || slugify(title);
      const tag = p.get('tag') || 'Insights';
      const date = p.get('date') || new Date().toISOString().slice(0, 10);
      const readTime = p.get('readTime') || '5';
      const excerpt = p.get('excerpt')?.trim() || '';
      const body = p.get('body')?.trim() || '';
      const isNew = p.get('is_new') === '1';

      if (!title || !body) return redirect('/admin/new?err=1');

      const html = generatePost({ title, slug, tag, date, readTime, excerpt, body });
      fs.mkdirSync(BLOG_DIR, { recursive: true });
      fs.writeFileSync(path.join(BLOG_DIR, slug + '.html'), html, 'utf8');

      if (isNew) addCardToBlogIndex({ title, slug, tag, date, readTime, excerpt });

      redirect('/admin?msg=saved');
    });
    return;
  }

  // ── Delete Post ────────────────────────────────────────────────────────────
  if (url === '/admin/delete' && req.method === 'POST') {
    let raw = '';
    req.on('data', c => raw += c);
    req.on('end', () => {
      const slug = new URLSearchParams(raw).get('slug');
      const file = path.join(BLOG_DIR, slug + '.html');
      if (slug && fs.existsSync(file)) {
        fs.unlinkSync(file);
        // Remove card from blog.html
        if (fs.existsSync(BLOG_INDEX)) {
          let blogHtml = fs.readFileSync(BLOG_INDEX, 'utf8');
          blogHtml = blogHtml.replace(new RegExp(`\\s*<!-- Card: ${slug} -->[\\s\\S]*?</article>`, 'g'), '');
          fs.writeFileSync(BLOG_INDEX, blogHtml, 'utf8');
        }
      }
      redirect('/admin?msg=deleted');
    });
    return;
  }

  // ── Jobs routes ───────────────────────────────────────────────────────────
  if (url === '/admin/jobs/new' && req.method === 'GET') {
    return send(200, page('New Job', jobForm({})));
  }

  if (url === '/admin/jobs/edit' && req.method === 'GET') {
    const id = query.get('id');
    const job = getJobs().find(j => j.id === id);
    if (!job) return redirect('/admin');
    return send(200, page('Edit Job', jobForm({ ...job, editing: true })));
  }

  if (url === '/admin/jobs/save' && req.method === 'POST') {
    let raw = '';
    req.on('data', c => raw += c);
    req.on('end', () => {
      const p = new URLSearchParams(raw);
      const title = p.get('title')?.trim() || '';
      const type = p.get('type')?.trim() || 'Contract';
      const description = p.get('description')?.trim() || '';
      const applyUrl = p.get('applyUrl')?.trim() || 'contact.html';
      const isNew = p.get('is_new') === '1';
      const existingId = p.get('id');
      const id = existingId || slugify(title);

      if (!title || !description) return redirect('/admin/jobs/new');

      const jobs = getJobs();
      const idx = jobs.findIndex(j => j.id === id);
      const job = { id, title, type, description, applyUrl };

      if (idx >= 0) jobs[idx] = job;
      else jobs.push(job);

      saveJobs(jobs);
      redirect('/admin?msg=saved');
    });
    return;
  }

  if (url === '/admin/jobs/delete' && req.method === 'POST') {
    let raw = '';
    req.on('data', c => raw += c);
    req.on('end', () => {
      const id = new URLSearchParams(raw).get('id');
      const jobs = getJobs().filter(j => j.id !== id);
      saveJobs(jobs);
      redirect('/admin?msg=deleted');
    });
    return;
  }

  redirect('/admin');
}

// ── Job form HTML ──────────────────────────────────────────────────────────────
function jobForm({ id = '', title = '', type = 'Contract', description = '', applyUrl = 'contact.html', editing = false }) {
  const types = ['Contract','Full-Time','Contract / Full-Time','Contract / Contract-to-Hire','Part-Time'];
  const typeOpts = types.map(t => `<option value="${t}"${t === type ? ' selected' : ''}>${t}</option>`).join('');
  return `
    <div class="card">
      <h2>${editing ? 'Edit Job Posting' : 'New Job Posting'}</h2>
      <form method="POST" action="/admin/jobs/save">
        <input type="hidden" name="is_new" value="${editing ? '0' : '1'}">
        <input type="hidden" name="id" value="${id}">
        <div class="fg">
          <label>Job Title *</label>
          <input type="text" name="title" value="${title.replace(/"/g, '&quot;')}" placeholder="e.g. ServiceNow ITSM Developer" required>
        </div>
        <div class="fg">
          <label>Employment Type</label>
          <select name="type">${typeOpts}</select>
        </div>
        <div class="fg">
          <label>Description *</label>
          <textarea name="description" rows="5" placeholder="Skills required, certifications, experience level..." required>${description.replace(/</g, '&lt;')}</textarea>
        </div>
        <div class="fg">
          <label>Apply Button URL</label>
          <input type="text" name="applyUrl" value="${applyUrl}" placeholder="contact.html">
          <div class="tip">Use contact.html to send applicants to your contact form, or a full URL for an external ATS.</div>
        </div>
        <div style="display:flex;gap:12px;margin-top:8px">
          <button type="submit" class="btn btn-primary">Save Job</button>
          <a href="/admin" class="btn btn-secondary">Cancel</a>
        </div>
      </form>
    </div>`;
}

// ── Post form HTML ─────────────────────────────────────────────────────────────
function postForm({ title = '', slug = '', tag = '', date = '', readTime = '5', excerpt = '', body = '', editing = false }) {
  const tags = ['Hiring Guide','Platform','Certification','Market Intelligence','Staffing Models','Salary Data','Insights','Case Study'];
  const tagOpts = tags.map(t => `<option value="${t}"${t === tag ? ' selected' : ''}>${t}</option>`).join('');
  const today = new Date().toISOString().slice(0, 10);

  return `
    <div class="card">
      <h2>${editing ? 'Edit Post' : 'New Blog Post'}</h2>
      <form method="POST" action="/admin/save">
        <input type="hidden" name="is_new" value="${editing ? '0' : '1'}">
        <div class="fg">
          <label>Post Title *</label>
          <input type="text" name="title" value="${title.replace(/"/g, '&quot;')}" placeholder="e.g. How to Hire a ServiceNow Developer in 2026" required>
        </div>
        <div class="row">
          <div class="fg">
            <label>URL Slug</label>
            <input type="text" name="slug" value="${slug}" placeholder="auto-generated from title" ${editing ? 'readonly style="opacity:.5"' : ''}>
            <div class="tip">Leave blank to auto-generate from title. Example: servicenow-hiring-guide-2026</div>
          </div>
          <div class="fg">
            <label>Category Tag</label>
            <select name="tag">${tagOpts}</select>
          </div>
        </div>
        <div class="row">
          <div class="fg">
            <label>Publish Date</label>
            <input type="date" name="date" value="${date || today}" required>
          </div>
          <div class="fg">
            <label>Reading Time (minutes)</label>
            <input type="number" name="readTime" value="${readTime}" min="1" max="30">
          </div>
        </div>
        <div class="fg">
          <label>Meta Description / Excerpt *</label>
          <textarea name="excerpt" rows="3" placeholder="1-2 sentence summary shown in search results and on the blog index page..." required>${excerpt.replace(/</g, '&lt;')}</textarea>
          <div class="tip">Keep under 155 characters for best SEO.</div>
        </div>
        <div class="fg">
          <label>Post Body *</label>
          <textarea name="body" rows="20" placeholder="Write your post here. Separate paragraphs with a blank line.&#10;&#10;You can also paste HTML directly if needed." required>${body.replace(/</g, '&lt;')}</textarea>
          <div class="tip">Separate paragraphs with a blank line. HTML is supported.</div>
        </div>
        <div style="display:flex;gap:12px;margin-top:8px">
          <button type="submit" class="btn btn-primary">Publish Post</button>
          <a href="/admin" class="btn btn-secondary">Cancel</a>
        </div>
      </form>
    </div>`;
}

module.exports = handleAdmin;
