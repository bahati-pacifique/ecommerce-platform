(function () {
    'use strict';

    const CFG = window.__APP__ || {};
    const STORES = Array.isArray(CFG.stores) ? CFG.stores : [];
    const API_BASE = `${CFG.protocal || location.protocol + '//'}api.${CFG.domainName || location.hostname}`;

    const state = {
        step: 0,
        store: null,
        existingDefault: null,
        isDefault: false,
        status: 'active',
        submitting: false,
        submitted: false,
        dirty: false,
        form: {
            title: '',
            description: '',
            address: ''
        }
    };

    const $ = (s, r = document) => r.querySelector(s);
    const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

    const els = {
        breadcrumb: $('#breadcrumb'),
        pageSubtitle: $('#pageSubtitle'),
        storeContextName: $('#storeContextName'),

        step0: $('#step0'),
        step1: $('#step1'),
        step2: $('#step2'),
        stepSuccess: $('#stepSuccess'),
        storeList: $('#storeList'),
        noStoresState: $('#noStoresState'),
        storeError: $('#storeError'),
        changeStoreBtn: $('#changeStoreBtn'),

        form: $('#inventoryForm'),
        title: $('#title'),
        titleCount: $('#titleCount'),
        description: $('#description'),
        address: $('#address'),
        isDefault: $('#is_default'),
        status: $('#status'),
        defaultConflict: $('#defaultConflict'),
        defaultConflictName: $('#defaultConflictName'),

        continueBtn: $('#continueBtn'),
        cancelBtn: $('#cancelBtn'),
        backBtn: $('#backBtn'),
        createBtn: $('#createBtn'),

        rvStore: $('#rv-store'),
        rvTitle: $('#rv-title'),
        rvDescription: $('#rv-description'),
        rvAddress: $('#rv-address'),
        rvDefault: $('#rv-default'),
        rvStatus: $('#rv-status'),

        submitError: $('#submitError'),
        submitErrorMsg: $('#submitErrorMsg'),

        successInvName: $('#successInvName'),
        successStoreName: $('#successStoreName'),
        viewInventoryBtn: $('#viewInventoryBtn'),
        addStockBtn: $('#addStockBtn'),

        unsavedModal: $('#unsavedModal'),
        stayBtn: $('#stayBtn'),
        leaveBtn: $('#leaveBtn'),
        defaultConfirmModal: $('#defaultConfirmModal'),
        confirmCurrentName: $('#confirmCurrentName'),
        keepOldDefaultBtn: $('#keepOldDefaultBtn'),
        replaceDefaultBtn: $('#replaceDefaultBtn'),

        helpLink: $('#helpLink')
    };

    const escapeHtml = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[c]));
    const refreshIcons = () => window.lucide?.createIcons?.();
    const notify = (type, message) => {
        if (window.Notification?.showNotification) window.Notification.showNotification({
            type,
            message
        });
        else console[type === 'error' ? 'error' : 'log'](`[${type}] ${message}`);
    };

    function goToStep(step) {
        state.step = step;
        [els.step0, els.step1, els.step2, els.stepSuccess].forEach(s => s.classList.add('hidden'));

        if (step === 0) {
            els.step0.classList.remove('hidden');
            els.step0.classList.add('rise');
        } else if (step === 1) {
            renderStoreBanner();
            renderBreadcrumb();
            els.step1.classList.remove('hidden');
            els.step1.classList.add('rise');
        } else if (step === 2) {
            renderReview();
            els.step2.classList.remove('hidden');
            els.step2.classList.add('rise');
        } else if (step === 'success') {
            els.stepSuccess.classList.remove('hidden');
            els.stepSuccess.classList.add('rise');
            state.submitted = true;
        }

        updateStepper(step);
        refreshIcons();
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    }

    function updateStepper(current) {
        const n = current === 'success' ? 2 : current;
        $$('.step-dot').forEach(dot => {
            const s = Number(dot.dataset.stepDot);
            if (s < n || current === 'success') {
                dot.className = 'step-dot bg-brand text-white';
                dot.innerHTML = '<i data-lucide="check" class="w-3.5 h-3.5"></i>';
            } else if (s === n) {
                dot.className = 'step-dot bg-brand text-white';
                dot.textContent = s + 1;
            } else {
                dot.className = 'step-dot bg-ink-100 text-ink-500';
                dot.textContent = s + 1;
            }
        });
        $$('.step-line').forEach(line => {
            const s = Number(line.dataset.stepLine);
            line.classList.toggle('done', s < n || current === 'success');
        });
        $$('[data-step]').forEach(li => {
            const s = Number(li.dataset.step);
            const label = li.querySelector('span:last-child');
            if (!label) return;
            if (s === n && current !== 'success') label.className = 'text-sm font-semibold text-ink-900 truncate';
            else if (s < n || current === 'success') label.className = 'text-sm font-semibold text-ink-700 truncate';
            else label.className = 'text-sm font-medium text-ink-500 truncate';
        });
        refreshIcons();
    }

    function renderStoreList() {
        if (!STORES.length) {
            els.noStoresState.classList.remove('hidden');
            els.storeList.classList.add('hidden');
            return;
        }
        els.noStoresState.classList.add('hidden');
        els.storeList.classList.remove('hidden');

        const autoSelect = STORES.length === 1;

        els.storeList.innerHTML = STORES.map(s => {
            const meta = [s.physical_address].filter(Boolean).join(' · ');
            const def = s.existingDefault?.title;
            return `
        <div role="radio" tabindex="0"
             class="store-card rounded-xl p-4 flex items-start gap-3.5"
             data-store-id="${escapeHtml(s.id)}"
             data-selected="${autoSelect ? 'true' : 'false'}"
             aria-checked="${autoSelect ? 'true' : 'false'}">
          <span class="check-dot mt-0.5">
            <i data-lucide="check" class="w-3 h-3"></i>
          </span>
          <div class="min-w-0 flex-1">
            <p class="text-sm font-semibold text-ink-900 truncate">${escapeHtml(s.name)}</p>
            ${meta ? `<p class="text-xs text-ink-500 mt-0.5 truncate">${escapeHtml(meta)}</p>` : ''}
            ${def ? `<p class="text-[11px] text-ink-400 mt-1.5 flex items-center gap-1">
                       <i data-lucide="star" class="w-3 h-3"></i> Default: ${escapeHtml(def)}
                     </p>` : ''}
          </div>
        </div>`;
        }).join('');

        $$('.store-card', els.storeList).forEach(card => {
            const select = () => selectStore(card.dataset.storeId);
            card.addEventListener('click', select);
            card.addEventListener('keydown', (e) => {
                if (e.key === ' ' || e.key === 'Enter') {
                    e.preventDefault();
                    select();
                }
            });
        });

        refreshIcons();

        if (autoSelect) selectStore(STORES[0].id, {
            silent: true
        });
    }

    function selectStore(storeId, {
        silent = false
    } = {}) {
        const store = STORES.find(s => String(s.id) === String(storeId));
        if (!store) return;

        state.store = store;
        state.existingDefault = store.existingDefault || null;

        $$('.store-card', els.storeList).forEach(c => {
            const isSel = String(c.dataset.storeId) === String(storeId);
            c.dataset.selected = isSel ? 'true' : 'false';
            c.setAttribute('aria-checked', isSel ? 'true' : 'false');
        });
        els.storeError.classList.add('hidden');

        // Reflect existing default conflict notice
        if (state.existingDefault) {
            els.defaultConflictName.textContent = state.existingDefault.title;
            els.defaultConflict.classList.remove('hidden');
        } else {
            els.defaultConflict.classList.add('hidden');
        }

        renderStoreBanner();
        renderBreadcrumb();

        if (!silent) {
            // Give the user a beat to see the selection, then advance
            setTimeout(() => goToStep(1), 180);
        } else {
            goToStep(1);
        }
    }

    function renderStoreBanner() {
        els.storeContextName.textContent = state.store?.name || '—';
    }

    function renderBreadcrumb() {
        const storeName = state.store?.name;
        els.breadcrumb.innerHTML = `
      <li><a href="/stores" class="hover:text-ink-900 transition">Stores</a></li>
      <li aria-hidden="true" class="text-ink-300">/</li>
      ${storeName ? `
        <li><span class="text-ink-700 truncate max-w-[140px] sm:max-w-none inline-block align-bottom">${escapeHtml(storeName)}</span></li>
        <li aria-hidden="true" class="text-ink-300">/</li>
      ` : ''}
      <li><a href="/inventory" class="hover:text-ink-900 transition">Inventory</a></li>
      <li aria-hidden="true" class="text-ink-300">/</li>
      <li aria-current="page" class="text-ink-900 font-medium">Create</li>
    `;
        els.pageSubtitle.textContent = storeName ?
            `Create a stock location for ${storeName}.` :
            'Choose a store and add a stock location for it.';
        refreshIcons();
    }

    /* ---------------- Validation ---------------- */
    function setFieldError(name, message) {
        const wrap = document.querySelector(`[data-field="${name}"]`);
        if (!wrap) return;
        const msg = wrap.querySelector('.field-msg');
        if (message) {
            wrap.classList.add('field-error');
            msg?.classList.remove('hidden');
            if (msg) msg.querySelector('span').textContent = message;
        } else {
            wrap.classList.remove('field-error');
            msg?.classList.add('hidden');
        }
    }

    function validateStep1() {
        setFieldError('title', '');
        const t = els.title.value.trim();
        if (!t) {
            setFieldError('title', 'Please enter an inventory name.');
            els.title.focus();
            return false;
        }
        if (t.length > 255) {
            setFieldError('title', 'Inventory name must be 255 characters or fewer.');
            return false;
        }
        return true;
    }

    /* ---------------- Review ---------------- */
    function renderReview() {
        syncFormToState();
        els.rvStore.textContent = state.store?.name || '—';
        els.rvTitle.textContent = state.form.title || '—';
        els.rvDescription.textContent = state.form.description || 'Not provided';
        els.rvAddress.textContent = state.form.address || 'Not provided';
        els.rvDescription.classList.toggle('text-ink-400', !state.form.description);
        els.rvAddress.classList.toggle('text-ink-400', !state.form.address);
        els.rvDefault.textContent = state.isDefault ? 'Yes' : 'No';
        els.rvDefault.className = `text-sm font-semibold ${state.isDefault ? 'text-brand' : 'text-ink-900'}`;

        const active = state.status === 'active';
        els.rvStatus.innerHTML = active ?
            `<span class="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700">
           <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Active
         </span>` :
            `<span class="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-ink-100 text-ink-500">
           <span class="w-1.5 h-1.5 rounded-full bg-ink-400"></span> Inactive
         </span>`;

        els.submitError.classList.add('hidden');
    }

    /* ---------------- State sync ---------------- */
    function syncFormToState() {
        state.form.title = els.title.value.trim();
        state.form.description = els.description.value.trim();
        state.form.address = els.address.value.trim();
        state.isDefault = els.isDefault.getAttribute('aria-checked') === 'true';
        state.status = els.status.value;
    }

    function markDirty() {
        if (!state.submitted) state.dirty = true;
    }

    function updateTitleCount() {
        const len = els.title.value.length;
        els.titleCount.textContent = `${len}/255`;
        els.titleCount.className = `text-[11px] tabular-nums flex-shrink-0 ${len > 255 ? 'text-red-600' : len > 220 ? 'text-amber-600' : 'text-ink-400'
            }`;
    }

    /* ---------------- Default toggle ---------------- */
    function setDefaultToggle(v) {
        state.isDefault = !!v;
        els.isDefault.setAttribute('aria-checked', state.isDefault ? 'true' : 'false');
    }

    function onToggleDefault() {
        const next = !(els.isDefault.getAttribute('aria-checked') === 'true');
        if (next && state.existingDefault) {
            els.confirmCurrentName.textContent = state.existingDefault.title || 'Main Warehouse';
            openModal(els.defaultConfirmModal);
            return;
        }
        setDefaultToggle(next);
        markDirty();
    }

    /* ---------------- Modals ---------------- */
    function openModal(m) {
        m.classList.remove('hidden');
        m.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        refreshIcons();
    }

    function closeModal(m) {
        m.classList.add('hidden');
        m.style.display = 'none';
        document.body.style.overflow = '';
    }

    document.addEventListener('click', (e) => {
        const d = e.target.closest('[data-dismiss]');
        if (!d) return;
        if (d.dataset.dismiss === 'unsaved') closeModal(els.unsavedModal);
        if (d.dataset.dismiss === 'default') closeModal(els.defaultConfirmModal);
    });
    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return;
        if (!els.unsavedModal.classList.contains('hidden')) closeModal(els.unsavedModal);
        else if (!els.defaultConfirmModal.classList.contains('hidden')) closeModal(els.defaultConfirmModal);
    });

    /* ---------------- Submission ---------------- */
    function setSubmitting(on) {
        console.log(on);
        state.submitting = on;
        els.createBtn.disabled = on;
        els.backBtn.disabled = on;

        const label = els.createBtn.querySelector('.btn-label');
        if (on) label.innerHTML = `
              <svg class="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-opacity="0.25" stroke-width="3" />
                <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" stroke-width="3" stroke-linecap="round" />
              </svg> Submitting...`
        else label.innerHTML = `<i data-lucide="plus" class="w-4 h-4"></i> Create Inventory`;
    }

    function showSubmitError(msg) {
        els.submitErrorMsg.textContent = msg;
        els.submitError.classList.remove('hidden');
        refreshIcons();
    }

    function buildPayload() {
        return {
            title: state.form.title,
            description: state.form.description || null,
            address: state.form.address || null,
            is_default: !!state.isDefault,
            status: state.status,
            store_id: state.store.id
        };
    }

    async function submitInventory() {
        if (state.submitting || state.submitted) return;
        if (!state.store) {
            goToStep(0);
            return;
        }

        setSubmitting(true);
        els.submitError.classList.add('hidden');

        try {


            const url = `${API_BASE}/business/inventories/`;

            const res = await axios.post(url, buildPayload(), {
                withCredentials: true
            });

            if (res.data?.success === false) throw new Error(res.data.message || 'Failed to create inventory');

            const inventory = res.data?.inventory || res.data?.data || {};
            const invId = inventory.id || '';
            const invName = inventory.title || state.form.title;

            state.submitted = true;
            state.dirty = false;

            els.successInvName.textContent = invName;
            els.successStoreName.textContent = state.store.name;

            // els.viewInventoryBtn.href = invId ?
            //   `/stores/${encodeURIComponent(state.store.id)}/inventories/${encodeURIComponent(invId)}` :
            //   `/stores/${encodeURIComponent(state.store.id)}/inventory`;
            // els.addStockBtn.href = invId ?
            //   `/stores/${encodeURIComponent(state.store.id)}/inventories/${encodeURIComponent(invId)}/stock/new` :
            //   `/stores/${encodeURIComponent(state.store.id)}/inventory`;

            goToStep('success');
            notify('success', 'Inventory created successfully.');

        } catch (err) {
            console.error('[submitInventory]', err);
            const status = err.response?.status;
            const msg = err.response?.data?.message || err.response?.data?.error;

            showSubmitError(msg || "Internal Server Error — Unable to create inventory");
        } finally {
            setSubmitting(false);
        }
    }

    /* ---------------- Leave guard ---------------- */
    let pendingUrl = null;

    function setupLeaveGuards() {
        els.cancelBtn.addEventListener('click', () => attemptLeave(state.store ?
            `/stores/${encodeURIComponent(state.store.id)}/inventory` :
            '/stores'));

        document.addEventListener('click', (e) => {
            const link = e.target.closest('a[href]');
            if (!link || link.target === '_blank') return;
            const href = link.getAttribute('href');
            if (!href || href.startsWith('#') || href.startsWith('mailto:')) return;
            if (state.submitted || !state.dirty) return;
            e.preventDefault();
            pendingUrl = href;
            openModal(els.unsavedModal);
        });

        window.addEventListener('beforeunload', (e) => {
            if (state.dirty && !state.submitted) {
                e.preventDefault();
                e.returnValue = '';
            }
        });

        els.stayBtn.addEventListener('click', () => {
            pendingUrl = null;
            closeModal(els.unsavedModal);
        });

        els.leaveBtn.addEventListener('click', () => {
            const url = pendingUrl || (state.store ? `/stores/${encodeURIComponent(state.store.id)}/inventory` : '/stores');
            state.dirty = false;
            window.location.href = url;
        });
    }

    function attemptLeave(url) {
        if (state.submitted || !state.dirty) {
            window.location.href = url;
            return;
        }
        pendingUrl = url;
        openModal(els.unsavedModal);
    }

    /* ---------------- Wiring ---------------- */
    function wireEvents() {
        els.title.addEventListener('input', () => {
            updateTitleCount();
            if (els.title.value.trim()) setFieldError('title', '');
            markDirty();
        });
        els.description.addEventListener('input', markDirty);
        els.address.addEventListener('input', markDirty);
        els.status.addEventListener('change', () => {
            state.status = els.status.value;
            markDirty();
        });
        els.isDefault.addEventListener('click', onToggleDefault);

        els.continueBtn.addEventListener('click', () => {
            if (!validateStep1()) return;
            syncFormToState();
            goToStep(2);
        });
        els.backBtn.addEventListener('click', () => goToStep(1));
        els.createBtn.addEventListener('click', submitInventory);

        els.replaceDefaultBtn.addEventListener('click', () => {
            setDefaultToggle(true);
            markDirty();
            closeModal(els.defaultConfirmModal);
        });
        els.keepOldDefaultBtn.addEventListener('click', () => {
            setDefaultToggle(false);
            closeModal(els.defaultConfirmModal);
        });

        els.changeStoreBtn.addEventListener('click', () => goToStep(0));

        $$('[data-edit-step]').forEach(btn => btn.addEventListener('click', () => {
            const s = Number(btn.dataset.editStep);
            goToStep(s);
        }));

        els.helpLink.addEventListener('click', (e) => {
            e.preventDefault();
            window.open('/docs/inventory', '_blank', 'noopener');
        });
    }

    /* ---------------- Boot ---------------- */
    function boot() {
        refreshIcons();
        updateTitleCount();
        wireEvents();
        setupLeaveGuards();
        renderStoreList();

        // If no stores, stay on step 0 with empty state
        if (!STORES.length) {
            updateStepper(0);
            return;
        }
        // If more than one store, stay on step 0 waiting for selection.
        // If exactly one, renderStoreList() already selected & advanced.
    }

    document.readyState === 'loading' ?
        document.addEventListener('DOMContentLoaded', boot) :
        boot();

})();