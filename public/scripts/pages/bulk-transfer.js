let storeId;
let inventoryId;
let itemId;

const transferState = {
    open: false,
    item: null,
    inventories: [],
    submitting: false,
};

let fetchAbort = null;

const formatNumber = value =>
    Number(value ?? 0).toLocaleString();

const transferModal = document.getElementById('transferModal');
const transferForm = document.getElementById('transferForm');
const transferSubmitBtn = document.getElementById('transferSubmit');
const transferDestination = document.getElementById('transferDestination');
const transferQuantity = document.getElementById('transferQuantity');
const transferNotes = document.getElementById('transferNotes');
const transferError = document.getElementById('transferError');
const transferSubtitle = document.getElementById('transferModalSubtitle');
const transferSourceTitle = document.getElementById('transferSourceTitle');
const transferSourceQty = document.getElementById('transferSourceQuantity');
const transferSourceRes = document.getElementById('transferSourceReserved');
const transferSourceAvail = document.getElementById('transferSourceAvailable');
const transferQtyHint = document.getElementById('transferQuantityHint');

function showTransferError(message) {
    transferError.textContent = message;
    transferError.classList.remove('hidden');
}

function clearTransferError() {
    transferError.textContent = '';
    transferError.classList.add('hidden');
}

function resetTransferForm() {
    transferForm.reset();
    transferDestination.value = '';
    transferQuantity.value = '';
    transferQuantity.max = '';
    transferNotes.value = '';
    clearTransferError();
    transferSubmitBtn.disabled = false;
    transferSubmitBtn.querySelector('span').textContent = 'Transfer';
}

async function loadTransferDestinations() {
    try {

        if (!storeId) {
            Notification.showNotification({
                message: 'Store not loaded — Please try to reload this page',
                type: 'warning'
            });
            return;
        }

        const response = await axios.get(
            `/stores/${storeId}/data/product-listing/inventories`, {
            params: {
                page: 1,
                limit: 100,
                status: 'active'
            },
            withCredentials: true,
        }
        );

        const rows = response.data?.data || [];
        transferState.inventories = rows;

        const sourceInvId = transferState.item?.inventory_id;
        const options = rows
            .filter(inv => String(inv.id) !== String(sourceInvId))
            .map(inv => `
            <option value="${inv.id}">
            ${inv.title}${inv.is_default ? ' (default)' : ''}
            </option>
        `)
            .join('');

        transferDestination.innerHTML = `
            <option value="">Select an inventory…</option>
            ${options}
        `;
    } catch (error) {
        console.error('Failed to load destination inventories:', error);
        transferDestination.innerHTML = `<option value="">Unable to load inventories</option>`;
        showTransferError('Could not load destination inventories.');
    }
}

async function openTransferModal() {

    if (!storeId || !itemId) {
        Notification.showNotification({
            message: 'Store id not defined — Please try to reload the page',
            type: 'warn'
        });
        return;
    }

    if (fetchAbort) fetchAbort.abort();
    fetchAbort = new AbortController();

    $('#bulkTransferBody').addClass('hidden');
    $('#bulkTransferLoader').removeClass('hidden');
    try {

        transferModal.classList.remove('hidden');
        document.body.classList.add('overflow-hidden');

        const { data } = await axios.get(
            `/inventories/${inventoryId}/${storeId}/items/${itemId}`, {
            withCredentials: true,
            signal: fetchAbort.signal
        }
        );

        if (!data) throw new Error('Item not found.');

        $('#bulkTransferBody').removeClass('hidden');
        $('#bulkTransferLoader').addClass('hidden');

        transferState.open = true;
        transferState.item = data;
        transferState.inventories = [];

        resetTransferForm();

        const available = Number(data.quantity) - Number(data.reserved);

        transferSourceTitle.textContent = data.listing_title || data.product_title || 'Inventory item';
        transferSourceQty.textContent = formatNumber(data.quantity);
        transferSourceRes.textContent = formatNumber(data.reserved);
        transferSourceAvail.textContent = formatNumber(available);

        transferQuantity.max = String(available);
        transferQuantity.value = '';

        const msg = available > 1 ? `Must be between 1 and ${formatNumber(available)}.` : 'Maximum transfer is 1'
        transferQtyHint.textContent = msg;

        transferSubtitle.textContent =
            `From ${data.inventory_title || 'source inventory'} → choose destination.`;


        window.lucide?.createIcons();

        await loadTransferDestinations();
        transferDestination.focus();


    } catch (error) {
        console.log(error);
        closeTransferModal();
        $('#bulkTransferBody').addClass('hidden');
        $('#bulkTransferLoader').addClass('hidden');
        Notification.showNotification({
            message: error.response?.data.message || 'Unable to get inventory item',
            type: 'error'
        });
    }
}

function closeTransferModal() {
    if (fetchAbort) {
        fetchAbort.abort();
        fetchAbort = null;
    }
    transferState.open = false;
    transferState.item = null;
    transferModal.classList.add('hidden');
    document.body.classList.remove('overflow-hidden');
}

async function submitTransfer(event) {
    event.preventDefault();
    clearTransferError();

    const item = transferState.item;
    if (!item) return;

    const destinationInventoryId = transferDestination.value;
    const quantity = Number.parseInt(transferQuantity.value, 10);
    const available = Number(item.quantity) - Number(item.reserved);

    if (!destinationInventoryId) {
        showTransferError('Please choose a destination inventory.');
        return;
    }

    if (!Number.isInteger(quantity) || quantity <= 0) {
        showTransferError('Quantity must be a positive integer.');
        return;
    }

    if (quantity > available) {
        showTransferError(
            `Only ${formatNumber(available)} unit(s) are available to transfer.`
        );
        return;
    }

    transferState.submitting = true;
    transferSubmitBtn.disabled = true;
    transferSubmitBtn.querySelector('span').textContent = 'Transferring…';

    try {
        const response = await axios.put(
            `/inventories/${inventoryId}/${storeId}/transfer-bulk`, {
            sourceItemId: item.id,
            destinationInventoryId,
            quantity,
            notes: transferNotes.value.trim() || undefined,
        }, {
            withCredentials: true
        }
        );

        Notification.showNotification?.({
            type: 'success',
            message: response.data?.message || 'Stock transferred successfully.',
        });

        closeTransferModal();

        window.location.reload();
    } catch (error) {
        console.error('Transfer failed:', error);
        const message =
            error.response?.data?.message ||
            error.response?.data?.error ||
            'Unable to transfer stock.';
        showTransferError(message);

        transferSubmitBtn.disabled = false;
        transferSubmitBtn.querySelector('span').textContent = 'Transfer';
    } finally {
        transferState.submitting = false;
    }
}

transferForm.addEventListener('submit', submitTransfer);

transferModal.addEventListener('click', event => {
    if (event.target.closest('[data-transfer-close]')) {
        closeTransferModal();
    }
});

transferQuantity.addEventListener('input', () => {
    clearTransferError();
    const value = Number.parseInt(transferQuantity.value, 10);
    const available = Number(transferState.item?.quantity || 0) -
        Number(transferState.item?.reserved || 0);

    if (Number.isInteger(value) && value > available) {
        showTransferError(`Maximum transferable is ${formatNumber(available)}.`);
    }
});

document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && transferState.open) {
        closeTransferModal();
    }
});

$(document).on('click', '[transfer-item]', function (e) {
    inventoryId = e.currentTarget.dataset.inventoryId;
    storeId = e.currentTarget.dataset.storeId;
    itemId = e.currentTarget.dataset.itemId;

    openTransferModal()
});