let currentAttributePage = 1;
const attributeItemsPerPage = 100;
let deleteAttributeTargetId = null;
let allAttributes = [];
let filteredAttributes = [];
let currentAttributeSearchTerm = '';
let currentAttributeStatusFilter = 'all';
let attributePaginationData = {
    counts: 0,
    totalPages: 0,
    page: 1,
    limit: 20
};
let isFetchingAttribute = false;
let attributeOriginalEditing = null;


let currentValuePage = 1;
const valueItemsPerPage = 20;
let deleteValueTargetId = null;
let allValues = [];
let filteredValues = [];
let currentValueSearchTerm = '';
let currentValueAttributeId = null;
let valuePaginationData = {
    counts: 0,
    totalPages: 0,
    page: 1,
    limit: 20
};
let isFetchingValue = false;
let valueOriginalEditing = null;

const $attributesTableBody = $('#attributesTableBody');
const $attributesTotalCount = $('#attributeTotalCount');
const $attributeShowingCount = $('#attributeShowingCount');
const $attributesPageInfo = $('#attributesPageInfo');
const $prevAttributePageBtn = $('#prevAttributePageBtn');
const $nextAttributePageBtn = $('#nextAttributePageBtn');
const $attributesEmptyState = $('#attributesEmptyState');
const $attributeSearchInput = $('#attributeSearchInput');
const $attributeStatusFilter = $('#attributeStatusFilter');
const $attributeCount = $('#attributeCount');

const $valuesTableBody = $('#valuesTableBody');
const $valuesTotalCount = $('#valueTotalCount');
const $valueShowingCount = $('#valueShowingCount');
const $valuesPageInfo = $('#valuesPageInfo');
const $prevValuePageBtn = $('#prevValuePageBtn');
const $nextValuePageBtn = $('#nextValuePageBtn');
const $valuesEmptyState = $('#valuesEmptyState');
const $valueAttributeFilter = $('#valueAttributeFilter');
const $valueCount = $('#valueCount');

let valueMetaFieldCount = 0;
let valueMetaFieldsData = {};

