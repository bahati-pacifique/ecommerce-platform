'use strict';

const sidebar = document.getElementById('sidebar');
const toggleBtn = document.getElementById('sidebarToggle');
const toggleIcon = document.getElementById('toggleIcon');
const toggleText = document.getElementById('toggleText');
let isCollapsed = false;

toggleBtn.addEventListener('click', function () {
    isCollapsed = !isCollapsed;
    sidebar.classList.toggle('collapsed', isCollapsed);
    toggleIcon.className = isCollapsed ? 'fas fa-chevron-right' : 'fas fa-chevron-left';
    toggleText.textContent = isCollapsed ? 'Expand' : 'Collapse';
});


const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const overlay = document.getElementById('sidebarOverlay');

function openMobileSidebar() {
    sidebar.classList.add('mobile-open');
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeMobileSidebar() {
    sidebar.classList.remove('mobile-open');
    overlay.classList.remove('active');
    document.body.style.overflow = '';
}

mobileMenuBtn.addEventListener('click', openMobileSidebar);

// Close sidebar on link click (mobile)
document.querySelectorAll('.sidebar-link').forEach(link => {
    link.addEventListener('click', () => {
        if (window.innerWidth < 1024) {
            closeMobileSidebar();
        }
    });
});

// ============================================================
// TAB SWITCHING WITH TITLE UPDATE
// ============================================================
const sidebarLinks = document.querySelectorAll('.sidebar-link');
const tabContents = {
    overview: document.getElementById('tab-overview'),
    stores: document.getElementById('tab-stores'),
    inventory: document.getElementById('tab-inventory'),
    orders: document.getElementById('tab-orders'),
    analytics: document.getElementById('tab-analytics'),
    category: document.getElementById('tab-categories'),
    profile: document.getElementById('tab-profile'),
    settings: document.getElementById('tab-settings'),
    logs: document.getElementById('tab-logs'),
    support: document.getElementById('tab-support'),
};

const mainTitle = document.getElementById('mainTitle');

// Tab titles mapping
const tabTitles = {
    overview: 'Dashboard',
    stores: 'Stores',
    inventory: 'Inventory',
    orders: 'Orders',
    analytics: 'Analytics',
    category: 'Categories',
    profile: 'Profile',
    settings: 'Settings',
    logs: 'Logs',
    support: 'Support'
};

// const activeLink = Array.from(sidebarLinks).some(link => {
//   return link.classList.contains('active');
// });

// console.log(activeLink)
const activeLink = Array.from(sidebarLinks).find(link => link.classList.contains('active'));

const activeTab = activeLink ? activeLink.dataset.tab : null;

let profileManager = null;
let logsManager = null;
let vendorInventory = null;
let categoryManager = null;

sidebarLinks.forEach(link => {
    link.addEventListener('click', function (e) {
        e.preventDefault();

        // Remove active from all links
        sidebarLinks.forEach(l => l.classList.remove('active'));
        this.classList.add('active');

        // Hide all tab contents
        Object.values(tabContents).forEach(content => {
            if (content) content.classList.remove('active');
        });

        // Show selected tab
        const tabId = this.dataset.tab;

        switch (tabId) {
            case 'stores':
                fetchAndFillStore();
                break;
            case 'profile':
                if (!profileManager) {
                    profileManager = new ProfileManager();
                }
                break;
            case 'logs':
                // Watch for logs tab activation
                if (!logsManager) {
                    logsManager = new LogsManager();
                }
                break;
            case 'inventory':
                if (!vendorInventory) {
                    vendorInventory = new VendorInventory();
                }
                break;
            case 'category':
                if (!categoryManager) {
                    categoryManager = new CategoriesManager();
                }
                break;
        }

        if (tabContents[tabId]) {
            tabContents[tabId].classList.add('active');
        }

        if (tabId && tabTitles[tabId]) {
            mainTitle.textContent = tabTitles[tabId];
        }
    });
});

// ============================================================
// PROFILE POPUP MENU
// ============================================================
const profileTrigger = document.getElementById('profileTrigger');
const profilePopup = document.getElementById('profilePopup');
const popupChevron = document.getElementById('popupChevron');
let isPopupOpen = false;

function togglePopup(e) {
    e.stopPropagation();
    isPopupOpen = !isPopupOpen;
    profilePopup.classList.toggle('show', isPopupOpen);
    popupChevron.style.transform = isPopupOpen ? 'rotate(180deg)' : 'rotate(0deg)';
}

function closePopup() {
    isPopupOpen = false;
    profilePopup.classList.remove('show');
    popupChevron.style.transform = 'rotate(0deg)';
}

profileTrigger.addEventListener('click', togglePopup);

// Close popup when clicking outside
document.addEventListener('click', function (e) {
    if (!profileTrigger.contains(e.target) && !profilePopup.contains(e.target)) {
        closePopup();
    }
});

// Close popup on Escape key
document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && isPopupOpen) {
        closePopup();
    }
});

