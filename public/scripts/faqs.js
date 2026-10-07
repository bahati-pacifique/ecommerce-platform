/* ========================================================================
       FAQ PAGE CONTROLLER
       ========================================================================
       This controller is designed to work with a backend API.
       Replace the mock data and API calls with your real endpoints.

       Expected FAQ payload shape:
       {
         _id: "unique-id",
         title: "Some Title",
         category: "order" | "business" | "admin" | "account" | "payment",
         question: "...",
         answer: "...some answer...",
         asked_on: "2026-01-15T10:30:00Z",
         replied_on: "2026-01-16T09:00:00Z"
       }

       Expected paginated response shape:
       {
         data: [ ...faqItems ],
         page: 1,
         limit: 10,
         hasNextPage: true,
         hasPrevPage: false,
         total: 42
       }
       ======================================================================== */

const FAQ_CONFIG = {
    apiBase: '/api/faqs', // <-- Replace with your backend endpoint
    pageSize: 5, // items per page
    debounceMs: 350 // search debounce delay
};

const state = {
    items: [],
    page: 1,
    limit: FAQ_CONFIG.pageSize,
    hasNextPage: false,
    hasPrevPage: false,
    total: 0,
    search: '',
    category: 'all',
    loading: false
};

const els = {
    list: document.getElementById('faqList'),
    empty: document.getElementById('faqEmpty'),
    search: document.getElementById('faqSearch'),
    pagination: document.getElementById('pagination'),
    pageInfo: document.getElementById('pageInfo'),
    pageControls: document.getElementById('pageControls'),
    askForm: document.getElementById('askForm'),
    askInput: document.getElementById('askInput'),
    askBtn: document.getElementById('askBtn'),
    askStatus: document.getElementById('askStatus')
};

const FAQS = [{
    _id: '1',
    title: 'How do I track my order?',
    category: 'order',
    question: 'How can I track the status of my recent order?',
    answer: 'Once your order is confirmed, you will receive a tracking link via email. You can also log in to your account and visit the "My Orders" section to see real-time updates on your order status, including dispatch, in-transit, and delivery confirmation.',
    asked_on: '2026-01-10T09:15:00Z',
    replied_on: '2026-01-10T14:30:00Z'
},
{
    _id: '2',
    title: 'What payment methods do you accept?',
    category: 'payment',
    question: 'Which payment methods are supported on COCOCE?',
    answer: 'We accept Mobile Money (MTN, Airtel), major credit/debit cards (Visa, Mastercard), and bank transfers. All payments are processed through PCI-compliant partners, and we never store your full card details on our servers.',
    asked_on: '2026-01-08T11:00:00Z',
    replied_on: '2026-01-08T16:45:00Z'
},
{
    _id: '3',
    title: 'How do I become a vendor on COCOCE?',
    category: 'business',
    question: 'What is the process to register as a vendor?',
    answer: 'To become a vendor, click "Sell on COCOCE" from the homepage, complete the registration form with your business details, upload the required documents (business registration, tax ID), and submit for review. Our team will verify your information within 2-3 business days.',
    asked_on: '2026-01-05T08:20:00Z',
    replied_on: '2026-01-06T10:00:00Z'
},
{
    _id: '4',
    title: 'How do I reset my admin password?',
    category: 'admin',
    question: 'I forgot my admin account password. How can I reset it?',
    answer: 'Admin password resets require multi-factor authentication. Click "Forgot Password" on the admin login page, verify your identity via the registered MFA device, and you will receive a time-limited reset link. If you have lost your MFA device, contact the security team immediately at security@cococe.rw.',
    asked_on: '2026-01-03T13:40:00Z',
    replied_on: '2026-01-03T15:20:00Z'
},
{
    _id: '5',
    title: 'Can I change my email address?',
    category: 'account',
    question: 'How do I update the email address linked to my account?',
    answer: 'Yes. Go to Account Settings > Profile, click "Change Email", enter your new email address, and confirm via the verification link sent to both your old and new email addresses. For security, changes take effect after 24 hours.',
    asked_on: '2025-12-28T10:10:00Z',
    replied_on: '2025-12-28T12:00:00Z'
},
{
    _id: '6',
    title: 'What is your return policy?',
    category: 'order',
    question: 'Can I return a product if I am not satisfied?',
    answer: 'Return policies are set by each vendor and displayed on the product listing. Most vendors offer a 7-day return window for unused items in original packaging. Please review the specific vendor\'s return policy before purchasing.',
    asked_on: '2025-12-20T14:00:00Z',
    replied_on: '2025-12-20T17:30:00Z'
},
{
    _id: '7',
    title: 'How are vendor payouts processed?',
    category: 'business',
    question: 'When and how do vendors receive their payouts?',
    answer: 'Vendor payouts are processed every Monday for orders delivered in the previous week. Payouts are sent via Mobile Money or bank transfer based on your preference. A detailed statement is available in your vendor dashboard.',
    asked_on: '2025-12-15T09:00:00Z',
    replied_on: '2025-12-15T11:45:00Z'
},
{
    _id: '8',
    title: 'What are the system administration requirements?',
    category: 'admin',
    question: 'What security requirements must system administrators follow?',
    answer: 'System administrators must use MFA, avoid public networks and machines, log out after every session, and never share system data or user information. Full details are in the System Administration Terms and Privacy pages.',
    asked_on: '2025-12-10T16:20:00Z',
    replied_on: '2025-12-11T09:15:00Z'
}
];