function renderAttributesTable() {
    const data = filteredAttributes || [];
    const totalItems = data.length;

    $attributesTotalCount.text(attributePaginationData.counts || 0);
    $attributeCount.text(attributePaginationData.counts || 0);

    if (totalItems === 0 && attributePaginationData.counts === 0) {
        $attributesTableBody.html('');
        $attributeShowingCount.text('0');
        $attributesPageInfo.text('Page 0 of 0');
        $prevAttributePageBtn.prop('disabled', true);
        $nextAttributePageBtn.prop('disabled', true);
        $attributesEmptyState.removeClass('hidden');
        return;
    }

    $attributesEmptyState.addClass('hidden');

    const totalPages = attributePaginationData.totalPages || 1;
    const currentPageNum = attributePaginationData.page || 1;

    $attributeShowingCount.text(data.length);
    $attributesPageInfo.text(`Page ${currentPageNum} of ${totalPages}`);
    $prevAttributePageBtn.prop('disabled', currentPageNum <= 1);
    $nextAttributePageBtn.prop('disabled', currentPageNum >= totalPages);

    if (data.length === 0 && attributePaginationData.counts > 0) {
        $attributesTableBody.html(`
            <tr>
                <td colspan="6" class="text-center py-8 text-gray-500">
                    <i class="fas fa-search text-2xl block mb-2"></i>
                    No attributes match your search criteria.
                </td>
            </tr>
        `);
        return;
    }

    let html = '';
    data.forEach(attr => {
        html += `
            <tr class="table-row border-b border-gray-50 transition">
                <td class="px-4 py-3">
                    <p class="text-sm font-medium text-gray-900">
                        ${stripHtml2(attr.title)}<br><small class="text-gray-300">#${attr.id}</small>
                    </p>
                </td>
                <td class="px-4 py-3 text-sm text-gray-500 hidden md:table-cell max-w-xs truncate">${stripHtml2(attr.description || '-')}</td>
                <td class="px-4 py-3 text-center text-sm text-gray-600">${attr.display_order || 0}</td>
                <td class="px-4 py-3 text-center">
                    <span class="status-badge ${attr.status}">${attr.status}</span>
                </td>
                <td class="px-4 py-3 text-center">
                    <div class="flex items-center justify-center gap-2">
                        <button class="p-1.5 rounded-lg text-black-100 hover:bg-black/5 transition attribute-edit-btn" title="Edit" data-id="${attr.id}">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="p-1.5 rounded-lg text-brand hover:bg-brand-light transition attribute-delete-btn ${attr.status === "deleted" ? 'hidden' : ''}" title="Delete" data-id="${attr.id}">
                            <i class="fas fa-trash"></i>
                        </button>
                        <button class="p-1.5 font-normal text-sm rounded-lg text-green-800 hover:bg-green-100 transition attribute-activate-btn ${(['deleted', 'disabled'].includes(attr.status)) ? '' : 'hidden'}" title="Delete" data-id="${attr.id}">
                            <i class="bi bi-arrow-counterclockwise"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });
    $attributesTableBody.html(html);

    $('.attribute-edit-btn').off('click').on('click', function () {
        const id = parseInt($(this).data('id'));
        openAttributeEditModal(id);
    });

    $('.attribute-delete-btn').off('click').on('click', function () {
        const id = parseInt($(this).data('id'));
        openAttributeDeleteModal(id);
    });
}

// ========== RENDER VALUES TABLE ==========
function renderValuesTable() {
    const data = filteredValues || [];
    const totalItems = data.length;

    $valuesTotalCount.text(valuePaginationData.counts || 0);
    $valueCount.text(valuePaginationData.counts || 0);

    if (totalItems === 0 && valuePaginationData.counts === 0) {
        $valuesTableBody.html('');
        $valuesEmptyState.removeClass('hidden');
        $valueShowingCount.text('0');
        $valuesPageInfo.text('Page 0 of 0');
        $prevValuePageBtn.prop('disabled', true);
        $nextValuePageBtn.prop('disabled', true);
        $('#attributeValuesContainer').addClass('hidden');
        return;
    }

    $('#attributeValuesContainer').removeClass('hidden');

    $valuesEmptyState.addClass('hidden');

    const totalPages = valuePaginationData.totalPages || 1;
    const currentPageNum = valuePaginationData.page || 1;

    $valueShowingCount.text(data.length);
    $valuesPageInfo.text(`Page ${currentPageNum} of ${totalPages}`);
    $prevValuePageBtn.prop('disabled', currentPageNum <= 1);
    $nextValuePageBtn.prop('disabled', currentPageNum >= totalPages);

    if (data.length === 0 && valuePaginationData.counts > 0) {
        $valuesTableBody.html(`
            <tr>
                <td colspan="5" class="text-center py-8 text-gray-500">
                    <i class="fas fa-search text-2xl block mb-2"></i>
                    No values match your search criteria.
                </td>
            </tr>
        `);
        return;
    }

    let html = '';
    data.forEach(val => {
        const metaDisplay = val.meta && Object.keys(val.meta).length > 0 ?
            `<span class="text-xs text-gray-400">${Object.keys(val.meta).length} keys</span>` :
            `<span class="text-xs text-gray-400">-</span>`;

        html += `
            <tr class="table-row border-b border-gray-50 transition">
                <td class="px-4 py-3">
                    <p class="text-sm font-medium text-gray-900">${stripHtml2(val.value)}</p>
                </td>
                <td class="px-4 py-3 text-center text-sm text-gray-600">${val.display_order || 0}</td>
                <td class="px-4 py-3 text-center text-sm text-gray-500">${metaDisplay}</td>
                <td class="px-4 py-3 text-center">
                    <div class="flex items-center justify-center gap-2">
                        <button class="p-1.5 rounded-lg text-black-100 hover:bg-black/5 transition value-edit-btn" title="Edit" data-id="${val.id}">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="p-1.5 rounded-lg text-brand hover:bg-brand-light transition value-delete-btn" title="Delete" data-id="${val.id}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });
    $valuesTableBody.html(html);

    $('.value-edit-btn').off('click').on('click', function () {
        const id = parseInt($(this).data('id'));
        openValueEditModal(id);
    });

    $('.value-delete-btn').off('click').on('click', function () {
        const id = parseInt($(this).data('id'));
        openValueDeleteModal(id);
    });
}

// ========== VALUE META FIELDS FUNCTIONS ==========
function renderValueMetaFields(metaData = {}) {
    const $container = $('#valueMetaFieldsContainer');
    $container.empty();

    if (!metaData || Object.keys(metaData).length === 0) {
        $container.html(`
            <div class="text-center py-3 text-sm text-gray-400 border-2 border-dashed border-gray-200 rounded-xl" id="emptyValueMetaState">
                <i class="fas fa-code text-gray-300 mr-2"></i>
                No meta fields added yet. Click "Add Meta Field" to get started.
            </div>
        `);
        valueMetaFieldCount = 0;
        return;
    }

    let index = 0;
    for (const [key, value] of Object.entries(metaData)) {
        addValueMetaFieldRow(key, value, index);
        index++;
    }
    valueMetaFieldCount = index;
}

function activateAttribute(id, target) {
    const targetHtml = target?.innerHtml || '<i class="bi bi-arrow-counterclockwise"></i>';
    showSnackbar({
        type: 'warning',
        message: "Do you want to activate this attribute?",
        actionText: "Yes",
        onAction: async () => {
            try {
                if (target) {
                    target.disabled = true;
                    target.textContent = 'Activating...';
                }
                await axios.patch(`/attributes/${id}`, { withCredentials: true });
                await fetchAttributes(currentAttributePage, true);
                //await fetchAttributesForDropdown();
                await fetchAttributesForSearch();
                showSnackbar({ type: "success", message: "Attribute activated" })
            } catch (error) {
                console.log(error);
                Notification.showNotification({
                    type: 'Error',
                    message: error.response?.data?.message || "Internal Server Error"
                });
            } finally {
                if (target) {
                    target.disabled = false
                    target.innerHtml = targetHtml;
                }
            }
        }
    });
}

function addValueMetaFieldRow(key = '', value = '', index = null) {
    const $container = $('#valueMetaFieldsContainer');
    const rowId = index !== null ? index : valueMetaFieldCount;

    $('#emptyValueMetaState').remove();

    const rowHtml = `
        <div class="meta-field-row flex items-center gap-2 p-2 bg-gray-50 rounded-xl border border-gray-200" data-row-id="${rowId}">
            <div class="flex-1">
                <input type="text" class="meta-key-input form-input w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-900 placeholder-gray-400 transition" placeholder="Key (e.g., hex_code)" value="${stripHtml2(key)}">
            </div>
            <div class="flex-[2]">
                <input type="text" class="meta-value-input form-input w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-900 placeholder-gray-400 transition" placeholder="Value (e.g., #FF0000)" value="${stripHtml2(value)}">
            </div>
            <button type="button" class="remove-meta-btn p-2 text-gray-400 hover:text-red-600 transition rounded-lg hover:bg-red-50 flex-shrink-0" title="Remove meta field">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;

    if (index !== null && index < $container.children().length) {
        $container.children().eq(index).before(rowHtml);
    } else {
        $container.append(rowHtml);
    }

    const $row = $(`.meta-field-row[data-row-id="${rowId}"]`);
    $row.find('.remove-meta-btn').off('click').on('click', function () {
        const $row = $(this).closest('.meta-field-row');
        const rowId = $row.data('row-id');
        removeValueMetaFieldRow(rowId);
    });

    $row.find('.meta-key-input').off('input').on('input', function () {
        updateValueMetaData();
    });

    $row.find('.meta-value-input').off('input').on('input', function () {
        updateValueMetaData();
    });

    if (index === null) {
        valueMetaFieldCount++;
    }

    $row.find('.meta-key-input').focus();
}

function removeValueMetaFieldRow(rowId) {
    const $row = $(`.meta-field-row[data-row-id="${rowId}"]`);

    if ($('.meta-field-row').length === 1) {
        if (!confirm('Remove this meta field?')) {
            return;
        }
    }

    $row.remove();
    updateValueMetaData();

    if ($('.meta-field-row').length === 0) {
        renderValueMetaFields({});
    }
}

function updateValueMetaData() {
    const metaData = {};
    $('.meta-field-row').each(function () {
        const key = $(this).find('.meta-key-input').val().trim();
        const value = $(this).find('.meta-value-input').val().trim();
        if (key) {
            metaData[key] = value;
        }
    });
    valueMetaFieldsData = metaData;
}

function getValueMetaData() {
    updateValueMetaData();
    return valueMetaFieldsData;
}

function populateValueMetaFields(metaData = {}) {
    if (!metaData || typeof metaData !== 'object') {
        renderValueMetaFields({});
        return;
    }

    const cleanedMeta = {};
    for (const [key, value] of Object.entries(metaData)) {
        if (key && key.trim() !== '') {
            cleanedMeta[key.trim()] = value;
        }
    }

    renderValueMetaFields(cleanedMeta);
    valueMetaFieldsData = cleanedMeta;
}

function initValueMetaFields() {
    $('#addValueMetaFieldBtn').off('click').on('click', function (e) {
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

        addValueMetaFieldRow();
    });

    renderValueMetaFields({});
}

async function fetchAttributes(page = 1, isRefresh = false) {
    if (isFetchingAttribute) return;
    isFetchingAttribute = true;

    const $skeletonLoader = $('#attributeSkeletonLoader');
    const $attrSysncLoader = $('#attrSyncLoader');
    const $container = $('#attributesContainer');


    $attributesEmptyState.addClass('hidden');

    if (!isRefresh) {
        $skeletonLoader.removeClass('hidden');
        $container.addClass('hidden');
    } else {
        $attrSysncLoader.removeClass('hidden')
    }

    try {
        const params = {
            page: page,
            limit: attributeItemsPerPage
        };

        params.status = $attributeStatusFilter.val();

        const response = await axios.get(`/attributes/`, {
            params,
            withCredentials: true
        });

        allAttributes = response.data.attributes || [];

        attributePaginationData = response.data.pagination || {
            counts: 0,
            totalPages: 0,
            page: 1,
            limit: attributeItemsPerPage
        };

        currentAttributePage = attributePaginationData.page;

        if (currentAttributeSearchTerm && currentAttributeSearchTerm !== '') {
            filteredAttributes = allAttributes.filter(attr => {
                return attr.title.toLowerCase().includes(currentAttributeSearchTerm) ||
                    (attr.description && attr.description.toLowerCase().includes(currentAttributeSearchTerm));
            });
        } else {
            filteredAttributes = [...allAttributes];
        }

        renderAttributesTable();

    } catch (error) {
        console.error(error);
        allAttributes = [];
        filteredAttributes = [];
        attributePaginationData = {
            counts: 0,
            totalPages: 0,
            page: 1,
            limit: attributeItemsPerPage
        };
        renderAttributesTable();

        Notification.showNotification({
            type: 'error',
            message: error.response?.data?.message || 'Failed to load attributes'
        });

    } finally {
        isFetchingAttribute = false;
        $('#attributeSkeletonLoader').addClass('hidden');
        $attrSysncLoader.addClass('hidden');
        $('#attributesContainer').removeClass('hidden');
    }
}

async function fetchAttributeById(id) {
    try {
        const response = await axios.get(`/attributes/${id}`, {
            withCredentials: true
        });
        return response.data || null;
    } catch (error) {
        Notification.showNotification({
            type: 'error',
            message: error.response?.data?.message || 'Failed to fetch attribute details'
        });
        return null;
    }
}

async function createAttribute(data) {
    try {
        const response = await axios.post('/attributes/', data, {
            withCredentials: true
        });

        const newAttribute = response.data.attribute || response.data;

        if (newAttribute && newAttribute.id) {
            await fetchAttributes(1, true);
            Notification.showNotification({
                type: 'success',
                message: 'Attribute created successfully!'
            });
            return true;
        }
        throw new Error('Invalid response format');
    } catch (error) {
        console.error(error);
        Notification.showNotification({
            type: 'error',
            message: error.response?.data?.message || 'Failed to create attribute'
        });
        return false;
    }
}

async function updateAttribute(id, data) {
    try {
        const response = await axios.put(`/attributes/${id}`, {
            id,
            ...data
        }, {
            withCredentials: true
        });

        Notification.showNotification({
            type: 'success',
            message: 'Attribute updated successfully!'
        });

        await fetchAttributes(currentAttributePage, true);
        return true;
    } catch (error) {
        console.error(error);
        Notification.showNotification({
            type: 'error',
            message: error.response?.data?.message || 'Failed to update attribute'
        });
        return false;
    }
}

async function deleteAttribute(id) {
    try {
        await axios.patch(`/attributes/remove/${id}`, {
            withCredentials: true
        });

        Notification.showNotification({
            type: 'success',
            message: 'Attribute has been deleted.'
        });

        await fetchAttributes(currentAttributePage, true);
        // await fetchAttributesForDropdown()
        fetchAttributesForSearch();
        return true;
    } catch (error) {
        console.error(error);
        Notification.showNotification({
            type: 'error',
            message: error.response?.data?.message || 'Failed to delete attribute'
        });
        return false;
    }
}

async function fetchValues(attributeId, page = 1, isRefresh = false) {
    if (isFetchingValue) return;
    isFetchingValue = true;

    const $skeletonLoader = $('#valueSkeletonLoader');
    const $container = $('#valuesContainer');
    const $attrSysncLoader = $('#attrSyncLoader');

    $('#attributeValuesContainer').removeClass('hidden');

    if (!isRefresh) {
        $skeletonLoader.removeClass('hidden');
        $container.addClass('hidden');
    } else {
        $attrSysncLoader.removeClass('hidden');
    }

    $valuesEmptyState.addClass('hidden');

    try {
        const params = {
            page: page,
            limit: valueItemsPerPage
        };

        if (attributeId) {
            params.attribute_id = attributeId;
        }

        const response = await axios.get(`/attribute-values/`, {
            params,
            withCredentials: true
        });

        allValues = response.data.attributeValues || [];

        valuePaginationData = response.data.pagination || {
            counts: 0,
            totalPages: 0,
            page: 1,
            limit: valueItemsPerPage
        };

        currentValuePage = valuePaginationData.page;

        filteredValues = [...allValues];
        renderValuesTable();

    } catch (error) {
        console.error(error);
        allValues = [];
        filteredValues = [];
        valuePaginationData = {
            counts: 0,
            totalPages: 0,
            page: 1,
            limit: valueItemsPerPage
        };
        renderValuesTable();

        Notification.showNotification({
            type: 'error',
            message: error.response?.data?.message || 'Failed to load values'
        });

    } finally {
        isFetchingValue = false;
        $('#valueSkeletonLoader').addClass('hidden');
        $('#valuesContainer').removeClass('hidden');
        $attrSysncLoader.addClass('hidden');

    }
}

async function fetchValueById(id) {
    try {
        const response = await axios.get(`/attribute-values/${id}`, {
            withCredentials: true
        });
        return response.data || null;
    } catch (error) {
        Notification.showNotification({
            type: 'error',
            message: error.response?.data?.message || 'Failed to fetch value details'
        });
        return null;
    }
}

async function createValue(data) {
    try {
        const response = await axios.post('/attribute-values/', data, {
            withCredentials: true
        });

        const newValue = response.data.value || response.data;

        await fetchValues(currentValueAttributeId, 1, true);
    } catch (error) {
        console.error(error);
        Notification.showNotification({
            type: 'error',
            message: error.response?.data?.message || 'Failed to create value'
        });
        return false;
    }
}

async function updateValue(id, data) {
    try {
        const response = await axios.put(`/attribute-values/${id}`, {
            id,
            ...data
        }, {
            withCredentials: true
        });

        Notification.showNotification({
            type: 'success',
            message: 'Value updated successfully!'
        });

        await fetchValues(currentValueAttributeId, currentValuePage, true);
        return true;
    } catch (error) {
        console.error(error);
        Notification.showNotification({
            type: 'error',
            message: error.response?.data?.message || 'Failed to update value'
        });
        return false;
    }
}

async function deleteValue(id) {
    try {
        await axios.delete(`/attribute-values/remove/${id}`, {
            withCredentials: true
        });

        Notification.showNotification({
            type: 'warning',
            message: 'Value has been deleted.'
        });

        await fetchValues(currentValueAttributeId, currentValuePage, true);
        return true;
    } catch (error) {
        console.error(error);
        Notification.showNotification({
            type: 'error',
            message: error.response?.data?.message || 'Failed to delete value'
        });
        return false;
    }
}

async function fetchAttributesForDropdown() {
    try {
        const response = await axios.get(`/attributes/`, {
            params: {
                page: 1,
                limit: 100,
                status: 'active'
            },
            withCredentials: true
        });

        const attributes = response.data.attributes || [];
        const $dropdown = $valueAttributeFilter;

        $dropdown.html('<option value="">Select Attribute</option>');

        attributes.forEach(attr => {
            $dropdown.append(`<option value="${attr.id}">${stripHtml2(attr.title)}</option>`);
        });

        return attributes;
    } catch (error) {
        console.error(error);
        return [];
    }
}

// ========== ATTRIBUTE MODALS ==========

function openAttributeCreateModal() {
    $('#attributeFormModalTitle').text('Create New Attribute');
    $('#attributeSubmitBtnText').text('Create Attribute');
    $('#attributeForm')[0].reset();
    $('#attributeEditId').val('');
    $('#attributeDisplayOrder').val('0');
    $('#attributeFormModal').removeClass('hidden').css('display', 'flex');
    $('body').css('overflow', 'hidden');
    attributeOriginalEditing = null;
}

async function openAttributeEditModal(id) {
    $('#attributeFormModal').removeClass('hidden').css('display', 'flex');
    $('body').css('overflow', 'hidden');

    const attribute = await fetchAttributeById(id);

    if (!attribute) {
        Notification.showNotification({
            type: 'error',
            message: 'Attribute not found'
        });
        return;
    }

    attributeOriginalEditing = attribute;

    $('#attributeFormModalTitle').text('Edit Attribute');
    $('#attributeSubmitBtnText').text('Update Attribute');
    $('#attributeEditId').val(attribute.id);
    $('#attributeTitle').val(attribute.title);
    $('#attributeDescription').val(attribute.description || '');
    $('#attributeDisplayOrder').val(attribute.display_order || 0);
    $('#attributeStatus').val(attribute.status);
}

function closeAttributeFormModal() {
    $('#attributeFormModal').addClass('hidden').css('display', 'none');
    $('body').css('overflow', '');
}

function openAttributeDeleteModal(id) {
    const attribute = filteredAttributes.find(a => a.id === id);
    if (!attribute) return;
    deleteAttributeTargetId = id;
    $('#attributeDeleteTitle').text(`"${attribute.title}"`);
    $('#attributeDeleteModal').removeClass('hidden').css('display', 'flex');
    $('body').css('overflow', 'hidden');
}

function closeAttributeDeleteModal() {
    $('#attributeDeleteModal').addClass('hidden').css('display', 'none');
    $('body').css('overflow', '');
    deleteAttributeTargetId = null;
}

function openValueCreateModal() {
    const attributeId = $valueAttributeFilter.val();
    if (!attributeId) {
        Notification.showNotification({
            type: 'warning',
            message: 'Please select an attribute first.'
        });
        return;
    }

    $('#valueFormModalTitle').text('Create New Value');
    $('#valueSubmitBtnText').text('Create Value');
    $('#valueForm')[0].reset();
    $('#valueEditId').val('');
    $('#valueAttributeId').val(attributeId);
    $('#valueDisplayOrder').val('0');
    $('#valueFormModal').removeClass('hidden').css('display', 'flex');
    $('body').css('overflow', 'hidden');
    valueOriginalEditing = null;
    populateValueMetaFields({});
}

async function openValueEditModal(id) {
    $('#valueFormModal').removeClass('hidden').css('display', 'flex');
    $('body').css('overflow', 'hidden');

    const value = await fetchValueById(id);

    if (!value) {
        Notification.showNotification({
            type: 'error',
            message: 'Value not found'
        });
        return;
    }

    valueOriginalEditing = value;

    $('#valueFormModalTitle').text('Edit Value');
    $('#valueSubmitBtnText').text('Update Value');
    $('#valueEditId').val(value.id);
    $('#valueAttributeId').val(value.attribute_id);
    $('#valueInput').val(value.value);
    $('#valueDisplayOrder').val(value.display_order || 0);

    populateValueMetaFields(value.meta || {});
}

function closeValueFormModal() {
    $('#valueFormModal').addClass('hidden').css('display', 'none');
    $('body').css('overflow', '');
}

function openValueDeleteModal(id) {
    const value = filteredValues.find(v => v.id === id);
    if (!value) return;
    deleteValueTargetId = id;
    $('#valueDeleteTitle').text(`"${value.value}"`);
    $('#valueDeleteModal').removeClass('hidden').css('display', 'flex');
    $('body').css('overflow', 'hidden');
}

function closeValueDeleteModal() {
    $('#valueDeleteModal').addClass('hidden').css('display', 'none');
    $('body').css('overflow', '');
    deleteValueTargetId = null;
}

// ========== FORM SUBMIT HANDLERS ==========

async function handleAttributeFormSubmit(e) {
    e.preventDefault();

    const id = $('#attributeEditId').val();
    const title = $('#attributeTitle').val().trim();
    const description = $('#attributeDescription').val().trim();
    const display_order = parseInt($('#attributeDisplayOrder').val()) || 0;
    const status = $('#attributeStatus').val();

    if (!title) {
        Notification.showNotification({
            type: 'error',
            message: 'Title is required.'
        });
        return;
    }

    const formData = { title, description, display_order, status };

    const $submitBtn = $('#attributeFormSubmitBtn');
    const originalText = $submitBtn.html();
    $submitBtn.html('<i class="fas fa-spinner fa-spin mr-2"></i> Saving...').prop('disabled', true);

    let success = false;

    if (id) {
        const payload = getChangedAttributes(attributeOriginalEditing, formData);
        console.log(attributeOriginalEditing, formData, payload);
        success = await updateAttribute(parseInt(id), payload);
    } else {
        success = await createAttribute(formData);
    }

    $submitBtn.html(originalText).prop('disabled', false);

    if (success) {
        closeAttributeFormModal();
    }
}

async function handleValueFormSubmit(e) {
    e.preventDefault();

    const id = $('#valueEditId').val();
    const attribute_id = parseInt($('#valueAttributeId').val());
    const value = $('#valueInput').val().trim();
    const display_order = parseInt($('#valueDisplayOrder').val()) || 0;
    const meta = getValueMetaData();

    if (!value) {
        Notification.showNotification({
            type: 'error',
            message: 'Value is required.'
        });
        return;
    }

    if (!attribute_id) {
        Notification.showNotification({
            type: 'error',
            message: 'Please select an attribute.'
        });
        return;
    }

    const formData = { attribute_id, value, display_order, meta };

    const $submitBtn = $('#valueFormSubmitBtn');
    const originalText = $submitBtn.html();
    $submitBtn.html('<i class="fas fa-spinner fa-spin mr-2"></i> Saving...').prop('disabled', true);

    let success = false;

    if (id) {
        const payload = getChangedAttributes(valueOriginalEditing, formData);
        success = await updateValue(parseInt(id), payload);
    } else {
        success = await createValue(formData);
    }

    $submitBtn.html(originalText).prop('disabled', false);

    if (success) {
        closeValueFormModal();
    }
}

async function confirmAttributeDelete() {
    if (deleteAttributeTargetId === null) return;

    const $confirmBtn = $('.confirm-delete-attribute-btn');
    const originalText = $confirmBtn.html();
    $confirmBtn.html('<i class="fas fa-spinner fa-spin mr-2"></i> Deleting...').prop('disabled', true);

    const success = await deleteAttribute(deleteAttributeTargetId);

    $confirmBtn.html(originalText).prop('disabled', false);

    if (success) {
        closeAttributeDeleteModal();
    }
}

async function confirmValueDelete() {
    if (deleteValueTargetId === null) return;

    const $confirmBtn = $('.confirm-delete-value-btn');
    const originalText = $confirmBtn.html();
    $confirmBtn.html('<i class="fas fa-spinner fa-spin mr-2"></i> Deleting...').prop('disabled', true);

    const success = await deleteValue(deleteValueTargetId);

    $confirmBtn.html(originalText).prop('disabled', false);

    if (success) {
        closeValueDeleteModal();
    }
}

function applyAttributeSearch() {
    const search = $attributeSearchInput.val().toLowerCase().trim();
    currentAttributeSearchTerm = search;

    if (!allAttributes || allAttributes.length === 0) {
        filteredAttributes = [];
        renderAttributesTable();
        return;
    }

    if (search === '') {
        filteredAttributes = [...allAttributes];
        currentAttributePage = 1;
        renderAttributesTable();
        return;
    }

    filteredAttributes = allAttributes.filter(attr => {
        return attr.title.toLowerCase().includes(search) ||
            (attr.description && attr.description.toLowerCase().includes(search));
    });

    currentAttributePage = 1;
    renderAttributesTable();
}

function applyAttributeStatusFilter() {
    const status = $attributeStatusFilter.val();
    currentAttributeStatusFilter = status;
    currentAttributePage = 1;
    fetchAttributes(1, true);
}

function resetAttributeFilters(shouldFetch = true) {
    $attributeSearchInput.val('');
    $attributeStatusFilter.val('all');
    currentAttributeSearchTerm = '';
    currentAttributeStatusFilter = 'all';
    currentAttributePage = 1;

    if (shouldFetch) fetchAttributes(1, true);
}

function prevAttributePage() {
    if (attributePaginationData.page > 1) {
        const newPage = Number(attributePaginationData.page) - 1;
        fetchAttributes(newPage, true);
    }
}

function nextAttributePage() {
    if (attributePaginationData.page < attributePaginationData.totalPages) {
        const newPage = Number(attributePaginationData.page) + 1;
        fetchAttributes(newPage, true);
    }
}

function prevValuePage() {
    if (valuePaginationData.page > 1) {
        const newPage = Number(valuePaginationData.page) - 1;
        fetchValues(currentValueAttributeId, newPage, true);
    }
}

function nextValuePage() {
    if (valuePaginationData.page < valuePaginationData.totalPages) {
        const newPage = Number(valuePaginationData.page) + 1;
        fetchValues(currentValueAttributeId, newPage, true);
    }
}


function switchTab(tabName) {

    // Update tab buttons
    $('.attr-tab').removeClass('active border-brand text-brand');
    $('.attr-tab').addClass('border-transparent text-gray-500');

    $(`.attr-tab[data-tab="${tabName}"]`).addClass('active border-brand text-brand');
    $(`.attr-tab[data-tab="${tabName}"]`).removeClass('border-transparent text-gray-500');

    // Hide all tab contents
    $('.attr-tab-content').removeClass('active');
    $('.attr-tab-content').css('display', 'none');

    // Show the selected tab content
    $(`#attr-tab-${tabName}`).addClass('active');
    $(`#attr-tab-${tabName}`).css('display', 'block');

    // Enable/disable new value button
    if (tabName === 'values') {
        $('.new-value-btn').prop('disabled', false);
        const selectedAttributeId = $valueAttributeFilter.val();
        if (!selectedAttributeId) {
            renderValuesTable();
        } else {
            renderValuesTable();
        }
    } else {
        $('.new-value-btn').prop('disabled', true);
        renderAttributesTable();
    }
}

$(document).on('keydown', function (e) {
    if (e.key === 'Escape') {
        if (!$('#attributeFormModal').hasClass('hidden')) {
            closeAttributeFormModal();
        }
        if (!$('#valueFormModal').hasClass('hidden')) {
            closeValueFormModal();
        }
        if (!$('#attributeDeleteModal').hasClass('hidden')) {
            closeAttributeDeleteModal();
        }
        if (!$('#valueDeleteModal').hasClass('hidden')) {
            closeValueDeleteModal();
        }
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        const activeTab = $('.attribute-tab.active').data('tab');
        if (activeTab === 'attributes') {
            openAttributeCreateModal();
        } else {
            openValueCreateModal();
        }
    }
});

// ========== ATTRIBUTE SEARCH SELECTOR STATE ==========
let allAttributesForSearch = [];
let selectedAttributeForSearch = null;
let isAttributeDropdownOpen = false;

function renderAttributeSearchList(attributes, searchTerm = '') {
    const $list = $('#attributeSearchList');
    const $noResult = $('#noAttributeResult');

    if (!attributes || attributes.length === 0) {
        $list.addClass('hidden');
        $noResult.removeClass('hidden');
        return;
    }

    $list.removeClass('hidden');
    $noResult.addClass('hidden');

    let html = '';
    attributes.forEach(attr => {
        const isSelected = selectedAttributeForSearch && selectedAttributeForSearch.id === attr.id;
        const highlightedTitle = searchTerm ? highlightAttributeText(attr.title, searchTerm) : attr.title;

        const statusClass = attr.status === 'active' ? 'active-badge' :
            attr.status === 'inactive' ? 'inactive-badge' : 'draft-badge';

        html += `
            <div class="attribute-search-item flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 cursor-pointer transition border-l-3 border-transparent hover:border-brand ${isSelected ? 'bg-brand-light border-brand' : ''}" 
                 data-id="${attr.id}" 
                 data-title="${attr.title}">
                <span class="text-sm text-gray-700">${highlightedTitle}</span>
                <!--<span class="text-xs px-2 py-0.5 rounded-full ${statusClass}">${attr.status}</span>-->
            </div>
        `;
    });

    $list.html(html);

    $('.attribute-search-item').off('click').on('click', function () {
        const id = parseInt($(this).data('id'));
        const title = $(this).data('title');
        selectAttributeForSearch(id, title);
    });

    $('.attribute-search-item').off('mouseenter').on('mouseenter', function () {
        $('.attribute-search-item').removeClass('bg-gray-100');
        $(this).addClass('bg-gray-100');
    });
}

function highlightAttributeText(text, search) {
    if (!search || search === '') return text;
    const regex = new RegExp(`(${search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(regex, '<span class="bg-brand-light text-brand font-semibold">$1</span>');
}

function selectAttributeForSearch(id, title) {
    selectedAttributeForSearch = { id, title };
    $('#valueAttributeSearch').val(title);
    $('#selectedAttributeName').text(title);
    $('#selectedAttributeDisplay').removeClass('hidden');
    $('#clearAttributeSearch').removeClass('hidden');
    closeAttributeDropdown();

    $('.new-value-btn').prop('disabled', false);

    // Update the hidden filter value
    currentValueAttributeId = id;

    // Render the list with selection highlighted
    renderAttributeSearchList(allAttributesForSearch, $('#valueAttributeSearch').val());
}

function deselectAttributeForSearch() {
    selectedAttributeForSearch = null;
    currentValueAttributeId = null;
    $('#valueAttributeSearch').val('');
    $('#selectedAttributeDisplay').addClass('hidden');
    $('#clearAttributeSearch').addClass('hidden');
    $('.new-value-btn').prop('disabled', true);
    renderAttributeSearchList(allAttributesForSearch, '');
    renderValuesTable();
}

function searchAttributes(searchTerm) {
    if (!searchTerm || searchTerm.trim() === '') {
        renderAttributeSearchList(allAttributesForSearch, '');
        return;
    }

    const filtered = allAttributesForSearch.filter(attr =>
        attr.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    renderAttributeSearchList(filtered, searchTerm);
    openAttributeDropdown();
}

function openAttributeDropdown() {
    if (allAttributesForSearch.length === 0) return;
    isAttributeDropdownOpen = true;
    $('#attributeSearchDropdown').removeClass('hidden');
}

function closeAttributeDropdown() {
    isAttributeDropdownOpen = false;
    $('#attributeSearchDropdown').addClass('hidden');
}

function initAttributeSearchSelector() {
    const $search = $('#valueAttributeSearch');
    const $dropdown = $('#attributeSearchDropdown');
    const $clearBtn = $('#clearAttributeSearch');
    const $removeBtn = $('#removeAttributeSelection');

    // Focus on input opens dropdown
    $search.on('focus', function () {
        if (allAttributesForSearch.length > 0) {
            openAttributeDropdown();
            searchAttributes($(this).val());
        }
    });

    // Search on input
    $search.on('input', function () {
        const val = $(this).val();
        if (val && val.trim() !== '') {
            searchAttributes(val);
            $clearBtn.removeClass('hidden');
        } else {
            renderAttributeSearchList(allAttributesForSearch, '');
            $clearBtn.addClass('hidden');
            if (!selectedAttributeForSearch) {
                openAttributeDropdown();
            }
        }
    });

    // Clear button
    $clearBtn.on('click', function () {
        $search.val('');
        deselectAttributeForSearch();
        $clearBtn.addClass('hidden');
        if (allAttributesForSearch.length > 0) {
            openAttributeDropdown();
            renderAttributeSearchList(allAttributesForSearch, '');
        }
    });

    // Remove selected attribute
    $removeBtn.on('click', function () {
        deselectAttributeForSearch();
        $search.focus();
    });

    // Close dropdown on outside click
    $(document).on('click', function (e) {
        if (!$(e.target).closest('#valueAttributeSelector').length) {
            closeAttributeDropdown();
        }
    });

    // Keyboard navigation
    $search.on('keydown', function (e) {
        const $items = $('.attribute-search-item');
        const $active = $items.filter('.bg-gray-100');

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if ($active.length === 0) {
                $items.first().addClass('bg-gray-100');
            } else {
                const next = $active.next('.attribute-search-item');
                if (next.length) {
                    $active.removeClass('bg-gray-100');
                    next.addClass('bg-gray-100');
                    next[0].scrollIntoView({ block: 'nearest' });
                }
            }
        }

        if (e.key === 'ArrowUp') {
            e.preventDefault();
            if ($active.length) {
                const prev = $active.prev('.attribute-search-item');
                if (prev.length) {
                    $active.removeClass('bg-gray-100');
                    prev.addClass('bg-gray-100');
                    prev[0].scrollIntoView({ block: 'nearest' });
                }
            }
        }

        if (e.key === 'Enter' || e.key === 'Tab') {
            if ($active.length) {
                const id = parseInt($active.data('id'));
                const title = $active.data('title');
                selectAttributeForSearch(id, title);
                e.preventDefault();
            }
        }

        if (e.key === 'Escape') {
            closeAttributeDropdown();
            $search.blur();
        }
    });

    // Load attributes for search
    fetchAttributesForSearch();
}

async function fetchAttributesForSearch() {
    try {
        // Show loading state
        $('#attributeSearchList').html(`
            <div class="px-4 py-3 text-sm text-gray-500 text-center">
                <i class="fas fa-spinner fa-spin mr-2"></i> Loading attributes...
            </div>
        `);

        const response = await axios.get(`/attributes/`, {
            params: {
                page: 1,
                limit: 100,
                status: 'active'
            },
            withCredentials: true
        });

        allAttributesForSearch = response.data.attributes || [];
        renderAttributeSearchList(allAttributesForSearch, '');

        // populating the modal dropdown
        const $modalDropdown = $('#valueModalAttribute');
        $modalDropdown.html('<option value="">Select an attribute...</option>');
        allAttributesForSearch.forEach(attr => {
            $modalDropdown.append(`<option value="${attr.id}">${stripHtml2(attr.title)}</option>`);
        });

    } catch (error) {
        console.error(error);
        $('#attributeSearchList').html(`
            <div class="px-4 py-3 text-sm text-red-500 text-center">
                <i class="fas fa-exclamation-triangle mr-2"></i> Failed to load attributes
            </div>
        `);
    }
}

// ========== UPDATE LOAD VALUES BUTTON ==========

// Replace the old load values event with this
$('#loadValuesBtn').off('click').on('click', function () {
    if (!selectedAttributeForSearch) {
        Notification.showNotification({
            type: 'warning',
            message: 'Please select an attribute first.'
        });
        renderValuesTable();
        return;
    }
    currentValueAttributeId = selectedAttributeForSearch.id;
    currentValuePage = 1;
    fetchValues(currentValueAttributeId, 1, true);
});

// ========== UPDATE NEW VALUE BUTTON ==========
$('.new-value-btn').off('click').on('click', function () {
    if (!selectedAttributeForSearch) {
        Notification.showNotification({
            type: 'warning',
            message: 'Please select an attribute first.'
        });
        return;
    }
    openValueCreateModal();
});

// ========== UPDATE OPEN VALUE CREATE MODAL ==========
function openValueCreateModal() {
    if (!selectedAttributeForSearch) {
        Notification.showNotification({
            type: 'warning',
            message: 'Please select an attribute first.'
        });
        return;
    }

    $('#valueFormModalTitle').text('Create New Value');
    $('#valueSubmitBtnText').text('Create Value');
    $('#valueForm')[0].reset();
    $('#valueEditId').val('');
    $('#valueAttributeId').val(selectedAttributeForSearch.id);
    $('#valueDisplayOrder').val('0');
    $('#valueFormModal').removeClass('hidden').css('display', 'flex');
    $('body').css('overflow', 'hidden');
    valueOriginalEditing = null;
    populateValueMetaFields({});

    // Set the attribute name in modal
    $('#valueModalAttribute').val(selectedAttributeForSearch.id);
}

// ========== UPDATE DOCUMENT READY ==========
$(document).ready(function () {

    // Initialize tab visibility
    $('#attr-tab-attributes').addClass('active');
    $('#attr-tab-attributes').css('display', 'block');
    $('#attr-tab-values').removeClass('active');
    $('#attr-tab-values').css('display', 'none');

    initAttributeSearchSelector();

    initValueMetaFields();

    $('.attr-tab').on('click', function () {
        const tabName = $(this).data('tab');
        switchTab(tabName);
    });

    $('.new-attribute-btn').on('click', openAttributeCreateModal);

    $attributeSearchInput.on('input', function () {
        applyAttributeSearch();
    });

    $attributeStatusFilter.on('change', function () {
        applyAttributeStatusFilter();
    });

    $('#attributeFilterResetBtn').on('click', function () {
        resetAttributeFilters(true);
    });

    $('#prevAttributePageBtn').on('click', prevAttributePage);
    $('#nextAttributePageBtn').on('click', nextAttributePage);

    // Refresh
    $('#refreshAttributes').on('click', function () {
        fetchAttributes(currentAttributePage, true);
    });

    // Empty state create
    $('#emptyAttributeBtn').on('click', openAttributeCreateModal);

    // ========== ATTRIBUTE MODALS ==========

    $('#closeAttributeFormModal').on('click', closeAttributeFormModal);
    $('.cancel-create-attribute').on('click', closeAttributeFormModal);
    $('.close-attribute-delete-modal').on('click', closeAttributeDeleteModal);
    $('.confirm-delete-attribute-btn').on('click', confirmAttributeDelete);

    $('.attribute-modal-overlay').on('click', function (e) {
        if ($(e.target).hasClass('attribute-modal-overlay')) {
            closeAttributeFormModal();
        }
    });

    $("#attributeForm").on('submit', handleAttributeFormSubmit);

    $('.new-value-btn').on('click', openValueCreateModal);

    $('#loadValuesBtn').off('click').on('click', function () {
        if (!selectedAttributeForSearch) {
            Notification.showNotification({
                type: 'warning',
                message: 'Please select an attribute first.'
            });
            renderValuesTable();
            return;
        }
        currentValueAttributeId = selectedAttributeForSearch.id;
        currentValuePage = 1;
        fetchValues(currentValueAttributeId, 1, false);
    });

    // ========== VALUE MODALS ==========

    // Close modal buttons
    $('#closeValueFormModal').on('click', closeValueFormModal);
    $('.cancel-create-value').on('click', closeValueFormModal);
    $('.close-value-delete-modal').on('click', closeValueDeleteModal);
    $('.confirm-delete-value-btn').on('click', confirmValueDelete);

    // Modal overlay close
    $('.value-modal-overlay').on('click', function (e) {
        if ($(e.target).hasClass('value-modal-overlay')) {
            closeValueFormModal();
        }
    });

    $(document).on("click", ".attribute-activate-btn", function (e) {
        activateAttribute(e.currentTarget.dataset.id, e.target);
    });

    // Form submit
    $("#valueForm").on('submit', handleValueFormSubmit);

    // ========== PAGINATION - VALUES ==========
    $('#prevValuePageBtn').on('click', prevValuePage);
    $('#nextValuePageBtn').on('click', nextValuePage);

});