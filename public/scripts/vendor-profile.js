class ProfileManager {
    constructor() {
        this.avatarFile = null;
        this.initialData = {};
        this.form = document.getElementById('profileForm');
        this.uploadBtn = document.getElementById('uploadProfileImgBtn');
        this.avatarInput = document.getElementById('avatarInput');
        this.avatarUpload = document.getElementById('avatarUpload');
        this.profileAvatar = document.getElementById('profileAvatar');
        this.removeAvatarBtn = document.getElementById('removeAvatarBtn');
        this.avatarProgressBar = document.getElementById('avatarProgressBar');
        this.avatarUploadStatus = document.getElementById('avatarUploadStatus');
        this.avatarUploadProgress = document.getElementById('avatarUploadProgress');
        this.file = null;
        this.init();

        this.initProfileData = {
            businessAddress: document.getElementById('vendorBusinessAddress').value.trim(),
            tinNumber: document.getElementById('vendorTin').value.trim(),
            vatNumber: document.getElementById('vendorVatNumber').value.trim(),
            taxCountry: document.getElementById('vendorTaxCountry').value.trim(),
            type: document.getElementById('vendorType').value.trim(),
            taxRegistered: document.getElementById('vendorTaxRegistered').value.trim()
        }
    }

    async init() {
        this.captureInitialData();
        this.setupEventListeners();
        this.setupAvatarUpload();
        this.setupResetButton();

        const vendorProfileImg = await checkFile(`https://cdn.cococe.rw/images/profiles/${i}.jpg`);

        if (vendorProfileImg) {
            this.removeAvatarBtn.classList.remove('hidden');
        } else {
            this.removeAvatarBtn.classList.add('hidden');
        }

    }

    // Capture initial form data for reset
    captureInitialData() {
        const formData = new FormData(this.form);
        for (let [key, value] of formData.entries()) {
            this.initialData[key] = value;
        }
        // Store avatar URL
        this.initialData.avatar = this.profileAvatar.src;
    }

    setupEventListeners() {
        // Form submit
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));

        // Input change tracking for dirty state
        this.form.querySelectorAll('input, select').forEach(input => {
            input.addEventListener('change', () => this.checkDirtyState());
            input.addEventListener('input', () => this.checkDirtyState());
        });

    }

    setupAvatarUpload() {
        // Trigger file input on avatar click
        this.avatarUpload.addEventListener('click', () => {
            this.avatarInput.click();
        });

        // Handle file selection
        this.avatarInput.addEventListener('change', (e) => {
            this.file = e.target.files[0];
            if (this.file) {
                this.readSelectedAvatar();
                this.uploadBtn.classList.remove('hidden');
            }
        });

        // Remove avatar
        this.removeAvatarBtn.addEventListener('click', () => {
            this.removeAvatar();
        });

        // Drag and drop support
        this.avatarUpload.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.avatarUpload.classList.add('border-brand');
        });

        this.avatarUpload.addEventListener('dragleave', () => {
            this.avatarUpload.classList.remove('border-brand');
        });

        this.avatarUpload.addEventListener('drop', (e) => {
            e.preventDefault();
            this.avatarUpload.classList.remove('border-brand');
            this.file = e.dataTransfer.files[0];

            if (this.file && this.file.type.startsWith('image/')) {
                this.readSelectedAvatar();
                this.uploadBtn.classList.remove('hidden');
            } else {
                Notification.showNotification({
                    type: 'error',
                    message: 'Please drop an image file'
                });
            }
        });

        this.uploadBtn.addEventListener('click', (e) => {
            this.uploadProfileAvatar();
        })
    }

    async uploadProfileAvatar() {
        // Show progress
        this.avatarUploadProgress.classList.remove('hidden');
        this.avatarProgressBar.style.width = '0%';
        this.avatarUploadStatus.textContent = 'Uploading...';

        try {
            const formData = new FormData();
            formData.append('avatar', this.file);
            formData.append('userId', document.getElementById('userId').value);

            const response = await axios.post(
                `${protocal}api.${domainName}/users/profile/profile-upload`,
                formData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data'
                    },
                    onUploadProgress: (progressEvent) => {
                        const percentCompleted = Math.round(
                            (progressEvent.loaded * 100) / progressEvent.total
                        );
                        this.avatarProgressBar.style.width = percentCompleted + '%';
                        this.avatarUploadStatus.textContent = `Uploading... ${percentCompleted}%`;
                    },
                    withCredentials: true
                }
            );

            if (response.data.success) {
                this.avatarUploadStatus.textContent = 'Upload complete!';
                this.avatarUploadStatus.className = 'text-xs text-green-600 text-center mt-1';

                Notification.showNotification({
                    type: 'success',
                    message: 'Avatar uploaded successfully'
                });

                setTimeout(() => {
                    this.avatarUploadProgress.classList.add('hidden');
                }, 2000);
            }
        } catch (error) {
            console.error('Avatar upload error:', error);
            this.avatarUploadStatus.textContent = 'Upload failed';
            this.avatarUploadStatus.className = 'text-xs text-red-600 text-center mt-1';

            Notification.showNotification({
                type: 'error',
                message: error.response?.data?.message || 'Failed to upload avatar'
            });
        }
    }
    async readSelectedAvatar() {
        // Validate file
        if (!this.validateAvatarFile(this.file)) return;

        this.avatarFile = this.file;

        // Show preview
        const reader = new FileReader();
        reader.onload = (e) => {
            this.profileAvatar.src = e.target.result;
        };
        reader.readAsDataURL(this.file);
    }

    async removeAvatar() {
        showSnackbar({
            type: 'warning',
            message: 'Are sure you want to remove your profile image?',
            actionText: 'Remove',
            onAction: async () => {
                try {
                    this.removeAvatarBtn.disabled = true;

                    const response = await axios.delete(
                        `${protocal}api.${domainName}/users/profile/profile-avatar`,
                        { withCredentials: true }
                    );

                    this.profileAvatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(u)}&background=ED1B24&color=fff&size=128`;
                    this.removeAvatarBtn.classList.add('hidden');
                    this.avatarFile = null;
                    showSnackbar({ type: 'success', message: response.data.message || 'Profile image removed' });
                } catch (error) {
                    console.log(error);
                    Notification.showNotification({
                        type: 'error',
                        message: error.response?.data?.message || 'Internal Server Error'
                    })
                } finally {
                    this.removeAvatarBtn.disabled = false;
                }
            }
        });
    }

    validateAvatarFile(file) {
        const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        const maxSize = 5 * 1024 * 1024; // 5MB

        if (!validTypes.includes(file.type)) {
            Notification.showNotification({
                type: 'error',
                message: 'Please upload a valid image (JPEG, PNG, GIF, WEBP)'
            });
            return false;
        }

        if (file.size > maxSize) {
            Notification.showNotification({
                type: 'error',
                message: 'Image size must be less than 5MB'
            });
            return false;
        }

        return true;
    }

    setupResetButton() {
        document.getElementById('resetProfileBtn').addEventListener('click', () => {
            this.resetForm();
        });
    }

    resetForm() {
        // Reset all form fields to initial values
        const formData = new FormData(this.form);

        for (let [key, value] of Object.entries(this.initialData)) {
            const input = this.form.querySelector(`[name="${key}"]`);
            if (input) {
                input.value = value;
            }
        }

        // Reset avatar
        if (this.initialData.avatar) {
            this.profileAvatar.src = this.initialData.avatar;
        }

        this.checkDirtyState();
    }

    async handleSubmit(e) {
        e.preventDefault();
        const submitBtn = document.getElementById('saveProfileBtn');
        const submitText = document.getElementById('saveProfileText');
        const submitLoader = document.getElementById('saveProfileLoader');
        const messageEl = document.getElementById('saveProfileMessage');

        // Show loading state
        submitBtn.disabled = true;
        submitText.classList.add('hidden');
        submitLoader.classList.remove('hidden');
        messageEl.className = 'text-sm hidden';

        const updates = this.getFormData();

        const payload = getChangedAttributes(this.initProfileData, updates);


        try {

            const response = await axios.put(
                `${protocal}api.${domainName}/business/profile/`,
                payload,
                { withCredentials: true }
            );

            if (response.data) {

                this.captureInitialData();
                this.checkDirtyState();

                Notification.showNotification({
                    type: 'success',
                    message: 'Profile updated successfully'
                });

                this.resetForm();
            }
        } catch (error) {
            console.error('Profile update error:', error);
            Notification.showNotification({
                type: 'error',
                message: error.response?.data?.message || 'Failed to update profile'
            });
        } finally {
            // Reset button state
            submitBtn.disabled = false;
            submitText.classList.remove('hidden');
            submitLoader.classList.add('hidden');
        }
    }

    getFormData() {
        const data = {
            tinNumber: document.getElementById('vendorTin').value.trim(),
            vatNumber: document.getElementById('vendorVatNumber').value.trim(),
            taxCountry: document.getElementById('vendorTaxCountry').value.trim(),
            type: document.getElementById('vendorType').value,
            taxRegistered: document.getElementById('vendorTaxRegistered').value,
            businessAddress: document.getElementById('vendorBusinessAddress').value.trim(),
        }

        return data;
    }

    isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    checkDirtyState() {
        const formData = this.getFormData();
        const isDirty = JSON.stringify(formData) !== JSON.stringify(this.initialData);
        const submitBtn = document.getElementById('saveProfileBtn');
        submitBtn.disabled = !isDirty;
    }

    updateSidebarInfo(user) {
        // Update sidebar user info
        const usernameEl = document.querySelector('.user-info .text-sm');
        const emailEl = document.querySelector('.user-info .text-xs');
        const avatarEl = document.querySelector('.sidebar-footer .w-8.h-8');

        if (usernameEl) usernameEl.textContent = user.username || '';
        if (emailEl) emailEl.textContent = user.email || '';

        // Update avatar initials
        if (avatarEl) {
            const initials = this.getInitials(user.username || '');
            avatarEl.textContent = initials;
        }
    }

    getInitials(name) {
        if (!name) return '';
        const words = name.split(' ');
        if (words.length === 1) return name.substring(0, 2).toUpperCase();
        return (words[0][0] + words[words.length - 1][0]).toUpperCase();
    }

}