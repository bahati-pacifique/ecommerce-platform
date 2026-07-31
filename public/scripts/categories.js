// ========== STATE ==========
let currentPage = 1;
const itemsPerPage = 31;
let deleteTargetId = null;
let allCategories = [];
let filteredCategories = [];
let currentSearchTerm = '';
let currentStatusFilter = 'all';
let paginationData = {
    counts: 0,
    totalPages: 0,
    page: 1,
    limit: 5
};
let isFetching = false;

const $tableBody = $('#tableBody');
const $totalCount = $('#totalCount');
const $showingCount = $('#showingCount');
const $pageInfo = $('#pageInfo');
const $prevBtn = $('#prevCategoryPageBtn');
const $nextBtn = $('#nextCategoryPageBtn');
const $emptyState = $('#emptyState');
const $searchInput = $('#searchInput');
const $statusFilter = $('#statusFilter');

function renderCategoryTable() {

    const data = filteredCategories || [];
    const totalItems = data.length;

    $totalCount.text(paginationData.counts || 0);

    if (totalItems === 0 && paginationData.counts === 0) {
        $tableBody.html('');
        $emptyState.removeClass('hidden');
        $showingCount.text('0');
        $pageInfo.text('Page 0 of 0');
        $prevBtn.prop('disabled', true);
        $nextBtn.prop('disabled', true);
        return;
    }

    $emptyState.addClass('hidden');

    const totalPages = paginationData.totalPages || 1;
    const currentPageNum = paginationData.page || 1;

    $showingCount.text(data.length);
    $pageInfo.text(`Page ${currentPageNum} of ${totalPages}`);
    $prevBtn.prop('disabled', currentPageNum <= 1);
    $nextBtn.prop('disabled', currentPageNum >= totalPages);

    if (data.length === 0 && paginationData.totalCategories > 0) {
        $tableBody.html(`
            <tr>
                <td colspan="6" class="text-center py-8 text-gray-500">
                    <i class="fas fa-search text-2xl block mb-2"></i>
                    No categories match your search criteria.
                </td>
            </tr>
        `);
        return;
    }

    let html = '';
    data.forEach(cat => {
        html += `
            <tr class="table-row border-b border-gray-50 transition">
                
                <td class="px-4 py-3">
                    <div>
                        <p class="text-sm font-medium text-gray-900">${cat.title}</p>
                        <p class="text-xs text-gray-400 md:hidden">${cat.slug}</p>
                    </div>
                </td>
                <td class="px-4 py-3 text-sm text-gray-500 hidden md:table-cell">${cat.slug}</td>
                <td class="px-4 py-3 text-sm text-gray-500 hidden lg:table-cell max-w-xs truncate">${cat.description || '-'}</td>
                <td class="px-4 py-3 text-center">
                    <span class="status-badge ${cat.status}">${cat.status}</span>
                </td>
                <td class="px-4 py-3 text-center">
                    <div class="flex items-center justify-center gap-2">
                        <button class="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition category-edit-btn" title="Edit" data-id="${cat.id}">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="p-1.5 rounded-lg text-brand hover:bg-brand-light transition category-delete-btn" title="Delete" data-id="${cat.id}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });
    $tableBody.html(html);

    $('.category-edit-btn').off('click').on('click', function () {
        const id = parseInt($(this).data('id'));
        openEditModal(id);
    });

    $('.category-delete-btn').off('click').on('click', function () {
        const id = parseInt($(this).data('id'));
        openDeleteModal(id);
    });
}

$('#title').on('input', function () {
    const $slugInput = $('#slug');
    if (!$slugInput.val() || $slugInput.data('auto') === 'true') {
        $slugInput.val(generateSlug($(this).val()));
        $slugInput.data('auto', 'true');
    }
});

$('#slug').on('input', function () {
    const title = $('#title').val();
    const auto = $(this).val() === generateSlug(title);
    $(this).data('auto', auto);
});

function applyLocalSearch() {
    const search = $searchInput.val().toLowerCase().trim();

    currentSearchTerm = search;

    if (!allCategories || allCategories.length === 0) {
        filteredCategories = [];
        renderCategoryTable();
        return;
    }

    if (search === '') {
        filteredCategories = [...allCategories];
        currentPage = 1;
        renderCategoryTable();
        return;
    }

    filteredCategories = allCategories.filter(cat => {
        return cat.title.toLowerCase().includes(search) ||
            cat.slug.toLowerCase().includes(search) ||
            (cat.description && cat.description.toLowerCase().includes(search));
    });

    currentPage = 1;
    renderCategoryTable();
}

// ========== STATUS FILTER (server-side) ==========
function applyStatusFilter() {
    const status = $statusFilter.val();

    currentStatusFilter = status;
    currentPage = 1;

    fetchCategories(1);
}


function resetFilters(shouldFetch = true) {
    $searchInput.val('');
    $statusFilter.val('all');
    currentSearchTerm = '';
    currentStatusFilter = 'all';
    currentPage = 1;

    if (shouldFetch) fetchCategories(1);
}

// ========== PAGINATION (server-side) ==========
function prevCategoryPage() {
    if (paginationData.page > 1) {
        const newPage = Number(paginationData.page) - 1;
        fetchCategories(newPage);
    }
}

function nextCategoryPage() {
    if (paginationData.page < paginationData.totalPages) {
        const newPage = Number(paginationData.page) + 1;
        fetchCategories(newPage);
    }
}


async function fetchCategories(page = 1, isRefesh = false) {
    if (isFetching) return;
    isFetching = true;

    const $skeletonLoader = $('#categorySkeletonLoader');
    const $syncLoader = $('#categorySyncLoader');
    const $container = $('#categoriesContainer');

    if (!isRefesh) {
        $skeletonLoader.removeClass('hidden');
        $syncLoader.addClass('hidden');
        $container.addClass('hidden');
    } else {
        $skeletonLoader.addClass('hidden');
        $syncLoader.removeClass('hidden');
    }

    $emptyState.addClass('hidden');

    try {
        const params = {
            page: page,
            limit: itemsPerPage
        };

        if (currentStatusFilter && currentStatusFilter !== 'all') {
            params.status = currentStatusFilter;
        }

        const response = await axios.get(`/product-categories/`, {
            params: params,
            withCredentials: true
        });

        let categories = [];
        let pagination = {};

        allCategories = response.data.categories || [];
        paginationData = response.data.pagination || {
            counts: 0,
            totalPages: 0,
            currentPage: 1,
            limit: 5
        };

        if (currentSearchTerm && currentSearchTerm !== '') {
            filteredCategories = allCategories.filter(cat => {
                return cat.title.toLowerCase().includes(currentSearchTerm) ||
                    cat.slug.toLowerCase().includes(currentSearchTerm) ||
                    (cat.description && cat.description.toLowerCase().includes(currentSearchTerm));
            });
        } else {
            filteredCategories = [...allCategories];
        }

        renderCategoryTable();

    } catch (error) {
        console.error('Fetch error:', error);
        allCategories = [];
        filteredCategories = [];
        paginationData = {
            totalCategories: 0,
            totalPages: 0,
            currentPage: 1,
            limit: 5
        };

        renderCategoryTable();

        Notification.showNotification({
            type: 'error',
            message: error.response?.data?.message || 'Failed to load categories'
        });
    } finally {
        isFetching = false;
        $('#categorySkeletonLoader').addClass('hidden');
        $('#categorySyncLoader').addClass('hidden');
        $('#categoriesContainer').removeClass('hidden');
    }
}

async function fetchCategoryById(id) {
    try {
        const response = await axios.get(`/product-categories/${id}`, {
            withCredentials: true
        });
        return response.data || null;
    } catch (error) {
        Notification.showNotification({
            type: 'error',
            message: error.response?.data?.message || 'Failed to fetch category details'
        });
        return null;
    }
}

async function createCategory(data) {
    try {
        const response = await axios.post('/product-categories/', data, {
            withCredentials: true
        });

        const newCategory = response.data.category || response.data.data?.category || response.data;

        await fetchCategories(currentPage);

        Notification.showNotification({
            type: 'success',
            message: 'Category created successfully!'
        });

        closeFormModal();

    } catch (error) {
        console.error('Create error:', error);
        Notification.showNotification({
            type: 'error',
            message: errorMessage
        });
    }
}

async function updateCategory(id, data) {

    try {
        const response = await axios.put(`/product-categories/${id}`, {
            id,
            ...data
        }, {
            withCredentials: true
        });

        Notification.showNotification({
            type: 'success',
            message: 'Category updated successfully!'
        });

        await fetchCategories(currentPage);

        return true;

    } catch (error) {
        console.error('Update error:', error);
        Notification.showNotification({
            type: 'error',
            message: error.response?.data?.message || 'Failed to update category'
        });
    }
}

// DELETE category
async function deleteCategory(id) {
    try {
        const response = await axios.delete(`/product-categories/${id}`, {
            withCredentials: true
        });

        Notification.showNotification({
            type: 'warning',
            title: "",
            message: 'Category has been deleted.'
        });

        await fetchCategories(currentPage);
        return true;

    } catch (error) {
        console.error('Delete error:', error);
        Notification.showNotification({
            type: 'error',
            message: error.response?.data?.message || 'Failed to delete category'
        });
    }
}

// REMOVE category
async function removeCategory(id) {
    try {
        const response = await axios.patch(`/product-categories/remove/${id}`, {
            withCredentials: true
        });

        Notification.showNotification({
            type: 'success',
            message: 'Category has been removed.'
        });

        closeDeleteModal();

        await fetchCategories(currentPage);
    } catch (error) {
        console.error('Remove error:', error);
        Notification.showNotification({
            type: 'error',
            message: error.response?.data?.message || 'Failed to remove category'
        });
    }
}

function openCreateModal() {
    $('#formModalTitle').text('Create New Category');
    $('#formSubmitBtn').html('Submit');
    $('#categoryForm')[0].reset();
    $('#editId').val('');
    $('#slug').data('auto', 'false');
    $('#formModal').removeClass('hidden').css('display', 'flex');
    $('body').css('overflow', 'hidden');
}

let originalEditing;

async function openEditModal(id) {

    $('#formModal').removeClass('hidden').css('display', 'flex');
    $('body').css('overflow', 'hidden');

    $('#categoryForm').addClass('hidden');
    $('#categoryModalLoader').removeClass('hidden');

    const cat = await fetchCategoryById(id);

    $('#categoryForm').removeClass('hidden');
    $('#categoryModalLoader').addClass('hidden');

    if (!cat) {
        Notification.showNotification({
            type: 'error',
            title: "",
            message: 'Category not found'
        });
        return;
    }

    originalEditing = cat;

    $('#formModalTitle').text('Edit Category');
    $('#formSubmitBtn').html('Update');
    $('#editId').val(cat.id);
    $('#title').val(cat.title);
    $('#slug').val(cat.slug).data('auto', 'true');
    $('#description').val(cat.description || '');
    $('#status').val(cat.status);

}

function closeFormModal() {
    $('#formModal').addClass('hidden').css('display', 'none');
    $('body').css('overflow', '');
}

function openDeleteModal(id) {
    const cat = filteredCategories.find(c => c.id === id);
    if (!cat) return;
    deleteTargetId = id;
    $('#deleteTitle').text(`"${cat.title}"`);
    $('#deleteModal').removeClass('hidden').css('display', 'flex');
    $('body').css('overflow', 'hidden');
}

function closeDeleteModal() {
    $('#deleteModal').addClass('hidden').css('display', 'none');
    $('body').css('overflow', '');
    deleteTargetId = null;
}

async function handleFormSubmit(e) {
    e.preventDefault();

    const id = $('#editId').val();
    const title = $('#title').val().trim();
    const slug = $('#slug').val().trim() || generateSlug(title);
    const description = $('#description').val().trim();
    const status = $('#status').val();

    if (!title || !slug) {
        Notification.showNotification({
            type: 'error',
            message: 'Title and slug are required.'
        });
        return;
    }

    const formData = { title, slug, description, status };

    const $submitBtn = $('#formSubmitBtn');
    const originalText = $submitBtn.html();

    $submitBtn.html('Saving...').prop('disabled', true);

    if (id) {
        const payload = getChangedAttributes(originalEditing, formData);
        await updateCategory(parseInt(id), payload);
    } else {
        await createCategory(formData);
    }

    $submitBtn.html(originalText).prop('disabled', false);
}

async function confirmDelete() {
    if (deleteTargetId === null) return;

    const $confirmBtn = $('.confirm-delete-btn');
    const originalText = $confirmBtn.html();
    $confirmBtn.html('<i class="bi bi-trash"></i> Deleting...').prop('disabled', true);

    await removeCategory(deleteTargetId);

    $confirmBtn.html(originalText).prop('disabled', false);
}

$(document).on('keydown', function (e) {
    if (e.key === 'Escape') {
        if (!$('#formModal').hasClass('hidden')) {
            closeFormModal();
        }
        if (!$('#deleteModal').hasClass('hidden')) {
            closeDeleteModal();
        }
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        openCreateModal();
    }
});

$(document).ready(function () {

    resetFilters(false);

    // Close delete modal
    $('.close-delete-modal').on('click', closeDeleteModal);

    // New category button
    $('.new-category-btn').on('click', openCreateModal);

    // Confirm delete button
    $('.confirm-delete-btn').on('click', confirmDelete);

    // ========== SEARCH - LOCAL ONLY ==========
    $searchInput.on('input', function () {
        applyLocalSearch();
    });

    // ========== STATUS FILTER - SERVER-SIDE ==========
    $statusFilter.on('change', function () {
        applyStatusFilter();
    });

    // Reset filters
    $('#resetFilters').on('click', resetFilters);

    // Modal overlay close
    $('.modal-overlay').on('click', function (e) {
        if ($(e.target).hasClass('modal-overlay')) {
            closeDeleteModal();
            closeFormModal();
        }
    });

    // Close form modal
    $('#closeFormModal').on('click', closeFormModal);

    // Form submit
    $("#categoryForm").on('submit', handleFormSubmit);

    // Cancel create category
    $('.cancel-create-category').on('click', closeFormModal);

    // Empty state create button
    $('#emptyCategoryBtn').on('click', openCreateModal);

    // ========== PAGINATION - SERVER-SIDE ==========
    $('#prevCategoryPageBtn').on('click', prevCategoryPage);
    $('#nextCategoryPageBtn').on('click', nextCategoryPage);

    // Refresh - fetch from server
    $('#refreshCategories').on('click', function () {
        fetchCategories(currentPage, true);
    });

    $('#categoryFilterResetBtn').on('click', function () {
        resetFilters(true)
    });
});

// ========== EXPOSE GLOBALLY ==========
window.openCreateModal = openCreateModal;
window.openEditModal = openEditModal;
window.openDeleteModal = openDeleteModal;
window.confirmDelete = confirmDelete;
window.closeFormModal = closeFormModal;
window.closeDeleteModal = closeDeleteModal;
window.prevCategoryPage = prevCategoryPage;
window.nextCategoryPage = nextCategoryPage;
window.resetFilters = resetFilters;
window.fetchCategories = fetchCategories;
window.handleFormSubmit = handleFormSubmit;
window.applyLocalSearch = applyLocalSearch;
window.applyStatusFilter = applyStatusFilter;