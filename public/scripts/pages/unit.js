// public/js/units.js
$(function () {
  const modal = document.getElementById('unit-add-modal');
  if (!modal) return;

  const backdrop = document.getElementById('unit-add-backdrop');
  const closeBtn = document.getElementById('unit-add-close');
  const cancelBtn = document.getElementById('unit-add-cancel');
  const form = document.getElementById('unit-add-form');
  const submitBtn = document.getElementById('unit-add-submit');
  const submitTxt = document.getElementById('unit-add-submit-text');
  const errorBox = document.getElementById('unit-add-error');

  // ── Open / close ─────────────────────────────────────────
  function openUnitModal() {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);
    // Focus first input
    const first = modal.querySelector('input, select, textarea, button');
    first?.focus();
  }

  function closeUnitModal() {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    document.body.style.overflow = '';
    document.removeEventListener('keydown', onKey);
  }

  function onKey(e) {
    if (e.key === 'Escape') closeUnitModal();
  }

  // ── Focus trap ───────────────────────────────────────────
  modal.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;
    const f = modal.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    if (!f.length) return;
    const first = f[0];
    const last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault(); last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault(); first.focus();
    }
  });

  // ── Wire triggers ────────────────────────────────────────
  // Any element with [data-open-unit-modal] opens it
  $(document).on('click', '[data-open-unit-modal]', function (e) {
    const itemId = e.currentTarget.dataset.itemId;
    if (!itemId) return;
    console.log(itemId);
    e.preventDefault();
    openUnitModal();
  });

  backdrop?.addEventListener('click', closeUnitModal);
  closeBtn?.addEventListener('click', closeUnitModal);
  cancelBtn?.addEventListener('click', closeUnitModal);

  // Reopen if the server re-rendered with errors
  if (modal.dataset.reopen === 'true') {
    openUnitModal();
  }

  // ── Client-side validation ───────────────────────────────
  function setError(field, message) {
    const el = modal.querySelector(`[data-error-for="${field}"]`);
    if (el) {
      el.textContent = message;
      el.classList.remove('hidden');
    }
  }

  function clearErrors() {
    modal.querySelectorAll('[data-error-for]').forEach(el => {
      el.textContent = '';
      el.classList.add('hidden');
    });
    if (errorBox) {
      errorBox.classList.add('hidden');
      errorBox.textContent = '';
    }
  }

  function validate() {
    clearErrors();
    let ok = true;

    const imei = form.imei?.value.trim();
    if (imei && !/^\d{15}$/.test(imei)) {
      setError('imei', 'IMEI must be exactly 15 digits.');
      ok = false;
    }

    const mac = form.mac_address?.value.trim().toUpperCase();
    if (mac && !/^([0-9A-F]{2}:){5}[0-9A-F]{2}$/.test(mac)) {
      setError('mac_address', 'Invalid MAC address format.');
      ok = false;
    }

    const metaRaw = form.meta?.value.trim() || '{}';
    try {
      const parsed = JSON.parse(metaRaw);
      if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
        setError('meta', 'Must be a JSON object.');
        ok = false;
      }
    } catch {
      setError('meta', 'Invalid JSON.');
      ok = false;
    }

    const ws = form.warranty_start_date?.value;
    const we = form.warranty_end_date?.value;
    if (ws && we && new Date(we) < new Date(ws)) {
      setError('warranty_end_date', 'End date must be on or after start date.');
      ok = false;
    }

    return ok;
  }

  // Normalize MAC input as user types
  form.mac_address?.addEventListener('input', function () {
    this.value = this.value.toUpperCase();
  });

  // ── Meta (JSONB) — dynamic key/value rows ─────────────────
  const metaRowsEl = document.getElementById('unit-meta-rows');
  const metaEmptyEl = document.getElementById('unit-meta-empty');
  const metaAddBtn = document.getElementById('unit-meta-add');
  const metaHidden = document.getElementById('unit-meta-json');

  function metaRowTemplate(key = '', value = '') {
    return `
    <div class="unit-meta-row flex flex-col gap-2 sm:flex-row sm:items-center">
      <input type="text"
             data-meta-key
             placeholder="Key"
             autocomplete="off"
             value="${escapeAttr(key)}"
             class="h-9 flex-1 rounded-lg border border-gray-200 bg-white px-3 text-sm font-mono text-gray-900 outline-none placeholder:text-gray-400 focus:border-brand focus:ring-2 focus:ring-brand/20">

      <input type="text"
             data-meta-value
             placeholder="Value"
             autocomplete="off"
             value="${escapeAttr(value)}"
             class="h-9 flex-1 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-brand focus:ring-2 focus:ring-brand/20">

      <button type="button"
              data-meta-remove
              aria-label="Remove field"
              class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 transition hover:border-brand hover:bg-brand-light hover:text-brand">
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M6 18 18 6M6 6l12 12"/>
        </svg>
      </button>
    </div>
  `;
  }

  function escapeAttr(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function refreshMetaEmptyState() {
    if (!metaRowsEl || !metaEmptyEl) return;
    const count = metaRowsEl.querySelectorAll('.unit-meta-row').length;
    metaEmptyEl.classList.toggle('hidden', count > 0);
  }

  function addMetaRow(key = '', value = '') {
    if (!metaRowsEl) return;
    metaRowsEl.insertAdjacentHTML('beforeend', metaRowTemplate(key, value));
    refreshMetaEmptyState();
    // Focus the key input of the last row
    const last = metaRowsEl.lastElementChild;
    last?.querySelector('[data-meta-key]')?.focus();
  }

  function serializeMeta() {
    if (!metaRowsEl || !metaHidden) return;
    const obj = {};
    metaRowsEl.querySelectorAll('.unit-meta-row').forEach(row => {
      const k = row.querySelector('[data-meta-key]')?.value.trim();
      const v = row.querySelector('[data-meta-value]')?.value ?? '';
      if (k) obj[k] = v;
    });
    metaHidden.value = JSON.stringify(obj);
  }

  // Add row button
  metaAddBtn?.addEventListener('click', () => addMetaRow());

  // Remove row (event delegation)
  metaRowsEl?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-meta-remove]');
    if (!btn) return;
    btn.closest('.unit-meta-row')?.remove();
    refreshMetaEmptyState();
    serializeMeta();
  });

  // Re-serialize on any keystroke (so the hidden input is always current)
  metaRowsEl?.addEventListener('input', serializeMeta);

  // Before submit, serialize once more (belt and suspenders)
  form.addEventListener('submit', serializeMeta, true); // capture phase: runs before your validator

  // ── Submit ───────────────────────────────────────────────
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!validate()) {
      errorBox.textContent = 'Please fix the errors above and try again.';
      errorBox.classList.remove('hidden');
      return;
    }

    submitBtn.disabled = true;
    submitTxt.textContent = 'Adding…';

    try {
      const res = await fetch(form.action, {
        method: 'POST',
        headers: { 'Accept': 'application/json' },
        body: new FormData(form),
        credentials: 'same-origin',
      });

      if (res.redirected) {
        window.location.href = res.url;
        return;
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.errors) {
          Object.entries(data.errors).forEach(([field, msg]) => setError(field, msg));
        }
        errorBox.textContent = data.message || 'Could not add unit. Please try again.';
        errorBox.classList.remove('hidden');
        return;
      }

      // Success without redirect → reload
      window.location.reload();
    } catch {
      errorBox.textContent = 'Network error. Please check your connection.';
      errorBox.classList.remove('hidden');
    } finally {
      submitBtn.disabled = false;
      submitTxt.textContent = 'Add unit';
    }
  });
});