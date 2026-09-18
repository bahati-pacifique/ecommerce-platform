let currentBrandsPage = 1;
const brandsItemsPerPage = 100;
let deleteBrandTargetId = null;
let allBrands = [];
let filteredBrands = [];
let currentBrandSearchTerm = '';
let currentBrandStatusFilter = 'all';
let brandPaginationData = {
    counts: 0,
    totalPages: 0,
    page: 1,
    limit: 7
};
let isFetchingBrand = false;
let brandOriginalEditing = null;

const $brandsTableBody = $('#brandsTableBody');
const $brandsTotalCount = $('#brandTotalCount');
const $brandShowingCount = $('#brandShowingCount');
const $brandsPageInfo = $('#brandsPageInfo');
const $prevBrandPageBtn = $('#prevBrandPageBtn');
const $nextBrandPageBtn = $('#nextBrandPageBtn');
const $brandsEmptyState = $('#brandsEmptyState');
const $brandSearchInput = $('#brandSearchInput');
const $brandStatusFilter = $('#brandStatusFilter');

let metaFieldCount = 0;
let metaFieldsData = {};

function renderMetaFields(metaData = {}) {
    const $container = $('#metaFieldsContainer');
    $container.empty();

    if (!metaData || Object.keys(metaData).length === 0) {
        $container.html(`
            <div class="text-center py-3 text-sm text-gray-400 border-2 border-dashed border-gray-200 rounded-xl" id="emptyMetaState">
                <i class="fas fa-code text-gray-300 mr-2"></i>
                No meta fields added yet. Click "Add Meta Field" to get started.
            </div>
        `);
        metaFieldCount = 0;
        return;
    }

    let index = 0;
    for (const [key, value] of Object.entries(metaData)) {
        addMetaFieldRow(key, value, index);
        index++;
    }
    metaFieldCount = index;
}

