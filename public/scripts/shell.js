// ─────────────────────────────────────────────────────────────
// Toast
// ─────────────────────────────────────────────────────────────
export function toast(message, type = 'info', timeout = 2200) {
    const host = document.getElementById('toast');
    if (!host) return;
    const tones = {
        info: 'bg-slate-900 text-white',
        success: 'bg-emerald-600 text-white',
        error: 'bg-rose-600 text-white',
    };
    host.className = `fixed bottom-5 right-5 z-[80] rounded-lg px-4 py-3 text-sm font-medium shadow-xl ${tones[type] || tones.info}`;
    host.textContent = message;
    host.classList.remove('hidden');
    clearTimeout(window.__toastTimer);
    window.__toastTimer = setTimeout(() => host.classList.add('hidden'), timeout);
}

// ─────────────────────────────────────────────────────────────
// Sidebar (desktop collapse + mobile drawer)
// ─────────────────────────────────────────────────────────────
function toggleDesktopSidebar() {
    const sidebar = document.getElementById('sidebar');
    const button = document.getElementById('sidebarToggleButton');
    const collapsed = sidebar.classList.toggle('sidebar-collapsed');
    document.documentElement.style.setProperty('--sidebar-width', collapsed ? '76px' : '288px');

    button?.setAttribute('aria-expanded', String(!collapsed));
    const icon = button?.querySelector('[data-lucide]');
    if (icon) {
        icon.setAttribute('data-lucide', collapsed ? 'panel-left-open' : 'panel-left-close');
        window.lucide?.createIcons();
    }
}

function openMobileSidebar() {
    document.getElementById('sidebar')?.classList.remove('-translate-x-full');
    document.getElementById('sidebar')?.classList.add('translate-x-0');
    document.getElementById('sidebarBackdrop')?.classList.remove('hidden');
    document.body.classList.add('overflow-hidden');
}

function closeMobileSidebar() {
    if (!window.matchMedia('(max-width: 1023px)').matches) return;
    document.getElementById('sidebar')?.classList.add('-translate-x-full');
    document.getElementById('sidebar')?.classList.remove('translate-x-0');
    document.getElementById('sidebarBackdrop')?.classList.add('hidden');
    document.body.classList.remove('overflow-hidden');
}

// ─────────────────────────────────────────────────────────────
// Store switcher
// ─────────────────────────────────────────────────────────────
function toggleStoreMenu() {
    document.getElementById('storeMenu')?.classList.toggle('hidden');
}

// ─────────────────────────────────────────────────────────────
// Profile menus
// ─────────────────────────────────────────────────────────────
function closeProfileMenus() {
    document.querySelectorAll('.profile-menu').forEach(m => {
        m.classList.remove('open'); m.classList.add('closed');
    });
    document.querySelectorAll('#headerProfileButton, #sidebarProfileButton').forEach(b => {
        b.setAttribute('aria-expanded', 'false');
    });
}

function toggleProfileMenu(menuId, buttonId) {
    const menu = document.getElementById(menuId);
    const button = document.getElementById(buttonId);
    if (!menu || !button) return;
    const willOpen = !menu.classList.contains('open');
    closeProfileMenus();
    if (willOpen) {
        menu.classList.remove('closed'); menu.classList.add('open');
        button.setAttribute('aria-expanded', 'true');
    }
}

// ─────────────────────────────────────────────────────────────
// Order drawer
// ─────────────────────────────────────────────────────────────
export function openOrderDrawer(order = {}) {
    const overlay = document.getElementById('drawerOverlay');
    const drawer = document.getElementById('orderDrawer');
    const title = document.getElementById('drawerOrderId');
    const content = document.getElementById('drawerContent');
    if (!drawer) return;

    title.textContent = order.id ? `#${order.id}` : '#ORD-10245';
    content.innerHTML = `
    <div class="grid grid-cols-2 gap-3">
      <div class="rounded-xl bg-slate-50 p-4"><div class="text-xs text-slate-500">Customer</div><div class="mt-1 font-semibold">${order.customer || 'Jean M.'}</div></div>
      <div class="rounded-xl bg-slate-50 p-4"><div class="text-xs text-slate-500">Payment</div><div class="mt-1 font-semibold text-emerald-600">Paid</div></div>
      <div class="rounded-xl bg-slate-50 p-4"><div class="text-xs text-slate-500">Shipping</div><div class="mt-1 font-semibold text-amber-600">${order.status || 'To Ship'}</div></div>
      <div class="rounded-xl bg-slate-50 p-4"><div class="text-xs text-slate-500">Placed</div><div class="mt-1 font-semibold">Today, 09:42</div></div>
    </div>
  `;
    overlay?.classList.remove('hidden');
    drawer.classList.remove('hidden');
    document.body.classList.add('overflow-hidden');
    window.lucide?.createIcons();
}

