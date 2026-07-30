/* ============================================================
   XeniaTek — Global JavaScript
   Covers: Hamburger menu, Scroll-to-top, Contact form
   ============================================================ */

document.addEventListener('DOMContentLoaded', function () {

  /* ── Hamburger / Mobile drawer ─────────────────────── */
  const hamburger = document.getElementById('hamburger');
  const drawer    = document.getElementById('mobileDrawer');

  if (hamburger && drawer) {
    hamburger.addEventListener('click', () => {
      hamburger.classList.toggle('open');
      drawer.classList.toggle('open');
    });

    drawer.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        hamburger.classList.remove('open');
        drawer.classList.remove('open');
      });
    });
  }

  /* ── Scroll to top ──────────────────────────────────── */
  const scrollBtn = document.getElementById('scrollTop');
  if (scrollBtn) {
    scrollBtn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* ── Contact form: handled by async submit handler below ── */

});

// Number counting animation
document.addEventListener('DOMContentLoaded', function () {

  const statNumbers = document.querySelectorAll('.stat-number');

  // Animate function
  function animateNumber(element, start, end, duration) {
    let startTimestamp = null;

    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;

      const progress = Math.min((timestamp - startTimestamp) / duration, 1);

      let currentValue = progress * (end - start) + start;

      const originalText = element.dataset.original || element.textContent;
      element.dataset.original = originalText;

      // Handle formats
      if (originalText.includes('+')) {
        element.textContent = Math.floor(currentValue) + '+';

      } else if (originalText.includes('%')) {
        element.textContent = Math.floor(currentValue) + '%';

      } else {
        // ✅ Decimal support
        if (end % 1 !== 0) {
          element.textContent = currentValue.toFixed(2);
        } else {
          element.textContent = Math.floor(currentValue);
        }
      }

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        // Final exact value
        if (originalText.includes('+')) {
          element.textContent = end + '+';

        } else if (originalText.includes('%')) {
          element.textContent = end + '%';

        } else {
          element.textContent = (end % 1 !== 0) ? end.toFixed(2) : end;
        }
      }
    };

    requestAnimationFrame(step);
  }

  // Observer (trigger on scroll)
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {

      if (entry.isIntersecting) {

        const numbers = entry.target.querySelectorAll('.stat-number');

        numbers.forEach(number => {
          const text = number.textContent;

          // ✅ FIX: support decimal
          let endValue = parseFloat(number.getAttribute("data-target")) ||
                         parseFloat(text.replace(/[^0-9.]/g, ''));

          animateNumber(number, 0, endValue, 2000);
        });

        observer.unobserve(entry.target);
      }

    });
  }, { threshold: 0.5 });

  // Start observing
  const statsRow = document.querySelector('.stats-row');
  if (statsRow) {
    observer.observe(statsRow);
  }

});

/* ── Scroll reveal ── */
const revealElements = document.querySelectorAll('.reveal');

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target); /* animate once only */
    }
  });
}, { threshold: 0.15 });

revealElements.forEach(el => observer.observe(el));

// Build a mailto: link from all form fields
function buildMailto(formEl, toEmail) {
  const data = new FormData(formEl);
  const subject = data.get('_subject') || 'XeniaTek Form Submission';
  const lines = [];
  data.forEach((val, key) => {
    if (!key.startsWith('_') && val) lines.push(key + ': ' + val);
  });
  return 'mailto:' + toEmail
    + '?subject=' + encodeURIComponent(subject)
    + '&body=' + encodeURIComponent(lines.join('\n'));
}

// Show inline success and open email client
function handleFormSubmit(formEl, msgEl, successText) {
  const mailto = buildMailto(formEl, 'info@xeniatek.com');
  window.location.href = mailto;
  msgEl.innerHTML = '<div style="background:#e9f8cc;color:#100F2E;padding:15px;border-radius:8px;border-left:4px solid #7ed321;margin-bottom:16px;">' + successText + '</div>';
  formEl.reset();
  msgEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Contact form
const contactFormEl = document.getElementById('contactForm');
if (contactFormEl) {
  contactFormEl.addEventListener('submit', function(e) {
    e.preventDefault();
    document.querySelectorAll('.error-message').forEach(el => el.style.display = 'none');
    const msgEl = document.getElementById('formMessage');
    handleFormSubmit(this, msgEl, 'Message received! Your email client should open to send your message — or email us directly at info@xeniatek.com.');
  });
}

// Resume form (jobs page)
const resumeFormEl = document.getElementById('resumeForm');
if (resumeFormEl) {
  resumeFormEl.addEventListener('submit', function(e) {
    e.preventDefault();
    const msgEl = document.getElementById('resumeFormMessage');
    handleFormSubmit(this, msgEl, "Thank you! Your email client should open to complete your submission — or email info@xeniatek.com directly.");
  });
}

// Submit resume page form
const submitResumeFormEl = document.getElementById('submitResumeForm');
if (submitResumeFormEl) {
  const msgEl = document.createElement('div');
  msgEl.id = 'submitResumeMessage';
  submitResumeFormEl.prepend(msgEl);
  submitResumeFormEl.addEventListener('submit', function(e) {
    e.preventDefault();
    handleFormSubmit(this, msgEl, "Thank you! Your email client should open to complete your submission — or email info@xeniatek.com directly.");
  });
}

// Newsletter form (blog page)
const newsletterFormEl = document.getElementById('newsletterForm');
if (newsletterFormEl) {
  const msgEl = document.createElement('div');
  msgEl.id = 'newsletterMessage';
  newsletterFormEl.after(msgEl);
  newsletterFormEl.addEventListener('submit', function(e) {
    e.preventDefault();
    handleFormSubmit(this, msgEl, "Thanks for subscribing! Your email client should open — or email info@xeniatek.com to join our list.");
  });
}

// Hiring form (hire-servicenow-talent page)
const hiringFormEl = document.getElementById('hiringForm');
if (hiringFormEl) {
  const hiringMsgEl = document.createElement('div');
  hiringMsgEl.id = 'hiringFormMsg';
  hiringFormEl.prepend(hiringMsgEl);
  hiringFormEl.addEventListener('submit', function(e) {
    e.preventDefault();
    handleFormSubmit(this, hiringMsgEl, "Thank you! Your email client should open to complete your request — or email info@xeniatek.com directly.");
  });
}

// Cookie consent
(function() {
  if (!localStorage.getItem('cookieConsent')) {
    const banner = document.createElement('div');
    banner.id = 'cookie-banner';
    banner.innerHTML = '<p>We use cookies to improve your experience. By continuing to use this site you agree to our use of cookies. <a href="privacy.html">Learn more</a></p><button id="cookie-accept">Accept</button>';
    document.body.appendChild(banner);
    document.getElementById('cookie-accept').addEventListener('click', function() {
      localStorage.setItem('cookieConsent', '1');
      banner.remove();
    });
  }
})();

// Announcement bar - persist dismissal across pages
(function() {
  if (localStorage.getItem('announcementDismissed')) {
    var bar = document.getElementById('announcementBar');
    if (bar) bar.style.display = 'none';
  }
  var closeBtn = document.querySelector('.announcement-bar-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', function() {
      localStorage.setItem('announcementDismissed', '1');
    });
  }
})();