(function () {
    const slides = window.__HERO_SLIDES__ || [];
    if (!slides.length) return;

    const $slider = $('#hero-slider');
    const $dots = $('#hero-dots');
    let current = 0;
    let timer;

    slides.forEach((_, i) => {
        $dots.append(
            `<button class="hero-dot h-2 w-2 rounded-full bg-white/40 transition-all duration-200" data-index="${i}" role="tab" aria-label="Slide ${i + 1}"></button>`
        );
    });

    function render(i) {
        const s = slides[i];
        $slider.fadeOut(200, function () {
            $(this).html(`
        <div class="hero-slide rounded-2xl bg-white/10 p-4 shadow-2xl ring-1 ring-white/20 backdrop-blur">
          <img src="${s.image}" alt="${s.title}" class="aspect-[4/3] w-full rounded-xl object-cover" loading="lazy">
          <div class="mt-4">
            <h3 class="text-lg font-bold text-white">${s.title}</h3>
            <p class="mt-1 text-sm text-white/80">${s.description}</p>
            <p class="mt-2 text-base font-semibold text-white">${s.price}</p>
          </div>
        </div>
      `).fadeIn(200);
        });

        $('#hero-badge-text').text(s.badge);
        $('.hero-dot').removeClass('active').eq(i).addClass('active');
    }

    function next() { current = (current + 1) % slides.length; render(current); }
    function prev() { current = (current - 1 + slides.length) % slides.length; render(current); }
    function start() { clearInterval(timer); timer = setInterval(next, 5000); }

    render(0);
    start();

    $('#hero-next').on('click', () => { next(); start(); });
    $('#hero-prev').on('click', () => { prev(); start(); });
    $dots.on('click', '.hero-dot', function () {
        current = parseInt($(this).data('index'), 10);
        render(current);
        start();
    });
    $slider.on('mouseenter', () => clearInterval(timer));
    $slider.on('mouseleave', start);
})();