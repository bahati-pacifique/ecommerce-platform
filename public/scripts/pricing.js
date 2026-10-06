document.addEventListener('DOMContentLoaded', function () {

    const faqQuestions = document.querySelectorAll('.faq-item .question');

    faqQuestions.forEach(question => {
        const targetId = question.dataset.target;
        const answer = document.getElementById(targetId);
        const icon = question.querySelector('.icon i');

        if (answer) {
            answer.classList.remove('open');
            if (icon) {
                icon.className = 'fas fa-chevron-down';
            }
        }

        question.addEventListener('click', function () {
            const targetId = this.dataset.target;
            const answer = document.getElementById(targetId);
            const icon = this.querySelector('.icon i');

            if (answer) {
                answer.classList.toggle('open');
                if (icon) {
                    icon.classList.toggle('rotated');
                }
            }
        });
    });

    const urlParams = new URLSearchParams(window.location.search);
    const type = urlParams.get('type');
    if (type) {
        const cards = document.querySelectorAll('.pricing-card');
        cards.forEach(card => {
            const badge = card.querySelector('.badge');
            if (badge && badge.textContent.toLowerCase() === type.toLowerCase()) {
                card.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center'
                });
                card.style.borderColor = '#ED1B24';
                card.style.boxShadow = '0 8px 40px rgba(237, 27, 36, 0.15)';
                setTimeout(() => {
                    card.style.transition = 'all 0.5s ease';
                }, 100);
            }
        });
    }

});