$(function () {

  // ── Mobile menu toggle ─────────────────────────────────────
  const $menuBtn = $('#mobile-menu-button');
  const $menu    = $('#mobile-menu');

  $menuBtn.on('click', function () {
    const isOpen = $(this).attr('aria-expanded') === 'true';
    $(this).attr('aria-expanded', String(!isOpen));
    $menu.toggleClass('hidden');
  });

  // Auto-close when a link inside the mobile menu is tapped
  $menu.on('click', 'a', function () {
    $menu.addClass('hidden');
    $menuBtn.attr('aria-expanded', 'false');
  });

  // Close on Escape (nice touch for accessibility)
  $(document).on('keydown', function (e) {
    if (e.key === 'Escape' && $menuBtn.attr('aria-expanded') === 'true') {
      $menu.addClass('hidden');
      $menuBtn.attr('aria-expanded', 'false');
    }
  });

  // ── Cart count (delegated) ─────────────────────────────────
  let cart = parseInt($('#cart-count').text(), 10) || 0;

  $(document).on('click', '.add-to-cart', function () {
    cart++;
    $('#cart-count').text(cart);

    const $btn     = $(this);
    const original = $btn.text();
    $btn.text('Added ✓').prop('disabled', true);
    setTimeout(() => $btn.text(original).prop('disabled', false), 1000);
  });

  // ── Newsletter (demo) ──────────────────────────────────────
  $('#newsletter-form').on('submit', function (e) {
    e.preventDefault();
    const email = $('#newsletter-email').val().trim();
    if (email) {
      alert('Thank you for subscribing! (Demo)');
      $('#newsletter-email').val('');
    }
  });

  // ── Smooth scroll for internal anchors ─────────────────────
  $('a[href^="#"]').on('click', function (e) {
    const href = this.getAttribute('href');
    if (href === '#') return;
    const target = $(href);
    if (target.length) {
      e.preventDefault();
      $('html, body').animate({ scrollTop: target.offset().top - 80 }, 500);
    }
  });

});

// ══════════════════════════════════════════════════════════════
//  NOTICE MODAL (only if the modal is in the DOM)
// ══════════════════════════════════════════════════════════════
$(function () {
  const modal = document.getElementById('notice-modal');
  if (!modal) return;

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

  // Open on next paint so the page renders first
  window.requestAnimationFrame(open);
});