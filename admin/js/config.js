export const APP_CONFIG = {
  appName: 'Linkadda Admin',
  appSlug: 'linkadda-admin',
  themeKey: 'linkadda_admin_theme',
  sessionKey: 'linkadda_admin_session',
  commandKey: 'linkadda_admin_commands',
  publicBaseUrl: '/',
};

export const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyCD_cZXyfYd01FNg-DmRpyKKBIGR3NqeT4',
  authDomain: 'linkadda-cd1da.firebaseapp.com',
  databaseURL: 'https://linkadda-cd1da-default-rtdb.firebaseio.com',
  projectId: 'linkadda-cd1da',
  storageBucket: 'linkadda-cd1da.firebasestorage.app',
  messagingSenderId: '989651324387',
  appId: '1:989651324387:web:f6e44be3daa9f4fc0c24d6',
  measurementId: 'G-PCH50PK2N7',
};

// RustFS S3-compatible public config (No secrets on frontend!)
export const RUSTFS_CONFIG = {
  endpoint: 'https://rustfs-mi5c.srv1942099.hstgr.cloud',
  bucket: 'linkadda-media',
  region: 'us-east-1',
};

// Supabase config retained for zero-downtime transition & backward compatibility
export const SUPABASE_CONFIG = {
  url: 'https://noecylfqhtfwbjfkjxoo.supabase.co',
  anonKey: 'sb_publishable_HHXzUZGaMXTpCXQVqiNBwQ_ZEbe_E2z',
  bucket: 'media',
};

export const RTDB_NODES = {
  hero: 'hero',
  categories: 'categories',
  products: 'products',
  events: 'events',
  banner: 'banner',
  faq: 'faq',
  testimonials: 'testimonials',
  settings: 'settings',
  payment: 'payment',
  orders: 'orders',
  analytics: 'analytics',
  media: 'media',
  visitors: 'visitors',
};

export const NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard', icon: 'layout-dashboard' },
  { key: 'catalog', label: 'Catalog', icon: 'package' },
  { key: 'media', label: 'Media', icon: 'image-plus' },
  { key: 'hero', label: 'Hero', icon: 'sparkles' },
  { key: 'banner', label: 'Banner', icon: 'badge-percent' },
  { key: 'faq', label: 'FAQ', icon: 'help-circle' },
  { key: 'testimonials', label: 'Testimonials', icon: 'messages-square' },
  { key: 'settings', label: 'Settings', icon: 'settings-2' },
  { key: 'payment', label: 'Payment', icon: 'credit-card' },
  { key: 'orders', label: 'Orders', icon: 'receipt-text' },
  { key: 'screenshots', label: 'Screenshots', icon: 'image' },
  { key: 'analytics', label: 'Analytics', icon: 'bar-chart-3' },
];

export const DEFAULT_EMPTY = {
  title: '',
  slug: '',
  description: '',
  category: '',
  priceINR: '',
  priceUSD: '',
  badge: '',
  image: '',
  images: [],
  galleryImages: [],
  video: '',
  videos: [],
  status: 'active',
  displayOrder: 0,
};
