// notifications.js

// ==================== SAMPLE DATA ====================
// Notification payload shape:
// { id, userId, storeId, message, status, received_date, created_date, opened_date, from, category, title }
// status: "new" | "opened" | "archived"

let notifications = [
    {
        id: "n1",
        userId: "u1", storeId: "s1",
        title: "New order placed",
        message: "Order #4821 was placed by John Doe.\n\nItems: 2 × Wireless Earbuds, 1 × Phone Case\nTotal: $129.98\n\nPlease confirm and prepare for shipping.",
        status: "new",
        category: "order",
        from: "Order System",
        received_date: "2026-10-12T09:14:00Z",
        created_date: "2026-10-12T09:13:52Z",
        opened_date: null,
    },
    {
        id: "n2",
        userId: "u2", storeId: "s1",
        title: "Payment received",
        message: "Payment of $129.98 received from John Doe for order #4821. Transaction ID: TXN-9F4A2B.",
        status: "new",
        category: "payment",
        from: "Payment Gateway",
        received_date: "2026-10-12T09:16:00Z",
        created_date: "2026-10-12T09:15:58Z",
        opened_date: null,
    },
    {
        id: "n3",
        userId: "u3", storeId: "s1",
        title: "Low stock alert",
        message: "Wireless Earbuds stock is down to 3 units. Consider restocking soon to avoid missed orders.",
        status: "opened",
        category: "inventory",
        from: "Inventory Monitor",
        received_date: "2026-10-11T18:42:00Z",
        created_date: "2026-10-11T18:41:50Z",
        opened_date: "2026-10-11T19:05:00Z",
    },
    {
        id: "n4",
        userId: "u4", storeId: "s1",
        title: "New customer message",
        message: "Mike Chen: \"Hi, I placed an order yesterday and wanted to check if it ships today.\"",
        status: "new",
        category: "customer",
        from: "Mike Chen",
        received_date: "2026-10-12T07:20:00Z",
        created_date: "2026-10-12T07:19:44Z",
        opened_date: null,
    },
    {
        id: "n5",
        userId: "system", storeId: "s1",
        title: "Weekly report ready",
        message: "Your weekly store performance report is ready. Last week you had 148 orders and $4,320 in revenue.",
        status: "opened",
        category: "system",
        from: "Analytics",
        received_date: "2026-10-10T06:00:00Z",
        created_date: "2026-10-10T06:00:00Z",
        opened_date: "2026-10-10T08:30:00Z",
    },
    {
        id: "n6",
        userId: "system", storeId: "s1",
        title: "Flash sale reminder",
        message: "Your scheduled flash sale starts in 2 hours. Make sure your stock levels are updated.",
        status: "opened",
        category: "promotion",
        from: "Promotions",
        received_date: "2026-10-09T12:00:00Z",
        created_date: "2026-10-09T11:59:58Z",
        opened_date: "2026-10-09T12:15:00Z",
    },
    {
        id: "n7",
        userId: "u2", storeId: "s1",
        title: "Refund requested",
        message: "Sarah Miller requested a refund for order #4750. Reason: item arrived damaged.",
        status: "archived",
        category: "order",
        from: "Order System",
        received_date: "2026-10-05T14:22:00Z",
        created_date: "2026-10-05T14:21:40Z",
        opened_date: "2026-10-05T14:40:00Z",
    },
    {
        id: "n8",
        userId: "system", storeId: "s1",
        title: "Payment gateway issue",
        message: "We detected intermittent failures with the payment gateway between 02:00–02:15 UTC. No action needed — resolved.",
        status: "archived",
        category: "system",
        from: "System Monitor",
        received_date: "2026-10-04T02:20:00Z",
        created_date: "2026-10-04T02:19:55Z",
        opened_date: "2026-10-04T07:10:00Z",
    },
];

// ==================== STATE ====================
const state = {
    activeId: null,
    status: "all",          // all | new | opened | archived
    category: "all",
    sort: "newest",         // newest | oldest
    search: "",
};

// ==================== CATEGORY THEME MAP ====================
const categoryTheme = {
    order: { bg: "#eef2ff", fg: "#4f46e5", icon: "🛒" },
    payment: { bg: "#ecfdf5", fg: "#10b981", icon: "💳" },
    inventory: { bg: "#fff7ed", fg: "#f59e0b", icon: "📦" },
    customer: { bg: "#fdf2f8", fg: "#ec4899", icon: "💬" },
    system: { bg: "#f1f5f9", fg: "#475569", icon: "⚙️" },
    promotion: { bg: "#fef3c7", fg: "#d97706", icon: "🎯" },
};

