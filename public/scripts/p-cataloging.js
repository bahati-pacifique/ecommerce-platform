const Toast = {
  show(type, message, duration = 4000) {
    const colors = {
      success: 'bg-emerald-600',
      error: 'bg-red-600',
      info: 'bg-ink-900',
      warning: 'bg-amber-500'
    };
    const icons = {
      success: 'check-circle-2',
      error: 'alert-circle',
      info: 'info',
      warning: 'alert-triangle'
    };
    const el = document.createElement('div');
    el.className = `${colors[type] || colors.info} text-white rounded-xl shadow-pop px-4 py-3 text-sm font-medium flex items-center gap-2.5 fade-in max-w-sm`;
    el.innerHTML = `<i data-lucide="${icons[type] || icons.info}" class="w-4 h-4 flex-shrink-0"></i><span>${message}</span>`;
    document.getElementById('toastContainer').appendChild(el);
    if (window.lucide) lucide.createIcons();
    setTimeout(() => {
      el.style.transition = 'opacity .3s, transform .3s';
      el.style.opacity = '0';
      el.style.transform = 'translateY(8px)';
      setTimeout(() => el.remove(), 300);
    }, duration);
  }
};

const Api = {
  async request(method, path, data, options = {}) {
    try {
      const config = {
        method,
        url: `${API_BASE}${path}`,
        withCredentials: true,
        ...options
      };
      if (data && !options.raw) config.data = data;
      const res = await axios(config);
      return res.data;
    } catch (err) {
      const status = err.response?.status;
      const msg = err.response?.data?.message || err.response?.data?.error || err.message;
      const e = new Error(msg || 'Request failed');
      e.status = status;
      e.response = err.response;
      throw e;
    }
  },
  get(path, params) {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request('GET', path + qs);
  },
  post(path, data, opts) {
    return this.request('POST', path, data, opts);
  },
  patch(path, data, opts) {
    return this.request('PATCH', path, data, opts);
  },
  delete(path) {
    return this.request('DELETE', path);
  }
};

function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c =>
  ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[c]));
}

function uid(prefix = 'id') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

const State = {
  currentStep: 0,
  steps: ['welcome', 'product', 'media', 'variants', 'review'],

  product: {
    // No id — nothing is created until the single submit.
    family_id: null,
    family_title: '',
    brand_id: null,
    brand_title: '',
    title: '',
    slug: '',
    description: '',
    description_plain: '',
    target_gender: 'not_applied',
    age_restriction: 'not_applied',
    requested_reason: ''
  },

  // Media is buffered locally. Nothing uploads until submitFinal().
  // [{ localId, file: File, url: blobURL, name }]
  media: [],

  // [{ localId, sku, barcode, weight_grams, status, attributes, _attributeDisplays }]
  variants: [],

  familyAttributes: [],

  // In-progress draft of the next variant
  variantDraft: {
    rows: [] // [{ id, attribute: { id, title } | null, value: { id, value, meta } | null }]
  },

  completing: false,
  dirty: false
};

const STEPS = [{
  id: 'welcome',
  label: 'Welcome',
  subtitle: 'Before you begin'
},
{
  id: 'product',
  label: 'Product',
  subtitle: 'Identity & description'
},
{
  id: 'media',
  label: 'Media',
  subtitle: 'Product images'
},
{
  id: 'variants',
  label: 'Variants',
  subtitle: 'Configurations & SKUs'
},
{
  id: 'review',
  label: 'Review',
  subtitle: 'Confirm & submit'
}
];

