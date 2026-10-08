export function badge(value) {
    const MAP = {
        active: 'emerald', paid: 'emerald', healthy: 'emerald', complete: 'emerald',
        answered: 'emerald', visible: 'emerald', enabled: 'emerald', delivered: 'emerald',
        low: 'amber', 'low stock': 'amber', pending: 'amber', processing: 'amber',
        'to ship': 'amber', scheduled: 'amber', requested: 'amber', unanswered: 'amber',
        'under review': 'amber',
        'out of stock': 'rose', return: 'rose', open: 'rose', dispute: 'rose',
        shipped: 'brand',
    };
    const TONES = {
        emerald: 'bg-emerald-50 text-emerald-700',
        amber: 'bg-amber-50 text-amber-700',
        rose: 'bg-rose-50 text-rose-700',
        brand: 'bg-[var(--color-brand-ultralight)] text-[var(--color-brand-dark)]',
        slate: 'bg-slate-100 text-slate-600',
    };
    const tone = MAP[String(value).toLowerCase().trim()] || 'slate';
    return `<span class="rounded-full px-2.5 py-1 text-xs font-semibold ${TONES[tone]}">${value}</span>`;
}

export function formatDate(iso) {
    if (!iso) return '—';
    try {
        return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch { return '—'; }
}

export function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str ?? '';
    return div.innerHTML;
}