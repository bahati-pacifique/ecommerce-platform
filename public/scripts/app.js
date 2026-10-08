// Shell interactivity — runs on every page
function initShell() {
    // Sidebar toggle (mobile)
    document.getElementById('mobileMenuButton')?.addEventListener('click', () => {
        document.getElementById('sidebar')?.classList.remove('-translate-x-full');
        document.getElementById('sidebarBackdrop')?.classList.remove('hidden');
    });
    document.getElementById('sidebarBackdrop')?.addEventListener('click', () => {
        document.getElementById('sidebar')?.classList.add('-translate-x-full');
        document.getElementById('sidebarBackdrop')?.classList.add('hidden');
    });

    // Profile menu
    document.getElementById('sidebarProfileButton')?.addEventListener('click', (e) => {
        e.stopPropagation();
        document.getElementById('sidebarProfileMenu')?.classList.toggle('hidden');
    });
    document.addEventListener('click', (e) => {
        if (!e.target.closest('#sidebarProfileButton, #sidebarProfileMenu')) {
            document.getElementById('sidebarProfileMenu')?.classList.add('hidden');
        }
    });

    // Drawer close
    document.getElementById('closeOrderButton')?.addEventListener('click', closeDrawer);
    document.getElementById('drawerOverlay')?.addEventListener('click', closeDrawer);

    // Sign out
    document.querySelector('[data-action="sign-out"]')?.addEventListener('click', () => {
        toast('Sign out selected', 'info');
    });

    // Icons
    window.lucide?.createIcons();
}

function openDrawer(order) {
    document.getElementById('drawerOverlay').classList.remove('hidden');
    document.getElementById('orderDrawer').classList.remove('hidden');
    document.getElementById('drawerOrderId').textContent = `#${order.id}`;
    document.getElementById('drawerContent').innerHTML = `
    <div class="grid grid-cols-2 gap-3">
      <div class="rounded-xl bg-slate-50 p-4">
        <div class="text-xs text-slate-500">Customer</div>
        <div class="mt-1 font-semibold">${order.customer}</div>
      </div>
      <div class="rounded-xl bg-slate-50 p-4">
        <div class="text-xs text-slate-500">Total</div>
        <div class="mt-1 font-semibold">${order.total}</div>
      </div>
      <div class="rounded-xl bg-slate-50 p-4">
        <div class="text-xs text-slate-500">Status</div>
        <div class="mt-1 font-semibold">${order.status}</div>
      </div>
      <div class="rounded-xl bg-slate-50 p-4">
        <div class="text-xs text-slate-500">Placed</div>
        <div class="mt-1 font-semibold">${order.date}</div>
      </div>
    </div>
    <div class="mt-6">
      <h3 class="font-semibold">Items</h3>
      <p class="text-sm text-slate-500 mt-1">${order.items} item(s)</p>
    </div>
  `;
    window.lucide?.createIcons();
}

function closeDrawer() {
    document.getElementById('drawerOverlay').classList.add('hidden');
    document.getElementById('orderDrawer').classList.add('hidden');
}

export function toast(message, type = 'info', timeout = 2400) {
    const host = document.getElementById('toastHost');
    const tones = {
        info: 'bg-slate-900 text-white',
        success: 'bg-emerald-600 text-white',
        error: 'bg-rose-600 text-white',
    };
    const el = document.createElement('div');
    el.className = `rounded-lg px-4 py-3 text-sm font-medium shadow-xl ${tones[type]}`;
    el.textContent = message;
    host.appendChild(el);
    setTimeout(() => el.remove(), timeout);
}

// Expose for page scripts
window.__shell = { openDrawer, closeDrawer, toast };

// Init
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initShell);
} else {
    initShell();
}