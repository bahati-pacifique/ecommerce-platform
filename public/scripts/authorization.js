let accounts = userAccounts;

// State
let currentSlide = 0;
let selectedAccountId = null;
let cardsPerView = getCardsPerView();

// DOM elements
const slider = document.getElementById('cardSlider');
const dotsContainer = document.getElementById('dotsContainer');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const continueBtn = document.getElementById('continueBtn');
const selectionHint = document.getElementById('selectionHint');

// Get cards per view based on screen size
function getCardsPerView() {
    if (window.innerWidth >= 1024) return 3;
    if (window.innerWidth >= 768) return 2;
    return 1;
}

function renderCards() {
    slider.innerHTML = accounts.map(account => `
        <div class="account-card" data-id="${account.id}">
          <div class="account-card-inner ${selectedAccountId === account.id ? 'selected' : ''}">
            <div class="flex items-start justify-between mb-3">
              <div>
                <h3 class="text-lg font-bold text-gray-900">${account.type}</h3>
                <span class="type-badge ${account.code} capitalize">${account.code}</span>
              </div>
              <div class="text-xs text-gray-400 font-mono bg-gray-50 px-2 py-1 rounded flex-shrink-0 ml-2 uppercase">
                ${account.id.length > 12 ? account.id.slice(0, 8) + '···' + account.id.slice(-4) : account.id}
              </div>
            </div>
            <p class="text-sm text-gray-600 leading-relaxed flex-1">${account.description}</p>
            <div class="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
              <span class="flex items-center gap-2 text-xs text-gray-400">
                 Click to select <i class="bi bi-hand-index rotate-45 text-gray-700 font-semibold"></i> 
              </span>
              ${selectedAccountId === account.id ? '<span class="text-brand text-sm font-semibold">✓ Selected</span>' : ''}
            </div>
          </div>
        </div>
      `).join('');

    document.querySelectorAll('.account-card').forEach(card => {
        card.addEventListener('click', function () {
            const id = this.dataset.id;
            selectAccount(id);
        });
    });

    updateSlider();
}

function selectAccount(id) {
    selectedAccountId = id;

    document.querySelectorAll('.account-card-inner').forEach(card => {
        card.classList.remove('selected');
        const cardId = card.closest('.account-card').dataset.id;
        if (cardId === id) {
            card.classList.add('selected');
        }
    });

    continueBtn.disabled = false;
    selectionHint.textContent = `Selected: ${accounts.find(a => a.id === id).title}`;
    selectionHint.className = 'text-xs mt-3';
}

function updateSlider() {
    const totalSlides = Math.ceil(accounts.length / cardsPerView);
    const maxSlide = Math.max(0, totalSlides - 1);

    if (currentSlide > maxSlide) currentSlide = maxSlide;
    if (currentSlide < 0) currentSlide = 0;

    const slideWidth = 100 / cardsPerView;
    const offset = currentSlide * (slideWidth * cardsPerView);
    slider.style.transform = `translateX(-${offset}%)`;

    prevBtn.disabled = currentSlide === 0;
    nextBtn.disabled = currentSlide >= maxSlide;

    if (window.innerWidth < 768) {
        prevBtn.classList.add('hidden');
        nextBtn.classList.add('hidden');
    } else {
        prevBtn.classList.remove('hidden');
        nextBtn.classList.remove('hidden');
    }

    updateDots(totalSlides);
}

function updateDots(totalSlides) {
    dotsContainer.innerHTML = '';
    for (let i = 0; i < totalSlides; i++) {
        const dot = document.createElement('button');
        dot.className = `dot ${i === currentSlide ? 'active' : ''}`;
        dot.setAttribute('data-index', i);
        dot.addEventListener('click', () => {
            currentSlide = i;
            updateSlider();
        });
        dotsContainer.appendChild(dot);
    }
}

prevBtn.addEventListener('click', () => {
    if (currentSlide > 0) {
        currentSlide--;
        updateSlider();
    }
});

nextBtn.addEventListener('click', () => {
    const totalSlides = Math.ceil(accounts.length / cardsPerView);
    if (currentSlide < totalSlides - 1) {
        currentSlide++;
        updateSlider();
    }
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') {
        prevBtn.click();
    } else if (e.key === 'ArrowRight') {
        nextBtn.click();
    } else if (e.key === 'Enter' && !continueBtn.disabled) {
        continueBtn.click();
    }
});

let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        const newCardsPerView = getCardsPerView();
        if (newCardsPerView !== cardsPerView) {
            cardsPerView = newCardsPerView;
            renderCards();
        } else {
            updateSlider();
        }
    }, 200);
});

let touchStartX = 0;
let touchEndX = 0;

slider.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
}, {
    passive: true
});

slider.addEventListener('touchend', (e) => {
    touchEndX = e.changedTouches[0].screenX;
    const diff = touchStartX - touchEndX;
    if (Math.abs(diff) > 50) {
        if (diff > 0) {
            nextBtn.click();
        } else {
            prevBtn.click();
        }
    }
}, {
    passive: true
});

async function handleContinue() {

    if (!selectedAccountId) return;

    const accountSelected = accounts.filter(account => account.id === selectedAccountId)[0];

    if (!accountSelected) {
        Notification.showNotification({
            type: 'error',
            message: 'Something went wrong. Please select account to continue'
        });
        return;
    }
    try {
        continueBtn.disabled = true;
        continueBtn.innerHTML = 'Authenticating... <i class="fas fa-spinner fa-spin"></i>';

        const response = await axios.post('/authenticate', {
            accountId: accountSelected.id,
            title: accountSelected.type
        }, {
            withCredentials: true
        });

        if (response.data?.success && response.data?.authenticated) {
            window.location.href = (response.data?.redirectTo && !response.data.redirectTo.includes('/accounts')) ? response.data?.redirectTo : '/console';
        } else {
            window.location.href = '/';
        }
    } catch (error) {
        console.log(error);
        if (error.status === 401) {
            console.log(error.response?.data?.redirectTo)
            return window.location.href = error.response?.data?.redirectTo || '/';
        }
        //window.location.href = '/';
        Notification.showNotification({
            type: 'error',
            title: '',
            message: error.response?.data?.message || 'Internal server error'
        });
    } finally {
        continueBtn.innerHTML = `<span class="flex items-center gap-3">
                                      Continue <i class="bi bi-arrow-right"></i>
                                    </span>`;
        continueBtn.disabled = !selectedAccountId;
    }
}

$(document).ready(() => {
    // Initialize
    renderCards();
    continueBtn.addEventListener('click', handleContinue);
});