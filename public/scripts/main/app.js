// public/js/app.js

// ── Global behavior (runs on every page) ─────────────────────
(function () {
  // Mobile menu toggle
  $('#mobile-menu-button').on('click', function () {
    const expanded = $(this).attr('aria-expanded') === 'true';
    $(this).attr('aria-expanded', !expanded);
    $('#mobile-menu').toggleClass('hidden');
  });

  // Cart count (delegated)
  let cart = parseInt($('#cart-count').text(), 10) || 0;
  $(document).on('click', '.add-to-cart', function () {
    cart++;
    $('#cart-count').text(cart);
    const $btn = $(this);
    const original = $btn.text();
    $btn.text('Added ✓').prop('disabled', true);
    setTimeout(() => $btn.text(original).prop('disabled', false), 1000);
  });

  // Newsletter (demo)
  $('#newsletter-form').on('submit', function (e) {
    e.preventDefault();
    const email = $('#newsletter-email').val().trim();
    if (email) {
      alert('Thank you for subscribing! (Demo)');
      $('#newsletter-email').val('');
    }
  });

  // Smooth scroll for internal anchors
  $('a[href^="#"]').on('click', function (e) {
    const href = this.getAttribute('href');
    if (href === '#') return;               // skip bare "#"
    const target = $(href);
    if (target.length) {
      e.preventDefault();
      $('html, body').animate({ scrollTop: target.offset().top - 80 }, 500);
    }
  });
})();

// ── Notice modal (runs only if the modal is present) ─────────
(function () {
  const modal = document.getElementById('notice-modal');
  if (!modal) return;                       // ✅ safe now — separate IIFE

  const backdrop = document.getElementById('notice-modal-backdrop');
  const dismiss  = document.getElementById('notice-modal-dismiss');

  function open() {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);
    dismiss?.focus();
  }

  function close() {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    document.body.style.overflow = '';
    document.removeEventListener('keydown', onKey);
  }

  function onKey(e) {
    if (e.key === 'Escape') close();
  }

  // Focus trap
  modal.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;
    const focusables = modal.querySelectorAll(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    if (!focusables.length) return;
    const first = focusables[0];
    const last  = focusables[focusables.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });

  backdrop?.addEventListener('click', close);
  dismiss?.addEventListener('click', close);

  // Open on load (with a tiny delay so the page paints first)
  window.requestAnimationFrame(open);
  
})();

console.log('APP')