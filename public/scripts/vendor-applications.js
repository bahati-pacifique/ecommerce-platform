$(document).ready(async function () {

    let applications = [];
    let filteredApplications = [];
    let currentFilter = 'all';
    let currentSearch = '';
    let currentPage = 1;
    const itemsPerPage = 10;
    let currentAppId = null;
    let pendingApproveId = null;

    function showToast(msg, type = 'success') {

        const $toast = $('#toast');
        const $toastMessage = $('#toastMessage');
        $toastMessage.text(msg);

        $toast.removeClass('success error info').addClass('show ' + type);
        const icon = $toast.find('i');

        icon.attr('class', type === 'success' ? 'fas fa-check-circle' :
            type === 'error' ? 'fas fa-exclamation-circle' :
                'fas fa-info-circle');

        clearTimeout(window.toastTimeout);

        window.toastTimeout = setTimeout(() => {
            $toast.removeClass('show');
        }, 3200);
    }

    function getStatusClass(status) {
        return status;
    }

    function getStatusLabel(status) {

        return capitalize(status.replace('_', ' '));
    }

    function getStatusBadgeHTML(status) {
        const cls = getStatusClass(status);
        const label = getStatusLabel(status);
        return `<span class="status-badge ${cls}"><span class="dot"></span> ${label}</span>`;
    }

    function formatDate(dateStr) {
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    function getFullName(app) {
        return `${app.f_name || ''} ${app.l_name || ''}`.trim() || 'N/A';
    }

    function getImagesForApp(name, key) {
        return `https://cdn.cococe.rw/images/${name}/${key}.jpg`;
    }

    function renderImagePlaceholder($wrapper, type) {
        const icon = type === 'photo' ? 'fa-user' : 'fa-id-card';
        const label = type === 'photo' ? 'No photo uploaded' : 'No ID copy uploaded';
        $wrapper.html(`
      <div class="placeholder-img">
        <i class="fas ${icon}"></i>
        <span>${label}</span>
      </div>
    `);
    }

    function renderImage($wrapper, imageUrl, type) {
        if (!imageUrl) {
            renderImagePlaceholder($wrapper, type);
            return;
        }
        $wrapper.html(`
      <img src="${imageUrl}" alt="${type === 'photo' ? 'Passport Photo' : 'ID Copy'}" />
    `);
    }

    async function fetchApplications() {

        try {
            const response = await axios.get(`${protocal}api.${domainName}/business/applications`, {
                withCredentials: true
            });
            return response.data
        } catch (error) {
            console.log(error);
            Notification.showNotification({
                type: 'error',
                message: error.response?.data?.message || 'Internal Server Error'
            });

            return [];
        }
    }

    function updateApplicationStatus(id, newStatus) {
        return new Promise((resolve) => {
            setTimeout(() => {
                const app = applications.find(a => String(a.id) === String(id));
                if (app) {
                    app.status = newStatus;
                    const mockApp = mockResponse.applications.find(a => String(a.id) === String(id));
                    if (mockApp) {
                        mockApp.status = newStatus;
                        mockApp.reviewed_at = new Date().toISOString();
                        mockApp.reviewed_by = 'admin@cococe.rw';
                    }
                }
                resolve({
                    success: true
                });
            }, 600);
        });
    }

    function renderTable() {
        let filtered = [...applications];

        if (currentFilter !== 'all') {
            filtered = filtered.filter(app => app.status === currentFilter);
        }

        if (currentSearch.trim()) {
            const query = currentSearch.toLowerCase().trim();
            filtered = filtered.filter(app =>
                app.reference_number.toLowerCase().includes(query) ||
                getFullName(app).toLowerCase().includes(query) ||
                app.business_name.toLowerCase().includes(query) ||
                app.email.toLowerCase().includes(query)
            );
        }

        filteredApplications = filtered;
        updateCounts();

        const totalItemsCount = filtered.length;
        const totalPages = Math.ceil(totalItemsCount / itemsPerPage);
        const start = (currentPage - 1) * itemsPerPage;
        const end = Math.min(start + itemsPerPage, totalItemsCount);
        const pageItems = filtered.slice(start, end);

        $('#showingStart').text(totalItemsCount > 0 ? start + 1 : 0);
        $('#showingEnd').text(end);
        $('#totalItems').text(totalItemsCount);

        $('#prevPage').prop('disabled', currentPage <= 1);
        $('#nextPage').prop('disabled', currentPage >= totalPages);

        if (totalItemsCount === 0) {
            $('#applicationsTableBody').html('');
            $('#emptyState').removeClass('hidden');
            $('#pagination').addClass('hidden');
            $('#appCount').text('0');
            return;
        }

        $('#emptyState').addClass('hidden');
        $('#pagination').removeClass('hidden');
        $('#appCount').text(totalItemsCount);

        let html = '';
        
        pageItems.forEach(app => {
            const fullName = getFullName(app);
            const typeLabel = app.type ? `${app.type}` : 'N/A';
            html += `
        <tr data-app-id="${app.id}">
          <td>
            <span class="ref-number">
              ${app.reference_number}
              <button class="copy-btn" data-ref="${app.reference_number}" title="Copy reference">
                <i class="fas fa-copy"></i>
              </button>
            </span>
          </td>
          <td>
            <div class="font-medium text-[#0F172A]">${fullName}</div>
            <div class="text-xs text-[#94A3B8]">${app.email || 'N/A'}</div>
          </td>
          <td>
            <div class="font-medium text-[#0F172A]">${app.business_name || 'N/A'}</div>
            <div class="text-xs text-[#94A3B8]">${app.business_address || 'N/A'}</div>
          </td>
          <td class="text-[#475569]">${typeLabel}</td>
          <td>${getStatusBadgeHTML(app.status)}</td>
          <td class="text-[#475569]">${formatDate(app.submitted_at)}</td>
          <td style="text-align:center;">
            <button class="btn-review review-btn" data-app-id="${app.id}">
              <i class="fas fa-eye"></i> Review
            </button>
          </td>
        </tr>
      `;
        });

        $('#applicationsTableBody').html(html);
    }

    function updateCounts() {
        const total = applications.length;
        const pending = applications.filter(a => a.status === 'missing_requirement').length;
        const reviewing = applications.filter(a => a.status === 'under_review').length;
        const approved = applications.filter(a => a.status === 'approved').length;
        const rejected = applications.filter(a => a.status === 'rejected').length;

        $('#countAll').text(total);
        $('#countPending').text(pending);
        $('#countReviewing').text(reviewing);
        $('#countApproved').text(approved);
        $('#countRejected').text(rejected);
    }

    $(document).on('click', '.copy-btn', function () {
        const text = $(this).data('ref');
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(() => {
                showToast('Copied!', 'success');
            }).catch(() => {
                fallbackCopy(text);
            });
        } else {
            fallbackCopy(text);
        }
    });

    function fallbackCopy(text) {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        try {
            document.execCommand('copy');
            showToast('Copied!', 'success');
        } catch (e) {
            showToast('Failed to copy', 'error');
        }
        document.body.removeChild(ta);
    }

    $(document).on('click', '.review-btn', function () {
        const appId = $(this).data('app-id');
        openReviewModal(appId);
    });

    $(document).on('click', '.view-image-btn', function () {
        const type = $(this).data('type');
        const $wrapper = type === 'photo' ? $('#photoPassportWrapper') : $('#idCopyWrapper');
        const img = $wrapper.find('img');
        const src = img.length ? img.attr('src') : null;

        if (src) {
            window.open(src, '_blank');
        } else {
            showToast('No image to view', 'info');
        }
    });

    $(document).on('click', '.download-image-btn', function () {
        const type = $(this).data('type');
        const $wrapper = type === 'photo' ? $('#photoPassportWrapper') : $('#idCopyWrapper');
        const img = $wrapper.find('img');
        const src = img.length ? img.attr('src') : null;

        if (src) {
            const link = document.createElement('a');
            link.href = src;
            link.download = `${type}-${Date.now()}.jpg`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            showToast('Downloading image...', 'success');
        } else {
            showToast('No image to download', 'info');
        }
    });



    function openReviewModal(id, application) {

        let app;

        if (!application) {
            app = applications.find(a => String(a.id) === String(id));
            if (!app) {
                showToast('Application not found. Please refresh and try again.', 'error');
                return;
            }
        } else {
            app = application;
        }

        currentAppId = app.id;

        $('#modalRefNumber').text(app.reference_number);
        $('#modalApplicantName').text(getFullName(app));
        $('#modalEmail').text(app.email || 'N/A');
        $('#modalPhone').text(app.phone_number || 'N/A');
        $('#modalBusinessName').text(app.business_name || 'N/A');
        $('#modalBusinessAddress').text(app.business_address || 'N/A');
        $('#modalTaxInfo').text(`${app.tin_number || 'N/A'} / ${app.vat_number || 'N/A'}`);
        $('#modalTypeCategory').text(`${app.type || 'N/A'} / ${app.category || 'N/A'}`);
        $('#modalSubmittedAt').text(formatDate(app.submitted_at));
        $('#modalAppId').text(app.id);

        const statusLabel = getStatusLabel(app.status);
        const statusCls = getStatusClass(app.status);
        $('#modalStatus').text(statusLabel);
        $('#modalStatus').attr('class', `value status-badge ${statusCls}`);

        renderImage($('#photoPassportWrapper'), getImagesForApp('profiles', app.user_id), 'photo');
        renderImage($('#idCopyWrapper'), getImagesForApp('ids', app.user_id), app.user_id);

        $('#reviewModal').addClass('active');
        $('body').css('overflow', 'hidden');
    }

    function closeModal() {
        $('#reviewModal').removeClass('active');
        $('body').css('overflow', '');
        currentAppId = null;
    }

    $('#closeModalBtn, #closeModalActionBtn').on('click', closeModal);

    $('#reviewModal').on('click', function (e) {
        if (e.target === this) {
            closeModal();
        }
    });

    $(document).on('keydown', function (e) {
        if (e.key === 'Escape' && $('#reviewModal').hasClass('active')) {
            closeModal();
        }
    });

    function openConfirmModal(appId) {
        pendingApproveId = appId;
        const app = applications.find(a => String(a.id) === String(appId));
        if (app) {
            $('#confirmAppId').text(app.id);
        }
        $('#confirmModal').addClass('active');
        $('body').css('overflow', 'hidden');
    }

    function closeConfirmModal() {
        $('#confirmModal').removeClass('active');
        $('body').css('overflow', '');
        pendingApproveId = null;
    }

    function openLoaderModal() {
        $('#loaderModal').addClass('active');
        $('body').css('overflow', 'hidden');
    }

    function closeLoaderModal() {
        $('#loaderModal').removeClass('active');
        $('body').css('overflow', '');
    }

    $('#cancelConfirmBtn').on('click', closeConfirmModal);

    $('#confirmModal').on('click', function (e) {
        if (e.target === this) {
            closeConfirmModal();
        }
    });

    $(document).on('keydown', function (e) {
        if (e.key === 'Escape' && $('#confirmModal').hasClass('active')) {
            closeConfirmModal();
        }
    });

    $('#approveBtn').on('click', function () {
        if (currentAppId) {
            openConfirmModal(currentAppId);
        }
    });

    $('#approveConfirmBtn').on('click', async function () {
        if (!pendingApproveId) return;

        const $btn = $(this);
        $btn.prop('disabled', true);
        $btn.html('Processing...');

        try {

            const response = await axios.post(`${protocal}api.${domainName}/business/applications/${pendingApproveId}/approve`, {}, {
                withCredentials: true
            });

            closeConfirmModal();
            closeModal();
            Notification.showNotification({
                type: 'success',
                message: 'Business application approved successfully.'
            });
            fetchApplications();
            renderTable();
        } catch (error) {
            console.log(error);
            Notification.showNotification({
                type: 'error',
                message: error.response?.data?.message || 'Internal Server Error'
            });
        } finally {
            $btn.prop('disabled', false);
            $btn.html('Yes, Approve');
        }
    });

    $('#missingRequirement').on('click', function () {
        showSnackbar({
            type: "warning",
            message: "Application will be marked as missing requirement?",
            actionText: "Continue",
            onAction: async () => {
                if (currentAppId) {

                    try {
                        const application = applications.find(a => a.id === currentAppId);

                        const payload = {
                            userEmail: application.email,
                            firstName: application.f_name,
                            referenceNumber: application.reference_number,
                            businessName: application.business_name
                        }

                        $('#approveBtn, #missingRequirement, #rejectBtn').prop('disabled', true);
                        const response = await axios.put(`${protocal}api.${domainName}/business/vendor-application/deny/${application.id}`, payload, {
                            withCredentials: true
                        });

                        Notification.showNotification({
                            type: 'success',
                            message: 'Application status set!'
                        });

                        closeModal();
                        fetchApplications();
                        renderTable();

                    } catch (error) {
                        console.log(error);
                        Notification.showNotification({
                            type: 'error',
                            message: error.response?.data?.message || 'Internal Server Error'
                        });
                    } finally {
                        $('#approveBtn, #missingRequirement, #rejectBtn').prop('disabled', false);
                    }
                } else {
                    showToast("Something went wrong", "error");
                }
            }
        });

    });

    $('#rejectBtn').on('click', function () {

        showSnackbar({
            type: "warning",
            message: "Application will be marked as rejected?",
            actionText: "Continue",
            onAction: async () => {
                if (currentAppId) {

                    try {
                        const application = applications.find(a => a.id === currentAppId);

                        const payload = {
                            userEmail: application.email,
                            firstName: application.f_name,
                            referenceNumber: application.reference_number,
                            businessName: application.business_name,
                            status: "rejected",
                            rejectionReason: "Application does not comply with our business requirements and Terms of Service."
                        }

                        $('#approveBtn, #missingRequirement, #rejectBtn').prop('disabled', true);

                        const response = await axios.put(`${protocal}api.${domainName}/business/vendor-application/deny/${application.id}`, payload, {
                            withCredentials: true
                        });

                        Notification.showNotification({
                            type: 'success',
                            message: 'Application status set!'
                        });

                        closeModal();
                        fetchApplications();
                        renderTable();

                    } catch (error) {
                        console.log(error);
                        Notification.showNotification({
                            type: 'error',
                            message: error.response?.data?.message || 'Internal Server Error'
                        });
                    } finally {
                        $('#approveBtn, #missingRequirement, #rejectBtn').prop('disabled', false);
                    }
                } else {
                    showToast("Something went wrong", "error");
                }
            }
        });


    });

    
    $('.btn-filter').on('click', function () {
        $('.btn-filter').removeClass('active');
        $(this).addClass('active');
        currentFilter = $(this).data('filter');
        currentPage = 1;
        renderTable();
    });

    
    $('#searchInput').on('input', function () {
        currentSearch = $(this).val();
        currentPage = 1;
        renderTable();
    });

    $('#prevPage').on('click', function () {
        if (currentPage > 1) {
            currentPage--;
            renderTable();
        }
    });

    $('#nextPage').on('click', function () {
        const totalPages = Math.ceil(filteredApplications.length / itemsPerPage);
        if (currentPage < totalPages) {
            currentPage++;
            renderTable();
        }
    });

    $('.lang-toggle button').on('click', function () {
        $('.lang-toggle button').removeClass('active');
        $(this).addClass('active');
        showToast(`Language switched to ${$(this).text()}`, 'info');
    });

    async function init() {
        $('#loadingState').show();

        try {
            const data = await fetchApplications();
            applications = data.applications || [];
            renderTable();
        } catch (error) {
            showToast('Failed to load applications', 'error');
        } finally {
            $('#loadingState').hide();
        }
    }

    init();

    const queryString = window.location.search;

    const urlParams = new URLSearchParams(queryString);

    const searchQuery = urlParams.get('rf');

    if (searchQuery) {
        openLoaderModal();
        try {
            const response = await axios.get(`${protocal}api.${domainName}/business/applications/${searchQuery}`, {
                withCredentials: true
            });

            const application = response.data;
            openReviewModal(null, application)
        } catch (error) {
            console.log(error);
            Notification.showNotification({
                type: 'error',
                message: error.response?.data?.message || 'Internal Server Error'
            });
        } finally {
            closeLoaderModal();
        }
    }
});