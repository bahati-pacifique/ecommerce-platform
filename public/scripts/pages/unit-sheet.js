document.addEventListener('DOMContentLoaded', () => {

    let currentUnitFull = null;     // the "full" fetched data
    let currentRequest = null;     // AbortController for in-flight fetch
    let currentUnitId = null;

    const sheet = document.getElementById('unitSheet');
    const panel = document.getElementById('unitSheetPanel');
    const backdrop = document.getElementById('unitSheetBackdrop');
    const closeBtn = document.getElementById('unitSheetClose');
    const errorBox = document.getElementById('unitSheetError');
    const successBox = document.getElementById('unitSheetSuccess');

    const skeletonEl = document.getElementById('unitSheetSkeleton');
    const contentEl = document.getElementById('unitSheetContent');
    const errorEl = document.getElementById('unitSheetLoadError');
    const errorMsgEl = document.getElementById('unitSheetLoadErrorMsg');
    const retryBtn = document.getElementById('unitSheetRetry');
    const errorCloseBtn = document.getElementById('unitSheetErrorClose');

    if (!sheet) return;

    const { storeId, inventoryId, baseUrl } = window.__UNITS__ || {};

    // Populate location select once
    const locationSelect = document.getElementById('unitSheetLocationSelect');

    // Current unit being edited
    let currentUnit = null;

    // function openSheet(unit) {
    //     hydrate(unit);
    //     clearFeedback();

    //     // 1. Make the container interactive & visible
    //     sheet.classList.remove('pointer-events-none', 'opacity-0', 'invisible');
    //     sheet.classList.add('pointer-events-auto', 'opacity-100', 'visible');

    //     // 2. Fade in the backdrop
    //     backdrop.classList.remove('opacity-0');
    //     backdrop.classList.add('opacity-100');

    //     // 3. Slide the panel up — on the next frame, after styles are committed
    //     requestAnimationFrame(() => {
    //         requestAnimationFrame(() => {
    //             panel.classList.remove('translate-y-full');
    //             panel.classList.add('translate-y-0');
    //         });
    //     });

    //     // 4. Lock body scroll
    //     document.body.style.overflow = 'hidden';

    //     document.addEventListener('keydown', onKey);
    //     setTimeout(() => closeBtn?.focus(), 100);
    // }

    // function closeSheet() {
    //     // 1. Slide out
    //     panel.classList.remove('translate-y-0');
    //     panel.classList.add('translate-y-full');

    //     // 2. Fade out the backdrop
    //     backdrop.classList.remove('opacity-100');
    //     backdrop.classList.add('opacity-0');

    //     // 3. Fade out the container
    //     sheet.classList.remove('pointer-events-auto', 'opacity-100', 'visible');
    //     sheet.classList.add('pointer-events-none', 'opacity-0', 'invisible');

    //     // 4. Restore body scroll
    //     document.body.style.overflow = '';
    //     document.removeEventListener('keydown', onKey);

    //     // 5. Clear the unit after the transition completes
    //     setTimeout(() => {
    //         currentUnit = null;
    //     }, 420);
    // }

    function openSheet(id) {
        currentUnit = id;
        currentUnitFull = null;
        currentUnitId = id;

        if (currentRequest) {
            currentRequest.abort();
            currentRequest = null;
        }

        sheet.classList.remove('pointer-events-none', 'opacity-0', 'invisible');
        sheet.classList.add('pointer-events-auto', 'opacity-100', 'visible');
        backdrop.classList.remove('opacity-0');
        backdrop.classList.add('opacity-100');

        // Show header info immediately (from the card the user tapped)
        hydrateHeader(id);

        // Show skeleton, hide content & error
        showSkeleton();

        // Slide up
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                panel.classList.remove('translate-y-full');
                panel.classList.add('translate-y-0');
            });
        });

        lockBodyScroll();
        document.addEventListener('keydown', onKey);
        setTimeout(() => closeBtn?.focus(), 100);

        // Fetch full unit data
        fetchUnit(id);
    }

    // ─── Scroll lock (prevents layout shift) ────────────────
    function lockBodyScroll() {
        const w = window.innerWidth - document.documentElement.clientWidth;
        document.documentElement.style.setProperty('--scrollbar-width', `${w}px`);
        document.body.classList.add('sheet-open');
    }
    function unlockBodyScroll() {
        document.body.classList.remove('sheet-open');
        document.documentElement.style.removeProperty('--scrollbar-width');
    }

    // ── Show the immediate header (from the search card) ─────
    function hydrateHeader(id) {

        //     document.getElementById('unitSheetTitle').textContent =
        //         unit.listing_title || 'Unit';
        //     document.getElementById('unitSheetSubtitle').textContent =
        //         `${unit.inventory_title || 'Unknown inventory'}${unit.location_title ? ' · ' + unit.location_title : ''
        //         }`;

        //     const imgWrap = document.getElementById('unitSheetImageWrap');
        //     if (unit.listing_image) {
        //         imgWrap.innerHTML = `<img src="https://cdn.cococe.rw/${esc(unit.listing_image)}"
        //   class="h-12 w-12 rounded-lg object-cover ring-1 ring-slate-200" />`;
        //     } else {
        //         imgWrap.innerHTML = `<div class="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-100">
        //   <svg class="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        //     <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
        //           d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
        //   </svg></div>`;
        //     }
    }

    // ── Fetch the full unit ───────────────────────────────────
    async function fetchUnit(unitId) {
        const controller = new AbortController();
        currentRequest = controller;

        try {
            const res = await axios.get(
                `/inventories/units/${storeId}/${unitId}`,
                { withCredentials: true, signal: controller.signal }
            );

            console.log(res.data);

            currentUnitFull = res.data;
            hydrateContent(currentUnitFull);
            showContent();
        } catch (err) {
            console.log('fetchUnit():', err)
            // // Ignore aborts — user closed or opened a different unit
            // if (axios.isCancel(err)) return;

            // if (currentUnitId !== unitId) return;

            showError(err.response?.data?.message || 'Could not load this unit.');
        } finally {
            if (currentRequest === controller) currentRequest = null;
        }
    }

    // ── State toggles ─────────────────────────────────────────
    function showSkeleton() {
        skeletonEl.classList.remove('hidden');
        contentEl.classList.add('hidden');
        errorEl.classList.add('hidden');
    }

    function showContent() {
        skeletonEl.classList.add('hidden');
        contentEl.classList.remove('hidden');
        errorEl.classList.add('hidden');
    }

    function showError(message) {
        skeletonEl.classList.add('hidden');
        contentEl.classList.add('hidden');
        errorEl.classList.remove('hidden');
        errorMsgEl.textContent = message;
    }

    // ── Retry ─────────────────────────────────────────────────
    retryBtn?.addEventListener('click', () => {
        if (!currentUnitId) return;
        showSkeleton();
        fetchUnit(currentUnitId);
    });

    errorCloseBtn?.addEventListener('click', closeSheet);

    // ── Close: also cancel any pending fetch ──────────────────
    function closeSheet() {
        if (currentRequest) {
            currentRequest.abort();
            currentRequest = null;
        }
        currentUnitId = null;

        panel.classList.remove('translate-y-0');
        panel.classList.add('translate-y-full');

        backdrop.classList.remove('opacity-100');
        backdrop.classList.add('opacity-0');

        sheet.classList.remove('pointer-events-auto', 'opacity-100', 'visible');
        sheet.classList.add('pointer-events-none', 'opacity-0', 'invisible');

        unlockBodyScroll();
        document.removeEventListener('keydown', onKey);

        setTimeout(() => {
            currentUnit = null;
            currentUnitFull = null;
        }, 420);
    }

    function onKey(e) {
        if (e.key === 'Escape') closeSheet();
    }

    backdrop.addEventListener('click', closeSheet);
    closeBtn.addEventListener('click', closeSheet);

    // Swipe down on the drag handle
    let dragStartY = null;
    const handle = document.getElementById('unitSheetHandle');
    handle?.addEventListener('touchstart', (e) => {
        dragStartY = e.touches[0].clientY;
    }, { passive: true });
    handle?.addEventListener('touchmove', (e) => {
        if (dragStartY == null) return;
        const dy = e.touches[0].clientY - dragStartY;
        if (dy > 0) panel.style.transform = `translateY(${dy}px)`;
    }, { passive: true });
    handle?.addEventListener('touchend', (e) => {
        const dy = (e.changedTouches[0].clientY - dragStartY);
        panel.style.transform = '';
        if (dy > 80) closeSheet();
        dragStartY = null;
    });

    // ── Hydrate sheet from unit data ─────────────────────────
    function hydrateContent(u) {
        const title = u.listing_title || '—';
        document.getElementById('unitSheetTitle').textContent = title;
        document.getElementById('unitSheetSubtitle').textContent =
            `${u.inventory_title || 'Unknown inventory'}${u.location_title ? ' · ' + u.location_title : ''}`;

        // Image
        const imgWrap = document.getElementById('unitSheetImageWrap');
        if (u.listing_image) {
            imgWrap.innerHTML = `<img src="https://cdn.cococe.rw/${esc(u.listing_image)}"
        class="h-12 w-12 rounded-lg object-cover ring-1 ring-slate-200" />`;
        } else {
            imgWrap.innerHTML = `<div class="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-100">
        <svg class="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
        </svg></div>`;
        }

        // Identifiers
        const ids = [
            ['Serial', u.serial_number],
            ['IMEI', u.imei],
            ['Barcode', u.barcode],
            ['MAC', u.mac_address],
        ].filter(([, v]) => v);

        document.getElementById('unitSheetIds').innerHTML = ids.length
            ? ids.map(([k, v]) => `
          <div>
            <dt class="text-[10px] font-medium uppercase tracking-wider text-slate-400">${k}</dt>
            <dd class="mt-0.5 font-mono text-slate-800 break-all">${esc(v)}</dd>
          </div>`).join('')
            : `<div class="col-span-2 text-xs italic text-slate-400">No identifiers recorded.</div>`;

        // Meta
        const metaSection = document.getElementById('unitSheetMetaSection');
        const metaEl = document.getElementById('unitSheetMeta');
        const meta = u.meta && typeof u.meta === 'object' ? u.meta : null;
        const metaEntries = meta ? Object.entries(meta) : [];
        if (metaEntries.length) {
            metaSection.classList.remove('hidden');
            metaEl.innerHTML = metaEntries.map(([k, v]) => `
        <span class="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] text-slate-700">
          <span class="font-semibold">${esc(k)}</span>: ${esc(String(v))}
        </span>`).join('');
        } else {
            metaSection.classList.add('hidden');
        }

        // Details
        document.getElementById('unitSheetWarranty').textContent =
            u.warranty_title || 'No warranty';
        document.getElementById('unitSheetReceived').textContent =
            u.received_at ? new Date(u.received_at).toLocaleDateString() : '—';
        document.getElementById('unitSheetCondition').textContent =
            u.condition || '—';
        document.getElementById('unitSheetLocation').textContent =
            u.inventory_title || 'Unassigned';
        document.getElementById('unitSheetStatus').textContent =
            u.status || 'Status';

        // Active status button
        // document.querySelectorAll('[data-status-action]').forEach(btn => {
        //     btn.dataset.active = String(btn.dataset.statusAction === u.status);
        // });

        // Active condition button
        document.querySelectorAll('[data-condition-action]').forEach(btn => {
            btn.dataset.active = String(btn.dataset.conditionAction === u.condition);
        });

        // Location select
        locationSelect.value = u.inventory_id || '';

        // document.getElementById('unitSheetOpenPage').href =
        //     `/stores/${storeId}/inventory/${u.location?.id ?? inventoryId}/items/${u.inventory_item_id ?? ''}`;

        document.getElementById('unitWarrantPage').href =
            `/catalog/units/${u.id}/warranty`;


        document.querySelectorAll('.unit-status-action-btn').forEach((btn) => {
            const btnStatus = btn.dataset.statusAction;
            if (u.status === btnStatus) btn.disabled = true;
            if (u.status === 'sold') btn.classList.add('hidden');
        })
    }

    // ── Actions ──────────────────────────────────────────────
    async function patchUnit(payload) {

        if (!currentUnit) return;

        clearFeedback();
        try {
            const res = await axios.patch(
                `/api/stores/${storeId}/units/${currentUnit.id}`,
                payload,
                { withCredentials: true }
            );
            showSuccess('Unit updated.');
            // Merge response back into currentUnit and re-hydrate
            currentUnit = { ...currentUnit, ...(res.data.result || payload) };
            hydrate(currentUnit);
            // Update the row in the search results list too
            updateResultCard(currentUnit);
        } catch (err) {
            showError(err.response?.data?.message || 'Could not update unit.');
        }
    }

    // document.querySelectorAll('[data-status-action]').forEach(btn => {
    //     btn.addEventListener('click', () => {
    //         patchUnit({ status: btn.dataset.statusAction });
    //     });
    // });

    // document.querySelectorAll('[data-condition-action]').forEach(btn => {
    //     btn.addEventListener('click', () => {
    //         patchUnit({ condition: btn.dataset.conditionAction });
    //     });
    // });

    document.getElementById('unitSheetLocationSave').addEventListener('click', (e) => {

        const location_id = locationSelect.value || null;
        const locationName = locationSelect.options[locationSelect.selectedIndex].text;

        showSnackbar({
            type: 'warning',
            message: `Do you want to transfer this unit to ${locationName}?`,
            actionText: 'Transfer',
            onAction: async () => {
                try {
                    e.target.disabled = true;
                    e.target.textContent = 'Transfering...';
                    const response = await axios.patch(`/inventories/units/${currentUnit}/${location_id}/${storeId}/transfer`);
                    if (response.data) {
                        window.location.reload()
                    }
                } catch (error) {
                    console.log("Error transfering unit",error);
                    showSnackbar({
                        type: 'error',
                        message: error.response?.data?.message || 'Internal Server Error'
                    })
                } finally {
                    e.target.disabled = false;
                    e.target.textContent = 'Move';
                }
            },
        })
    });

    document.getElementById('unitSheetDelete').addEventListener('click', (e) => {

        if (!currentUnit) return;

        showSnackbar({
            type: 'warning',
            message: 'Are you sure you want to delete this unit?',
            actionText: 'Delete',
            onAction: async () => {
                try {
                    await axios.delete(
                        `/api/stores/${storeId}/units/${currentUnit.id}`,
                        { withCredentials: true }
                    );
                    showSuccess('Unit deleted.');
                    removeResultCard(currentUnit.id);
                    setTimeout(closeSheet, 600);
                } catch (err) {
                    showError(err.response?.data?.message || 'Could not delete unit.');
                }
            }
        });
    });

    // ── Feedback ─────────────────────────────────────────────

    function showSuccess(msg) {
        successBox.textContent = msg;
        successBox.classList.remove('hidden');
        errorBox.classList.add('hidden');
        setTimeout(() => successBox.classList.add('hidden'), 2500);
    }

    function clearFeedback() {
        errorBox.classList.add('hidden');
        successBox.classList.add('hidden');
    }

    // ── Sync back to search results list ─────────────────────
    function updateResultCard(unit) {
        // The card rendered by units-search.js uses data-unit-id — make sure it has one
        const card = document.querySelector(`[data-unit-id="${unit.id}"]`);
        if (!card) return;

        // Status pill
        const pill = card.querySelector('[data-unit-status]');
        if (pill) {
            const tone = {
                available: 'bg-emerald-50 text-emerald-700',
                reserved: 'bg-amber-50 text-amber-700',
                sold: 'bg-slate-100 text-slate-600',
                damaged: 'bg-rose-50 text-rose-700',
                returned: 'bg-orange-50 text-orange-700',
            }[unit.status] || 'bg-slate-100 text-slate-600';
            pill.className = `rounded-full px-2 py-0.5 capitalize text-[10px] font-semibold shrink-0 ${tone}`;
            pill.textContent = unit.status;
        }
    }

    function removeResultCard(unitId) {
        document.querySelector(`[data-unit-id="${unitId}"]`)?.remove();
    }


    function esc(s) {
        const d = document.createElement('div');
        d.textContent = s ?? '';
        return d.innerHTML;
    }

    document.querySelectorAll('[data-status-action]').forEach(btn => {
        btn.addEventListener('click', () => {
            if (!currentUnitFull) return;
            patchUnit({ status: btn.dataset.statusAction });
        });
    });

    document.querySelectorAll('[data-condition-action]').forEach(btn => {
        btn.addEventListener('click', () => {
            if (!currentUnitFull) return;
            patchUnit({ condition: btn.dataset.conditionAction });
        });
    });

    window.UnitSheet = { open: openSheet };

});