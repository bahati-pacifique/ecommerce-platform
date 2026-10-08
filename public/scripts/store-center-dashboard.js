const { toast, openOrderDrawer } = window.__shell;

// ─────────────────────────────────────────────────────────────
// Chart range buttons
// ─────────────────────────────────────────────────────────────
document.querySelectorAll('.chart-btn').forEach(button => {
    button.addEventListener('click', () => {
        document.querySelectorAll('.chart-btn').forEach(b => {
            b.classList.remove('bg-white', 'shadow-sm', 'font-semibold');
            b.classList.add('text-slate-500');
        });
        button.classList.add('bg-white', 'shadow-sm', 'font-semibold');
        button.classList.remove('text-slate-500');

        const range = button.dataset.range || '7';
        // TODO: fetch(`/api/store/${storeId}/sales?range=${range}`)
        toast(`Sales view updated to ${button.textContent.trim()}`);
    });
});

// ─────────────────────────────────────────────────────────────
// Header buttons
// ─────────────────────────────────────────────────────────────
document.getElementById('viewStoreButton')?.addEventListener('click', () => {
    toast('Storefront preview opened');
});

document.getElementById('addProductButton')?.addEventListener('click', () => {
    toast('Product creation flow opened');
});

document.getElementById('dateRange')?.addEventListener('change', (e) => {
    toast(`Date range: ${e.target.value}`);
});

// ─────────────────────────────────────────────────────────────
// Order rows — open drawer (delegated, so still works after re-renders)
// ─────────────────────────────────────────────────────────────
// (Already handled by shell.js via [data-action="open-order"])

// ─────────────────────────────────────────────────────────────
// Icons
// ─────────────────────────────────────────────────────────────
window.lucide?.createIcons();