export function closeOrderDrawer() {
    document.getElementById('drawerOverlay')?.classList.add('hidden');
    document.getElementById('orderDrawer')?.classList.add('hidden');
    document.body.classList.remove('overflow-hidden');
}

// ─────────────────────────────────────────────────────────────
// Event binding
// ─────────────────────────────────────────────────────────────
function bindShellEvents() {
    // Sidebar
    document.getElementById('sidebarToggleButton')?.addEventListener('click', toggleDesktopSidebar);
    document.getElementById('mobileMenuButton')?.addEventListener('click', openMobileSidebar);
    document.getElementById('sidebarBackdrop')?.addEventListener('click', closeMobileSidebar);
    document.getElementById('storeSwitcherButton')?.addEventListener('click', toggleStoreMenu);

    // Profile menus
    document.getElementById('headerProfileButton')?.addEventListener('click', e => {
        e.stopPropagation();
        toggleProfileMenu('headerProfileMenu', 'headerProfileButton');
    });
    document.getElementById('sidebarProfileButton')?.addEventListener('click', e => {
        e.stopPropagation();
        toggleProfileMenu('sidebarProfileMenu', 'sidebarProfileButton');
    });
    document.addEventListener('click', e => {
        if (!e.target.closest('#headerProfileButton, #headerProfileMenu, #sidebarProfileButton, #sidebarProfileMenu')) {
            closeProfileMenus();
        }
    });

    // Profile actions
    document.querySelectorAll('[data-profile-action]').forEach(btn => {
        btn.addEventListener('click', () => {
            const action = btn.dataset.profileAction;
            toast(action === 'sign-out' ? 'Sign out selected' : 'Opening Business Dashboard');
            closeProfileMenus();
        });
    });

    // Drawer close
    document.getElementById('closeOrderButton')?.addEventListener('click', closeOrderDrawer);
    document.getElementById('drawerOverlay')?.addEventListener('click', closeOrderDrawer);

    // Drawer actions
    document.getElementById('markReadyButton')?.addEventListener('click', () => {
        toast('Order marked ready to ship', 'success');
    });
    document.getElementById('orderMoreButton')?.addEventListener('click', () => {
        toast('Order actions opened');
    });

    // Delegated: any [data-action="open-order"]
    document.addEventListener('click', e => {
        const trigger = e.target.closest('[data-action="open-order"]');
        if (trigger) openOrderDrawer({ id: trigger.dataset.orderId });
    });

    // Handle resize → reset mobile drawer state
    window.addEventListener('resize', () => {
        if (window.matchMedia('(min-width: 1024px)').matches) {
            document.getElementById('sidebar')?.classList.remove('-translate-x-full', 'translate-x-0');
            document.getElementById('sidebarBackdrop')?.classList.add('hidden');
            document.body.classList.remove('overflow-hidden');
            const sidebar = document.getElementById('sidebar');
            document.documentElement.style.setProperty(
                '--sidebar-width',
                sidebar?.classList.contains('sidebar-collapsed') ? '76px' : '288px'
            );
        }
    });
}

// ─────────────────────────────────────────────────────────────
// Bootstrap
// ─────────────────────────────────────────────────────────────
function init() {
    bindShellEvents();
    window.lucide?.createIcons();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// Expose for page scripts
window.__shell = { toast, openOrderDrawer, closeOrderDrawer };