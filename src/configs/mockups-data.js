// data/catalog.js
// ─────────────────────────────────────────────────────────────
// Mock data for the COCOCE marketplace (CommonJS).
// Replace with DB / API calls later — the shape stays the same.
// ─────────────────────────────────────────────────────────────

// ─── Navigation ───────────────────────────────────────────────
const navLinks = [
  { label: 'Laptops',     href: '/category/laptops',     active: false },
  { label: 'Computers',   href: '/category/computers',   active: false },
  { label: 'Gaming',      href: '/category/gaming',      active: false },
  { label: 'Monitors',    href: '/category/monitors',    active: false },
  { label: 'Accessories', href: '/category/accessories', active: false },
  { label: 'Networking',  href: '/category/networking',  active: false },
  { label: 'Storage',     href: '/category/storage',     active: false },
  { label: '🔥 Deals',    href: '/deals',                active: true  }
];

// ─── Hero carousel slides ─────────────────────────────────────
const heroSlides = [
  {
    title: 'MacBook Pro 16"',
    description: 'Supercharged by M3 Pro',
    price: 'From Rwf 1,025,000',
    badge: 'New arrival',
    image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600&h=400&fit=crop&auto=format'
  },
  {
    title: 'Dell XPS 15',
    description: 'Powerful. Portable. Premium.',
    price: 'From Rwf 925,000',
    badge: 'Best seller',
    image: 'https://images.unsplash.com/photo-1593642702821-c8da6771f0c6?w=600&h=400&fit=crop&auto=format'
  },
  {
    title: 'PlayStation 5',
    description: 'Next-gen gaming console',
    price: 'From Rwf 750,000',
    badge: 'Hot deal',
    image: 'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=600&h=400&fit=crop&auto=format'
  },
  {
    title: 'Samsung Odyssey G9',
    description: '49" curved gaming monitor',
    price: 'From Rwf 1,000,000',
    badge: 'Limited stock',
    image: 'https://images.unsplash.com/photo-1585792180666-f7347c490ee2?w=600&h=400&fit=crop&auto=format'
  }
];

// ─── Categories ───────────────────────────────────────────────
const categories = [
  {
    slug: 'laptops',
    name: 'Laptops',
    subtitle: 'Work & productivity',
    image: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400&h=400&fit=crop&auto=format'
  },
  {
    slug: 'computers',
    name: 'Computers',
    subtitle: 'Desktops & workstations',
    image: 'https://images.unsplash.com/photo-1593640408182-31c70c8268f5?w=400&h=400&fit=crop&auto=format'
  },
  {
    slug: 'gaming',
    name: 'Gaming',
    subtitle: 'Consoles & gaming gear',
    image: 'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=400&h=400&fit=crop&auto=format'
  },
  {
    slug: 'monitors',
    name: 'Monitors',
    subtitle: 'Displays & screens',
    image: 'https://images.unsplash.com/photo-1585792180666-f7347c490ee2?w=400&h=400&fit=crop&auto=format'
  },
  {
    slug: 'accessories',
    name: 'Accessories',
    subtitle: 'Keyboards, mice & more',
    image: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=400&h=400&fit=crop&auto=format'
  },
  {
    slug: 'networking',
    name: 'Networking',
    subtitle: 'Routers & connectivity',
    image: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=400&h=400&fit=crop&auto=format'
  },
  {
    slug: 'storage',
    name: 'Storage',
    subtitle: 'SSDs & storage',
    image: 'https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=400&h=400&fit=crop&auto=format'
  },
  {
    slug: 'phones',
    name: 'Phones & Tablets',
    subtitle: 'Mobile technology',
    image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400&h=400&fit=crop&auto=format'
  }
];