async function fetchFaqs({
    page,
    limit,
    search,
    category
}) {
    // ---------------------------------------------------------------
    // REAL IMPLEMENTATION (uncomment when backend is ready):
    // ---------------------------------------------------------------
    // const params = new URLSearchParams({ page, limit });
    // if (search) params.append('search', search);
    // if (category && category !== 'all') params.append('category', category);
    // const res = await fetch(`${FAQ_CONFIG.apiBase}?${params.toString()}`);
    // if (!res.ok) throw new Error('Failed to fetch FAQs');
    // return await res.json();


    await new Promise(r => setTimeout(r, 400));

    let filtered = [...FAQS];

    // Search filter (title, question, answer, category)
    if (search) {
        const q = search.toLowerCase();
        filtered = filtered.filter(f =>
            f.title.toLowerCase().includes(q) ||
            f.question.toLowerCase().includes(q) ||
            f.answer.toLowerCase().includes(q) ||
            f.category.toLowerCase().includes(q)
        );
    }

    // Category filter
    if (category && category !== 'all') {
        filtered = filtered.filter(f => f.category === category);
    }

    const total = filtered.length;
    const start = (page - 1) * limit;
    const data = filtered.slice(start, start + limit);

    return {
        data,
        page,
        limit,
        hasNextPage: start + limit < total,
        hasPrevPage: page > 1,
        total
    };
}

async function submitQuestion(payload) {
    // ---------------------------------------------------------------
    // REAL IMPLEMENTATION (uncomment when backend is ready):
    // ---------------------------------------------------------------
    // const res = await fetch(`${FAQ_CONFIG.apiBase}/ask`, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(payload)
    // });
    // if (!res.ok) throw new Error('Failed to submit question');
    // return await res.json();

    await new Promise(r => setTimeout(r, 600));
    return {
        success: true,
        message: 'Question received'
    };
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str ?? '';
    return div.innerHTML;
}

function formatDate(iso) {
    if (!iso) return '—';
    try {
        return new Date(iso).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    } catch {
        return '—';
    }
}

function renderFaqItem(item) {
    const categoryLabel = item.category ?
        item.category.charAt(0).toUpperCase() + item.category.slice(1) :
        'General';

    return `
        <div class="faq-accordion" data-id="${escapeHtml(item._id)}">
          <button class="faq-trigger" type="button" aria-expanded="false">
            <span class="flex items-center gap-2.5 min-w-0">
              <span class="faq-category">${escapeHtml(categoryLabel)}</span>
              <span class="truncate">${escapeHtml(item.title)}</span>
            </span>
            <i data-lucide="chevron-down" class="chevron"></i>
          </button>
          <div class="faq-panel">
            <div class="faq-panel-inner">
              <p><strong>Q:</strong> ${escapeHtml(item.question)}</p>
              <p><strong>A:</strong> ${escapeHtml(item.answer)}</p>
              <div class="faq-meta">
                <span>Asked: ${formatDate(item.asked_on)}</span>
                <span>Replied: ${formatDate(item.replied_on)}</span>
              </div>
            </div>
          </div>
        </div>
      `;
}

function renderSkeleton() {
    let html = '';
    for (let i = 0; i < state.limit; i++) {
        html += `
          <div class="faq-accordion">
            <div class="faq-trigger">
              <div class="skeleton" style="height:18px;width:60%;"></div>
              <div class="skeleton" style="height:18px;width:18px;border-radius:50%;"></div>
            </div>
          </div>
        `;
    }
    return html;
}

function renderList() {
    if (state.loading) {
        els.list.innerHTML = renderSkeleton();
        els.empty.classList.add('hidden');
        return;
    }

    if (!state.items.length) {
        els.list.innerHTML = '';
        els.empty.classList.remove('hidden');
        return;
    }

    els.empty.classList.add('hidden');
    els.list.innerHTML = state.items.map(renderFaqItem).join('');

    // Re-init icons
    lucide.createIcons();

    // Attach accordion handlers
    els.list.querySelectorAll('.faq-trigger').forEach(btn => {
        btn.addEventListener('click', () => {
            const parent = btn.closest('.faq-accordion');
            const isOpen = parent.classList.toggle('open');
            btn.setAttribute('aria-expanded', String(isOpen));
        });
    });
}