function addMetaFieldRow(key = '', value = '', index = null) {
    const $container = $('#metaFieldsContainer');
    const rowId = index !== null ? index : metaFieldCount;

    $('#emptyMetaState').remove();

    const rowHtml = `
        <div class="meta-field-row flex items-center gap-2 p-2 bg-gray-50 rounded-xl border border-gray-200" data-row-id="${rowId}">
            <div class="flex-1">
                <input type="text" class="meta-key-input form-input w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-900 placeholder-gray-400 transition" placeholder="Key (e.g., founded_year)" value="${stripHtml2(key)}">
            </div>
            <div class="flex-[2]">
                <input type="text" class="meta-value-input form-input w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-900 placeholder-gray-400 transition" placeholder="Value (e.g., 2020)" value="${stripHtml2(value)}">
            </div>
            <button type="button" class="remove-meta-btn p-2 text-gray-400 hover:text-red-600 transition rounded-lg hover:bg-red-50 flex-shrink-0" title="Remove meta field">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;

    if (index !== null && index < $container.children().length) {
        // Insert @ specific position
        $container.children().eq(index).before(rowHtml);
    } else {
        // Append at the end
        $container.append(rowHtml);
    }

    // Bind remove event for this specific row
    const $row = $(`.meta-field-row[data-row-id="${rowId}"]`);

    $row.find('.remove-meta-btn').off('click').on('click', function () {
        const $row = $(this).closest('.meta-field-row');
        const rowId = $row.data('row-id');

        removeMetaFieldRow(rowId);
    });

    // Bind input events to update metaData
    $row.find('.meta-key-input').off('input').on('input', function () {
        updateMetaData();
    });

    $row.find('.meta-value-input').off('input').on('input', function () {
        updateMetaData();
    });

    // If index is null, increment count
    if (index === null) {
        metaFieldCount++;
    }

    // Focus the new key input
    $row.find('.meta-key-input').focus();
}

function removeMetaFieldRow(rowId) {
    const $row = $(`.meta-field-row[data-row-id="${rowId}"]`);

    showSnackbar({
        type: 'warning',
        message: 'Remove meta field?',
        actionText: 'Remove',
        onAction: () => {
            $row.remove();
            updateMetaData();

            // If no rows left, show empty state
            if ($('.meta-field-row').length === 0) {
                renderMetaFields({});
            }
        }
    });

}

function updateMetaData() {
    const metaData = {};
    $('.meta-field-row').each(function () {
        const key = $(this).find('.meta-key-input').val().trim();
        const value = $(this).find('.meta-value-input').val().trim();
        if (key) {
            metaData[key] = value;
        }
    });

    metaFieldsData = metaData;
}

function getMetaData() {
    updateMetaData();
    return metaFieldsData;
}

function populateMetaFields(metaData = {}) {
    if (!metaData || typeof metaData !== 'object') {
        renderMetaFields({});
        return;
    }

    // Filter empty keys
    const cleanedMeta = {};
    for (const [key, value] of Object.entries(metaData)) {
        if (key && key.trim() !== '') {
            cleanedMeta[key.trim()] = value;
        }
    }

    renderMetaFields(cleanedMeta);
    metaFieldsData = cleanedMeta;
}

function validateMetaFields() {
    let isValid = true;
    const errors = [];
    const seenKeys = new Set();

    $('.meta-field-row').each(function () {
        const key = $(this).find('.meta-key-input').val().trim();
        const value = $(this).find('.meta-value-input').val().trim();

        if (!key && !value) {
            // Empty row - ignore
            return;
        }

        if (!key) {
            isValid = false;
            errors.push('Meta key cannot be empty');
            $(this).find('.meta-key-input').addClass('border-brand');
        } else if (seenKeys.has(key)) {
            isValid = false;
            errors.push(`Duplicate meta key: "${key}"`);
            $(this).find('.meta-key-input').addClass('border-brand');
        } else {
            seenKeys.add(key);
            $(this).find('.meta-key-input').removeClass('border-brand');
        }
    });

    if (!isValid) {
        Notification.showNotification({
            type: 'error',
            message: errors.join('. ')
        });
    }

    return isValid;
}

function initMetaFields() {

    if ($('#metaFieldsContainer').length === 0) {
        return;
    }

    // Add meta field button, use event delegation or direct binding
    $('#addMetaFieldBtn').off('click').on('click', function (e) {
        e.preventDefault();

        let hasEmptyRow = false;
        $('.meta-field-row').each(function () {
            const key = $(this).find('.meta-key-input').val().trim();
            const value = $(this).find('.meta-value-input').val().trim();
            if (!key && !value) {
                hasEmptyRow = true;
            }
        });

        if (hasEmptyRow) {
            Notification.showNotification({
                type: 'warning',
                message: 'Please fill in the current empty row first.'
            });
            return;
        }

        addMetaFieldRow();
    });

    renderMetaFields({});
}

function renderBrandsTable() {
    const data = filteredBrands || [];

    const totalItems = data.length;

    $brandsTotalCount.text(brandPaginationData.counts || 0);

    if (totalItems === 0 && brandPaginationData.counts === 0) {

        $brandsTableBody.html('');
        $brandsEmptyState.removeClass('hidden');
        $brandShowingCount.text('0');
        $brandsPageInfo.text('Page 0 of 0');
        $prevBrandPageBtn.prop('disabled', true);
        $nextBrandPageBtn.prop('disabled', true);
        return;
    }

    $brandsEmptyState.addClass('hidden');

    const totalPages = brandPaginationData.totalPages || 1;
    const currentBrandsPageNum = brandPaginationData.page || 1;

    $brandShowingCount.text(data.length);
    $brandsPageInfo.text(`Page ${currentBrandsPageNum} of ${totalPages}`);
    $prevBrandPageBtn.prop('disabled', currentBrandsPageNum <= 1);
    $nextBrandPageBtn.prop('disabled', currentBrandsPageNum >= totalPages);

    if (data.length === 0 && brandPaginationData.totalBrands > 0) {
        $brandsTableBody.html(`
            <tr>
                <td colspan="6" class="text-center py-8 text-gray-500">
                    <i class="fas fa-search text-2xl block mb-2"></i>
                    No brands match your search criteria.
                </td>
            </tr>
        `);
        return;
    }

    let brandsHtml = '';

    data.forEach(brand => {
        const logoHtml = brand.logo_url ?
            `<img src="${brand.logo_url}?v=${new Date().getTime()}" alt="${brand.title}" class="w-16 rounded-lg object-cover border border-gray-200">` :
            `<div class="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 text-xs">No Logo</div>`;

        brandsHtml += `
            <tr class="table-row border-b border-gray-50 transition">
                <td class="px-4 py-3 text-center">${logoHtml}</td>
                <td class="px-4 py-3">
                    <div>
                        <p class="text-sm font-medium text-gray-900">
                            ${stripHtml2(brand.title)}<br><small class="text-gray-300">#${brand.id}</small>
                        </p>
                        <p class="text-xs text-gray-400 md:hidden">${stripHtml2(brand.slug)}</p>
                    </div>
                </td>
                <td class="px-4 py-3 text-sm text-gray-500 hidden md:table-cell">${stripHtml2(brand.slug)}</td>
                <td class="px-4 py-3 text-sm text-gray-500 hidden lg:table-cell max-w-xs truncate">
                    ${brand.website ? `<a href="${brand.website}" target="_blank" class="text-brand hover:underline">${stripHtml2(brand.website)}</a>` : '-'}
                </td>
                <td class="px-4 py-3 text-center">
                    <span class="status-badge ${brand.status}">${brand.status}</span>
                </td>
                <td class="px-4 py-3 text-center">
                    <div class="flex items-center justify-center gap-2">
                        <button class="p-1.5 font-medium text-medium rounded-lg text-green-800 hover:bg-green-100 transition brand-activate-btn ${(['requested'].includes(brand.status)) ? '' : 'opacity-0'}" title="Validate" data-id="${brand.id}">
                            <i class="bi bi-check2"></i>
                        </button>
                        <button class="p-1.5 rounded-lg text-black-100 hover:bg-black/5 transition brand-edit-btn" title="Edit" data-id="${brand.id}">
                           <i class="bi bi-pen"></i>
                        </button>
                        <button class="p-1.5 rounded-lg text-brand hover:bg-brand-light transition brand-delete-btn ${brand.status === "deleted" ? 'opacity-0' : ''}" title="Remove" data-id="${brand.id}">
                            <i class="bi bi-trash3"></i>
                        </button>
                        <button class="p-1.5 font-medium text-medium rounded-lg text-green-800 hover:bg-green-100 transition brand-activate-btn ${(['deleted', 'disabled'].includes(brand.status)) ? '' : 'opacity-0'}" title="Activate" data-id="${brand.id}">
                            <i class="bi bi-arrow-counterclockwise"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });
    $brandsTableBody.html(brandsHtml);

    $('.brand-edit-btn').off('click').on('click', function () {
        const id = parseInt($(this).data('id'));
        openBrandEditModal(id);
    });

    $('.brand-delete-btn').off('click').on('click', function () {
        const id = parseInt($(this).data('id'));
        openBrandDeleteModal(id);
    });

    $('.brand-activate-btn').off('click').on('click', function () {
        const id = parseInt($(this).data('id'));
        activateBrand(id);
    });
}

