$(document).ready(function () {

    const $form = $('#storeForm');
    const $submitBtn = $('#submitBtn');
    const $storeName = $('#storeName');
    const $storeSlug = $('#storeSlug');
    const $slugPreview = $('#slugPreview');
    const $slugStatus = $('#slugStatus');
    const $description = $('#storeDescription');
    const $charCount = $('#charCount');

    const $avatarInput = $('#storeAvatar');
    const $avatarPreview = $('#avatarPreview');
    const $fileName = $('#fileName');

    const $metaBody = $('#metaBody');
    const $metaEmpty = $('#metaEmpty');
    const $metaCount = $('#metaCount');
    const $addMetaBtn = $('#addMetaBtn');
    const $exampleMetaBtn = $('#exampleMetaBtn');

    const $successModal = $('#successModal');

    const $toast = $('#toast');
    const $toastMessage = $('#toastMessage');

    let toastTimeout = null;

    function showToast(msg, type = 'success') {
        $toastMessage.text(msg);
        $toast.removeClass('success error info').addClass('show ' + type);
        const icon = $toast.find('i');
        icon.attr('class', type === 'success' ? 'bi bi-check-circle-fill' :
            type === 'error' ? 'bi bi-exclamation-circle-fill' :
                'bi bi-info-circle-fill');

        clearTimeout(toastTimeout);
        toastTimeout = setTimeout(() => {
            $toast.removeClass('show');
        }, 3200);
    }

    function showError($input, $errorEl, message) {
        $input.addClass('error');
        $errorEl.html('<i class="bi bi-exclamation-circle"></i> ' + message).addClass('show');
    }

    function slugify(text) {
        return text
            .toString()
            .toLowerCase()
            .trim()
            .replace(/\s+/g, '-')
            .replace(/[^\w\-]+/g, '')
            .replace(/\-\-+/g, '-')
            .replace(/^-+/, '')
            .replace(/-+$/, '');
    }

    function validateEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    function getMetaObject() {
        const meta = {};
        $('.meta-row').each(function () {
            const key = $(this).find('.meta-key-input').val().trim();
            const value = $(this).find('.meta-value-input').val().trim();
            if (key) {
                meta[key] = value;
            }
        });
        return meta;
    }

    function updateMetaCount() {
        const count = $('.meta-row').length;
        $metaCount.text(count + ' items');
        if (count === 0) {
            $metaEmpty.show();
        } else {
            $metaEmpty.hide();
        }
    }

    function checkNameOrSlug(referrer = 'Store name', name, $target, callback) {
        if (name) {
            $target.removeClass('text-red-500 text-green-500')
                .addClass('text-gray-500')
                .text(`Checking ${referrer}...`);
            axios.get(`${protocal}api.${domainName}/business/stores/${name}`)
                .then(response => {
                    if (response.data.available) {
                        $target.removeClass('text-red-500 text-gray-500').addClass('text-green-500')
                            .text(`${referrer} ${response.data.message}`);
                        if (callback) callback();
                    } else {
                        $target.removeClass('text-green-500 text-gray-500').addClass('text-red-500')
                            .text(`${referrer} ${response.data.message}`);
                    }

                }).catch(error => {
                    console.log(error.response?.data?.message || 'Internal Server Error');
                    $target.removeClass('text-green-800 text-gray-500')
                        .addClass('text-red-500')
                        .text(error.response?.data?.message || 'Internal Server Error');
                })
        }
    }

    let inputTimeout;
    $storeName.on('input', async function () {
        const name = $(this).val();
        clearInterval(inputTimeout);
        inputTimeout = setTimeout(() => {
            checkNameOrSlug('Store name', name, $("#nameCheckingResponse"), () => {
                if (name.length > 0 && !$storeSlug.is(':focus')) {
                    const slug = slugify(name);
                    $storeSlug.val(slug);
                    updateSlugPreview(slug);
                }
            });
        }, 1000);


    });

    $storeSlug.on('input', function () {
        const slug = $(this).val();
        updateSlugPreview(slug);
    });

    function updateSlugPreview(slug) {
        const cleanSlug = slugify(slug) || 'store-slug';

        const isValid = /^[a-z0-9\-]+$/.test(cleanSlug) && cleanSlug.length > 0;

        if (isValid) {
            checkNameOrSlug('Slug key', slug, $slugPreview, null);
        } else {
            $slugPreview.addClass('text-red-500').html('<i class="bi bi-exclamation-circle-fill"></i> invalid format');
        }

        if (cleanSlug !== slug) {
            $storeSlug.val(cleanSlug);
        }
    }

    $description.on('input', function () {
        const length = $(this).val().length;
        const max = 500;
        $charCount.text(`${length} / ${max}`);

        $charCount.removeClass('warning danger');
        if (length > max * 0.85) {
            $charCount.addClass('warning');
        }
        if (length >= max) {
            $charCount.addClass('danger');
        }
    });

    $avatarInput.on('change', function () {
        const file = this.files[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) {
                showToast('Image size exceeds 2MB limit', 'error');
                this.value = '';
                return;
            }

            const reader = new FileReader();
            reader.onload = function (e) {
                const dataUrl = e.target.result;
                uploadedImage = dataUrl;
                $avatarPreview.html(`
              <img src="${dataUrl}" alt="Store avatar">
              <button class="remove-image" id="removeAvatarBtn" type="button">
                <i class="bi bi-x-lg"></i>
              </button>
            `);
                $avatarPreview.addClass('has-image');
                $fileName.html('<i class="bi bi-file-earmark-image"></i> ' + file.name);

                $('#removeAvatarBtn').on('click', function (e) {
                    e.stopPropagation();
                    removeAvatar();
                });
            };
            reader.readAsDataURL(file);
        }
    });

    function removeAvatar() {
        uploadedImage = null;
        $avatarInput.val('');
        $fileName.html('<i class="bi bi-file-earmark"></i> No file selected');
        $avatarPreview.removeClass('has-image');
        $avatarPreview.html(`
          <div class="placeholder">
            <i class="bi bi-shop"></i>
            <span>No image</span>
          </div>
          <button class="remove-image" id="removeAvatarBtn" type="button">
            <i class="bi bi-x-lg"></i>
          </button>
        `);

        $('#removeAvatarBtn').on('click', function (e) {
            e.stopPropagation();
            removeAvatar();
        });
    }


    $('#removeAvatarBtn').on('click', function (e) {
        e.stopPropagation();
        removeAvatar();
    });

    function addMetaRow(key = '', value = '') {
        const $row = $(`
          <div class="meta-row">
            <div class="meta-key">
              <input type="text" class="meta-key-input" placeholder="Key" value="${key}" />
            </div>
            <div class="meta-value">
              <input type="text" class="meta-value-input" placeholder="Value" value="${value}" />
            </div>
            <button class="btn-remove-meta" type="button">
              <i class="bi bi-trash3"></i>
            </button>
          </div>
        `);

        $row.find('.btn-remove-meta').on('click', function () {
            $row.remove();
            updateMetaCount();
            showToast('Meta item removed', 'info');
        });

        $row.find('input').on('input', function () {
            $(this).removeClass('error');
        });

        $metaBody.append($row);
        updateMetaCount();
        return $row;
    }

    $addMetaBtn.on('click', function () {
        addMetaRow();
        const $lastRow = $metaBody.find('.meta-row').last();
        if ($lastRow.length) {
            $lastRow[0].scrollIntoView({
                behavior: 'smooth',
                block: 'center'
            });
        }
    });

    $exampleMetaBtn.on('click', function () {
        $metaBody.find('.meta-row').remove();

        const examples = {
            'opening_hours': 'Mon-Fri: 8AM-6PM, Sat: 9AM-4PM, Sun: Closed',
            'facebook': 'https://facebook.com/store',
            'twitter': 'https://twitter.com/store',
            'instagram': 'https://instagram.com/store',
            'delivery_zones': 'Kigali, Gasabo, Kicukiro, Nyarugenge',
            'payment_methods': 'Cash, Mobile Money, Bank Transfer, Credit Card'
        };

        Object.entries(examples).forEach(([key, value]) => {
            addMetaRow(key, value);
        });

        updateMetaCount();
    });


    $form.on('submit', async function (e) {
        e.preventDefault();

        $('.error-message').removeClass('show');
        $('.error').removeClass('error');

        let isValid = true;

        const name = $storeName.val().trim();
        if (!name) {
            showError($storeName, $('#nameError'), 'Store name is required');
            isValid = false;
        }

        const slug = $storeSlug.val().trim();
        if (!slug) {
            showError($storeSlug, $('#slugError'), 'Slug is required');
            isValid = false;
        } else if (!/^[a-z0-9\-]+$/.test(slug)) {
            showError($storeSlug, $('#slugError'), 'Slug can only contain lowercase letters, numbers, and hyphens');
            isValid = false;
        }

        const email = $('#storeEmail').val().trim();
        if (email && !validateEmail(email)) {
            showError($('#storeEmail'), $('#emailError'), 'Please enter a valid email address');
            isValid = false;
        }

        let hasEmptyKey = false;
        $('.meta-key-input').each(function () {
            const val = $(this).val().trim();
            if (!val) {
                $(this).addClass('error');
                hasEmptyKey = true;
            }
        });

        if (hasEmptyKey) {
            showToast('Please fill in all meta keys or remove empty rows', 'error');
            isValid = false;
        }

        if (!isValid) {
            showToast('Please fix the errors before submitting.', 'error');
            return;
        }

        // Disable submit button
        $submitBtn.prop('disabled', true);
        $submitBtn.html('<i class="bi bi-arrow-repeat bi-spin"></i> Submitting...');

        const meta = getMetaObject();

        const formData = new FormData();

        const avatar = $('#storeAvatar').prop('files')[0]

        formData.append('name', name);
        formData.append('slug', slug);
        formData.append('description', $description.val().trim());
        formData.append('phone_number', $('#storePhone').val().trim());
        formData.append('email', email);
        formData.append('physical_address', $('#storeAddress').val().trim());
        formData.append('meta', JSON.stringify(meta));
        formData.append('avatar', avatar);

        try {
            const response = await axios.post(`${protocal}api.${domainName}/business/stores/`, formData, {
                withCredentials: true,
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            },);

            $successModal.addClass('active');
            $('body').css('overflow', 'hidden');

            if (response.data.success) {
                $form[0].reset();
                $charCount.text('0 / 500');
                $slugPreview.text('store-slug');
                $slugStatus.removeClass('valid invalid').html('');
                $metaBody.find('.meta-row').remove();
                updateMetaCount();
                removeAvatar();
            }

        } catch (error) {
            console.log(error);
            Notification.showNotification({
                message: error.response?.data?.message || 'Failed — Internal Server Error',
                type: 'error'
            });

        } finally {
            $submitBtn.prop('disabled', false);
            $submitBtn.html('<i class="bi bi-upload"></i> Create Store');
        }
    });

    function closeModal() {
        $successModal.removeClass('active');
        $('body').css('overflow', '');
    }

    $successModal.on('click', function (e) {
        if (e.target === this) {
            closeModal();
        }
    });

    $(document).on('keydown', function (e) {
        if (e.key === 'Escape' && $successModal.hasClass('active')) {
            closeModal();
        }
    });

    $storeName.on('blur', function () {
        const slug = $storeSlug.val().trim();
        if (!slug) {
            const name = $(this).val().trim();
            if (name) {
                const newSlug = slugify(name);
                $storeSlug.val(newSlug);
                updateSlugPreview(newSlug);
            }
        }
    });

    updateMetaCount();

    $('#storeName').focus();
});