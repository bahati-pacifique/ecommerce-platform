$(document).ready(function () {

    const navToggle = document.getElementById('mobileNavToggle');
    const navDropdown = document.getElementById('mobileNavDropdown');

    // Ensure the toggle is visible and functional
    if (navToggle && navDropdown) {
        navToggle.addEventListener('click', function (e) {
            e.stopPropagation();
            this.classList.toggle('active');
            navDropdown.classList.toggle('open');
            const isOpen = navDropdown.classList.contains('open');
            this.setAttribute('aria-expanded', isOpen);
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', function (e) {
            if (!e.target.closest('nav')) {
                navToggle.classList.remove('active');
                navDropdown.classList.remove('open');
                navToggle.setAttribute('aria-expanded', 'false');
            }
        });

        // Close dropdown when a link is clicked
        navDropdown.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', function () {
                navToggle.classList.remove('active');
                navDropdown.classList.remove('open');
                navToggle.setAttribute('aria-expanded', 'false');
            });
        });
    }

    let currentStep = hasUser ? 2 : 1;
    const totalSteps = 3;

    function goToStep(step) {
        // Hide all steps
        $('.step-content').removeClass('active');

        // Show target step
        $(`#step${step}`).addClass('active');

        // Update step indicators
        for (let i = 1; i <= totalSteps; i++) {
            const circle = $(`#step${i}Circle`);
            const label = $(`#step${i}Label`);
            const line = $(`#stepLine${i}`);

            circle.removeClass('active completed');
            label.removeClass('active completed');
            line.removeClass('completed');

            if (i < step) {
                circle.addClass('completed');
                label.addClass('completed');
                if (i < totalSteps) line.addClass('completed');
            } else if (i === step) {
                circle.addClass('active');
                label.addClass('active');
            }
        }

        currentStep = step;

        // Scroll to top of form
        $('html, body').animate({
            scrollTop: $('.bg-white.rounded-2xl').offset().top - 100
        }, 300);
    }

    // ============================================================
    // USERNAME AVAILABILITY CHECK
    // ============================================================
    let usernameCheckTimeout = null;
    let isUsernameValid = false;

    function checkUsernameAvailability(username) {
        const $status = $('#usernameStatus');
        const $indicator = $('#usernameCheckIndicator');
        const $checking = $('#usernameChecking');

        if (username.length < 3) {
            $status.removeClass('available unavailable checking').text('Username must be at least 3 characters');
            $indicator.addClass('hidden');
            isUsernameValid = false;
            return;
        }

        // Show checking state
        $status.removeClass('available unavailable checking').addClass('checking').text('Checking availability...');
        $indicator.removeClass('hidden');

        clearTimeout(usernameCheckTimeout);

        usernameCheckTimeout = setTimeout(() => {

            axios.get(`${protocal}api.${domainName}/users/check-username?username=${username}`)
                .then(response => {
                    const data = response.data;
                    updateUsernameStatus(data.isAvailable, username);
                })
                .catch(error => {
                    console.log(error);
                    updateUsernameStatus(null, null, error);
                })
                .finally(() => {
                    $indicator.addClass('hidden');
                });
        }, 600);
    }

    // ============================================================
    // BUSINESS AVAILABILITY CHECK
    // ============================================================
    let businessNameCheckTimeout = null;
    let isBusinessValid = false;

    function checkBusinessNameAvailability(username) {

        const $status = $('#businessCheckingStatus');

        if (username.length < 3) {
            isBusinessValid = false;
            return;
        }

        // Show checking state
        $status.addClass('text-amber-800').removeClass('text-red-500').removeClass('text-green-800').addClass('checking').text('Checking business name...');
        $status.removeClass('hidden');

        clearTimeout(businessNameCheckTimeout);

        businessNameCheckTimeout = setTimeout(() => {

            axios.get(`${protocal}api.${domainName}/business/check-businessname?username=${username}`)
                .then(response => {
                    const data = response.data;
                    if (!data.isAvailable) {
                        isBusinessValid = false;
                        $status.removeClass('text-amber-800').addClass('text-red-500').text(data.message);
                    } else {
                        isBusinessValid = true;
                        $status.removeClass('text-amber-800').addClass('text-green-800').text(data.message);
                    }
                })
                .catch(error => {
                    console.log(error);
                    $status.removeClass('text-amber-800').addClass('text-red-500').text('Unable to check business name');
                })
        }, 600);
    }

    function updateUsernameStatus(available, username, error = null) {

        const $status = $('#usernameStatus');

        if (error) {
            $status.removeClass('checking available').addClass('unavailable')
                .text(error.response?.data?.message || 'Unable to check username');
            return;
        }

        if (available) {
            $status.removeClass('checking unavailable').addClass('available').html(`<i class="bi bi-check2"></i> "${username}" is available!`);
            // $available.removeClass('hidden');
            // $unavailable.addClass('hidden');
            isUsernameValid = true;
            $('#username').removeClass('error').addClass('success');
        } else {
            $status.removeClass('checking available').addClass('unavailable')
                .html(`<i class="bi bi-ban"></i> "${username}" is not available. Please try another.`);
            // $available.addClass('hidden');
            // $unavailable.removeClass('hidden');
            isUsernameValid = false;
            $('#username').removeClass('success').addClass('error');
        }
    }

    // Username input handler
    $('#username').on('input', function () {
        const username = $(this).val().trim();
        if (username.length >= 3) {
            checkUsernameAvailability(username);
        } else {
            const $status = $('#usernameStatus');
            $status.removeClass('available unavailable checking').text('Username must be at least 3 characters');
            $('#usernameCheckIndicator').addClass('hidden');
            isUsernameValid = false;
            $(this).removeClass('success');
        }
    });

    $('#businessName').on('input', function () {
        const name = $(this).val().trim();
        if (name.length >= 3) {
            checkBusinessNameAvailability(name);
        }
    });

    $('#suggestedUsername').click((e) => {
        const suggested = $('#suggestedUsername').text();
        if (suggested) {
            $('#username').val(suggested);
            checkUsernameAvailability(suggested);
        }
    })

    // ============================================================
    // USERNAME SUGGESTION
    // ============================================================
    const firstNameInput = document.getElementById('firstName');
    const lastNameInput = document.getElementById('lastName');
    const usernameInput = document.getElementById('username');

    function generateUsername(firstName, lastName, userFirstNameOnly = true) {
        if (!firstName && !lastName) return '';

        if (!userFirstNameOnly) {
            const first = firstName.trim().toLowerCase() || '';
            const last = lastName.trim().toLowerCase() || '';

            let username = '';
            if (first && last) {
                username = `${first}_${last}`;
            } else if (first) {
                username = first;
            } else if (last) {
                username = last;
            }

            username = username.replace(/[^a-z0-9_]/g, '');

            if (username.length < 3) {
                username += Math.floor(Math.random() * 100);
            }
            return username;
        } else {
            return firstName
        }

    }

    function updateUsernameSuggestion() {
        const firstName = firstNameInput.value.trim();
        const lastName = lastNameInput.value.trim();

        if (firstName || lastName) {
            const suggested = generateUsername(firstName, lastName, true);
            if (suggested) {
                $('#suggestedUsername').text(suggested);
                $('#usernameSuggestion').css('display', 'inline');
                $('#usernameHint').text('Auto-suggested from your name');
            } else {
                $('#usernameSuggestion').css('display', 'none');
                $('#usernameHint').text('Enter a unique username');
            }
        } else {
            $('#usernameSuggestion').css('display', 'none');
            $('#usernameHint').text('Enter a unique username');
        }
    }

    firstNameInput.addEventListener('input', function () {
        updateUsernameSuggestion();
        const username = $('#username').val();
        if (!usernameInput.dataset.manuallyEdited && !username) {
            const suggested = generateUsername(this.value.trim(), lastNameInput.value.trim(), true);
            if (suggested) {
                $('#username').val(suggested);
                if (suggested.length >= 3) {
                    checkUsernameAvailability(suggested);
                }
            }
        }
    });

    lastNameInput.addEventListener('input', function () {
        updateUsernameSuggestion();
        const username = $('#username').val();
        if (!usernameInput.dataset.manuallyEdited && !username) {
            const suggested = generateUsername(firstNameInput.value.trim(), this.value.trim(), true);
            if (suggested) {
                $('#username').val(suggested);
                if (suggested.length >= 3) {
                    checkUsernameAvailability(suggested);
                }
            }
        }
    });

    usernameInput.addEventListener('input', function () {
        this.dataset.manuallyEdited = 'true';
        $(this).removeClass('success error');
    });

    // ============================================================
    // STEP VALIDATION WITH USERNAME CHECK
    // ============================================================
    function validateStep(step) {
        let isValid = true;
        let errors = [];

        if (step === 1) {
            const requiredFields = ['idNumber', 'firstName', 'lastName', 'username', 'email', 'phoneNumber',
                'password', 'confirmPassword'
            ];
            requiredFields.forEach(id => {
                const $field = $(`#${id}`);
                if (!$field.val().trim()) {
                    isValid = false;
                    $field.addClass('error');
                    errors.push($field.attr('placeholder') || id);
                } else {
                    $field.removeClass('error');
                }
            });

            const email = $('#email').val().trim();
            if (email && !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
                isValid = false;
                errors.push('Valid email address');
                $('#email').addClass('error');
            }

            const password = $('#password').val();
            if (password && password.length < 8) {
                isValid = false;
                errors.push('Password must be 8+ characters');
                $('#password').addClass('error');
            }

            const confirm = $('#confirmPassword').val();
            if (password && confirm && password !== confirm) {
                isValid = false;
                errors.push('Passwords do not match');
                $('#confirmPassword').addClass('error');
            }

            if (!isUsernameValid && $('#username').val().trim().length >= 3) {
                isValid = false;
                errors.push('Username must be available');
                $('#username').addClass('error');
            }

            if (!$('#username').val().trim()) {
                isValid = false;
                errors.push('Username is required');
                $('#username').addClass('error');
            }
        }

        if (step === 2) {
            const $businessName = $('#businessName');
            const $vendorType = $('#vendorType');

            if (!$businessName.val().trim()) {
                isValid = false;
                $businessName.addClass('error');
                errors.push('Business Name');
            } else {
                $businessName.removeClass('error');
            }

            if (!isBusinessValid) {
                $businessName.addClass('error');
                errors.push('Business Name is not vaild');
            } else {
                $businessName.removeClass('error');
            }

            if (!$vendorType.val()) {
                isValid = false;
                $vendorType.addClass('error');
                errors.push('Business Type');
            } else {
                $vendorType.removeClass('error');
            }
        }

        if (step === 3) {
            const $terms = $('#agreeTerms');
            const $privacy = $('#agreePrivacy');
            const $vendor = $('#agreeVendor');

            if (!$terms.is(':checked')) {
                isValid = false;
                errors.push('Terms of Service agreement');
                $terms.closest('.agreement-item').addClass('error');
            } else {
                $terms.closest('.agreement-item').removeClass('error');
            }

            if (!$privacy.is(':checked')) {
                isValid = false;
                errors.push('Privacy Policy acceptance');
                $privacy.closest('.agreement-item').addClass('error');
            } else {
                $privacy.closest('.agreement-item').removeClass('error');
            }

            if (!$vendor.is(':checked')) {
                isValid = false;
                errors.push('Business owner confirmation');
                $vendor.closest('.agreement-item').addClass('error');
            } else {
                $vendor.closest('.agreement-item').removeClass('error');
            }
        }

        if (!isValid) {
            showToast(`Please complete: ${errors.join(', ')}`, 'error');
        }

        return isValid;
    }

    // ============================================================
    // NEXT/PREV STEP HANDLERS
    // ============================================================
    $('.next-step').on('click', function () {
        const next = parseInt($(this).data('next').replace('step', ''));
        const current = next - 1;
        if (validateStep(current)) {
            goToStep(next);
        }
    });

    $('.prev-step').on('click', function () {
        const prev = parseInt($(this).data('prev').replace('step', ''));
        goToStep(prev);
    });

    // ============================================================
    // AVATAR UPLOAD
    // ============================================================
    const avatarUpload = document.getElementById('avatarUpload');
    const avatarInput = document.getElementById('user-profile-image');
    const avatarPreview = document.getElementById('avatarPreview');
    const avatarPlaceholder = document.getElementById('avatarPlaceholder');
    const profileImage = document.getElementById('profileImage');

    avatarUpload.addEventListener('click', function () {
        avatarInput.click();
    });

    avatarInput.addEventListener('change', function (e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function (event) {
                avatarPreview.src = event.target.result;
                avatarPreview.classList.remove('hidden');
                avatarPlaceholder.classList.add('hidden');
                profileImage.value = event.target.result;
            };
            reader.readAsDataURL(file);
        }
    });

    // ============================================================
    // PASSWORD TOGGLE
    // ============================================================
    function togglePasswordVisibility(inputId, iconId) {
        const input = document.getElementById(inputId);
        const icon = document.getElementById(iconId);
        if (input.type === 'password') {
            input.type = 'text';
            icon.className = 'fas fa-eye-slash';
        } else {
            input.type = 'password';
            icon.className = 'fas fa-eye';
        }
    }

    document.getElementById('togglePassword').addEventListener('click', function () {
        togglePasswordVisibility('password', 'passwordIcon');
    });

    document.getElementById('toggleConfirmPassword').addEventListener('click', function () {
        togglePasswordVisibility('confirmPassword', 'confirmPasswordIcon');
    });

    // ============================================================
    // PASSWORD MATCH VALIDATION
    // ============================================================
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const passwordMatchHint = document.getElementById('passwordMatchHint');

    function validatePasswordMatch() {
        const password = passwordInput.value;
        const confirm = confirmPasswordInput.value;

        if (confirm.length === 0) {
            passwordMatchHint.textContent = 'Passwords must match';
            passwordMatchHint.className = 'form-hint';
            confirmPasswordInput.classList.remove('success', 'error');
            return;
        }

        if (password === confirm) {
            passwordMatchHint.innerHTML = '<i class="fas fa-check-circle"></i> Passwords match!';
            passwordMatchHint.className = 'form-hint text-green-600';
            confirmPasswordInput.classList.remove('error');
            confirmPasswordInput.classList.add('success');
        } else {
            passwordMatchHint.innerHTML = '<i class="bi bi-x"></i> Passwords do not match';
            passwordMatchHint.className = 'form-hint text-red-600';
            confirmPasswordInput.classList.remove('success');
            confirmPasswordInput.classList.add('error');
        }
    }

    passwordInput.addEventListener('input', validatePasswordMatch);
    confirmPasswordInput.addEventListener('input', validatePasswordMatch);

    // ============================================================
    // VENDOR TYPE INFO CARDS
    // ============================================================
    const vendorTypeInfo = {
        retailer: {
            title: 'Retailer',
            icon: 'fa-store',
            description: 'Sells products directly to consumers. Retailers are the final link in the supply chain.',
            tags: ['B2C', 'Direct sales', 'Consumer focus'],
            badge: 'Popular',
            badgeClass: 'popular'
        },
        wholesaler: {
            title: 'Wholesaler',
            icon: 'fa-warehouse',
            description: 'Sells products in bulk to retailers, businesses, or other wholesalers. Typically operates B2B.',
            tags: ['B2B', 'Bulk sales', 'Trade focus'],
            badge: 'Professional',
            badgeClass: 'premium'
        },
        distributor: {
            title: 'Distributor',
            icon: 'fa-truck-fast',
            description: 'Distributes products from manufacturers to retailers or end-users. Manages logistics and supply chain.',
            tags: ['Logistics', 'Supply chain', 'B2B'],
            badge: 'Recommended',
            badgeClass: 'recommended'
        },
        manufacturer: {
            title: 'Manufacturer',
            icon: 'fa-industry',
            description: 'Produces goods and products. Manufacturers create the products that are sold through the supply chain.',
            tags: ['Production', 'Quality control', 'Innovation'],
            badge: 'Premium',
            badgeClass: 'premium'
        },
        supplier: {
            title: 'Supplier',
            icon: 'fa-handshake',
            description: 'Provides materials, components, or services to other businesses. Suppliers are critical in the supply chain.',
            tags: ['B2B', 'Materials', 'Services'],
            badge: 'Popular',
            badgeClass: 'popular'
        }
    };

    $('#vendorType').on('change', function () {
        const type = $(this).val();
        const $card = $('#typeInfoCard');
        const $title = $('#infoTypeTitle');
        const $description = $('#infoTypeDescription');
        const $tags = $('#infoTypeTags');

        if (type && vendorTypeInfo[type]) {
            const info = vendorTypeInfo[type];
            $title.text(info.title);
            $description.text(info.description);

            let tagsHtml = '';
            info.tags.forEach(tag => {
                tagsHtml +=
                    `<span class="text-xs text-gray-400"><i class="fas fa-check-circle text-green-500"></i> ${tag}</span>`;
            });
            $tags.html(tagsHtml);

            const $badge = $card.find('.info-tag');
            $badge.text(info.badge);
            $badge.removeClass('popular recommended premium');
            $badge.addClass(info.badgeClass);

            $card.find('.info-icon i').removeClass().addClass(`fas ${info.icon}`);

            $card.removeClass('hidden');
            $card.addClass('visible');
        } else {
            $card.addClass('hidden');
            $card.removeClass('visible');
        }
    });

    function toggleAgreement(el) {
        const checkbox = $(el).find('input[type="checkbox"]');
        checkbox.prop('checked', !checkbox.prop('checked'));
        $(el).toggleClass('checked', checkbox.is(':checked'));
    };

    $('.agreement-item input[type="checkbox"]').on('change', function () {
        $(this).closest('.agreement-item').toggleClass('checked', $(this).is(':checked'));
    });

    $('#vendorRegistrationForm').on('submit', function (e) {
        e.preventDefault();

        if (!validateStep(3)) return;

        const userData = {
            id_no: $('#idNumber').val()?.trim(),
            username: $('#username').val().trim(),
            email: $('#email').val().trim(),
            phone_number: $('#phoneNumber').val().trim(),
            f_name: $('#firstName').val().trim(),
            l_name: $('#lastName').val().trim(),
            password: $('#password').val()
        };

        const businessData = {
            businessName: $('#businessName').val().trim(),
            businessType: $('#vendorType').val(),
            businessCategory: $('#vendorCategory').val() || null,
            businessAddress: $('#businessAddress').val().trim() || null,
            tinNumber: $('#tinNumber').val().trim() || null,
            vatNumber: $('#vatNumber').val().trim() || null,
            taxRegistered: $('#taxRegistered').val().trim() || null,
            taxCountry: $('#taxCountry').val().trim() || null,
            agree_terms: $('#agreeTerms').is(':checked'),
            agree_privacy: $('#agreePrivacy').is(':checked'),
            agree_vendor: $('#agreeVendor').is(':checked')
        };

        const form = new FormData();

        form.append('userData', JSON.stringify(userData));
        form.append('vendorData', JSON.stringify(businessData));

        const profileImageFile = $('#user-profile-image').prop('files')[0];

        if (profileImageFile) {
            form.append('profile_image', profileImageFile);
        }

        const idPhotoFile = $('#id-file-upload').prop('files')[0];
        if (idPhotoFile) {
            form.append('id_copy', idPhotoFile);
        }

        const $submitBtn = $('#submitBtn');

        $submitBtn.prop('disabled', true);

        $submitBtn.html('Submitting...');

        axios.post(`${protocal}api.${domainName}/business/vendor-application`, form)
            .then(function (response) {
                if (response.data.success) {
                    openModal(response.data.referenceNumber, response.data.message);
                } else {
                    Notification.showNotification({
                        type: 'warning',
                        message: response.data.message || 'We received an unexpected behavior while submitting your application, please contact our support team.'
                    });
                }
            })
            .catch(function (error) {
                Notification.showNotification({
                    type: 'error',
                    message: error.response?.data?.message || 'Unable to submit application — Internal Server Error'
                })
                console.error(error.response ? error.response.data : error.message);
            }).finally(() => {
                $submitBtn.prop('disabled', false);
                $submitBtn.html('Submit');
            });

    });

    $('#cancelBtn').on('click', function () {
        showSnackbar({
            type: 'warning',
            message: 'Are you sure you want to cancel? Any unsaved changes will be lost.',
            actionText: 'Continue',
            onAction: () => {
                window.location.href = '/';
            }
        });
    });

    $('.form-input').on('focus input', function () {
        $(this).removeClass('error');
    });

    function showToast(message, type = 'success') {
        const colors = {
            success: 'bg-green-500',
            error: 'bg-red-500',
            warning: 'bg-amber-500',
            info: 'bg-blue-500'
        };
        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };

        const existing = $('.toast-container');
        if (existing.length) existing.remove();

        const container = $('<div>')
            .addClass('toast-container fixed top-4 right-4 z-[10000] bg-white rounded-xl shadow-xl border border-gray-100 p-4 max-w-sm')
            .html(`
                        <div class="flex items-start gap-3">
                            <div class="w-8 h-8 rounded-full ${colors[type]} flex items-center justify-center flex-shrink-0">
                                <i class="fas ${icons[type]} text-white text-sm"></i>
                            </div>
                            <div class="flex-1">
                                <p class="text-sm font-semibold text-gray-900">${type.charAt(0).toUpperCase() + type.slice(1)}</p>
                                <p class="text-xs text-gray-500 mt-0.5">${message}</p>
                            </div>
                            <button onclick="this.closest('.toast-container').remove()" class="text-gray-400 hover:text-gray-600">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    `);

        $('body').append(container);

        setTimeout(() => {
            container.fadeOut(300, function () {
                $(this).remove();
            });
        }, 4000);
    }

    if (hasUser) {
        const user = "<%- JSON.stringify(locals.user) %>";
        if (user.id_no) $('#idNumber').val(user.id_no);
        if (user.f_name) $('#firstName').val(user.f_name);
        if (user.l_name) $('#lastName').val(user.l_name);
        if (user.username) {
            $('#username').val(user.username);
            document.getElementById('username').dataset.manuallyEdited = 'true';
            if (user.username.length >= 3) {
                checkUsernameAvailability(user.username);
            }
        }
        if (user.email) $('#email').val(user.email);
        if (user.phone_number) $('#phoneNumber').val(user.phone_number);

        goToStep(2);
        console.log('👤 User detected — skipping to Business Details step');
    } else {
        goToStep(1);
    }

    if (firstNameInput.value.trim() || lastNameInput.value.trim()) {
        updateUsernameSuggestion();
    }

    $('.aggreement-item').click((e) => {
        toggleAgreement(e.target)
    });

    const modal = document.getElementById('successModal');
    const dashboardLink = document.getElementById('dashboardLink');
    const viewAppBtn = document.getElementById('viewAppBtn');
    const modalRef = document.getElementById('modalRefNumber');
    const modalMessage = document.getElementById('modalMessage');
    const copyBtn = document.getElementById('copyRefBtn');

    function openModal(referenceNumber, message) {
        modalRef.textContent = referenceNumber;
        modalMessage.textContent = message;
        viewAppBtn.href = `${protocal}business.${domainName}/applications/${referenceNumber}`
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeModal(action) {
        modal.classList.remove('active');
        demoCard.classList.remove('blurred');
        document.body.style.overflow = '';
    }

    dashboardLink.addEventListener('click', function (e) {
        e.preventDefault();
        closeModal('dashboard');
    });

    modal.addEventListener('click', function (e) {
        if (e.target === this) {
            const card = this.querySelector('.modal-card');
            card.style.animation = 'shake 0.4s ease';
            setTimeout(() => {
                card.style.animation = '';
            }, 400);

            showToast('Please click "Go to Dashboard" or "View Application" to proceed', 'error');
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

            showToast('Please click an action button to close the modal', 'error');
        }
    });

    const styleSheet = document.createElement('style');
    styleSheet.textContent = `
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    20% { transform: translateX(-12px); }
                    40% { transform: translateX(12px); }
                    60% { transform: translateX(-8px); }
                    80% { transform: translateX(8px); }
                }
            `;
    document.head.appendChild(styleSheet);

    copyBtn.addEventListener('click', async function () {
        const text = modalRef.textContent;

        try {

            await navigator.clipboard.writeText(text);

            showToast('Reference number copied!', 'success');

            this.classList.add('copied');
            const icon = this.querySelector('i');
            const originalClass = icon.className;
            icon.className = 'bi bi-clipboard-check';

            setTimeout(() => {
                this.classList.remove('copied');
                icon.className = originalClass;
            }, 2000);

        } catch (_) {
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.select();
            try {
                document.execCommand('copy');
                showToast('Reference number copied!', 'success');
            } catch (__) {
                showToast('Failed to copy', 'error');
            }
            document.body.removeChild(ta);
        }
    });

    Notification.showNotification({
        type: "warning",
        title: "Privacy & Terms",
        message: `Thank you for visiting. 
        By submitting this business application, 
        you agree to our Business Terms, 
        Privacy Policy, and Standard Pricing. 
        Please review our <a href="/terms" class="font-bold text-brand hover:underline" target="_blank">Terms & Privacy</a> and 
        <a href="/pricing" class="font-bold text-brand hover:underline" target="_blank">Pricing</a> before proceeding.`
    });

});