$('#brandTitle').on('input', function () {
    const $slugInput = $('#brandSlug');
    if (!$slugInput.val() || $slugInput.data('auto') === 'true') {
        $slugInput.val(generateSlug($(this).val()));
        $slugInput.data('auto', 'true');
    }
});

$('#brandSlug').on('input', function () {
    const title = $('#brandTitle').val();
    const auto = $(this).val() === generateSlug(title);
    $(this).data('auto', auto);
});

function applyBrandLocalSearch() {
    const search = $brandSearchInput.val().toLowerCase().trim();
    currentBrandSearchTerm = search;

    if (!allBrands || allBrands.length === 0) {
        filteredBrands = [];
        renderBrandsTable();
        return;
    }

    if (search === '') {
        filteredBrands = [...allBrands];
        currentBrandsPage = 1;
        renderBrandsTable();
        return;
    }

    filteredBrands = allBrands.filter(brand => {
        return brand.title.toLowerCase().includes(search) ||
            brand.slug.toLowerCase().includes(search) ||
            (brand.description && brand.description.toLowerCase().includes(search));
    });

    currentBrandsPage = 1;
    renderBrandsTable();
}

function applyBrandStatusFilter() {
    const status = $brandStatusFilter.val();
    currentBrandStatusFilter = status;
    currentBrandsPage = 1;
    fetchBrands(1, true);
}

function resetBrandFilters(shouldFetch = true) {
    $brandSearchInput.val('');
    $brandStatusFilter.val('all');
    currentBrandSearchTerm = '';
    currentBrandStatusFilter = 'all';
    currentBrandsPage = 1;

    if (shouldFetch) fetchBrands(1, true);
}

function prevBrandPage() {
    if (brandPaginationData.page > 1) {
        const newPage = Number(brandPaginationData.page) - 1;
        fetchBrands(newPage, true);
    }
}

