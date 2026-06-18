const launchDate = new Date(2026, 6, 15, 0, 0, 0).getTime(); // month 5 = June, day 20

function updateCountdown() {
    const now = new Date().getTime();
    const distance = launchDate - now;

    if (distance < 0) {
        document.getElementById('days').innerText = '00';
        document.getElementById('hours').innerText = '00';
        document.getElementById('minutes').innerText = '00';
        document.getElementById('seconds').innerText = '00';
        const countdownContainer = document.querySelector('.countdown-digit').parentElement.parentElement;
        if (countdownContainer && !document.querySelector('.launch-message')) {
            const msg = document.createElement('div');
            msg.className = 'text-brand font-bold text-lg mt-4 animate-pulse launch-message';
            msg.innerText = 'COCOCE is LIVE! Experience the future of digital electronics.';
            countdownContainer.parentElement.appendChild(msg);
        }
        return;
    }

    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor((distance % (86400000)) / (3600000));
    const minutes = Math.floor((distance % 3600000) / 60000);
    const seconds = Math.floor((distance % 60000) / 1000);

    document.getElementById('days').innerText = days < 10 ? '0' + days : days;
    document.getElementById('hours').innerText = hours < 10 ? '0' + hours : hours;
    document.getElementById('minutes').innerText = minutes < 10 ? '0' + minutes : minutes;
    document.getElementById('seconds').innerText = seconds < 10 ? '0' + seconds : seconds;
}

updateCountdown();
setInterval(updateCountdown, 1000);

const footerForm = document.getElementById('footerNotify');

function handleEmailSubmit(emailInput, event) {
    event.preventDefault();
    const email = emailInput.value.trim();
    if (email && email.includes('@') && email.includes('.')) {
        alert(`🎉 Thanks! ${email} is now on the COCOCE early access list. We'll notify you right at launch with exclusive 15% off.`);
        emailInput.value = '';
    } else {
        alert('Please enter a valid email address to get notified.');
    }
}

if (footerForm) {
    const footerEmailField = document.getElementById('footerEmail');
    footerForm.addEventListener('submit', (e) => handleEmailSubmit(footerEmailField, e));
}

const digits = document.querySelectorAll('.countdown-digit');
digits.forEach(d => {
    d.addEventListener('mouseenter', () => {
        d.style.borderColor = '#ED1B24';
        d.style.transition = '0.2s';
    });
    d.addEventListener('mouseleave', () => {
        d.style.borderColor = '#e5e7eb';
    });
});