// Popup item actions
document.getElementById('viewProfileBtn').addEventListener('click', function () {
    closePopup();
    // Find and click the profile tab
    const profileTab = document.querySelector('.sidebar-link[data-tab="profile"]');
    if (profileTab) profileTab.click();
});

document.getElementById('accountSettingsBtn').addEventListener('click', function () {
    closePopup();
    const settingsTab = document.querySelector('.sidebar-link[data-tab="settings"]');
    if (settingsTab) settingsTab.click();
});

// ============================================================
// CHARTS
// ============================================================
// Sales Chart
const salesCtx = document.getElementById('salesChart')?.getContext('2d');
if (salesCtx) {
    new Chart(salesCtx, {
        type: 'line',
        data: {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            datasets: [{
                label: 'Sales ($)',
                data: [1200, 1900, 1500, 2200, 2800, 2100, 2600],
                borderColor: '#ED1B24',
                backgroundColor: 'rgba(237, 27, 36, 0.05)',
                fill: true,
                tension: 0.4,
                borderWidth: 2,
                pointBackgroundColor: '#ED1B24',
                pointBorderColor: 'white',
                pointBorderWidth: 2,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0,0,0,0.04)'
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

// Order Status Chart
const orderCtx = document.getElementById('orderChart')?.getContext('2d');
if (orderCtx) {
    new Chart(orderCtx, {
        type: 'doughnut',
        data: {
            labels: ['Completed', 'Processing', 'Pending', 'Cancelled'],
            datasets: [{
                data: [1112, 124, 48, 23],
                backgroundColor: ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444'],
                borderWidth: 0,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 12,
                        usePointStyle: true,
                        pointStyle: 'circle'
                    }
                }
            },
            cutout: '70%',
        }
    });
}

// ============================================================
// QUICK ACTIONS MODAL
// ============================================================
const quickActionsBtn = document.getElementById('quickActionsBtn');
const quickActionsModal = document.getElementById('quickActionsModal');

function openQuickActions() {
    quickActionsModal.classList.remove('hidden');
    quickActionsModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeQuickActions() {
    quickActionsModal.classList.add('hidden');
    quickActionsModal.style.display = 'none';
    document.body.style.overflow = '';
}

quickActionsBtn.addEventListener('click', openQuickActions);

// Close on Escape
document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
        if (!quickActionsModal.classList.contains('hidden')) {
            closeQuickActions();
        }
    }
});

// Quick action links
document.querySelectorAll('#quickActionsModal a').forEach(link => {
    link.addEventListener('click', function (e) {
        e.preventDefault();
        closeQuickActions();
        const text = this.querySelector('p')?.textContent || 'Action';

    });
});

$(document).ready(() => {
    $('#sidebarOverlay').click(closeMobileSidebar);
    $('#closeQuickActionsBtn').click(closeQuickActions);
    $('#quickActionsModal .modal-overlay').click(closeQuickActions);
    $('#storeRefreshBtn').click(() => {
        fetchAndFillStore();
    })
});

let fetchedStore = false;
async function fetchAndFillStore() {
    if (!fetchedStore) $('.store-container').hide();
    $('#storeLoader').show();
    axios.get(`${protocal}api.${domainName}/business/stores`, {
        withCredentials: true
    })
        .then((response) => {
            console.log(response.data)
            const stores = response.data.stores || [];

            console.log(stores)

            $('#storeContainer').html(stores.map((store) =>
                `
              <a 
                class="flex items-center gap-3 border border-gray-200 rounded-xl p-4 hover:border-brand/30 transition store-card" 
                href="/stores/${store.id}/dashboard" target="_blank">
                  <img src="https://cdn.cococe.rw/business/images/stores/${store.id}.png" class="border border-gray-100 p-3 rounded max-w-[100px]">
                  <div class="flex items-start justify-between">
                    <div>
                      <h4 class="font-semibold text-gray-900">${store.name}</h4>
                      <p class="text-sm text-gray-500">${store.physical_address}</p>
                      <p class="text-xs text-gray-400 mt-1">Listings: ${store.total_listings} · Orders: ${store.total_orders}</p>
                    </div>
                    <span class="status-badge ${store.status} capitalize">${store.status}</span>
                  </div>
              </a>
            `
            ).join(''));
        }).catch((err) => {
            console.log(err);
            Notification.showNotification({
                type: 'error',
                message: err.response?.data?.message || 'Unable to get stores — Internal Server Error'
            })
        }).finally(() => {
            $('.store-container').show();
            $('#storeLoader').hide();
            fetchedStore = true;
        })
}

(function () {


    // ---------- Generic helpers ----------
    function bindClearButton(inputId, clearId) {
        const input = document.getElementById(inputId);
        const clearBtn = document.getElementById(clearId);
        if (!input || !clearBtn) return;

        input.addEventListener('input', function () {
            if (this.value.length > 0) clearBtn.classList.add('visible');
            else clearBtn.classList.remove('visible');
        });
        clearBtn.addEventListener('click', function () {
            input.value = '';
            clearBtn.classList.remove('visible');
            input.focus();
            // trigger filter reset
            input.dispatchEvent(new Event('input', {
                bubbles: true
            }));
        });
    }

    // ---------- ORDERS search ----------
    const ordersInput = document.getElementById('ordersSearchInput');
    const ordersPaymentFilter = document.getElementById('ordersPaymentFilter');
    const ordersDateFilter = document.getElementById('ordersDateFilter');
    const ordersStatusFilter = document.getElementById('ordersStatusFilter');
    const ordersSearchBtn = document.getElementById('ordersSearchBtn');
    const ordersResultsInfo = document.getElementById('ordersResultsInfo');
    const ordersShowingText = document.getElementById('ordersShowingText');
    const orderRows = document.querySelectorAll('#ordersTableBody .order-row');

    function runOrdersFilter() {
        const query = (ordersInput?.value || '').trim().toLowerCase();
        const payment = ordersPaymentFilter?.value || '';
        const dateRange = ordersDateFilter?.value || '';
        const status = ordersStatusFilter?.value || '';
        let visibleCount = 0;

        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        orderRows.forEach(row => {
            const orderId = (row.dataset.order || '').toLowerCase();
            const customer = (row.dataset.customer || '').toLowerCase();
            const email = (row.dataset.email || '').toLowerCase();
            const rowStatus = row.dataset.status || '';
            const rowPayment = row.dataset.payment || '';
            const rowDateStr = row.dataset.date || '';

            const matchQuery = !query || orderId.includes(query) || customer.includes(query) || email.includes(query);
            const matchPayment = !payment || rowPayment === payment;
            const matchStatus = !status || rowStatus === status;

            // Date filter
            let matchDate = true;
            if (dateRange && rowDateStr) {
                const rowDate = new Date(rowDateStr);
                if (dateRange === 'today') {
                    matchDate = rowDate >= startOfToday;
                } else if (dateRange === '7days') {
                    const d = new Date(startOfToday);
                    d.setDate(d.getDate() - 7);
                    matchDate = rowDate >= d;
                } else if (dateRange === '30days') {
                    const d = new Date(startOfToday);
                    d.setDate(d.getDate() - 30);
                    matchDate = rowDate >= d;
                }
            }

            if (matchQuery && matchPayment && matchStatus && matchDate) {
                row.style.display = '';
                visibleCount++;
            } else {
                row.style.display = 'none';
            }
        });

        if (ordersResultsInfo) {
            if (query || payment || dateRange || status) {
                ordersResultsInfo.textContent = visibleCount + ' result' + (visibleCount !== 1 ? 's' : '') + ' found';
            } else {
                ordersResultsInfo.textContent = '';
            }
        }
        if (ordersShowingText) {
            ordersShowingText.textContent = 'Showing 1-' + visibleCount + ' of 1,284 items';
        }
    }

    // Bind orders events
    bindClearButton('ordersSearchInput', 'ordersSearchClear');
    ordersInput?.addEventListener('input', runOrdersFilter);
    ordersPaymentFilter?.addEventListener('change', runOrdersFilter);
    ordersDateFilter?.addEventListener('change', runOrdersFilter);
    ordersStatusFilter?.addEventListener('change', runOrdersFilter);
    ordersSearchBtn?.addEventListener('click', runOrdersFilter);
    ordersInput?.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') runOrdersFilter();
    });
})();