function renderPagination() {
    const totalPages = Math.max(1, Math.ceil(state.total / state.limit));
    const current = state.page;

    els.pageInfo.textContent = state.total ?
        `Showing ${(current - 1) * state.limit + 1}–${Math.min(current * state.limit, state.total)} of ${state.total} questions` :
        'No questions';

    let html = '';

    html += `<button class="page-btn" data-page="${current - 1}" ${!state.hasPrevPage ? 'disabled' : ''}>
        <i data-lucide="chevron-left" class="w-4 h-4"></i>
      </button>`;

    // Page numbers (compact: show up to 5)
    const pages = [];
    const startPage = Math.max(1, current - 2);
    const endPage = Math.min(totalPages, startPage + 4);
    for (let p = startPage; p <= endPage; p++) pages.push(p);

    if (startPage > 1) {
        html += `<button class="page-btn" data-page="1">1</button>`;
        if (startPage > 2) html += `<span class="text-ink-400 px-1">…</span>`;
    }

    pages.forEach(p => {
        html += `<button class="page-btn ${p === current ? 'active' : ''}" data-page="${p}">${p}</button>`;
    });

    if (endPage < totalPages) {
        if (endPage < totalPages - 1) html += `<span class="text-ink-400 px-1">…</span>`;
        html += `<button class="page-btn" data-page="${totalPages}">${totalPages}</button>`;
    }

    html += `<button class="page-btn" data-page="${current + 1}" ${!state.hasNextPage ? 'disabled' : ''}>
        <i data-lucide="chevron-right" class="w-4 h-4"></i>
      </button>`;

    els.pageControls.innerHTML = html;
    lucide.createIcons();

    // Attach page handlers
    els.pageControls.querySelectorAll('.page-btn[data-page]').forEach(btn => {
        btn.addEventListener('click', () => {
            const p = parseInt(btn.dataset.page, 10);
            if (!isNaN(p) && p >= 1 && p !== state.page) {
                state.page = p;
                loadFaqs();
                window.scrollTo({
                    top: 0,
                    behavior: 'smooth'
                });
            }
        });
    });
}

async function loadFaqs() {
    state.loading = true;
    renderList();
    els.pagination.style.opacity = '0.5';

    try {
        const res = await fetchFaqs({
            page: state.page,
            limit: state.limit,
            search: state.search,
            category: state.category
        });

        state.items = res.data || [];
        state.page = res.page || 1;
        state.limit = res.limit || FAQ_CONFIG.pageSize;
        state.hasNextPage = !!res.hasNextPage;
        state.hasPrevPage = !!res.hasPrevPage;
        state.total = res.total || 0;
    } catch (err) {
        console.error('Failed to load FAQs:', err);
        state.items = [];
        state.total = 0;
        state.hasNextPage = false;
        state.hasPrevPage = false;
    } finally {
        state.loading = false;
        els.pagination.style.opacity = '1';
        renderList();
        renderPagination();
    }
}

let searchTimer;
els.search.addEventListener('input', (e) => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
        state.search = e.target.value.trim();
        state.page = 1;
        loadFaqs();
    }, FAQ_CONFIG.debounceMs);
});

// Category navigation
document.querySelectorAll('.category-link').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const cat = link.dataset.category;
        state.category = cat;
        state.page = 1;

        document.querySelectorAll('.category-link').forEach(l => {
            const isActive = l.dataset.category === cat;
            l.classList.toggle('border-brand', isActive);
            l.classList.toggle('text-brand', isActive);
            l.classList.toggle('font-semibold', isActive);
            l.classList.toggle('border-transparent', !isActive);
            l.classList.toggle('text-ink-500', !isActive);
        });

        loadFaqs();
    });
});

// Ask form
els.askForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const question = els.askInput.value.trim();
    if (!question) return;

    els.askBtn.disabled = true;
    els.askBtn.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> Sending...`;
    lucide.createIcons();
    els.askStatus.classList.add('hidden');

    try {
        const payload = {
            question,
            title: question.slice(0, 80),
            category: state.category === 'all' ? 'general' : state.category,
            asked_on: new Date().toISOString()
        };
        await submitQuestion(payload);
        els.askStatus.textContent = '✓ Your question has been sent. We will get back to you soon.';
        els.askStatus.className = 'mt-3 text-xs text-green-600';
        els.askInput.value = '';
    } catch (err) {
        console.error(err);
        els.askStatus.textContent = '✗ Failed to send your question. Please try again.';
        els.askStatus.className = 'mt-3 text-xs text-red-500';
    } finally {
        els.askBtn.disabled = false;
        els.askBtn.innerHTML = `<i data-lucide="send" class="w-4 h-4"></i> Send question`;
        lucide.createIcons();
        els.askStatus.classList.remove('hidden');
    }
});

loadFaqs();