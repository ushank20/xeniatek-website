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

  /* ── Contact form validation (contact page only) ────── */
  const formSubmit = document.querySelector('.form-submit');
  if (formSubmit) {
    formSubmit.addEventListener('click', function (e) {
      e.preventDefault();
      const inputs = document.querySelectorAll('.form-input');
      let valid = true;

      inputs.forEach(input => {
        if (!input.value.trim()) {
          input.style.borderColor = '#e05252';
          valid = false;
        } else {
          input.style.borderColor = '#7ed321';
        }
      });

      if (valid) {
        this.textContent = 'Submitted ✓';
        this.style.background = '#3cbe2e';
        setTimeout(() => {
          this.textContent = 'Submit';
          this.style.background = '';
          inputs.forEach(i => {
            i.value = '';
            i.style.borderColor = '';
          });
        }, 3000);
      }
    });
  }

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

const contactFormEl = document.getElementById('contactForm');
if (contactFormEl) {
  contactFormEl.addEventListener('submit', async function(e) {
    e.preventDefault();

    // Clear previous errors
    document.querySelectorAll('.error-message').forEach(el => el.style.display = 'none');
    const formMessage = document.getElementById('formMessage');
    formMessage.innerHTML = '';

    // Get form data
    const formData = new FormData(this);

    // Show loading state
    const submitBtn = document.querySelector('.form-submit');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
    submitBtn.disabled = true;

    try {
        const response = await fetch(this.action, {
            method: 'POST',
            body: formData,
            headers: { 'Accept': 'application/json' }
        });

        const result = await response.json();

        if (result.ok) {
            formMessage.innerHTML = `<div style="background: #e9f8cc; color: #100F2E; padding: 15px; border-radius: 8px; border-left: 4px solid #7ed321; margin-bottom: 16px;">
                Message sent successfully! We will be in touch soon.
            </div>`;
            document.getElementById('contactForm').reset();
        } else {
            formMessage.innerHTML = `<div style="background: #fee; color: #c0392b; padding: 15px; border-radius: 8px; border-left: 4px solid #e74c3c; margin-bottom: 16px;">
                Something went wrong. Please try again or email us directly at info@XeniaTek.com
            </div>`;
        }
    } catch (error) {
        formMessage.innerHTML = `<div style="background: #fee; color: #c0392b; padding: 15px; border-radius: 8px; border-left: 4px solid #e74c3c; margin-bottom: 16px;">
            Network error. Please try again.
        </div>`;
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;

        // Scroll to message
        formMessage.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  });
}

// Resume form (jobs page)
const resumeFormEl = document.getElementById('resumeForm');
if (resumeFormEl) {
  resumeFormEl.addEventListener('submit', async function(e) {
    e.preventDefault();
    const formMessage = document.getElementById('resumeFormMessage');
    formMessage.innerHTML = '';
    const formData = new FormData(this);
    const submitBtn = this.querySelector('.form-submit');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = 'Submitting...';
    submitBtn.disabled = true;
    try {
      const response = await fetch(this.action, {
        method: 'POST',
        body: formData,
        headers: { 'Accept': 'application/json' }
      });
      const result = await response.json();
      if (result.ok) {
        formMessage.innerHTML = '<div style="background:#e9f8cc;color:#100F2E;padding:15px;border-radius:8px;border-left:4px solid #7ed321;margin-bottom:16px;">Thank you! We\'ll be in touch soon.</div>';
        resumeFormEl.reset();
      } else {
        formMessage.innerHTML = '<div style="background:#fee;color:#c0392b;padding:15px;border-radius:8px;border-left:4px solid #e74c3c;margin-bottom:16px;">Something went wrong. Please email recruiting@xeniatek.com directly.</div>';
      }
    } catch (err) {
      formMessage.innerHTML = '<div style="background:#fee;color:#c0392b;padding:15px;border-radius:8px;border-left:4px solid #e74c3c;margin-bottom:16px;">Network error. Please try again.</div>';
    } finally {
      submitBtn.innerHTML = originalText;
      submitBtn.disabled = false;
      formMessage.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
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