// ==================== DOM ====================
const appEl = document.getElementById("app");
const listPanelEl = document.getElementById("listPanel");
const detailPanelEl = document.getElementById("detailPanel");
const notificationListEl = document.getElementById("notificationList");
const listEmptyEl = document.getElementById("listEmpty");
const emptyStateEl = document.getElementById("emptyState");
const detailEl = document.getElementById("detail");
const backBtn = document.getElementById("backBtn");

const searchInput = document.getElementById("searchInput");
const clearSearchBtn = document.getElementById("clearSearch");
const statusFiltersEl = document.getElementById("statusFilters");
const categoryFilter = document.getElementById("categoryFilter");
const totalBadgeEl = document.getElementById("totalBadge");
const markAllReadBtn = document.getElementById("markAllReadBtn");

const detailIconEl = document.getElementById("detailIcon");
const detailTitleEl = document.getElementById("detailTitle");
const detailSubtitleEl = document.getElementById("detailSubtitle");
const detailMessageEl = document.getElementById("detailMessage");
const metaGridEl = document.getElementById("metaGrid");
const statusBannerEl = document.getElementById("statusBanner");

const toggleArchiveBtn = document.getElementById("toggleArchiveBtn");
const deleteBtn = document.getElementById("deleteBtn");
const markReadBtn = document.getElementById("markReadBtn");
const markNewBtn = document.getElementById("markNewBtn");

const toastEl = document.getElementById("toast");

// ==================== HELPERS ====================
function escapeHtml(str) {
    const d = document.createElement("div");
    d.textContent = str ?? "";
    return d.innerHTML;
}

let toastTimer;
function showToast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.remove("hidden");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.add("hidden"), 2200);
}

function formatDateTime(iso) {
    if (!iso) return "—";
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
        year: "numeric", month: "short", day: "numeric",
        hour: "2-digit", minute: "2-digit",
    });
}

function formatRelative(iso) {
    if (!iso) return "";
    const diffMs = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(iso).toLocaleDateString();
}

function getActive() {
    return notifications.find((n) => n.id === state.activeId) || null;
}

// ==================== FILTER + SORT ====================
function getVisible() {
    const q = state.search.trim().toLowerCase();

    let list = notifications.filter((n) => {
        if (state.status !== "all" && n.status !== state.status) return false;
        if (state.category !== "all" && n.category !== state.category) return false;

        if (q) {
            const haystack = `${n.title} ${n.message} ${n.from} ${n.category}`.toLowerCase();
            if (!haystack.includes(q)) return false;
        }
        return true;
    });

    // Sort by received_date
    list.sort((a, b) => {
        const ta = new Date(a.received_date).getTime();
        const tb = new Date(b.received_date).getTime();
        return state.sort === "newest" ? tb - ta : ta - tb;
    });

    return list;
}

function updateTotals() {
    const unread = notifications.filter((n) => n.status === "new").length;
    totalBadgeEl.textContent = unread;
    totalBadgeEl.classList.toggle("hidden", unread === 0);
}

// ==================== RENDER LIST ====================
function renderList() {
    const visible = getVisible();
    notificationListEl.innerHTML = "";

    if (visible.length === 0) {
        notificationListEl.classList.add("hidden");
        listEmptyEl.classList.remove("hidden");
        listEmptyEl.classList.add("flex");
        updateTotals();
        return;
    }
    notificationListEl.classList.remove("hidden");
    listEmptyEl.classList.add("hidden");
    listEmptyEl.classList.remove("flex");

    visible.forEach((n) => {
        const theme = categoryTheme[n.category] || categoryTheme.system;
        const isActive = n.id === state.activeId;
        const isNew = n.status === "new";

        const item = document.createElement("div");
        item.className = [
            "relative flex gap-3 px-4 py-3 cursor-pointer border-b border-gray-200 transition hover:bg-gray-100",
            isActive ? "bg-gray-100" : "",
        ].join(" ");
        item.dataset.id = n.id;

        if (isActive) {
            const bar = document.createElement("span");
            bar.className = "absolute left-0 top-0 bottom-0 w-[3px] bg-brand";
            item.appendChild(bar);
        }

        item.innerHTML += `
            <div class="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
                 style="background:${theme.bg}; color:${theme.fg}">
                ${theme.icon}
            </div>

            <div class="flex-1 min-w-0">
                <div class="flex items-baseline justify-between gap-2 mb-0.5">
                    <span class="font-semibold text-[13px] truncate ${isNew ? "text-gray-900" : "text-gray-700"}">
                        ${escapeHtml(n.title)}
                    </span>
                    <span class="text-[11px] text-gray-400 shrink-0">${formatRelative(n.received_date)}</span>
                </div>
                <p class="text-[12px] text-gray-500 line-clamp-2 leading-snug">
                    ${escapeHtml(n.message.slice(0, 120))}${n.message.length > 120 ? "…" : ""}
                </p>
                <div class="flex items-center gap-2 mt-1.5">
                    <span class="text-[10px] font-medium uppercase tracking-wide px-1.5 py-0.5 rounded"
                          style="background:${theme.bg}; color:${theme.fg}">
                        ${escapeHtml(n.category)}
                    </span>
                    ${isNew ? `<span class="w-2 h-2 rounded-full bg-brand"></span>` : ""}
                </div>
            </div>
        `;

        item.addEventListener("click", () => openNotification(n.id));
        notificationListEl.appendChild(item);
    });

    updateTotals();
}