function nextBrandPage() {
    if (brandPaginationData.page < brandPaginationData.totalPages) {
        const newPage = Number(brandPaginationData.page) + 1;
        fetchBrands(newPage, true);
    }
}

async function fetchBrands(page = 1, isRefresh = false) {
    if (isFetchingBrand) return;
    isFetchingBrand = true;

    const $skeletonLoader = $('#brandSkeletonLoader');
    const $syncLoader = $('#brandSyncLoader');
    const $container = $('#brandsContainer');

    if (!isRefresh) {
        $skeletonLoader.removeClass('hidden');
        $syncLoader.addClass('hidden');
        $container.addClass('hidden');
    } else {
        $skeletonLoader.addClass('hidden');
        $syncLoader.removeClass('hidden');
    }

    $brandsEmptyState.addClass('hidden');

    try {
        const params = {
            page: page,
            limit: brandsItemsPerPage,
            status: currentBrandStatusFilter
        };

        const response = await axios.get(`/product-brands/`, {
            params,
            withCredentials: true
        });

        allBrands = response.data.brands || [];

        brandPaginationData = response.data.pagination || {
            counts: 0,
            totalPages: 0,
            page: 1,
            limit: 7
        };

        currentBrandsPage = brandPaginationData.page;

        if (currentBrandSearchTerm && currentBrandSearchTerm !== '') {
            filteredBrands = allBrands.filter(brand => {
                return brand.title.toLowerCase().includes(currentBrandSearchTerm) ||
                    brand.slug.toLowerCase().includes(currentBrandSearchTerm) ||
                    (brand.description && brand.description.toLowerCase().includes(currentBrandSearchTerm));
            });
        } else {
            filteredBrands = [...allBrands];
        }

        renderBrandsTable();

    } catch (error) {
        console.error('Fetch error:', error);
        allBrands = [];
        filteredBrands = [];
        brandPaginationData = {
            totalBrands: 0,
            totalPages: 0,
            page: 1,
            limit: brandsItemsPerPage
        };
        renderBrandsTable();

        Notification.showNotification({
            type: 'error',
            message: error.response?.data?.message || 'Failed to load brands'
        });

    } finally {
        isFetchingBrand = false;
        $('#brandSkeletonLoader').addClass('hidden');
        $('#brandSyncLoader').addClass('hidden');
        $('#brandsContainer').removeClass('hidden');
    }
}

async function fetchBrandById(id) {
    try {
        const response = await axios.get(`/product-brands/${id}`, {
            withCredentials: true
        });
        return response.data || null;
    } catch (error) {
        Notification.showNotification({
            type: 'error',
            message: error.response?.data?.message || 'Failed to fetch brand details'
        });
        return null;
    }
}

async function createBrand(data) {
    try {
        const response = await axios.post('/product-brands/', data, {
            withCredentials: true
        });

        const newBrand = response.data.brand || response.data.data?.brand || response.data;

        if (newBrand && newBrand.id) {
            await fetchBrands(1, true);

            Notification.showNotification({
                type: 'success',
                message: 'Brand created successfully!'
            });
            return true;
        } else {
            throw new Error('Invalid response format');
        }
    } catch (error) {
        console.error('Create error:', error);
        Notification.showNotification({
            type: 'error',
            message: error.response?.data?.message || 'Failed to create brand'
        });
        return false;
    }
}

async function updateBrand(id, data) {
    try {
        const response = await axios.put(`/product-brands/${id}`, {
            id,
            ...data
        }, {
            withCredentials: true
        });

        Notification.showNotification({
            type: 'success',
            message: 'Brand updated successfully!'
        });

        await fetchBrands(currentBrandsPage, true);
        return true;
    } catch (error) {
        console.error('Update error:', error);
        Notification.showNotification({
            type: 'error',
            message: error.response?.data?.message || 'Failed to update brand'
        });
        return false;
    }
}

async function deleteBrand(id) {
    try {
        const response = await axios.delete(`/product-brands/${id}`, {
            withCredentials: true
        });

        Notification.showNotification({
            type: 'warning',
            message: 'Brand has been deleted.'
        });

        await fetchBrands(currentBrandsPage, true);
        return true;
    } catch (error) {
        console.error('Delete error:', error);
        Notification.showNotification({
            type: 'error',
            message: error.response?.data?.message || 'Failed to delete brand'
        });
        return false;
    }
}

