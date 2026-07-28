// ========== SAMPLE DATA ==========
let categories = [{
    id: 1,
    title: 'Electronics',
    slug: 'electronics',
    description: 'All electronic devices, gadgets, and accessories.',
    status: 'active',
    created_at: '2024-01-15T10:30:00Z',
    updated_at: '2024-01-15T10:30:00Z'
}, {
    id: 2,
    title: 'Clothing',
    slug: 'clothing',
    description: 'Fashion apparel, footwear, and accessories for all ages.',
    status: 'active',
    created_at: '2024-01-20T14:15:00Z',
    updated_at: '2024-02-10T09:00:00Z'
}, {
    id: 3,
    title: 'Books',
    slug: 'books',
    description: 'Fiction, non-fiction, educational, and digital books.',
    status: 'draft',
    created_at: '2024-02-01T08:45:00Z',
    updated_at: '2024-02-01T08:45:00Z'
}, {
    id: 4,
    title: 'Home & Kitchen',
    slug: 'home-kitchen',
    description: 'Furniture, appliances, cookware, and home decor.',
    status: 'active',
    created_at: '2024-02-15T16:20:00Z',
    updated_at: '2024-03-01T11:30:00Z'
}, {
    id: 5,
    title: 'Sports & Outdoors',
    slug: 'sports-outdoors',
    description: 'Sports equipment, camping gear, and outdoor activities.',
    status: 'inactive',
    created_at: '2024-03-01T12:00:00Z',
    updated_at: '2024-03-15T08:00:00Z'
}, {
    id: 6,
    title: 'Toys & Games',
    slug: 'toys-games',
    description: 'Children\'s toys, board games, and educational games.',
    status: 'active',
    created_at: '2024-03-10T09:30:00Z',
    updated_at: '2024-03-10T09:30:00Z'
}, {
    id: 7,
    title: 'Health & Beauty',
    slug: 'health-beauty',
    description: 'Skincare, cosmetics, wellness products, and supplements.',
    status: 'draft',
    created_at: '2024-03-20T13:45:00Z',
    updated_at: '2024-03-20T13:45:00Z'
}, {
    id: 8,
    title: 'Automotive',
    slug: 'automotive',
    description: 'Car parts, accessories, tools, and maintenance supplies.',
    status: 'inactive',
    created_at: '2024-04-01T10:00:00Z',
    updated_at: '2024-04-01T10:00:00Z'
},];

// ========== STATE ==========
let currentPage = 1;
const itemsPerPage = 5;
let deleteTargetId = null;
let filteredCategories = [...categories];

// ========== DOM REFS ==========
const tableBody = document.getElementById('tableBody');
const totalCount = document.getElementById('totalCount');
const showingCount = document.getElementById('showingCount');
const pageInfo = document.getElementById('pageInfo');
const prevBtn = document.getElementById('prevCategoryPageBtn');
const nextBtn = document.getElementById('nextCategoryPageBtn');
const emptyState = document.getElementById('emptyState');
const searchInput = document.getElementById('searchInput');
const statusFilter = document.getElementById('statusFilter');

// ========== RENDER TABLE ==========
function renderTable() {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const categoryItems = filteredCategories.slice(start, end);

    totalCount.textContent = filteredCategories.length;

    if (filteredCategories.length === 0) {
        tableBody.innerHTML = '';
        emptyState.classList.remove('hidden');
        showingCount.textContent = '0';
        pageInfo.textContent = 'Page 0 of 0';
        prevBtn.disabled = true;
        nextBtn.disabled = true;
        return;
    }

    emptyState.classList.add('hidden');

    // Update pagination info
    const totalPages = Math.ceil(filteredCategories.length / itemsPerPage);

    showingCount.textContent = categoryItems.length;
    pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage === totalPages;

    // Render rows
    tableBody.innerHTML = categoryItems.map(cat => `
        <tr class="table-row border-b border-gray-50 transition">
          <td class="px-4 py-3 text-sm text-gray-500 font-mono">#${cat.id}</td>
          <td class="px-4 py-3">
            <div>
              <p class="text-sm font-medium text-gray-900">${escapeHtml(cat.title)}</p>
              <p class="text-xs text-gray-400 md:hidden">${escapeHtml(cat.slug)}</p>
            </div>
          </td>
          <td class="px-4 py-3 text-sm text-gray-500 hidden md:table-cell">${escapeHtml(cat.slug)}</td>
          <td class="px-4 py-3 text-sm text-gray-500 hidden lg:table-cell max-w-xs truncate">${escapeHtml(cat.description || '-')}</td>
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
    `).join('');

    $('.category-edit-btn').click((e) => {
        const id = Number(e.currentTarget.dataset.id);
        openEditModal(id);
    });

    $('.category-delete-btn').click((e) => {
        const id = Number(e.currentTarget.dataset.id);
        openDeleteModal(id);
    });
}

