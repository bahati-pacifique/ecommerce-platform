// public/scripts/pages/listings/new.js

document.addEventListener('DOMContentLoaded', () => {
  const cfg = window.__LISTING__ || {};
  const { storeId, currency = 'RWF', currencyId, cdnBase = '' } = cfg;

  if (!storeId) {
    console.error('[new listing] storeId missing');
    return;
  }

  // ═══════════════════════════════════════════════════════════
  // CONSTANTS
  // ═══════════════════════════════════════════════════════════
  const MAX_IMAGES_PER_VARIANT = 8;
  const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
  const MAX_VIDEO_SECONDS = 60;
  const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

  // ═══════════════════════════════════════════════════════════
  // TEMPORAL ID GENERATOR
  // ═══════════════════════════════════════════════════════════
  const _idState = { lastMs: 0, counter: 0 };

  function generateId(prefix = 'tmp') {
    const now = Date.now();
    if (now === _idState.lastMs) {
      _idState.counter++;
    } else {
      _idState.lastMs = now;
      _idState.counter = 1;
    }
    const rnd = Math.floor(Math.random() * 0xffff).toString(36).padStart(3, '0');
    return `${prefix}-${now.toString(36)}-${_idState.counter}-${rnd}`;
  }

  // ═══════════════════════════════════════════════════════════
  // STATE
  // ═══════════════════════════════════════════════════════════
  const state = {
    tab: 'welcome',
    product: null,
    catalogVariants: [],
    details: {
      title: '',
      description: '',
      condition: 'new',
      status: 'active',
      meta: {},
      video: null,           // { file, previewUrl, duration }
    },
    variants: [],            // [{ tempId, catalogVariantId, catalogVariant, sku, price, salePrice, images: [{ id, file, previewUrl, isPrimary }] }]
    submitting: false,
  };

  // ═══════════════════════════════════════════════════════════
  // ELEMENT REFS
  // ═══════════════════════════════════════════════════════════
  const form = document.getElementById('createListingForm');
  const errorBox = document.getElementById('formError');
  const submitBtn = document.getElementById('submitBtn');
  const prevBtn = document.getElementById('prevTabBtn');
  const nextBtn = document.getElementById('nextTabBtn');

  const tabButtons = Array.from(document.querySelectorAll('#tabs .tab-button'));
  const tabPanels = Array.from(document.querySelectorAll('[data-panel]'));

  const termsCheckbox = document.getElementById('acceptTerms');

  // Product
  const productIdInput = document.getElementById('productId');
  const productSearchPanel = document.getElementById('productSearchPanel');
  const productSearchInput = document.getElementById('productSearchInput');
  const productSearchClear = document.getElementById('productSearchClear');
  const productResults = document.getElementById('productResults');
  const selectedProduct = document.getElementById('selectedProduct');
  const selectedProductImg = document.getElementById('selectedProductImg');
  const selectedProductName = document.getElementById('selectedProductName');
  const selectedProductMeta = document.getElementById('selectedProductMeta');
  const clearProductBtn = document.getElementById('clearProductBtn');

  // Details
  const titleInput = document.getElementById('titleInput');
  const descriptionInput = document.getElementById('descriptionInput');
  const conditionInput = document.getElementById('conditionInput');
  const statusInput = document.getElementById('statusInput');

  // Listing video
  const addListingVideoBtn = document.getElementById('addListingVideoBtn');
  const listingVideoInput = document.getElementById('listingVideoInput');
  const listingVideoPreview = document.getElementById('listingVideoPreview');
  const listingVideoElement = document.getElementById('listingVideoElement');
  const listingVideoName = document.getElementById('listingVideoName');
  const listingVideoMeta = document.getElementById('listingVideoMeta');
  const listingVideoEmpty = document.getElementById('listingVideoEmpty');
  const removeListingVideoBtn = document.getElementById('removeListingVideoBtn');

  // Variants
  const variantsList = document.getElementById('variantsList');
  const variantsEmpty = document.getElementById('variantsEmpty');
  const addVariantBtn = document.getElementById('addVariantBtn');
  const tabVariantCount = document.getElementById('tabVariantCount');

  // Review
  const reviewSummary = document.getElementById('reviewSummary');

  // ═══════════════════════════════════════════════════════════
  // TABS
  // ═══════════════════════════════════════════════════════════
  const TAB_ORDER = ['welcome', 'product', 'details', 'variants', 'review'];

  function setTab(name) {
    state.tab = name;

    tabButtons.forEach(btn => {
      const isActive = btn.dataset.tab === name;
      const isEnabled = !btn.disabled;

      btn.classList.toggle('border-[var(--color-brand)]', isActive);
      btn.classList.toggle('text-[var(--color-brand)]', isActive);
      btn.classList.toggle('border-transparent', !isActive);
      btn.classList.toggle('text-slate-500', !isActive && isEnabled);
      btn.classList.toggle('text-slate-300', !isActive && !isEnabled);
      btn.classList.toggle('cursor-not-allowed', !isEnabled);
    });

    tabPanels.forEach(panel => {
      panel.hidden = panel.dataset.panel !== name;
    });

    updateFooter();
  }

  function enableTab(name) {
    const btn = tabButtons.find(b => b.dataset.tab === name);
    if (!btn || !btn.disabled) return;
    btn.disabled = false;
    btn.classList.remove('text-slate-300', 'cursor-not-allowed');
    btn.classList.add('text-slate-500');
    updateFooter();
  }

  function disableTab(name) {
    const btn = tabButtons.find(b => b.dataset.tab === name);
    if (!btn) return;
    btn.disabled = true;
    btn.classList.remove('text-slate-500');
    btn.classList.add('text-slate-300', 'cursor-not-allowed');
    updateFooter();
  }

  function updateFooter() {
    const currentIdx = TAB_ORDER.indexOf(state.tab);
    const lastEnabledIdx = tabButtons.reduce((last, btn, idx) => !btn.disabled ? idx : last, 0);

    prevBtn.classList.toggle('hidden', currentIdx === 0);
    nextBtn.classList.toggle('hidden', currentIdx >= lastEnabledIdx);
    submitBtn.classList.toggle('hidden', currentIdx !== lastEnabledIdx);

    if (currentIdx === lastEnabledIdx) validateSubmit();
    if (state.tab === 'review') renderReview();
  }

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.disabled) return;
      setTab(btn.dataset.tab);
    });
  });

  prevBtn.addEventListener('click', () => {
    const idx = TAB_ORDER.indexOf(state.tab);
    for (let i = idx - 1; i >= 0; i--) {
      const btn = tabButtons.find(b => b.dataset.tab === TAB_ORDER[i]);
      if (btn && !btn.disabled) { setTab(TAB_ORDER[i]); return; }
    }
  });

  nextBtn.addEventListener('click', () => {
    const idx = TAB_ORDER.indexOf(state.tab);
    for (let i = idx + 1; i < TAB_ORDER.length; i++) {
      const btn = tabButtons.find(b => b.dataset.tab === TAB_ORDER[i]);
      if (btn && !btn.disabled) { setTab(TAB_ORDER[i]); return; }
    }
  });

  // ═══════════════════════════════════════════════════════════
  // TERMS
  // ═══════════════════════════════════════════════════════════
  termsCheckbox.addEventListener('change', () => {
    if (termsCheckbox.checked) {
      enableTab('product');
    } else {
      disableTab('product');
      disableTab('details');
      disableTab('variants');
      disableTab('review');
    }
    validateSubmit();
  });

  // ═══════════════════════════════════════════════════════════
  // PRODUCT SEARCH
  // ═══════════════════════════════════════════════════════════
  let searchTimer;
  let searchAbort;

  productSearchInput.addEventListener('input', (e) => {
    const q = e.target.value.trim();
    productSearchClear.classList.toggle('hidden', q.length === 0);
    clearTimeout(searchTimer);

    if (q.length < 2) {
      productResults.classList.add('hidden');
      productResults.innerHTML = '';
      return;
    }

    searchTimer = setTimeout(() => searchProducts(q), 250);
  });


  // ═══════════════════════════════════════════════════════════
  // IMAGE SEARCH
  // ═══════════════════════════════════════════════════════════
  const imageSearchButton = document.getElementById('imageSearchButton');
  const imageSearchInput = document.getElementById('imageSearchInput');
  const imageSearchPreview = document.getElementById('imageSearchPreview');
  const imageSearchThumb = document.getElementById('imageSearchThumb');
  const imageSearchStatus = document.getElementById('imageSearchStatus');
  const imageSearchClear = document.getElementById('imageSearchClear');

  let imageSearchObjectUrl = null;

  imageSearchButton?.addEventListener('click', () => imageSearchInput.click());

  imageSearchInput?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    imageSearchInput.value = '';

    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file (JPEG, PNG, or WebP).');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert('Image is too large. Maximum is 10 MB.');
      return;
    }

    if (imageSearchObjectUrl) URL.revokeObjectURL(imageSearchObjectUrl);
    imageSearchObjectUrl = URL.createObjectURL(file);
    imageSearchThumb.src = imageSearchObjectUrl;
    imageSearchStatus.textContent = 'Analyzing image…';
    imageSearchPreview.classList.remove('hidden');

    productSearchInput.value = '';
    productSearchClear?.classList.add('hidden');

    await performImageSearch(file);
  });

  imageSearchClear?.addEventListener('click', () => {
    if (imageSearchObjectUrl) {
      URL.revokeObjectURL(imageSearchObjectUrl);
      imageSearchObjectUrl = null;
    }
    imageSearchPreview.classList.add('hidden');
    productResults.innerHTML = '';
    productResults.classList.add('hidden');
    productSearchInput.focus();
  });

  async function performImageSearch(file) {
    productResults.innerHTML = `
    <div class="p-8 text-center">
      <div class="inline-flex flex-col items-center gap-3">
        <div class="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-[var(--color-brand)]"></div>
        <div>
          <p class="text-sm font-medium text-slate-700">Finding similar products</p>
          <p class="mt-0.5 text-xs text-slate-500">This may take a few seconds</p>
        </div>
      </div>
    </div>`;
    productResults.classList.remove('hidden');

    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('limit', '100');

      const res = await axios.post('/products/catalog/s', formData, {
        withCredentials: true,
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const items = res.data?.data || [];

      imageSearchStatus.textContent = items.length
        ? `${items.length} similar product${items.length === 1 ? '' : 's'} found`
        : 'No similar products found';

      if (!items.length) {
        productResults.innerHTML = `
        <div class="p-8 text-center">
          <div class="inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
            <i data-lucide="image-off" class="h-5 w-5 text-slate-400"></i>
          </div>
          <p class="mt-3 text-sm font-medium text-slate-700">No similar products found</p>
          <p class="mt-1 text-xs text-slate-500">Try a different image or search by text.</p>
        </div>`;
        window.lucide?.createIcons();
        return;
      }

      renderProductResults(items, '', true);
    } catch (err) {
      console.error('[image search] failed:', err);
      imageSearchStatus.textContent = 'Search failed';
      productResults.innerHTML = `
      <div class="p-6 text-center">
        <i data-lucide="alert-circle" class="mx-auto h-6 w-6 text-rose-400"></i>
        <p class="mt-2 text-sm font-medium text-rose-700">Image search failed</p>
        <p class="mt-1 text-xs text-slate-500">${escapeHtml(err.response?.data?.error || err.message)}</p>
      </div>`;
      window.lucide?.createIcons();
    }
  }

  productSearchClear.addEventListener('click', () => {
    productSearchInput.value = '';
    productSearchInput.focus();
    productSearchClear.classList.add('hidden');
    productResults.innerHTML = '';
    productResults.classList.add('hidden');
  });

  async function searchProducts(query) {
    if (searchAbort) searchAbort.abort();
    searchAbort = new AbortController();

    productResults.innerHTML = `
      <div class="p-6 text-center">
        <div class="inline-flex items-center gap-2 text-xs text-slate-400">
          <div class="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-200 border-t-[var(--color-brand)]"></div>
          Searching…
        </div>
      </div>`;
    productResults.classList.remove('hidden');

    try {
      const res = await axios.get('/products/catalog/s', {
        params: { key: query, limit: 12 },
        withCredentials: true,
        signal: searchAbort.signal,
      });
      const items = res.data?.data || [];
      renderProductResults(items, query);
    } catch (err) {
      if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') return;
      console.error('[search] failed:', err);
      productResults.innerHTML = `
        <div class="p-6 text-center">
          <i data-lucide="alert-circle" class="mx-auto h-6 w-6 text-rose-400"></i>
          <p class="mt-2 text-sm font-medium text-rose-700">Search failed</p>
          <button type="button" id="retrySearchBtn"
                  class="mt-3 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium hover:bg-slate-50">
            Retry
          </button>
        </div>`;
      window.lucide?.createIcons();
      document.getElementById('retrySearchBtn')?.addEventListener('click', () => searchProducts(query));
    }
  }

  function renderProductResults(items, query = '', withSimilarity = false) {
    if (!items.length) {
      productResults.innerHTML = `
      <div class="p-8 text-center">
        <div class="inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
          <i data-lucide="search-x" class="h-5 w-5 text-slate-400"></i>
        </div>
        <p class="mt-3 text-sm font-medium text-slate-700">No products found</p>
        ${query ? `<p class="mt-1 text-xs text-slate-500">No matches for "${escapeHtml(query)}"</p>` : ''}
      </div>`;
      window.lucide?.createIcons();
      return;
    }

    productResults.innerHTML = items.map(p => {
      // ← similarity badge (image search only)
      const similarityPct = withSimilarity && p.similarity
        ? Math.round(p.similarity * 100)
        : null;

      const imgSrc = p.primary_image ? `${cdnBase}/${p.primary_image}` : '';
      const img = imgSrc
        ? `<img src="${escapeHtml(imgSrc)}" alt="" class="h-12 w-12 shrink-0 rounded-lg object-cover ring-1 ring-slate-200 bg-slate-50" />`
        : `<div class="h-12 w-12 shrink-0 flex items-center justify-center rounded-lg bg-slate-100">
           <i data-lucide="package" class="h-5 w-5 text-slate-400"></i>
         </div>`;

      const meta = [p.brand_title, p.category_title].filter(Boolean);

      return `
      <button type="button"
              class="product-option w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 transition text-left border-b border-slate-100 last:border-0"
              data-id="${escapeHtml(p.id)}"
              data-title="${escapeHtml(p.title)}"
              data-brand="${escapeHtml(p.brand_title || '')}"
              data-category="${escapeHtml(p.category_title || '')}"
              data-image="${escapeHtml(p.primary_image || '')}">
        ${img}
        <div class="min-w-0 flex-1">
          <div class="truncate text-sm font-medium text-slate-900">${escapeHtml(p.title)}</div>
          <div class="mt-0.5 text-xs text-slate-500">
            ${meta.length ? meta.map(escapeHtml).join(' · ') : 'Catalog product'}
          </div>
          ${similarityPct !== null ? `
            <div class="mt-1 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
              <i data-lucide="sparkles" class="h-2.5 w-2.5"></i>
              ${similarityPct}% match
            </div>
          ` : ''}
        </div>
        <i data-lucide="chevron-right" class="h-4 w-4 shrink-0 text-slate-300"></i>
      </button>
    `;
    }).join('');

    window.lucide?.createIcons();

    productResults.querySelectorAll('.product-option').forEach(btn => {
      btn.addEventListener('click', () => {
        // ← clear image search state on selection
        if (imageSearchObjectUrl) {
          URL.revokeObjectURL(imageSearchObjectUrl);
          imageSearchObjectUrl = null;
        }
        imageSearchPreview?.classList.add('hidden');

        selectProduct({
          id: btn.dataset.id,
          title: btn.dataset.title,
          brand: btn.dataset.brand,
          category: btn.dataset.category,
          primary_image: btn.dataset.image,
        });
      });
    });
  }

  async function selectProduct(product) {
    state.product = product;
    productIdInput.value = product.id;

    selectedProductName.textContent = product.title;
    titleInput.value = product.title;
    selectedProductMeta.textContent = [product.brand, product.category].filter(Boolean).join(' · ') || 'Catalog product';

    if (product.primary_image) {
      selectedProductImg.src = `${cdnBase}/${product.primary_image}`;
      selectedProductImg.classList.remove('hidden');
    } else {
      selectedProductImg.classList.add('hidden');
    }

    selectedProduct.classList.remove('hidden');
    productSearchPanel.classList.add('hidden');
    productResults.classList.add('hidden');

    if (!titleInput.value.trim()) {
      titleInput.value = product.title;
      state.details.title = product.title;
    }

    await loadCatalogVariants(product.id);

    enableTab('details');
    enableTab('variants');
    enableTab('review');

    setTab('details');
    validateSubmit();
  }

  async function loadCatalogVariants(productId) {
    try {
      const res = await axios.get(`/products/${productId}/variants`, { withCredentials: true });
      state.catalogVariants = res.data?.data || res.data || [];
      console.log('[catalog variants] loaded:', state.catalogVariants.length);
    } catch (err) {
      console.error('[catalog variants] failed:', err);
      state.catalogVariants = [];
    }
  }

  clearProductBtn.addEventListener('click', () => {
    // Clean up all variant images
    state.variants.forEach(v => {
      v.images.forEach(img => URL.revokeObjectURL(img.previewUrl));
    });

    // Clean up listing video
    if (state.details.video?.previewUrl) {
      URL.revokeObjectURL(state.details.video.previewUrl);
    }
    state.details.video = null;

    // Reset video UI
    if (listingVideoPreview) listingVideoPreview.classList.add('hidden');
    if (listingVideoEmpty) listingVideoEmpty.classList.remove('hidden');
    if (addListingVideoBtn) addListingVideoBtn.classList.remove('hidden');
    if (listingVideoElement) { listingVideoElement.pause(); listingVideoElement.src = ''; }

    state.product = null;
    state.catalogVariants = [];
    state.variants = [];
    productIdInput.value = '';
    selectedProduct.classList.add('hidden');
    productSearchPanel.classList.remove('hidden');
    productSearchInput.value = '';
    productSearchClear?.classList.add('hidden');
    productResults.innerHTML = '';
    productResults.classList.add('hidden');

    renderVariants();
    setTab('product');
    validateSubmit();
  });

  // ═══════════════════════════════════════════════════════════
  // DETAILS — live sync to state
  // ═══════════════════════════════════════════════════════════
  titleInput.addEventListener('input', (e) => {
    state.details.title = e.target.value;
    validateSubmit();
  });
  descriptionInput.addEventListener('input', (e) => {
    state.details.description = e.target.value;
  });
  conditionInput.addEventListener('change', (e) => {
    state.details.condition = e.target.value;
  });
  statusInput.addEventListener('change', (e) => {
    state.details.status = e.target.value;
  });

  // ═══════════════════════════════════════════════════════════
  // CUSTOM PARAMETERS (meta)
  // ═══════════════════════════════════════════════════════════
  const metaList = document.getElementById('metaList');
  const addMetaBtn = document.getElementById('addMetaBtn');

  // Track rows by ID so we can update/remove them reliably
  let metaRows = [];   // [{ id, key, value }]

  addMetaBtn.addEventListener('click', () => addMetaRow());

  function addMetaRow(key = '', value = '') {
    const id = generateId('meta');
    metaRows.push({ id, key, value });
    renderMetaRows();

    // Focus the key input
    setTimeout(() => {
      const row = metaList.querySelector(`[data-meta-id="${id}"]`);
      row?.querySelector('[data-meta-key]')?.focus();
    }, 50);
  }

  function removeMetaRow(id) {
    metaRows = metaRows.filter(r => r.id !== id);
    renderMetaRows();
    syncMetaToState();
  }

  function updateMetaRow(id, patch) {
    const row = metaRows.find(r => r.id === id);
    if (!row) return;
    Object.assign(row, patch);
    syncMetaToState();
  }

  function renderMetaRows() {
    metaList.innerHTML = metaRows.map(row => `
    <div data-meta-id="${row.id}" class="flex items-center gap-2">
      <input type="text" data-meta-key
             value="${escapeHtml(row.key)}"
             placeholder="Key (e.g. Color)"
             class="w-40 shrink-0 rounded-lg border border-slate-200 px-3 py-2 text-sm" />
      <span class="text-slate-400">:</span>
      <input type="text" data-meta-value
             value="${escapeHtml(row.value)}"
             placeholder="Value (e.g. Blue)"
             class="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm" />
      <button type="button" data-meta-remove
              class="shrink-0 rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600">
        <i data-lucide="x" class="h-4 w-4"></i>
      </button>
    </div>
  `).join('');

    window.lucide?.createIcons();

    // Attach handlers
    metaRows.forEach(row => {
      const rowEl = metaList.querySelector(`[data-meta-id="${row.id}"]`);
      if (!rowEl) return;

      rowEl.querySelector('[data-meta-key]')?.addEventListener('input', (e) => {
        updateMetaRow(row.id, { key: e.target.value });
      });

      rowEl.querySelector('[data-meta-value]')?.addEventListener('input', (e) => {
        updateMetaRow(row.id, { value: e.target.value });
      });

      rowEl.querySelector('[data-meta-remove]')?.addEventListener('click', () => {
        removeMetaRow(row.id);
      });
    });
  }

  function syncMetaToState() {
    // Convert [{ key, value }] to { "Key": "Value" }
    // Skip empty keys or empty values
    const obj = {};
    for (const row of metaRows) {
      const key = row.key?.trim();
      const value = row.value?.trim();
      if (key && value) {
        obj[key] = value;
      }
    }
    state.details.meta = obj;
  }

  addListingVideoBtn.addEventListener('click', () => listingVideoInput.click());

  listingVideoInput.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    listingVideoInput.value = '';

    if (!file.type.startsWith('video/')) {
      Notification.showNotification({
        message: `Please upload a video file (MP4, WebM, or MOV).`,
        type: 'warning'
      })
      return;
    }
    if (file.size > MAX_VIDEO_BYTES) {
      Notification.showNotification({
        message: `Video is too large (${formatBytes(file.size)}). Maximum is 50 MB.`,
        type: 'warning'
      });
      return;
    }

    const duration = await getVideoDuration(file);
    if (duration > MAX_VIDEO_SECONDS) {
      Notification.showNotification({
        message: `Video is too long (${Math.round(duration)}s). Maximum is ${MAX_VIDEO_SECONDS} seconds.`,
        type: 'warning'
      });
      return;
    }

    if (state.details.video?.previewUrl) {
      URL.revokeObjectURL(state.details.video.previewUrl);
    }

    state.details.video = { file, previewUrl: URL.createObjectURL(file), duration };

    listingVideoElement.src = state.details.video.previewUrl;
    listingVideoName.textContent = file.name;
    listingVideoMeta.textContent = `${formatBytes(file.size)} · ${Math.round(duration)}s`;
    listingVideoPreview.classList.remove('hidden');
    listingVideoEmpty.classList.add('hidden');
    addListingVideoBtn.classList.add('hidden');

    window.lucide?.createIcons();
  });

  removeListingVideoBtn.addEventListener('click', () => {
    if (state.details.video?.previewUrl) {
      URL.revokeObjectURL(state.details.video.previewUrl);
    }
    state.details.video = null;
    listingVideoElement.pause();
    listingVideoElement.src = '';
    listingVideoPreview.classList.add('hidden');
    listingVideoEmpty.classList.remove('hidden');
    addListingVideoBtn.classList.remove('hidden');
  });

  function getVideoDuration(file) {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        URL.revokeObjectURL(video.src);
        resolve(video.duration || 0);
      };
      video.onerror = () => resolve(0);
      video.src = URL.createObjectURL(file);
    });
  }

  // ═══════════════════════════════════════════════════════════
  // VARIANTS
  // ═══════════════════════════════════════════════════════════
  addVariantBtn.addEventListener('click', addVariant);

  function addVariant() {
    if (!state.product) {
      alert('Please select a product first.');
      setTab('product');
      return;
    }

    state.variants.push({
      tempId: generateId('var'),
      catalogVariantId: '',
      sku: '',
      price: '',

      images: [],
      catalogVariant: null,
    });

    enableTab('review');
    renderVariants();
    validateSubmit();

    setTimeout(() => {
      const el = document.querySelector(`[data-variant-temp-id="${state.variants[state.variants.length - 1].tempId}"] [data-field="sku"]`);
      el?.focus();
    }, 50);
  }

  function removeVariant(tempId) {
    const variant = state.variants.find(v => v.tempId === tempId);
    if (!variant) return;

    if (variant.images.length > 0) {
      if (!confirm(`Remove this variant and its ${variant.images.length} image(s)?`)) return;
    }

    variant.images.forEach(img => URL.revokeObjectURL(img.previewUrl));
    state.variants = state.variants.filter(v => v.tempId !== tempId);
    renderVariants();
    validateSubmit();
  }

  function updateVariant(tempId, patch) {
    const variant = state.variants.find(v => v.tempId === tempId);
    if (!variant) return;
    Object.assign(variant, patch);
    validateSubmit();
  }

  function renderVariants() {
    if (state.variants.length === 0) {
      variantsEmpty.style.display = '';
      variantsList.innerHTML = '';
      tabVariantCount.classList.add('hidden');
      return;
    }

    variantsEmpty.style.display = 'none';
    tabVariantCount.classList.remove('hidden');
    tabVariantCount.textContent = state.variants.length;

    variantsList.innerHTML = state.variants.map((v, idx) => renderVariantCard(v, idx)).join('');
    window.lucide?.createIcons();

    state.variants.forEach(v => attachCardHandlers(v.tempId));
  }

  function attachCardHandlers(tempId) {
    const card = document.querySelector(`[data-variant-temp-id="${tempId}"]`);
    if (!card) return;

    card.querySelector('[data-field="catalogVariant"]')?.addEventListener('change', (e) => {
      const catalogVariantId = e.target.value;
      const catalogVariant = state.catalogVariants.find(cv => cv.id === catalogVariantId) || null;

      updateVariant(tempId, {
        catalogVariantId,
        catalogVariant,
        sku: catalogVariant?.sku || '',
      });

      // Re-render this card
      const v = state.variants.find(x => x.tempId === tempId);
      const idx = state.variants.findIndex(x => x.tempId === tempId);
      card.outerHTML = renderVariantCard(v, idx);
      window.lucide?.createIcons();
      attachCardHandlers(tempId);
    });

    card.querySelector('[data-field="sku"]')?.addEventListener('input', (e) => updateVariant(tempId, { sku: e.target.value }));
    card.querySelector('[data-field="price"]')?.addEventListener('input', (e) => updateVariant(tempId, { price: e.target.value }));
    //card.querySelector('[data-field="salePrice"]')?.addEventListener('input', (e) => updateVariant(tempId, { salePrice: e.target.value }));

    card.querySelector('[data-action="remove-variant"]')?.addEventListener('click', () => removeVariant(tempId));

    card.querySelector('[data-action="add-image"]')?.addEventListener('click', () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/jpeg,image/png,image/webp';
      input.multiple = true;
      input.onchange = (e) => handleImageUpload(tempId, e.target.files);
      input.click();
    });

    card.querySelectorAll('[data-image-remove]').forEach(btn =>
      btn.addEventListener('click', () => removeImage(tempId, btn.dataset.imageRemove))
    );
    card.querySelectorAll('[data-image-primary]').forEach(btn =>
      btn.addEventListener('click', () => setPrimaryImage(tempId, btn.dataset.imagePrimary))
    );
  }

  function renderVariantCard(v, idx) {
    const catalogVariants = state.catalogVariants;

    const variantOptions = catalogVariants.length > 0
      ? `<select data-field="catalogVariant"
                 class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
           <option value="">— Pick a catalog variant —</option>
           ${catalogVariants.map(cv => `
             <option value="${escapeHtml(cv.id)}" ${cv.id === v.catalogVariantId ? 'selected' : ''}>
               ${escapeHtml(formatVariantLabel(cv))}
             </option>
           `).join('')}
         </select>`
      : `<div class="rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
           <i data-lucide="alert-triangle" class="inline h-3 w-3 mr-1"></i>
           No catalog variants — you can still create a custom variant with a SKU.
         </div>`;

    return `
      <div data-variant-temp-id="${v.tempId}"
           class="rounded-lg border border-slate-200 bg-slate-50 p-4">

        <div class="mb-3 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="flex h-6 w-6 items-center justify-center rounded-full bg-white text-xs font-bold text-slate-600 ring-1 ring-slate-200">
              ${idx + 1}
            </span>
            <span class="text-sm font-semibold text-slate-900">
              ${v.catalogVariant ? escapeHtml(formatVariantLabel(v.catalogVariant)) : `Variant ${idx + 1}`}
            </span>
          </div>
          <button type="button" data-action="remove-variant"
                  class="rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-rose-600">
            <i data-lucide="trash-2" class="h-4 w-4"></i>
          </button>
        </div>

        <div class="space-y-3">
          <div>
            <label class="mb-1 block text-xs font-semibold text-slate-600">Catalog variant</label>
            ${variantOptions}
          </div>

          <div class="grid gap-3 sm:grid-cols-3">
            <div>
              <label class="mb-1 block text-xs font-semibold text-slate-600">
                Your SKU <span class="text-rose-500">*</span>
              </label>
              <input type="text" data-field="sku" value="${escapeHtml(v.sku)}"
                     placeholder="e.g. BAH-IP15P-BLK"
                     class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            </div>
            <div>
              <label class="mb-1 block text-xs font-semibold text-slate-600">
                Price (${escapeHtml(currency)}) <span class="text-rose-500">*</span>
              </label>
              <input type="number" data-field="price" value="${escapeHtml(v.price)}"
                     min="1" step="1" placeholder="35000"
                     class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            </div>
            <!--<div>
              <label class="mb-1 block text-xs font-semibold text-slate-600">
                Sale price <span class="text-slate-400">(opt.)</span>
              </label>
              <input type="number" data-field="salePrice" value="${escapeHtml(v.salePrice)}"
                     min="0" step="1" placeholder="—"
                     class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            </div>-->
          </div>

          <div>
            <div class="mb-2 flex items-center justify-between">
              <label class="text-xs font-semibold text-slate-600">
                Images <span class="text-rose-500">*</span> (${v.images.length}/${MAX_IMAGES_PER_VARIANT})
              </label>
              <button type="button" data-action="add-image"
                      class="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium hover:bg-slate-50">
                <i data-lucide="plus" class="h-3 w-3"></i>
                Add image
              </button>
            </div>

            ${v.images.length === 0
        ? `<div class="rounded-lg border-2 border-dashed border-rose-200 bg-rose-50/50 py-6 text-center text-xs text-rose-600">
                   <i data-lucide="image" class="mx-auto h-5 w-5 mb-1"></i>
                   At least one image required
                 </div>`
        : `<div class="grid grid-cols-3 gap-2 sm:grid-cols-4">
                   ${v.images.map(img => `
                     <div class="relative aspect-square rounded-lg overflow-hidden border border-slate-200 group">
                       <img src="${img.previewUrl}" class="h-full w-full object-cover" alt="" />
                       ${img.isPrimary ? `
                         <span class="absolute left-1.5 top-1.5 rounded-full bg-[var(--color-brand)] px-1.5 py-0.5 text-[9px] font-bold text-white">
                           Primary
                         </span>
                       ` : `
                         <button type="button" data-image-primary="${img.id}"
                                 class="absolute right-1.5 top-1.5 rounded-full bg-black/60 p-1 text-white opacity-0 group-hover:opacity-100">
                           <i data-lucide="star" class="h-3 w-3"></i>
                         </button>
                       `}
                       <button type="button" data-image-remove="${img.id}"
                               class="absolute right-1.5 bottom-1.5 rounded-full bg-black/60 p-1 text-white opacity-0 group-hover:opacity-100 hover:bg-rose-600">
                         <i data-lucide="trash-2" class="h-3 w-3"></i>
                       </button>
                     </div>
                   `).join('')}
                 </div>`}
          </div>
        </div>
      </div>
    `;
  }

  function formatVariantLabel(cv) {
    if (!cv) return 'Variant';

    if (Array.isArray(cv.attributes) && cv.attributes.length > 0) {
      const parts = cv.attributes.map(a => {
        const val = a.value ?? a.attribute_value ?? null;
        const name = a.attribute ?? a.name ?? '';
        if (val && name) return `${name}: ${val}`;
        return val || name;
      }).filter(Boolean);
      if (parts.length > 0) return parts.join(' / ');
    }

    if (cv.options && typeof cv.options === 'object') {
      const values = Object.values(cv.options).filter(Boolean);
      if (values.length > 0) return values.join(' / ');
    }

    return cv.name || cv.sku || 'Variant';
  }

  function handleImageUpload(tempId, files) {
    const v = state.variants.find(x => x.tempId === tempId);
    if (!v) return;

    const remaining = MAX_IMAGES_PER_VARIANT - v.images.length;
    if (remaining <= 0) {
      alert(`Maximum ${MAX_IMAGES_PER_VARIANT} images per variant.`);
      return;
    }

    for (const file of Array.from(files).slice(0, remaining)) {
      if (!file.type.startsWith('image/')) continue;
      if (file.size > MAX_IMAGE_BYTES) {
        alert(`${file.name} is too large (max 5 MB).`);
        continue;
      }
      v.images.push({
        id: generateId('img'),
        file,
        previewUrl: URL.createObjectURL(file),
        isPrimary: v.images.length === 0,
      });
    }

    renderVariants();
    validateSubmit();
  }

  function removeImage(tempId, imageId) {
    const v = state.variants.find(x => x.tempId === tempId);
    if (!v) return;

    const img = v.images.find(i => i.id === imageId);
    if (img) URL.revokeObjectURL(img.previewUrl);

    v.images = v.images.filter(i => i.id !== imageId);

    if (img?.isPrimary && v.images.length > 0) {
      v.images[0].isPrimary = true;
    }

    renderVariants();
    validateSubmit();
  }

  function setPrimaryImage(tempId, imageId) {
    const v = state.variants.find(x => x.tempId === tempId);
    if (!v) return;
    v.images.forEach(i => { i.isPrimary = i.id === imageId; });
    renderVariants();
  }

  // ═══════════════════════════════════════════════════════════
  // REVIEW
  // ═══════════════════════════════════════════════════════════
  function renderReview() {
    if (!state.product) {
      reviewSummary.innerHTML = '<p class="text-sm text-slate-500">No product selected.</p>';
      return;
    }

    const d = state.details;

    const variantsHtml = state.variants.map((v, idx) => `
      <div class="rounded-lg border border-slate-200 bg-white p-3">
        <div class="flex items-center justify-between">
          <div class="text-sm font-medium text-slate-900">
            ${escapeHtml(v.catalogVariant ? formatVariantLabel(v.catalogVariant) : `Variant ${idx + 1}`)}
          </div>
          <div class="text-sm font-bold text-slate-900">
            ${_fmt(parseFloat(v.price) || 0, currency)}
          </div>
        </div>
        <!--<div class="mt-1 flex items-center gap-3 text-xs text-slate-500">
          <span>SKU: ${escapeHtml(v.sku || '—')}</span>
          <span>${v.images.length} image${v.images.length === 1 ? '' : 's'}</span>
          ${v.salePrice ? `<span class="text-emerald-600 font-medium">Sale: ${_fmt(parseFloat(v.salePrice), currency)}</span>` : ''}
        </div>--!>
      </div>
    `).join('');

    reviewSummary.innerHTML = `
      <div class="rounded-lg border border-slate-200 bg-slate-50 p-4">
        <div class="text-[10px] font-bold uppercase tracking-wider text-slate-500">Product</div>
        <div class="mt-1 flex items-center gap-3">
          ${state.product.primary_image
        ? `<img src="${cdnBase}/${escapeHtml(state.product.primary_image)}" class="h-12 w-12 rounded-lg object-cover ring-1 ring-slate-200" />`
        : ''}
          <div>
            <div class="text-sm font-medium text-slate-900">${escapeHtml(state.product.title)}</div>
            <div class="text-xs text-slate-500">
              ${[state.product.brand, state.product.category].filter(Boolean).map(escapeHtml).join(' · ')}
            </div>
          </div>
        </div>
      </div>

      <div class="rounded-lg border border-slate-200 bg-slate-50 p-4">
        <div class="text-[10px] font-bold uppercase tracking-wider text-slate-500">Listing</div>
        <div class="mt-1 text-sm font-medium text-slate-900">${escapeHtml(d.title || '—')}</div>
        <div class="mt-1 text-xs text-slate-500">${escapeHtml(d.description || 'No description')}</div>
        <div class="mt-2 flex flex-wrap gap-2">
          <span class="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-600 ring-1 ring-slate-200">${escapeHtml(d.condition)}</span>
          <span class="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-600 ring-1 ring-slate-200">${escapeHtml(d.status)}</span>
          ${d.video ? `<span class="rounded-full bg-[var(--color-brand-ultralight)] px-2 py-0.5 text-[10px] font-semibold text-[var(--color-brand-dark)] ring-1 ring-[var(--color-brand)]/30">1 video</span>` : ''}
        </div>
      </div>

      <div>
        <div class="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
          Variants (${state.variants.length})
        </div>
        <div class="space-y-2">${variantsHtml}</div>
      </div>
    `;

    window.lucide?.createIcons();
  }

  // ═══════════════════════════════════════════════════════════
  // VALIDATION
  // ═══════════════════════════════════════════════════════════
  // function validateSubmit() {
  //   const hasProduct = !!state.product;
  //   const hasTitle = !!state.details.title?.trim();
  //   const hasVariants = state.variants.length > 0
  //     && state.variants.every(v =>
  //       v.sku?.trim()
  //       && parseFloat(v.price) > 0
  //       && v.images.length > 0
  //     );
  //   const accepted = termsCheckbox.checked;

  //   submitBtn.disabled = !(hasProduct && hasTitle && hasVariants && accepted);
  // }

  function validateSubmit() {
    const hasProduct = !!state.product;
    const hasTitle = !!state.details.title?.trim();
    const hasVariants = state.variants.length > 0
      && state.variants.every(v =>
        v.sku?.trim()
        && parseFloat(v.price) > 0
        && v.images.length > 0
      );
    const accepted = termsCheckbox.checked;

    submitBtn.disabled = !(hasProduct && hasTitle && hasVariants && accepted);
  }

  // ═══════════════════════════════════════════════════════════
  // SUBMIT
  // ═══════════════════════════════════════════════════════════
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (state.submitting) return;
    errorBox.classList.add('hidden');

    // Sync from DOM (defeats autofill)
    state.details.title = titleInput.value?.trim() || '';

    // Client-side validation (fast feedback, but server re-validates)
    if (!termsCheckbox.checked) {
      showError('Please accept the terms.');
      setTab('welcome');
      return;
    }
    if (!state.product) {
      showError('Please select a product.');
      setTab('product');
      return;
    }
    if (!state.details.title) {
      showError('Please enter a title.');
      setTab('details');
      return;
    }
    if (state.variants.length === 0) {
      showError('Add at least one variant.');
      setTab('variants');
      return;
    }

    const invalid = state.variants.find(v =>
      !v.sku?.trim() || !(parseFloat(v.price) > 0) || v.images.length === 0
    );
    if (invalid) {
      showError('Every variant needs a SKU, a price > 0, and at least one image.');
      setTab('variants');
      return;
    }

    // ═══ BUILD MULTIPART PAYLOAD ═══
    const fd = new FormData();

    // Listing fields
    fd.append('product_id', state.product.id);
    fd.append('title', state.details.title);
    fd.append('description', state.details.description?.trim() || '');
    fd.append('condition', state.details.condition);
    fd.append('status', state.details.status);
    if (currencyId) fd.append('currency_id', currencyId);

    // Variants (as JSON string — the server parses this)
    const variantsJson = state.variants.map((v, idx) => ({
      index: idx,
      catalog_variant_id: v.catalogVariantId || null,
      sku: v.sku.trim(),
      price: parseFloat(v.price),
      //sale_price: v.salePrice ? parseFloat(v.salePrice) : null,
    }));
    fd.append('variants', JSON.stringify(variantsJson));

    fd.append('meta', JSON.stringify(state.details.meta || {}));

    // Video (if any) — one per listing
    if (state.details.video?.file) {
      fd.append('video', state.details.video.file);
    }

    // Images per variant — keyed by variant index
    // Naming convention: `images[0][]`, `images[0][]`, `images[1][]`, ...
    state.variants.forEach((variant, variantIdx) => {
      variant.images.forEach((img) => {
        fd.append(`images[${variantIdx}][]`, img.file);
        // Track which image is primary (the server needs to know)
        if (img.isPrimary) {
          fd.append(`primary_image_${variantIdx}`, String(img.id));
        }
      });
      // Send the image order so server can preserve display_order
      fd.append(`image_order_${variantIdx}`, JSON.stringify(
        variant.images.map(i => i.id)
      ));
    });

    logFormData(fd, 'Listing submit');

    // ═══ SUBMIT ═══
    state.submitting = true;
    setSubmitState('creating');

    try {
      const res = await axios.post(`/cataloging/listing/${storeId}/`, fd, {
        withCredentials: true,
        headers: { 'Content-Type': 'multipart/form-data' },
        // Long timeout for large payloads
        timeout: 180000,
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const pct = Math.round((progressEvent.loaded / progressEvent.total) * 100);
            setSubmitState('uploading', pct);
          }
        },
      });

      const listing = res.data?.data;
      
      //Handle response....
      if (!listing?.id) throw new Error('No listing ID returned');

      setSubmitState('done');
      window.location.href = `/stores/${storeId}/listings/${listing.id}`;

    } catch (err) {
      console.error('[submit] failed:', err);
      showError(
        err.response?.data?.error ||
        err.response?.data?.message ||
        err.message ||
        'Failed to create listing.'
      );
      state.submitting = false;
      setSubmitState('idle');
    }
  });

  function setSubmitState(name, progressPct) {
    const states = {
      creating: { icon: 'loader-2', text: 'Creating listing…', spin: true },
      uploading: { icon: 'loader-2', text: 'Uploading…', spin: true },
      done: { icon: 'check', text: 'Redirecting…', spin: false },
      idle: { icon: 'check', text: 'Publish listing', spin: false },
    };
    const s = states[name];
    if (!s) return;

    const text = progressPct != null ? `${s.text} ${progressPct}%` : s.text;

    submitBtn.innerHTML = `<i data-lucide="${s.icon}" class="h-4 w-4 ${s.spin ? 'animate-spin' : ''}"></i> ${text}`;
    window.lucide?.createIcons();
  }

  function logFormData(fd, label = 'FormData') {
    console.group(`[${label}]`);
    console.log('Entries:', [...fd.entries()].length);

    const grouped = {
      text: {},
      files: [],
    };

    for (const [key, value] of fd.entries()) {
      if (value instanceof File) {
        grouped.files.push({
          key,
          name: value.name,
          type: value.type,
          size: formatBytes(value.size),
          sizeBytes: value.size,
          lastModified: new Date(value.lastModified).toISOString(),
        });
      } else {
        // Multiple values for same key? Collect into array
        if (grouped.text[key] !== undefined) {
          if (!Array.isArray(grouped.text[key])) {
            grouped.text[key] = [grouped.text[key]];
          }
          grouped.text[key].push(value);
        } else {
          grouped.text[key] = value;
        }
      }
    }

    console.log('Text fields:', grouped.text);
    console.log('Files:', grouped.files);
    console.groupEnd();
  }

  // ═══════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════
  function showError(msg) {
    errorBox.textContent = msg;
    errorBox.classList.remove('hidden');
    errorBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str ?? '';
    return div.innerHTML;
  }

  function _fmt(amount, curr = 'RWF') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency', currency: curr, maximumFractionDigits: 0,
    }).format(Number(amount || 0));
  }

  function formatBytes(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1024 / 1024).toFixed(1) + ' MB';
  }

  // Close product dropdown on outside click
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#productSearchInput') &&
      !e.target.closest('#productResults') &&
      !e.target.closest('#productSearchClear')) {
      productResults.classList.add('hidden');
    }
  });

  function syncInitialFormValues() {
    // Title
    if (titleInput.value) {
      state.details.title = titleInput.value;
    }

    // Description
    if (descriptionInput.value) {
      state.details.description = descriptionInput.value;
    }

    // Condition (select)
    if (conditionInput.value) {
      state.details.condition = conditionInput.value;
    }

    // Status (select)
    if (statusInput.value) {
      state.details.status = statusInput.value;
    }
  }

  // ═══════════════════════════════════════════════════════════
  // INIT
  // ═══════════════════════════════════════════════════════════
  syncInitialFormValues();
  setTab('welcome');
  validateSubmit();
  renderVariants();
  renderMetaRows();
  window.lucide?.createIcons();
});