async function removeBrand(id) {
    try {
        const response = await axios.patch(`/product-brands/remove/${id}`, {
            withCredentials: true
        });

        Notification.showNotification({
            type: 'success',
            message: 'Brand has been removed.'
        });

        await fetchBrands(currentBrandsPage, true);
        return true;
    } catch (error) {
        console.error('Remove error:', error);
        Notification.showNotification({
            type: 'error',
            message: error.response?.data?.message || 'Failed to permanently remove brand'
        });
        return false;
    }
}

function openBrandCreateModal() {
    $('#brandFormModalTitle').text('Create New Brand');
    $('#brandSubmitBtnText').text('Create Brand');
    $('#brandForm')[0].reset();
    $('#brandEditId').val('');
    $('#brandSlug').data('auto', 'false');
    $('#brandMeta').val('');
    $('#brandFormModal').removeClass('hidden').css('display', 'flex');
    $('body').css('overflow', 'hidden');

    brandOriginalEditing = null;

    populateMetaFields({});
}

async function openBrandEditModal(id) {
    $('.uneditable-brand-field').addClass('hidden');
    $('#brandFormModal').removeClass('hidden').css('display', 'flex');
    $('body').css('overflow', 'hidden');

    $('#brandForm').addClass('hidden');
    $('#brandModalLoader').removeClass('hidden');

    const brand = await fetchBrandById(id);

    $('#brandForm').removeClass('hidden');
    $('#brandModalLoader').addClass('hidden');

    if (!brand) {
        Notification.showNotification({
            type: 'error',
            message: 'Brand not found'
        });
        return;
    }

    brandOriginalEditing = brand;

    $('#brandFormModalTitle').text('Edit Brand');
    $('#brandSubmitBtnText').text('Update Brand');
    $('#brandEditId').val(brand.id);
    $('#brandTitle').val(brand.title);
    $('#brandSlug').val(brand.slug).data('auto', 'true');
    $('#brandLogoUrl').val(brand.logo_url || '');
    $('#brandWebsite').val(brand.website || '');
    $('#brandDescription').val(brand.description || '');
    $('#brandMeta').val(brand.meta ? JSON.stringify(brand.meta, null, 2) : '');
    $('#brandStatus').val(brand.status);

    populateMetaFields(brand.meta || {});
}

function closeBrandFormModal() {
    $('#brandFormModal').addClass('hidden').css('display', 'none');
    $('.uneditable-brand-field').removeClass('hidden');
    $('body').css('overflow', '');
}

function openBrandDeleteModal(id) {
    const brand = filteredBrands.find(b => b.id === id);
    if (!brand) return;
    deleteBrandTargetId = id;
    $('#brandDeleteTitle').text(`"${brand.title}"`);
    $('#brandDeleteModal').removeClass('hidden').css('display', 'flex');
    $('body').css('overflow', 'hidden');
}

function activateBrand(id, target) {
    showSnackbar({
        type: 'warning',
        message: "Do you want to activate this brand?",
        actionText: "Yes",
        onAction: async () => {
            try {
                await axios.patch(`/product-brands/${id}`, { withCredentials: true });
                fetchBrands(currentBrandsPage, true);
                showSnackbar({ type: "success", message: "Brand activated" })
            } catch (error) {
                console.log(error);
                Notification.showNotification({
                    type: 'Error',
                    message: error.response?.data?.message || "Internal Server Error"
                });
            }
        }
    });
}

function closeBrandDeleteModal() {
    $('#brandDeleteModal').addClass('hidden').css('display', 'none');
    $('body').css('overflow', '');
    deleteBrandTargetId = null;
}

