// ========== VENDOR STATE ==========
let currentVendorPage = 1;
const vendorItemsPerPage = 20;
let deleteVendorTargetId = null;
let allVendors = [];
let filteredVendors = [];
let currentVendorSearchTerm = '';
let currentVendorTypeFilter = 'all';
let currentVendorStatusFilter = 'all';
let vendorPaginationData = {
    totalVendors: 0,
    totalPages: 0,
    page: 1,
    limit: 20
};
let isFetchingVendor = false;
let vendorOriginalEditing = null;

// ========== DOM REFS ==========
const $vendorsTableBody = $('#vendorsTableBody');
const $vendorsTotalCount = $('#vendorTotalCount');
const $vendorShowingCount = $('#vendorShowingCount');
const $vendorsPageInfo = $('#vendorsPageInfo');
const $prevVendorPageBtn = $('#prevVendorPageBtn');
const $nextVendorPageBtn = $('#nextVendorPageBtn');
const $vendorsEmptyState = $('#vendorsEmptyState');
const $vendorSearchInput = $('#vendorSearchInput');
const $vendorTypeFilter = $('#vendorTypeFilter');
const $vendorStatusFilter = $('#vendorStatusFilter');

// ========== RENDER VENDORS TABLE ==========
function renderVendorsTable() {
    const data = filteredVendors || [];
    const totalItems = data.length;

    $vendorsTotalCount.text(vendorPaginationData.totalVendors || 0);

    if (totalItems === 0 && vendorPaginationData.totalVendors === 0) {
        $vendorsTableBody.html('');
        $vendorsEmptyState.removeClass('hidden');
        $vendorShowingCount.text('0');
        $vendorsPageInfo.text('Page 0 of 0');
        $prevVendorPageBtn.prop('disabled', true);
        $nextVendorPageBtn.prop('disabled', true);
        return;
    }

    $vendorsEmptyState.addClass('hidden');

    const totalPages = vendorPaginationData.totalPages || 1;
    const currentPageNum = vendorPaginationData.page || 1;

    $vendorShowingCount.text(data.length);
    $vendorsPageInfo.text(`Page ${currentPageNum} of ${totalPages}`);
    $prevVendorPageBtn.prop('disabled', currentPageNum <= 1);
    $nextVendorPageBtn.prop('disabled', currentPageNum >= totalPages);

    if (data.length === 0 && vendorPaginationData.totalVendors > 0) {
        $vendorsTableBody.html(`
            <tr>
                <td colspan="6" class="text-center py-8 text-gray-500">
                    <i class="fas fa-search text-2xl block mb-2"></i>
                    No vendors match your search criteria.
                </td>
            </tr>
        `);
        return;
    }

    const getStatusBadge = (status) => {
        const colors = {
            active: 'bg-green-100 text-green-700 border-green-200',
            inactive: 'bg-red-100 text-red-700 border-red-200',
            draft: 'bg-yellow-100 text-yellow-700 border-yellow-200',
        };
        return colors[status] || 'bg-gray-100 text-gray-700 border-gray-200';
    };

    const getVerificationBadge = (status) => {
        const colors = {
            verified: 'bg-green-100 text-green-700 border-green-200',
            pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
            rejected: 'bg-red-100 text-red-700 border-red-200',
            suspended: 'bg-orange-100 text-orange-700 border-orange-200',
        };
        return colors[status] || 'bg-gray-100 text-gray-700 border-gray-200';
    };

    let html = '';
    data.forEach(vendor => {
        html += `
            <tr class="table-row border-b border-gray-50 transition">
                <td class="px-4 py-3">
                    <div>
                        <p class="text-sm font-medium text-gray-900">${stripHtml2(vendor.business_name)}</p>
                        <p class="text-xs text-gray-400">${stripHtml2(vendor.user?.email || 'No email')}</p>
                        <p class="text-xs text-gray-400 md:hidden">${stripHtml2(vendor.type || '')}</p>
                    </div>
                </td>
                <td class="px-4 py-3 text-sm text-gray-600 hidden md:table-cell">
                    <span class="capitalize">${stripHtml2(vendor.type || '-')}</span>
                </td>
                <td class="px-4 py-3 text-sm text-gray-500 hidden lg:table-cell">
                    <div>${vendor.tin_number ? stripHtml2(vendor.tin_number) : '-'}</div>
                    <div class="text-xs text-gray-400">${vendor.vat_number ? stripHtml2(vendor.vat_number) : ''}</div>
                </td>
                <td class="px-4 py-3 text-center">
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusBadge(vendor.status)}">
                        ${vendor.status}
                    </span>
                </td>
                <td class="px-4 py-3 text-center">
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getVerificationBadge(vendor.verification_status)}">
                        ${vendor.verification_status}
                    </span>
                </td>
                <td class="px-4 py-3 text-center">
                    <div class="flex items-center justify-center gap-2">
                        <button class="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition vendor-edit-btn" title="Edit" data-id="${vendor.id}">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="p-1.5 rounded-lg text-brand hover:bg-brand-light transition vendor-delete-btn" title="Delete" data-id="${vendor.id}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });
    $vendorsTableBody.html(html);

    $('.vendor-edit-btn').off('click').on('click', function() {
        const id = $(this).data('id');
        openVendorEditModal(id);
    });

    $('.vendor-delete-btn').off('click').on('click', function() {
        const id = $(this).data('id');
        openVendorDeleteModal(id);
    });
}

// ========== VENDOR SEARCH (LOCAL) ==========
function applyVendorLocalSearch() {
    const search = $vendorSearchInput.val().toLowerCase().trim();
    currentVendorSearchTerm = search;

    if (!allVendors || allVendors.length === 0) {
        filteredVendors = [];
        renderVendorsTable();
        return;
    }

    if (search === '') {
        filteredVendors = [...allVendors];
        currentVendorPage = 1;
        renderVendorsTable();
        return;
    }

    filteredVendors = allVendors.filter(vendor => {
        return vendor.business_name.toLowerCase().includes(search) ||
            (vendor.user?.email && vendor.user.email.toLowerCase().includes(search)) ||
            (vendor.tin_number && vendor.tin_number.toLowerCase().includes(search)) ||
            (vendor.vat_number && vendor.vat_number.toLowerCase().includes(search));
    });

    currentVendorPage = 1;
    renderVendorsTable();
}

// ========== VENDOR FILTERS ==========
function applyVendorFilters() {
    const type = $vendorTypeFilter.val();
    const status = $vendorStatusFilter.val();

    currentVendorTypeFilter = type;
    currentVendorStatusFilter = status;

    let filtered = [...allVendors];

    if (type !== 'all') {
        filtered = filtered.filter(v => v.type === type);
    }

    if (status !== 'all') {
        filtered = filtered.filter(v => v.status === status);
    }

    // Apply search if exists
    if (currentVendorSearchTerm && currentVendorSearchTerm !== '') {
        filtered = filtered.filter(vendor => {
            return vendor.business_name.toLowerCase().includes(currentVendorSearchTerm) ||
                (vendor.user?.email && vendor.user.email.toLowerCase().includes(currentVendorSearchTerm)) ||
                (vendor.tin_number && vendor.tin_number.toLowerCase().includes(currentVendorSearchTerm));
        });
    }

    filteredVendors = filtered;
    currentVendorPage = 1;
    renderVendorsTable();
}

// ========== RESET FILTERS ==========
function resetVendorFilters(shouldFetch = true) {
    $vendorSearchInput.val('');
    $vendorTypeFilter.val('all');
    $vendorStatusFilter.val('all');
    currentVendorSearchTerm = '';
    currentVendorTypeFilter = 'all';
    currentVendorStatusFilter = 'all';
    currentVendorPage = 1;

    if (shouldFetch) fetchVendors(1);
}

// ========== PAGINATION ==========
function prevVendorPage() {
    if (vendorPaginationData.page > 1) {
        const newPage = Number(vendorPaginationData.page) - 1;
        fetchVendors(newPage);
    }
}

function nextVendorPage() {
    if (vendorPaginationData.page < vendorPaginationData.totalPages) {
        const newPage = Number(vendorPaginationData.page) + 1;
        fetchVendors(newPage);
    }
}

// ========== API CALLS ==========

async function fetchVendors(page = 1, isRefresh = false) {
    if (isFetchingVendor) return;
    isFetchingVendor = true;

    const $skeletonLoader = $('#vendorSkeletonLoader');
    const $container = $('#vendorsContainer');

    if (!isRefresh) {
        $skeletonLoader.removeClass('hidden');
        $container.addClass('hidden');
    }

    $vendorsEmptyState.addClass('hidden');

    try {
        const params = {
            page: page,
            limit: vendorItemsPerPage
        };

        if (currentVendorTypeFilter && currentVendorTypeFilter !== 'all') {
            params.type = currentVendorTypeFilter;
        }

        if (currentVendorStatusFilter && currentVendorStatusFilter !== 'all') {
            params.status = currentVendorStatusFilter;
        }

        // In production, use your actual API endpoint:
        // const response = await axios.get('/vendors/', { params, withCredentials: true });
        
        // Mock data for demo
        await new Promise(r => setTimeout(r, 500));
        const mockData = generateMockVendors();
        
        // Apply filters
        let filtered = mockData;
        if (currentVendorTypeFilter !== 'all') {
            filtered = filtered.filter(v => v.type === currentVendorTypeFilter);
        }
        if (currentVendorStatusFilter !== 'all') {
            filtered = filtered.filter(v => v.status === currentVendorStatusFilter);
        }

        allVendors = filtered;

        vendorPaginationData = {
            totalVendors: filtered.length,
            totalPages: Math.ceil(filtered.length / vendorItemsPerPage),
            page: page,
            limit: vendorItemsPerPage
        };

        currentVendorPage = vendorPaginationData.page;

        if (currentVendorSearchTerm && currentVendorSearchTerm !== '') {
            filteredVendors = allVendors.filter(vendor => {
                return vendor.business_name.toLowerCase().includes(currentVendorSearchTerm) ||
                    (vendor.user?.email && vendor.user.email.toLowerCase().includes(currentVendorSearchTerm)) ||
                    (vendor.tin_number && vendor.tin_number.toLowerCase().includes(currentVendorSearchTerm));
            });
        } else {
            filteredVendors = [...allVendors];
        }

        renderVendorsTable();

    } catch (error) {
        console.error('Fetch error:', error);
        allVendors = [];
        filteredVendors = [];
        vendorPaginationData = {
            totalVendors: 0,
            totalPages: 0,
            page: 1,
            limit: vendorItemsPerPage
        };
        renderVendorsTable();

        Notification.showNotification({
            type: 'error',
            message: error.response?.data?.message || 'Failed to load vendors'
        });

    } finally {
        isFetchingVendor = false;
        $('#vendorSkeletonLoader').addClass('hidden');
        $('#vendorsContainer').removeClass('hidden');
    }
}

// ========== MOCK DATA ==========
function generateMockVendors() {
    return [
        {
            id: '550e8400-e29b-41d4-a716-446655440000',
            business_name: 'Tech Supplies Rwanda',
            user: { email: 'info@techsupplies.rw' },
            business_address: 'KG 123 St, Kigali',
            tin_number: 'TIN-123456',
            vat_number: 'VAT-789012',
            tax_registered: 'Registered',
            tax_country: 'Rwanda',
            type: 'wholesaler',
            category: 'internal',
            verification_status: 'verified',
            status: 'active',
            joined_at: '2024-01-15T10:30:00Z',
            updated_at: '2024-01-15T10:30:00Z'
        },
        {
            id: '550e8400-e29b-41d4-a716-446655440001',
            business_name: 'Global Electronics Ltd',
            user: { email: 'contact@globalelectronics.com' },
            business_address: 'Nyarutarama, Kigali',
            tin_number: 'TIN-789012',
            vat_number: 'VAT-345678',
            tax_registered: 'Registered',
            tax_country: 'Rwanda',
            type: 'manufacturer',
            category: 'external',
            verification_status: 'pending',
            status: 'active',
            joined_at: '2024-02-10T14:20:00Z',
            updated_at: '2024-02-10T14:20:00Z'
        },
        {
            id: '550e8400-e29b-41d4-a716-446655440002',
            business_name: 'Local Supplies Co',
            user: { email: 'sales@localsupplies.rw' },
            business_address: 'KK 45 St, Kigali',
            tin_number: 'TIN-345678',
            vat_number: null,
            tax_registered: 'Pending',
            tax_country: 'Rwanda',
            type: 'retailer',
            category: 'internal',
            verification_status: 'rejected',
            status: 'inactive',
            joined_at: '2024-03-01T09:00:00Z',
            updated_at: '2024-03-15T16:30:00Z'
        },
        {
            id: '550e8400-e29b-41d4-a716-446655440003',
            business_name: 'Mega Distributors',
            user: { email: 'info@megadistributors.com' },
            business_address: 'Gishushu, Kigali',
            tin_number: 'TIN-901234',
            vat_number: 'VAT-567890',
            tax_registered: 'Registered',
            tax_country: 'Rwanda',
            type: 'distributor',
            category: 'preferred',
            verification_status: 'verified',
            status: 'active',
            joined_at: '2024-01-25T11:45:00Z',
            updated_at: '2024-04-01T08:00:00Z'
        },
        {
            id: '550e8400-e29b-41d4-a716-446655440004',
            business_name: 'Green Energy Solutions',
            user: { email: 'hello@greenenergy.rw' },
            business_address: 'Kimihurura, Kigali',
            tin_number: 'TIN-567890',
            vat_number: 'VAT-901234',
            tax_registered: 'Registered',
            tax_country: 'Rwanda',
            type: 'supplier',
            category: 'standard',
            verification_status: 'suspended',
            status: 'draft',
            joined_at: '2024-04-10T13:00:00Z',
            updated_at: '2024-05-01T10:00:00Z'
        }
    ];
}

// ========== CRUD OPERATIONS ==========

async function fetchVendorById(id) {
    try {
        const response = await axios.get(`/vendors/${id}`, {
            withCredentials: true
        });
        return response.data || null;
    } catch (error) {
        Notification.showNotification({
            type: 'error',
            message: error.response?.data?.message || 'Failed to fetch vendor details'
        });
        return null;
    }
}

async function createVendor(data) {
    try {
        const response = await axios.post('/vendors/', data, {
            withCredentials: true
        });

        const newVendor = response.data.vendor || response.data;

        if (newVendor && newVendor.id) {
            await fetchVendors(1, true);
            Notification.showNotification({
                type: 'success',
                message: 'Vendor created successfully!'
            });
            return true;
        }
        throw new Error('Invalid response format');
    } catch (error) {
        console.error('Create error:', error);
        Notification.showNotification({
            type: 'error',
            message: error.response?.data?.message || 'Failed to create vendor'
        });
        return false;
    }
}

async function updateVendor(id, data) {
    try {
        const response = await axios.put(`/vendors/${id}`, {
            id,
            ...data
        }, {
            withCredentials: true
        });

        Notification.showNotification({
            type: 'success',
            message: 'Vendor updated successfully!'
        });

        await fetchVendors(currentVendorPage, true);
        return true;
    } catch (error) {
        console.error('Update error:', error);
        Notification.showNotification({
            type: 'error',
            message: error.response?.data?.message || 'Failed to update vendor'
        });
        return false;
    }
}

async function deleteVendor(id) {
    try {
        await axios.delete(`/vendors/${id}`, {
            withCredentials: true
        });

        Notification.showNotification({
            type: 'warning',
            message: 'Vendor has been deleted.'
        });

        await fetchVendors(currentVendorPage, true);
        return true;
    } catch (error) {
        console.error('Delete error:', error);
        Notification.showNotification({
            type: 'error',
            message: error.response?.data?.message || 'Failed to delete vendor'
        });
        return false;
    }
}

// ========== MODALS ==========

function openVendorCreateModal() {
    $('#vendorFormModalTitle').text('Add New Vendor');
    $('#vendorSubmitBtnText').text('Add Vendor');
    $('#vendorForm')[0].reset();
    $('#vendorEditId').val('');
    $('#vendorUserId').val('');
    $('#vendorFormModal').removeClass('hidden').css('display', 'flex');
    $('body').css('overflow', 'hidden');
    vendorOriginalEditing = null;
}

async function openVendorEditModal(id) {
    $('#vendorFormModal').removeClass('hidden').css('display', 'flex');
    $('body').css('overflow', 'hidden');

    const vendor = await fetchVendorById(id);

    // if (!vendor) {
    //     Notification.showNotification({
    //         type: 'error',
    //         message: 'Vendor not found'
    //     });
    //     return;
    // }

    vendorOriginalEditing = vendor;

    $('#vendorFormModalTitle').text('Edit Vendor');
    $('#vendorSubmitBtnText').text('Update Vendor');
    $('#vendorEditId').val(vendor.id);
    $('#vendorUserId').val(vendor.user_id || '');
    $('#vendorBusinessName').val(vendor.business_name);
    $('#vendorEmail').val(vendor.user?.email || '');
    $('#vendorBusinessAddress').val(vendor.business_address || '');
    $('#vendorTinNumber').val(vendor.tin_number || '');
    $('#vendorVatNumber').val(vendor.vat_number || '');
    $('#vendorTaxRegistered').val(vendor.tax_registered || '');
    $('#vendorTaxCountry').val(vendor.tax_country || '');
    $('#vendorType').val(vendor.type || 'retailer');
    $('#vendorCategory').val(vendor.category || 'internal');
    $('#vendorVerificationStatus').val(vendor.verification_status || 'pending');
    $('#vendorStatus').val(vendor.status || 'active');
}

function closeVendorFormModal() {
    $('#vendorFormModal').addClass('hidden').css('display', 'none');
    $('body').css('overflow', '');
}

function openVendorDeleteModal(id) {
    const vendor = filteredVendors.find(v => v.id === id);
    if (!vendor) return;
    deleteVendorTargetId = id;
    $('#vendorDeleteTitle').text(`"${vendor.business_name}"`);
    $('#vendorDeleteModal').removeClass('hidden').css('display', 'flex');
    $('body').css('overflow', 'hidden');
}

function closeVendorDeleteModal() {
    $('#vendorDeleteModal').addClass('hidden').css('display', 'none');
    $('body').css('overflow', '');
    deleteVendorTargetId = null;
}

// ========== FORM SUBMIT ==========

async function handleVendorFormSubmit(e) {
    e.preventDefault();

    const id = $('#vendorEditId').val();
    const business_name = $('#vendorBusinessName').val().trim();
    const email = $('#vendorEmail').val().trim();
    const business_address = $('#vendorBusinessAddress').val().trim();
    const tin_number = $('#vendorTinNumber').val().trim();
    const vat_number = $('#vendorVatNumber').val().trim();
    const tax_registered = $('#vendorTaxRegistered').val().trim();
    const tax_country = $('#vendorTaxCountry').val().trim();
    const type = $('#vendorType').val();
    const category = $('#vendorCategory').val();
    const verification_status = $('#vendorVerificationStatus').val();
    const status = $('#vendorStatus').val();

    if (!business_name || !email) {
        Notification.showNotification({
            type: 'error',
            message: 'Business name and email are required.'
        });
        return;
    }

    const formData = {
        business_name,
        email,
        business_address: business_address || null,
        tin_number: tin_number || null,
        vat_number: vat_number || null,
        tax_registered: tax_registered || null,
        tax_country: tax_country || null,
        type,
        category,
        verification_status,
        status
    };

    const $submitBtn = $('#vendorFormSubmitBtn');
    const originalText = $submitBtn.html();
    $submitBtn.html('<i class="fas fa-spinner fa-spin mr-2"></i> Saving...').prop('disabled', true);

    let success = false;

    if (id) {
        const payload = getChangedAttributes(vendorOriginalEditing, formData);
        success = await updateVendor(id, payload);
    } else {
        success = await createVendor(formData);
    }

    $submitBtn.html(originalText).prop('disabled', false);

    if (success) {
        closeVendorFormModal();
    }
}

async function confirmVendorDelete() {
    if (deleteVendorTargetId === null) return;

    const $confirmBtn = $('.confirm-delete-vendor-btn');
    const originalText = $confirmBtn.html();
    $confirmBtn.html('<i class="fas fa-spinner fa-spin mr-2"></i> Deleting...').prop('disabled', true);

    const success = await deleteVendor(deleteVendorTargetId);

    $confirmBtn.html(originalText).prop('disabled', false);

    if (success) {
        closeVendorDeleteModal();
    }
}

// ========== HELPER FUNCTIONS ==========

function getChangedAttributes(original, updated) {
    if (!original) return updated;

    const changes = {};
    for (const key in updated) {
        if (original[key] !== updated[key]) {
            changes[key] = updated[key];
        }
    }
    return changes;
}

function stripHtml2(html) {
    if (!html) return '';
    const tmp = document.createElement('DIV');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
}

// ========== KEYBOARD SHORTCUTS ==========

$(document).on('keydown', function(e) {
    if (e.key === 'Escape') {
        if (!$('#vendorFormModal').hasClass('hidden')) {
            closeVendorFormModal();
        }
        if (!$('#vendorDeleteModal').hasClass('hidden')) {
            closeVendorDeleteModal();
        }
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        openVendorCreateModal();
    }
});

// ========== DOCUMENT READY ==========

$(document).ready(function() {
    console.log('🚀 Document ready for Vendor Management...');

    // Close delete modal
    $('.close-vendor-delete-modal').on('click', closeVendorDeleteModal);

    // New Vendor button
    $('.new-vendor-btn').on('click', openVendorCreateModal);

    // Confirm delete button
    $('.confirm-delete-vendor-btn').on('click', confirmVendorDelete);

    // Search - LOCAL ONLY
    $vendorSearchInput.on('input', function() {
        applyVendorLocalSearch();
    });

    // Type filter - LOCAL ONLY
    $vendorTypeFilter.on('change', function() {
        applyVendorFilters();
    });

    // Status filter - LOCAL ONLY
    $vendorStatusFilter.on('change', function() {
        applyVendorFilters();
    });

    // Reset filters
    $('#vendorFilterResetBtn').on('click', function() {
        resetVendorFilters(true);
    });

    // Modal overlay close
    $('.vendor-modal-overlay').on('click', function(e) {
        if ($(e.target).hasClass('vendor-modal-overlay')) {
            closeVendorFormModal();
        }
    });

    // Close form modal
    $('#closeVendorFormModal').on('click', closeVendorFormModal);

    // Form submit
    $("#vendorForm").on('submit', handleVendorFormSubmit);

    // Cancel create vendor
    $('.cancel-create-vendor').on('click', closeVendorFormModal);

    // Empty state create button
    $('#emptyVendorBtn').on('click', openVendorCreateModal);

    // Pagination
    $('#prevVendorPageBtn').on('click', prevVendorPage);
    $('#nextVendorPageBtn').on('click', nextVendorPage);

    // Refresh
    $('#refreshVendors').on('click', function() {
        fetchVendors(currentVendorPage, true);
    });

    // Initialize
    fetchVendors(1);
});

// ========== EXPOSE GLOBALLY ==========
window.openVendorCreateModal = openVendorCreateModal;
window.openVendorEditModal = openVendorEditModal;
window.openVendorDeleteModal = openVendorDeleteModal;
window.confirmVendorDelete = confirmVendorDelete;
window.closeVendorFormModal = closeVendorFormModal;
window.closeVendorDeleteModal = closeVendorDeleteModal;
window.prevVendorPage = prevVendorPage;
window.nextVendorPage = nextVendorPage;
window.resetVendorFilters = resetVendorFilters;
window.fetchVendors = fetchVendors;
window.handleVendorFormSubmit = handleVendorFormSubmit;
window.applyVendorLocalSearch = applyVendorLocalSearch;
window.applyVendorFilters = applyVendorFilters;