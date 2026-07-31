// ========== STATE ==========
let currentFamiliesPage = 1;
const familiesItemsPerPage = 31;
let deleteFamilyTargetId = null;
let allFamilies = [];
let filteredFamilies = [];
let currentFamilySearchTerm = '';
let currentFamilyStatusFilter = 'all';
let familyPaginationData = {
    totalFamilies: 0,
    totalPages: 0,
    page: 1,
    limit: 7
};
let isFetchingFamily = false;

const $familiesTableBody = $('#familiesTableBody');
const $familiesTotalCount = $('#familyTotalCount');
const $familyShowingCount = $('#familyShowingCount');
const $familiesPageInfo = $('#familiesPageInfo');
const $prevFamilyPageBtn = $('#prevFamilyPageBtn');
const $nextFamilyPageBtn = $('#nextFamilyPageBtn');
const $familiesEmptyState = $('#familiesEmptyState');
const $familySearchInput = $('#familySearchInput');
const $familyStatusFilter = $('#familyStatusFilter');

function renderFamiliesTable() {

    const data = filteredFamilies || [];
    const totalItems = data.length;

    $familiesTotalCount.text(familyPaginationData.counts || 0);

    if (totalItems === 0 && familyPaginationData.counts === 0) {
        $familiesTableBody.html('');
        $familiesEmptyState.removeClass('hidden');
        $familyShowingCount.text('0');
        $familiesPageInfo.text('Page 0 of 0');
        $prevFamilyPageBtn.prop('disabled', true);
        $nextFamilyPageBtn.prop('disabled', true);
        return;
    }

    $familiesEmptyState.addClass('hidden');

    const totalPages = familyPaginationData.totalPages || 1;
    const currentFamiliesPageNum = familyPaginationData.page || 1;

    $familyShowingCount.text(data.length);
    $familiesPageInfo.text(`Page ${currentFamiliesPageNum} of ${totalPages}`);
    $prevFamilyPageBtn.prop('disabled', currentFamiliesPageNum <= 1);
    $nextFamilyPageBtn.prop('disabled', currentFamiliesPageNum >= totalPages);

    if (data.length === 0 && familyPaginationData.counts > 0) {
        $familiesTableBody.html(`
            <tr>
                <td colspan="6" class="text-center py-8 text-gray-500">
                    <i class="fas fa-search text-2xl block mb-2"></i>
                    No Families match your search criteria.
                </td>
            </tr>
        `);
        return;
    }

    let html = '';
    data.forEach(fam => {
        html += `
            <tr class="table-row border-b border-gray-50 transition">
                
                <td class="px-4 py-3">
                    <div>
                        <p class="text-sm font-medium text-gray-900">${stripHtml2(fam.title)}<br><small class="font-normal text-gray-500">${fam.category || ''}</small></p>
                        <p class="text-xs text-gray-400 md:hidden">${stripHtml2(fam.slug)}</p>
                    </div>
                </td>
                <td class="px-4 py-3 text-sm text-gray-500 hidden md:table-cell">${stripHtml2(fam.slug)}</td>
                <td class="px-4 py-3 text-sm text-gray-500 hidden lg:table-cell max-w-xs truncate">${stripHtml2(fam.description || '-')}</td>
                <td class="px-4 py-3 text-center">
                    <span class="status-badge ${fam.status}">${fam.status}</span>
                </td>
                <td class="px-4 py-3 text-center">
                    <div class="flex items-center justify-center gap-2">
                        <button class="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition family-edit-btn" title="Edit" data-id="${fam.id}">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="p-1.5 rounded-lg text-brand hover:bg-brand-light transition family-delete-btn" title="Delete" data-id="${fam.id}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });
    $familiesTableBody.html(html);

    $('.family-edit-btn').off('click').on('click', function () {
        const id = parseInt($(this).data('id'));
        openFamilyEditModal(id);
    });

    $('.family-delete-btn').off('click').on('click', function () {
        const id = parseInt($(this).data('id'));
        openFamilyDeleteModal(id);
    });
}

$('#familyTitle').on('input', function () {
    const $slugInput = $('#familySlug');
    if (!$slugInput.val() || $slugInput.data('auto') === 'true') {
        $slugInput.val(generateSlug($(this).val()));
        $slugInput.data('auto', 'true');
    }
});

$('#familySlug').on('input', function () {
    const title = $('#familyTitle').val();
    const auto = $(this).val() === generateSlug(title);
    $(this).data('auto', auto);
});

function applyFamilyLocalSearch() {
    const search = $familySearchInput.val().toLowerCase().trim();

    currentFamilySearchTerm = search;

    if (!allFamilies || allFamilies.length === 0) {
        filteredFamilies = [];
        renderFamiliesTable();
        return;
    }

    if (search === '') {
        filteredFamilies = [...allFamilies];
        currentFamiliesPage = 1;
        renderFamiliesTable();
        return;
    }

    filteredFamilies = allFamilies.filter(fam => {
        return fam.title.toLowerCase().includes(search) ||
            fam.slug.toLowerCase().includes(search) ||
            (fam.description && fam.description.toLowerCase().includes(search));
    });

    currentFamiliesPage = 1;
    renderFamiliesTable();
}

function applyFamilyStatusFilter() {
    const status = $familyStatusFilter.val();

    currentFamilyStatusFilter = status;
    currentFamiliesPage = 1;

    fetchFamilies(1);
}

function resetFamilyFilters(shouldFetch = true) {
    $familySearchInput.val('');
    $familyStatusFilter.val('all');

    currentFamilySearchTerm = '';
    currentFamilyStatusFilter = 'all';
    currentFamiliesPage = 1;

    if (shouldFetch) fetchFamilies(1);
}

function prevFamilyPage() {
    if (familyPaginationData.page > 1) {
        const newPage = Number(familyPaginationData.page) - 1;
        fetchFamilies(newPage);
    }
}

function nextFamilyPage() {
    if (familyPaginationData.page < familyPaginationData.totalPages) {
        const newPage = Number(familyPaginationData.page) + 1;
        fetchFamilies(newPage);
    }
}

async function fetchFamilies(page = 1, isRefesh = false) {

    if (isFetchingFamily) return;
    isFetchingFamily = true;

    const $skeletonLoader = $('#familySkeletonLoader');
    const $syncLoader = $('#familySyncLoader');
    const $container = $('#familiesContainer');

    if (!isRefesh) {
        $skeletonLoader.removeClass('hidden');
        $syncLoader.addClass('hidden');
        $container.addClass('hidden');
    } else {
        $skeletonLoader.addClass('hidden');
        $syncLoader.removeClass('hidden');
    }

    $familiesEmptyState.addClass('hidden');

    try {

        const params = {
            page: page,
            limit: familiesItemsPerPage
        };

        if (currentFamilyStatusFilter && currentFamilyStatusFilter !== 'all') {
            params.status = currentFamilyStatusFilter;
        }

        const response = await axios.get(`/product-families/`, {
            params,
            withCredentials: true
        });

        allFamilies = response.data.families || [];

        familyPaginationData = response.data.pagination || {
            counts: 0,
            totalPages: 0,
            page: 1,
            limit: 7
        };

        currentFamiliesPage = familyPaginationData.page;

        if (currentFamilySearchTerm && currentFamilySearchTerm !== '') {
            filteredFamilies = allFamilies.filter(cat => {
                return fam.title.toLowerCase().includes(currentFamilySearchTerm) ||
                    fam.slug.toLowerCase().includes(currentFamilySearchTerm) ||
                    (fam.description && fam.description.toLowerCase().includes(currentFamilySearchTerm));
            });
        } else {
            filteredFamilies = [...allFamilies];
        }

        renderFamiliesTable();

    } catch (error) {

        console.error('Fetch error:', error);

        allFamilies = [];
        filteredFamilies = [];
        familyPaginationData = {
            counts: 0,
            totalPages: 0,
            currentFamiliesPage: 1,
            limit: familiesItemsPerPage
        };

        renderFamiliesTable();

        Notification.showNotification({
            type: 'error',
            message: error.response?.data?.message || 'Failed to load Families'
        });

    } finally {

        isFetchingFamily = false;

        $('#familySkeletonLoader').addClass('hidden');
        $('#familySyncLoader').addClass('hidden');
        $('#familiesContainer').removeClass('hidden');

    }
}

async function fetchFamilyById(id) {
    try {
        const response = await axios.get(`/product-families/${id}`, {
            withCredentials: true
        });
        return response.data || null;
    } catch (error) {
        Notification.showNotification({
            type: 'error',
            message: error.response?.data?.message || 'Failed to fetch Family details'
        });
        return null;
    }
}

async function createFamily(data) {
    try {
        const response = await axios.post('/product-families/', data, {
            withCredentials: true
        });

        const newFamily = response.data.Family || response.data.data?.Family || response.data;

        if (newFamily && newFamily.id) {
            await fetchFamilies(currentFamiliesPage);

            if (typeof Notification !== 'undefined' && Notification.showNotification) {
                Notification.showNotification({
                    type: 'success',
                    message: 'Family created successfully!'
                });
            }
            return true;
        } else {
            throw new Error('Invalid response format');
        }
    } catch (error) {
        console.error('Create error:', error);
        const errorMessage = error.response?.data?.message || 'Failed to create Family';

        if (typeof Notification !== 'undefined' && Notification.showNotification) {
            Notification.showNotification({
                type: 'error',
                message: errorMessage
            });
        }
        return false;
    }
}

async function updateFamily(id, data) {

    try {
        const response = await axios.put(`/product-families/${id}`, {
            id,
            ...data
        }, {
            withCredentials: true
        });

        Notification.showNotification({
            type: 'success',
            message: 'Family updated successfully!'
        });

        await fetchFamilies(currentFamiliesPage);
        return true;
    } catch (error) {
        console.error('Update error:', error);
        Notification.showNotification({
            type: 'error',
            message: error.response?.data?.message || 'Failed to update Family'
        });
        return false;
    }
}

// DELETE Family
async function deleteFamily(id) {
    try {
        const response = await axios.delete(`/product-families/${id}`, {
            withCredentials: true
        });

        Notification.showNotification({
            type: 'warning',
            title: "",
            message: 'Family has been deleted.'
        });

        await fetchFamilies(currentFamiliesPage);
        return true;
    } catch (error) {
        console.error('Delete error:', error);
        Notification.showNotification({
            type: 'error',
            message: error.response?.data?.message || 'Failed to delete Family'
        });
        return false;
    }
}

// REMOVE
async function removeFamily(id) {
    try {
        const response = await axios.patch(`/product-families/remove/${id}`, {
            withCredentials: true
        });

        Notification.showNotification({
            type: 'error',
            message: 'Family has been removed.'
        });

        await fetchFamilies(currentFamiliesPage);
        return true;
    } catch (error) {
        console.error('Remove error:', error);
        Notification.showNotification({
            type: 'error',
            message: error.response?.data?.message || 'Failed to permanently remove Family'
        });
        return false;
    }
}

function openFamilyCreateModal() {
    $('#familyFormModalTitle').text('Create New Family');
    $('#familyFormSubmitBtn').html('Submit');
    $('#familyForm')[0].reset();
    $('#familyEditId').val('');
    $('#familyCategoryId').val('');

    $('#familySlug').data('auto', 'false');
    $('#familyFormModal').removeClass('hidden').css('display', 'flex');
    $('body').css('overflow', 'hidden');

    deselectCategory();
}

let familyOriginalEditing;

async function openFamilyEditModal(id) {

    $('#familyFormModal').removeClass('hidden').css('display', 'flex');
    $('body').css('overflow', 'hidden');

    $('#familyForm').addClass('hidden');
    $('#familyModalLoader').removeClass('hidden');

    const fam = await fetchFamilyById(id);

    $('#familyForm').removeClass('hidden');
    $('#familyModalLoader').addClass('hidden');

    if (!fam) {
        Notification.showNotification({
            type: 'error',
            title: "",
            message: 'Family not found'
        });
        return;
    }

    familyOriginalEditing = fam;

    $('#familyFormModalTitle').text('Edit Family');
    $('#familyFormSubmitBtn').html('Update');
    $('#familyEditId').val(fam.id);
    $('#familyTitle').val(fam.title);
    if (fam.category_id && fam.category) selectCategory(fam.category_id, fam.category);
    $('#familySlug').val(fam.slug).data('auto', 'true');
    $('#familyDescription').val(fam.description || '');
    $('#familyStatus').val(fam.status);

}

function closeFamilyFormModal() {
    $('#familyFormModal').addClass('hidden').css('display', 'none');
    $('body').css('overflow', '');
}

function openFamilyDeleteModal(id) {
    const fam = filteredFamilies.find(c => c.id === id);
    if (!fam) return;
    deleteFamilyTargetId = id;
    $('#familyDeleteTitle').text(`"${fam.title}"`);
    $('#familyDeleteModal').removeClass('hidden').css('display', 'flex');
    $('body').css('overflow', 'hidden');
}

function closeFamilyDeleteModal() {
    $('#familyDeleteModal').addClass('hidden').css('display', 'none');
    $('body').css('overflow', '');
    deleteFamilyTargetId = null;
}

async function handleFamilyFormSubmit(e) {
    e.preventDefault();

    const id = $('#familyEditId').val();
    const title = $('#familyTitle').val().trim();
    const slug = $('#familySlug').val().trim() || generateSlug(title);
    const description = $('#familyDescription').val().trim();
    const status = $('#familyStatus').val();
    const category_id = $('#familyCategoryId').val();

    if (!title || !slug) {
        Notification.showNotification({
            type: 'error',
            message: 'Title and slug are required.'
        });
        return;
    }

    if (!category_id && id) {
        $('#familyCategorySearch').focus();
        $('#familyCategorySearch').addClass('border-brand');
        setTimeout(() => {
            $('#familyCategorySearch').removeClass('border-brand');
        }, 3000);
        return;
    }

    const formData = { title, slug, category_id, description, status };

    const $submitBtn = $('#familyFormSubmitBtn');
    const originalText = $submitBtn.html();

    $submitBtn.html('Saving...').prop('disabled', true);

    let success = false;

    if (id) {
        const payload = getChangedAttributes(familyOriginalEditing, formData);
        success = await updateFamily(parseInt(id), payload);
    } else {
        success = await createFamily(formData);
    }

    $submitBtn.html(originalText).prop('disabled', false);

    if (success) {
        closeFamilyFormModal();
    }
}

async function confirmFamilyDelete() {
    if (deleteFamilyTargetId === null) return;

    const $confirmBtn = $('.confirm-delete-family-btn')
    const originalText = $confirmBtn.html();
    $confirmBtn.html('<i class="bi bi-trash"></i> Deleting...').prop('disabled', true);

    const success = await removeFamily(deleteFamilyTargetId);

    $confirmBtn.html(originalText).prop('disabled', false);

    if (success) {
        closeFamilyDeleteModal();
    }
}

$(document).on('keydown', function (e) {
    if (e.key === 'Escape') {
        if (!$('#familyFormModal').hasClass('hidden')) {
            closeFamilyFormModal();
        }
        if (!$('#familyDeleteModal').hasClass('hidden')) {
            closeFamilyDeleteModal();
        }
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        openFamilyCreateModal();
    }
});

// ========== CATEGORY SELECTOR STATE ==========
let allCategoriesForSelector = [];
let selectedCategoryForFamily = null;
let isCategoryDropdownOpen = false;

const fetchCategoriesForSelector = async () => {
    try {
        // Show loader in dropdown
        $('#categoryList').html(`
            <div class="px-4 py-3 text-sm text-gray-500 text-center">
                <i class="fas fa-spinner fa-spin mr-2"></i> Loading categories...
            </div>
        `);


        const sfx = !!t ? `:${t}` : '';
        const url = `${p}api.${d}${sfx}/`;
        console.log(url);
        const response = await axios.get(`${url}categories`, { withCredentials: true });
        allCategoriesForSelector = response.data || [];
        renderCategoryList(allCategoriesForSelector);

    } catch (error) {
        console.error('Error fetching categories:', error);
        $('#categoryList').html(`
            <div class="px-4 py-3 text-sm text-red-500 text-center">
                <i class="fas fa-exclamation-triangle mr-2"></i> Failed to load categories
            </div>
        `);
    }
};

function renderCategoryList(categories, searchTerm = '') {
    const $list = $('#categoryList');
    const $noResult = $('#noCategoryResult');

    if (!categories || categories.length === 0) {
        $list.addClass('hidden');
        $noResult.removeClass('hidden');
        return;
    }

    $list.removeClass('hidden');
    $noResult.addClass('hidden');

    let html = '';
    categories.forEach(cat => {
        const isSelected = selectedCategoryForFamily && selectedCategoryForFamily.id === cat.id;
        const highlightedTitle = searchTerm ? highlightText(cat.title, searchTerm) : cat.title;

        const statusClass = cat.status === 'active' ? 'active-badge' :
            cat.status === 'inactive' ? 'inactive-badge' : 'draft-badge';

        html += `
            <div class="category-item ${isSelected ? 'active' : ''}" data-id="${cat.id}" data-title="${cat.title}">
                <span class="category-title">${highlightedTitle}</span>
            </div>
        `;
    });

    $list.html(html);

    $('.category-item').on('click', function () {
        const id = parseInt($(this).data('id'));
        const title = $(this).data('title');
        selectCategory(id, title);
    });
}

function highlightText(text, search) {
    if (!search || search === '') return text;
    const regex = new RegExp(`(${search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(regex, '<span class="category-highlight">$1</span>');
}

function selectCategory(id, title) {
    selectedCategoryForFamily = { id, title };
    $('#familyCategoryId').val(id);
    $('#familyCategorySearch').val(title);
    $('#selectedCategoryName').text(title);
    $('#selectedCategoryDisplay').removeClass('hidden');
    $('#clearCategoryBtn').removeClass('hidden');
    closeCategoryDropdown();

    // Update the category list to show selected state
    renderCategoryList(allCategoriesForSelector, $('#familyCategorySearch').val());
}

function deselectCategory() {
    selectedCategoryForFamily = null;
    $('#familyCategoryId').val('');
    $('#familyCategorySearch').val('');
    $('#selectedCategoryDisplay').addClass('hidden');
    $('#clearCategoryBtn').addClass('hidden');
    renderCategoryList(allCategoriesForSelector, '');
}

function searchCategories(searchTerm) {
    if (!searchTerm || searchTerm.trim() === '') {
        renderCategoryList(allCategoriesForSelector, '');
        return;
    }

    const filtered = allCategoriesForSelector.filter(cat =>
        cat.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cat.slug.toLowerCase().includes(searchTerm.toLowerCase())
    );

    renderCategoryList(filtered, searchTerm);
    openCategoryDropdown();
}

function openCategoryDropdown() {
    if (allCategoriesForSelector.length === 0) return;
    isCategoryDropdownOpen = true;
    $('#categoryDropdown').removeClass('hidden');
}

function closeCategoryDropdown() {
    isCategoryDropdownOpen = false;
    $('#categoryDropdown').addClass('hidden');
}

function initCategorySelector() {
    const $search = $('#familyCategorySearch');
    const $dropdown = $('#categoryDropdown');
    const $clearBtn = $('#clearCategoryBtn');
    const $removeBtn = $('#removeCategoryBtn');

    $search.on('focus', function () {
        if (allCategoriesForSelector.length > 0) {
            openCategoryDropdown();
            // Re-render with current search
            searchCategories($(this).val());
        }
    });

    $search.on('input', function () {
        const val = $(this).val();
        if (val && val.trim() !== '') {
            searchCategories(val);
            // Show clear button if there's text
            $clearBtn.removeClass('hidden');
        } else {
            renderCategoryList(allCategoriesForSelector, '');
            $clearBtn.addClass('hidden');
            // If no selected category, keep dropdown open
            if (!selectedCategoryForFamily) {
                openCategoryDropdown();
            }
        }
    });

    $clearBtn.on('click', function () {
        $search.val('');
        deselectCategory();
        $clearBtn.addClass('hidden');
        if (allCategoriesForSelector.length > 0) {
            openCategoryDropdown();
            renderCategoryList(allCategoriesForSelector, '');
        }
    });

    $removeBtn.on('click', function () {
        deselectCategory();
        $search.focus();
    });

    $(document).on('click', function (e) {
        if (!$(e.target).closest('#categorySelector').length) {
            closeCategoryDropdown();
        }
    });

    $search.on('keydown', function (e) {
        const $items = $('.category-item');
        const $active = $items.filter('.active');

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if ($active.length === 0) {
                $items.first().addClass('active');
            } else {
                const next = $active.next('.category-item');
                if (next.length) {
                    $active.removeClass('active');
                    next.addClass('active');
                    next[0].scrollIntoView({ block: 'nearest' });
                }
            }
        }

        if (e.key === 'ArrowUp') {
            e.preventDefault();
            if ($active.length) {
                const prev = $active.prev('.category-item');
                if (prev.length) {
                    $active.removeClass('active');
                    prev.addClass('active');
                    prev[0].scrollIntoView({ block: 'nearest' });
                }
            }
        }

        if (e.key === 'Enter' || e.key === 'Tab') {
            if ($active.length) {
                const id = parseInt($active.data('id'));
                const title = $active.data('title');
                selectCategory(id, title);
                e.preventDefault();
            }
        }

        if (e.key === 'Escape') {
            closeCategoryDropdown();
            $search.blur();
        }
    });

    fetchCategoriesForSelector();
}

$(document).ready(function () {

    resetFamilyFilters(false);

    // Close delete modal
    $('.close-delete-modal').on('click', closeFamilyDeleteModal);

    // New Family button
    $('.new-family-btn').on('click', openFamilyCreateModal);

    // Confirm delete button
    $('.confirm-delete-btn').on('click', confirmFamilyDelete);

    // ========== SEARCH - LOCAL ONLY ==========
    $familySearchInput.on('input', function () {
        applyFamilyLocalSearch();
    });

    // ========== STATUS FILTER - SERVER-SIDE ==========
    $familyStatusFilter.on('change', function () {
        applyFamilyStatusFilter();
    });

    // Modal overlay close
    $('.modal-overlay').on('click', function (e) {
        if ($(e.target).hasClass('modal-overlay')) {
            closeFamilyDeleteModal();
            closeFamilyFormModal();
        }
    });

    // Close form modal
    $('#closeFamilyFormModal').on('click', closeFamilyFormModal);

    // Form submit
    $("#FamilyForm").on('submit', handleFamilyFormSubmit);

    // Cancel create Family
    $('.cancel-create-family').on('click', closeFamilyFormModal);

    // Empty state create button
    $('#emptyFamilyBtn').on('click', openFamilyCreateModal);

    // ========== PAGINATION - SERVER-SIDE ==========
    $('#prevFamilyPageBtn').on('click', prevFamilyPage);
    $('#nextFamilyPageBtn').on('click', nextFamilyPage);

    // Refresh - fetch from server
    $('#refreshFamilies').on('click', function () {
        fetchFamilies(currentFamiliesPage, true);
    });

    $('#familyFilterResetBtn').on('click', function () {
        resetFamilyFilters(true)
    });

    $('.confirm-delete-family-btn').on('click', function () {
        confirmFamilyDelete();
    })

    $("#familyForm").on('submit', handleFamilyFormSubmit);

});

// ========== EXPOSE GLOBALLY ==========
window.openFamilyCreateModal = openFamilyCreateModal;
window.openFamilyEditModal = openFamilyEditModal;
window.openFamilyDeleteModal = openFamilyDeleteModal;
window.confirmFamilyDelete = confirmFamilyDelete;
window.closeFamilyFormModal = closeFamilyFormModal;
window.closeFamilyDeleteModal = closeFamilyDeleteModal;
window.prevFamilyPage = prevFamilyPage;
window.nextFamilyPage = nextFamilyPage;
window.resetFamilyFilters = resetFamilyFilters;
window.fetchFamilies = fetchFamilies;
window.handleFamilyFormSubmit = handleFamilyFormSubmit;
window.applyFamilyLocalSearch = applyFamilyLocalSearch;
window.applyFamilyStatusFilter = applyFamilyStatusFilter;