// ==================== OPEN DETAIL ====================
function openNotification(id) {
    state.activeId = id;
    const n = getActive();
    if (!n) return;

    // Auto-mark opened
    if (n.status === "new") {
        n.status = "opened";
        n.opened_date = new Date().toISOString();
        showToast("Marked as opened");
    }

    // Populate header
    const theme = categoryTheme[n.category] || categoryTheme.system;
    detailIconEl.style.background = theme.bg;
    detailIconEl.style.color = theme.fg;
    detailIconEl.textContent = theme.icon;
    detailTitleEl.textContent = n.title;
    detailSubtitleEl.textContent = `${n.from} • ${formatRelative(n.received_date)}`;

    // Message
    detailMessageEl.textContent = n.message;

    // Status banner
    renderStatusBanner(n);

    // Meta
    renderMeta(n);

    // Action buttons state
    markReadBtn.disabled = n.status === "opened";
    markNewBtn.disabled = n.status === "new";

    // Show detail, hide empty
    emptyStateEl.classList.add("hidden");
    detailEl.classList.remove("hidden");
    detailEl.classList.add("flex");

    detailPanelEl.classList.remove("hidden");
    detailPanelEl.classList.add("flex");

    // Mobile
    if (isMobile()) {
        appEl.classList.add("chat-open");
        listPanelEl.classList.add("hidden");
        listPanelEl.classList.remove("flex");
        backBtn.classList.remove("hidden");
        backBtn.classList.add("flex");
    }

    renderList();
}

function renderStatusBanner(n) {
    const map = {
        new: { bg: "#eff6ff", border: "#bfdbfe", text: "#1d4ed8", label: "New — unread notification" },
        opened: { bg: "#ecfdf5", border: "#a7f3d0", text: "#047857", label: "Opened" },
        archived: { bg: "#f3f4f6", border: "#e5e7eb", text: "#4b5563", label: "Archived" },
    };
    const s = map[n.status] || map.opened;
    statusBannerEl.style.background = s.bg;
    statusBannerEl.style.border = `1px solid ${s.border}`;
    statusBannerEl.innerHTML = `
        <div class="w-2 h-2 rounded-full mt-2 shrink-0" style="background:${s.text}"></div>
        <div class="flex-1">
            <p class="text-sm font-medium" style="color:${s.text}">${s.label}</p>
            <p class="text-xs text-gray-600 mt-0.5">Received ${formatRelative(n.received_date)} • ${formatDateTime(n.received_date)}</p>
        </div>
    `;
}

function renderMeta(n) {
    const rows = [
        ["Notification ID", n.id],
        ["User ID", n.userId || "—"],
        ["Store ID", n.storeId || "—"],
        ["From", n.from || "—"],
        ["Category", n.category || "—"],
        ["Created", formatDateTime(n.created_date)],
        ["Received", formatDateTime(n.received_date)],
        ["Opened", n.opened_date ? formatDateTime(n.opened_date) : "Not yet opened"],
    ];

    metaGridEl.innerHTML = rows.map(([k, v]) => `
        <div>
            <dt class="text-xs text-gray-500 mb-1">${escapeHtml(k)}</dt>
            <dd class="text-sm text-gray-900 font-medium break-words">${escapeHtml(String(v))}</dd>
        </div>
    `).join("");
}

// ==================== ACTIONS ====================
markReadBtn.addEventListener("click", () => {
    const n = getActive();
    if (!n || n.status === "opened") return;
    n.status = "opened";
    n.opened_date = new Date().toISOString();
    renderStatusBanner(n);
    markReadBtn.disabled = true;
    markNewBtn.disabled = false;
    showToast("Marked as opened");
    renderList();
});

