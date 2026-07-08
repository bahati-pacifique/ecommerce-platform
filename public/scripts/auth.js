const form = document.getElementById('signinForm');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const refererHolder = document.getElementById('referer');
const signinBtn = document.getElementById('signinBtn');
const serverMessage = document.getElementById('serverMessage');
const messageText = document.getElementById('messageText');
const messageCloseBtn = document.querySelector('.server-message .server-message-container .close');


document.addEventListener('DOMContentLoaded', () => {
    messageCloseBtn.addEventListener('click', () => {
        serverMessage.classList.add('hidden');
    });

    if (alertMsg) {
        showMessage(alertMsg, 'error');
    }
})

function showMessage(text, type = 'error', autoClose = false) {

    serverMessage.classList.remove('hidden', 'error', 'success');
    serverMessage.classList.add(type);
    messageText.innerHTML = text;

    if (autoClose) {

        clearTimeout(window.messageTimeout);

        window.messageTimeout = setTimeout(() => {
            serverMessage.classList.add('hidden');
        }, 5000);
    }
}

function clearErrors() {
    emailInput.classList.remove('error');
    passwordInput.classList.remove('error');
}

function setError(input) {
    input.classList.add('error');
    input.focus();
}

form.addEventListener('submit', async function (e) {

    e.preventDefault();

    clearErrors();

    serverMessage.classList.add('hidden');

    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();
    const referer = refererHolder.value.trim();

    // Validation
    if (!email) {
        setError(emailInput);
        showMessage('Please enter your email or username.', 'error');
        return;
    }

    if (!password) {
        setError(passwordInput);
        showMessage('Please enter your password.', 'error');
        return;
    }

    try {

        signinBtn.disabled = true;
        signinBtn.textContent = 'Authenticating...';

        const response = await axios.post('/login', {
            email,
            password,
            referer
        }, { withCredentials: true });

        if (response.data.success && response.data.redirectTo) {
            window.location.href = response.data.redirectTo;
        } else {
            Notification.showNotification({
                type: 'warning',
                message: 'Something went wrong. Please try to log in again'
            })
        }
    } catch (error) {
        console.log(error);
        showMessage(error.response?.data?.message || 'Internal Server Error', 'error');
    } finally {
        signinBtn.disabled = false;
        signinBtn.textContent = 'Sign in';
        passwordInput.value = '';
    }

    return;

    // Simulate API call
    setTimeout(() => {
        // Demo successful login
        if (email.toLowerCase().includes('demo') || email.toLowerCase().includes('admin')) {
            showMessage('✅ Welcome back! Redirecting to dashboard...', 'success');
            setTimeout(() => {
                alert('🚀 You\'ve successfully signed in to the COCOCE Admin Dashboard.\n\n(Full dashboard coming soon!)');
                form.reset();
                signinBtn.disabled = false;
                signinBtn.textContent = 'Sign in';
            }, 1500);
        } else {
            showMessage('❌ Invalid credentials. Please try again.', 'error');
            signinBtn.disabled = false;
            signinBtn.textContent = 'Sign in';
            passwordInput.value = '';
            setError(passwordInput);
        }
    }, 1500);
});

// Forgot password handler
document.getElementById('forgotLink').addEventListener('click', function (e) {
    e.preventDefault();
    showMessage('<strong>Forgot password?</strong> Please contact our support team', 'warning');
});

// SSO button handler
document.getElementById('ssoBtn').addEventListener('click', function () {
    Notification.showNotification({
        type: 'warning',
        message: 'Sorry, This method is currently not available',
    });
});

// Clear error on focus
emailInput.addEventListener('focus', function () {
    this.classList.remove('error');
});
passwordInput.addEventListener('focus', function () {
    this.classList.remove('error');
});