// ========== HELPER FUNCTIONS ==========
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function generateSlug(title) {
    return title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

// Auto-generate slug from title
document.getElementById('title').addEventListener('input', function () {
    const slugInput = document.getElementById('slug');
    if (!slugInput.value || slugInput.dataset.auto === 'true') {
        slugInput.value = generateSlug(this.value);
        slugInput.dataset.auto = 'true';
    }
});

document.getElementById('slug').addEventListener('input', function () {
    this.dataset.auto = this.value === generateSlug(document.getElementById('title').value) ? 'true' : 'false';
});

// ========== FILTERS ==========
function filterTable() {
    const search = searchInput.value.toLowerCase().trim();
    const status = statusFilter.value;

    filteredCategories = categories.filter(cat => {
        const matchesSearch = cat.title.toLowerCase().includes(search) ||
            cat.slug.toLowerCase().includes(search) ||
            (cat.description && cat.description.toLowerCase().includes(search));
        const matchesStatus = status === 'all' || cat.status === status;
        return matchesSearch && matchesStatus;
    });

    currentPage = 1;

    renderTable();
}

function resetFilters() {
    searchInput.value = '';
    statusFilter.value = 'all';
    filterTable();
}

// ========== PAGINATION ==========
function prevCategoryPage() {
    if (currentPage > 1) {
        currentPage--;
        renderTable();
    }
}

function nextCategoryPage() {
    const totalPages = Math.ceil(filteredCategories.length / itemsPerPage);
    if (currentPage < totalPages) {
        currentPage++;
        renderTable();
    }
}

// ========== TOAST ==========
// function showToast(title, message, type = 'success') {
//     const toast = document.getElementById('toast');
//     const icon = document.getElementById('toastIcon');
//     const titleEl = document.getElementById('toastTitle');
//     const messageEl = document.getElementById('toastMessage');

//     const colors = {
//         success: 'bg-green-500',
//         error: 'bg-brand',
//         warning: 'bg-amber-500',
//         info: 'bg-blue-500'
//     };

//     const icons = {
//         success: 'fa-check',
//         error: 'fa-exclamation',
//         warning: 'fa-exclamation-triangle',
//         info: 'fa-info'
//     };

//     icon.className = `w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${colors[type] || colors.success}`;
//     icon.innerHTML = `<i class="fas ${icons[type] || icons.success} text-white"></i>`;

//     titleEl.textContent = title;
//     messageEl.textContent = message;

//     toast.classList.remove('hidden');

//     // Auto-hide after 4 seconds
//     clearTimeout(window.toastTimeout);
//     window.toastTimeout = setTimeout(hideToast, 4000);
// }

// function hideToast() {
//     document.getElementById('toast').classList.add('hidden');
// }

// ========== MODALS ==========
function openCreateModal() {
    document.getElementById('formModalTitle').textContent = 'Create New Category';
    document.getElementById('formSubmitBtn').innerHTML = '<i class="fas fa-save mr-2"></i> Save Category';
    document.getElementById('categoryForm').reset();
    document.getElementById('editId').value = '';
    document.getElementById('slug').dataset.auto = 'false';
    document.getElementById('formModal').classList.remove('hidden');
    document.getElementById('formModal').style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function openEditModal(id) {
    const cat = categories.find(c => c.id === id);
    if (!cat) return;

    document.getElementById('formModalTitle').textContent = 'Edit Category';
    document.getElementById('formSubmitBtn').innerHTML = '<i class="fas fa-save mr-2"></i> Update Category';
    document.getElementById('editId').value = cat.id;
    document.getElementById('title').value = cat.title;
    document.getElementById('slug').value = cat.slug;
    document.getElementById('slug').dataset.auto = 'true';
    document.getElementById('description').value = cat.description || '';
    document.getElementById('status').value = cat.status;

    document.getElementById('formModal').classList.remove('hidden');
    document.getElementById('formModal').style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeFormModal() {
    document.getElementById('formModal').classList.add('hidden');
    document.getElementById('formModal').style.display = 'none';
    document.body.style.overflow = '';
}

function openDeleteModal(id) {
    const cat = categories.find(c => c.id === id);
    if (!cat) return;
    deleteTargetId = id;
    document.getElementById('deleteTitle').textContent = `"${cat.title}"`;
    document.getElementById('deleteModal').classList.remove('hidden');
    document.getElementById('deleteModal').style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeDeleteModal() {
    document.getElementById('deleteModal').classList.add('hidden');
    document.getElementById('deleteModal').style.display = 'none';
    document.body.style.overflow = '';
    deleteTargetId = null;
}

// ========== FORM SUBMIT ==========
function handleFormSubmit(e) {
    e.preventDefault();

    const id = document.getElementById('editId').value;
    const title = document.getElementById('title').value.trim();
    const slug = document.getElementById('slug').value.trim() || generateSlug(title);
    const description = document.getElementById('description').value.trim();
    const status = document.getElementById('status').value;

    if (!title || !slug) {
        showToast('Validation Error', 'Title and slug are required.', 'error');
        return;
    }

    // Check for duplicate slug
    const duplicate = categories.find(c => c.slug === slug && c.id != id);
    if (duplicate) {
        showToast('Duplicate Slug', 'A category with this slug already exists.', 'error');
        return;
    }

    if (id) {
        // EDIT
        const index = categories.findIndex(c => c.id === parseInt(id));
        if (index !== -1) {
            categories[index] = {
                ...categories[index],
                title,
                slug,
                description,
                status,
                updated_at: new Date().toISOString()
            };

            Notification.showNotification({
                type: 'success',
                message: 'Category updated successfully.'
            })
        }
    } else {
        // CREATE
        const newCategory = {
            id: Math.max(...categories.map(c => c.id), 0) + 1,
            title,
            slug,
            description,
            status,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        categories.push(newCategory);
        Notification.showNotification({
            type: 'success',
            message: 'Category created successfully.'
        });
    }

    closeFormModal();
    filterTable();
}

function confirmDelete() {
    if (deleteTargetId === null) return;

    const index = categories.findIndex(c => c.id === deleteTargetId);
    if (index !== -1) {
        const deleted = categories[index];
        categories.splice(index, 1);
        Notification.showNotification({
            type: 'warning',
            message: `Category "${deleted.title}" has been deleted.`
        })
    }

    closeDeleteModal();
    filterTable();
}

// // ========== MOBILE SIDEBAR ==========
// const sidebar = document.getElementById('sidebar');
// const mobileOverlay = document.getElementById('mobileOverlay');
// const mobileMenuBtn = document.getElementById('mobileMenuBtn');

// function openMobileSidebar() {
//     sidebar.classList.add('mobile-open');
//     mobileOverlay.classList.add('active');
//     document.body.style.overflow = 'hidden';
// }

// function closeMobileSidebar() {
//     sidebar.classList.remove('mobile-open');
//     mobileOverlay.classList.remove('active');
//     document.body.style.overflow = '';
// }

// mobileMenuBtn.addEventListener('click', openMobileSidebar);

// // Close sidebar on link click (mobile)
// document.querySelectorAll('.sidebar-link').forEach(link => {
//     link.addEventListener('click', () => {
//         if (window.innerWidth < 1024) {
//             closeMobileSidebar();
//         }
//     });
// });

// // ========== SIDEBAR NAVIGATION ==========
// document.querySelectorAll('.sidebar-link').forEach(link => {
//     link.addEventListener('click', function (e) {
//         e.preventDefault();
//         document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
//         this.classList.add('active');
//     });
// });

// ========== KEYBOARD SHORTCUTS ==========
document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
        if (!document.getElementById('formModal').classList.contains('hidden')) {
            closeFormModal();
        }
        if (!document.getElementById('deleteModal').classList.contains('hidden')) {
            closeDeleteModal();
        }
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        openCreateModal();
    }
});

let fetchedCategories = false;

async function fetchCategories() {
    //categorySkeleton
    //categoriesContainer

    // $('#categoriesContainer').addClass('hidden');

    if (!fetchedCategories) {
        $('#categorySkeletonLoader').removeClass('hidden');
        $('#categorySyncLoader').addClass('hidden');
    } else {
        $('#categorySyncLoader').removeClass('hidden');
        $('#categorySkeletonLoader').addClass('hidden');
    }

    // skeletonLoader.classList.remove('hidden');
    // tableContent.classList.add('hidden');

    emptyState.classList.add('hidden');

    // Simulate API delay (1.5 seconds)
    setTimeout(() => {


        $('#categorySyncLoader').addClass('hidden');
        $('#categorySkeletonLoader').addClass('hidden');

        $('#categoriesContainer').removeClass('hidden');
        fetchedCategories = true;

        renderTable();
    }, 5000);
}

$(document).ready(() => {
    $('.close-delete-modal').click(() => {
        closeDeleteModal();
    });

    $('.new-category-btn').click(() => {
        openCreateModal();
    });

    $('.confirm-delete-btn').click(() => {
        confirmDelete();
    });

    $('#searchInput').on('keyup', (e) => {
        filterTable();
    });

    $('#statusFilter').on('change', (e) => {
        filterTable();
    });

    $('#resetFilters').click(() => {
        resetFilters();
    });

    $('.modal-overlay').click((e) => {
        closeDeleteModal();
        closeFormModal();

    });

    $('#closeFormModal').click(() => {
        closeFormModal();
    });

    $("#categoryForm").on('submit', (e) => {
        handleFormSubmit(e);
    });

    $('.cancel-create-category').click((e) => {
        closeFormModal();
    });

    $('#emptyCategoryBtn').click((e) => {
        openCreateModal();
    });

    prevBtn.addEventListener('click', (e) => {
        prevCategoryPage();
    });

    nextBtn.addEventListener('click', (e) => {
        nextCategoryPage();
    });

    $('#refreshCategories').click('click', (e) => {
        fetchCategories();
    })

})

renderTable();