document.addEventListener('DOMContentLoaded', () => {
  const { storeId } = window.__UNITS__ || {};

  const modal = document.getElementById('searchModal');
  const backdrop = document.getElementById('searchModalBackdrop');
  const openBtn = document.getElementById('openSearchButton');
  const closeBtn = document.getElementById('closeSearchButton');
  const form = document.getElementById('unitSearchForm');
  const input = document.getElementById('unitQuery');
  const results = document.getElementById('unitResults');

  document.addEventListener('click', (e) => {
    
    const card = e.target.closest('[data-unit-id]');
    if (!card) return;

    if (e.target.closest('a')) return;

    const id = card.dataset.unitId;

    window.UnitSheet?.open(id);
  });

  function openModal() {
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    setTimeout(() => input?.focus(), 50);
  }

  function closeModal() {
    modal.classList.add('hidden');
    document.body.style.overflow = '';
  }

  openBtn?.addEventListener('click', openModal);
  backdrop?.addEventListener('click', closeModal);
  closeBtn?.addEventListener('click', closeModal);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
      closeModal();
    }
  });

  // ─── Barcode scanner support ──────────────────────────────
  input?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      form.requestSubmit();
    }
  });

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData(form);
    const q = (formData.get('q') || '').toString().trim();
    const status = (formData.get('status') || '').toString();

    if (!q) {
      results.innerHTML = emptyState('Ready to search', 'Type or scan an identifier.');
      return;
    }

    results.innerHTML = loadingState();

    try {
      const params = new URLSearchParams({ q });
      if (status) params.append('status', status);

      const res = await axios.get(`/inventories/${__UNITS__.inventoryId}/${__UNITS__.storeId}/units/search`, {
        params: { q, ...(!!status && { status }) },
        withCredentials: true,
      });

      const data = res.data.result;

      renderResults(data || []);
    } catch (err) {
      console.error('[units-search] failed:', err);
      results.innerHTML = errorState(err.response?.data?.message || 'Internal Server Error');
      document.getElementById('retrySearchBtn')?.addEventListener('click', () => form.requestSubmit());
    }

    window.lucide?.createIcons();
  });


  function renderResults(items) {
    if (!items.length) {
      results.innerHTML = emptyState('No units found', 'Try a different serial, IMEI, or barcode.');
      return;
    }

    window.__lastUnitResults__ = items;

    results.innerHTML = `
      <div class="mb-2 text-xs text-slate-500">
        Found <span class="font-semibold text-slate-700">${items.length}</span>
        result${items.length === 1 ? '' : 's'}
      </div>
      <div class="space-y-2">
        ${items.map(renderUnitCard).join('')}
      </div>`;

    window.lucide?.createIcons();
  }

  function renderUnitCard(u) {
    const tone = {
      available: 'bg-emerald-50 text-emerald-700',
      reserved: 'bg-amber-50 text-amber-700',
      sold: 'bg-slate-100 text-slate-600',
      damaged: 'bg-rose-50 text-rose-700',
      returned: 'bg-orange-50 text-orange-700',
    }[u.status] || 'bg-slate-100 text-slate-600';

    const ids = [
      u.serial_number && `<span>SN: <span class="font-mono">${escapeHtml(u.serial_number)}</span></span>`,
      u.imei && `<span>IMEI: <span class="font-mono">${escapeHtml(u.imei)}</span></span>`,
      u.barcode && `<span>BC: <span class="font-mono">${escapeHtml(u.barcode)}</span></span>`,
    ].filter(Boolean).join('');

    return `
      <div class="rounded-lg border border-slate-200 bg-white p-3 hover:border-slate-300 transition">
        <div class="flex items-start justify-between gap-3">
          <div class="flex items-start gap-3 min-w-0">
            ${u.listing_image
        ? `<img src="https:cdn.cococe.rw/${escapeHtml(u.listing_image)}" class="h-10 w-10 rounded object-cover ring-1 ring-slate-200" data-fallback-hide="true" />`
        : `<div class="flex h-10 w-10 items-center justify-center rounded bg-slate-100"><i data-lucide="package" class="h-4 w-4 text-slate-400"></i></div>`}
            <div class="min-w-0">
              <div class="text-sm font-semibold text-slate-900 truncate">${escapeHtml(u.listing_title || '—')}</div>
              <div class="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-500">${ids || '<em>No identifiers</em>'}</div>
            </div>
          </div>
          <span class="rounded-full px-2 py-0.5 capitalize text-[10px] font-semibold shrink-0 ${tone}">${escapeHtml(u.status)}</span>
        </div>
        <div class="mt-2 flex items-center gap-3 border-t border-slate-100 pt-2 text-[11px] text-slate-500">
          <span class="inline-flex items-center gap-1">
            <i data-lucide="warehouse" class="h-3 w-3"></i>
            ${escapeHtml(u.inventory_title || u.location_title || '—')}
          </span>
          <span class="inline-flex items-center gap-1">
            <i data-lucide="calendar" class="h-3 w-3"></i>
            ${u.received_at ? new Date(u.received_at).toLocaleDateString() : '—'}
          </span>
          <button data-unit-id="${u.id}" class="ml-auto text-white bg-brand rounded px-2 py-2 flex items-center justify-center gap-1">
            <i data-lucide="settings-2"></i>
          </button>
        </div>
      </div>`;
  }

  function loadingState() {
    return `
      <div class="py-10 text-center">
        <div class="inline-flex flex-col items-center gap-2">
          <div class="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-[var(--color-brand)]"></div>
          <p class="text-sm text-slate-500">Searching…</p>
        </div>
      </div>`;
  }

  function emptyState(title, hint) {
    return `
      <div class="py-10 text-center">
        <div class="inline-flex flex-col items-center gap-2">
          <div class="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
            <i data-lucide="search-x" class="h-6 w-6 text-slate-400"></i>
          </div>
          <p class="text-sm font-medium text-slate-700">${escapeHtml(title)}</p>
          <p class="text-xs text-slate-500">${escapeHtml(hint)}</p>
        </div>
      </div>`;
  }

  function errorState(msg) {
    return `
      <div class="py-10 text-center">
        <div class="inline-flex flex-col items-center gap-2">
          <div class="flex h-12 w-12 items-center justify-center rounded-full bg-rose-50">
            <i data-lucide="alert-circle" class="h-8 w-8 text-rose-700"></i>
          </div>
          <p class="text-sm font-medium text-rose-700">${msg || 'Search failed'}</p>
          <button type="button" id="retrySearchBtn"
                  class="mt-2 rounded-lg bg-rose-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-rose-700">
            Retry
          </button>
        </div>
      </div>`;
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str ?? '';
    return div.innerHTML;
  }

  window.lucide?.createIcons();
});