document.addEventListener('DOMContentLoaded', () => {
    const button = document.getElementById('quickActionsButton');
    const menu = document.getElementById('quickActionsMenu');
    const backdrop = document.getElementById('quickActionsBackdrop');
    const close = document.getElementById('quickActionsClose');

    function open() {
        menu.classList.remove('hidden');
        button?.setAttribute('aria-expanded', 'true');
        document.body.style.overflow = 'hidden';
    }

    function closeMenu() {
        menu.classList.add('hidden');
        button?.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
    }

    button?.addEventListener('click', open);
    backdrop?.addEventListener('click', closeMenu);
    close?.addEventListener('click', closeMenu);

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeMenu();
    });

    if (welcomeAlert) {

        if (!window.Notification) return;
        Notification.showNotification({
            type: 'warning',
            message: welcomeAlert
        })
    }

    window.lucide?.createIcons();
});