markNewBtn.addEventListener("click", () => {
    const n = getActive();
    if (!n || n.status === "new") return;
    n.status = "new";
    n.opened_date = null;
    renderStatusBanner(n);
    markReadBtn.disabled = false;
    markNewBtn.disabled = true;
    showToast("Marked as new");
    renderList();
});

toggleArchiveBtn.addEventListener("click", () => {
    const n = getActive();
    if (!n) return;
    n.status = n.status === "archived" ? "opened" : "archived";
    renderStatusBanner(n);
    showToast(n.status === "archived" ? "Archived" : "Restored");
    renderList();
});

deleteBtn.addEventListener("click", () => {
    const n = getActive();
    if (!n) return;
    if (!confirm(`Delete this notification?`)) return;
    notifications = notifications.filter((x) => x.id !== n.id);
    showToast("Notification deleted");
    closeDetail();
});

markAllReadBtn.addEventListener("click", () => {
    let count = 0;
    notifications.forEach((n) => {
        if (n.status === "new") {
            n.status = "opened";
            n.opened_date = new Date().toISOString();
            count++;
        }
    });
    if (count === 0) return showToast("All caught up");
    showToast(`${count} marked as opened`);
    renderList();
    const active = getActive();
    if (active) {
        renderStatusBanner(active);
        markReadBtn.disabled = active.status === "opened";
        markNewBtn.disabled = active.status === "new";
    }
});

// ==================== SEARCH ====================
searchInput.addEventListener("input", (e) => {
    state.search = e.target.value;
    clearSearchBtn.classList.toggle("hidden", state.search.length === 0);
    renderList();
});

clearSearchBtn.addEventListener("click", () => {
    state.search = "";
    searchInput.value = "";
    clearSearchBtn.classList.add("hidden");
    renderList();
    searchInput.focus();
});

// ==================== STATUS FILTERS ====================
statusFiltersEl.addEventListener("click", (e) => {
    const btn = e.target.closest(".status-btn");
    if (!btn) return;

    state.status = btn.dataset.status;

    statusFiltersEl.querySelectorAll(".status-btn").forEach((b) => {
        const active = b === btn;
        b.classList.toggle("bg-brand", active);
        b.classList.toggle("text-white", active);
        b.classList.toggle("text-gray-500", !active);
        b.classList.toggle("hover:bg-gray-100", !active);
    });

    renderList();
});

// ==================== CATEGORY FILTER ====================
categoryFilter.addEventListener("change", (e) => {
    state.category = e.target.value;
    renderList();
});

// ==================== DATE SORT ====================
document.querySelectorAll(".date-sort-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
        state.sort = btn.dataset.sort;
        document.querySelectorAll(".date-sort-btn").forEach((b) => {
            const active = b === btn;
            b.classList.toggle("bg-brand", active);
            b.classList.toggle("text-white", active);
            b.classList.toggle("text-gray-600", !active);
            b.classList.toggle("hover:bg-gray-100", !active);
        });
        renderList();
    });
});

// ==================== MOBILE HELPERS ====================
const mqMobile = window.matchMedia("(max-width: 767px)");
const isMobile = () => mqMobile.matches;

function closeDetail() {
    state.activeId = null;
    detailEl.classList.add("hidden");
    detailEl.classList.remove("flex");
    emptyStateEl.classList.remove("hidden");

    if (isMobile()) {
        appEl.classList.remove("chat-open");
        listPanelEl.classList.remove("hidden");
        listPanelEl.classList.add("flex");
        detailPanelEl.classList.add("hidden");
        detailPanelEl.classList.remove("flex");
        backBtn.classList.add("hidden");
        backBtn.classList.remove("flex");
    }
    renderList();
}

backBtn.addEventListener("click", closeDetail);

mqMobile.addEventListener("change", () => {
    if (isMobile()) {
        if (state.activeId) {
            listPanelEl.classList.add("hidden");
            listPanelEl.classList.remove("flex");
            detailPanelEl.classList.remove("hidden");
            detailPanelEl.classList.add("flex");
            backBtn.classList.remove("hidden");
            backBtn.classList.add("flex");
        } else {
            listPanelEl.classList.remove("hidden");
            listPanelEl.classList.add("flex");
            detailPanelEl.classList.add("hidden");
            detailPanelEl.classList.remove("flex");
        }
    } else {
        listPanelEl.classList.remove("hidden");
        listPanelEl.classList.add("flex");
        detailPanelEl.classList.remove("hidden");
        detailPanelEl.classList.add("flex");
        backBtn.classList.add("hidden");
        backBtn.classList.remove("flex");
        appEl.classList.remove("chat-open");
    }
});

// ==================== INIT ====================
renderList();