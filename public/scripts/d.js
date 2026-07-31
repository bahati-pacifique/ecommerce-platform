const sidebarToggle = document.getElementById('sidebarToggle');
const sidebar = document.getElementById('sidebar');
let isSidebarCollapsed = false;

let productCategories = [];

sidebarToggle.addEventListener('click', function () {
    isSidebarCollapsed = !isSidebarCollapsed;
    sidebar.classList.toggle('collapsed', isSidebarCollapsed);

    // Update button text/icon
    const icon = this.querySelector('svg');
    //const text = this.querySelector('.toggle-text');
    if (isSidebarCollapsed) {
        //text.textContent = 'Expand';
        icon.innerHTML = `
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
        `;
    } else {
        //text.textContent = 'Collapse';
        icon.innerHTML = `
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
        `;
    }
});

// ========== MOBILE SIDEBAR ==========
const overlay = document.getElementById('sidebarOverlay');
const mobileMenuBtn = document.getElementById('mobileMenuBtn');

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

// ========== SIDEBAR NAVIGATION ==========
const sidebarLinks = document.querySelectorAll('.sidebar-link');

const tabContents = {
    home: document.getElementById('tab-home'),
    profile: document.getElementById('tab-profile'),
    business: document.getElementById('tab-business'),
    orders: document.getElementById('tab-orders'),
    inventory: document.getElementById('tab-inventory'),
    categories: document.getElementById('tab-categories'),
    families: document.getElementById('tab-families'),
    customers: document.getElementById('tab-customers'),
    analytics: document.getElementById('tab-analytics'),
    marketing: document.getElementById('tab-marketing'),
    settings: document.getElementById('tab-settings'),
    'quick-actions': document.getElementById('tab-quick-actions'),
    help: document.getElementById('tab-help'),
};

const tabLabelMap = {
    home: 'Home',
    profile: 'Admin Profile',
    business: 'Business Profile',
    orders: 'Orders',
    inventory: 'Inventory',
    customers: 'Customers',
    categories: 'Categories',
    families: 'Families',
    analytics: 'Analytics',
    marketing: 'Marketing',
    settings: 'Settings',
    'quick-actions': 'Quick Actions',
    help: 'Help & Support'
};

let currentTab = 'home';

sidebarLinks.forEach(link => {
    link.addEventListener('click', function (e) {
        e.preventDefault();

        // Remove active from all links
        sidebarLinks.forEach(l => l.classList.remove('active'));
        this.classList.add('active');

        // Hide all tab contents
        Object.values(tabContents).forEach(content => {
            if (content) content.classList.add('hidden');
        });


        const tabId = this.dataset.tab;

        if (currentTab !== tabId) {
            switch (tabId) {
                case 'categories':
                    fetchCategories(1, false);
                    break;
                case 'families':
                    fetchFamilies(1, false);
                    initCategorySelector();
                    break;
            }
        }

        currentTab = tabId;

        if (tabContents[tabId]) {
            tabContents[tabId].classList.remove('hidden');
        }

        // Update breadcrumb label
        const label = document.getElementById('currentTabLabel');
        if (label && tabLabelMap[tabId]) {
            label.textContent = tabLabelMap[tabId];
        }
    });
});

// ========== TOP BAR MODAL ==========
const modalTrigger = document.getElementById('topBarModalTrigger');
const modal = document.getElementById('topBarModal');
const closeModalBtn = document.getElementById('closeModalBtn');

function openModal() {
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    modal.classList.add('hidden');
    document.body.style.overflow = '';
}

modalTrigger.addEventListener('click', openModal);
closeModalBtn.addEventListener('click', closeModal);

modal.addEventListener('click', function (e) {
    if (e.target === this) {
        closeModal();
    }
});

document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
        closeModal();
    }
});

// ========== CHARTS ==========
// Sales Chart
const salesCtx = document.getElementById('salesChart').getContext('2d');
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
                display: false,
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                grid: {
                    color: 'rgba(0,0,0,0.04)',
                }
            },
            x: {
                grid: {
                    display: false,
                }
            }
        }
    }
});

// Order Status Chart
const orderCtx = document.getElementById('orderChart').getContext('2d');
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
                    pointStyle: 'circle',
                }
            }
        },
        cutout: '70%',
    }
});

// ========== MODAL LINK ITEMS (Demo) ==========
document.querySelectorAll('.modal-link-item').forEach(item => {

    item.addEventListener('click', function (e) {
        e.preventDefault();
        const title = this.querySelector('p')?.textContent || 'Action';
        alert(`🚀 "${title}" — Coming soon in COCOCE Admin!`);
        closeModal();
    });
});

// ========== DEMO: Other tab interactions ==========
// document.querySelectorAll('.tab-content:not(#tab-home)').forEach(content => {
//   const links = content.querySelectorAll('a, button');
//   links.forEach(link => {
//     link.addEventListener('click', function(e) {
//       e.preventDefault();

//       const text = this.textContent.trim() || 'feature';
//       alert(`📌 "${text}" — Coming soon in COCOCE Admin!`);
//     });
//   });
// });

$(document).ready(() => {
    Notification.showNotification({
        title: 'Hey!',
        type: 'warning',
        message: 'You are visiting this page for testing & mockup purposes — No real data is being presented!'
    });
})