const Wizard = {

  async init() {
    this.renderStepIndicator();
    await this.renderStep();

    document.getElementById('btnBack').addEventListener('click', () => this.back());
    document.getElementById('btnNext').addEventListener('click', () => this.next());

    window.addEventListener('beforeunload', (e) => {
      if (State.currentStep > 0 && State.dirty && !State.completing) {
        e.preventDefault();
        e.returnValue = '';
      }
    });
  },

  renderStepIndicator() {
    const wrap = document.getElementById('stepIndicator');
    wrap.innerHTML = STEPS.map((s, i) => {
      let status = 'upcoming';
      if (i < State.currentStep) status = 'complete';
      else if (i === State.currentStep) status = 'active';

      const clickable = i < State.currentStep;
      const connectorStatus = i < State.currentStep ? 'complete' : 'upcoming';

      return `
            <div class="step-node" data-step-index="${i}" data-status="${status}" data-clickable="${clickable}"
                 role="button" tabindex="${clickable ? 0 : -1}" aria-label="${s.label}"
                 aria-current="${i === State.currentStep ? 'step' : 'false'}">
              <div class="step-dot">${status === 'complete' ? '<i data-lucide="check" class="w-4 h-4"></i>' : i + 1}</div>
              <div class="step-label">${escapeHtml(s.label)}</div>
            </div>
            ${i < STEPS.length - 1 ? `<div class="step-connector" data-status="${connectorStatus}"></div>` : ''}
          `;
    }).join('');

    if (window.lucide) lucide.createIcons();

    wrap.querySelectorAll('.step-node[data-clickable="true"]').forEach(node => {
      const jump = () => this.goTo(parseInt(node.dataset.stepIndex, 10));
      node.addEventListener('click', jump);
      node.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          jump();
        }
      });
    });
  },

  async renderStep() {
    const step = STEPS[State.currentStep];
    const body = document.getElementById('wizardBody');

    document.getElementById('wizardFooter').classList.toggle('hidden', State.currentStep === 0);

    const btnBack = document.getElementById('btnBack');
    const btnNext = document.getElementById('btnNext');
    const hint = document.getElementById('footerHint');

    btnBack.disabled = State.currentStep === 0;
    btnBack.style.visibility = State.currentStep === 0 ? 'hidden' : '';

    hint.textContent = this.stepHint(step.id);

    switch (step.id) {
      case 'welcome':
        this.renderWelcome(body);
        break;
      case 'product':
        this.renderProduct(body);
        break;
      case 'media':
        this.renderMedia(body);
        break;
      case 'variants':
        await this.renderVariants(body);
        break;
      case 'review':
        this.renderReview(body);
        break;
    }

    if (step.id === 'review') {
      btnNext.querySelector('.btn-label').textContent = 'Submit Product';
      btnNext.querySelector('.btn-icon')?.setAttribute('data-lucide', 'check');
    } else {
      btnNext.querySelector('.btn-label').textContent = 'Continue';
      btnNext.querySelector('.btn-icon')?.setAttribute('data-lucide', 'arrow-right');
    }
    if (window.lucide) lucide.createIcons();

    body.scrollTop = 0;
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  },

  stepHint(stepId) {
    const p = State.product;
    switch (stepId) {
      case 'product':
        return p.title ? 'Fill in all required fields marked *' : 'All fields marked * are required';
      case 'media':
        return `${State.media.length} of 10 images`;
      case 'variants':
        return State.variants.length ?
          `${State.variants.length} variant${State.variants.length === 1 ? '' : 's'}` :
          'At least one variant required';
      case 'review':
        return 'Review everything before submitting';
      default:
        return '';
    }
  },

  async next() {
    const ok = await this.validateCurrentStep();
    if (!ok) return;

    // Snapshot the product locally on step transitions. No server call —
    // the single submit sends everything together.
    if (STEPS[State.currentStep].id === 'product') {
      this.snapshotProductLocally();
    }

    if (State.currentStep === STEPS.length - 1) {
      return this.submitFinal();
    }

    State.dirty = false;
    await this.goTo(State.currentStep + 1);
  },

  async back() {
    if (State.currentStep === 0) return;
    await this.goTo(State.currentStep - 1);
  },

  async goTo(index) {
    State.currentStep = Math.max(0, Math.min(index, STEPS.length - 1));
    this.renderStepIndicator();
    await this.renderStep();
  },

  renderWelcome(el) {
    el.innerHTML = `
          <div class="max-w-3xl mx-auto py-4 sm:py-8 fade-in flex flex-col">
            <div class="px-3 py-4 text-brand flex items-center justify-center mb-5">
              <img src="https://cdn.cococe.rw/branding/brand/logos/business.png" alt="COCOCE" class="h-16">
            </div>

            <h2 class="flex items-center flex-wrap gap-2 text-2xl font-bold text-ink-900">
              Hi <span class="text-black/70">${escapeHtml(username || 'there')}</span> 👋🏼, <span class="flex items-center gap-1">Welcome Back <span class="text-brand/70 hidden md:block"> To Product Cataloging</span></span>
            </h2>
            <div class="mt-2 mb-2 h-1 rounded max-w-[200px] w-[180px] bg-brand"></div>
            <p class="text-ink-500 mt-4 leading-relaxed">
              You're about to add a canonical product to the COCOCE marketplace catalog.
              This is <strong class="text-ink-900">not</strong> the same as creating a store listing —
              the product you register here becomes available to your store (and others) for listing later.
            </p>

            <div class="mt-8 grid sm:grid-cols-2 gap-4">
              <div class="rounded-xl border border-ink-200 p-5 bg-ink-50/40">
                <div class="flex items-center gap-2.5 mb-3">
                  <i data-lucide="list-checks" class="w-4 h-4 text-brand"></i>
                  <h3 class="text-sm font-semibold text-ink-900">What you'll provide</h3>
                </div>
                <ul class="text-sm text-ink-500 space-y-1.5">
                  <li>Product family, brand, and title</li>
                  <li>A rich product description</li>
                  <li>1–10 product images</li>
                  <li>Variant configurations and SKUs</li>
                </ul>
              </div>

              <div class="rounded-xl border border-ink-200 p-5 bg-ink-50/40">
                <div class="flex items-center gap-2.5 mb-3">
                  <i data-lucide="shield-check" class="w-4 h-4 text-brand"></i>
                  <h3 class="text-sm font-semibold text-ink-900">Review & verification</h3>
                </div>
                <ul class="text-sm text-ink-500 space-y-1.5">
                  <li>Submission enters a review queue</li>
                  <li>Admin staff verify product details</li>
                  <li>You're notified on approval or denial</li>
                  <li>Only verified products can be listed</li>
                </ul>
              </div>
            </div>

            <div class="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-5">
              <div class="flex items-start gap-3">
                <i data-lucide="alert-triangle" class="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5"></i>
                <div class="text-sm text-amber-900 leading-relaxed">
                  <p class="font-semibold mb-1">Catalog guidelines</p>
                  <ul class="space-y-1 ml-4 list-disc">
                    <li>Use existing families, brands, and attributes — don't invent new ones casually.</li>
                    <li>One product per registration. Variants cover colour, size, storage, RAM, etc.</li>
                    <li>Product images must be your own or licensed for commercial use.</li>
                    <li>Descriptions must be factual, accurate, and free of promotional claims.</li>
                  </ul>
                </div>
              </div>
            </div>

            <div class="mt-6 text-xs text-ink-500 space-y-1.5">
              <p>
                By continuing you agree to the
                <a href="/docs/marketplace-terms" target="_blank" class="text-brand hover:text-brand-dark underline-offset-2 hover:underline">Marketplace Terms &amp; Conditions</a>
                and the
                <a href="/docs/catalog-policy" target="_blank" class="text-brand hover:text-brand-dark underline-offset-2 hover:underline">Catalog Policy</a>.
              </p>
            </div>

            <button type="button" id="welcomeContinue"
              class="mt-8 inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-brand text-white text-sm font-semibold ml-auto hover:bg-brand-dark transition">
              Continue
              <i data-lucide="arrow-right" class="w-4 h-4"></i>
            </button>
          </div>
        `;
    if (window.lucide) lucide.createIcons();
    document.getElementById('welcomeContinue').addEventListener('click', () => this.next());
  },

  renderProduct(el) {
    const p = State.product;
    el.innerHTML = `
          <div class="max-w-3xl mx-auto fade-in">
            <header class="mb-6">
              <h2 class="text-lg font-semibold text-ink-900">Product information</h2>
              <p class="text-sm text-ink-500 mt-0.5">The identity of the product in the marketplace catalog.</p>
            </header>

            <div class="space-y-5">

              <div class="field" data-field="family_id">
                <label class="block text-sm font-medium text-ink-900 mb-1.5">
                  Product family <span class="text-brand">*</span>
                </label>
                <div class="relative">
                  <input id="familyPicker" type="text" autocomplete="off"
                    placeholder="Search families…"
                    value="${escapeHtml(p.family_title)}"
                    class="w-full px-3.5 py-2.5 rounded-xl border border-ink-200 bg-white text-sm focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/10">
                  <i data-lucide="search" class="w-4 h-4 text-ink-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"></i>
                  <div id="familyDropdown" class="hidden absolute z-30 left-0 right-0 top-full mt-1 bg-white border border-ink-200 rounded-xl shadow-pop max-h-64 overflow-y-auto"></div>
                </div>
                <p class="text-xs text-ink-400 mt-1.5">
                  Determines which attributes are available for variants.
                  <button type="button" id="requestFamilyBtn" class="text-brand hover:text-brand-dark font-medium ml-1">Request a new family →</button>
                </p>
                <p class="field-msg hidden mt-1.5 text-xs text-red-600"></p>
              </div>

              <div class="field" data-field="brand_id">
                <label class="block text-sm font-medium text-ink-900 mb-1.5">
                  Brand <span class="text-brand">*</span>
                </label>
                <div class="relative">
                  <input id="brandPicker" type="text" autocomplete="off"
                    placeholder="Search brands or pick 'Unbranded'…"
                    value="${escapeHtml(p.brand_title)}"
                    class="w-full px-3.5 py-2.5 rounded-xl border border-ink-200 bg-white text-sm focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/10">
                  <i data-lucide="search" class="w-4 h-4 text-ink-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"></i>
                  <div id="brandDropdown" class="hidden absolute z-30 left-0 right-0 top-full mt-1 bg-white border border-ink-200 rounded-xl shadow-pop max-h-64 overflow-y-auto"></div>
                </div>
                <p class="text-xs text-ink-400 mt-1.5">
                  Select <strong>Unbranded / Generic</strong> if the product has no brand.
                  <button type="button" id="requestBrandBtn" class="text-brand hover:text-brand-dark font-medium ml-1">Request a new brand →</button>
                </p>
                <p class="field-msg hidden mt-1.5 text-xs text-red-600"></p>
              </div>

              <div class="field" data-field="title">
                <label for="productTitle" class="block text-sm font-medium text-ink-900 mb-1.5">
                  Product title <span class="text-brand">*</span>
                </label>
                <input id="productTitle" type="text" maxlength="255" autocomplete="off"
                  placeholder="e.g. Dell XPS 13"
                  value="${escapeHtml(p.title)}"
                  class="w-full px-3.5 py-2.5 rounded-xl border border-ink-200 bg-white text-sm focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/10">
                <div class="flex justify-between mt-1.5">
                  <p class="text-xs text-ink-400">Model name only, without colour or size.</p>
                  <span id="titleCount" class="text-[11px] text-ink-400 tabular-nums">0/255</span>
                </div>
                <p class="field-msg hidden mt-1.5 text-xs text-red-600"></p>
              </div>

              <div class="field" data-field="slug">
                <label for="productSlug" class="block text-sm font-medium text-ink-900 mb-1.5">
                  Slug <span class="text-brand">*</span>
                </label>
                <div class="flex items-stretch gap-2">
                  <input id="productSlug" type="text" maxlength="255" autocomplete="off"
                    placeholder="dell-xps-13"
                    value="${escapeHtml(p.slug)}"
                    class="flex-1 px-3.5 py-2.5 rounded-xl border border-ink-200 bg-white text-sm font-mono focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/10">
                  <button type="button" id="slugFromTitle"
                    class="px-3 py-2 rounded-xl border border-ink-200 bg-white text-xs font-medium text-ink-700 hover:bg-ink-50 transition whitespace-nowrap">
                    From title
                  </button>
                </div>
                <p class="text-xs text-ink-400 mt-1.5">
                  URL-friendly identifier. Must be unique across the marketplace.
                </p>
                <p class="field-msg hidden mt-1.5 text-xs text-red-600"></p>
              </div>

              <div class="grid sm:grid-cols-2 gap-5">
                <div class="field" data-field="target_gender">
                  <label for="targetGender" class="block text-sm font-medium text-ink-900 mb-1.5">Target gender</label>
                  <select id="targetGender"
                    class="w-full appearance-none px-3.5 py-2.5 rounded-xl border border-ink-200 bg-white text-sm focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/10">
                    <option value="not_applied" ${p.target_gender === 'not_applied' ? 'selected' : ''}>Not applied</option>
                    <option value="men"         ${p.target_gender === 'men' ? 'selected' : ''}>Men</option>
                    <option value="women"       ${p.target_gender === 'women' ? 'selected' : ''}>Women</option>
                    <option value="unisex"      ${p.target_gender === 'unisex' ? 'selected' : ''}>Unisex</option>
                  </select>
                </div>

                <div class="field" data-field="age_restriction">
                  <label for="ageRestriction" class="block text-sm font-medium text-ink-900 mb-1.5">Age restriction</label>
                  <select id="ageRestriction"
                    class="w-full appearance-none px-3.5 py-2.5 rounded-xl border border-ink-200 bg-white text-sm focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/10">
                    <option value="not_applied" ${p.age_restriction === 'not_applied' ? 'selected' : ''}>Not applied</option>
                    <option value="adult"       ${p.age_restriction === 'adult' ? 'selected' : ''}>Adult (18+)</option>
                    <option value="teen"        ${p.age_restriction === 'teen' ? 'selected' : ''}>Teen</option>
                    <option value="kids"        ${p.age_restriction === 'kids' ? 'selected' : ''}>Kids</option>
                    <option value="toddler"     ${p.age_restriction === 'toddler' ? 'selected' : ''}>Toddler</option>
                  </select>
                </div>
              </div>

              <div class="field" data-field="description">
                <label class="block text-sm font-medium text-ink-900 mb-1.5">
                  Product description <span class="text-brand">*</span>
                </label>

                <div class="quill-wrapper">
                  <div id="quillEditor"></div>
                </div>
                <div class="flex justify-between mt-1.5">
                  <p class="text-xs text-ink-400">
                    Explain what the product is. Minimum 30 characters.
                  </p>
                  <span id="descCount" class="text-[11px] text-ink-400 tabular-nums">0 characters</span>
                </div>
                <p class="field-msg hidden mt-1.5 text-xs text-red-600"></p>
              </div>

              <div id="reasonBlock" class="hidden field" data-field="requested_reason">
                <label for="requestedReason" class="block text-sm font-medium text-ink-900 mb-1.5">
                  Reason for this registration <span class="text-brand">*</span>
                </label>
                <textarea id="requestedReason" rows="3"
                  placeholder="Explain why this product should be added to the marketplace catalog."
                  class="w-full px-3.5 py-2.5 rounded-xl border border-ink-200 bg-white text-sm focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 resize-y min-h-[80px]">${escapeHtml(p.requested_reason)}</textarea>
                <p class="text-xs text-ink-400 mt-1.5">Since you requested a new family or brand, please explain why.</p>
                <p class="field-msg hidden mt-1.5 text-xs text-red-600"></p>
              </div>

            </div>
          </div>
        `;
    if (window.lucide) lucide.createIcons();
    this.wireProductStep();
  },

  wireProductStep() {
    const p = State.product;

    const titleEl = document.getElementById('productTitle');
    const titleCount = document.getElementById('titleCount');
    const updateTitleCount = () => {
      const len = titleEl.value.length;
      titleCount.textContent = `${len}/255`;
      titleCount.style.color = len > 255 ? '#DC2626' : '';
    };
    updateTitleCount();
    titleEl.addEventListener('input', () => {
      State.dirty = true;
      p.title = titleEl.value;
      updateTitleCount();
      const derived = slugify(titleEl.value);
      const slugEl = document.getElementById('productSlug');
      if (!slugEl.dataset.manuallyEdited) {
        slugEl.value = derived;
        p.slug = derived;
      }
    });

    const slugEl = document.getElementById('productSlug');
    slugEl.value = p.slug || '';
    slugEl.addEventListener('input', () => {
      State.dirty = true;
      slugEl.value = slugify(slugEl.value);
      p.slug = slugEl.value;
      slugEl.dataset.manuallyEdited = '1';
    });
    document.getElementById('slugFromTitle').addEventListener('click', () => {
      const derived = slugify(p.title);
      slugEl.value = derived;
      p.slug = derived;
      delete slugEl.dataset.manuallyEdited;
    });

    document.getElementById('targetGender').addEventListener('change', (e) => {
      p.target_gender = e.target.value;
      State.dirty = true;
    });
    document.getElementById('ageRestriction').addEventListener('change', (e) => {
      p.age_restriction = e.target.value;
      State.dirty = true;
    });

    const quill = new Quill('#quillEditor', {
      theme: 'snow',
      placeholder: 'Describe the product — what it is, who it\'s for, key features.',
      modules: {
        toolbar: [
          [{
            header: [1, 2, 3, 4, 5, 6, false]
          }],
          ['bold', 'italic', 'underline'],
          [{
            list: 'ordered'
          }, {
            list: 'bullet'
          }],
          ['link'],
          ['clean']
        ]
      }
    });
    this.quill = quill;

    if (p.description) quill.clipboard.dangerouslyPasteHTML(p.description);

    const descCount = document.getElementById('descCount');
    const updateDescCount = () => {
      const text = quill.getText().trim();
      p.description_plain = text;
      descCount.textContent = `${text.length} character${text.length === 1 ? '' : 's'}`;
      descCount.style.color = text.length < 30 ? '#DC2626' : '';
    };
    updateDescCount();

    quill.on('text-change', () => {
      State.dirty = true;
      p.description = quill.root.innerHTML;
      updateDescCount();
    });

    const reasonEl = document.getElementById('requestedReason');
    reasonEl.addEventListener('input', () => {
      p.requested_reason = reasonEl.value;
      State.dirty = true;
    });

    this.wirePicker({
      inputId: 'familyPicker',
      dropdownId: 'familyDropdown',
      kind: 'families',
      onSelect: (item) => {
        p.family_id = item.id;
        p.family_title = item.title;
        State.familyAttributes = [];
        this.updateReasonVisibility();
      },
      onClear: () => {
        p.family_id = null;
        p.family_title = '';
        State.familyAttributes = [];
        this.updateReasonVisibility();
      }
    });

    this.wirePicker({
      inputId: 'brandPicker',
      dropdownId: 'brandDropdown',
      kind: 'brands',
      includeUnbranded: true,
      onSelect: (item) => {
        p.brand_id = item.id;
        p.brand_title = item.title;
        this.updateReasonVisibility();
      },
      onClear: () => {
        p.brand_id = null;
        p.brand_title = '';
        this.updateReasonVisibility();
      }
    });

    document.getElementById('requestFamilyBtn').addEventListener('click', () => {
      window.open(`${CFG.protocal}business.${CFG.domainName}/dashboard`, '_blank');
    });
    document.getElementById('requestBrandBtn').addEventListener('click', () => {
      window.open(`${CFG.protocal}business.${CFG.domainName}/dashboard`, '_blank');
    });

    this.updateReasonVisibility();
  },

  updateReasonVisibility() {
    const needsReason = State.product._familyRequested || State.product._brandRequested;
    document.getElementById('reasonBlock').classList.toggle('hidden', !needsReason);
  },

  wirePicker({
    inputId,
    dropdownId,
    kind,
    onSelect,
    onClear,
    includeUnbranded
  }) {
    const input = document.getElementById(inputId);
    const dropdown = document.getElementById(dropdownId);
    if (!input || !dropdown) return;

    let debounce;
    let lastResults = [];
    let activeIndex = -1;

    const close = () => {
      dropdown.classList.add('hidden');
      activeIndex = -1;
    };

    const render = (items) => {
      lastResults = items;
      if (!items.length) {
        dropdown.innerHTML = `<div class="px-3 py-3 text-xs text-ink-400">No matches. Try another search or request a new one.</div>`;
        dropdown.classList.remove('hidden');
        return;
      }
      dropdown.innerHTML = items.map((it, i) => `
            <button type="button" data-index="${i}"
              class="w-full text-left px-3.5 py-2.5 text-sm hover:bg-ink-50 transition flex items-center justify-between gap-3 ${i === activeIndex ? 'bg-ink-50' : ''}">
              <span class="truncate">${escapeHtml(it.title)}</span>
              ${it._unbranded ? '<span class="text-[10px] text-ink-400">sentinel</span>' : ''}
            </button>
          `).join('');
      dropdown.classList.remove('hidden');

      dropdown.querySelectorAll('[data-index]').forEach(btn => {
        btn.addEventListener('click', () => {
          const idx = parseInt(btn.dataset.index, 10);
          const picked = lastResults[idx];
          input.value = picked.title;
          onSelect(picked);
          close();
        });
      });
    };

    const doSearch = async () => {
      const key = input.value.trim();
      try {
        const res = await Api.get(`/${kind}/s/`, {
          key,
          limit: 20
        });
        const items = res.data || res[kind] || [];
        const normalized = items.map(i => ({
          id: i.id,
          title: i.title
        }));
        if (includeUnbranded) {
          normalized.unshift({
            id: '__unbranded__',
            title: 'Unbranded / Generic',
            _unbranded: true
          });
        }
        render(normalized.slice(0, 20));
      } catch (err) {
        dropdown.innerHTML = `<div class="px-3 py-3 text-xs text-red-600">Couldn't load ${kind}. ${escapeHtml(err.message)}</div>`;
        dropdown.classList.remove('hidden');
      }
    };

    input.addEventListener('input', () => {
      State.dirty = true;
      if (!input.value.trim() && onClear) onClear();
      clearTimeout(debounce);
      debounce = setTimeout(doSearch, 250);
    });
    input.addEventListener('focus', doSearch);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (!lastResults.length) return;
        activeIndex = Math.min(activeIndex + 1, lastResults.length - 1);
        render(lastResults);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        activeIndex = Math.max(activeIndex - 1, 0);
        render(lastResults);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (activeIndex >= 0 && lastResults[activeIndex]) {
          const picked = lastResults[activeIndex];
          input.value = picked.title;
          onSelect(picked);
          close();
        } else if (lastResults.length === 1) {
          const picked = lastResults[0];
          input.value = picked.title;
          onSelect(picked);
          close();
        }
      } else if (e.key === 'Escape') {
        close();
      }
    });

    document.addEventListener('click', (e) => {
      if (!input.contains(e.target) && !dropdown.contains(e.target)) close();
    });
  },

  renderMedia(el) {
    el.innerHTML = `
          <div class="max-w-3xl mx-auto fade-in">
            <header class="mb-6">
              <h2 class="text-lg font-semibold text-ink-900">Product images</h2>
              <p class="text-sm text-ink-500 mt-0.5">
                Add 1–10 images. Drag to reorder. The first image is used as the primary image.
                Images upload when you submit the product.
              </p>
            </header>

            <div class="field" data-field="media">
              <div id="dropzone" class="dropzone">
                <input id="fileInput" type="file" accept="image/jpeg,image/png,image/webp" multiple class="hidden">
                <div class="w-12 h-12 rounded-full bg-brand-light text-brand flex items-center justify-center mx-auto mb-3">
                  <i data-lucide="upload-cloud" class="w-5 h-5"></i>
                </div>
                <p class="text-sm font-medium text-ink-900">Drop images here or click to browse</p>
                <p class="text-xs text-ink-400 mt-1">
                  JPEG, PNG or WebP · max 5MB each · 1–10 images total
                </p>
              </div>
              <p class="field-msg hidden mt-2 text-xs text-red-600"></p>
            </div>

            <div class="mt-5 flex items-center justify-between">
              <p class="text-xs text-ink-500">
                <span id="mediaCount">0</span> of 10 images
              </p>
              <p id="mediaPrimaryHint" class="text-xs text-ink-400"></p>
            </div>

            <div id="mediaGrid" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mt-3"></div>

            <div id="mediaEmptyState" class="mt-3 rounded-xl border border-dashed border-ink-200 p-8 text-center">
              <i data-lucide="image-off" class="w-5 h-5 text-ink-300 mx-auto"></i>
              <p class="text-xs text-ink-400 mt-2">No images yet. Add at least one to continue.</p>
            </div>
          </div>
        `;
    if (window.lucide) lucide.createIcons();
    this.wireMediaStep();
    this.renderMediaGrid();
  },

  wireMediaStep() {
    const dropzone = document.getElementById('dropzone');
    const fileInput = document.getElementById('fileInput');

    dropzone.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => this.handleFiles(e.target.files));

    ['dragenter', 'dragover'].forEach(ev =>
      dropzone.addEventListener(ev, (e) => {
        e.preventDefault();
        dropzone.classList.add('is-dragover');
      }));
    ['dragleave', 'drop'].forEach(ev =>
      dropzone.addEventListener(ev, (e) => {
        e.preventDefault();
        dropzone.classList.remove('is-dragover');
      }));
    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      if (e.dataTransfer?.files) this.handleFiles(e.dataTransfer.files);
    });
  },

  async handleFiles(fileList) {
    const files = Array.from(fileList || []);
    const remaining = 10 - State.media.length;

    if (remaining <= 0) {
      Toast.show('warning', 'You have reached the 10-image limit.');
      return;
    }

    const toAdd = files.slice(0, remaining);
    if (files.length > remaining) {
      Toast.show('info', `Only the first ${remaining} image(s) were added (10 total max).`);
    }

    for (const file of toAdd) {
      const err = this.validateFile(file);
      if (err) {
        Toast.show('error', `${file.name}: ${err}`);
        continue;
      }

      State.media.push({
        localId: uid('m'),
        file,
        url: URL.createObjectURL(file),
        name: file.name
      });
      State.dirty = true;
    }
    this.renderMediaGrid();
  },

  validateFile(file) {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) return 'Unsupported type. Use JPEG, PNG, or WebP.';
    if (file.size > 5 * 1024 * 1024) return 'File exceeds 5MB.';
    return null;
  },

  renderMediaGrid() {
    const grid = document.getElementById('mediaGrid');
    const empty = document.getElementById('mediaEmptyState');
    const count = document.getElementById('mediaCount');
    const primaryHint = document.getElementById('mediaPrimaryHint');

    count.textContent = State.media.length;
    empty.classList.toggle('hidden', State.media.length > 0);

    if (!State.media.length) {
      grid.innerHTML = '';
      primaryHint.textContent = '';
      return;
    }

    grid.innerHTML = State.media.map((m, i) => {
      const isPrimary = i === 0;
      return `
            <div class="media-tile ${isPrimary ? 'is-primary' : ''}" data-media-id="${m.localId}" draggable="true">
              <img src="${m.url}" alt="${escapeHtml(m.name)}">
              ${isPrimary ? '<span class="primary-badge">Primary</span>' : ''}
              <div class="media-overlay">
                <div class="flex items-center justify-between gap-2">
                  <button type="button" data-remove="${m.localId}"
                    class="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white transition" title="Remove">
                    <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                  </button>
                  ${!isPrimary ? `
                    <button type="button" data-make-primary="${m.localId}"
                      class="text-[10px] font-semibold text-white px-2 py-1 rounded-md bg-white/20 hover:bg-white/30 transition">
                      Set primary
                    </button>
                  ` : ''}
                </div>
              </div>
            </div>
          `;
    }).join('');

    if (window.lucide) lucide.createIcons();

    grid.querySelectorAll('[data-remove]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.removeMedia(btn.dataset.remove);
      });
    });
    grid.querySelectorAll('[data-make-primary]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.makePrimary(btn.dataset.makePrimary);
      });
    });

    let dragSrc = null;
    grid.querySelectorAll('.media-tile').forEach(tile => {
      tile.addEventListener('dragstart', () => {
        dragSrc = tile.dataset.mediaId;
        tile.classList.add('is-dragging');
      });
      tile.addEventListener('dragend', () => tile.classList.remove('is-dragging'));
      tile.addEventListener('dragover', (e) => e.preventDefault());
      tile.addEventListener('drop', (e) => {
        e.preventDefault();
        const target = tile.dataset.mediaId;
        if (dragSrc && target && dragSrc !== target) this.reorderMedia(dragSrc, target);
      });
    });

    primaryHint.textContent = State.media.length > 0 ? `Primary: ${State.media[0].name}` : '';
  },

  removeMedia(localId) {
    State.media = State.media.filter(m => m.localId !== localId);
    this.renderMediaGrid();
    State.dirty = true;
  },

  makePrimary(localId) {
    const idx = State.media.findIndex(m => m.localId === localId);
    if (idx <= 0) return;
    const [item] = State.media.splice(idx, 1);
    State.media.unshift(item);
    this.renderMediaGrid();
    State.dirty = true;
  },

  reorderMedia(srcId, targetId) {
    const srcIdx = State.media.findIndex(m => m.localId === srcId);
    const tgtIdx = State.media.findIndex(m => m.localId === targetId);
    if (srcIdx < 0 || tgtIdx < 0) return;
    const [item] = State.media.splice(srcIdx, 1);
    State.media.splice(tgtIdx, 0, item);
    this.renderMediaGrid();
    State.dirty = true;
  },

  async renderVariants(el) {
    el.innerHTML = `<div class="py-12 text-center text-ink-400 text-sm">Loading family attributes…</div>`;

    let attributes = [];
    try {
      if (State.product.family_id) {
        const res = await Api.get(`/attributes/for-family/${State.product.family_id}`);
        attributes = res.attributes || res.data || [];
      }
    } catch (err) {
      console.warn('[cataloging] attribute load failed', err);
    }
    State.familyAttributes = attributes;

    const hasAttrs = attributes.length > 0;

    el.innerHTML = `
          <div class="fade-in">
            <header class="mb-6">
              <h2 class="text-lg font-semibold text-ink-900">Variants</h2>
              <p class="text-sm text-ink-500 mt-0.5">
                Register each configuration of this product — colour, RAM, storage, etc.
              </p>
            </header>

            ${!hasAttrs ? `
              <div class="rounded-xl border border-amber-200 bg-amber-50 p-5 mb-5">
                <div class="flex items-start gap-3">
                  <i data-lucide="alert-triangle" class="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5"></i>
                  <div class="text-sm text-amber-900">
                    <p class="font-semibold">No attributes are pre-configured for this family.</p>
                    <p class="mt-1">Use the searchable pickers below to add any attribute and its value.</p>
                  </div>
                </div>
              </div>
            ` : ''}

            <div class="flex items-center gap-1 p-1 bg-ink-100 rounded-xl w-fit mb-5">
              <button type="button" data-mode="single" class="mode-btn px-3 py-1.5 rounded-lg text-xs font-medium text-ink-500 transition active">Add one</button>
              <button type="button" data-mode="matrix" class="mode-btn px-3 py-1.5 rounded-lg text-xs font-medium text-ink-500 transition">Generate from combinations</button>
            </div>

            <div id="modeSingle" class="space-y-4">
              <div class="rounded-xl border border-ink-200 p-4 sm:p-5 bg-ink-50/30">
                <div class="flex items-center justify-between mb-4">
                  <div>
                    <p class="text-sm font-semibold text-ink-900">New variant</p>
                    <p class="text-xs text-ink-500 mt-0.5">Search an attribute, then pick one of its values.</p>
                  </div>
                  <button type="button" id="addAttributeRowBtn"
                    class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-ink-200 bg-white text-xs font-semibold text-ink-700 hover:bg-ink-50 transition">
                    <i data-lucide="plus" class="w-3.5 h-3.5"></i>
                    Add attribute
                  </button>
                </div>

                <div id="attrRows" class="space-y-2.5 mb-4"></div>

                <div id="attrRowsEmpty" class="rounded-lg border border-dashed border-ink-200 p-4 text-center">
                  <p class="text-xs text-ink-400">No attributes yet. Click "Add attribute" to start.</p>
                </div>

                <div class="grid sm:grid-cols-3 gap-3 pt-3 border-t border-ink-200">
                  <div class="field" data-field="v_sku">
                    <label class="block text-xs font-medium text-ink-700 mb-1">SKU <span class="text-brand">*</span></label>
                    <input id="v_sku" type="text" placeholder="XPS13-16-512-SLV"
                      class="w-full px-3 py-2 rounded-lg border border-ink-200 bg-white text-sm font-mono focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/10">
                    <p class="field-msg hidden mt-1 text-xs text-red-600"></p>
                  </div>
                  <div class="field" data-field="v_barcode">
                    <label class="block text-xs font-medium text-ink-700 mb-1">Barcode <span class="text-ink-400">(optional)</span></label>
                    <input id="v_barcode" type="text" placeholder="EAN / UPC"
                      class="w-full px-3 py-2 rounded-lg border border-ink-200 bg-white text-sm font-mono focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/10">
                    <p class="field-msg hidden mt-1 text-xs text-red-600"></p>
                  </div>
                  <div class="field" data-field="v_weight">
                    <label class="block text-xs font-medium text-ink-700 mb-1">Weight (grams) <span class="text-ink-400">(optional)</span></label>
                    <input id="v_weight" type="number" min="0" step="1" placeholder="1350"
                      class="w-full px-3 py-2 rounded-lg border border-ink-200 bg-white text-sm focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/10">
                    <p class="field-msg hidden mt-1 text-xs text-red-600"></p>
                  </div>
                </div>

                <div class="mt-4 flex items-center justify-end">
                  <button type="button" id="addVariantBtn"
                    class="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand text-white text-sm font-semibold hover:bg-brand-dark transition">
                    <i data-lucide="plus" class="w-4 h-4"></i>
                    Add variant
                  </button>
                </div>
              </div>
            </div>

            <div id="modeMatrix" class="hidden space-y-4">
              <div class="rounded-xl border border-ink-200 p-4 sm:p-5 bg-ink-50/30">
                <p class="text-sm font-semibold text-ink-900 mb-1">Combination builder</p>
                <p class="text-xs text-ink-500 mb-4">Select values for each attribute. Every combination becomes a variant.</p>

                <div id="matrixSelectors" class="space-y-4"></div>

                <div class="mt-5 flex items-center justify-between gap-3">
                  <p class="text-xs text-ink-500">
                    <span id="matrixCount">0</span> combination(s) will be generated
                  </p>
                  <button type="button" id="generateBtn"
                    class="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand text-white text-sm font-semibold hover:bg-brand-dark transition disabled:opacity-50 disabled:cursor-not-allowed">
                    <i data-lucide="sparkles" class="w-4 h-4"></i>
                    Generate variants
                  </button>
                </div>
              </div>
            </div>

            <div class="mt-6">
              <div class="flex items-center justify-between mb-3">
                <p class="text-sm font-semibold text-ink-900">
                  Registered variants
                  <span class="text-ink-400 font-normal ml-1" id="variantCountLabel">(0)</span>
                </p>
                <button type="button" id="clearVariantsBtn" class="hidden text-xs font-medium text-red-600 hover:text-red-800">Clear all</button>
              </div>

              <div id="variantEmpty" class="rounded-xl border border-dashed border-ink-200 p-8 text-center">
                <i data-lucide="boxes" class="w-5 h-5 text-ink-300 mx-auto"></i>
                <p class="text-xs text-ink-400 mt-2">No variants yet.</p>
              </div>

              <div id="variantTableWrap" class="hidden overflow-x-auto rounded-xl border border-ink-200">
                <table class="variant-table w-full">
                  <thead>
                    <tr>
                      <th>SKU</th>
                      <th>Attributes</th>
                      <th>Weight</th>
                      <th>Barcode</th>
                      <th class="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody id="variantTableBody"></tbody>
                </table>
              </div>
            </div>
          </div>
        `;
    if (window.lucide) lucide.createIcons();

    State.variantDraft.rows = [{
      id: uid('r'),
      attribute: null,
      value: null
    }];

    this.renderAttributeRows();
    this.renderMatrixSelectors();
    this.renderVariantTable();
    this.wireVariantStep();
  },

  renderAttributeRows() {
    const wrap = document.getElementById('attrRows');
    const empty = document.getElementById('attrRowsEmpty');
    if (!wrap) return;

    const rows = State.variantDraft.rows;

    if (!rows.length) {
      wrap.innerHTML = '';
      empty.classList.remove('hidden');
      return;
    }

    empty.classList.add('hidden');

    wrap.innerHTML = rows.map(r => `
          <div class="attr-row grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2 items-start"
               data-row-id="${r.id}">
            <div class="relative">
              <input type="text" data-attr-input
                placeholder="Search attribute…"
                value="${r.attribute ? escapeHtml(r.attribute.title) : ''}"
                autocomplete="off"
                class="w-full px-3 py-2 rounded-lg border border-ink-200 bg-white text-sm focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/10">
              <div data-attr-dropdown
                class="hidden absolute z-30 left-0 right-0 top-full mt-1 bg-white border border-ink-200 rounded-xl shadow-pop max-h-56 overflow-y-auto"></div>
            </div>

            <div class="relative">
              <input type="text" data-value-input
                placeholder="${r.attribute ? 'Search value…' : 'Select an attribute first'}"
                value="${r.value ? escapeHtml(r.value.value) : ''}"
                autocomplete="off"
                ${r.attribute ? '' : 'disabled'}
                class="w-full px-3 py-2 rounded-lg border border-ink-200 bg-white text-sm focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 disabled:bg-ink-50 disabled:cursor-not-allowed disabled:text-ink-400">
              <div data-value-dropdown
                class="hidden absolute z-30 left-0 right-0 top-full mt-1 bg-white border border-ink-200 rounded-xl shadow-pop max-h-56 overflow-y-auto"></div>
            </div>

            <button type="button" data-remove-row
              class="p-2 rounded-lg text-ink-400 hover:text-red-600 hover:bg-red-50 transition self-start"
              title="Remove attribute">
              <i data-lucide="x" class="w-4 h-4"></i>
            </button>
          </div>
        `).join('');

    if (window.lucide) lucide.createIcons();

    wrap.querySelectorAll('.attr-row').forEach(rowEl => {
      const rowId = rowEl.dataset.rowId;
      const row = State.variantDraft.rows.find(r => r.id === rowId);
      if (!row) return;

      this._wireAttributePicker(rowEl, row);
      this._wireValuePicker(rowEl, row);

      rowEl.querySelector('[data-remove-row]')?.addEventListener('click', () => {
        State.variantDraft.rows = State.variantDraft.rows.filter(r => r.id !== rowId);
        this.renderAttributeRows();
      });
    });
  },

  _wireAttributePicker(rowEl, row) {
    const input = rowEl.querySelector('[data-attr-input]');
    const dropdown = rowEl.querySelector('[data-attr-dropdown]');
    if (!input || !dropdown) return;

    let debounce;
    let results = [];
    let activeIndex = -1;

    const close = () => {
      dropdown.classList.add('hidden');
      activeIndex = -1;
    };

    const render = (items) => {
      results = items;
      if (!items.length) {
        dropdown.innerHTML = `<div class="px-3 py-2.5 text-xs text-ink-400">No matches.</div>`;
        dropdown.classList.remove('hidden');
        return;
      }
      dropdown.innerHTML = items.map((it, i) => `
            <button type="button" data-index="${i}"
              class="w-full text-left px-3 py-2 text-sm hover:bg-ink-50 transition truncate ${i === activeIndex ? 'bg-ink-50' : ''}">
              ${escapeHtml(it.title)}
            </button>
          `).join('');
      dropdown.classList.remove('hidden');

      dropdown.querySelectorAll('[data-index]').forEach(btn => {
        btn.addEventListener('click', () => {
          const picked = results[parseInt(btn.dataset.index, 10)];
          this._selectAttributeForRow(row, picked);
          close();
        });
      });
    };

    const search = async () => {
      const key = input.value.trim();
      try {
        const res = await Api.get('/attributes/s/', {
          key,
          limit: 20
        });
        const items = (res.data || res.attributes || []).map(a => ({
          id: a.id,
          title: a.title
        }));

        const usedIds = new Set(
          State.variantDraft.rows
            .filter(r => r.id !== row.id && r.attribute)
            .map(r => String(r.attribute.id))
        );
        const filtered = items.filter(a => !usedIds.has(String(a.id)));

        render(filtered.slice(0, 20));
      } catch (err) {
        dropdown.innerHTML = `<div class="px-3 py-2.5 text-xs text-red-600">Couldn't load attributes.</div>`;
        dropdown.classList.remove('hidden');
      }
    };

    input.addEventListener('input', () => {
      if (!input.value.trim() && row.attribute) {
        row.attribute = null;
        row.value = null;
        this.renderAttributeRows();
        return;
      }
      clearTimeout(debounce);
      debounce = setTimeout(search, 200);
    });

    input.addEventListener('focus', () => {
      if (row.attribute) input.select();
      search();
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (!results.length) return;
        activeIndex = Math.min(activeIndex + 1, results.length - 1);
        render(results);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        activeIndex = Math.max(activeIndex - 1, 0);
        render(results);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (activeIndex >= 0 && results[activeIndex]) {
          this._selectAttributeForRow(row, results[activeIndex]);
          close();
        } else if (results.length === 1) {
          this._selectAttributeForRow(row, results[0]);
          close();
        }
      } else if (e.key === 'Escape') {
        close();
      }
    });

    document.addEventListener('click', (e) => {
      if (!input.contains(e.target) && !dropdown.contains(e.target)) close();
    });
  },

  _wireValuePicker(rowEl, row) {
    const input = rowEl.querySelector('[data-value-input]');
    const dropdown = rowEl.querySelector('[data-value-dropdown]');
    if (!input || !dropdown || !row.attribute) return;

    let debounce;
    let results = [];
    let activeIndex = -1;

    const close = () => {
      dropdown.classList.add('hidden');
      activeIndex = -1;
    };

    const render = (items) => {
      results = items;
      if (!items.length) {
        dropdown.innerHTML = `<div class="px-3 py-2.5 text-xs text-ink-400">No values match.</div>`;
        dropdown.classList.remove('hidden');
        return;
      }
      dropdown.innerHTML = items.map((it, i) => {
        const colorCode = it.meta?.code;
        const swatch = colorCode ?
          `<span class="inline-block w-3 h-3 rounded-full border border-gray-300 flex-shrink-0" style="background:${escapeHtml(colorCode)}"></span>` :
          '';
        return `
              <button type="button" data-index="${i}"
                class="w-full text-left px-3 py-2 text-sm hover:bg-ink-50 transition flex items-center gap-2 ${i === activeIndex ? 'bg-ink-50' : ''}">
                ${swatch}
                <span class="truncate">${escapeHtml(it.value)}</span>
              </button>
            `;
      }).join('');
      dropdown.classList.remove('hidden');

      dropdown.querySelectorAll('[data-index]').forEach(btn => {
        btn.addEventListener('click', () => {
          const picked = results[parseInt(btn.dataset.index, 10)];
          row.value = {
            id: picked.id,
            value: picked.value,
            meta: picked.meta || {}
          };
          close();
          this.renderAttributeRows();
        });
      });
    };

    const search = async () => {
      const key = input.value.trim();
      try {
        const res = await Api.get(`/attributes/${encodeURIComponent(row.attribute.id)}/values/s`, {
          key,
          limit: 30
        });
        const items = (res.attributeValues || res.values || res.data || []).map(v => ({
          id: v.id,
          value: v.value,
          meta: v.meta || {}
        }));
        render(items.slice(0, 30));
      } catch (err) {
        dropdown.innerHTML = `<div class="px-3 py-2.5 text-xs text-red-600">Couldn't load values.</div>`;
        dropdown.classList.remove('hidden');
      }
    };

    input.addEventListener('input', () => {
      if (!input.value.trim() && row.value) {
        row.value = null;
        this.renderAttributeRows();
        return;
      }
      clearTimeout(debounce);
      debounce = setTimeout(search, 200);
    });

    input.addEventListener('focus', () => {
      if (row.value) input.select();
      search();
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (!results.length) return;
        activeIndex = Math.min(activeIndex + 1, results.length - 1);
        render(results);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        activeIndex = Math.max(activeIndex - 1, 0);
        render(results);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (activeIndex >= 0 && results[activeIndex]) {
          const picked = results[activeIndex];
          row.value = {
            id: picked.id,
            value: picked.value,
            meta: picked.meta || {}
          };
          close();
          this.renderAttributeRows();
        } else if (results.length === 1) {
          const picked = results[0];
          row.value = {
            id: picked.id,
            value: picked.value,
            meta: picked.meta || {}
          };
          close();
          this.renderAttributeRows();
        }
      } else if (e.key === 'Escape') {
        close();
      }
    });

    document.addEventListener('click', (e) => {
      if (!input.contains(e.target) && !dropdown.contains(e.target)) close();
    });
  },

  _selectAttributeForRow(row, attribute) {
    const dup = State.variantDraft.rows.find(
      r => r.id !== row.id && r.attribute && String(r.attribute.id) === String(attribute.id)
    );
    if (dup) {
      Toast.show('warning', `"${attribute.title}" is already added.`);
      return;
    }

    row.attribute = {
      id: attribute.id,
      title: attribute.title
    };
    row.value = null;

    const skuEl = document.getElementById('v_sku');
    if (skuEl && !skuEl.value.trim() && State.product.slug) {
      skuEl.value = State.product.slug.toUpperCase();
    }

    this.renderAttributeRows();

    setTimeout(() => {
      const rowEl = document.querySelector(`[data-row-id="${row.id}"]`);
      rowEl?.querySelector('[data-value-input]')?.focus();
    }, 50);
  },

  renderMatrixSelectors() {
    const wrap = document.getElementById('matrixSelectors');
    if (!wrap) return;
    const attrs = State.familyAttributes;

    if (!attrs.length) {
      wrap.innerHTML = `<p class="text-xs text-ink-400">No pre-configured attributes available for this family.</p>`;
      const btn = document.getElementById('generateBtn');
      if (btn) btn.disabled = true;
      return;
    }

    wrap.innerHTML = attrs.map(a => `
          <div>
            <p class="text-xs font-medium text-ink-700 mb-2">${escapeHtml(a.title)}</p>
            <div class="flex flex-wrap gap-1.5" data-matrix-attr="${a.id}">
              ${(a.values || []).map(v => `
                <label class="cursor-pointer">
                  <input type="checkbox" value="${v.id}" data-matrix-value="${v.id}" class="peer hidden">
                  <span class="inline-block px-2.5 py-1 rounded-full text-xs font-medium border border-ink-200 bg-white text-ink-500 peer-checked:bg-brand peer-checked:text-white peer-checked:border-brand transition">
                    ${escapeHtml(v.value)}
                  </span>
                </label>
              `).join('')}
            </div>
          </div>
        `).join('');

    wrap.querySelectorAll('input[type=checkbox]').forEach(cb => {
      cb.addEventListener('change', () => this.updateMatrixCount());
    });
    this.updateMatrixCount();
  },

  updateMatrixCount() {
    const counts = [];
    document.querySelectorAll('[data-matrix-attr]').forEach(group => {
      const checked = group.querySelectorAll('input[type=checkbox]:checked').length;
      if (checked > 0) counts.push(checked);
    });
    const total = counts.reduce((a, b) => a * b, 1) || 0;
    const label = document.getElementById('matrixCount');
    if (label) label.textContent = total;
    const btn = document.getElementById('generateBtn');
    if (btn) btn.disabled = total === 0;
  },

  generateMatrixVariants() {
    const attrs = State.familyAttributes;
    const groups = [];

    attrs.forEach(a => {
      const wrap = document.querySelector(`[data-matrix-attr="${a.id}"]`);
      if (!wrap) return;
      const checked = Array.from(wrap.querySelectorAll('input[type=checkbox]:checked'))
        .map(cb => cb.value);
      if (checked.length > 0) groups.push({
        attribute: a,
        values: checked
      });
    });

    if (!groups.length) return;

    let combos = [
      []
    ];
    for (const g of groups) {
      const next = [];
      for (const combo of combos) {
        for (const v of g.values) {
          next.push([...combo, {
            attribute: g.attribute,
            value_id: v
          }]);
        }
      }
      combos = next;
    }

    const existingKeys = new Set(State.variants.map(v => this.comboKey(v.attributes)));
    const before = State.variants.length;

    for (const combo of combos) {
      const attributes = {};
      const displays = [];

      for (const item of combo) {
        attributes[item.attribute.id] = item.value_id;
        const val = (item.attribute.values || []).find(x => String(x.id) === String(item.value_id));
        if (val) {
          displays.push({
            attributeId: item.attribute.id,
            attributeTitle: item.attribute.title,
            valueId: val.id,
            valueLabel: val.value,
            valueMeta: val.meta || {}
          });
        }
      }

      const key = this.comboKey(attributes);
      if (existingKeys.has(key)) continue;
      existingKeys.add(key);

      const skuBase = [State.product.slug, ...displays.map(d => d.valueLabel)].join('-');
      const sku = slugify(skuBase).toUpperCase().slice(0, 60);

      State.variants.push({
        localId: uid('v'),
        sku,
        barcode: '',
        weight_grams: null,
        status: 'available',
        attributes,
        _attributeDisplays: displays
      });
    }

    const added = State.variants.length - before;
    if (added > 0) {
      Toast.show('success', `${added} variant${added === 1 ? '' : 's'} added.`);
      State.dirty = true;
    } else {
      Toast.show('info', 'All combinations already exist.');
    }
    this.renderVariantTable();
  },

  comboKey(attributes) {
    return Object.keys(attributes)
      .sort((a, b) => String(a).localeCompare(String(b)))
      .map(k => `${k}:${attributes[k]}`)
      .join('|');
  },

  wireVariantStep() {
    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.mode-btn').forEach(b => b.classList.toggle('active', b === btn));
        const mode = btn.dataset.mode;
        document.getElementById('modeSingle').classList.toggle('hidden', mode !== 'single');
        document.getElementById('modeMatrix').classList.toggle('hidden', mode !== 'matrix');
      });
    });

    document.getElementById('addAttributeRowBtn')?.addEventListener('click', () => {
      State.variantDraft.rows.push({
        id: uid('r'),
        attribute: null,
        value: null
      });
      this.renderAttributeRows();
      setTimeout(() => {
        const rows = document.querySelectorAll('#attrRows .attr-row');
        const last = rows[rows.length - 1];
        last?.querySelector('[data-attr-input]')?.focus();
      }, 30);
    });

    document.getElementById('addVariantBtn')?.addEventListener('click', () => this.addSingleVariant());
    document.getElementById('generateBtn')?.addEventListener('click', () => this.generateMatrixVariants());

    document.getElementById('clearVariantsBtn')?.addEventListener('click', () => {
      if (!State.variants.length) return;
      if (!confirm('Remove all registered variants?')) return;
      State.variants = [];
      this.renderVariantTable();
      State.dirty = true;
    });
  },

  addSingleVariant() {
    const rows = State.variantDraft.rows;
    const complete = rows.filter(r => r.attribute && r.value);

    if (!complete.length) {
      Toast.show('error', 'Add at least one attribute and pick a value.');
      return;
    }

    const incomplete = rows.filter(r => (r.attribute && !r.value) || (!r.attribute && r.value));
    if (incomplete.length) {
      Toast.show('warning', 'Finish or remove incomplete attribute rows.');
      return;
    }

    const attributes = {};
    const displays = [];
    for (const r of complete) {
      attributes[r.attribute.id] = r.value.id;
      displays.push({
        attributeId: r.attribute.id,
        attributeTitle: r.attribute.title,
        valueId: r.value.id,
        valueLabel: r.value.value,
        valueMeta: r.value.meta || {}
      });
    }

    const key = this.comboKey(attributes);
    if (State.variants.some(v => this.comboKey(v.attributes) === key)) {
      Toast.show('error', 'A variant with this attribute combination already exists.');
      return;
    }

    const sku = document.getElementById('v_sku').value.trim();
    if (!sku) {
      Toast.show('error', 'SKU is required.');
      document.getElementById('v_sku').focus();
      return;
    }
    if (State.variants.some(v => v.sku.toLowerCase() === sku.toLowerCase())) {
      Toast.show('error', `SKU "${sku}" is already used.`);
      return;
    }

    State.variants.push({
      localId: uid('v'),
      sku,
      barcode: document.getElementById('v_barcode').value.trim(),
      weight_grams: parseInt(document.getElementById('v_weight').value, 10) || null,
      status: 'available',
      attributes,
      _attributeDisplays: displays
    });

    document.getElementById('v_sku').value = '';
    document.getElementById('v_barcode').value = '';
    document.getElementById('v_weight').value = '';

    State.variantDraft.rows = [{
      id: uid('r'),
      attribute: null,
      value: null
    }];
    this.renderAttributeRows();
    this.renderVariantTable();
    State.dirty = true;
    Toast.show('success', 'Variant added.');
  },

  renderVariantTable() {
    const tbody = document.getElementById('variantTableBody');
    const empty = document.getElementById('variantEmpty');
    const wrap = document.getElementById('variantTableWrap');
    const label = document.getElementById('variantCountLabel');
    const clearBtn = document.getElementById('clearVariantsBtn');

    label.textContent = `(${State.variants.length})`;

    if (!State.variants.length) {
      empty.classList.remove('hidden');
      wrap.classList.add('hidden');
      clearBtn?.classList.add('hidden');
      if (window.lucide) lucide.createIcons();
      return;
    }

    empty.classList.add('hidden');
    wrap.classList.remove('hidden');
    clearBtn?.classList.remove('hidden');

    tbody.innerHTML = State.variants.map(v => {
      const displays = v._attributeDisplays || [];

      const attrChips = displays.map(d => {
        const colorCode = d.valueMeta?.code;
        const swatch = colorCode ?
          `<span class="swatch" style="background:${escapeHtml(colorCode)}"></span>` :
          '';
        return `<span class="attr-chip">${swatch}${escapeHtml(d.attributeTitle)}: ${escapeHtml(d.valueLabel)}</span>`;
      }).join(' ');

      return `
            <tr data-variant-id="${v.localId}">
              <td class="font-mono text-xs">${escapeHtml(v.sku)}</td>
              <td><div class="flex flex-wrap gap-1.5">${attrChips || '<span class="text-ink-400 text-xs">—</span>'}</div></td>
              <td class="text-xs">${v.weight_grams ? `${v.weight_grams} g` : '<span class="text-ink-400">—</span>'}</td>
              <td class="font-mono text-xs">${escapeHtml(v.barcode) || '<span class="text-ink-400">—</span>'}</td>
              <td class="text-right">
                <button type="button" data-remove-variant="${v.localId}"
                  class="p-1.5 rounded-lg text-red-600 hover:bg-red-50 transition" title="Remove">
                  <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                </button>
              </td>
            </tr>
          `;
    }).join('');

    if (window.lucide) lucide.createIcons();

    tbody.querySelectorAll('[data-remove-variant]').forEach(btn => {
      btn.addEventListener('click', () => {
        State.variants = State.variants.filter(v => v.localId !== btn.dataset.removeVariant);
        this.renderVariantTable();
        State.dirty = true;
      });
    });
  },

  renderReview(el) {
    const p = State.product;
    const variants = State.variants;
    const media = State.media;

    el.innerHTML = `
          <div class="max-w-3xl mx-auto fade-in">
            <header class="mb-6">
              <h2 class="text-lg font-semibold text-ink-900">Review &amp; submit</h2>
              <p class="text-sm text-ink-500 mt-0.5">
                Check everything below. When you submit, the product, all variants, and all
                images are sent to the server together as a single catalog request.
              </p>
            </header>

            <div class="rounded-xl border border-ink-200 divide-y divide-ink-100 overflow-hidden">

              <div class="p-5">
                <div class="flex items-center justify-between mb-3">
                  <p class="text-[11px] uppercase tracking-wider font-semibold text-ink-400">Product</p>
                  <button type="button" data-edit="product" class="text-xs font-semibold text-brand hover:text-brand-dark">Edit</button>
                </div>
                <dl class="space-y-2 text-sm">
                  <div class="grid grid-cols-[100px_1fr] gap-3">
                    <dt class="text-ink-500">Family</dt>
                    <dd class="text-ink-900 font-medium">${escapeHtml(p.family_title) || '—'}</dd>
                  </div>
                  <div class="grid grid-cols-[100px_1fr] gap-3">
                    <dt class="text-ink-500">Brand</dt>
                    <dd class="text-ink-900 font-medium">${escapeHtml(p.brand_title) || '—'}</dd>
                  </div>
                  <div class="grid grid-cols-[100px_1fr] gap-3">
                    <dt class="text-ink-500">Title</dt>
                    <dd class="text-ink-900 font-medium">${escapeHtml(p.title)}</dd>
                  </div>
                  <div class="grid grid-cols-[100px_1fr] gap-3">
                    <dt class="text-ink-500">Slug</dt>
                    <dd class="text-ink-900 font-mono text-xs">${escapeHtml(p.slug)}</dd>
                  </div>
                  <div class="grid grid-cols-[100px_1fr] gap-3">
                    <dt class="text-ink-500">Gender</dt>
                    <dd class="text-ink-700">${escapeHtml(p.target_gender.replace('_', ' '))}</dd>
                  </div>
                  <div class="grid grid-cols-[100px_1fr] gap-3">
                    <dt class="text-ink-500">Age</dt>
                    <dd class="text-ink-700">${escapeHtml(p.age_restriction.replace('_', ' '))}</dd>
                  </div>
                </dl>
              </div>

              <div class="p-5">
                <div class="flex items-center justify-between mb-3">
                  <p class="text-[11px] uppercase tracking-wider font-semibold text-ink-400">Description</p>
                  <button type="button" data-edit="product" class="text-xs font-semibold text-brand hover:text-brand-dark">Edit</button>
                </div>
                <div class="prose prose-sm max-w-none text-sm text-ink-700 line-clamp-4">
                  ${p.description || '<em class="text-ink-400">No description</em>'}
                </div>
              </div>

              <div class="p-5">
                <div class="flex items-center justify-between mb-3">
                  <p class="text-[11px] uppercase tracking-wider font-semibold text-ink-400">Variants (${variants.length})</p>
                  <button type="button" data-edit="variants" class="text-xs font-semibold text-brand hover:text-brand-dark">Edit</button>
                </div>
                <div class="space-y-2">
                                  ${variants.map(v => {
                      const displays = v._attributeDisplays || [];
                      const chips = displays.map(d =>
                        `<span class="attr-chip">${escapeHtml(d.attributeTitle)}: ${escapeHtml(d.valueLabel)}</span>`
                      ).join('');
                    return `
                                <div class="flex items-center justify-between gap-3 py-1.5 border-b border-ink-100 last:border-0">
                                  <span class="font-mono text-xs text-ink-700">${escapeHtml(v.sku)}</span>
                                  <div class="flex flex-wrap gap-1.5 justify-end">${chips}</div>
                                </div>
                              `;
                  }).join('')}
                </div>
              </div>

              <div class="p-5">
                <div class="flex items-center justify-between mb-3">
                  <p class="text-[11px] uppercase tracking-wider font-semibold text-ink-400">Media (${media.length})</p>
                  <button type="button" data-edit="media" class="text-xs font-semibold text-brand hover:text-brand-dark">Edit</button>
                </div>
                <div class="grid grid-cols-4 sm:grid-cols-6 gap-2">
                  ${media.slice(0, 6).map((m, i) => `
                    <div class="relative aspect-square rounded-lg overflow-hidden border border-ink-200">
                      <img src="${m.url}" class="w-full h-full object-cover">
                      ${i === 0 ? '<span class="absolute top-1 left-1 text-[9px] font-bold text-white bg-brand px-1.5 py-0.5 rounded">P</span>' : ''}
                    </div>
                  `).join('')}
                  ${media.length > 6 ? `
                    <div class="aspect-square rounded-lg border border-ink-200 bg-ink-50 flex items-center justify-center text-xs font-semibold text-ink-500">
                      +${media.length - 6}
                    </div>
                  ` : ''}
                </div>
                <p class="text-[11px] text-ink-400 mt-2">
                  ${media.length} image${media.length === 1 ? '' : 's'} queued for upload on submit.
                </p>
              </div>

            </div>

            <div class="mt-6 rounded-xl border border-blue-200 bg-blue-50 p-4">
              <div class="flex items-start gap-3">
                <i data-lucide="info" class="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5"></i>
                <p class="text-xs text-blue-900 leading-relaxed">
                  After you submit, this product enters the COCOCE review queue. You'll be
                  notified once it's verified. Once verified, you can create a store listing
                  and start selling.
                </p>
              </div>
            </div>
          </div>
        `;
    if (window.lucide) lucide.createIcons();

    el.querySelectorAll('[data-edit]').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.dataset.edit;
        const idx = STEPS.findIndex(s => s.id === target);
        if (idx >= 0) this.goTo(idx);
      });
    });
  },
  async validateCurrentStep() {
    const stepId = STEPS[State.currentStep].id;
    switch (stepId) {
      case 'welcome':
        return true;
      case 'product':
        return this.validateProductStep();
      case 'media':
        return this.validateMediaStep();
      case 'variants':
        return this.validateVariantsStep();
      case 'review':
        return this.validateReviewStep();
      default:
        return true;
    }
  },

  validateProductStep() {
    const p = State.product;
    this.clearFieldErrors();
    let ok = true;

    if (!p.family_id) {
      this.setFieldError('family_id', 'Select a product family.');
      ok = false;
    }
    if (!p.brand_id) {
      this.setFieldError('brand_id', 'Select a brand, or choose Unbranded / Generic.');
      ok = false;
    }

    const title = (p.title || '').trim();
    if (!title) {
      this.setFieldError('title', 'Product title is required.');
      ok = false;
    } else if (title.length > 255) {
      this.setFieldError('title', 'Title must be 255 characters or fewer.');
      ok = false;
    }

    const slug = (p.slug || '').trim();
    if (!slug) {
      this.setFieldError('slug', 'Slug is required.');
      ok = false;
    } else if (!/^[a-z0-9-]+$/.test(slug)) {
      this.setFieldError('slug', 'Slug may only contain lowercase letters, numbers, and hyphens.');
      ok = false;
    }

    if (!p.description_plain || p.description_plain.length < 30) {
      this.setFieldError('description', `Description must be at least 30 characters (currently ${p.description_plain?.length || 0}).`);
      ok = false;
    }

    if (p._familyRequested || p._brandRequested) {
      if (!(p.requested_reason || '').trim()) {
        this.setFieldError('requested_reason', 'Please provide a reason.');
        ok = false;
      }
    }

    if (!ok) Toast.show('error', 'Please fix the highlighted fields.');
    return ok;
  },

  validateMediaStep() {
    this.clearFieldErrors();
    if (State.media.length < 1) {
      this.setFieldError('media', 'Add at least one image.');
      Toast.show('error', 'At least one image is required.');
      return false;
    }
    if (State.media.length > 10) {
      this.setFieldError('media', 'Maximum 10 images.');
      return false;
    }
    const bad = State.media.some(m => !(m.file instanceof File));
    if (bad) {
      this.setFieldError('media', 'One or more images are invalid.');
      return false;
    }
    return true;
  },

  validateVariantsStep() {
    this.clearFieldErrors();
    if (!State.variants.length) {
      Toast.show('error', 'Add at least one variant before continuing.');
      return false;
    }
    const skus = new Set();
    for (const v of State.variants) {
      if (!v.sku) {
        Toast.show('error', 'Every variant needs a SKU.');
        return false;
      }
      const lower = v.sku.toLowerCase();
      if (skus.has(lower)) {
        Toast.show('error', `Duplicate SKU: ${v.sku}`);
        return false;
      }
      skus.add(lower);
    }
    return true;
  },

  validateReviewStep() {
    return (
      this.validateProductStep() &&
      this.validateMediaStep() &&
      this.validateVariantsStep()
    );
  },

  setFieldError(field, message) {
    const wrap = document.querySelector(`[data-field="${field}"]`);
    if (!wrap) return;
    wrap.classList.add('field-error');
    const msg = wrap.querySelector('.field-msg');
    if (msg) {
      msg.classList.remove('hidden');
      msg.textContent = message;
    }
  },

  clearFieldErrors() {
    document.querySelectorAll('.field-error').forEach(w => w.classList.remove('field-error'));
    document.querySelectorAll('.field-msg').forEach(m => m.classList.add('hidden'));
  },

  snapshotProductLocally() {
    const p = State.product;
    try {
      localStorage.setItem('local_catalog_product', JSON.stringify({
        family_id: p.family_id,
        brand_id: p.brand_id,
        title: p.title,
        slug: p.slug,
        description: p.description,
        target_gender: p.target_gender,
        age_restriction: p.age_restriction,
        requested_reason: p.requested_reason
      }));
    } catch (err) {
      console.warn('[cataloging] local snapshot failed', err);
    }
  },

  _buildSubmissionFormData() {
    const p = State.product;
    const fd = new FormData();

    fd.append('product[family_id]', p.family_id === '__unbranded__' ? '' : (p.family_id ?? ''));
    fd.append('product[brand_id]', p.brand_id === '__unbranded__' ? '' : (p.brand_id ?? ''));
    fd.append('product[title]', p.title.trim());
    fd.append('product[slug]', p.slug.trim());
    fd.append('product[description]', p.description || '');
    fd.append('product[target_gender]', p.target_gender || 'not_applied');
    fd.append('product[age_restriction]', p.age_restriction || 'not_applied');
    fd.append('product[requested_reason]', p.requested_reason || '');

    // ============================================================
    // Variants
    // ============================================================
    State.variants.forEach((v, vi) => {
      fd.append(`variants[${vi}][sku]`, v.sku);
      fd.append(`variants[${vi}][barcode]`, v.barcode || '');
      fd.append(`variants[${vi}][weight_grams]`, v.weight_grams != null ? String(v.weight_grams) : '');
      fd.append(`variants[${vi}][status]`, v.status || 'available');

      const attrPairs = Object.entries(v.attributes || {}).map(
        ([attribute_id, attribute_value_id]) => ({
          attribute_id,
          attribute_value_id
        })
      );
      attrPairs.forEach((pair, ai) => {
        fd.append(`variants[${vi}][attributes][${ai}][attribute_id]`, pair.attribute_id);
        fd.append(`variants[${vi}][attributes][${ai}][attribute_value_id]`, pair.attribute_value_id);
      });
    });

    State.media.forEach((m, mi) => {
      fd.append(`media[${mi}][file]`, m.file, m.name);
      fd.append(`media[${mi}][position]`, String(mi));
      fd.append(`media[${mi}][is_primary]`, mi === 0 ? 'true' : 'false');
    });

    return fd;
  },

  async submitFinal() {
    if (State.completing) return;
    State.completing = true;

    const btn = document.getElementById('btnNext');
    btn.disabled = true;
    const label = btn.querySelector('.btn-label');
    const original = label.textContent;
    label.textContent = 'Submitting...';

    try {
      const fd = this._buildSubmissionFormData();

      // Log for debugging — remove before shipping
      for (const [k, v] of fd.entries()) console.log(k, v);

      // const res = await Api.post('/cataloging/product', null, {
      //   raw: true,
      //   data: fd
      // });

      const res = await axios.post(`${CFG.protocal}business.${CFG.domainName}/cataloging/product`, fd, {
        withCredentials: true
      });

      console.log('[cataloging] submit response', res);
      this.renderSuccess(res);

    } catch (err) {
      console.error('[cataloging] submit failed', err);
      Toast.show('error', err.message || 'Submission failed. Please try again.');
      btn.disabled = false;
      label.textContent = original;
    } finally {
      State.completing = false;
    }
  },

  renderSuccess(response) {
    document.getElementById('wizardFooter').classList.add('hidden');
    const indicator = document.querySelector('.step-indicator');
    if (indicator) indicator.parentElement.style.display = 'none';

    const product = response?.product || response?.data || response || {};
    const productId = product.id || '';
    const productSlug = product.slug || State.product.slug;

    document.getElementById('wizardBody').innerHTML = `
          <div class="max-w-lg mx-auto text-center py-10 fade-in">
            <div class="mx-auto w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center">
              <div class="w-11 h-11 rounded-full bg-emerald-500 flex items-center justify-center">
                <i data-lucide="check" class="w-6 h-6 text-white" stroke-width="3"></i>
              </div>
            </div>

            <h2 class="mt-5 text-2xl font-bold text-ink-900">Product submitted</h2>
            <p class="mt-2 text-sm text-ink-500 leading-relaxed">
              <strong class="text-ink-900">${escapeHtml(State.product.title)}</strong>
              has been submitted for review. Our team will verify the details and notify
              you once it's approved.
            </p>

            <div class="mt-6 rounded-xl border border-ink-200 bg-ink-50 p-4 text-left">
              <p class="text-xs text-ink-500 leading-relaxed">
                <strong class="text-ink-900">What happens next?</strong><br>
                Products typically move through review within a few business days.
                Once verified, you can create a store listing, set pricing, and add
                inventory.
              </p>
            </div>

            <div class="mt-7 flex flex-col sm:flex-row items-center justify-center gap-3">
              ${productId ? `
                <a href="/products/${encodeURIComponent(productId)}" class="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-brand text-white text-sm font-semibold hover:bg-brand-dark transition">
                  <i data-lucide="package" class="w-4 h-4"></i>
                  View Product
                </a>
              ` : `
                <a href="/products" class="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-brand text-white text-sm font-semibold hover:bg-brand-dark transition">
                  <i data-lucide="package" class="w-4 h-4"></i>
                  My Products
                </a>
              `}
              <a href="/products/new" class="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-ink-200 bg-white text-sm font-medium text-ink-700 hover:bg-ink-50 transition">
                <i data-lucide="plus" class="w-4 h-4"></i>
                Register another
              </a>
              <a href="/dashboard" class="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-ink-200 bg-white text-sm font-medium text-ink-700 hover:bg-ink-50 transition">
                <i data-lucide="layout-dashboard" class="w-4 h-4"></i>
                Dashboard
              </a>
            </div>
          </div>
        `;
    if (window.lucide) lucide.createIcons();
    State.completing = false;
    State.dirty = false;
  }
};


document.addEventListener('DOMContentLoaded', () => {
  Wizard.init().catch(err => {
    console.error('[cataloging] init failed', err);
    Toast.show('error', 'Could not start the wizard.');
  });
});