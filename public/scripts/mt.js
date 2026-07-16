
let currentSlide = 0;
const slides = document.querySelectorAll('.slide');
const dotsContainer = document.getElementById('dotsContainer');
const totalSlides = slides.length;

slides.forEach((_, index) => {
    const dot = document.createElement('div');
    dot.className = `dot ${index === 0 ? 'active' : ''}`;
    dot.setAttribute('data-index', index);
    dot.addEventListener('click', () => goToSlide(index));
    dotsContainer.appendChild(dot);
});

const dots = document.querySelectorAll('.dot');

function goToSlide(index) {
    const videos = document.querySelectorAll('.slide.video-slide video');
    videos.forEach(video => {
        video.pause();
        video.currentTime = 0;
    });
    const playBtn = document.getElementById('videoPlayBtn');
    if (playBtn) {
        playBtn.innerHTML = '<i class="fas fa-play"></i>';
    }

    slides.forEach(slide => slide.classList.remove('active'));
    dots.forEach(dot => dot.classList.remove('active'));

    slides[index].classList.add('active');
    dots[index].classList.add('active');
    currentSlide = index;
}

function nextSlide() {
    const next = (currentSlide + 1) % totalSlides;
    goToSlide(next);
}

function prevSlide() {
    const prev = (currentSlide - 1 + totalSlides) % totalSlides;
    goToSlide(prev);
}

document.getElementById('nextSlide').addEventListener('click', nextSlide);
document.getElementById('prevSlide').addEventListener('click', prevSlide);

let slideInterval = setInterval(nextSlide, 5000);

const slideshowContainer = document.getElementById('slideshowContainer');
slideshowContainer.addEventListener('mouseenter', () => {
    clearInterval(slideInterval);
});

slideshowContainer.addEventListener('mouseleave', () => {
    slideInterval = setInterval(nextSlide, 5000);
});

const video = document.getElementById('promoVideo');
const playBtn = document.getElementById('videoPlayBtn');

if (video && playBtn) {
    video.play().catch(() => {
        playBtn.style.display = 'flex';
    });

    playBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        if (video.paused) {
            video.play();
            this.innerHTML = '<i class="fas fa-pause"></i>';
        } else {
            video.pause();
            this.innerHTML = '<i class="fas fa-play"></i>';
        }
    });

    video.addEventListener('pause', function () {
        playBtn.innerHTML = '<i class="fas fa-play"></i>';
    });

    video.addEventListener('play', function () {
        playBtn.innerHTML = '<i class="fas fa-pause"></i>';
    });

    const videoSlide = document.querySelector('.slide.video-slide');
    if (videoSlide) {
        const observer = new MutationObserver(function (mutations) {
            mutations.forEach(function (mutation) {
                if (mutation.target.classList.contains('active')) {
                    if (video.paused) {
                        video.play().catch(() => { });
                    }
                } else {
                    video.pause();
                    playBtn.innerHTML = '<i class="fas fa-play"></i>';
                }
            });
        });
        observer.observe(videoSlide, { attributes: true, attributeFilter: ['class'] });
    }
}

document.querySelectorAll('.footer a').forEach(link => {
    link.addEventListener('click', function (e) {
        e.preventDefault();
        const text = this.textContent.trim();
        if (text.includes('Shop')) {
            showNotification('📍 Makuza Peace Plaza, Ground Floor, Shop #101');
        } else if (text.includes('+250')) {
            showNotification('📞 Call us: +250 788 123 456');
        } else if (text.includes('support@')) {
            showNotification('📧 Email: support@cococe.com');
        }
    });
});

function showNotification(message) {
    const existing = document.querySelector('.notification-toast');
    if (existing) existing.remove();

    const notification = document.createElement('div');
    notification.className = 'notification-toast';
    notification.innerHTML = message;
    notification.style.cssText = `
        position: fixed;
        bottom: 30px;
        left: 50%;
        transform: translateX(-50%);
        background: var(--dark);
        color: white;
        padding: 12px 24px;
        border-radius: 8px;
        box-shadow: 0 8px 30px rgba(0,0,0,0.2);
        z-index: 9999;
        font-weight: 500;
        font-size: 0.95rem;
        animation: slideUp 0.3s ease-out;
        border-left: 4px solid var(--color-brand);
        max-width: 90%;
        text-align: center;
      `;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(-50%) translateY(-20px)';
        notification.style.transition = 'all 0.3s ease-in';
        setTimeout(() => notification.remove(), 300);
    }, 3500);
}