// ─── Featured products ────────────────────────────────────────
const featuredProducts = [
  {
    id: 1,
    name: 'Lenovo ThinkPad X1 Carbon Gen 11',
    price: 1649.99,
    originalPrice: 1899.99,
    rating: 4.7,
    reviews: 234,
    badge: 'Best Seller',
    image: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=400&h=400&fit=crop&auto=format'
  },
  {
    id: 2,
    name: 'ASUS ROG Strix G16 Gaming Laptop',
    price: 1299.99,
    originalPrice: 1499.99,
    rating: 4.5,
    reviews: 187,
    badge: 'Hot',
    image: 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=400&h=400&fit=crop&auto=format'
  },
  {
    id: 3,
    name: 'Dell UltraSharp 27" 4K Monitor',
    price: 549.99,
    originalPrice: 699.99,
    rating: 4.8,
    reviews: 412,
    badge: 'Top Rated',
    image: 'https://images.unsplash.com/photo-1585792180666-f7347c490ee2?w=400&h=400&fit=crop&auto=format'
  },
  {
    id: 4,
    name: 'Logitech MX Master 3S Wireless Mouse',
    price: 89.99,
    originalPrice: 99.99,
    rating: 4.9,
    reviews: 892,
    badge: "Editor's Choice",
    image: 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=400&h=400&fit=crop&auto=format'
  },
  {
    id: 5,
    name: 'Samsung 980 Pro 2TB NVMe SSD',
    price: 179.99,
    originalPrice: 249.99,
    rating: 4.8,
    reviews: 567,
    badge: 'Deal',
    image: 'https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=400&h=400&fit=crop&auto=format'
  },
  {
    id: 6,
    name: 'Keychron K8 Pro Mechanical Keyboard',
    price: 109.99,
    originalPrice: 139.99,
    rating: 4.6,
    reviews: 321,
    badge: '',
    image: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=400&h=400&fit=crop&auto=format'
  },
  {
    id: 7,
    name: 'HP Spectre x360 14" 2-in-1',
    price: 1399.99,
    originalPrice: 1599.99,
    rating: 4.5,
    reviews: 156,
    badge: '',
    image: 'https://images.unsplash.com/photo-1544006659-f0b21884ce1d?w=400&h=400&fit=crop&auto=format'
  },
  {
    id: 8,
    name: 'Sony WH-1000XM5 Headphones',
    price: 349.99,
    originalPrice: 399.99,
    rating: 4.9,
    reviews: 1023,
    badge: 'Top Rated',
    image: 'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=400&h=400&fit=crop&auto=format'
  }
];

// ─── Today's Deals ────────────────────────────────────────────
const dealProducts = [
  {
    id: 101,
    name: 'Acer Nitro 5 Gaming Laptop',
    price: 749.99,
    originalPrice: 999.99,
    rating: 4.4,
    reviews: 312,
    image: 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=400&h=400&fit=crop&auto=format'
  },
  {
    id: 102,
    name: 'LG UltraGear 27" 144Hz Monitor',
    price: 249.99,
    originalPrice: 399.99,
    rating: 4.6,
    reviews: 189,
    image: 'https://images.unsplash.com/photo-1585792180666-f7347c490ee2?w=400&h=400&fit=crop&auto=format'
  },
  {
    id: 103,
    name: 'Razer BlackWidow V4 Pro Keyboard',
    price: 129.99,
    originalPrice: 189.99,
    rating: 4.7,
    reviews: 245,
    image: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=400&h=400&fit=crop&auto=format'
  },
  {
    id: 104,
    name: 'Corsair Vengeance 32GB DDR5 RAM',
    price: 109.99,
    originalPrice: 159.99,
    rating: 4.8,
    reviews: 421,
    image: 'https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=400&h=400&fit=crop&auto=format'
  },
  {
    id: 105,
    name: 'WD Black 4TB External HDD',
    price: 89.99,
    originalPrice: 129.99,
    rating: 4.5,
    reviews: 678,
    image: 'https://images.unsplash.com/photo-1531492746076-161ca9bcad58?w=400&h=400&fit=crop&auto=format'
  },
  {
    id: 106,
    name: 'TP-Link AXE16000 WiFi 6E Router',
    price: 249.99,
    originalPrice: 349.99,
    rating: 4.6,
    reviews: 156,
    image: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=400&h=400&fit=crop&auto=format'
  }
];

// ─── Brands ───────────────────────────────────────────────────
const brands = ['Lenovo', 'HP', 'Dell', 'ASUS', 'Samsung', 'Sony'];

// ─── Why COCOCE benefits ──────────────────────────────────────
const benefits = [
  {
    title: 'Quality Products',
    description: 'Discover carefully selected technology products from recognized brands.'
  },
  {
    title: 'Great Value',
    description: 'Compare products and discover offers designed to give you more value.'
  },
  {
    title: 'Easy Shopping',
    description: 'Search, compare and order products through a simple customer experience.'
  },
  {
    title: 'Secure Experience',
    description: 'A customer experience designed with account and transaction security in mind.'
  }
];

// ─── Exports (CommonJS) ───────────────────────────────────────
module.exports = {
  navLinks,
  heroSlides,
  categories,
  featuredProducts,
  dealProducts,
  brands,
  benefits
};