async function handleBrandFormSubmit(e) {
    e.preventDefault();

    const id = $('#brandEditId').val();
    const title = $('#brandTitle').val().trim();
    const slug = $('#brandSlug').val().trim() || generateSlug(title);
    const logo_url = $('#brandLogoUrl').val().trim();
    const website = $('#brandWebsite').val().trim();
    const description = $('#brandDescription').val().trim();
    const status = $('#brandStatus').val();

    //let meta = {};

    // // Parse meta JSON
    // const metaRaw = $('#brandMeta').val().trim();
    // if (metaRaw) {
    //     try {
    //         meta = JSON.parse(metaRaw);
    //     } catch (e) {
    //         Notification.showNotification({
    //             type: 'error',
    //             message: 'Invalid JSON format in Meta Data'
    //         });
    //         return;
    //     }
    // }

    if (!title || !slug) {
        Notification.showNotification({
            type: 'error',
            message: 'Title and slug are required.'
        });
        return;
    }

    const meta = getMetaData();

    // Validate meta fields
    // if (!validateMetaFields()) {
    //     return;
    // } //Removed since meta is nullable

    const formData = { title, slug, logo_url, website, description, meta, status };

    const $submitBtn = $('#brandFormSubmitBtn');
    const originalText = $submitBtn.html();

    $submitBtn.html('<i class="fas fa-spinner fa-spin mr-2"></i> Saving...').prop('disabled', true);

    let success = false;

    if (id) {
        const payload = getChangedAttributes(brandOriginalEditing, formData);
        success = await updateBrand(parseInt(id), payload);
    } else {
        success = await createBrand(formData);
    }

    $submitBtn.html(originalText).prop('disabled', false);

    if (success) {
        closeBrandFormModal();
    }
}

async function confirmBrandDelete() {
    if (deleteBrandTargetId === null) return;

    const $confirmBtn = $('.confirm-delete-brand-btn');
    const originalText = $confirmBtn.html();
    $confirmBtn.html('<i class="fas fa-spinner fa-spin mr-2"></i> Deleting...').prop('disabled', true);

    const success = await removeBrand(deleteBrandTargetId);

    $confirmBtn.html(originalText).prop('disabled', false);

    if (success) {
        closeBrandDeleteModal();
    }
}

function stripHtml2(html) {
    if (!html) return '';
    const tmp = document.createElement('DIV');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
}

$(document).on('keydown', function (e) {
    if (e.key === 'Escape') {
        if (!$('#brandFormModal').hasClass('hidden')) {
            closeBrandFormModal();
        }
        if (!$('#brandDeleteModal').hasClass('hidden')) {
            closeBrandDeleteModal();
        }
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        openBrandCreateModal();
    }
});

$(document).ready(function () {
    initMetaFields();
    resetBrandFilters(false);

    // Close delete modal
    $('.close-brand-delete-modal').on('click', closeBrandDeleteModal);

    // New Brand button
    $('.new-brand-btn').on('click', openBrandCreateModal);

    // Confirm delete button
    $('.confirm-delete-brand-btn').on('click', confirmBrandDelete);

    // Search - LOCAL ONLY
    $brandSearchInput.on('input', function () {
        applyBrandLocalSearch();
    });

    // Status filter - SERVER-SIDE
    $brandStatusFilter.on('change', function () {
        applyBrandStatusFilter();
    });

    // Modal overlay close
    $('.modal-overlay').on('click', function (e) {
        if ($(e.target).hasClass('modal-overlay')) {
            closeBrandDeleteModal();
            closeBrandFormModal();
        }
    });

    // Close form modal
    $('#closeBrandFormModal').on('click', closeBrandFormModal);

    // Form submit
    $("#brandForm").on('submit', handleBrandFormSubmit);

    // Cancel create brand
    $('.cancel-create-brand').on('click', closeBrandFormModal);

    // Empty state create button
    $('#emptyBrandBtn').on('click', openBrandCreateModal);

    // Pagination - SERVER-SIDE
    $('#prevBrandPageBtn').on('click', prevBrandPage);
    $('#nextBrandPageBtn').on('click', nextBrandPage);

    // Refresh - fetch from server
    $('#refreshBrands').on('click', function () {
        fetchBrands(currentBrandsPage, true);
    });

    $('#brandFilterResetBtn').on('click', function () {
        resetBrandFilters(true);
    });

});

window.openBrandCreateModal = openBrandCreateModal;
window.openBrandEditModal = openBrandEditModal;
window.openBrandDeleteModal = openBrandDeleteModal;
window.confirmBrandDelete = confirmBrandDelete;
window.closeBrandFormModal = closeBrandFormModal;
window.closeBrandDeleteModal = closeBrandDeleteModal;
window.prevBrandPage = prevBrandPage;
window.nextBrandPage = nextBrandPage;
window.resetBrandFilters = resetBrandFilters;
window.fetchBrands = fetchBrands;
window.handleBrandFormSubmit = handleBrandFormSubmit;
window.applyBrandLocalSearch = applyBrandLocalSearch;
window.applyBrandStatusFilter = applyBrandStatusFilter;