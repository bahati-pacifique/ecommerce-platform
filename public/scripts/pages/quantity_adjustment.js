$(function () {
    initAdjustQuantityModal();
});

function initAdjustQuantityModal() {
    const $modal = $('#adjustQuantityModal');
    if (!$modal.length) return;

    const $backdrop = $('#adjustQuantityBackdrop');
    const $closeBtn = $('#adjustQtyClose');
    const $cancelBtn = $('#adjustQtyCancel');
    const $form = $('#adjustQtyForm');
    const $submitBtn = $('#adjustQtySubmit');
    const $errorBox = $('#adjustQtyError');
    const $loading = $('#adjustQtyLoading');
    const $content = $('#adjustQtyContent');
    const $input = $('#deltaAdjustInput');
    const $minusBtn = $('#adjustQtyMinus');
    const $plusBtn = $('#adjustQtyPlus');
    const $presets = $('.adjust-qty-preset');
    const $currentEl = $('#adjustQtyCurrent');
    const $deltaEl = $('#adjustQtyDelta');

    const $modalTitle = $('#adjustQtyModalTitle');
    const $inputLabel = $('#adjustQtyInputLabel');

    const $titleEl = $('#adjustQtyItemTitle');
    const $inventoryEl = $('#adjustQtyItemInventory');
    const $skuEl = $('#adjustQtyItemSku');
    const $imageEl = $('#adjustQtyItemImage');
    const $modeText = $('#adjustQtyModeText');
    const $unitCountText = $('#adjustQtyUnitCountText');

    let ctx = null;
    let fetchAbort = null;

    const CDN = 'https://cdn.cococe.rw';
    const MAX_ABS_DELTA = 10000;

    function imageUrl(path) {
        if (!path) return null;
        return path.startsWith('http') ? path : `${CDN}/${path}`;
    }

    function readDelta() {
        const n = Number.parseInt($input.val(), 10);
        if (!Number.isFinite(n)) return 0;
        return Math.max(-MAX_ABS_DELTA, Math.min(MAX_ABS_DELTA, n));
    }

    function setDelta(n) {
        if (isSerialized()) return;
        const parsed = Number.parseInt(n, 10) || 0;
        const clamped = Math.max(-MAX_ABS_DELTA, Math.min(MAX_ABS_DELTA, parsed));
        $input.val(clamped);
        updateDelta();
    }

    function isSerialized() {
        return ctx?.item?.trackingMode === 'serialized';
    }

    function setControlsEnabled(enabled) {
        $input.prop('disabled', !enabled);
        $minusBtn.prop('disabled', !enabled);
        $plusBtn.prop('disabled', !enabled);
        $presets.prop('disabled', !enabled);
    }

    function showError(message) {
        $errorBox.text(message).removeClass('hidden');
    }

    function hideError() {
        $errorBox.addClass('hidden').text('');
    }

    async function openModal(newCtx) {
        if (!newCtx?.inventoryId || !newCtx?.storeId || !newCtx?.itemId) {
            console.error('missing required context');
            return;
        }

        if (fetchAbort) fetchAbort.abort();
        fetchAbort = new AbortController();

        ctx = {
            inventoryId: newCtx.inventoryId,
            storeId: newCtx.storeId,
            itemId: newCtx.itemId,
            action: newCtx.action || 'adjust',
            item: null,
        };

        const isReserve = ctx.action === 'reserve';
        const isRelease = ctx.action === 'release';

        $modalTitle.text(isReserve ? 'Reserve stock' : 'Adjust quantity');
        $inputLabel.html(isReserve
            ? 'Quantity to reserve <span class="text-rose-500">*</span>'
            : 'Quantity change delta <span class="text-rose-500">*</span>'
        );

        if (isRelease) {
            $submitBtn.html('<i data-lucide="list-filter-plus" class="h-4 w-4"></i> Release items');
        } else if (isReserve) {
            $submitBtn.html('<i data-lucide="lock" class="h-4 w-4"></i> Reserve items');
        } else { $submitBtn.html('<i data-lucide="check" class="h-4 w-4"></i> Save quantity') }

        if (isReserve || isRelease) {
            $input.attr('min', '1');
        } else {
            $input.removeAttr('min');
        }

        $titleEl.text('Loading…');
        $inventoryEl.text('—');
        $skuEl.text('—');
        $modeText.text('—');
        $unitCountText.text('—');
        $currentEl.text('0');
        $input.val(0);
        $deltaEl.text('').removeClass('text-emerald-600 text-amber-600').addClass('text-slate-500');
        $imageEl.addClass('hidden').attr('src', '');
        hideError();
        $loading.removeClass('hidden');
        $content.addClass('hidden');
        setControlsEnabled(false);
        $submitBtn.prop('disabled', true);

        $modal.removeClass('hidden');
        $('body').css('overflow', 'hidden');

        window.lucide?.createIcons?.();

        try {
            const { data } = await axios.get(
                `/inventories/${ctx.inventoryId}/${ctx.storeId}/items/${ctx.itemId}`, {
                withCredentials: true,
                signal: fetchAbort.signal
            }
            );

            if (!data) throw new Error('Item not found.');

            ctx.item = {
                id: data.id,
                inventoryId: data.inventory_id,
                inventoryTitle: data.inventory_title || 'Inventory item',
                listingTitle: data.listing_title || data.inventory_title || 'Inventory item',
                sku: data.listing_variant_sku || data.listing_sku || '',
                image: data.listing_image || '',
                quantity: Number(data.quantity ?? 0),
                trackingMode: data.tracking_mode || null,
                unitCount: Number(data.unit_count ?? 0),
            };

            // Populate header
            $titleEl.text(ctx.item.listingTitle);
            $inventoryEl.text(ctx.item.inventoryTitle);
            $skuEl.text(ctx.item.sku || '—');

            const img = imageUrl(ctx.item.image);
            if (img) {
                $imageEl.attr('src', img).removeClass('hidden');
            } else {
                $imageEl.addClass('hidden').attr('src', '');
            }

            // Badges
            const modeLabels = { bulk: 'Bulk', serialized: 'Serialized' };
            $modeText.text(modeLabels[ctx.item.trackingMode] || ctx.item.trackingMode || '—');
            $unitCountText.text(`${ctx.item.unitCount} unit${ctx.item.unitCount === 1 ? '' : 's'}`);

            $currentEl.text(ctx.item.quantity);
            $input.val(0);
            updateDelta();

            $loading.addClass('hidden');
            $content.removeClass('hidden');

            if (isSerialized()) {
                setControlsEnabled(false);
                $submitBtn.prop('disabled', true);
                showError(
                    'Serialized items are counted from inventory units. Add or remove units instead of editing quantity.'
                );
            } else {
                setControlsEnabled(true);
                $submitBtn.prop('disabled', true);

                // Focus input trick to remove default '0' smoothly
                $input.focus().val('0');
                const val = $input.val();
                $input.focus().val('').val(val);
            }

            window.lucide?.createIcons?.();
        } catch (err) {
            if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') return;

            console.error(err);
            $loading.addClass('hidden');
            showError(err.response?.data?.message || err.message || 'Failed to load data.');
        }
    }

    function closeModal() {
        
        if (fetchAbort) {
            fetchAbort.abort();
            fetchAbort = null;
        }

        $modal.addClass('hidden');
        $('body').css('overflow', '');
        $form[0]?.reset();
        hideError();
        $content.addClass('hidden');
        $loading.addClass('hidden');
        $input.val(0);
        ctx = null;
    }

    window.openAdjustQuantityModal = openModal;

    $(document).on('click', '[adjust-quantity], [reserve-item], [release-item]', function () {
        const $btn = $(this);

        let action = 'adjust';
        if ($btn.is('[reserve-item]')) action = 'reserve';
        if ($btn.is('[release-item]')) action = 'release';

        openModal({
            inventoryId: $btn.data('inventoryId'),
            storeId: $btn.data('storeId'),
            itemId: $btn.data('itemId'),
            action: action,
        });
    });

    $backdrop.on('click', closeModal);
    $closeBtn.on('click', closeModal);
    $cancelBtn.on('click', closeModal);

    $(document).on('keydown', (e) => {
        if (e.key === 'Escape' && !$modal.hasClass('hidden')) closeModal();
    });

    $minusBtn.on('click', () => setDelta(readDelta() - 1));
    $plusBtn.on('click', () => setDelta(readDelta() + 1));
    $input.on('input change', updateDelta);

    $(document).on('click', '.adjust-qty-preset', function () {
        if (isSerialized()) return;
        const step = Number.parseInt($(this).data('delta'), 10) || 0;
        setDelta(readDelta() + step);
    });

    function updateDelta() {
        if (!ctx?.item) return;
        if (isSerialized()) return;

        const delta = readDelta();
        const current = Number(ctx.item.quantity ?? 0);
        const isReserve = ctx.action === 'reserve';
        const isRelease = ctx.action === 'release';

        $submitBtn.prop('disabled', delta === 0 || (isReserve && delta < 1) || (isRelease && delta < 1));

        $deltaEl.removeClass('text-emerald-600 text-amber-600 text-slate-500');

        if (delta === 0) {
            $deltaEl.text('').addClass('text-slate-500');
            return;
        }

        if (isReserve) {
            if (delta > 0) {
                $deltaEl.text(`Reserving ${delta} units`).addClass('text-emerald-600');
            } else {
                $deltaEl.text(`Cannot reserve negative quantity`).addClass('text-rose-600');
            }
        } else {
            const sign = delta > 0 ? '+' : '';
            const projected = Math.max(0, current + delta);
            $deltaEl
                .text(`Change: ${sign}${delta} (${current} → ${projected})`)
                .addClass(delta > 0 ? 'text-emerald-600' : 'text-amber-600');
        }
    }

    $form.on('submit', async (e) => {
        e.preventDefault();
        hideError();

        if (!ctx?.item) return showError('Item not loaded yet.');
        if (isSerialized()) return showError('Cannot edit serialized items here.');

        const inputVal = readDelta();
        if (inputVal === 0) return closeModal();

        if (ctx.action === 'reserve' && inputVal < 1) {
            return showError('You must reserve at least 1 item.');
        }

        setControlsEnabled(false);
        $submitBtn
            .prop('disabled', true)
            .html('<i data-lucide="loader-2" class="h-4 w-4 animate-spin"></i> Processing…');
        window.lucide?.createIcons?.();

        try {

            let endpoint;

            let payload;

            if (ctx.action === 'reserve') {
                endpoint = 'reserve-quantity';
                payload = { quantity: inputVal };
            } else if (ctx.action === 'release') {
                endpoint = 'release-quantity';
                payload = { quantity: inputVal };
            } else {
                payload = { delta: inputVal };
                endpoint = 'adjust-quantity';
            }

            const { data } = await axios.patch(
                `/inventories/${ctx.inventoryId}/${ctx.storeId}/items/${ctx.itemId}/${endpoint}`,
                payload,
                { withCredentials: true }
            );

            if (data?.success === false) {
                showError(data.message || 'Operation failed.');
                setControlsEnabled(true);
                $submitBtn.prop('disabled', inputVal === 0);
                return;
            }

            Notification?.showNotification?.({
                type: 'success',
                message: data?.message || (ctx.action === 'reserve' ? 'Items reserved' : 'Quantity updated'),
            });

            closeModal();
            window.location.reload();

        } catch (err) {
            console.error(err);
            showError(err.response?.data?.message || err.message || 'Operation failed.');
            setControlsEnabled(true);
            $submitBtn.prop('disabled', readDelta() === 0);
        } finally {
            const isReserve = ctx?.action === 'reserve';
            $submitBtn
                .html(isReserve
                    ? '<i data-lucide="lock" class="h-4 w-4"></i> Reserve items'
                    : '<i data-lucide="check" class="h-4 w-4"></i> Save quantity'
                )
                .prop('disabled', isSerialized() || readDelta() === 0);
            window.lucide?.createIcons?.();
        }
    });
}