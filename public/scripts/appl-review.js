document.addEventListener('DOMContentLoaded', function () {

    const lookupForm = document.getElementById('lookupForm');
    const referenceInput = document.getElementById('referenceInput');
    const lookupBtn = document.getElementById('lookupBtn');

    const modal = document.getElementById('resultModal');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const statusBadge = document.getElementById('statusBadge');

    const applicantNameEl = document.getElementById('applicantName');
    const applicationDateEl = document.getElementById('applicationDate');
    const businessNameEl = document.getElementById('businessName');
    const modalRefNumber = document.getElementById('modalRefNumber');

    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');

    let toastTimeout = null;

    function showToast(msg, type = 'success') {
        toastMessage.textContent = msg;
        toast.className = 'toast show ' + type;
        const icon = toast.querySelector('i');
        icon.className = type === 'success' ? 'fas fa-check-circle' :
            type === 'error' ? 'fas fa-exclamation-circle' :
                'fas fa-info-circle';

        clearTimeout(toastTimeout);
        toastTimeout = setTimeout(() => {
            toast.classList.remove('show');
        }, 3200);
    }

    function getStatusClass(status) {
        const map = {
            'pending': 'pending',
            'approved': 'approved',
            'rejected': 'rejected',
            'reviewing': 'reviewing'
        };
        return map[status] || 'pending';
    }

    function openModal(data) {
        applicantNameEl.textContent = data.names;
        applicationDateEl.textContent = formatDate(data.submitted_at);
        businessNameEl.textContent = data.business_name;
        modalRefNumber.textContent = data.reference_number;

        const statusClass = data.status_label;
        statusBadge.className = 'status-badge ' + statusClass;
        statusBadge.textContent = data.status_label;

        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeModal() {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }

    lookupForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        const reference = referenceInput.value.trim();

        if (!reference) {
            showToast('Please enter a reference number', 'error');
            referenceInput.focus();
            return;
        }

        const refPattern = /^VND-\d{6}-\d{6}$/i;

        if (!refPattern.test(reference)) {
            $('#responseMessage').text('Invalid format. Use: VND-XXXXXX-XXXXXX');
            referenceInput.focus();
            return;
        }

        lookupBtn.disabled = true;
        const lookupBtnHtml = lookupBtn.innerHTML;
        lookupBtn.innerHTML = 'Searching...';

        try {
            const response = await axios.get(`${protocal}api.${domainName}/business/applications/${reference}`, {
                withCredentials: true
            });

            openModal(response.data);
            referenceInput.value = '';

        } catch (error) {
            $('#responseMessage').text(error.response?.data?.message || error?.message || 'Application not found')
            referenceInput.style.animation = 'shake 0.4s ease';
            setTimeout(() => {
                referenceInput.style.animation = '';
            }, 400);
        } finally {
            lookupBtn.disabled = false;
            lookupBtn.innerHTML = lookupBtnHtml;
        }
    });

    closeModalBtn.addEventListener('click', closeModal);

    modal.addEventListener('click', function (e) {
        if (e.target === this) {
            const card = this.querySelector('.modal-card');
            card.style.animation = 'shake 0.4s ease';
            setTimeout(() => {
                card.style.animation = '';
            }, 400);
            showToast('Please click "Close" or "Go to Dashboard" to proceed', 'info');
        }
    });

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && modal.classList.contains('active')) {
            e.preventDefault();
            e.stopPropagation();
            const card = document.querySelector('.modal-card');
            card.style.animation = 'shake 0.4s ease';
            setTimeout(() => {
                card.style.animation = '';
            }, 400);
            showToast('Please click "Close" or "Go to Dashboard" to proceed', 'info');
        }
    });

    referenceInput.focus();

    if (identifier) {
        lookupForm.requestSubmit();
    }
});