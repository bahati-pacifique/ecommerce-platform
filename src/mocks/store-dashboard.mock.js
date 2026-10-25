// apps/business/mocks/dashboard.mock.js
//
// Realistic dashboard payload for local development.
// Same shape as the real API response.
//
// Toggle via env var: DASHBOARD_USE_MOCK=1

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function daysAgoISO(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

const currency = 'RWF';

const mockDashboard = {
  success: true,
  data: {
    period: {
      key: '7d',
      label: 'Last 7 days',
      from: daysAgoISO(7),
      to: daysAgoISO(0),
    },
    generated_at: new Date().toISOString(),

    core: {
      sales: {
        current_sales: '1845000',      // RWF 1,845,000
        previous_sales: '1620000',     // RWF 1,620,000
        current_orders: 42,
        previous_orders: 37,
        currency,
      },
      orders: {
        current_customers: 38,
        previous_customers: 31,
      },
      products: {
        total_listings: 246,
        active_listings: 231,
      },
      inventory: {
        low_stock: 12,
        out_of_stock: 3,
      },
      reviews: {
        average_rating: '4.72',
        total_reviews: 342,
        rating_1: 4,
        rating_2: 8,
        rating_3: 20,
        rating_4: 70,
        rating_5: 240,
        reviews_this_month: 42,
        reviews_in_period: 18,
        responded_in_period: 17,
      },
      visits: {
        current_visits: 12480,
        previous_visits: 11200,
        weekly: [
          { day: 'Sun', visits: 1200 },
          { day: 'Mon', visits: 1580 },
          { day: 'Tue', visits: 1720 },
          { day: 'Wed', visits: 1420 },
          { day: 'Thu', visits: 1980 },
          { day: 'Fri', visits: 2360 },
          { day: 'Sat', visits: 2220 },
        ],
        best_hour_range: '14:00 - 16:00',
      },
      search: {
        current_appearances: 8620,
        previous_appearances: 7900,
        current_clicks: 1240,
      },
      followers: {
        total_followers: 128,
        new_followers_in_period: 12,
        new_followers_this_week: 9,
      },
      response: {
        rate: 94,
        avg_minutes: 18,
      },
      pending_orders: {
        value: 7,
      },
    },

    sales_overview: {
      series: [
        { date: daysAgo(7),  revenue: '210500',  orders: 5 },
        { date: daysAgo(6),  revenue: '320000',  orders: 8 },
        { date: daysAgo(5),  revenue: '280750',  orders: 6 },
        { date: daysAgo(4),  revenue: '410020',  orders: 9 },
        { date: daysAgo(3),  revenue: '390000',  orders: 8 },
        { date: daysAgo(2),  revenue: '520000',  orders: 11 },
        { date: daysAgo(1),  revenue: '327955',  orders: 7 },
      ],
      previous_series: [
        { date: daysAgo(14), revenue: '190000',  orders: 4 },
        { date: daysAgo(13), revenue: '280000',  orders: 6 },
        { date: daysAgo(12), revenue: '260000',  orders: 5 },
        { date: daysAgo(11), revenue: '310000',  orders: 7 },
        { date: daysAgo(10), revenue: '350000',  orders: 8 },
        { date: daysAgo(9),  revenue: '270000',  orders: 6 },
        { date: daysAgo(8),  revenue: '290000',  orders: 7 },
      ],
    },

    inventory_alerts: {
      items: [
        {
          listing_id: 'l-001',
          title: 'iPhone 15 Pro Case — Black',
          sku: 'IP15P-BLK',
          stock: 4,
          threshold: 10,
          status: 'low',
          image: 'https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?w=200',
        },
        {
          listing_id: 'l-002',
          title: 'USB-C Fast Charger 45W',
          sku: 'USBC-45W',
          stock: 2,
          threshold: 10,
          status: 'low',
          image: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=200',
        },
        {
          listing_id: 'l-003',
          title: 'Wireless Mouse',
          sku: 'WM-204',
          stock: 0,
          threshold: 5,
          status: 'out_of_stock',
          image: null,
        },
      ],
    },

    orders_attention: {
      total: 7,
      items: [
        {
          id: 'ORD-10245',
          customer: { id: 'c-001', name: 'Jean M.' },
          items_count: 2,
          total: 120000,
          currency,
          status: 'to_ship',
          status_label: 'To Ship',
          placed_at: daysAgoISO(0),
        },
        {
          id: 'ORD-10244',
          customer: { id: 'c-002', name: 'Alice K.' },
          items_count: 1,
          total: 85000,
          currency,
          status: 'processing',
          status_label: 'Processing',
          placed_at: daysAgoISO(0),
        },
        {
          id: 'ORD-10241',
          customer: { id: 'c-003', name: 'Eric N.' },
          items_count: 3,
          total: 240000,
          currency,
          status: 'return',
          status_label: 'Return',
          placed_at: daysAgoISO(1),
        },
        {
          id: 'ORD-10239',
          customer: { id: 'c-004', name: 'Diane U.' },
          items_count: 4,
          total: 315000,
          currency,
          status: 'to_ship',
          status_label: 'To Ship',
          placed_at: daysAgoISO(2),
        },
        {
          id: 'ORD-10235',
          customer: { id: 'c-005', name: 'Kevin R.' },
          items_count: 2,
          total: 94000,
          currency,
          status: 'processing',
          status_label: 'Processing',
          placed_at: daysAgoISO(3),
        },
      ],
    },

    most_visited_listing: {
      id: 'l-001',
      title: 'iPhone 15 Pro Case — Black',
      image: 'https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?w=200',
      visits: 1840,
      ctr: 4.2,
      change_pct: 18.3,
    },

    top_listings: [
      {
        id: 'l-001',
        title: 'iPhone 15 Pro Case — Black',
        image: 'https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?w=80',
        visits: 1840,
        ctr: 4.2,
        orders: 26,
      },
      {
        id: 'l-002',
        title: 'USB-C Fast Charger 45W',
        image: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=80',
        visits: 1420,
        ctr: 3.8,
        orders: 18,
      },
      {
        id: 'l-004',
        title: 'Wireless Headphones — Midnight Blue',
        image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=80',
        visits: 1180,
        ctr: 3.1,
        orders: 11,
      },
      {
        id: 'l-005',
        title: 'Aluminium Laptop Stand',
        image: 'https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?w=80',
        visits: 940,
        ctr: 2.9,
        orders: 8,
      },
    ],
  },
};

module.exports = { mockDashboard };