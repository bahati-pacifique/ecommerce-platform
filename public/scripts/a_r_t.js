(function () {
    const links = Array.from(document.querySelectorAll('.toc-link'));
    const targets = links
        .map(a => document.getElementById(a.getAttribute('href').slice(1)))
        .filter(Boolean);

    if (!targets.length) return;

    const io = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            const id = entry.target.id;
            links.forEach(a => {
                a.classList.toggle('active', a.getAttribute('href') === `#${id}`);
            });
        });
    }, {
        rootMargin: '-88px 0px -60% 0px',
        threshold: 0
    });

    targets.forEach(t => io.observe(t));
})();