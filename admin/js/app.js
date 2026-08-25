import { APP_CONFIG, NAV_ITEMS } from './config.js';
import { RTDB_NODES } from './config.js';
import { protectRoute, logout } from './auth.js';
import {
  startRealtime,
  subscribe,
  stats,
  recentActivity,
  recentOrders,
  recentProducts,
  listCollection,
  getItem,
  createRecord,
  saveRecord,
  updateRecord,
  deleteRecord,
  duplicateRecord,
} from './state.js';
import { uploadAsset, deletePublicAsset } from './storage.js';
import { fetchCurrentSiteCatalog, normalizeCatalogRecords } from './site-import.js';
import {
  escapeHtml,
  slugify,
  formatDateTime,
  formatNumber,
  fromLines,
  safeJson,
  safeUrl,
  uid,
} from './utils.js';

const viewRoot = document.getElementById('viewRoot');
const sideNav = document.getElementById('sideNav');
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebarOverlay');
const sidebarCloseBtn = document.getElementById('sidebarCloseBtn');
const toastHost = document.getElementById('toastHost');
const modalBackdrop = document.getElementById('modalBackdrop');
const modalRoot = document.getElementById('modalRoot');
const paletteBackdrop = document.getElementById('paletteBackdrop');
const paletteList = document.getElementById('paletteList');
const commandInput = document.getElementById('commandInput');
const notifyBtn = document.getElementById('notifyBtn');
const notifyCount = document.getElementById('notifyCount');
const userAvatar = document.getElementById('userAvatar');
const userName = document.getElementById('userName');
const userEmail = document.getElementById('userEmail');
const CATALOG_PREF_KEY = 'linkadda_admin_catalog_prefs';

function readCatalogPrefs() {
  try {
    return JSON.parse(localStorage.getItem(CATALOG_PREF_KEY) || '{}') || {};
  } catch (_) {
    return {};
  }
}

function writeCatalogPrefs(next) {
  try {
    localStorage.setItem(CATALOG_PREF_KEY, JSON.stringify(next || {}));
  } catch (_) {
    // Ignore storage write failures.
  }
}

const catalogPrefs = readCatalogPrefs();

const ui = {
  route: 'dashboard',
  catalogTab: 'products',
  dashboardRange: 'day',
  dashboardMetric: 'visitors',
  media: {
    search: '',
    folder: 'all',
    type: 'all',
    sort: 'newest',
    view: 'grid',
    status: '',
  },
  management: {
    search: '',
    status: 'all',
    method: 'all',
    date: 'all',
  },
  catalogFiltersOpen: typeof catalogPrefs.catalogFiltersOpen === 'boolean'
    ? catalogPrefs.catalogFiltersOpen
    : !isMobileViewport(),
  search: '',
  commandSearch: '',
  sort: 'updatedAt',
  catalogView: 'list',
  catalogPageSize: Number(catalogPrefs.pageSize) || 8,
  filters: {
    status: catalogPrefs.status || 'all',
    category: catalogPrefs.category || 'all',
  },
  page: 1,
  modal: null,
  data: null,
  notificationsOpen: false,
  selection: new Set(),
};

function persistCatalogPrefs() {
  writeCatalogPrefs({
    view: ui.catalogView,
    pageSize: ui.catalogPageSize,
    status: ui.filters.status,
    category: ui.filters.category,
    sort: ui.sort,
    search: ui.search,
    tab: ui.catalogTab,
    catalogFiltersOpen: ui.catalogFiltersOpen,
  });
}

function syncCatalogPrefs(next = {}) {
  Object.assign(ui, next);
  persistCatalogPrefs();
}

function resetCatalogFilters() {
  ui.search = '';
  ui.sort = 'updatedAt';
  ui.filters.status = 'all';
  ui.filters.category = 'all';
  ui.catalogPageSize = 8;
  ui.page = 1;
  persistCatalogPrefs();
  closeCatalogActionMenus();
  renderView(ui.data || {});
}

const collectionSchemas = {
  products: {
    title: 'Products',
    node: 'products',
    label: 'Product',
    description: 'Manage every product that appears across the public site.',
    fields: [
      { key: 'title', label: 'Title', type: 'text', required: true },
      { key: 'slug', label: 'Slug', type: 'text', required: true },
      { key: 'category', label: 'Category', type: 'text' },
      { key: 'description', label: 'Description', type: 'textarea' },
      { key: 'priceINR', label: 'Price INR', type: 'text' },
      { key: 'priceUSD', label: 'Price USD', type: 'text' },
      { key: 'badge', label: 'Badge', type: 'text' },
      { key: 'badgeStyle', label: 'Badge Style', type: 'text' },
      { key: 'badgeIcon', label: 'Badge Icon', type: 'text' },
      { key: 'image', label: 'Main Image', type: 'text', hint: 'Paste a URL or use the file picker below.' },
      { key: 'video', label: 'Main Video', type: 'text' },
      { key: 'galleryImages', label: 'Gallery Images', type: 'textarea', hint: 'One URL per line or upload multiple files.' },
      { key: 'creators', label: 'Creators', type: 'textarea', hint: 'Comma or line separated' },
      { key: 'platforms', label: 'Platforms', type: 'textarea', hint: 'Comma or line separated' },
      { key: 'features', label: 'Features', type: 'textarea', hint: 'One feature per line' },
      { key: 'orderLink', label: 'Order Link', type: 'text' },
      { key: 'status', label: 'Status', type: 'select', options: ['active', 'hidden', 'draft', 'deleted'] },
      { key: 'displayOrder', label: 'Display Order', type: 'number' },
    ],
    columns: [
      { key: 'title', label: 'Title' },
      { key: 'category', label: 'Category' },
      { key: 'price', label: 'Price' },
      { key: 'status', label: 'Status' },
      { key: 'updatedAt', label: 'Updated' },
    ],
  },
  categories: {
    title: 'Categories',
    node: 'categories',
    label: 'Category',
    description: 'Manage product groups. Categories only store grouping details, not product-specific fields.',
    fields: [
      { key: 'title', label: 'Title', type: 'text', required: true },
      { key: 'slug', label: 'Slug', type: 'text', required: true },
      { key: 'description', label: 'Description', type: 'textarea' },
      { key: 'image', label: 'Category Image', type: 'text', hint: 'Optional. Paste a URL or use the file picker below.' },
      { key: 'status', label: 'Status', type: 'select', options: ['active', 'hidden', 'draft', 'deleted'] },
      { key: 'displayOrder', label: 'Display Order', type: 'number' },
    ],
    columns: [
      { key: 'title', label: 'Title' },
      { key: 'status', label: 'Status' },
      { key: 'updatedAt', label: 'Updated' },
    ],
  },
  faq: {
    title: 'FAQ',
    node: 'faq',
    label: 'FAQ Item',
    description: 'Edit accordion questions and answers.',
    fields: [
      { key: 'question', label: 'Question', type: 'text', required: true },
      { key: 'answer', label: 'Answer', type: 'textarea', required: true },
      { key: 'status', label: 'Status', type: 'select', options: ['active', 'hidden'] },
      { key: 'displayOrder', label: 'Display Order', type: 'number' },
    ],
    columns: [
      { key: 'question', label: 'Question' },
      { key: 'status', label: 'Status' },
      { key: 'updatedAt', label: 'Updated' },
    ],
  },
  testimonials: {
    title: 'Testimonials',
    node: 'testimonials',
    label: 'Testimonial',
    description: 'Manage social proof content.',
    fields: [
      { key: 'name', label: 'Name', type: 'text', required: true },
      { key: 'rating', label: 'Rating', type: 'number', required: true },
      { key: 'photo', label: 'Photo URL', type: 'url' },
      { key: 'review', label: 'Review', type: 'textarea', required: true },
      { key: 'status', label: 'Status', type: 'select', options: ['active', 'hidden'] },
      { key: 'displayOrder', label: 'Display Order', type: 'number' },
    ],
    columns: [
      { key: 'name', label: 'Name' },
      { key: 'rating', label: 'Rating' },
      { key: 'status', label: 'Status' },
      { key: 'updatedAt', label: 'Updated' },
    ],
  },
};

const singleEditors = {
  hero: {
    title: 'Hero',
    description: 'Edit the homepage hero section without changing layout or animation.',
    fields: [
      { key: 'title', label: 'Hero Title', type: 'text' },
      { key: 'subtitle', label: 'Subtitle', type: 'textarea' },
      { key: 'primaryButtonText', label: 'Primary Button Text', type: 'text' },
      { key: 'primaryButtonLink', label: 'Primary Button Link', type: 'url' },
      { key: 'secondaryButtonText', label: 'Secondary Button Text', type: 'text' },
      { key: 'secondaryButtonLink', label: 'Secondary Button Link', type: 'url' },
      { key: 'stat1', label: 'Stat 1', type: 'text' },
      { key: 'stat2', label: 'Stat 2', type: 'text' },
      { key: 'stat3', label: 'Stat 3', type: 'text' },
      { key: 'backgroundImage', label: 'Background Image', type: 'url' },
      { key: 'status', label: 'Status', type: 'select', options: ['active', 'hidden'] },
    ],
  },
  banner: {
    title: 'Pinned Deal Banner',
    description: 'Manage the special pinned deal banner shown on the home page.',
    fields: [
      { key: 'title', label: 'Banner Title', type: 'text' },
      { key: 'description', label: 'Description', type: 'textarea' },
      { key: 'priceOriginal', label: 'Original Price (e.g. ₹10,900)', type: 'text' },
      { key: 'priceOfferINR', label: 'Offer Price INR (e.g. ₹4,399)', type: 'text' },
      { key: 'priceOfferUSD', label: 'Offer Price USD (e.g. $109)', type: 'text' },
      { key: 'buttonText', label: 'Button Text', type: 'text' },
      { key: 'buttonLink', label: 'Button Link', type: 'text' },
      { key: 'status', label: 'Status', type: 'select', options: ['active', 'hidden'] },
    ],
  },
  settings: {
    title: 'Website Settings',
    description: 'Global settings for logo, contact links, footer and favicon.',
    fields: [
      { key: 'siteName', label: 'Website Name', type: 'text' },
      { key: 'logo', label: 'Logo URL', type: 'url' },
      { key: 'favicon', label: 'Favicon URL', type: 'url' },
      { key: 'whatsapp', label: 'WhatsApp', type: 'text' },
      { key: 'telegram', label: 'Telegram', type: 'text' },
      { key: 'email', label: 'Email', type: 'email' },
      { key: 'footer', label: 'Footer Text', type: 'textarea' },
      { key: 'socialLinks', label: 'Social Links', type: 'textarea', hint: 'One URL per line' },
      { key: 'maintenanceMode', label: 'Maintenance Mode', type: 'select', options: ['active', 'hidden'] },
      { key: 'publicSiteSync', label: 'Public Website Status', type: 'text' },
      { key: 'currency', label: 'Currency', type: 'text' },
      { key: 'currencySymbol', label: 'Currency Symbol', type: 'text' },
      { key: 'priceFormat', label: 'Price Display Format', type: 'text' },
    ],
  },
  payment: {
    title: 'Payment Settings',
    description: 'Keep the payment flow intact while editing the configurable values.',
    fields: [
      { key: 'recommendedMethod', label: 'Recommended Payment Method (Shown on Top with Badge)', type: 'select', options: [
        { label: 'Binance Pay (Recommended Default)', value: 'binancepay' },
        { label: 'UPI (GPay / PhonePe / Paytm)', value: 'upi' },
        { label: 'USDT BEP-20 (Binance Smart Chain)', value: 'bep20' },
        { label: 'USDT ERC-20 (Ethereum Network)', value: 'eth' },
        { label: 'PayPal (International)', value: 'paypal' },
      ] },
      { key: 'upiId', label: 'UPI ID', type: 'text' },
      { key: 'qrImage', label: 'QR Image URL', type: 'url' },
      { key: 'instructions', label: 'Payment Instructions', type: 'textarea' },
      { key: 'telegramUrl', label: 'Telegram URL', type: 'url' },
      { key: 'telegramChannel', label: 'Telegram Channel', type: 'url' },
      { key: 'bep20Address', label: 'BEP-20 Address', type: 'text' },
      { key: 'ethAddress', label: 'ERC-20 Address', type: 'text' },
      { key: 'binanceId', label: 'Binance ID', type: 'text' },
      { key: 'binanceGiftCardUrl', label: 'Binance Gift Card URL', type: 'url' },
      { key: 'paypalLink', label: 'PayPal Link', type: 'url' },
      { key: 'status', label: 'Status', type: 'select', options: ['active', 'hidden'] },
    ],
  },
};

function showToast(message, type = 'info') {
  const node = document.createElement('div');
  node.className = 'toast';
  node.innerHTML = `<strong>${escapeHtml(type)}</strong><div>${escapeHtml(message)}</div>`;
  toastHost.appendChild(node);
  setTimeout(() => node.remove(), 3200);
}

function setTheme(theme) {
  document.body.dataset.theme = theme;
  localStorage.setItem(APP_CONFIG.themeKey, theme);
}

function getTheme() {
  return localStorage.getItem(APP_CONFIG.themeKey) || (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
}

function initTheme() {
  setTheme(getTheme());
}

function toggleTheme() {
  setTheme(document.body.dataset.theme === 'light' ? 'dark' : 'light');
}

function openModal(html) {
  modalRoot.innerHTML = html;
  modalBackdrop.classList.add('open');
  if (window.lucide) lucide.createIcons();
}

function closeModal() {
  modalBackdrop.classList.remove('open');
  modalRoot.innerHTML = '';
}

function openPalette() {
  paletteBackdrop.classList.add('open');
  renderPalette();
}

function closePalette() {
  paletteBackdrop.classList.remove('open');
}

function isMobileViewport() {
  return window.matchMedia('(max-width: 1180px)').matches;
}

function setSidebarOpen(open) {
  if (!sidebar) return;
  sidebar.classList.toggle('open', open);
  sidebarOverlay?.classList.toggle('open', open);
  document.body.classList.toggle('sidebar-lock', Boolean(open));
  if (sidebarOverlay) sidebarOverlay.setAttribute('aria-hidden', String(!open));
}

function openSidebar() {
  setSidebarOpen(true);
}

function closeSidebar() {
  setSidebarOpen(false);
}

function toggleSidebar() {
  if (!sidebar) return;
  setSidebarOpen(!sidebar.classList.contains('open'));
}

function renderPalette() {
  const items = [
    ...NAV_ITEMS.map((item) => ({ title: item.label, detail: `Open ${item.label}`, action: `goto:${item.key}` })),
    { title: 'Add Product', detail: 'Create a new product record', action: 'create:products' },
    { title: 'Add Category', detail: 'Create a new category record', action: 'create:categories' },
    { title: 'Upload Media', detail: 'Open media manager', action: 'goto:media' },
    { title: 'Logout', detail: 'Sign out from Firebase Auth', action: 'logout' },
  ];
  paletteList.innerHTML = items
    .filter((item) => !ui.commandSearch || `${item.title} ${item.detail}`.toLowerCase().includes(ui.commandSearch.toLowerCase()))
    .map((item) => `
      <button class="palette-item" data-palette-action="${escapeHtml(item.action)}">
        <span><strong>${escapeHtml(item.title)}</strong><br><small>${escapeHtml(item.detail)}</small></span>
        <i data-lucide="arrow-right"></i>
      </button>
    `)
    .join('');
  if (window.lucide) lucide.createIcons();
}

function navMarkup() {
  return NAV_ITEMS.map((item) => `
    <a class="nav-link ${ui.route === item.key ? 'active' : ''}" href="#/${item.key}" data-route="${item.key}">
      <i data-lucide="${escapeHtml(item.icon)}"></i>
      <span>${escapeHtml(item.label)}</span>
    </a>
  `).join('');
}

function collectionRowBadge(item) {
  const status = String(item.status || 'active').toLowerCase();
  if (status === 'active') return '<span class="badge success">Active</span>';
  if (status === 'hidden') return '<span class="badge warning">Hidden</span>';
  if (status === 'draft') return '<span class="badge">Draft</span>';
  if (status === 'deleted') return '<span class="badge danger">Deleted</span>';
  return `<span class="badge">${escapeHtml(status)}</span>`;
}

function buildTableRows(node, columns, items) {
  if (!items.length) {
    return `<tr><td colspan="${columns.length + 1}"><div class="empty-state">No records found.</div></td></tr>`;
  }
  return items.map((item) => {
    const cells = columns.map((column) => {
      let value = item[column.key];
      if (column.key === 'price') value = `${item.priceINR || ''} / ${item.priceUSD || ''}`;
      if (column.key === 'rating') value = `${value || 0}/5`;
      if (column.key === 'updatedAt') value = formatDateTime(value);
      if (column.key === 'status') value = collectionRowBadge(item);
      if (value === undefined || value === null || value === '') value = '-';
      return `<td>${typeof value === 'string' && value.startsWith('<span') ? value : escapeHtml(value)}</td>`;
    }).join('');
    return `
      <tr>
        ${cells}
        <td>
          <div class="item-actions">
            <button class="icon-btn" data-action="edit" data-node="${node}" data-id="${item.id}"><i data-lucide="pencil"></i> Edit</button>
            <button class="icon-btn" data-action="duplicate" data-node="${node}" data-id="${item.id}"><i data-lucide="copy"></i> Duplicate</button>
            <button class="icon-btn" data-action="toggle" data-node="${node}" data-id="${item.id}"><i data-lucide="eye-off"></i> Hide/Show</button>
            <button class="icon-btn" data-action="delete" data-node="${node}" data-id="${item.id}"><i data-lucide="trash-2"></i> Delete</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function sanitizeRecordFromForm(form, fields, existing = {}) {
  const data = { ...existing };
  const linesToArray = ['galleryImages', 'creators', 'platforms', 'features', 'socialLinks'];
  fields.forEach((field) => {
    const el = form.querySelector(`[name="${field.key}"]`);
    if (!el) return;
    let value = el.value.trim();
    if (field.type === 'number') value = value === '' ? 0 : Number(value);
    if (field.type === 'textarea' && linesToArray.includes(field.key)) {
      value = fromLines(value);
    }
    if (field.key === 'slug' && !value) value = slugify(form.querySelector('[name="title"]')?.value || '');
    data[field.key] = value;
  });
  if (data.image && !data.images) data.images = [data.image];
  if (Array.isArray(data.galleryImages)) {
    const current = data.image ? [data.image] : [];
    data.images = [...current, ...data.galleryImages.filter(Boolean)];
  }
  if (data.status === '') data.status = 'active';
  if (!data.displayOrder && data.displayOrder !== 0) data.displayOrder = 0;
  data.updatedAt = Date.now();
  if (!data.createdAt) data.createdAt = Date.now();
  return data;
}

function fieldMarkup(field, value = '', options = {}) {
  const common = `name="${escapeHtml(field.key)}" id="${escapeHtml(field.key)}"`;
  const hint = field.hint ? `<small class="section-subtitle">${escapeHtml(field.hint)}</small>` : '';
  const allowUploads = Boolean(options.allowUploads);
  const uploadBlock = (name, label, accept, multiple = false) => allowUploads ? `
    <div class="field full">
      <label for="${escapeHtml(name)}">${escapeHtml(label)}</label>
      <input class="input" type="file" name="${escapeHtml(name)}" id="${escapeHtml(name)}" accept="${escapeHtml(accept)}"${multiple ? ' multiple' : ''} />
      <small class="section-subtitle">Upload a local file. If selected, this file will be pushed to Supabase and the URL field will update automatically.</small>
    </div>
  ` : '';
  const imageUploadKeys = ['image', 'photo', 'logo', 'favicon', 'qrImage', 'backgroundImage'];
  if (field.type === 'textarea') {
    if (allowUploads && field.key === 'galleryImages') {
      return `
        <div class="field full">
          <label for="${escapeHtml(field.key)}">${escapeHtml(field.label)}</label>
          <textarea class="textarea" ${common} placeholder="${escapeHtml(field.label)}">${escapeHtml(Array.isArray(value) ? value.join('\n') : value || '')}</textarea>
          ${hint}
          ${uploadBlock('galleryFiles', 'Upload Gallery Files', 'image/*', true)}
        </div>
      `;
    }
    return `
      <div class="field ${field.full ? 'full' : ''}">
        <label for="${escapeHtml(field.key)}">${escapeHtml(field.label)}</label>
        <textarea class="textarea" ${common} placeholder="${escapeHtml(field.label)}">${escapeHtml(Array.isArray(value) ? value.join('\n') : value || '')}</textarea>
        ${hint}
      </div>
    `;
  }
  if (field.type === 'select') {
    return `
      <div class="field">
        <label for="${escapeHtml(field.key)}">${escapeHtml(field.label)}</label>
        <select class="select" ${common}>
          ${(field.options || []).map((option) => {
            const val = typeof option === 'object' && option !== null ? option.value : option;
            const lbl = typeof option === 'object' && option !== null ? option.label : option;
            return `<option value="${escapeHtml(val)}" ${String(value) === String(val) ? 'selected' : ''}>${escapeHtml(lbl)}</option>`;
          }).join('')}
        </select>
      </div>
    `;
  }
  if (field.type === 'url') {
    if (allowUploads && imageUploadKeys.includes(field.key)) {
      return `
        <div class="field">
          <label for="${escapeHtml(field.key)}">${escapeHtml(field.label)}</label>
          <input class="input" type="text" inputmode="url" ${common} value="${escapeHtml(value)}" placeholder="${escapeHtml(field.label)}" />
          ${hint}
          ${uploadBlock(`${field.key}File`, `Upload ${field.label}`, 'image/*')}
        </div>
      `;
    }
    return `
      <div class="field">
        <label for="${escapeHtml(field.key)}">${escapeHtml(field.label)}</label>
        <input class="input" type="text" inputmode="url" ${common} value="${escapeHtml(value)}" placeholder="${escapeHtml(field.label)}" />
        ${hint}
      </div>
    `;
  }
  if (allowUploads && imageUploadKeys.includes(field.key)) {
    return `
      <div class="field">
        <label for="${escapeHtml(field.key)}">${escapeHtml(field.label)}</label>
        <input class="input" type="text" ${common} value="${escapeHtml(value)}" placeholder="${escapeHtml(field.label)}" />
        ${hint}
        ${uploadBlock(`${field.key}File`, `Upload ${field.label}`, 'image/*')}
      </div>
    `;
  }
  return `
    <div class="field">
      <label for="${escapeHtml(field.key)}">${escapeHtml(field.label)}</label>
      <input class="input" type="${escapeHtml(field.type || 'text')}" ${common} value="${escapeHtml(value)}" placeholder="${escapeHtml(field.label)}" />
      ${hint}
    </div>
  `;
}

function renderRecordPreview(record = {}) {
  const media = record.image || (Array.isArray(record.images) ? record.images[0] : '') || '';
  const galleryCount = Array.isArray(record.galleryImages) ? record.galleryImages.filter(Boolean).length : 0;
  return `
    <div class="editor-preview glass">
      <div class="editor-preview-media">
        ${media ? `<img src="${escapeHtml(media)}" alt="${escapeHtml(record.title || 'Preview')}" loading="lazy" />` : '<div class="preview-fallback">No image selected</div>'}
      </div>
      <div class="editor-preview-body">
        <div class="editor-preview-badge">${escapeHtml(record.badge || record.category || 'Live Record')}</div>
        <h3>${escapeHtml(record.title || 'Untitled')}</h3>
        <p>${escapeHtml(record.description || 'Add title, image and pricing to preview the live card shape.')}</p>
        <div class="editor-preview-list">
          <div><span>INR</span><strong>${escapeHtml(record.priceINR || '-')}</strong></div>
          <div><span>USD</span><strong>${escapeHtml(record.priceUSD || '-')}</strong></div>
          <div><span>Gallery</span><strong>${escapeHtml(String(galleryCount))}</strong></div>
        </div>
      </div>
    </div>
  `;
}

const PRODUCT_BADGE_STYLE_OPTIONS = [
  { label: 'Default', value: '' },
  { label: 'Gold', value: 'pcard-pill-gold' },
];

function normalizeEditorList(value) {
  if (Array.isArray(value)) return value.map((item) => String(item || '').trim()).filter(Boolean);
  return String(value || '')
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function mergeUniqueList(existing, incoming) {
  const seen = new Set();
  return [...existing, ...incoming].filter((item) => {
    const key = String(item || '').trim();
    if (!key || seen.has(key.toLowerCase())) return false;
    seen.add(key.toLowerCase());
    return true;
  });
}

function renderTagEditor(name, label, value = '', hint = '', placeholder = '') {
  const text = Array.isArray(value) ? value.join('\n') : String(value || '');
  return `
    <div class="field full editor-tag-field" data-tag-field="${escapeHtml(name)}">
      <label for="${escapeHtml(name)}">${escapeHtml(label)}</label>
      <div class="tag-editor-shell">
        <div class="tag-editor-list" data-role="tag-list"></div>
        <div class="tag-editor-row">
          <input class="input tag-editor-input" type="text" data-role="tag-input" placeholder="${escapeHtml(placeholder || `Add ${label.toLowerCase()}`)}" />
          <button type="button" class="btn btn-ghost tag-editor-add" data-role="tag-add">Add</button>
        </div>
        <textarea class="textarea sr-only" name="${escapeHtml(name)}" id="${escapeHtml(name)}" data-role="tag-source">${escapeHtml(text)}</textarea>
      </div>
      ${hint ? `<small class="section-subtitle">${escapeHtml(hint)}</small>` : ''}
    </div>
  `;
}

function renderMediaFallback(label = 'No image selected') {
  return `<div class="preview-fallback">${escapeHtml(label)}</div>`;
}

function renderProductPreview(record = {}, galleryCount = 0) {
  const image = String(record.image || '').trim();
  const mediaHtml = image ? mediaPreview({ image, title: record.title }) || `<img src="${escapeHtml(image)}" alt="${escapeHtml(record.title || 'Preview')}" loading="lazy" />` : renderMediaFallback();
  const tags = [record.badge, record.category, record.status].filter(Boolean);
  return `
    <div class="editor-preview glass product-preview-card" data-role="product-preview">
      <div class="editor-preview-media product-preview-media">
        ${mediaHtml}
      </div>
      <div class="editor-preview-body">
        <div class="editor-preview-badge">${escapeHtml(record.badge || record.category || 'Product')}</div>
        <h3>${escapeHtml(record.title || 'Untitled product')}</h3>
        <p>${escapeHtml(record.description || 'Add details, pricing and media to preview the live product card.')}</p>
        <div class="preview-tags">
          ${tags.map((tag) => `<span class="badge">${escapeHtml(tag)}</span>`).join('')}
        </div>
        <div class="editor-preview-list">
          <div><span>INR</span><strong>${escapeHtml(record.priceINR || '-')}</strong></div>
          <div><span>USD</span><strong>${escapeHtml(record.priceUSD || '-')}</strong></div>
          <div><span>Gallery</span><strong>${escapeHtml(String(galleryCount))}</strong></div>
        </div>
      </div>
    </div>
  `;
}

function renderGalleryThumb(url, index) {
  const image = String(url || '').trim();
  if (!image) return '';
  return `
    <div class="gallery-thumb" draggable="true" data-gallery-item data-index="${index}" data-url="${escapeHtml(image)}">
      <button type="button" class="gallery-thumb-remove" data-role="gallery-remove" data-index="${index}" aria-label="Remove image"><i data-lucide="x"></i></button>
      <img src="${escapeHtml(image)}" alt="Gallery ${index + 1}" loading="lazy" />
      <span class="gallery-thumb-index">${index + 1}</span>
    </div>
  `;
}

function renderGalleryManager(record = {}) {
  const items = normalizeEditorList(record.galleryImages || []);
  return `
    <div class="field full editor-gallery-field" data-gallery-field>
      <div class="editor-section-head">
        <div>
          <h4>Gallery Images</h4>
          <p>Drag thumbnails to reorder. Remove only clears this product gallery.</p>
        </div>
        <div class="toolbar editor-media-actions">
          <button type="button" class="btn btn-ghost" data-role="gallery-pick">Add Images</button>
          <button type="button" class="btn btn-ghost" data-role="gallery-url-toggle">Add URL</button>
          <input type="file" class="sr-only" accept="image/*" multiple data-role="gallery-file-input" />
        </div>
      </div>
      <div class="gallery-url-row">
        <input class="input" type="text" data-role="gallery-url-input" placeholder="Paste image URL" />
        <button type="button" class="btn btn-ghost" data-role="gallery-url-add">Add</button>
      </div>
      <div class="gallery-grid" data-role="gallery-grid">
        ${items.length ? items.map((url, index) => renderGalleryThumb(url, index)).join('') : '<div class="gallery-empty">No gallery images yet.</div>'}
      </div>
      <textarea class="textarea sr-only" name="galleryImages" data-role="gallery-source">${escapeHtml(items.join('\n'))}</textarea>
      <small class="section-subtitle">Supported: existing Supabase URLs, pasted URLs, and local image uploads.</small>
    </div>
  `;
}

function renderProductEditor(record = {}, schema = null) {
  const data = {
    ...record,
    image: record.image || '',
    galleryImages: normalizeEditorList(record.galleryImages || []),
    creators: normalizeEditorList(record.creators || []),
    platforms: normalizeEditorList(record.platforms || []),
    features: normalizeEditorList(record.features || []),
  };
  const categories = getCategoryOptions();
  const currentCategory = String(data.category || '').trim();
  const currentBadgeStyle = String(data.badgeStyle || '').trim();
  const categoryOptions = [...categories];
  if (currentCategory && !categoryOptions.some((item) => String(item.value) === currentCategory)) {
    categoryOptions.unshift({ value: currentCategory, label: currentCategory });
  }
  const badgeStyles = [...PRODUCT_BADGE_STYLE_OPTIONS];
  if (currentBadgeStyle && !badgeStyles.some((item) => item.value === currentBadgeStyle)) {
    badgeStyles.unshift({ value: currentBadgeStyle, label: currentBadgeStyle });
  }
  return `
    <form id="recordForm" class="product-editor-form" data-node="products" data-id="${escapeHtml(data.id || '')}">
      <div class="product-editor-shell">
        <aside class="product-editor-preview-column">
          ${renderProductPreview(data, data.galleryImages.length)}
          <div class="editor-help glass">
            <strong>Image workflow</strong>
            <p>Use Replace Image or Add Images to upload directly to Supabase media. URLs stay supported, but are secondary.</p>
          </div>
        </aside>
        <section class="product-editor-main">
          <div class="editor-section">
            <div class="editor-section-head">
              <div>
                <h4>Basic Info</h4>
                <p>Primary identity and public facing copy.</p>
              </div>
            </div>
            <div class="product-grid-2">
              <div class="field">
                <label for="title">Title</label>
                <input class="input" type="text" name="title" id="title" value="${escapeHtml(data.title || '')}" placeholder="Product title" />
              </div>
              <div class="field">
                <label for="slug">Slug</label>
                <input class="input" type="text" name="slug" id="slug" value="${escapeHtml(data.slug || '')}" placeholder="product-slug" />
              </div>
              <div class="field">
                <label for="category">Category</label>
                <select class="select" name="category" id="category">
                  <option value="">Uncategorized</option>
                  ${categoryOptions.map((option) => `<option value="${escapeHtml(option.value)}" ${String(option.value) === currentCategory ? 'selected' : ''}>${escapeHtml(option.label)}</option>`).join('')}
                </select>
              </div>
              <div class="field">
                <label for="badge">Badge</label>
                <input class="input" type="text" name="badge" id="badge" value="${escapeHtml(data.badge || '')}" placeholder="Badge text" />
              </div>
              <div class="field">
                <label for="badgeStyle">Badge Style</label>
                <select class="select" name="badgeStyle" id="badgeStyle">
                  ${badgeStyles.map((option) => `<option value="${escapeHtml(option.value)}" ${String(option.value) === currentBadgeStyle ? 'selected' : ''}>${escapeHtml(option.label)}</option>`).join('')}
                </select>
              </div>
              <div class="field">
                <label for="badgeIcon">Badge Icon</label>
                <input class="input" type="text" name="badgeIcon" id="badgeIcon" value="${escapeHtml(data.badgeIcon || '')}" placeholder="lucide icon name" />
              </div>
            </div>
            <div class="field full">
              <label for="description">Description</label>
              <textarea class="textarea" name="description" id="description" placeholder="Product description">${escapeHtml(data.description || '')}</textarea>
            </div>
          </div>

          <div class="editor-section">
            <div class="editor-section-head">
              <div>
                <h4>Pricing</h4>
                <p>Commercial details and public action link.</p>
              </div>
            </div>
            <div class="product-grid-2">
              <div class="field">
                <label for="priceINR">INR Price</label>
                <input class="input" type="text" name="priceINR" id="priceINR" value="${escapeHtml(data.priceINR || '')}" placeholder="0" />
              </div>
              <div class="field">
                <label for="priceUSD">USD Price</label>
                <input class="input" type="text" name="priceUSD" id="priceUSD" value="${escapeHtml(data.priceUSD || '')}" placeholder="0" />
              </div>
              <div class="field">
                <label for="orderLink">Order Link</label>
                <input class="input" type="text" name="orderLink" id="orderLink" value="${escapeHtml(data.orderLink || '')}" placeholder="https:// or /payment.html" />
              </div>
              <div class="field">
                <label for="displayOrder">Display Order</label>
                <input class="input" type="number" name="displayOrder" id="displayOrder" value="${escapeHtml(String(data.displayOrder ?? 0))}" placeholder="0" />
              </div>
            </div>
          </div>

          <div class="editor-section">
            <div class="editor-section-head">
              <div>
                <h4>Media</h4>
                <p>Upload to the existing Supabase media bucket or paste a URL if needed.</p>
              </div>
            </div>
            <div class="media-manager">
              <div class="media-manager-panel" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px; padding: 20px;">
                <!-- Main Image Column -->
                <div class="main-media-column" style="display: flex; flex-direction: column; gap: 12px; min-width: 0;">
                  <div style="font-weight: 700; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--muted); display: flex; align-items: center; gap: 6px;"><i data-lucide="image" style="width: 16px; height: 16px; color: #6366f1;"></i> Main Image</div>
                  <div class="media-manager-preview" data-role="main-image-preview" style="width: 100% !important; max-width: 100% !important; height: 220px !important; min-height: 220px !important; max-height: 220px !important; border-radius: 12px; margin-bottom: 4px;">${data.image ? `<img src="${escapeHtml(data.image)}" alt="${escapeHtml(data.title || 'Main image')}" loading="lazy" />` : renderMediaFallback('No main image selected')}</div>
                  <div class="media-manager-actions">
                    <div class="toolbar media-manager-toolbar" style="margin-bottom: 4px;">
                      <button type="button" class="btn btn-ghost" data-role="main-image-replace">Replace Image</button>
                      <button type="button" class="btn btn-ghost" data-role="main-image-remove">Remove Image</button>
                      <input type="file" class="sr-only" accept="image/*" data-role="main-image-file" />
                    </div>
                    <div class="field">
                      <label for="image">Main Image URL</label>
                      <input class="input" type="text" name="image" id="image" value="${escapeHtml(data.image || '')}" placeholder="https://..." data-role="main-image-url" />
                    </div>
                  </div>
                </div>

                <!-- Main Video Column -->
                <div class="main-media-column" style="display: flex; flex-direction: column; gap: 12px; min-width: 0;">
                  <div style="font-weight: 700; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--muted); display: flex; align-items: center; gap: 6px;"><i data-lucide="video" style="width: 16px; height: 16px; color: #ec4899;"></i> Main Video</div>
                  <div class="media-manager-preview" data-role="main-video-preview" style="width: 100% !important; max-width: 100% !important; height: 220px !important; min-height: 220px !important; max-height: 220px !important; border-radius: 12px; margin-bottom: 4px;">${data.video ? `<video src="${escapeHtml(data.video)}" autoplay muted loop playsinline class="thumb-media" style="width:100%;height:100%;object-fit:cover;"></video>` : renderMediaFallback('No main video selected')}</div>
                  <div class="media-manager-actions">
                    <div class="toolbar media-manager-toolbar" style="margin-bottom: 4px;">
                      <button type="button" class="btn btn-ghost" data-role="main-video-replace">Replace Video</button>
                      <button type="button" class="btn btn-ghost" data-role="main-video-remove">Remove Video</button>
                      <input type="file" class="sr-only" accept="video/*" data-role="main-video-file" />
                    </div>
                    <div class="field">
                      <label for="video">Main Video URL</label>
                      <input class="input" type="text" name="video" id="video" value="${escapeHtml(data.video || '')}" placeholder="https://..." data-role="main-video-url" />
                    </div>
                  </div>
                </div>
              </div>
              ${renderGalleryManager(data)}
            </div>
          </div>

          <div class="editor-section">
            <div class="editor-section-head">
              <div>
                <h4>Metadata</h4>
                <p>Tag-style inputs for creator, platform and feature lists.</p>
              </div>
            </div>
            ${renderTagEditor('creators', 'Creators', data.creators, 'One creator per tag.', 'Add creator')}
            ${renderTagEditor('platforms', 'Platforms', data.platforms, 'One platform per tag.', 'Add platform')}
            ${renderTagEditor('features', 'Features', data.features, 'One feature per tag.', 'Add feature')}
          </div>

          <div class="editor-section">
            <div class="editor-section-head">
              <div>
                <h4>Publishing</h4>
                <p>Control visibility and order.</p>
              </div>
            </div>
            <div class="product-grid-2">
              <div class="field">
                <label for="status">Status</label>
                <select class="select" name="status" id="status">
                  ${['active', 'hidden', 'draft', 'deleted'].map((status) => `<option value="${status}" ${String(data.status || 'active') === status ? 'selected' : ''}>${escapeHtml(status)}</option>`).join('')}
                </select>
              </div>
              <div class="field">
                <label for="badgeIcon">Preview note</label>
                <input class="input" type="text" value="Live preview updates as you edit" disabled />
              </div>
            </div>
          </div>
        </section>
      </div>
      <div class="editor-footer glass">
        <div class="editor-upload-state" data-role="upload-state">Ready.</div>
        <div class="toolbar editor-footer-actions">
          <button type="button" class="btn btn-ghost" data-close-modal>Cancel</button>
          <button type="submit" class="btn btn-primary" data-role="save-product">Save Product</button>
        </div>
      </div>
    </form>
  `;
}

function renderCategoryPreviewBody(record = {}) {
  const image = String(record.image || '').trim();
  const productCount = countProductsForCategory(record);
  return `
    <div class="category-editor-media" data-role="category-image-preview">
      ${image ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(record.title || 'Category image')}" loading="lazy" />` : renderMediaFallback('Optional image')}
    </div>
    <div class="category-editor-body">
      <div class="editor-preview-badge">Category</div>
      <h3>${escapeHtml(record.title || 'Untitled category')}</h3>
      <p>${escapeHtml(record.description || 'Categories group multiple products together. Keep this compact and clean.')}</p>
      <div class="preview-tags">
        <span class="badge">${escapeHtml(String(productCount))} products</span>
        <span class="badge">${escapeHtml(String(record.status || 'active'))}</span>
      </div>
    </div>
  `;
}

function renderCategoryPreview(record = {}) {
  return `
    <div class="category-editor-preview glass" data-role="category-preview">
      ${renderCategoryPreviewBody(record)}
    </div>
  `;
}

function renderCategoryEditor(record = {}, schema = null) {
  const data = {
    ...record,
    image: record.image || '',
  };
  const productCount = countProductsForCategory(data);
  return `
    <form id="recordForm" class="category-editor-modal" data-node="categories" data-id="${escapeHtml(data.id || '')}">
      <div class="category-editor-shell">
        <aside class="category-editor-preview-column">
          ${renderCategoryPreview(data)}
          <div class="editor-help glass">
            <strong>Optional image</strong>
            <p>Use a category image only if it helps the collection feel recognizable. Leave it empty if you don't need one.</p>
          </div>
        </aside>
        <section class="category-editor-main">
          <div class="editor-section">
            <div class="editor-section-head">
              <div>
                <h4>Category Details</h4>
                <p>Keep this focused on the grouping itself, not product fields.</p>
              </div>
              <div class="category-editor-count">
                <span>Products</span>
                <strong>${escapeHtml(String(productCount))}</strong>
              </div>
            </div>
            <div class="category-image-row">
              <div class="field full">
                <label for="image">Category Image URL</label>
                <input class="input" type="text" name="image" id="image" value="${escapeHtml(data.image || '')}" placeholder="https://..." data-role="category-image-url" />
                <small class="section-subtitle">Optional. Keep the URL as a secondary field. Use upload for new images.</small>
              </div>
              <div class="toolbar category-image-actions">
                <button type="button" class="btn btn-ghost" data-role="category-image-replace">Replace Image</button>
                <button type="button" class="btn btn-ghost" data-role="category-image-remove">Remove Image</button>
                <input type="file" class="sr-only" accept="image/*" name="imageFile" data-role="category-image-file" />
              </div>
            </div>
            <div class="product-grid-2 category-grid">
              <div class="field">
                <label for="title">Category Name</label>
                <input class="input" type="text" name="title" id="title" value="${escapeHtml(data.title || '')}" placeholder="English Pack" />
              </div>
              <div class="field">
                <label for="slug">Slug</label>
                <input class="input" type="text" name="slug" id="slug" value="${escapeHtml(data.slug || '')}" placeholder="english-pack" />
              </div>
              <div class="field full">
                <label for="description">Description</label>
                <textarea class="textarea" name="description" id="description" placeholder="Short category description">${escapeHtml(data.description || '')}</textarea>
              </div>
              <div class="field">
                <label for="status">Status</label>
                <select class="select" name="status" id="status">
                  ${['active', 'hidden', 'draft', 'deleted'].map((status) => `<option value="${status}" ${String(data.status || 'active') === status ? 'selected' : ''}>${escapeHtml(status)}</option>`).join('')}
                </select>
              </div>
              <div class="field">
                <label for="displayOrder">Display Order</label>
                <input class="input" type="number" name="displayOrder" id="displayOrder" value="${escapeHtml(String(data.displayOrder ?? 0))}" placeholder="0" />
              </div>
            </div>
          </div>
        </section>
      </div>
      <div class="editor-footer glass">
        <div class="editor-upload-state" data-role="category-upload-state">Ready.</div>
        <div class="toolbar editor-footer-actions">
          <button type="button" class="btn btn-ghost" data-close-modal>Cancel</button>
          <button type="submit" class="btn btn-primary">Save Category</button>
        </div>
      </div>
    </form>
  `;
}

function attachCategoryEditorBehaviors(form) {
  const stateEl = form.querySelector('[data-role="category-upload-state"]');
  const saveBtn = form.querySelector('[type="submit"]');
  const previewCard = form.querySelector('[data-role="category-preview"]');
  const imageUrlInput = form.querySelector('[data-role="category-image-url"]');
  const imageFileInput = form.querySelector('[data-role="category-image-file"]');
  const replaceBtn = form.querySelector('[data-role="category-image-replace"]');
  const removeBtn = form.querySelector('[data-role="category-image-remove"]');

  const getState = () => ({
    title: String(form.querySelector('[name="title"]')?.value || '').trim(),
    slug: String(form.querySelector('[name="slug"]')?.value || '').trim(),
    description: String(form.querySelector('[name="description"]')?.value || '').trim(),
    image: String(form.querySelector('[name="image"]')?.value || '').trim(),
    status: String(form.querySelector('[name="status"]')?.value || 'active').trim(),
    displayOrder: Number(form.querySelector('[name="displayOrder"]')?.value || 0),
  });

  const refreshPreview = () => {
    if (!previewCard) return;
    const current = {
      ...getState(),
      image: String(imageUrlInput?.value || '').trim(),
    };
    previewCard.innerHTML = renderCategoryPreviewBody(current);
    if (window.lucide) lucide.createIcons();
  };

  const setBusy = (busy, message = '') => {
    if (saveBtn) saveBtn.disabled = busy;
    if (stateEl && message) stateEl.textContent = message;
  };

  form.addEventListener('input', (event) => {
    if (event.target.name === 'title') {
      const slugInput = form.querySelector('[name="slug"]');
      if (slugInput) {
        slugInput.value = slugify(event.target.value);
      }
    }
    if (event.target === imageUrlInput || event.target.matches('[name="title"],[name="slug"],[name="description"],[name="status"],[name="displayOrder"]')) {
      refreshPreview();
    }
  });

  form.addEventListener('change', (event) => {
    if (event.target !== imageFileInput || !event.target.files?.[0]) return;
    const file = event.target.files[0];
    (async () => {
      try {
        setBusy(true, `Uploading ${file.name}...`);
        const url = await uploadEditorFile(file, mediaFolderForNode('categories', 'image'), stateEl, 'category-editor');
        if (imageUrlInput) imageUrlInput.value = url;
        imageFileInput.value = '';
        refreshPreview();
        if (stateEl) stateEl.textContent = `Uploaded ${file.name}`;
      } catch (error) {
        stateEl.textContent = error?.message || 'Image upload failed';
        showToast(error?.message || 'Image upload failed', 'danger');
      } finally {
        setBusy(false);
      }
    })();
  });

  form.addEventListener('click', (event) => {
    const pick = event.target.closest('[data-role="category-image-replace"]');
    if (pick) {
      imageFileInput?.click();
      return;
    }
    const remove = event.target.closest('[data-role="category-image-remove"]');
    if (remove) {
      if (imageUrlInput) imageUrlInput.value = '';
      if (imageFileInput) imageFileInput.value = '';
      refreshPreview();
      if (stateEl) stateEl.textContent = 'Category image cleared.';
    }
  });

  refreshPreview();
}

function syncTagEditor(form, name) {
  const field = form.querySelector(`[data-tag-field="${name}"]`);
  if (!field) return [];
  const source = field.querySelector('[data-role="tag-source"]');
  const items = normalizeEditorList(source?.value || '');
  const list = field.querySelector('[data-role="tag-list"]');
  if (list) {
    list.innerHTML = items.length ? items.map((item, index) => `
      <span class="tag-chip" data-tag-value="${escapeHtml(item)}">
        <span>${escapeHtml(item)}</span>
        <button type="button" class="tag-remove" data-role="tag-remove" data-name="${escapeHtml(name)}" data-index="${index}" aria-label="Remove ${escapeHtml(item)}">×</button>
      </span>
    `).join('') : '<div class="tag-empty">No items yet.</div>';
  }
  return items;
}

function syncProductEditorGallery(form) {
  const source = form.querySelector('[data-role="gallery-source"]');
  const list = normalizeEditorList(source?.value || '');
  const grid = form.querySelector('[data-role="gallery-grid"]');
  if (grid) {
    grid.innerHTML = list.length ? list.map((url, index) => renderGalleryThumb(url, index)).join('') : '<div class="gallery-empty">No gallery images yet.</div>';
  }
  return list;
}

function getProductEditorRecord(form) {
  const gallery = syncProductEditorGallery(form);
  const creators = syncTagEditor(form, 'creators');
  const platforms = syncTagEditor(form, 'platforms');
  const features = syncTagEditor(form, 'features');
  return {
    title: form.querySelector('[name="title"]')?.value || '',
    slug: form.querySelector('[name="slug"]')?.value || '',
    category: form.querySelector('[name="category"]')?.value || '',
    description: form.querySelector('[name="description"]')?.value || '',
    priceINR: form.querySelector('[name="priceINR"]')?.value || '',
    priceUSD: form.querySelector('[name="priceUSD"]')?.value || '',
    badge: form.querySelector('[name="badge"]')?.value || '',
    badgeStyle: form.querySelector('[name="badgeStyle"]')?.value || '',
    badgeIcon: form.querySelector('[name="badgeIcon"]')?.value || '',
    image: form.querySelector('[name="image"]')?.value || '',
    video: form.querySelector('[name="video"]')?.value || '',
    galleryImages: gallery,
    creators,
    platforms,
    features,
    orderLink: form.querySelector('[name="orderLink"]')?.value || '',
    status: form.querySelector('[name="status"]')?.value || 'active',
    displayOrder: form.querySelector('[name="displayOrder"]')?.value || '0',
  };
}

function updateProductEditorPreview(form) {
  const previewRoot = form.querySelector('[data-role="product-preview"]');
  const state = getProductEditorRecord(form);
  const galleryCount = state.galleryImages.length;
  const tags = [state.badge, state.category, state.status].filter(Boolean);
  if (!previewRoot) return;
  previewRoot.innerHTML = `
    <div class="editor-preview glass product-preview-card">
      <div class="editor-preview-media product-preview-media">
        ${state.image ? `<img src="${escapeHtml(state.image)}" alt="${escapeHtml(state.title || 'Preview')}" loading="lazy" />` : renderMediaFallback()}
      </div>
      <div class="editor-preview-body">
        <div class="editor-preview-badge">${escapeHtml(state.badge || state.category || 'Product')}</div>
        <h3>${escapeHtml(state.title || 'Untitled product')}</h3>
        <p>${escapeHtml(state.description || 'Add details, pricing and media to preview the live product card.')}</p>
        <div class="preview-tags">
          ${tags.map((tag) => `<span class="badge">${escapeHtml(tag)}</span>`).join('')}
        </div>
        <div class="editor-preview-list">
          <div><span>INR</span><strong>${escapeHtml(state.priceINR || '-')}</strong></div>
          <div><span>USD</span><strong>${escapeHtml(state.priceUSD || '-')}</strong></div>
          <div><span>Gallery</span><strong>${escapeHtml(String(galleryCount))}</strong></div>
        </div>
      </div>
    </div>
  `;
  if (window.lucide) lucide.createIcons();
}

async function uploadEditorFile(file, folder, stateEl, source = 'product-editor') {
  const progress = stateEl;
  progress.textContent = `Uploading ${file.name}...`;
  const result = await uploadAsset(file, folder, (value) => {
    progress.textContent = `Uploading ${file.name}... ${value}%`;
  });
  const mediaType = file.type.startsWith('video/') ? 'video' : 'image';
  await saveUploadedMediaRecord(file, result, folder, mediaType, source, `${folder}:${file.name}`);
  progress.textContent = `Uploaded ${file.name}`;
  return result.publicUrl;
}

function attachProductEditorBehaviors(form) {
  const stateEl = form.querySelector('[data-role="upload-state"]');
  const saveBtn = form.querySelector('[data-role="save-product"]');
  const mainPreview = form.querySelector('[data-role="main-image-preview"]');
  const mainImageInput = form.querySelector('[data-role="main-image-url"]');
  const mainFileInput = form.querySelector('[data-role="main-image-file"]');
  
  const videoPreview = form.querySelector('[data-role="main-video-preview"]');
  const videoUrlInput = form.querySelector('[data-role="main-video-url"]');
  const videoFileInput = form.querySelector('[data-role="main-video-file"]');
  
  const gallerySource = form.querySelector('[data-role="gallery-source"]');
  const galleryInput = form.querySelector('[data-role="gallery-url-input"]');
  const galleryFileInput = form.querySelector('[data-role="gallery-file-input"]');
  const galleryGrid = form.querySelector('[data-role="gallery-grid"]');
  const tagFields = [...form.querySelectorAll('[data-tag-field]')];
  form.__galleryDragIndex = null;

  const rerenderGallery = () => {
    syncProductEditorGallery(form);
    updateProductEditorPreview(form);
    if (window.lucide) lucide.createIcons();
  };

  const setBusy = (busy, message = '') => {
    if (saveBtn) saveBtn.disabled = busy;
    if (message && stateEl) stateEl.textContent = message;
  };

  const updateMainPreview = () => {
    if (!mainPreview) return;
    const value = String(mainImageInput?.value || '').trim();
    mainPreview.innerHTML = value ? `<img src="${escapeHtml(value)}" alt="${escapeHtml(form.querySelector('[name="title"]')?.value || 'Main image')}" loading="lazy" />` : renderMediaFallback('No main image selected');
    updateProductEditorPreview(form);
    if (window.lucide) lucide.createIcons();
  };

  const updateVideoPreview = () => {
    if (!videoPreview) return;
    const value = String(videoUrlInput?.value || '').trim();
    videoPreview.innerHTML = value ? `<video src="${escapeHtml(value)}" autoplay muted loop playsinline class="thumb-media" style="width:100%;height:100%;object-fit:cover;"></video>` : renderMediaFallback('No main video selected');
    updateProductEditorPreview(form);
    if (window.lucide) lucide.createIcons();
  };

  const syncAllTags = () => {
    tagFields.forEach((field) => syncTagEditor(form, field.dataset.tagField));
    updateProductEditorPreview(form);
  };

  const addGalleryUrls = (urls) => {
    const existing = normalizeEditorList(gallerySource?.value || '');
    const next = mergeUniqueList(existing, urls.map((item) => String(item || '').trim()).filter(Boolean));
    if (gallerySource) gallerySource.value = next.join('\n');
    rerenderGallery();
  };

  const removeGalleryIndex = (index) => {
    const existing = normalizeEditorList(gallerySource?.value || '');
    existing.splice(index, 1);
    if (gallerySource) gallerySource.value = existing.join('\n');
    rerenderGallery();
  };

  const moveGalleryIndex = (fromIndex, toIndex) => {
    const existing = normalizeEditorList(gallerySource?.value || '');
    if (fromIndex < 0 || toIndex < 0 || fromIndex >= existing.length || toIndex >= existing.length) return;
    const [item] = existing.splice(fromIndex, 1);
    existing.splice(toIndex, 0, item);
    if (gallerySource) gallerySource.value = existing.join('\n');
    rerenderGallery();
  };

  const handleTagAdd = (fieldName, input) => {
    const raw = String(input.value || '').trim();
    if (!raw) return;
    const values = normalizeEditorList(raw.replace(/,/g, '\n'));
    if (!values.length) return;
    const field = form.querySelector(`[data-tag-field="${fieldName}"]`);
    const source = field?.querySelector('[data-role="tag-source"]');
    const existing = normalizeEditorList(source?.value || '');
    const next = mergeUniqueList(existing, values);
    if (source) source.value = next.join('\n');
    input.value = '';
    syncTagEditor(form, fieldName);
    updateProductEditorPreview(form);
  };

  form.addEventListener('input', (event) => {
    if (event.target.name === 'title') {
      const slugInput = form.querySelector('[name="slug"]');
      if (slugInput) {
        slugInput.value = slugify(event.target.value);
      }
    }
    if (event.target === mainImageInput || event.target === videoUrlInput || event.target.matches('[name="title"],[name="slug"],[name="category"],[name="description"],[name="priceINR"],[name="priceUSD"],[name="badge"],[name="badgeStyle"],[name="badgeIcon"],[name="orderLink"],[name="status"],[name="displayOrder"],[name="video"]')) {
      updateMainPreview();
      updateVideoPreview();
      return;
    }
    if (event.target.matches('[data-role="tag-input"]')) {
      updateProductEditorPreview(form);
      return;
    }
    if (event.target === gallerySource) {
      rerenderGallery();
    }
  });

  form.addEventListener('change', async (event) => {
    if (event.target === mainFileInput && event.target.files?.[0]) {
      const file = event.target.files[0];
      try {
        setBusy(true, `Uploading ${file.name}...`);
        const url = await uploadEditorFile(file, mediaFolderForNode('products', 'image'), stateEl);
        if (mainImageInput) mainImageInput.value = url;
        event.target.value = '';
        updateMainPreview();
      } catch (error) {
        stateEl.textContent = error?.message || 'Image upload failed';
        showToast(error?.message || 'Image upload failed', 'danger');
      } finally {
        setBusy(false, 'Ready.');
      }
      return;
    }
    if (event.target === videoFileInput && event.target.files?.[0]) {
      const file = event.target.files[0];
      try {
        setBusy(true, `Uploading ${file.name}...`);
        const url = await uploadEditorFile(file, mediaFolderForNode('products', 'video'), stateEl);
        if (videoUrlInput) videoUrlInput.value = url;
        event.target.value = '';
        updateVideoPreview();
      } catch (error) {
        stateEl.textContent = error?.message || 'Video upload failed';
        showToast(error?.message || 'Video upload failed', 'danger');
      } finally {
        setBusy(false, 'Ready.');
      }
      return;
    }
    if (event.target === galleryFileInput && event.target.files?.length) {
      const files = [...event.target.files];
      try {
        setBusy(true, `Uploading ${files.length} gallery image${files.length > 1 ? 's' : ''}...`);
        const next = normalizeEditorList(gallerySource?.value || '');
        for (const file of files) {
          const url = await uploadEditorFile(file, mediaFolderForNode('products', 'gallery'), stateEl);
          next.push(url);
        }
        if (gallerySource) gallerySource.value = mergeUniqueList([], next).join('\n');
        event.target.value = '';
        rerenderGallery();
      } catch (error) {
        stateEl.textContent = error?.message || 'Gallery upload failed';
        showToast(error?.message || 'Gallery upload failed', 'danger');
      } finally {
        setBusy(false, 'Ready.');
      }
      return;
    }
    if (event.target.matches('[data-role="tag-input"]')) {
      return;
    }
    if (event.target === mainImageInput || event.target === videoUrlInput || event.target.matches('[name="title"],[name="slug"],[name="category"],[name="description"],[name="priceINR"],[name="priceUSD"],[name="badge"],[name="badgeStyle"],[name="badgeIcon"],[name="orderLink"],[name="status"],[name="displayOrder"],[name="video"]')) {
      updateProductEditorPreview(form);
    }
  });

  form.addEventListener('click', (event) => {
    const tagAdd = event.target.closest('[data-role="tag-add"]');
    if (tagAdd) {
      const field = tagAdd.closest('[data-tag-field]');
      const input = field?.querySelector('[data-role="tag-input"]');
      if (field && input) handleTagAdd(field.dataset.tagField, input);
      return;
    }
    const tagRemove = event.target.closest('[data-role="tag-remove"]');
    if (tagRemove) {
      const fieldName = tagRemove.dataset.name;
      const index = Number(tagRemove.dataset.index);
      const field = form.querySelector(`[data-tag-field="${fieldName}"]`);
      const source = field?.querySelector('[data-role="tag-source"]');
      const values = normalizeEditorList(source?.value || '');
      values.splice(index, 1);
      if (source) source.value = values.join('\n');
      syncTagEditor(form, fieldName);
      updateProductEditorPreview(form);
      return;
    }
    const galleryRemove = event.target.closest('[data-role="gallery-remove"]');
    if (galleryRemove) {
      removeGalleryIndex(Number(galleryRemove.dataset.index));
      return;
    }
    const galleryPick = event.target.closest('[data-role="gallery-pick"]');
    if (galleryPick) {
      galleryFileInput?.click();
      return;
    }
    const galleryToggle = event.target.closest('[data-role="gallery-url-toggle"]');
    if (galleryToggle) {
      galleryInput?.focus();
      galleryInput?.select?.();
      return;
    }
    const galleryAdd = event.target.closest('[data-role="gallery-url-add"]');
    if (galleryAdd) {
      const url = String(galleryInput?.value || '').trim();
      if (!url) return;
      addGalleryUrls([url]);
      if (galleryInput) galleryInput.value = '';
      return;
    }
    const mainReplace = event.target.closest('[data-role="main-image-replace"]');
    if (mainReplace) {
      mainFileInput?.click();
      return;
    }
    const mainRemove = event.target.closest('[data-role="main-image-remove"]');
    if (mainRemove) {
      if (mainImageInput) mainImageInput.value = '';
      updateMainPreview();
      return;
    }
    const videoReplace = event.target.closest('[data-role="main-video-replace"]');
    if (videoReplace) {
      videoFileInput?.click();
      return;
    }
    const videoRemove = event.target.closest('[data-role="main-video-remove"]');
    if (videoRemove) {
      if (videoUrlInput) videoUrlInput.value = '';
      updateVideoPreview();
      return;
    }
  });

  form.addEventListener('dragstart', (event) => {
    const thumb = event.target.closest('[data-gallery-item]');
    if (!thumb) return;
    form.__galleryDragIndex = Number(thumb.dataset.index);
    event.dataTransfer.effectAllowed = 'move';
  });

  form.addEventListener('dragover', (event) => {
    const thumb = event.target.closest('[data-gallery-item]');
    if (!thumb) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  });

  form.addEventListener('drop', (event) => {
    const thumb = event.target.closest('[data-gallery-item]');
    if (!thumb) return;
    event.preventDefault();
    const fromIndex = Number(form.__galleryDragIndex);
    const toIndex = Number(thumb.dataset.index);
    if (Number.isFinite(fromIndex) && Number.isFinite(toIndex) && fromIndex !== toIndex) {
      moveGalleryIndex(fromIndex, toIndex);
    }
    form.__galleryDragIndex = null;
  });

  tagFields.forEach((field) => {
    const input = field.querySelector('[data-role="tag-input"]');
    if (!input) return;
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        handleTagAdd(field.dataset.tagField, input);
      }
    });
  });

  syncAllTags();
  updateMainPreview();
  rerenderGallery();
}

function openProductEditor(record, schema) {
  const isEdit = Boolean(record.id);
  openModal(`
    <div class="product-editor-modal">
      <div class="panel-head product-editor-head">
        <div>
          <h2 class="section-title">${escapeHtml(isEdit ? 'Edit Product' : 'Add Product')}</h2>
          <p class="section-subtitle">${escapeHtml(schema.description)}</p>
        </div>
        <button class="btn btn-ghost" data-close-modal type="button"><i data-lucide="x"></i></button>
      </div>
      ${renderProductEditor(record, schema)}
    </div>
  `);
  const form = document.getElementById('recordForm');
  if (form) {
    attachProductEditorBehaviors(form);
  }
  if (window.lucide) lucide.createIcons();
}

function openCategoryEditor(record, schema) {
  const isEdit = Boolean(record.id);
  openModal(`
    <div class="category-editor-modal">
      <div class="panel-head category-editor-head">
        <div>
          <h2 class="section-title">${escapeHtml(isEdit ? 'Edit Category' : 'Add Category')}</h2>
          <p class="section-subtitle">${escapeHtml(schema.description)}</p>
        </div>
        <button class="btn btn-ghost" data-close-modal type="button"><i data-lucide="x"></i></button>
      </div>
      ${renderCategoryEditor(record, schema)}
    </div>
  `);
  const form = document.getElementById('recordForm');
  if (form) {
    attachCategoryEditorBehaviors(form);
  }
  if (window.lucide) lucide.createIcons();
}

function openRecordEditor(node, schema, record = {}) {
  if (node === 'products') { openProductEditor(record, schema); return; }
  if (node === 'categories') { openCategoryEditor(record, schema); return; }
  const isEdit = Boolean(record.id);
  const data = record || {};
  const fields = schema.fields;
  const showPreview = node === 'products' || node === 'categories';
  openModal(`
    <div class="panel-head">
      <div>
        <h2 class="section-title">${escapeHtml(isEdit ? `Edit ${schema.label}` : `Add ${schema.label}`)}</h2>
        <p class="section-subtitle">${escapeHtml(schema.description)}</p>
      </div>
      <button class="btn btn-ghost" data-close-modal type="button"><i data-lucide="x"></i></button>
    </div>
    <form id="recordForm" data-node="${escapeHtml(node)}" data-id="${escapeHtml(data.id || '')}">
      <div class="${showPreview ? 'editor-layout' : ''}">
        ${showPreview ? `
        <div class="editor-preview-column">
          ${renderRecordPreview(data)}
          <div class="editor-help glass">
            <strong>Upload tip</strong>
            <p>Choose a file below and save. The file will upload to Supabase first, then the public URL will be stored in Firebase.</p>
          </div>
        </div>
        ` : ''}
        <div class="form-grid editor-form">
          ${fields.map((field) => fieldMarkup(field, data[field.key] ?? '', { allowUploads: true })).join('')}
        </div>
      </div>
      <div class="toolbar" style="margin-top:16px;justify-content:flex-end;">
        <button type="button" class="btn btn-ghost" data-close-modal>Cancel</button>
        <button type="submit" class="btn btn-primary">Save ${escapeHtml(schema.label)}</button>
      </div>
    </form>
  `);
}

window.copyShareLink = function(btn, text) {
  navigator.clipboard.writeText(text).then(() => {
    const origHtml = btn.innerHTML;
    btn.innerHTML = '<i data-lucide="check" style="width: 14px; height: 14px;"></i> Copied!';
    
    btn.style.setProperty('background', '#10b981', 'important');
    btn.style.setProperty('border', 'none', 'important');
    btn.style.setProperty('color', '#ffffff', 'important');
    btn.style.setProperty('box-shadow', '0 4px 12px rgba(16, 185, 129, 0.3)', 'important');
    
    if (window.lucide) lucide.createIcons();
    showToast('Link copied to clipboard!');
    setTimeout(() => {
      btn.innerHTML = origHtml;
      btn.style.setProperty('background', 'linear-gradient(135deg, #6366f1, #ec4899)', 'important');
      btn.style.setProperty('border', 'none', 'important');
      btn.style.setProperty('color', '#ffffff', 'important');
      btn.style.setProperty('box-shadow', '0 4px 12px rgba(99, 102, 241, 0.3)', 'important');
      if (window.lucide) lucide.createIcons();
    }, 2000);
  }).catch((err) => {
    console.error('Copy failed:', err);
    showToast('Copy failed, please select and copy manually.', 'danger');
  });
};

function openShareModal(node, id) {
  const item = getItem(node, id);
  if (!item) return;

  const homeUrl = `${window.location.origin}/?product=${encodeURIComponent(id)}`;

  const html = `
    <div class="panel shadow-lg share-product-modal modal-sm" style="width: 100%; padding: 28px; border-radius: 16px; background: var(--panel-solid); border: 1px solid var(--border); overflow: hidden; position: relative;">
      <!-- Subtle top color accent line -->
      <div style="position: absolute; top: 0; left: 0; right: 0; height: 4px; background: linear-gradient(90deg, #6366f1, #ec4899);"></div>

      <!-- Header -->
      <div class="panel-head flex items-center justify-between" style="padding-bottom: 16px; margin-bottom: 20px; display: flex; align-items: center; justify-content: space-between;">
        <h3 class="panel-title flex items-center gap-2" style="font-size: 16px; font-weight: 700; color: var(--text); margin: 0; display: flex; align-items: center; gap: 8px;">
          <i data-lucide="share-2" style="color: #6366f1; width: 20px; height: 20px;"></i>
          <span>Share Product Link</span>
        </h3>
        <button class="btn btn-ghost" data-close-modal type="button" style="padding: 6px; border: none; background: transparent; cursor: pointer; color: var(--muted); display: flex; align-items: center; justify-content: center;">
          <i data-lucide="x" style="width: 18px; height: 18px;"></i>
        </button>
      </div>

      <!-- Product Preview Block -->
      <div style="background: rgba(99, 102, 241, 0.05); border: 1px solid rgba(99, 102, 241, 0.15); border-radius: 10px; padding: 14px; margin-bottom: 20px; display: flex; align-items: center; gap: 12px;">
        <div style="width: 42px; height: 42px; background: linear-gradient(135deg, #6366f1, #a855f7); border-radius: 8px; display: grid; place-items: center; color: white; font-weight: bold; font-size: 18px; flex-shrink: 0;">
          ${escapeHtml((item.title || item.name || 'P')[0].toUpperCase())}
        </div>
        <div>
          <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #818cf8; letter-spacing: 0.05em;">Product Selected</div>
          <div style="font-size: 14px; font-weight: 600; color: var(--text);">${escapeHtml(item.title || item.name || '')}</div>
        </div>
      </div>

      <!-- Link Box -->
      <div style="display: flex; flex-direction: column; gap: 8px;">
        <label style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--muted); letter-spacing: 0.05em;">
          Customer Link (Opens page & highlights product)
        </label>
        <div style="display: flex; gap: 8px; width: 100%;">
          <input type="text" readonly value="${escapeHtml(homeUrl)}" onclick="this.select();" style="flex: 1; font-family: 'JetBrains Mono', monospace; font-size: 12px; background: var(--bg); padding: 12px 14px; border-radius: 8px; border: 1px solid var(--border); color: var(--text); outline: none; width: 100%; box-shadow: inset 0 2px 4px rgba(0,0,0,0.1);" />
          <button class="btn" onclick="copyShareLink(this, '${escapeHtml(homeUrl)}');" style="padding: 0 20px; font-size: 13px; font-weight: 700; border-radius: 8px; flex-shrink: 0; background: linear-gradient(135deg, #6366f1, #ec4899) !important; border: none !important; color: white !important; display: inline-flex; align-items: center; gap: 6px; cursor: pointer; transition: all 0.25s ease; box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);">
            <i data-lucide="copy" style="width: 14px; height: 14px;"></i> Copy Link
          </button>
        </div>
      </div>

      <!-- Footer Help Text -->
      <div style="font-size: 11px; color: var(--muted); margin-top: 14px; line-height: 1.4;">
        When customers open this link, the site will automatically scroll to the product and highlight it with a premium glow.
      </div>

      <!-- Footer Buttons -->
      <div style="margin-top: 24px; display: flex; justify-content: flex-end; border-top: 1px solid var(--border); padding-top: 16px;">
        <button type="button" class="btn" data-close-modal style="padding: 8px 18px; border-radius: 8px; font-size: 13px; font-weight: 600; background: transparent; border: 1px solid var(--border); color: var(--text); cursor: pointer; transition: all 0.2s ease;">Close</button>
      </div>
    </div>
  `;
  openModal(html);
}

function openSingleEditor(node, schema, record = {}) {
  if (node === 'hero' || node === 'banner' || node === 'settings' || node === 'payment') {
    openModal(`
      <div class="panel-head management-modal-head">
        <div>
          <h2 class="section-title">${escapeHtml(schema.title)}</h2>
          <p class="section-subtitle">${escapeHtml(schema.description)}</p>
        </div>
        <button class="btn btn-ghost" data-close-modal type="button"><i data-lucide="x"></i></button>
      </div>
      <form id="singleForm" data-node="${escapeHtml(node)}" class="single-editor-modal">
        <div class="single-editor-shell">
          ${renderSingleEditorPreviewCard(node, record)}
          <div class="single-editor-main">
            ${renderSingleEditorSummaryGrid(node, record)}
            <div class="single-editor-section-list">
              ${renderSingleEditorFieldSections(node, schema, record)}
            </div>
          </div>
        </div>
        <div class="single-editor-status" id="singleEditorStatus" aria-live="polite"></div>
        <div class="toolbar single-editor-footer" style="margin-top:16px;justify-content:flex-end;">
          <button type="button" class="btn btn-ghost" data-close-modal>Cancel</button>
          <button type="submit" class="btn btn-primary">Save Changes</button>
        </div>
      </form>
    `);
    return;
  }
  openModal(`
    <div class="panel-head">
      <div>
        <h2 class="section-title">${escapeHtml(schema.title)}</h2>
        <p class="section-subtitle">${escapeHtml(schema.description)}</p>
      </div>
      <button class="btn btn-ghost" data-close-modal type="button"><i data-lucide="x"></i></button>
    </div>
    <form id="singleForm" data-node="${escapeHtml(node)}">
      <div class="form-grid">
        ${schema.fields.map((field) => fieldMarkup(field, record[field.key] ?? '')).join('')}
      </div>
      <div class="toolbar" style="margin-top:16px;justify-content:flex-end;">
        <button type="button" class="btn btn-ghost" data-close-modal>Cancel</button>
        <button type="submit" class="btn btn-primary">Save Changes</button>
      </div>
    </form>
  `);
}

function getRangeDays(range = ui.dashboardRange) {
  if (range === 'week') return 7;
  if (range === 'month') return 30;
  return 1;
}

function isInRange(timestamp, range) {
  const days = getRangeDays(range);
  return Number(timestamp || 0) >= Date.now() - (days * 86400000);
}

function parseMetricNumber(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const raw = String(value || '').replace(/,/g, '').match(/-?\d+(\.\d+)?/);
  if (!raw) return 0;
  const parsed = Number(raw[0]);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getRangeWindow(range, offset = 0) {
  const days = getRangeDays(range);
  const end = Date.now() - (offset * days * 86400000);
  return {
    start: end - (days * 86400000),
    end,
  };
}

function isInWindow(timestamp, start, end) {
  const value = Number(timestamp || 0);
  return value >= start && value < end;
}

function countInWindow(items, start, end, predicate = () => true) {
  return items.filter((item) => isInWindow(item.timestamp || item.updatedAt || 0, start, end) && predicate(item)).length;
}

function sumInWindow(items, start, end, valueFn = () => 0, predicate = () => true) {
  return items.reduce((total, item) => {
    if (!predicate(item)) return total;
    const stamp = item.timestamp || item.updatedAt || 0;
    if (!isInWindow(stamp, start, end)) return total;
    return total + parseMetricNumber(valueFn(item));
  }, 0);
}

function dayKey(timestamp) {
  return new Date(Number(timestamp || Date.now())).toISOString().slice(0, 10);
}

function buildSeries(items, range, predicate = () => true) {
  const { start, end } = getRangeWindow(range);
  const bucketSize = range === 'day' ? 3600000 : 86400000;
  const bucketCount = range === 'day' ? 24 : getRangeDays(range);
  const series = [];
  for (let index = 0; index < bucketCount; index += 1) {
    const stamp = start + (index * bucketSize);
    const date = new Date(stamp);
    series.push({
      label: range === 'day'
        ? `${String(date.getHours()).padStart(2, '0')}:00`
        : `${date.getMonth() + 1}/${date.getDate()}`,
      date: dayKey(stamp),
      timestamp: stamp,
      count: 0,
    });
  }
  items.filter((item) => predicate(item)).forEach((item) => {
    const stamp = Number(item.timestamp || item.updatedAt || 0);
    if (!isInWindow(stamp, start, end)) return;
    const index = Math.floor((stamp - start) / bucketSize);
    const bucket = series[Math.min(series.length - 1, Math.max(0, index))];
    if (bucket) bucket.count += 1;
  });
  return series;
}

function buildValueSeries(items, range, valueFn = () => 0, predicate = () => true) {
  const { start, end } = getRangeWindow(range);
  const bucketSize = range === 'day' ? 3600000 : 86400000;
  const bucketCount = range === 'day' ? 24 : getRangeDays(range);
  const series = [];
  for (let index = 0; index < bucketCount; index += 1) {
    const stamp = start + (index * bucketSize);
    const date = new Date(stamp);
    series.push({
      label: range === 'day'
        ? `${String(date.getHours()).padStart(2, '0')}:00`
        : `${date.getMonth() + 1}/${date.getDate()}`,
      date: dayKey(stamp),
      timestamp: stamp,
      count: 0,
    });
  }
  items.filter((item) => predicate(item)).forEach((item) => {
    const stamp = Number(item.timestamp || item.updatedAt || 0);
    if (!isInWindow(stamp, start, end)) return;
    const index = Math.floor((stamp - start) / bucketSize);
    const bucket = series[Math.min(series.length - 1, Math.max(0, index))];
    if (bucket) bucket.count += parseMetricNumber(valueFn(item));
  });
  return series;
}

function countInRange(items, range, predicate = () => true) {
  return items.filter((item) => isInRange(item.timestamp || item.updatedAt || 0, range) && predicate(item)).length;
}

function percentChange(current, previous) {
  if (!previous) return current ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

function summarizeDashboard(range = ui.dashboardRange) {
  const visitors = listCollection('visitors');
  const orders = listCollection('orders');
  const events = listCollection('events');
  const products = listCollection('products');
  const currentWindow = getRangeWindow(range);
  const previousWindow = getRangeWindow(range, 1);
  const clickPredicate = (item) => String(item.type || '').toLowerCase().includes('click');
  const currentVisitors = countInWindow(visitors, currentWindow.start, currentWindow.end);
  const currentOrders = countInWindow(orders, currentWindow.start, currentWindow.end);
  const currentClicks = countInWindow(events, currentWindow.start, currentWindow.end, clickPredicate);
  const currentRevenue = sumInWindow(orders, currentWindow.start, currentWindow.end, (item) => item.amount, isPaidOrder);
  const prevVisitors = countInWindow(visitors, previousWindow.start, previousWindow.end);
  const prevOrders = countInWindow(orders, previousWindow.start, previousWindow.end);
  const prevClicks = countInWindow(events, previousWindow.start, previousWindow.end, clickPredicate);
  const prevRevenue = sumInWindow(orders, previousWindow.start, previousWindow.end, (item) => item.amount, isPaidOrder);
  const productClicks = events
    .filter((item) => isInRange(item.timestamp || item.updatedAt || 0, range) && clickPredicate(item))
    .reduce((acc, item) => {
      const key = item.package || item.title || item.label || 'Unknown';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
  const topClicked = Object.entries(productClicks).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const top = topClicked[0] || [];
  return {
    range,
    rangeDays: getRangeDays(range),
    visitors: currentVisitors,
    visitorsPrev: prevVisitors,
    visitorsTrend: percentChange(currentVisitors, prevVisitors),
    clicks: currentClicks,
    clicksPrev: prevClicks,
    clicksTrend: percentChange(currentClicks, prevClicks),
    orders: currentOrders,
    ordersPrev: prevOrders,
    ordersTrend: percentChange(currentOrders, prevOrders),
    revenue: currentRevenue,
    revenuePrev: prevRevenue,
    revenueTrend: percentChange(currentRevenue, prevRevenue),
    visitorSeries: buildSeries(visitors, range),
    clickSeries: buildSeries(events, range, clickPredicate),
    orderSeries: buildSeries(orders, range),
    revenueSeries: buildValueSeries(orders, range, (item) => item.amount, isPaidOrder),
    topClicked,
    topProductName: top[0] || 'None',
    topProductClicks: top[1] || 0,
    totals: stats(),
    liveProducts: products.length,
    liveCategories: listCollection('categories').length,
    mediaAssets: listCollection('media').length,
  };
}

function renderRangeSwitch() {
  return `
    <div class="range-switch">
      ${[
        ['day', '24H'],
        ['week', '7D'],
        ['month', '30D'],
      ].map(([range, label]) => `
        <button class="range-pill ${ui.dashboardRange === range ? 'active' : ''}" data-action="set-range" data-range="${range}">
          ${escapeHtml(label)}
        </button>
      `).join('')}
    </div>
  `;
}

function renderTrendBars(series, tone = 'primary') {
  const max = Math.max(1, ...series.map((item) => item.count));
  return series.map((item) => `
    <div class="trend-row">
      <span>${escapeHtml(item.label || item.date.slice(5))}</span>
      <div class="trend-track">
        <div class="trend-fill ${tone}" style="width:${Math.max(6, (item.count / max) * 100)}%"></div>
      </div>
      <strong>${escapeHtml(String(item.count))}</strong>
    </div>
  `).join('');
}

function formatTrendValue(value) {
  return `${value >= 0 ? '+' : ''}${escapeHtml(String(value))}%`;
}

function renderSparkline(series, tone = 'primary') {
  const values = series.map((item) => Number(item.count || 0));
  const max = Math.max(1, ...values);
  const width = 120;
  const height = 36;
  const padding = 4;
  const innerWidth = width - (padding * 2);
  const innerHeight = height - (padding * 2);
  const points = series.map((item, index) => {
    const x = series.length > 1 ? padding + (index * (innerWidth / (series.length - 1))) : width / 2;
    const y = padding + ((1 - (Number(item.count || 0) / max)) * innerHeight);
    return { x, y };
  });
  const linePath = points.length ? `M ${points[0].x} ${points[0].y} ${points.slice(1).map((point) => `L ${point.x} ${point.y}`).join(' ')}` : '';
  const areaPath = points.length ? `${linePath} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z` : '';
  return `
    <svg class="sparkline ${tone}" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-hidden="true">
      ${areaPath ? `<path class="sparkline-area" d="${areaPath}"></path>` : ''}
      ${linePath ? `<path class="sparkline-line" d="${linePath}"></path>` : ''}
    </svg>
  `;
}

function renderDashboardMetricSwitch(summary) {
  const options = [
    { key: 'visitors', label: 'Visitors', value: summary.visitorSeries, tone: 'primary' },
    { key: 'clicks', label: 'Clicks', value: summary.clickSeries, tone: 'secondary' },
    { key: 'orders', label: 'Orders', value: summary.orderSeries, tone: 'success' },
  ];
  return `
    <div class="metric-switch">
      ${options.map((item) => `
        <button class="metric-switch-btn ${ui.dashboardMetric === item.key ? 'active' : ''}" data-action="set-dashboard-metric" data-metric="${escapeHtml(item.key)}" type="button">
          ${escapeHtml(item.label)}
        </button>
      `).join('')}
    </div>
  `;
}

function renderTrafficChart(summary = summarizeDashboard()) {
  const config = {
    visitors: {
      label: 'Visitors',
      value: summary.visitors,
      trend: summary.visitorsTrend,
      series: summary.visitorSeries,
      tone: 'primary',
      copy: 'Unique visitor sessions in the selected range.',
    },
    clicks: {
      label: 'Order Clicks',
      value: summary.clicks,
      trend: summary.clicksTrend,
      series: summary.clickSeries,
      tone: 'secondary',
      copy: 'Product card interactions recorded from the live site.',
    },
    orders: {
      label: 'Orders',
      value: summary.orders,
      trend: summary.ordersTrend,
      series: summary.orderSeries,
      tone: 'success',
      copy: 'Completed payment records collected in the selected range.',
    },
  }[ui.dashboardMetric] || {
    label: 'Visitors',
    value: summary.visitors,
    trend: summary.visitorsTrend,
    series: summary.visitorSeries,
    tone: 'primary',
    copy: 'Unique visitor sessions in the selected range.',
  };
  const values = config.series.map((item) => Number(item.count || 0));
  const total = values.reduce((sum, value) => sum + value, 0);
  const peak = values.length ? Math.max(...values) : 0;
  const average = values.length ? Math.round(total / values.length) : 0;
  const latest = values.length ? values[values.length - 1] : 0;
  const max = Math.max(1, ...values);
  const width = 960;
  const height = 320;
  const padding = 28;
  const innerWidth = width - (padding * 2);
  const innerHeight = height - (padding * 2);
  const points = config.series.map((item, index) => {
    const x = config.series.length > 1 ? padding + (index * (innerWidth / (config.series.length - 1))) : width / 2;
    const y = padding + ((1 - (Number(item.count || 0) / max)) * innerHeight);
    return { x, y, label: item.label, count: Number(item.count || 0) };
  });
  const linePath = points.length ? `M ${points[0].x} ${points[0].y} ${points.slice(1).map((point) => `L ${point.x} ${point.y}`).join(' ')}` : '';
  const areaPath = points.length ? `${linePath} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z` : '';
  const ticks = [0, 0.25, 0.5, 0.75, 1];
  const labelStep = Math.max(1, Math.floor(points.length / 5));
  return `
    <section class="panel glass dashboard-chart-panel">
      <div class="panel-head dashboard-chart-head">
        <div>
          <h3>Traffic Overview</h3>
          <p class="section-subtitle">Switch between visitors, clicks, and orders for the selected period.</p>
        </div>
        ${renderDashboardMetricSwitch(summary)}
      </div>
      <div class="dashboard-chart-shell">
        <div class="dashboard-chart-copy">
          <span class="chart-eyebrow">${escapeHtml(config.label)}</span>
          <strong>${escapeHtml(formatNumber(config.value))}</strong>
          <p>${escapeHtml(config.copy)}</p>
          <div class="chart-mini-stats">
            <div>
              <span>Peak</span>
              <strong>${escapeHtml(formatNumber(peak))}</strong>
            </div>
            <div>
              <span>Average</span>
              <strong>${escapeHtml(formatNumber(average))}</strong>
            </div>
            <div>
              <span>Latest</span>
              <strong>${escapeHtml(formatNumber(latest))}</strong>
            </div>
          </div>
        </div>
        <div class="dashboard-chart-area">
          ${points.some((point) => point.count > 0) ? `
            <svg class="dashboard-chart" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" role="img" aria-label="${escapeHtml(config.label)} chart">
              <defs>
                <linearGradient id="chartGradient-${escapeHtml(ui.dashboardMetric)}" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stop-color="var(--primary)" stop-opacity="0.34"></stop>
                  <stop offset="100%" stop-color="var(--primary)" stop-opacity="0.02"></stop>
                </linearGradient>
              </defs>
              ${ticks.map((tick) => `
                <line class="chart-grid-line" x1="0" y1="${padding + (innerHeight * tick)}" x2="${width}" y2="${padding + (innerHeight * tick)}"></line>
              `).join('')}
              ${points.map((point, index) => (index % labelStep === 0 || index === points.length - 1) ? `
                <text class="chart-axis-label" x="${point.x}" y="${height - 8}" text-anchor="middle">${escapeHtml(point.label)}</text>
              ` : '').join('')}
              ${areaPath ? `<path class="chart-area" d="${areaPath}" fill="url(#chartGradient-${escapeHtml(ui.dashboardMetric)})"></path>` : ''}
              ${linePath ? `<path class="chart-line" d="${linePath}"></path>` : ''}
              ${points.map((point) => `
                <circle class="chart-point" cx="${point.x}" cy="${point.y}" r="4"></circle>
              `).join('')}
            </svg>
          ` : `
            <div class="empty-state dashboard-chart-empty">No ${escapeHtml(config.label.toLowerCase())} data in this range yet.</div>
          `}
        </div>
      </div>
    </section>
  `;
}

function buildTopProducts(summary) {
  const range = summary.range;
  const clickCounts = new Map();
  const orderCounts = new Map();
  const performanceKey = (value) => slugify(String(value || '').trim());
  listCollection('events')
    .filter((item) => isInRange(item.timestamp || item.updatedAt || 0, range) && String(item.type || '').toLowerCase().includes('click'))
    .forEach((item) => {
      const key = performanceKey(item.package || item.title || item.label);
      if (!key) return;
      clickCounts.set(key, (clickCounts.get(key) || 0) + 1);
    });
  listCollection('orders')
    .filter((item) => isInRange(item.timestamp || item.updatedAt || 0, range))
    .forEach((item) => {
      const key = performanceKey(item.package || item.title || item.label);
      if (!key) return;
      orderCounts.set(key, (orderCounts.get(key) || 0) + 1);
    });
  const totalClicks = [...clickCounts.values()].reduce((total, value) => total + value, 0);
  return listCollection('products')
    .filter((item) => item.status !== 'deleted')
    .map((item) => {
      const keys = [item.title, item.slug, item.category].map(performanceKey).filter(Boolean);
      const clicks = keys.reduce((best, key) => Math.max(best, clickCounts.get(key) || 0), 0);
      const orders = keys.reduce((best, key) => Math.max(best, orderCounts.get(key) || 0), 0);
      return {
        ...item,
        image: item.image || (Array.isArray(item.galleryImages) ? item.galleryImages[0] : '') || '',
        clicks,
        orders,
        share: totalClicks ? Math.round((clicks / totalClicks) * 100) : 0,
        score: (orders * 3) + clicks,
      };
    })
    .filter((item) => item.clicks || item.orders)
    .sort((a, b) => b.score - a.score || (b.updatedAt || 0) - (a.updatedAt || 0))
    .slice(0, 5);
}

function buildAnalyticsChartModel(series = []) {
  const values = series.map((item) => Number(item.count || 0));
  const hasData = values.some((value) => value > 0);
  const max = Math.max(1, ...values);
  const total = values.reduce((sum, value) => sum + value, 0);
  const peak = values.length ? Math.max(...values) : 0;
  const average = values.length ? Math.round(total / values.length) : 0;
  const latest = values.length ? values[values.length - 1] : 0;
  const width = 960;
  const height = 320;
  const padding = 30;
  const innerWidth = width - (padding * 2);
  const innerHeight = height - (padding * 2);
  const points = series.map((item, index) => {
    const x = series.length > 1 ? padding + (index * (innerWidth / (series.length - 1))) : width / 2;
    const value = Number(item.count || 0);
    const y = padding + ((1 - (value / max)) * innerHeight);
    return {
      x,
      y,
      count: value,
      label: item.label,
      date: item.date,
    };
  });
  const linePath = points.length ? `M ${points[0].x} ${points[0].y} ${points.slice(1).map((point) => `L ${point.x} ${point.y}`).join(' ')}` : '';
  const areaPath = points.length ? `${linePath} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z` : '';
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((fraction) => ({
    value: hasData ? Math.round(max * (1 - fraction)) : 0,
    y: padding + (innerHeight * fraction),
  }));
  return {
    width,
    height,
    padding,
    innerWidth,
    innerHeight,
    points,
    linePath,
    areaPath,
    yTicks,
    total,
    peak,
    average,
    latest,
    max,
  };
}

function getAnalyticsToneColor(tone = 'primary') {
  if (tone === 'secondary') return '#0ea5e9';
  if (tone === 'success') return 'var(--success)';
  if (tone === 'accent') return '#f472b6';
  return 'var(--primary)';
}

function renderAnalyticsChart({ id, title, copy, series, tone = 'primary', metricLabel = 'events' }) {
  const model = buildAnalyticsChartModel(series);
  const labelStep = Math.max(1, Math.ceil(model.points.length / 6));
  const gradientId = `analytics-gradient-${id}`;
  const toneColor = getAnalyticsToneColor(tone);
  return `
    <section class="panel glass analytics-chart-panel" data-analytics-chart data-chart-id="${escapeHtml(id)}" data-chart-label="${escapeHtml(metricLabel)}">
      <div class="analytics-chart-head">
        <div>
          <h3>${escapeHtml(title)}</h3>
          <p>${escapeHtml(copy)}</p>
        </div>
        <div class="analytics-chart-summary">
          <span>Peak</span>
          <strong>${escapeHtml(formatNumber(model.peak))}</strong>
          <span>Average ${escapeHtml(formatNumber(model.average))}</span>
        </div>
      </div>
      <div class="analytics-chart-shell">
        <div class="analytics-chart-copy">
          <div class="analytics-chart-stat">
            <span>Total</span>
            <strong>${escapeHtml(formatNumber(model.total))}</strong>
          </div>
          <div class="analytics-chart-stat">
            <span>Latest</span>
            <strong>${escapeHtml(formatNumber(model.latest))}</strong>
          </div>
        </div>
        <div class="analytics-chart-area">
          <svg class="analytics-chart" viewBox="0 0 ${model.width} ${model.height}" preserveAspectRatio="none" role="img" aria-label="${escapeHtml(title)} chart">
            <defs>
              <linearGradient id="${escapeHtml(gradientId)}" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stop-color="${escapeHtml(toneColor)}" stop-opacity="0.34"></stop>
                <stop offset="100%" stop-color="${escapeHtml(toneColor)}" stop-opacity="0.02"></stop>
              </linearGradient>
            </defs>
            ${model.yTicks.map((tick) => `
              <line class="analytics-chart-gridline" x1="${model.padding}" y1="${tick.y}" x2="${model.width - model.padding}" y2="${tick.y}"></line>
              <text class="analytics-chart-axis-y" x="${model.padding - 10}" y="${tick.y}" text-anchor="end" dominant-baseline="middle">${escapeHtml(formatNumber(tick.value))}</text>
            `).join('')}
            ${model.points.map((point, index) => (index % labelStep === 0 || index === model.points.length - 1) ? `
              <text class="analytics-chart-axis-x" x="${point.x}" y="${model.height - 10}" text-anchor="middle">${escapeHtml(point.label || '')}</text>
            ` : '').join('')}
            ${model.areaPath ? `<path class="analytics-chart-area ${escapeHtml(tone)}" d="${model.areaPath}" fill="url(#${escapeHtml(gradientId)})"></path>` : ''}
            ${model.linePath ? `<path class="analytics-chart-line ${escapeHtml(tone)}" d="${model.linePath}"></path>` : ''}
            ${model.points.map((point) => `
              <g class="analytics-chart-point-group" data-chart-point tabindex="0" role="img" aria-label="${escapeHtml(`${point.label}: ${formatNumber(point.count)} ${metricLabel}`)}" data-label="${escapeHtml(point.label || '')}" data-value="${escapeHtml(String(point.count))}" data-series="${escapeHtml(metricLabel)}" data-point-x="${escapeHtml(String(point.x))}" data-point-y="${escapeHtml(String(point.y))}">
                <circle class="analytics-chart-hit" cx="${point.x}" cy="${point.y}" r="16"></circle>
                <circle class="analytics-chart-point ${escapeHtml(tone)}" cx="${point.x}" cy="${point.y}" r="4"></circle>
              </g>
            `).join('')}
          </svg>
          <div class="analytics-chart-tooltip" data-role="chart-tooltip" aria-hidden="true"></div>
        </div>
      </div>
    </section>
  `;
}

function renderAnalyticsKpis(summary, topProduct) {
  const conversionRate = summary.visitors ? Math.round((summary.orders / summary.visitors) * 1000) / 10 : 0;
  const topName = topProduct?.title || topProduct?.name || 'No top product yet';
  const topClicks = Number(topProduct?.clicks || 0);
  return `
    <div class="analytics-kpi-grid">
      ${renderCompactStatCard('Visitors', summary.visitors, `vs previous ${summary.range}`, 'users', 'primary')}
      ${renderCompactStatCard('Order Clicks', summary.clicks, `vs previous ${summary.range}`, 'mouse-pointer-click', 'secondary')}
      ${renderCompactStatCard('Orders', summary.orders, `vs previous ${summary.range}`, 'receipt-text', 'success')}
      ${renderCompactStatCard('Conversion Rate', `${conversionRate.toFixed(1)}%`, `${summary.orders} orders from ${summary.visitors} visitors`, 'arrow-right-left', 'accent')}
      <div class="compact-stat glass analytics-top-product-card">
        <div class="compact-stat-top">
          <span class="compact-stat-label">Top Product</span>
          <span class="kpi-icon accent"><i data-lucide="award"></i></span>
        </div>
        <div class="analytics-top-product-name">${escapeHtml(topName)}</div>
        <span>${escapeHtml(topClicks ? `${formatNumber(topClicks)} clicks` : 'No clicks yet')}</span>
      </div>
    </div>
  `;
}

function renderTopProductsAnalytics(products, totalClicks) {
  if (!products.length) {
    return '<div class="empty-state analytics-empty">No click data yet for this range.</div>';
  }
  return `
    <div class="analytics-product-list">
      ${products.map((item, index) => `
        <div class="analytics-product-row">
          <div class="analytics-product-rank">${escapeHtml(String(index + 1))}</div>
          <div class="analytics-product-thumb">
            ${item.image ? `<img src="${escapeHtml(resolveMediaSource(item.image) || item.image)}" alt="${escapeHtml(item.title || 'Product')}" loading="lazy" />` : '<div class="analytics-thumb-fallback">No image</div>'}
          </div>
          <div class="analytics-product-meta">
            <strong>${escapeHtml(item.title || item.name || item.slug || 'Untitled product')}</strong>
            <span>${escapeHtml(item.category || 'Uncategorized')}</span>
          </div>
          <div class="analytics-product-stats">
            <strong>${escapeHtml(formatNumber(item.clicks || 0))}</strong>
            <span>${escapeHtml(totalClicks ? `${item.share || 0}% share` : '0% share')}</span>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function mountAnalyticsCharts() {
  const charts = [...viewRoot.querySelectorAll('[data-analytics-chart]')];
  charts.forEach((chart) => {
    const tooltip = chart.querySelector('[data-role="chart-tooltip"]');
    const points = [...chart.querySelectorAll('[data-chart-point]')];
    if (!tooltip || !points.length) return;
    const hideTooltip = () => {
      tooltip.classList.remove('visible');
      tooltip.setAttribute('aria-hidden', 'true');
    };
    const showTooltip = (point, event) => {
      const label = point.dataset.label || '';
      const value = Number(point.dataset.value || 0);
      const series = point.dataset.series || 'events';
      const rect = chart.querySelector('.analytics-chart-area')?.getBoundingClientRect();
      if (!rect) return;
      const pointRect = point.getBoundingClientRect();
      const x = event?.clientX ? event.clientX - rect.left : (pointRect.left - rect.left) + (pointRect.width / 2);
      const y = event?.clientY ? event.clientY - rect.top : (pointRect.top - rect.top);
      tooltip.innerHTML = `
        <strong>${escapeHtml(label)}</strong>
        <span>${escapeHtml(formatNumber(value))} ${escapeHtml(series)}</span>
      `;
      tooltip.style.left = `${Math.min(rect.width - 12, Math.max(12, x))}px`;
      tooltip.style.top = `${Math.min(rect.height - 12, Math.max(12, y))}px`;
      tooltip.classList.add('visible');
      tooltip.setAttribute('aria-hidden', 'false');
    };
    points.forEach((point) => {
      point.addEventListener('pointerenter', (event) => showTooltip(point, event));
      point.addEventListener('pointermove', (event) => showTooltip(point, event));
      point.addEventListener('focus', (event) => showTooltip(point, event));
      point.addEventListener('blur', hideTooltip);
      point.addEventListener('pointerleave', hideTooltip);
    });
    chart.addEventListener('mouseleave', hideTooltip);
  });
}

function getActivityIcon(type) {
  const value = String(type || '').toLowerCase();
  if (value.includes('order')) return 'shopping-bag';
  if (value.includes('click')) return 'mouse-pointer-click';
  if (value.includes('visitor')) return 'users';
  if (value.includes('product') || value.includes('catalog')) return 'package';
  return 'sparkles';
}

function renderKpiCard({ label, value, change, note, icon, series, tone, valuePrefix = '' }) {
  return `
    <article class="kpi-card glass ${change !== null && change !== undefined ? 'kpi-card-dynamic' : ''}">
      <div class="kpi-card-top">
        <span class="kpi-label">${escapeHtml(label)}</span>
        <span class="kpi-icon ${escapeHtml(tone)}"><i data-lucide="${escapeHtml(icon)}"></i></span>
      </div>
      <div class="kpi-value">${escapeHtml(valuePrefix)}${escapeHtml(String(value))}</div>
      <div class="kpi-meta">
        <span class="kpi-change ${change >= 0 ? 'up' : 'down'}">${formatTrendValue(change || 0)}</span>
        <span>${escapeHtml(note)}</span>
      </div>
      <div class="kpi-sparkline">${renderSparkline(series, tone)}</div>
    </article>
  `;
}

function renderCompactStatCard(label, value, note, icon, tone = 'primary') {
  return `
    <div class="compact-stat glass">
      <div class="compact-stat-top">
        <span class="compact-stat-label">${escapeHtml(label)}</span>
        <span class="kpi-icon ${escapeHtml(tone)}"><i data-lucide="${escapeHtml(icon)}"></i></span>
      </div>
      <strong>${escapeHtml(String(value))}</strong>
      <span>${escapeHtml(note)}</span>
    </div>
  `;
}

function renderNotificationsPanel(summary = summarizeDashboard()) {
  const activity = recentActivity(12);
  return `
    <div class="panel-head">
      <div>
        <h2 class="section-title">Live Alerts</h2>
        <p class="section-subtitle">Recent visitors, click events, and order updates from the site.</p>
      </div>
      <button class="btn btn-ghost" data-close-modal type="button"><i data-lucide="x"></i></button>
    </div>
    <div class="notification-summary">
      <div class="summary-card">
        <span>${escapeHtml(summary.range)} Visitors</span>
        <strong>${escapeHtml(String(summary.visitors))}</strong>
      </div>
      <div class="summary-card">
        <span>Order Clicks</span>
        <strong>${escapeHtml(String(summary.clicks))}</strong>
      </div>
      <div class="summary-card">
        <span>Orders</span>
        <strong>${escapeHtml(String(summary.orders))}</strong>
      </div>
    </div>
    <div class="timeline-list notification-list">
      ${activity.length ? activity.map((item) => `
        <div class="timeline-item">
          <div class="timeline-dot"><i data-lucide="${escapeHtml(getActivityIcon(item.type))}"></i></div>
          <div>
            <strong>${escapeHtml(item.title)}</strong>
            <div class="meta">${escapeHtml(item.type)} - ${escapeHtml(item.meta || 'live')} - ${escapeHtml(formatDateTime(item.timestamp))}</div>
          </div>
        </div>
      `).join('') : '<div class="empty-state">No alerts yet.</div>'}
    </div>
  `;
}

function getCatalogMeta(tab = ui.catalogTab) {
  const node = tab === 'categories' ? 'categories' : 'products';
  return {
    node,
    schema: collectionSchemas[node],
    title: node === 'products' ? 'Products' : 'Categories',
    subtitle: node === 'products'
      ? 'Manage the live product cards that appear on the public site.'
      : 'Manage the live category cards and the way they group catalog content.',
  };
}

function summarizeSources() {
  return [
    { label: 'Firebase RTDB', value: `${stats().products + stats().categories + stats().orders} live records` },
    { label: 'Supabase Storage', value: `${listCollection('media').length} uploaded assets` },
    { label: 'Public Site', value: 'Live catalog sync enabled' },
  ];
}

function resolveMediaSource(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (/^(https?:)?\/\//i.test(raw) || raw.startsWith('data:') || raw.startsWith('blob:')) return raw;
  const normalized = normalizeAssetValue(raw);
  const match = listCollection('media').find((item) => mediaMatchesReference(item, normalized) || mediaMatchesReference(item, raw));
  if (match?.publicUrl) return match.publicUrl;
  return raw.startsWith('/') ? raw : `/${raw}`;
}

function mediaPreview(item) {
  const rawSrc = item.publicUrl
    || item.video
    || item.image
    || (Array.isArray(item.images) ? item.images[0] : '')
    || (Array.isArray(item.galleryImages) ? item.galleryImages[0] : '')
    || item.thumbnail
    || item.cover
    || item.photo
    || item.logo
    || item.backgroundImage
    || item.bannerImage
    || item.heroImage
    || '';
  const src = resolveMediaSource(rawSrc);
  if (!src) return '';
  if (String(item.type || '').toLowerCase() === 'video' || /\.(mp4|webm|mov|m4v)$/i.test(src)) {
    return `<video class="thumb-media" src="${escapeHtml(src)}" autoplay muted loop playsinline></video>`;
  }
  return `<img class="thumb-media" src="${escapeHtml(src)}" alt="${escapeHtml(item.title || item.name || 'Preview')}" loading="lazy" />`;
}

function renderDataPill(label, value) {
  return `
    <div class="data-pill">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
    </div>
  `;
}

function getCatalogItems(node) {
  return node === 'categories' ? listCollection('categories') : listCollection('products');
}

function getCatalogCounts() {
  const products = listCollection('products').filter((item) => item.status !== 'deleted');
  const categories = listCollection('categories').filter((item) => item.status !== 'deleted');
  const media = listCollection('media');
  const latestStamp = [...products, ...categories, ...media]
    .map((item) => Number(item.updatedAt || item.createdAt || 0))
    .filter(Boolean)
    .sort((a, b) => b - a)[0] || 0;
  return {
    products: products.length,
    categories: categories.length,
    images: media.length,
    lastSync: latestStamp,
  };
}

function getCategoryOptions() {
  const categories = listCollection('categories')
    .filter((item) => item.status !== 'deleted')
    .sort((a, b) => String(a.title || '').localeCompare(String(b.title || '')));
  const productCats = listCollection('products')
    .filter((item) => item.status !== 'deleted' && item.category)
    .map((item) => String(item.category || '').trim())
    .filter(Boolean);
  const merged = new Map();
  [...categories.map((item) => ({
    value: item.slug || item.title || item.id,
    label: item.title || item.slug || item.id,
  })), ...productCats.map((item) => ({
    value: slugify(item) || item,
    label: item,
  }))].forEach((item) => {
    if (!item.value || merged.has(item.value)) return;
    merged.set(item.value, item.label);
  });
  return [...merged.entries()].map(([value, label]) => ({ value, label }));
}

function countProductsForCategory(category) {
  const title = String(category?.title || '').trim().toLowerCase();
  const slug = String(category?.slug || '').trim().toLowerCase();
  return listCollection('products').filter((item) => {
    const value = String(item.category || '').trim().toLowerCase();
    return value === title || value === slug;
  }).length;
}

function normalizeFeatureList(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || '').trim()).filter(Boolean);
  }
  if (typeof value === 'string') {
    return value
      .split(/\n|,/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function catalogImageCount(item) {
  const gallery = Array.isArray(item.galleryImages) ? item.galleryImages.filter(Boolean).length : 0;
  const images = Array.isArray(item.images) ? item.images.filter(Boolean).length : 0;
  return Math.max(images, gallery + (item.image ? 1 : 0));
}

function catalogMetaValue(item, key) {
  const value = item?.[key];
  if (key === 'updatedAt' || key === 'createdAt') return formatDateTime(value);
  if (key === 'status') return String(value || 'active');
  return String(value || '-');
}

function catalogCardBadge(status) {
  const value = String(status || 'active').toLowerCase();
  const cls = value === 'active' ? 'success' : value === 'hidden' ? 'warning' : value === 'draft' ? 'badge' : 'danger';
  return `<span class="badge ${cls}">${escapeHtml(value)}</span>`;
}

function selectSelection(ids = [], enabled = true) {
  const nextIds = Array.isArray(ids) ? ids : [ids];
  nextIds.filter(Boolean).forEach((id) => {
    if (enabled) ui.selection.add(id);
    else ui.selection.delete(id);
  });
}

function clearSelection() {
  ui.selection.clear();
}

function isSelected(id) {
  return ui.selection.has(id);
}

function toggleSelection(id) {
  if (!id) return;
  if (ui.selection.has(id)) ui.selection.delete(id);
  else ui.selection.add(id);
}

function itemPreviewThumb(item) {
  return mediaPreview(item) || '<div class="preview-fallback">No image</div>';
}

function itemMediaCountLabel(item) {
  const count = catalogImageCount(item);
  return `${count} image${count === 1 ? '' : 's'}`;
}

function itemOrderCountLabel(item) {
  const value = item.orderCount ?? item.orders ?? item.orderClicks ?? item.orderTotal;
  return value === undefined || value === null || value === '' ? '-' : String(value);
}

function productRecordMetrics(item) {
  return [
    { label: 'Price INR', value: item.priceINR || '-' },
    { label: 'Price USD', value: item.priceUSD || '-' },
    { label: 'Orders', value: itemOrderCountLabel(item) },
    { label: 'Created', value: catalogMetaValue(item, 'createdAt') },
    { label: 'Updated', value: catalogMetaValue(item, 'updatedAt') },
    { label: 'Order', value: item.displayOrder || '-' },
  ];
}

function categoryRecordMetrics(item) {
  return [
    { label: 'Products', value: String(countProductsForCategory(item)) },
    { label: 'Visibility', value: catalogMetaValue(item, 'status') },
    { label: 'Order', value: item.displayOrder || '-' },
    { label: 'Updated', value: catalogMetaValue(item, 'updatedAt') },
  ];
}

function renderCatalogMetric(label, value, detail = '') {
  return `
    <div class="catalog-metric glass">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(String(value))}</strong>
      ${detail ? `<small>${escapeHtml(detail)}</small>` : ''}
    </div>
  `;
}

function closeCatalogActionMenus() {
  document.querySelectorAll('.catalog-card-menu[open]').forEach((menu) => {
    menu.removeAttribute('open');
  });
  document.querySelectorAll('.catalog-mobile-actions[open]').forEach((menu) => {
    menu.removeAttribute('open');
  });
}

function renderCatalogActionMenu(item, node) {
  const isCategory = node === 'categories';
  const toggleAction = String(item.status || 'active') === 'hidden' ? 'Show' : 'Hide';
  const toggleIcon = String(item.status || 'active') === 'hidden' ? 'eye' : 'eye-off';
  return `
    <details class="catalog-card-menu">
      <summary aria-label="More actions"><i data-lucide="ellipsis"></i><span>More</span></summary>
      <div class="catalog-card-menu-panel">
        <button type="button" class="catalog-card-menu-item" data-action="share-product" data-node="${node}" data-id="${escapeHtml(item.id)}"><i data-lucide="share-2"></i> Share Product</button>
        ${isCategory ? `
          <button type="button" class="catalog-card-menu-item" data-action="move-up" data-node="${node}" data-id="${escapeHtml(item.id)}"><i data-lucide="arrow-up"></i> Move up</button>
          <button type="button" class="catalog-card-menu-item" data-action="move-down" data-node="${node}" data-id="${escapeHtml(item.id)}"><i data-lucide="arrow-down"></i> Move down</button>
        ` : `
          <button type="button" class="catalog-card-menu-item" data-action="duplicate" data-node="${node}" data-id="${escapeHtml(item.id)}"><i data-lucide="copy"></i> Duplicate</button>
        `}
        <button type="button" class="catalog-card-menu-item" data-action="toggle" data-node="${node}" data-id="${escapeHtml(item.id)}"><i data-lucide="${toggleIcon}"></i> ${toggleAction}</button>
        <button type="button" class="catalog-card-menu-item danger" data-action="delete" data-node="${node}" data-id="${escapeHtml(item.id)}"><i data-lucide="trash-2"></i> Delete</button>
      </div>
    </details>
  `;
}

function openCategoryProducts(item) {
  const value = String(item?.slug || item?.title || item?.id || '').trim();
  ui.route = 'catalog';
  ui.catalogTab = 'products';
  ui.filters.category = value || 'all';
  ui.catalogFiltersOpen = false;
  ui.page = 1;
  clearSelection();
  persistCatalogPrefs();
  renderView(ui.data || {});
}

function renderCatalogProductCard(item, node) {
  const active = isSelected(item.id);
  const compactMobile = isMobileViewport();
  const features = normalizeFeatureList(item.features);
  const badges = [
    item.category ? `<span class="chip">${escapeHtml(item.category)}</span>` : '',
    catalogCardBadge(item.status),
    item.image || (Array.isArray(item.galleryImages) && item.galleryImages.length) ? `<span class="chip">${escapeHtml(itemMediaCountLabel(item))}</span>` : '',
  ].filter(Boolean).join('');
  const metrics = (compactMobile
    ? [
      { label: 'INR', value: item.priceINR || '-' },
      { label: 'Gallery', value: itemMediaCountLabel(item) },
      { label: 'Updated', value: catalogMetaValue(item, 'updatedAt') },
    ]
    : [
      { label: 'INR', value: item.priceINR || '-' },
      { label: 'USD', value: item.priceUSD || '-' },
      { label: 'Orders', value: itemOrderCountLabel(item) },
      { label: 'Created', value: catalogMetaValue(item, 'createdAt') },
      { label: 'Updated', value: catalogMetaValue(item, 'updatedAt') },
    ]).map((entry) => `
    <div class="catalog-meta-item">
      <span>${escapeHtml(entry.label)}</span>
      <strong>${escapeHtml(String(entry.value))}</strong>
    </div>
  `).join('');
  return `
    <article class="catalog-card catalog-card-product ${active ? 'selected' : ''}" data-id="${escapeHtml(item.id)}">
      <label class="catalog-select">
        <input type="checkbox" data-action="toggle-select-item" data-id="${escapeHtml(item.id)}" ${active ? 'checked' : ''} />
      </label>
      <div class="catalog-card-media">
        <button class="catalog-media-frame catalog-media-button" type="button" data-action="preview" data-node="${node}" data-id="${escapeHtml(item.id)}">${itemPreviewThumb(item)}</button>
        <span class="catalog-image-badge">${escapeHtml(itemMediaCountLabel(item))}</span>
      </div>
      <div class="catalog-card-content catalog-card-tapzone" data-action="preview" data-node="${node}" data-id="${escapeHtml(item.id)}">
        <div class="catalog-card-head">
          <div>
            <h3>${escapeHtml(item.title || item.slug || 'Untitled')}</h3>
            ${compactMobile ? '' : `<p>${escapeHtml(item.description || item.review || item.answer || '-')}</p>`}
          </div>
          <div class="catalog-card-badges">${badges}</div>
        </div>
        <div class="catalog-card-chips">
          ${features.slice(0, 3).map((feature) => `<span class="chip subtle">${escapeHtml(feature)}</span>`).join('')}
        </div>
        <div class="catalog-card-metrics">${metrics}</div>
      </div>
      <div class="catalog-card-actions">
        <div class="catalog-card-primary-actions">
          <button class="icon-btn" data-action="preview" data-node="${node}" data-id="${escapeHtml(item.id)}"><i data-lucide="eye"></i> Preview</button>
          <button class="icon-btn" data-action="edit" data-node="${node}" data-id="${escapeHtml(item.id)}"><i data-lucide="pencil"></i> Edit</button>
        </div>
        ${renderCatalogActionMenu(item, node)}
      </div>
    </article>
  `;
}

function renderCatalogCategoryCard(item, node) {
  const active = isSelected(item.id);
  const compactMobile = isMobileViewport();
  const productCount = countProductsForCategory(item);
  const metrics = (compactMobile
    ? [
      { label: 'Products', value: String(productCount) },
      { label: 'Order', value: item.displayOrder || '-' },
      { label: 'Updated', value: catalogMetaValue(item, 'updatedAt') },
    ]
    : [
      { label: 'Products', value: String(productCount) },
      { label: 'Status', value: catalogMetaValue(item, 'status') },
      { label: 'Order', value: item.displayOrder || '-' },
      { label: 'Updated', value: catalogMetaValue(item, 'updatedAt') },
    ]).map((entry) => `
    <div class="catalog-meta-item">
      <span>${escapeHtml(entry.label)}</span>
      <strong>${escapeHtml(String(entry.value))}</strong>
    </div>
  `).join('');
  return `
    <article class="catalog-card catalog-card-category ${active ? 'selected' : ''}" data-id="${escapeHtml(item.id)}">
      <label class="catalog-select">
        <input type="checkbox" data-action="toggle-select-item" data-id="${escapeHtml(item.id)}" ${active ? 'checked' : ''} />
      </label>
      <div class="catalog-card-media compact category-card-media">
        <button class="catalog-media-frame catalog-media-button" type="button" data-action="preview" data-node="${node}" data-id="${escapeHtml(item.id)}">${itemPreviewThumb(item)}</button>
        <span class="catalog-image-badge">Category</span>
      </div>
      <div class="catalog-card-content catalog-card-tapzone" data-action="preview" data-node="${node}" data-id="${escapeHtml(item.id)}">
        <div class="catalog-card-head">
          <div>
            <div class="catalog-card-kicker">Category</div>
            <h3>${escapeHtml(item.title || item.slug || 'Untitled')}</h3>
            ${compactMobile ? '' : `<p>${escapeHtml(item.description || '-')}</p>`}
          </div>
          <div class="catalog-card-badges">
            ${catalogCardBadge(item.status)}
            <span class="chip">${escapeHtml(String(productCount))} products</span>
          </div>
        </div>
        <div class="catalog-card-metrics">${metrics}</div>
      </div>
      <div class="catalog-card-actions">
        <div class="catalog-card-primary-actions">
          <button class="icon-btn" data-action="preview" data-node="${node}" data-id="${escapeHtml(item.id)}"><i data-lucide="eye"></i> Preview</button>
          <button class="icon-btn" data-action="edit" data-node="${node}" data-id="${escapeHtml(item.id)}"><i data-lucide="pencil"></i> Edit</button>
          <button class="icon-btn" data-action="view-products" data-node="${node}" data-id="${escapeHtml(item.id)}"><i data-lucide="layout-list"></i> View Products</button>
        </div>
        ${renderCatalogActionMenu(item, node)}
      </div>
    </article>
  `;
}

function buildCatalogFilters(node, items) {
  const categoryOptions = getCategoryOptions();
  const selectedCount = ui.selection.size;
  const selectedText = selectedCount ? `${selectedCount} selected` : 'No selection';
  return `
    <div class="catalog-toolbar-shell glass sticky ${ui.catalogFiltersOpen ? 'filters-open' : ''}">
      <button class="catalog-filter-backdrop" data-action="toggle-catalog-filters" type="button" aria-hidden="true"></button>
      <div class="catalog-toolbar-top">
        <div class="catalog-search">
          <label class="sr-only" for="collectionSearch">Search</label>
          <input class="input catalog-search-input" type="search" placeholder="Search ${escapeHtml(node === 'products' ? 'products' : 'categories')}" id="collectionSearch" value="${escapeHtml(ui.search)}" />
        </div>
        <div class="catalog-toolbar-actions">
          <button class="btn btn-ghost catalog-filters-toggle" data-action="toggle-catalog-filters" type="button"><i data-lucide="sliders-horizontal"></i> Filters</button>
          <div class="catalog-view-switch">
            <button class="view-switch ${ui.catalogView === 'grid' ? 'active' : ''}" data-action="set-catalog-view" data-view="grid"><i data-lucide="grid-2x2"></i> Grid</button>
            <button class="view-switch ${ui.catalogView === 'list' ? 'active' : ''}" data-action="set-catalog-view" data-view="list"><i data-lucide="rows-3"></i> List</button>
          </div>
        </div>
      </div>
      <div class="catalog-filter-panel">
        <div class="catalog-selects">
          <select class="select" id="categoryFilter">
            <option value="all">All Categories</option>
            ${categoryOptions.map((option) => `<option value="${escapeHtml(option.value)}" ${ui.filters.category === option.value ? 'selected' : ''}>${escapeHtml(option.label)}</option>`).join('')}
          </select>
          <select class="select" id="statusFilter">
            <option value="all">All Status</option>
            <option value="active" ${ui.filters.status === 'active' ? 'selected' : ''}>Active</option>
            <option value="hidden" ${ui.filters.status === 'hidden' ? 'selected' : ''}>Hidden</option>
            <option value="draft" ${ui.filters.status === 'draft' ? 'selected' : ''}>Draft</option>
          </select>
          <select class="select" id="sortFilter">
            <option value="updatedAt" ${ui.sort === 'updatedAt' ? 'selected' : ''}>Latest Updated</option>
            <option value="displayOrder" ${ui.sort === 'displayOrder' ? 'selected' : ''}>Display Order</option>
            <option value="title" ${ui.sort === 'title' ? 'selected' : ''}>Title A-Z</option>
          </select>
          <select class="select" id="pageSizeFilter">
            ${[8, 12, 24, 48].map((size) => `<option value="${size}" ${Number(ui.catalogPageSize) === size ? 'selected' : ''}>${size} per page</option>`).join('')}
          </select>
        </div>
        <div class="catalog-filter-footer">
          <button class="btn btn-ghost" type="button" data-action="catalog-reset-filters"><i data-lucide="rotate-ccw"></i> Reset</button>
          <button class="btn btn-primary" type="button" data-action="catalog-apply-filters"><i data-lucide="check"></i> Apply Filters</button>
        </div>
      </div>
    </div>
    <div class="bulk-toolbar glass${selectedCount ? ' open' : ''}">
      <div>
        <strong>${escapeHtml(selectedText)}</strong>
        <p>Bulk actions apply to the current selection only.</p>
      </div>
      <div class="toolbar">
        <button class="btn btn-ghost" data-action="select-visible">${escapeHtml(selectedCount ? 'Deselect Visible' : 'Select Visible')}</button>
        <button class="btn btn-ghost" data-action="bulk" data-bulk-action="duplicate" ${selectedCount ? '' : 'disabled'}>Duplicate</button>
        <button class="btn btn-ghost" data-action="bulk" data-bulk-action="hide" ${selectedCount ? '' : 'disabled'}>Hide</button>
        <button class="btn btn-ghost" data-action="bulk" data-bulk-action="show" ${selectedCount ? '' : 'disabled'}>Show</button>
        <button class="btn btn-ghost" data-action="bulk" data-bulk-action="move-category" ${selectedCount && node === 'products' ? '' : 'disabled'}>Move Category</button>
        <button class="btn btn-danger" data-action="bulk" data-bulk-action="delete" ${selectedCount ? '' : 'disabled'}>Delete</button>
      </div>
    </div>
  `;
}

function mediaFileName(path) {
  const clean = String(path || '').split('?')[0].split('#')[0];
  return clean.split('/').filter(Boolean).pop() || 'asset';
}

function mediaTypeFromPath(path) {
  if (/\.(mp4|webm|mov|m4v)$/i.test(path || '')) return 'video';
  return 'image';
}

function mediaFolderForNode(node, kind) {
  const base = node === 'categories' ? 'categories' : 'products';
  if (kind === 'gallery') return `${base}/gallery`;
  return base;
}

function normalizeStorageFolder(folder) {
  const value = String(folder || '').trim();
  if (!value) return 'images';
  if (value === 'banner') return 'banners';
  return value;
}

function normalizeAssetValue(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  return raw.split('#')[0].split('?')[0];
}

function recordAssetRefs(record) {
  if (!record || typeof record !== 'object') return [];
  const refs = new Set();
  const add = (value) => {
    const normalized = normalizeAssetValue(value);
    if (normalized) refs.add(normalized);
  };
  const addList = (value) => {
    if (Array.isArray(value)) value.forEach(add);
    else add(value);
  };

  ['image', 'thumbnail', 'cover', 'photo', 'logo', 'backgroundImage', 'bannerImage', 'heroImage', 'publicUrl', 'path', 'sourcePath'].forEach((key) => add(record[key]));
  ['images', 'galleryImages', 'thumbnails', 'slides', 'media', 'mediaUrls'].forEach((key) => addList(record[key]));

  return [...refs];
}

function mediaMatchesReference(media, reference) {
  const candidates = recordAssetRefs(media);
  const target = normalizeAssetValue(reference);
  if (!target) return false;
  const targetName = mediaFileName(target).toLowerCase();
  const targetBase = target.replace(/^\/+/, '').toLowerCase();
  return candidates.some((candidate) => {
    const value = candidate.toLowerCase();
    return value === targetBase
      || value === target.toLowerCase()
      || mediaFileName(value).toLowerCase() === targetName;
  });
}

async function deleteMediaIfUnused(reference, keepContext = null) {
  const target = normalizeAssetValue(reference);
  if (!target) return;
  const scanNodes = ['products', 'categories', 'media', 'hero', 'banner', 'testimonials'];
  const referencedElsewhere = scanNodes.some((node) => {
    return listCollection(node).some((item) => {
      if (keepContext && node === keepContext.node && item.id === keepContext.id) return false;
      return recordAssetRefs(item).some((candidate) => mediaMatchesReference({ image: candidate }, target));
    });
  });
  if (referencedElsewhere) return;
  const matches = listCollection('media').filter((item) => mediaMatchesReference(item, target));
  if (!matches.length) return;
  for (const media of matches) {
    const storagePath = normalizeAssetValue(media.path || media.sourcePath || media.publicUrl || media.image || '');
    if (storagePath) {
      try {
        await deletePublicAsset(storagePath);
      } catch (_) {
        // Keep going: the file may already be removed or inaccessible.
      }
    }
    if (media.id) {
      try {
        await deleteRecord('media', media.id);
      } catch (_) {
        // Ignore record cleanup failures.
      }
    }
  }
}

async function saveUploadedMediaRecord(file, result, folder, type, source = 'admin', sourcePath = '') {
  await saveRecord('media', uid('media'), {
    name: file.name,
    folder: normalizeStorageFolder(folder),
    type,
    path: result.path,
    publicUrl: result.publicUrl,
    sourcePath,
    size: file.size,
    mime: file.type,
    source,
    status: 'active',
  });
}

async function uploadRecordMedia(form, node, next) {
  const imageFile = form.querySelector('input[name="imageFile"]')?.files?.[0] || null;
  const photoFile = form.querySelector('input[name="photoFile"]')?.files?.[0] || null;
  const galleryFiles = [...(form.querySelector('input[name="galleryFiles"]')?.files || [])];
  const uploaded = [];
  const uploadOne = async (file, folder, type, source) => {
    const result = await uploadAsset(file, folder);
    uploaded.push(result.path);
    await saveUploadedMediaRecord(file, result, folder, type, source, `${source}:${file.name}`);
    return result.publicUrl;
  };
  try {
    if (imageFile) {
      next.image = await uploadOne(imageFile, mediaFolderForNode(node, 'image'), 'image', `${node}-record`);
    }
    if (photoFile) {
      next.photo = await uploadOne(photoFile, mediaFolderForNode(node, 'photo'), 'image', `${node}-record`);
    }
    if (galleryFiles.length) {
      const urls = [];
      for (const file of galleryFiles) {
        urls.push(await uploadOne(file, mediaFolderForNode(node, 'gallery'), 'image', `${node}-record`));
      }
      const existingGallery = Array.isArray(next.galleryImages) ? next.galleryImages.filter(Boolean) : [];
      next.galleryImages = [...new Set([...existingGallery, ...urls])];
    }
    if (next.image) {
      const gallery = Array.isArray(next.galleryImages) ? next.galleryImages.filter(Boolean) : [];
      next.images = [...new Set([next.image, ...gallery])];
    } else if (Array.isArray(next.galleryImages) && next.galleryImages.length) {
      next.images = [...new Set(next.galleryImages.filter(Boolean))];
    }
    return next;
  } catch (error) {
    for (const path of uploaded.reverse()) {
      try {
        await deletePublicAsset(path);
      } catch (_) {
        // Ignore cleanup failures and surface the original error.
      }
    }
    throw error;
  }
}

async function syncFirebaseCollection(node, records) {
  const list = normalizeCatalogRecords(records);
  for (const record of list) {
    await saveRecord(node, record.id, record);
  }
  return list.length;
}

// syncCurrentSiteCatalog: REMOVED — was overwriting Firebase data from HTML scraping,
// causing all admin changes to revert. Do not restore.

async function syncCurrentSiteMedia() {
  const confirmed = confirm('Import the current public site images into Supabase Storage and save media metadata in Firebase?');
  if (!confirmed) return;
  try {
    setMediaStatus('Scanning public site images...');
    const catalog = await fetchCurrentSiteCatalog();
    const assets = [...new Set(catalog.assets)];
    if (!assets.length) {
      setMediaStatus('No site images found.');
      showToast('No site assets found', 'warning');
      return;
    }
    let imported = 0;
    let skipped = 0;
    const total = assets.length;
    setMediaStatus(`Importing 0 / ${total} assets...`);
    for (const asset of assets) {
      const path = String(asset || '').trim();
      if (!path) continue;
      const existing = listCollection('media').find((item) => item.sourcePath === path || item.path === path);
      if (existing) {
        skipped += 1;
        setMediaStatus(`Importing ${imported} / ${total} assets...`);
        continue;
      }
      const response = await fetch(path, { cache: 'no-store' });
      if (!response.ok) continue;
      const blob = await response.blob();
      const file = new File([blob], mediaFileName(path), { type: blob.type || 'application/octet-stream' });
      const lowerPath = path.toLowerCase();
      const folder = lowerPath.includes('category')
        ? 'categories'
        : lowerPath.includes('photo') || lowerPath.includes('product')
          ? 'products'
          : lowerPath.includes('binance') || lowerPath.includes('paypal') || lowerPath.includes('upi')
            ? 'logos'
            : lowerPath.includes('hero')
              ? 'hero'
              : lowerPath.includes('banner')
                ? 'banners'
                : lowerPath.includes('testimonial') || lowerPath.includes('review')
                  ? 'testimonials'
                  : 'images';
      const result = await uploadAsset(file, folder);
      await saveRecord('media', slugify(path), {
        id: slugify(path),
        name: mediaFileName(path),
        folder: normalizeStorageFolder(folder),
        type: mediaTypeFromPath(path),
        path: result.path,
        publicUrl: result.publicUrl,
        sourcePath: path,
        source: 'public-site',
        size: blob.size,
        mime: blob.type,
        status: 'active',
      });
      imported += 1;
      setMediaStatus(`Importing ${imported} / ${total} assets...`);
    }
    renderView(ui.data || {});
    setMediaStatus(`Imported ${imported} assets${skipped ? `, skipped ${skipped}` : ''}.`);
    showToast(`Imported ${imported} media assets${skipped ? `, skipped ${skipped}` : ''}`);
  } catch (error) {
    setMediaStatus(error?.message || 'Media import failed');
    showToast(error?.message || 'Media import failed', 'danger');
  }
}

function renderCatalogTabs() {
  const productsCount = listCollection('products').filter((item) => item.status !== 'deleted').length;
  const categoriesCount = listCollection('categories').filter((item) => item.status !== 'deleted').length;
  return `
    <div class="catalog-tabs">
      <button class="catalog-tab ${ui.catalogTab === 'products' ? 'active' : ''}" data-action="switch-catalog" data-tab="products">Products <span>${escapeHtml(String(productsCount))}</span></button>
      <button class="catalog-tab ${ui.catalogTab === 'categories' ? 'active' : ''}" data-action="switch-catalog" data-tab="categories">Categories <span>${escapeHtml(String(categoriesCount))}</span></button>
    </div>
  `;
}

function renderCollectionInner(node, schema, data) {
  const items = filterItems(data, node);
  const pageSize = Math.max(4, Number(ui.catalogPageSize) || 8);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const page = Math.min(Math.max(1, ui.page), totalPages);
  const paged = items.slice((page - 1) * pageSize, page * pageSize);
  ui.page = page;

  const isCatalog = node === 'products' || node === 'categories';
  const itemLabel = node === 'categories' ? 'categories' : (node === 'products' ? 'products' : node);
  const itemSingular = schema.label.toLowerCase();

  const totalSelected = ui.selection.size;
  const visibleStart = items.length ? ((page - 1) * pageSize) + 1 : 0;
  const visibleEnd = Math.min(items.length, page * pageSize);

  let contentHtml = '';
  if (isCatalog) {
    contentHtml = `
      ${buildCatalogFilters(node, items)}
      <div class="catalog-results ${ui.catalogView}" id="catalogResultsGrid">
        ${paged.length ? paged.map((item) => (node === 'categories'
          ? renderCatalogCategoryCard(item, node)
          : renderCatalogProductCard(item, node))).join('') : `
          <div class="catalog-empty glass">
            <div class="catalog-empty-art">
              <div class="orb orb-a"></div>
              <div class="orb orb-b"></div>
              <i data-lucide="sparkles"></i>
            </div>
            <h3>Create your first ${escapeHtml(itemSingular)}.</h3>
            <p>Set up ${escapeHtml(itemLabel)} to populate the dynamic website sections.</p>
            <div class="toolbar">
              <button class="btn btn-ghost" data-action="goto" data-route="media"><i data-lucide="image-plus"></i> Open Media Library</button>
            </div>
          </div>
        `}
      </div>
    `;
  } else {
    contentHtml = `
      <div class="table-wrap list-table-wrap" style="margin-top: 1.5rem;">
        <table class="table">
          <thead>
            <tr>
              ${schema.columns.map(col => `<th>${escapeHtml(col.label)}</th>`).join('')}
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${buildTableRows(node, schema.columns, paged)}
          </tbody>
        </table>
      </div>
    `;
  }

  return `
    <div class="panel-head catalog-section-head">
      <div>
        <h2 class="section-title">${escapeHtml(schema.title)}</h2>
        <p class="section-subtitle">${escapeHtml(schema.description)}</p>
      </div>
      <div class="toolbar catalog-header-actions">
        ${isCatalog ? `<button class="btn btn-ghost" data-action="select-visible"><i data-lucide="square-check"></i> ${ui.selection.size ? 'Clear Visible' : 'Select Visible'}</button>` : ''}
        ${node === 'products' ? `<button class="btn btn-ghost" data-action="bulk" data-bulk-action="move-category" ${totalSelected ? '' : 'disabled'}><i data-lucide="move-right"></i> Move Category</button>` : ''}
        ${!isCatalog ? `<button class="btn btn-primary" data-action="add" data-node="${node}"><i data-lucide="plus"></i> Add ${escapeHtml(schema.label)}</button>` : ''}
      </div>
    </div>
    ${!isCatalog ? `
      <div class="collection-summary catalog-summary">
        <div class="summary-card">
          <span>Total Records</span>
          <strong>${escapeHtml(String(items.length))}</strong>
        </div>
        <div class="summary-card">
          <span>Visible</span>
          <strong>${escapeHtml(String(paged.length))}</strong>
        </div>
        <div class="summary-card">
          <span>Page</span>
          <strong>${escapeHtml(String(page))} / ${escapeHtml(String(totalPages))}</strong>
        </div>
      </div>
    ` : ''}
    ${contentHtml}
    <div class="pagination catalog-pagination">
      <span class="section-subtitle">Showing ${escapeHtml(String(visibleStart))}-${escapeHtml(String(visibleEnd))} of ${escapeHtml(String(items.length))} ${escapeHtml(itemLabel)}${totalSelected ? ` · ${escapeHtml(String(totalSelected))} selected` : ''}</span>
      <div class="toolbar catalog-pagination-actions">
        <span class="chip">Rows ${escapeHtml(String(pageSize))}</span>
        <button class="btn btn-ghost" data-page="prev"><i data-lucide="chevron-left"></i></button>
        <span class="chip">Page ${escapeHtml(String(page))} / ${escapeHtml(String(totalPages))}</span>
        <button class="btn btn-ghost" data-page="next"><i data-lucide="chevron-right"></i></button>
      </div>
    </div>
  `;
}

function renderDashboard(data) {
  const summary = summarizeDashboard();
  const activity = recentActivity(5);
  const orders = recentOrders(6);
  const topProducts = buildTopProducts(summary);
  return `
    <div class="page active">
      <section class="dashboard-hero">
        <div class="dashboard-hero-copy panel glass">
          <div class="panel-head dashboard-header">
            <div>
              <h2 class="section-title">Dashboard</h2>
              <p class="section-subtitle">Real-time overview of your store</p>
            </div>
            <div class="toolbar hero-actions">
              ${renderRangeSwitch()}
              <button class="btn btn-ghost" data-action="refresh" type="button"><i data-lucide="refresh-cw"></i> Refresh</button>
              <button class="btn btn-primary" data-action="goto" data-route="products" type="button"><i data-lucide="plus"></i> Add Product</button>
            </div>
          </div>
          <div class="dashboard-kpi-grid">
            ${renderKpiCard({
              label: 'Visitors',
              value: formatNumber(summary.visitors),
              change: summary.visitorsTrend,
              note: `vs previous ${summary.range}`,
              icon: 'users',
              series: summary.visitorSeries,
              tone: 'primary',
            })}
            ${renderKpiCard({
              label: 'Order Clicks',
              value: formatNumber(summary.clicks),
              change: summary.clicksTrend,
              note: `vs previous ${summary.range}`,
              icon: 'mouse-pointer-click',
              series: summary.clickSeries,
              tone: 'secondary',
            })}
            ${renderKpiCard({
              label: 'Orders',
              value: formatNumber(summary.orders),
              change: summary.ordersTrend,
              note: `vs previous ${summary.range}`,
              icon: 'receipt-text',
              series: summary.orderSeries,
              tone: 'success',
            })}
            ${renderKpiCard({
              label: 'Revenue',
              value: formatNumber(summary.revenue),
              change: summary.revenueTrend,
              note: 'From paid / completed orders',
              icon: 'banknote',
              series: summary.revenueSeries,
              tone: 'accent',
              valuePrefix: 'Rs ',
            })}
          </div>
          <div class="dashboard-secondary-grid">
            ${renderCompactStatCard('Products', summary.totals.products, 'Live product records', 'package', 'primary')}
            ${renderCompactStatCard('Categories', summary.totals.categories, 'Live category records', 'layers-3', 'secondary')}
            ${renderCompactStatCard('Media Assets', summary.mediaAssets, 'Stored in Supabase', 'image', 'accent')}
            ${renderCompactStatCard("Today's Visitors", summary.totals.todaysVisitors || 0, 'Visitors tracked today', 'calendar-days', 'success')}
          </div>
        </div>

        <div class="dashboard-hero-side panel glass">
          <div class="panel-head">
            <div>
              <h3>Live Activity</h3>
              <p class="section-subtitle">Latest meaningful events from the store</p>
            </div>
            <button class="btn btn-ghost" type="button" data-action="open-notifications"><i data-lucide="external-link"></i> View all</button>
          </div>
          <div class="timeline-list activity-list">
            ${activity.length ? activity.map((item) => `
              <div class="activity-row">
                <div class="activity-icon"><i data-lucide="${escapeHtml(getActivityIcon(item.type))}"></i></div>
                <div class="activity-copy">
                  <strong>${escapeHtml(item.title)}</strong>
                  <span>${escapeHtml(item.meta || 'live')} - ${escapeHtml(formatDateTime(item.timestamp))}</span>
                </div>
              </div>
            `).join('') : '<div class="empty-state">No recent activity yet.</div>'}
          </div>
        </div>
      </section>

      <section class="dashboard-main-grid">
        ${renderTrafficChart(summary)}
        <section class="panel glass dashboard-side-panel">
          <div class="panel-head">
            <div>
              <h3>Top Products</h3>
              <p class="section-subtitle">Best performers from existing click and order data.</p>
            </div>
            <button class="btn btn-ghost" type="button" data-action="goto" data-route="products"><i data-lucide="arrow-right"></i> Manage</button>
          </div>
          <div class="top-products-list">
            ${topProducts.length ? topProducts.map((item) => `
              <div class="top-product-row">
                <div class="top-product-thumb">${mediaPreview(item) || `<span>${escapeHtml(String(item.title || '?').slice(0, 1).toUpperCase())}</span>`}</div>
                <div class="top-product-copy">
                  <strong>${escapeHtml(item.title || item.slug || 'Untitled')}</strong>
                  <span>${escapeHtml(item.category || 'Uncategorized')}</span>
                </div>
                <div class="top-product-stat">
                  <span>Clicks</span>
                  <strong>${escapeHtml(String(item.clicks || 0))}</strong>
                </div>
                <div class="top-product-stat">
                  <span>Orders</span>
                  <strong>${escapeHtml(String(item.orders || 0))}</strong>
                </div>
              </div>
            `).join('') : '<div class="empty-state">No performance data yet.</div>'}
          </div>
        </section>
      </section>

      <section class="panel glass">
        <div class="panel-head">
          <div>
            <h3>Recent Orders</h3>
            <p class="section-subtitle">The latest payment events from the public flow.</p>
          </div>
          <button class="btn btn-ghost" type="button" data-action="goto" data-route="orders"><i data-lucide="list"></i> View All Orders</button>
        </div>
        <div class="table-wrap">
          <table class="table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Amount</th>
                <th>Payment Method</th>
                <th>Status</th>
                <th>Time</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${orders.length ? orders.map((item) => `
                <tr>
                  <td>${escapeHtml(item.package || '-')}</td>
                  <td>${escapeHtml(item.amount || '-')}</td>
                  <td>${escapeHtml(item.method || '-')}</td>
                  <td>${collectionRowBadge(item)}</td>
                  <td>${escapeHtml(formatDateTime(item.timestamp))}</td>
                  <td><button class="icon-btn" data-action="open-order" data-id="${escapeHtml(item.id)}"><i data-lucide="eye"></i> View</button></td>
                </tr>
              `).join('') : '<tr><td colspan="6"><div class="empty-state">No orders yet.</div></td></tr>'}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  `;
}

function filterItems(items, node = 'products') {
  const source = Array.isArray(items)
    ? items
    : Object.entries(items || {}).map(([id, item]) => ({ id, ...(item || {}) }));
  let list = [...source];
  if (ui.search) {
    const term = ui.search.toLowerCase();
    list = list.filter((item) => JSON.stringify(item).toLowerCase().includes(term));
  }
  if (ui.filters.status && ui.filters.status !== 'all') {
    list = list.filter((item) => String(item.status || 'active') === ui.filters.status);
  }
  if (node === 'products' && ui.filters.category && ui.filters.category !== 'all') {
    const categoryTerm = String(ui.filters.category || '').toLowerCase();
    list = list.filter((item) => {
      const value = String(item.category || '').toLowerCase();
      return value === categoryTerm || slugify(value) === categoryTerm || slugify(item.category || '') === categoryTerm;
    });
  }
  if (ui.sort === 'title') {
    list.sort((a, b) => String(a.title || '').localeCompare(String(b.title || '')));
  } else if (ui.sort === 'displayOrder') {
    list.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
  } else {
    list.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  }
  return list;
}

function renderCollection(node, schema, data) {
  return `
    <div class="page active">
      <section class="panel glass collection-shell">
        ${renderCollectionInner(node, schema, data)}
      </section>
    </div>
  `;
}

function renderCatalogView(data) {
  const meta = getCatalogMeta();
  const nodeData = listCollection(meta.node);
  const counts = getCatalogCounts();
  return `
    <div class="page active">
      <section class="panel glass collection-shell catalog-page">
        <div class="panel-head">
          <div>
            <h2 class="section-title">Catalog</h2>
            <p class="section-subtitle">Manage products and categories</p>
          </div>
          <div class="toolbar catalog-hero-actions">
            <button class="btn btn-primary catalog-primary-action" data-action="add" data-node="products"><i data-lucide="plus"></i> Add Product</button>
            <div class="catalog-secondary-actions">
              <button class="btn btn-ghost" data-action="add" data-node="categories"><i data-lucide="tag"></i> Add Category</button>
              <button class="btn btn-ghost" data-action="goto" data-route="media"><i data-lucide="image-plus"></i> Media Library</button>
            </div>
            <details class="catalog-mobile-actions">
              <summary class="btn btn-ghost"><i data-lucide="more-horizontal"></i> More</summary>
              <div class="catalog-mobile-actions-panel">
                <button class="catalog-mobile-actions-item" type="button" data-action="add" data-node="categories"><i data-lucide="tag"></i> Add Category</button>
                <button class="catalog-mobile-actions-item" type="button" data-action="goto" data-route="media"><i data-lucide="image-plus"></i> Media Library</button>
              </div>
            </details>
          </div>
        </div>
        <div class="catalog-hero">
          <div class="catalog-copy">
            <span class="eyebrow">Live RTDB + Supabase media</span>
            <h3>${escapeHtml(meta.title)} management</h3>
            <p>${escapeHtml(meta.subtitle)}</p>
          </div>
          <div class="catalog-side">
            ${renderCatalogMetric('Products', counts.products, 'Live product records')}
            ${renderCatalogMetric('Categories', counts.categories, 'Live category records')}
            ${renderCatalogMetric('Total Images', counts.images, 'Supabase media assets')}
            ${renderCatalogMetric('Last Sync', counts.lastSync ? formatDateTime(counts.lastSync) : '-', 'Latest catalog write')}
          </div>
        </div>
        ${renderCatalogTabs()}
        ${renderCollectionInner(meta.node, meta.schema, nodeData)}
      </section>
    </div>
  `;
}

function openCatalogPreview(node, id) {
  const item = getItem(node, id);
  if (!item) return;
  const metrics = (node === 'categories' ? categoryRecordMetrics(item) : productRecordMetrics(item))
    .map((entry) => `
      <div class="summary-card summary-card-flat">
        <span>${escapeHtml(entry.label)}</span>
        <strong>${escapeHtml(String(entry.value))}</strong>
      </div>
    `)
    .join('');
  openModal(`
    <div class="panel-head">
      <div>
        <h2 class="section-title">${escapeHtml(item.title || item.name || 'Preview')}</h2>
        <p class="section-subtitle">${escapeHtml(item.description || item.review || item.answer || item.category || 'Catalog item preview')}</p>
      </div>
      <button class="btn btn-ghost" data-close-modal type="button"><i data-lucide="x"></i></button>
    </div>
    <div class="editor-layout catalog-preview-layout">
      <div class="editor-preview-column">
        <div class="editor-preview glass">
          <div class="editor-preview-media">${itemPreviewThumb(item)}</div>
          <div class="editor-preview-body">
            <span class="editor-preview-badge">${escapeHtml(node === 'categories' ? 'Category' : 'Product')}</span>
            <h3>${escapeHtml(item.title || item.name || 'Untitled')}</h3>
            <p>${escapeHtml(item.description || item.review || item.answer || item.category || '-')}</p>
          </div>
        </div>
      </div>
      <div class="editor-preview-column">
        <div class="panel glass editor-preview">
          <div class="editor-preview-list">${metrics}</div>
          <div class="card-list">
            <div class="item-card"><strong>Status</strong><div class="meta">${escapeHtml(String(item.status || 'active'))}</div></div>
            <div class="item-card"><strong>Slug</strong><div class="meta">${escapeHtml(item.slug || '-')}</div></div>
            <div class="item-card"><strong>Category</strong><div class="meta">${escapeHtml(item.category || '-')}</div></div>
            <div class="item-card"><strong>Order Link</strong><div class="meta">${escapeHtml(item.orderLink || '-')}</div></div>
          </div>
        </div>
      </div>
    </div>
  `);
}

function orderedCategories() {
  return listCollection('categories')
    .filter((item) => item.status !== 'deleted')
    .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
}

async function reorderCategory(id, direction) {
  const items = orderedCategories();
  const index = items.findIndex((item) => item.id === id);
  if (index < 0) return;
  const nextIndex = index + direction;
  if (nextIndex < 0 || nextIndex >= items.length) return;
  const current = items[index];
  const target = items[nextIndex];
  await updateRecord('categories', current.id, { displayOrder: target.displayOrder || nextIndex + 1 });
  await updateRecord('categories', target.id, { displayOrder: current.displayOrder || index + 1 });
  showToast('Category reordered');
  renderView(ui.data || {});
}

function openMoveCategoryModal(ids) {
  const categories = orderedCategories();
  if (!categories.length) {
    showToast('Create a category first', 'warning');
    return;
  }
  openModal(`
    <div class="panel-head">
      <div>
        <h2 class="section-title">Move Category</h2>
        <p class="section-subtitle">Update the selected products to a different category.</p>
      </div>
      <button class="btn btn-ghost" data-close-modal type="button"><i data-lucide="x"></i></button>
    </div>
    <form id="bulkMoveForm">
      <div class="field">
        <label>Target Category</label>
        <select class="select" name="category" required>
          ${categories.map((item) => `<option value="${escapeHtml(item.title || item.slug || item.id)}">${escapeHtml(item.title || item.slug || item.id)}</option>`).join('')}
        </select>
      </div>
      <div class="toolbar" style="margin-top:16px;justify-content:flex-end;">
        <button type="button" class="btn btn-ghost" data-close-modal>Cancel</button>
        <button type="submit" class="btn btn-primary">Move Selected</button>
      </div>
    </form>
  `);
  const form = document.getElementById('bulkMoveForm');
  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const category = form.querySelector('[name="category"]').value;
    for (const id of ids) {
      await updateRecord('products', id, { category });
    }
    showToast('Products moved');
    clearSelection();
    closeModal();
    renderView(ui.data || {});
  }, { once: true });
}

async function applyBulkAction(action, node, ids) {
  const selectedIds = [...ids].filter(Boolean);
  if (!selectedIds.length) return;
  if (action === 'delete') {
    if (!confirm(`Delete ${selectedIds.length} selected records?`)) return;
    for (const id of selectedIds) {
      await deleteRecord(node, id);
    }
    clearSelection();
    showToast('Selected records deleted');
    renderView(ui.data || {});
    return;
  }
  if (action === 'duplicate') {
    for (const id of selectedIds) {
      await duplicateRecord(node, id);
    }
    clearSelection();
    showToast('Selected records duplicated');
    renderView(ui.data || {});
    return;
  }
  if (action === 'hide' || action === 'show') {
    const status = action === 'hide' ? 'hidden' : 'active';
    for (const id of selectedIds) {
      await updateRecord(node, id, { status });
    }
    clearSelection();
    showToast(`Selected records ${status}`);
    renderView(ui.data || {});
    return;
  }
  if (action === 'move-category' && node === 'products') {
    openMoveCategoryModal(selectedIds);
  }
}

function renderSingleEditorPage(node, schema, data) {
  const hasData = Boolean(Object.entries(data || {}).length);
  return `
    <div class="page active management-page-shell">
      <section class="panel glass management-page single-editor-page">
        <div class="panel-head management-page-head">
          <div>
            <div class="section-kicker">${escapeHtml(node === 'hero' ? 'Homepage Hero' : 'Homepage Banner')}</div>
            <h2 class="section-title">${escapeHtml(schema.title)}</h2>
            <p class="section-subtitle">${escapeHtml(schema.description)}</p>
          </div>
          <div class="toolbar management-actions">
            <button class="btn btn-primary" data-action="edit-single" data-node="${node}" type="button"><i data-lucide="pencil"></i> Edit</button>
          </div>
        </div>
        <div class="single-editor-shell">
          ${renderSingleEditorPreviewCard(node, data)}
          <div class="single-editor-main">
            ${renderSingleEditorSummaryGrid(node, data)}
            <div class="single-editor-section-list">
              ${renderSingleEditorFieldSections(node, schema, data)}
            </div>
            ${!hasData ? '<div class="empty-state">No content saved yet.</div>' : ''}
          </div>
        </div>
      </section>
    </div>
  `;
}

function normalizeStatusText(value, fallback = 'unknown') {
  const text = String(value || '').trim().toLowerCase();
  return text || fallback;
}

function parseAmountValue(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const raw = String(value || '').replace(/,/g, '').match(/-?\d+(\.\d+)?/);
  if (!raw) return 0;
  const parsed = Number(raw[0]);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatCurrencyCompact(value) {
  const number = parseAmountValue(value);
  return `Rs ${formatNumber(number)}`;
}

function pickFirstValue(item = {}, keys = [], fallback = '') {
  for (const key of keys) {
    const value = item?.[key];
    if (value !== undefined && value !== null && String(value).trim() !== '') return value;
  }
  return fallback;
}

function candidateText(item = {}, keys = [], fallback = '-') {
  return String(pickFirstValue(item, keys, fallback) || fallback);
}

function orderProductName(item = {}) {
  if (item.cartItems && Array.isArray(item.cartItems) && item.cartItems.length > 0) {
    const names = item.cartItems.map((i) => i.name || i.title).filter(Boolean);
    if (names.length > 0) return names.join(' + ');
  }
  const name = pickFirstValue(item, ['productName', 'package', 'product', 'title', 'name', 'label', 'collectionTitle'], '');
  if (name && name !== 'Product') return name;
  if (item.productId) return String(item.productId);
  return 'Premium Pack Order';
}

function orderProductThumb(item = {}) {
  if (item.image) return resolveMediaSource(item.image) || item.image;
  if (item.productImage) return resolveMediaSource(item.productImage) || item.productImage;
  if (item.cartItems && Array.isArray(item.cartItems) && item.cartItems[0]?.img) {
    return item.cartItems[0].img;
  }
  return '';
}

function orderCustomerLabel(item = {}) {
  const name = pickFirstValue(item, ['customerName', 'name', 'buyerName', 'fullName'], '');
  const email = pickFirstValue(item, ['email', 'customerEmail', 'buyerEmail'], '');
  const phone = pickFirstValue(item, ['phone', 'customerPhone', 'buyerPhone', 'mobile', 'telegram', 'whatsapp'], '');
  const parts = [name, email, phone].filter(Boolean);
  if (parts.length) return parts.join(' · ');
  if (item.source) return `Direct Buyer (${item.source})`;
  return 'Web Checkout Buyer';
}

function orderMethodLabel(item = {}) {
  const m = candidateText(item, ['paymentMethod', 'method', 'gateway', 'channel', 'provider'], '');
  if (!m || m.toLowerCase() === 'unknown' || m === '-') {
    if (item.screenshotUrl || item.proofUrl || item.paymentProof) return 'UPI / Screenshot';
    return 'Online Checkout';
  }
  return m;
}

function orderTransactionId(item = {}) {
  return candidateText(item, ['transactionId', 'referenceId', 'txnId', 'paymentId', 'orderId', 'checkoutToken', 'id'], '-');
}

function orderStatusValue(item = {}) {
  return normalizeStatusText(pickFirstValue(item, ['paymentStatus', 'orderStatus', 'status', 'state'], 'pending'));
}

function orderPaymentProof(item = {}) {
  return pickFirstValue(item, ['paymentProof', 'proofUrl', 'proof', 'screenshot', 'screenshotUrl', 'receiptUrl', 'receipt', 'image'], '');
}

function orderDeliveryInfo(item = {}) {
  return candidateText(item, ['deliveryInfo', 'accessInfo', 'delivery', 'access', 'notes'], '');
}

function orderDateValue(item = {}) {
  return Number(item.timestamp || item.updatedAt || item.createdAt || 0);
}

function isPaidOrder(item = {}) {
  const value = orderStatusValue(item);
  return ['paid', 'approved', 'success', 'completed', 'complete', 'verified'].includes(value);
}

function isPendingOrder(item = {}) {
  const value = orderStatusValue(item);
  return ['pending', 'processing', 'initiated', 'created', 'pending_payment', 'verification_pending'].includes(value);
}

function isFailedOrder(item = {}) {
  const value = orderStatusValue(item);
  return ['failed', 'rejected', 'expired', 'cancelled', 'canceled', 'error'].includes(value);
}

function renderStatusBadge(value) {
  const status = normalizeStatusText(value, 'unknown');
  const cls = status === 'paid' || status === 'approved' || status === 'completed'
    ? 'success'
    : status === 'pending' || status === 'processing'
      ? 'warning'
      : status === 'failed' || status === 'rejected' || status === 'expired'
        ? 'danger'
        : 'badge';
  return `<span class="badge ${cls}">${escapeHtml(status)}</span>`;
}

function orderStatusLabel(item = {}) {
  const value = orderStatusValue(item);
  if (value === 'pending') return 'Payment Submitted';
  if (value === 'approved' || value === 'paid') return 'Approved';
  if (value === 'completed') return 'Completed';
  if (value === 'rejected' || value === 'failed' || value === 'expired') return 'Rejected / Failed';
  return value;
}

function managementCounts(list = [], predicate = () => true) {
  return list.filter(predicate).length;
}

function managementTotals(list = []) {
  const today = new Date().toISOString().slice(0, 10);
  const monthKey = today.slice(0, 7);
  const totalReceived = list.filter(isPaidOrder).reduce((total, item) => total + parseAmountValue(item.amount), 0);
  const pending = managementCounts(list, isPendingOrder);
  const failed = managementCounts(list, isFailedOrder);
  const todayCount = list.filter((item) => String(item.date || '').slice(0, 10) === today || new Date(orderDateValue(item)).toISOString().slice(0, 10) === today).length;
  const monthCount = list.filter((item) => String(item.date || '').slice(0, 7) === monthKey || new Date(orderDateValue(item)).toISOString().slice(0, 7) === monthKey).length;
  return {
    totalReceived,
    pending,
    failed,
    today: todayCount,
    month: monthCount,
    total: list.length,
    paid: managementCounts(list, isPaidOrder),
  };
}

function filterManagementList(items = [], type = 'orders') {
  const search = String(ui.management.search || '').trim().toLowerCase();
  const status = String(ui.management.status || 'all');
  const method = String(ui.management.method || 'all');
  const date = String(ui.management.date || 'all');
  return items.filter((item) => {
    const searchable = JSON.stringify(item).toLowerCase();
    const itemStatus = orderStatusValue(item);
    const itemMethod = orderMethodLabel(item).toLowerCase();
    const day = String(item.date || '').slice(0, 10) || new Date(orderDateValue(item)).toISOString().slice(0, 10);
    if (search && !searchable.includes(search)) return false;
    if (status !== 'all') {
      if (status === 'paid' && !isPaidOrder(item)) return false;
      if (status === 'pending' && !isPendingOrder(item)) return false;
      if (status === 'failed' && !isFailedOrder(item)) return false;
      if (status === 'all' ? false : !['paid', 'pending', 'failed'].includes(status) && itemStatus !== status) return false;
    }
    if (method !== 'all' && itemMethod !== method.toLowerCase()) return false;
    if (date !== 'all') {
      const today = new Date();
      const todayKey = today.toISOString().slice(0, 10);
      const monthKey = today.toISOString().slice(0, 7);
      if (date === 'today' && day !== todayKey) return false;
      if (date === 'month' && day.slice(0, 7) !== monthKey) return false;
    }
    return true;
  });
}

function sortManagementList(items = []) {
  return [...items].sort((a, b) => orderDateValue(b) - orderDateValue(a));
}

function renderManagementSummaryCard(label, value, detail = '', tone = 'primary') {
  return `
    <div class="management-summary-card glass ${tone}">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(String(value))}</strong>
      ${detail ? `<small>${escapeHtml(detail)}</small>` : ''}
    </div>
  `;
}

function renderInfoTile(label, value, detail = '') {
  return `
    <div class="management-info-tile">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(String(value || '-'))}</strong>
      ${detail ? `<small>${escapeHtml(detail)}</small>` : ''}
    </div>
  `;
}

function renderFieldGroup(title, description, content) {
  return `
    <section class="management-section panel glass">
      <div class="panel-head management-section-head">
        <div>
          <h3>${escapeHtml(title)}</h3>
          <p class="section-subtitle">${escapeHtml(description)}</p>
        </div>
      </div>
      ${content}
    </section>
  `;
}

function singleEditorMediaValue(node, record = {}) {
  if (node === 'hero') return String(record.backgroundImage || record.image || '').trim();
  if (node === 'settings') return String(record.logo || record.favicon || record.qrImage || record.image || '').trim();
  if (node === 'payment') return String(record.qrImage || record.logo || record.image || '').trim();
  return String(record.image || record.backgroundImage || '').trim();
}

function singleEditorDisplayTitle(node, record = {}) {
  if (node === 'settings') return String(record.siteName || record.appName || 'Settings').trim();
  if (node === 'payment') return 'Payment Settings';
  return String(record.title || (node === 'hero' ? 'Hero' : 'Banner') || '').trim();
}

function singleEditorDisplaySubtitle(node, record = {}) {
  if (node === 'hero') return String(record.subtitle || 'Homepage hero copy and calls to action.');
  if (node === 'settings') return String(record.footer || record.publicSiteSync || record.maintenanceMode || 'Website configuration and checkout settings.');
  if (node === 'payment') return String(record.instructions || record.telegramUrl || record.telegramChannel || 'Checkout payment methods and proof handling.');
  if (node === 'banner') return String(record.description || record.offer || 'Homepage promotional banner and CTA.');
  return String(record.offer || 'Homepage promotional banner and CTA.');
}

function singleEditorLastUpdated(record = {}) {
  return formatDateTime(record.updatedAt || record.createdAt);
}

function renderSingleEditorPreviewCard(node, record = {}) {
  const image = singleEditorMediaValue(node, record);
  const title = singleEditorDisplayTitle(node, record);
  const subtitle = singleEditorDisplaySubtitle(node, record);
  const imageLabel = node === 'hero'
    ? 'Background Image'
    : node === 'settings'
      ? 'Logo / Favicon'
      : node === 'payment'
        ? 'QR Image'
        : 'Banner Image';
  const sectionLabel = node === 'hero'
    ? 'Hero Section'
    : node === 'settings'
      ? 'Website Settings'
      : node === 'payment'
        ? 'Payment Settings'
        : 'Banner Section';
  return `
    <div class="single-editor-preview panel glass">
      <div class="single-editor-preview-media">
        ${image ? `<img src="${escapeHtml(resolveMediaSource(image) || image)}" alt="${escapeHtml(title || imageLabel)}" loading="lazy" />` : renderMediaFallback(`No ${imageLabel.toLowerCase()} selected`)}
      </div>
      <div class="single-editor-preview-body">
        <span class="editor-preview-badge">${escapeHtml(sectionLabel)}</span>
        <h3>${escapeHtml(title || sectionLabel)}</h3>
        <p>${escapeHtml(subtitle)}</p>
        <div class="single-editor-url">${escapeHtml(image || 'Image URL not set')}</div>
      </div>
    </div>
  `;
}

function renderSingleEditorSummaryGrid(node, record = {}) {
  if (node === 'hero') {
    return `
      <div class="single-editor-summary-grid">
        ${renderInfoTile('Hero Title', record.title || 'Not set')}
        ${renderInfoTile('Subtitle', record.subtitle || 'Not set')}
        ${renderInfoTile('Primary Button', [record.primaryButtonText, record.primaryButtonLink].filter(Boolean).join(' · ') || 'Not set')}
        ${renderInfoTile('Secondary Button', [record.secondaryButtonText, record.secondaryButtonLink].filter(Boolean).join(' · ') || 'Not set')}
        ${renderInfoTile('Status', record.status || 'active')}
        ${renderInfoTile('Last Updated', singleEditorLastUpdated(record))}
      </div>
      <div class="single-editor-stat-grid">
        ${renderInfoTile('Stat 1', record.stat1 || 'Not set')}
        ${renderInfoTile('Stat 2', record.stat2 || 'Not set')}
        ${renderInfoTile('Stat 3', record.stat3 || 'Not set')}
      </div>
    `;
  }
  if (node === 'settings') {
    return `
      <div class="single-editor-summary-grid">
        ${renderInfoTile('Website Name', record.siteName || record.appName || 'Not set')}
        ${renderInfoTile('Email', record.email || 'Not set')}
        ${renderInfoTile('WhatsApp', record.whatsapp || 'Not set')}
        ${renderInfoTile('Telegram', record.telegram || 'Not set')}
        ${renderInfoTile('Currency', record.currency || 'INR')}
        ${renderInfoTile('Maintenance', record.maintenanceMode || 'off')}
      </div>
      <div class="single-editor-stat-grid">
        ${renderInfoTile('Currency Symbol', record.currencySymbol || '₹')}
        ${renderInfoTile('Price Format', record.priceFormat || 'INR / USD')}
        ${renderInfoTile('Last Updated', singleEditorLastUpdated(record))}
      </div>
    `;
  }
  if (node === 'payment') {
    return `
      <div class="single-editor-summary-grid">
        ${renderInfoTile('Recommended Method', record.recommendedMethod || 'binancepay')}
        ${renderInfoTile('UPI ID', record.upiId || 'Not set')}
        ${renderInfoTile('QR Image', record.qrImage ? 'Configured' : 'Not set')}
        ${renderInfoTile('Instructions', record.instructions || 'Not set')}
        ${renderInfoTile('Telegram', record.telegramUrl || record.telegramChannel || 'Not set')}
        ${renderInfoTile('Binance', record.binanceId || 'Not set')}
        ${renderInfoTile('PayPal', record.paypalLink || 'Not set')}
      </div>
      <div class="single-editor-stat-grid">
        ${renderInfoTile('BEP-20', record.bep20Address || 'Not set')}
        ${renderInfoTile('ERC-20', record.ethAddress || 'Not set')}
        ${renderInfoTile('Last Updated', singleEditorLastUpdated(record))}
      </div>
    `;
  }
  return `
    <div class="single-editor-summary-grid">
      ${renderInfoTile('Banner Title', record.title || 'Not set')}
      ${renderInfoTile('Description', record.description || record.offer || 'Not set')}
      ${renderInfoTile('Original Price', record.priceOriginal || 'Not set')}
      ${renderInfoTile('Offer INR', record.priceOfferINR || 'Not set')}
      ${renderInfoTile('Offer USD', record.priceOfferUSD || 'Not set')}
      ${renderInfoTile('Button Text', record.buttonText || 'Not set')}
      ${renderInfoTile('Button Link', record.buttonLink || record.link || 'Not set')}
      ${renderInfoTile('Status', record.status || 'active')}
      ${renderInfoTile('Last Updated', singleEditorLastUpdated(record))}
    </div>
  `;
}

function renderSingleEditorFieldSections(node, schema, record = {}) {
  const fieldByKey = (key) => schema.fields.find((field) => field.key === key);
  const groups = node === 'hero'
    ? [
        {
          title: 'Hero Copy',
          description: 'Main heading and supporting text for the homepage hero.',
          keys: ['title', 'subtitle'],
        },
        {
          title: 'Call to Action',
          description: 'Primary and secondary button labels and links.',
          keys: ['primaryButtonText', 'primaryButtonLink', 'secondaryButtonText', 'secondaryButtonLink'],
        },
        {
          title: 'Statistics',
          description: 'Three supporting stats shown on the hero block.',
          keys: ['stat1', 'stat2', 'stat3'],
        },
        {
          title: 'Media & Publishing',
          description: 'Background image and publishing status.',
          keys: ['backgroundImage', 'status'],
        },
      ]
    : node === 'settings'
      ? [
          {
            title: 'Website Identity',
            description: 'Brand name, logo, favicon, and footer copy.',
            keys: ['siteName', 'logo', 'favicon', 'footer'],
          },
          {
            title: 'Contact & Social',
            description: 'Contact details and social profiles for the public site.',
            keys: ['email', 'whatsapp', 'telegram', 'socialLinks'],
          },
          {
            title: 'Website Controls',
            description: 'Maintenance mode, public website status, and display preferences.',
            keys: ['maintenanceMode', 'publicSiteSync', 'currency', 'currencySymbol', 'priceFormat'],
          },
        ]
      : node === 'payment'
        ? [
            {
              title: 'Featured / Recommended Method',
              description: 'Select which payment method appears at the very top with the RECOMMENDED badge on checkout.',
              keys: ['recommendedMethod'],
            },
            {
              title: 'Primary Payment',
              description: 'UPI and QR configuration used by checkout.',
              keys: ['upiId', 'qrImage', 'instructions'],
            },
            {
              title: 'Support & Links',
              description: 'Telegram or support contact shown to customers.',
              keys: ['telegramUrl', 'telegramChannel'],
            },
            {
              title: 'Alternate Methods',
              description: 'Other payment options already supported in the project.',
              keys: ['bep20Address', 'ethAddress', 'binanceId', 'binanceGiftCardUrl', 'paypalLink', 'status'],
            },
          ]
    : [
        {
          title: 'Banner Content',
          description: 'Title and promotional copy for the banner.',
          keys: ['title', 'description'],
        },
        {
          title: 'Pricing Details',
          description: 'Original and promotional prices for INR and USD.',
          keys: ['priceOriginal', 'priceOfferINR', 'priceOfferUSD'],
        },
        {
          title: 'Call to Action',
          description: 'Banner button label and destination.',
          keys: ['buttonText', 'buttonLink'],
        },
        {
          title: 'Publishing',
          description: 'Publishing status of the banner.',
          keys: ['status'],
        },
      ];

  return groups.map((group) => `
    <section class="editor-section single-editor-section">
      <div class="editor-section-head">
        <div>
          <h4>${escapeHtml(group.title)}</h4>
          <p>${escapeHtml(group.description)}</p>
        </div>
      </div>
      <div class="form-grid single-editor-fields${group.keys.length === 1 ? ' single-column' : ''}">
        ${group.keys.map((key) => {
          const field = fieldByKey(key);
          return field ? fieldMarkup(field, record[field.key] ?? '', { allowUploads: true }) : '';
        }).join('')}
      </div>
    </section>
  `).join('');
}

function singleEditorUploadFolder(node, key) {
  if (node === 'hero' && key === 'backgroundImage') return 'hero';
  if (node === 'banner' && key === 'image') return 'banner';
  if (node === 'settings') {
    if (key === 'logo' || key === 'favicon') return 'logos';
    return 'settings';
  }
  if (node === 'payment') {
    if (key === 'qrImage') return 'payments';
    return 'payment';
  }
  return 'images';
}

async function uploadSingleEditorMedia(form, node, next, statusEl = null) {
  const fileInputs = [...form.querySelectorAll('input[type="file"][name$="File"]')];
  const uploads = fileInputs
    .map((input) => ({
      input,
      file: input.files?.[0] || null,
      key: input.name.replace(/File$/, ''),
    }))
    .filter((entry) => entry.file);

  if (!uploads.length) return next;

  const total = uploads.length;
  let done = 0;
  for (const entry of uploads) {
    const folder = singleEditorUploadFolder(node, entry.key);
    if (statusEl) statusEl.textContent = `Uploading ${entry.key}... 0%`;
    const result = await uploadAsset(entry.file, folder, (value) => {
      if (statusEl) statusEl.textContent = `Uploading ${entry.key}... ${value}%`;
    });
    await saveUploadedMediaRecord(entry.file, result, folder, 'image', `${node}-single-editor`, `${node}:${entry.key}:${entry.file.name}`);
    next[entry.key] = result.publicUrl;
    done += 1;
    if (statusEl) statusEl.textContent = `Uploaded ${done} of ${total} image${total === 1 ? '' : 's'}`;
  }

  if (next.backgroundImage && !next.image) next.image = next.backgroundImage;
  if (next.image && !Array.isArray(next.images)) next.images = [next.image];
  return next;
}

function buildAdminSnapshot(data = {}) {
  const settings = safeJson(data.settings || {});
  const payment = safeJson(data.payment || {});
  const theme = document.body.dataset.theme || getTheme();
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    theme,
    settings,
    payment,
  };
}

function downloadTextFile(filename, content) {
  const blob = new Blob([content], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function openAdminSnapshotImportModal() {
  openModal(`
    <div class="panel-head management-modal-head">
      <div>
        <h2 class="section-title">Import Admin Snapshot</h2>
        <p class="section-subtitle">Restore settings and payment configuration from a safe JSON export.</p>
      </div>
      <button class="btn btn-ghost" data-close-modal type="button"><i data-lucide="x"></i></button>
    </div>
    <form id="adminSnapshotImportForm" class="management-import-form">
      <div class="field">
        <label for="adminSnapshotFile">JSON File</label>
        <input class="input" id="adminSnapshotFile" name="snapshotFile" type="file" accept="application/json,.json" />
      </div>
      <div class="field">
        <label for="adminSnapshotPaste">Or Paste JSON</label>
        <textarea class="textarea" id="adminSnapshotPaste" name="snapshotJson" placeholder='{"settings": {...}, "payment": {...}}'></textarea>
      </div>
      <div class="management-note">
        Only settings, payment, theme, and export metadata are imported. Secrets and unrelated nodes are ignored.
      </div>
      <div class="toolbar management-actions-inline">
        <button type="button" class="btn btn-ghost" data-close-modal>Cancel</button>
        <button type="submit" class="btn btn-primary">Import Snapshot</button>
      </div>
      <div class="management-import-status" id="adminSnapshotStatus"></div>
    </form>
  `);
}

async function applyAdminSnapshotImport(form) {
  const status = form.querySelector('#adminSnapshotStatus');
  const file = form.querySelector('#adminSnapshotFile')?.files?.[0] || null;
  const pasted = String(form.querySelector('#adminSnapshotPaste')?.value || '').trim();
  let payload = null;

  try {
    if (file) {
      payload = JSON.parse(await file.text());
    } else if (pasted) {
      payload = JSON.parse(pasted);
    } else {
      throw new Error('Choose a JSON file or paste snapshot data first.');
    }
  } catch (error) {
    const message = error?.message || 'Invalid JSON snapshot';
    if (status) status.textContent = message;
    showToast(message, 'danger');
    return;
  }

  const nextSettings = safeJson(payload?.settings || {});
  const nextPayment = safeJson(payload?.payment || {});

  try {
    if (Object.keys(nextSettings).length) {
      await updateRecord('settings', null, nextSettings);
    }
    if (Object.keys(nextPayment).length) {
      await updateRecord('payment', null, nextPayment);
    }
    if (payload?.theme) {
      setTheme(String(payload.theme));
    }
    if (status) status.textContent = 'Snapshot imported successfully.';
    showToast('Admin snapshot imported');
    closeModal();
    renderView(ui.data || {});
  } catch (error) {
    const message = error?.message || 'Snapshot import failed';
    if (status) status.textContent = message;
    showToast(message, 'danger');
  }
}

function renderSettingsManagementView(data = {}, fullData = {}) {
  const settings = fullData.settings || {};
  const theme = document.body.dataset.theme || getTheme();
  const notifications = Array.isArray(settings.notificationPreferences)
    ? settings.notificationPreferences
    : fromLines(settings.notificationPreferences || settings.notifications || settings.notificationTypes || '');
  const syncMode = candidateText(settings, ['publicSiteSync', 'syncMode', 'syncSettings', 'siteSync'], 'Not configured');
  const maintenance = candidateText(settings, ['maintenanceMode', 'maintenance', 'siteMaintenance'], 'Not configured');
  const firebaseStatus = fullData.settings ? 'Connected' : 'Not loaded';
  const supabaseStatus = 'Bucket: media';
  return `
    <div class="page active management-page-shell">
      <section class="panel glass management-page">
        <div class="panel-head management-page-head">
          <div>
            <div class="section-kicker">System Settings</div>
            <h2 class="section-title">Settings</h2>
            <p class="section-subtitle">Website controls, identity, sync, notifications, and security preferences.</p>
          </div>
          <div class="toolbar management-actions">
            <button class="btn btn-primary" type="button" data-action="edit-single" data-node="settings"><i data-lucide="pencil"></i> Edit Settings</button>
            <button class="btn btn-ghost" type="button" data-action="export-admin-snapshot"><i data-lucide="download"></i> Export</button>
            <button class="btn btn-ghost" type="button" data-action="import-admin-snapshot"><i data-lucide="upload"></i> Import</button>
          </div>
        </div>
        <div class="management-summary-grid">
          ${renderManagementSummaryCard('Theme', theme, 'Current admin theme preference', 'accent')}
          ${renderManagementSummaryCard('Maintenance', maintenance, 'Public site availability setting', 'warning')}
          ${renderManagementSummaryCard('Sync', syncMode, 'Public-site sync preference', 'primary')}
          ${renderManagementSummaryCard('Firebase', firebaseStatus, 'RTDB data loaded in the admin session', 'success')}
          ${renderManagementSummaryCard('Supabase', supabaseStatus, 'Storage uploads use the media bucket', 'success')}
        </div>
      </section>

      ${renderFieldGroup('Brand & Identity', 'Website name, logo and favicon values currently saved in Firebase.', `
        <div class="management-grid">
          ${renderInfoTile('Website Name', settings.siteName || settings.appName || APP_CONFIG.appName, 'Public-facing brand name')}
          ${renderInfoTile('Logo', settings.logo || 'Not set', 'Logo URL')}
          ${renderInfoTile('Favicon', settings.favicon || 'Not set', 'Browser tab icon')}
          ${renderInfoTile('Footer', settings.footer || 'Not set', 'Footer copy shown on public site')}
        </div>
      `)}

      ${renderFieldGroup('Contact & Social', 'Contact information and social links already stored in settings.', `
        <div class="management-grid">
          ${renderInfoTile('Email', settings.email || 'Not set')}
          ${renderInfoTile('WhatsApp', settings.whatsapp || 'Not set')}
          ${renderInfoTile('Telegram', settings.telegram || 'Not set')}
          ${renderInfoTile('Social Links', Array.isArray(settings.socialLinks) ? String(settings.socialLinks.length) : (settings.socialLinks ? 'Configured' : 'Not set'), 'Links stored as lines or arrays')}
        </div>
      `)}

      ${renderFieldGroup('Currency & Display', 'Display preferences pulled from the existing settings object.', `
        <div class="management-grid">
          ${renderInfoTile('Currency', candidateText(settings, ['currency', 'displayCurrency', 'currencyCode'], 'INR'))}
          ${renderInfoTile('Currency Symbol', candidateText(settings, ['currencySymbol', 'symbol'], '₹'))}
          ${renderInfoTile('Price Format', candidateText(settings, ['priceFormat', 'displayFormat'], 'INR / USD'))}
          ${renderInfoTile('Admin Theme', theme, 'Local theme preference')}
        </div>
      `)}

      ${renderFieldGroup('Security & Notifications', 'Profile and preference state without exposing secrets.', `
        <div class="management-grid">
          ${renderInfoTile('Admin Profile', candidateText(settings, ['adminName', 'ownerName', 'supportName'], 'Current authenticated admin'), 'Based on logged-in admin session')}
          ${renderInfoTile('Security', candidateText(settings, ['securityMode', 'accessMode'], 'Firebase Auth protected'), 'No secrets displayed here')}
          ${renderInfoTile('Notifications', notifications.length ? `${notifications.length} preferences` : 'Not configured', notifications.length ? notifications.join(', ') : 'No notification preferences saved')}
          ${renderInfoTile('Profile Email', candidateText(settings, ['adminEmail', 'ownerEmail'], userEmail?.textContent || 'Connected admin'), 'Current admin identity')}
        </div>
      `)}

      ${renderFieldGroup('Backup & Sync', 'Export or import the current admin configuration snapshot.', `
        <div class="management-grid">
          ${renderInfoTile('Public Sync', syncMode, 'Used for site data sync settings')}
          ${renderInfoTile('Maintenance Mode', maintenance, 'Helpful for planned downtime')}
          ${renderInfoTile('Export', 'Download JSON snapshot', 'Settings and payment config only')}
          ${renderInfoTile('Import', 'Restore JSON snapshot', 'Safe import for settings/payment')}
        </div>
      `)}

      ${renderFieldGroup('Quick Actions', 'Open the existing modal editor when you need to change values.', `
        <div class="toolbar management-actions-inline">
          <button class="btn btn-primary" type="button" data-action="edit-single" data-node="settings"><i data-lucide="pencil"></i> Edit Settings</button>
          <button class="btn btn-ghost" type="button" data-action="edit-single" data-node="payment"><i data-lucide="credit-card"></i> Edit Payment</button>
          <button class="btn btn-ghost" type="button" data-action="goto" data-route="payment"><i data-lucide="arrow-right"></i> Open Payment</button>
        </div>
      `)}
    </div>
  `;
}

function renderPaymentMethodCard(label, value, detail = '', tone = 'primary') {
  const empty = !value || String(value).trim() === '' || value === 'Not set';
  return `
    <div class="management-summary-card glass ${tone} ${empty ? 'is-empty' : ''}">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(String(value || 'Not set'))}</strong>
      ${detail ? `<small>${escapeHtml(detail)}</small>` : ''}
    </div>
  `;
}

function getStandardPaymentMethods(payment = {}) {
  const custom = payment.customMethods || {};
  const disabled = Array.isArray(payment.disabledMethods) ? payment.disabledMethods : (payment.disabledMethods ? Object.keys(payment.disabledMethods) : []);
  const recommendedId = payment.recommendedMethod || 'binancepay';

  const defaultList = [
    {
      id: 'binancepay',
      name: 'Binance Pay',
      sub: 'Zero-fee instant crypto transfer via Binance App',
      type: 'binance',
      iconClass: 'icon-binance',
      icon: 'sparkles',
      identifierLabel: 'Binance ID / Pay ID',
      identifier: payment.binanceId || '969887942',
      tag: '0% FEE',
      instructions: 'Open Binance App → Pay → Enter Binance ID → Transfer exact USD amount.',
      status: disabled.includes('binancepay') ? 'disabled' : 'active',
      isRecommended: recommendedId === 'binancepay',
      isDefault: true,
    },
    {
      id: 'upi',
      name: 'UPI (GPay / PhonePe / Paytm)',
      sub: 'Instant Indian UPI transfers & Dynamic QR Code',
      type: 'upi',
      iconClass: 'icon-upi',
      icon: 'smartphone',
      identifierLabel: 'UPI VPA Address',
      identifier: payment.upiId || 'Ritikane@ptyes',
      qrImage: payment.qrImage || '',
      tag: 'INR FAST',
      instructions: 'Scan QR with GPay / PhonePe / Paytm or send to UPI ID → Upload screenshot proof.',
      status: disabled.includes('upi') ? 'disabled' : 'active',
      isRecommended: recommendedId === 'upi',
      isDefault: true,
    },
    {
      id: 'bep20',
      name: 'USDT BEP-20 (BSC)',
      sub: 'BNB Smart Chain Low-Fee Network',
      type: 'crypto',
      iconClass: 'icon-bep20',
      icon: 'coins',
      identifierLabel: 'BEP-20 Wallet Address',
      identifier: payment.bep20Address || '0x7186b11f8fD49fe472Af49Cda490f168e09Fef0a',
      tag: 'USDT (BSC)',
      instructions: 'Send exact USDT on Binance Smart Chain (BEP-20) network only.',
      status: disabled.includes('bep20') ? 'disabled' : 'active',
      isRecommended: recommendedId === 'bep20',
      isDefault: true,
    },
    {
      id: 'eth',
      name: 'USDT ERC-20 (ETH)',
      sub: 'Ethereum Mainnet Network',
      type: 'crypto',
      iconClass: 'icon-eth',
      icon: 'wallet',
      identifierLabel: 'ERC-20 Wallet Address',
      identifier: payment.ethAddress || '0x7186b11f8fD49fe472Af49Cda490f168e09Fef0a',
      tag: 'USDT (ETH)',
      instructions: 'Send exact USDT on Ethereum (ERC-20) network only.',
      status: disabled.includes('eth') ? 'disabled' : 'active',
      isRecommended: recommendedId === 'eth',
      isDefault: true,
    },
    {
      id: 'paypal',
      name: 'PayPal',
      sub: 'International Debit / Credit Cards',
      type: 'paypal',
      iconClass: 'icon-paypal',
      icon: 'credit-card',
      identifierLabel: 'PayPal Link',
      identifier: payment.paypalLink || 'https://paypal.me/Johnguzman456',
      tag: 'GLOBAL',
      instructions: 'Click PayPal link and send exact USD amount as Friends & Family or Goods.',
      status: disabled.includes('paypal') ? 'disabled' : 'active',
      isRecommended: recommendedId === 'paypal',
      isDefault: true,
    },
    {
      id: 'giftcard',
      name: 'Binance Gift Card',
      sub: 'Digital Voucher / G2A Key',
      type: 'giftcard',
      iconClass: 'icon-gift',
      icon: 'gift',
      identifierLabel: 'Gift Card URL',
      identifier: payment.binanceGiftCardUrl || 'https://www.g2a.com/binance-gift-card-205-usdt-key-i10000337768061',
      tag: 'VOUCHER',
      instructions: 'Buy digital voucher key and submit voucher code in payment verification.',
      status: disabled.includes('giftcard') ? 'disabled' : 'active',
      isRecommended: recommendedId === 'giftcard',
      isDefault: true,
    },
  ];

  // Custom methods from Firebase
  const customList = Object.entries(custom).map(([id, item]) => ({
    id,
    name: item.name || 'Custom Method',
    sub: item.sub || item.description || 'Custom payment method',
    type: item.type || 'custom',
    iconClass: 'icon-custom',
    icon: 'credit-card',
    identifierLabel: item.identifierLabel || 'Account / Address / Link',
    identifier: item.identifier || item.address || item.link || '',
    qrImage: item.qrImage || '',
    tag: item.tag || 'CUSTOM',
    instructions: item.instructions || '',
    status: item.status || 'active',
    isRecommended: recommendedId === id,
    isCustom: true,
  }));

  return [...defaultList, ...customList];
}

function renderPaymentManagementView(data = {}, fullData = {}) {
  const DEFAULT_PAYMENT_CONFIG = {
    recommendedMethod: 'binancepay',
    upiId: 'Ritikane@ptyes',
    qrImage: '',
    telegramUrl: 'https://t.me/TRUSTED_BROTHER1234',
    telegramChannel: 'https://t.me/TRUSTED_BROTHER1234',
    bep20Address: '0x7186b11f8fD49fe472Af49Cda490f168e09Fef0a',
    ethAddress: '0x7186b11f8fD49fe472Af49Cda490f168e09Fef0a',
    binanceId: '969887942',
    binanceGiftCardUrl: 'https://www.g2a.com/binance-gift-card-205-usdt-key-i10000337768061',
    paypalLink: 'https://paypal.me/Johnguzman456',
    instructions: 'Pay exact order amount and submit screenshot for instant activation.',
    status: 'active',
    customMethods: {},
    disabledMethods: [],
  };

  const rawPayment = (fullData && fullData.payment) || (data && typeof data === 'object' && Object.keys(data).length ? data : {}) || {};
  const rawSettings = (fullData && fullData.settings) || {};

  const payment = {
    ...DEFAULT_PAYMENT_CONFIG,
    ...(rawSettings.upiId ? { upiId: rawSettings.upiId } : {}),
    ...(rawSettings.telegram ? { telegramUrl: rawSettings.telegram } : {}),
    ...rawPayment,
  };

  const methodsList = getStandardPaymentMethods(payment);

  const allOrders = listCollection('orders');
  const records = sortManagementList(filterManagementList(allOrders, 'payment'));
  const totals = managementTotals(records);
  const paidMethods = [...new Set(records.map((item) => orderMethodLabel(item)).filter((value) => value && value !== 'Unknown'))];
  const todayReceived = records
    .filter((item) => {
      const day = new Date(orderDateValue(item)).toISOString().slice(0, 10);
      return day === new Date().toISOString().slice(0, 10) && isPaidOrder(item);
    })
    .reduce((total, item) => total + parseAmountValue(item.amount || item.inr), 0);
  const monthReceived = records
    .filter((item) => new Date(orderDateValue(item)).toISOString().slice(0, 7) === new Date().toISOString().slice(0, 7) && isPaidOrder(item))
    .reduce((total, item) => total + parseAmountValue(item.amount || item.inr), 0);
  const tableItems = records;

  return `
    <div class="page active management-page-shell">
      <section class="panel glass management-page">
        <div class="panel-head payment-management-head">
          <div>
            <div class="section-kicker">Checkout & Gateways</div>
            <h2 class="section-title">Payment Methods & Gateway Hub</h2>
            <p class="section-subtitle">Add custom payment options, enable/disable methods, set the recommended choice, and update credentials live on Linkadda Shop.</p>
          </div>
          <div class="toolbar management-actions">
            <button class="btn btn-primary" type="button" data-action="add-payment-method"><i data-lucide="plus-circle"></i> Add Payment Method</button>
            <button class="btn btn-ghost" type="button" data-action="edit-single" data-node="payment"><i data-lucide="sliders"></i> Gateway Settings</button>
            <button class="btn btn-ghost" type="button" data-action="goto" data-route="orders"><i data-lucide="receipt-text"></i> Open Orders</button>
          </div>
        </div>
        <div class="management-summary-grid">
          ${renderManagementSummaryCard('Total Volume', formatCurrencyCompact(totals.totalReceived), 'From paid & verified orders', 'success')}
          ${renderManagementSummaryCard('Pending Verification', String(totals.pending), 'Awaiting admin review', 'warning')}
          ${renderManagementSummaryCard('Failed / Rejected', String(totals.failed), 'Rejected or expired payments', 'danger')}
          ${renderManagementSummaryCard('Today Received', formatCurrencyCompact(todayReceived), 'Received today', 'primary')}
          ${renderManagementSummaryCard('This Month', formatCurrencyCompact(monthReceived), 'Total this month', 'accent')}
        </div>
      </section>

      ${renderFieldGroup('Active Payment Methods (Linkadda Shop Connected)', 'Configure payment methods shown to customers on checkout. Toggle active, edit credentials, or set recommended.', `
        <div class="payment-methods-grid">
          ${methodsList.map((m) => `
            <div class="payment-card ${m.isRecommended ? 'is-recommended' : ''} ${m.status !== 'active' ? 'is-disabled' : ''}">
              <div class="payment-card-header">
                <div class="payment-card-brand">
                  <div class="payment-card-icon ${escapeHtml(m.iconClass)}">
                    <i data-lucide="${escapeHtml(m.icon)}"></i>
                  </div>
                  <div class="payment-card-titles">
                    <strong>${escapeHtml(m.name)}</strong>
                    <span>${escapeHtml(m.sub)}</span>
                  </div>
                </div>
                <button class="payment-toggle-btn ${m.status === 'active' ? 'is-active' : 'is-disabled'}" data-action="toggle-payment-method" data-id="${escapeHtml(m.id)}" title="Click to Toggle Active/Disabled">
                  <i data-lucide="${m.status === 'active' ? 'check-circle' : 'x-circle'}"></i> ${m.status === 'active' ? 'Active' : 'Disabled'}
                </button>
              </div>

              <div class="payment-card-badges">
                <span class="badge ${m.isRecommended ? 'warning' : 'primary'}">${escapeHtml(m.tag)}</span>
                ${m.isRecommended ? '<span class="badge warning"><i data-lucide="star"></i> Recommended on Top</span>' : ''}
              </div>

              <div class="payment-card-body">
                <div class="payment-data-row">
                  <span class="payment-data-label">${escapeHtml(m.identifierLabel)}</span>
                  <button class="icon-btn" data-action="copy-payment-val" data-val="${escapeHtml(m.identifier)}" title="Copy Value"><i data-lucide="copy"></i></button>
                </div>
                <div class="payment-data-val">${escapeHtml(m.identifier || 'Not set')}</div>
              </div>

              <div class="payment-card-actions">
                <button class="payment-make-rec-btn ${m.isRecommended ? 'active' : ''}" data-action="set-recommended-method" data-id="${escapeHtml(m.id)}">
                  <i data-lucide="star"></i> ${m.isRecommended ? '⭐ Recommended' : 'Make Recommended'}
                </button>
                <div class="toolbar" style="gap: 4px;">
                  <button class="icon-btn" data-action="edit-payment-method" data-id="${escapeHtml(m.id)}" title="Edit Method"><i data-lucide="pencil"></i></button>
                  <button class="icon-btn danger" data-action="delete-payment-method" data-id="${escapeHtml(m.id)}" title="${m.isCustom ? 'Delete Custom Method' : 'Disable / Remove Method'}"><i data-lucide="trash-2"></i></button>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      `)}

      ${renderFieldGroup('Live Payment Records', 'Real customer payment submissions pulled from Firebase orders collection.', `
        <div class="management-filterbar">
          <div class="field">
            <label for="paymentSearch">Search</label>
            <input class="input" id="paymentSearch" type="search" placeholder="Search product, customer, transaction ID..." value="${escapeHtml(ui.management.search || '')}" />
          </div>
          <div class="field">
            <label for="paymentStatusFilter">Status</label>
            <select class="select" id="paymentStatusFilter">
              ${['all', 'paid', 'pending', 'failed', 'approved', 'rejected', 'expired'].map((status) => `<option value="${status}" ${ui.management.status === status ? 'selected' : ''}>${escapeHtml(status)}</option>`).join('')}
            </select>
          </div>
          <div class="field">
            <label for="paymentMethodFilter">Method</label>
            <select class="select" id="paymentMethodFilter">
              <option value="all">All Methods</option>
              ${paidMethods.map((method) => `<option value="${escapeHtml(method)}" ${ui.management.method === method ? 'selected' : ''}>${escapeHtml(method)}</option>`).join('')}
            </select>
          </div>
          <div class="field">
            <label for="paymentDateFilter">Date</label>
            <select class="select" id="paymentDateFilter">
              <option value="all" ${ui.management.date === 'all' ? 'selected' : ''}>All Time</option>
              <option value="today" ${ui.management.date === 'today' ? 'selected' : ''}>Today</option>
              <option value="month" ${ui.management.date === 'month' ? 'selected' : ''}>This Month</option>
            </select>
          </div>
        </div>
        <div class="table-wrap">
          <table class="table management-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Txn / Ref</th>
                <th>Method</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Date</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${tableItems.length ? tableItems.map((item) => {
                const thumb = orderProductThumb(item);
                return `
                <tr>
                  <td>
                    <div class="management-product-cell">
                      <div class="management-product-thumb">${thumb ? `<img src="${escapeHtml(thumb)}" alt="${escapeHtml(orderProductName(item))}" loading="lazy" />` : '<div class="preview-fallback"><i data-lucide="film"></i></div>'}</div>
                      <div>
                        <strong>${escapeHtml(orderProductName(item))}</strong>
                        <div class="meta">${escapeHtml(orderCustomerLabel(item))}</div>
                      </div>
                    </div>
                  </td>
                  <td><code>${escapeHtml(orderTransactionId(item))}</code></td>
                  <td><span class="badge">${escapeHtml(orderMethodLabel(item))}</span></td>
                  <td><strong>${escapeHtml(formatCurrencyCompact(item.amount || item.inr || 0))}</strong></td>
                  <td>${renderStatusBadge(orderStatusValue(item))}</td>
                  <td>${escapeHtml(formatDateTime(orderDateValue(item)))}</td>
                  <td>
                    <div class="item-actions">
                      <button class="icon-btn" type="button" data-action="open-order" data-id="${escapeHtml(item.id)}"><i data-lucide="eye"></i> View</button>
                    </div>
                  </td>
                </tr>
              `;
              }).join('') : `<tr><td colspan="7"><div class="empty-state">${allOrders.length ? 'No payment records match the current filters.' : 'No payment records found.'}</div></td></tr>`}
            </tbody>
          </table>
        </div>
      `)}
    </div>
  `;
}



function renderPaymentMethodModal(method = {}, isEdit = false) {
  const isRecommended = Boolean(method.isRecommended);
  const status = method.status || 'active';
  const type = method.type || 'crypto';
  return `
    <div class="panel-head management-modal-head">
      <div>
        <h2 class="section-title">${isEdit ? 'Edit Payment Method' : 'Add New Payment Method'}</h2>
        <p class="section-subtitle">${isEdit ? `Update credentials for ${escapeHtml(method.name || 'method')}` : 'Add a custom gateway or crypto wallet connected to checkout.'}</p>
      </div>
      <button class="btn btn-ghost" data-close-modal type="button"><i data-lucide="x"></i></button>
    </div>
    <form class="form" id="paymentMethodForm" data-method-id="${escapeHtml(method.id || '')}" data-is-edit="${isEdit ? 'true' : 'false'}" data-is-custom="${method.isCustom ? 'true' : 'false'}">
      <div class="form-grid">
        <div class="field">
          <label for="pmName">Payment Method Name *</label>
          <input class="input" id="pmName" name="name" type="text" placeholder="e.g. USDT TRC-20, Toncoin, Paytm Direct, Google Pay" value="${escapeHtml(method.name || '')}" required />
        </div>
        <div class="field">
          <label for="pmType">Category / Network</label>
          <select class="select" id="pmType" name="type">
            <option value="crypto" ${type === 'crypto' ? 'selected' : ''}>Crypto Wallet (USDT / BTC / TON / BSC / ETH)</option>
            <option value="upi" ${type === 'upi' ? 'selected' : ''}>Indian UPI (GPay / PhonePe / Paytm / BHIM)</option>
            <option value="binance" ${type === 'binance' ? 'selected' : ''}>Binance Pay</option>
            <option value="paypal" ${type === 'paypal' ? 'selected' : ''}>PayPal</option>
            <option value="giftcard" ${type === 'giftcard' ? 'selected' : ''}>Digital Gift Card / Voucher</option>
            <option value="custom" ${type === 'custom' ? 'selected' : ''}>Custom Payment Link / Gateway</option>
          </select>
        </div>
        <div class="field full">
          <label for="pmIdentifier">Account ID / Wallet Address / Payment Link *</label>
          <input class="input" id="pmIdentifier" name="identifier" type="text" placeholder="e.g. 0x... / UPI VPA / Binance ID / https://..." value="${escapeHtml(method.identifier || '')}" required />
        </div>
        <div class="field">
          <label for="pmTag">Tag Badge Text</label>
          <input class="input" id="pmTag" name="tag" type="text" placeholder="e.g. USDT, 0% FEE, FAST, INTL" value="${escapeHtml(method.tag || '')}" />
        </div>
        <div class="field">
          <label for="pmQrImage">QR Code Image URL (Optional)</label>
          <input class="input" id="pmQrImage" name="qrImage" type="text" placeholder="https://..." value="${escapeHtml(method.qrImage || '')}" />
        </div>
        <div class="field full">
          <label for="pmSub">Subtitle / Short Note</label>
          <input class="input" id="pmSub" name="sub" type="text" placeholder="e.g. Tron network low-fee transfers" value="${escapeHtml(method.sub || '')}" />
        </div>
        <div class="field full">
          <label for="pmInstructions">Instructions for Buyer</label>
          <textarea class="textarea" id="pmInstructions" name="instructions" rows="2" placeholder="Send exact amount and upload transaction screenshot for fast verification.">${escapeHtml(method.instructions || '')}</textarea>
        </div>
        <div class="field">
          <label for="pmStatus">Live Status</label>
          <select class="select" id="pmStatus" name="status">
            <option value="active" ${status === 'active' ? 'selected' : ''}>Active (Visible on checkout)</option>
            <option value="disabled" ${status === 'disabled' ? 'selected' : ''}>Disabled (Hidden)</option>
          </select>
        </div>
        <div class="field" style="display:flex;align-items:center;gap:10px;padding-top:24px;">
          <input type="checkbox" id="pmIsRecommended" name="isRecommended" style="width:18px;height:18px;cursor:pointer;" ${isRecommended ? 'checked' : ''} />
          <label for="pmIsRecommended" style="cursor:pointer;margin:0;font-weight:600;">⭐ Make this the Recommended Choice</label>
        </div>
      </div>
      <div class="toolbar management-actions-inline" style="margin-top:16px;">
        <button class="btn btn-primary" type="submit"><i data-lucide="check"></i> Save Payment Method</button>
        <button class="btn btn-ghost" data-close-modal type="button">Cancel</button>
      </div>
    </form>
  `;
}

function renderOrderDetailsModal(item = {}) {
  const proof = orderPaymentProof(item);
  const delivery = orderDeliveryInfo(item);
  const proofIsImage = /\.(png|jpg|jpeg|webp|gif|avif|bmp)$/i.test(String(proof || ''));
  return `
    <div class="panel-head management-modal-head">
      <div>
        <h2 class="section-title">${escapeHtml(orderProductName(item))}</h2>
        <p class="section-subtitle">Order ID: ${escapeHtml(item.id || '-')}</p>
      </div>
      <button class="btn btn-ghost" data-close-modal type="button"><i data-lucide="x"></i></button>
    </div>
    <div class="management-drawer">
      <div class="management-drawer-top">
        <div class="management-drawer-thumb">
          ${item.image ? `<img src="${escapeHtml(resolveMediaSource(item.image) || item.image)}" alt="${escapeHtml(orderProductName(item))}" loading="lazy" />` : '<div class="preview-fallback">No image</div>'}
        </div>
        <div class="management-drawer-summary">
          <div class="management-pill-row">
            ${renderStatusBadge(orderStatusValue(item))}
            ${renderStatusBadge(isPaidOrder(item) ? 'paid' : isFailedOrder(item) ? 'failed' : 'pending')}
          </div>
          <div class="management-grid">
            ${renderInfoTile('Customer', orderCustomerLabel(item))}
            ${renderInfoTile('Amount', formatCurrencyCompact(item.amount))}
            ${renderInfoTile('Payment Method', orderMethodLabel(item))}
            ${renderInfoTile('Txn / Ref', orderTransactionId(item))}
          </div>
        </div>
      </div>
      <div class="management-grid">
        ${renderInfoTile('Order Status', orderStatusLabel(item))}
        ${renderInfoTile('Payment Status', candidateText(item, ['paymentStatus', 'status', 'state'], orderStatusLabel(item)))}
        ${renderInfoTile('Date', formatDateTime(orderDateValue(item)))}
        ${renderInfoTile('Product', orderProductName(item))}
      </div>
      ${proof ? `
        <section class="management-proof">
          <h3>Payment Screenshot</h3>
          ${proofIsImage ? `<a href="${escapeHtml(safeUrl(resolveMediaSource(proof) || proof))}" target="_blank" rel="noreferrer" class="proof-image-link"><img src="${escapeHtml(resolveMediaSource(proof) || proof)}" alt="Payment proof" loading="lazy" /></a>` : `<a href="${escapeHtml(safeUrl(proof))}" target="_blank" rel="noreferrer">${escapeHtml(proof)}</a>`}
        </section>
      ` : '<div class="empty-state">No payment proof saved for this record.</div>'}
      ${delivery ? `
        <section class="management-proof">
          <h3>Delivery / Access</h3>
          <p>${escapeHtml(delivery)}</p>
        </section>
      ` : '<div class="empty-state">No delivery or access information saved.</div>'}
      <div class="toolbar management-actions-inline">
        <button class="btn btn-primary" type="button" data-action="approve-order" data-id="${escapeHtml(item.id || '')}"><i data-lucide="check"></i> Approve Payment</button>
        <button class="btn btn-ghost" type="button" data-action="reject-order" data-id="${escapeHtml(item.id || '')}"><i data-lucide="x"></i> Reject Payment</button>
        <button class="btn btn-danger" type="button" data-action="delete-order" data-id="${escapeHtml(item.id || '')}"><i data-lucide="trash-2"></i> Delete</button>
      </div>
    </div>
  `;
}

function renderOrdersManagementView(data = {}, fullData = {}) {
  const allOrders = listCollection('orders');
  const items = sortManagementList(filterManagementList(allOrders, 'orders'));
  const totals = managementTotals(items);
  const methods = [...new Set(items.map((item) => orderMethodLabel(item)).filter((value) => value && value !== 'Unknown'))];
  const revenueThisMonth = items
    .filter((item) => isPaidOrder(item) && new Date(orderDateValue(item)).toISOString().slice(0, 7) === new Date().toISOString().slice(0, 7))
    .reduce((total, item) => total + parseAmountValue(item.amount), 0);
  return `
    <div class="page active management-page-shell">
      <section class="panel glass management-page">
        <div class="panel-head management-page-head">
          <div>
            <div class="section-kicker">Order Processing</div>
            <h2 class="section-title">Orders</h2>
            <p class="section-subtitle">Track customer orders, payment state, and delivery or access details.</p>
          </div>
          <div class="toolbar management-actions">
            <button class="btn btn-ghost" type="button" data-action="goto" data-route="payment"><i data-lucide="credit-card"></i> Payment</button>
          </div>
        </div>
        <div class="management-summary-grid">
          ${renderManagementSummaryCard('Total Orders', totals.total, 'All order records', 'primary')}
          ${renderManagementSummaryCard('Pending', totals.pending, 'Waiting for verification', 'warning')}
          ${renderManagementSummaryCard('Paid', totals.paid, 'Verified payments', 'success')}
          ${renderManagementSummaryCard('Failed', totals.failed, 'Rejected / expired / failed', 'danger')}
          ${renderManagementSummaryCard('Revenue', formatCurrencyCompact(totals.totalReceived), 'Only paid / approved orders', 'accent')}
        </div>
      </section>

      ${renderFieldGroup('Revenue Summary', 'Live order totals from the existing Firebase records.', `
        <div class="management-grid">
          ${renderInfoTile('Today', `${totals.today} orders`, `${formatCurrencyCompact(items.filter((item) => isPaidOrder(item) && new Date(orderDateValue(item)).toISOString().slice(0, 10) === new Date().toISOString().slice(0, 10)).reduce((sum, item) => sum + parseAmountValue(item.amount), 0))}`)}
          ${renderInfoTile('This Month', `${totals.month} orders`, formatCurrencyCompact(revenueThisMonth))}
          ${renderInfoTile('Pending', String(totals.pending))}
          ${renderInfoTile('Failed', String(totals.failed))}
        </div>
      `)}

      ${renderFieldGroup('Search & Filters', 'Filter orders by status, payment method, and date.', `
        <div class="management-filterbar">
          <div class="field">
            <label for="orderSearch">Search</label>
            <input class="input" id="orderSearch" type="search" placeholder="Search order, product, customer or txn ID..." value="${escapeHtml(ui.management.search || '')}" />
          </div>
          <div class="field">
            <label for="orderStatusFilter">Status</label>
            <select class="select" id="orderStatusFilter">
              ${['all', 'paid', 'pending', 'failed', 'approved', 'rejected', 'expired'].map((status) => `<option value="${status}" ${ui.management.status === status ? 'selected' : ''}>${escapeHtml(status)}</option>`).join('')}
            </select>
          </div>
          <div class="field">
            <label for="orderMethodFilter">Payment Method</label>
            <select class="select" id="orderMethodFilter">
              <option value="all">All Methods</option>
              ${methods.map((method) => `<option value="${escapeHtml(method)}" ${ui.management.method === method ? 'selected' : ''}>${escapeHtml(method)}</option>`).join('')}
            </select>
          </div>
          <div class="field">
            <label for="orderDateFilter">Date</label>
            <select class="select" id="orderDateFilter">
              <option value="all" ${ui.management.date === 'all' ? 'selected' : ''}>All Time</option>
              <option value="today" ${ui.management.date === 'today' ? 'selected' : ''}>Today</option>
              <option value="month" ${ui.management.date === 'month' ? 'selected' : ''}>This Month</option>
            </select>
          </div>
        </div>
      `)}

      <section class="panel glass management-section">
        <div class="panel-head management-section-head">
          <div>
            <h3>Order Records</h3>
            <p class="section-subtitle">Real records from Firebase with customer, payment and status details.</p>
          </div>
        </div>
        <div class="table-wrap">
          <table class="table management-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Amount</th>
                <th>Method</th>
                <th>Payment</th>
                <th>Order Status</th>
                <th>Date</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${items.length ? items.map((item) => `
                <tr>
                  <td data-label="Order">
                    <div class="management-product-cell">
                      <div class="management-product-thumb">${item.image ? `<img src="${escapeHtml(resolveMediaSource(item.image) || item.image)}" alt="${escapeHtml(orderProductName(item))}" loading="lazy" />` : '<div class="preview-fallback">No image</div>'}</div>
                      <div>
                        <strong>${escapeHtml(orderProductName(item))}</strong>
                        <div class="meta">${escapeHtml(orderTransactionId(item))}</div>
                      </div>
                    </div>
                  </td>
                  <td data-label="Customer">${escapeHtml(orderCustomerLabel(item))}</td>
                  <td data-label="Amount">${escapeHtml(formatCurrencyCompact(item.amount))}</td>
                  <td data-label="Method">${escapeHtml(orderMethodLabel(item))}</td>
                  <td data-label="Payment">${renderStatusBadge(orderStatusValue(item))}</td>
                  <td data-label="Order Status">${renderStatusBadge(candidateText(item, ['orderStatus', 'status', 'state'], 'unknown'))}</td>
                  <td data-label="Date">${escapeHtml(formatDateTime(orderDateValue(item)))}</td>
                  <td data-label="Action">
                    <div class="item-actions">
                      <button class="icon-btn" type="button" data-action="open-order" data-id="${escapeHtml(item.id)}"><i data-lucide="eye"></i> View</button>
                    </div>
                  </td>
                </tr>
              `).join('') : `<tr><td colspan="8"><div class="empty-state">${allOrders.length ? 'No orders match the current filters.' : 'No orders found.'}</div></td></tr>`}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  `;
}

function renderScreenshotsGalleryView(data = {}, fullData = {}) {
  const allOrders = listCollection('orders');
  
  // Filter for orders that have screenshots
  const itemsWithScreenshot = allOrders.filter(item => {
    const proof = orderPaymentProof(item);
    return proof && String(proof).trim() !== '';
  });
  
  // Sort items (newest first)
  const sortedItems = itemsWithScreenshot.sort((a, b) => orderDateValue(b) - orderDateValue(a));
  
  const methods = [...new Set(sortedItems.map((item) => orderMethodLabel(item)).filter((value) => value && value !== 'Unknown'))];
  
  // Apply filters
  const search = String(ui.management.search || '').trim().toLowerCase();
  const statusFilter = String(ui.management.status || 'all');
  const methodFilter = String(ui.management.method || 'all');
  const dateFilter = String(ui.management.date || 'all');
  
  const todayStr = new Date().toISOString().slice(0, 10);
  const thisMonthStr = new Date().toISOString().slice(0, 7);
  
  const filteredItems = sortedItems.filter(item => {
    const name = orderProductName(item).toLowerCase();
    const txn = orderTransactionId(item).toLowerCase();
    const customer = orderCustomerLabel(item).toLowerCase();
    const status = orderStatusValue(item);
    const method = orderMethodLabel(item);
    const dateValue = orderDateValue(item);
    const dateStr = dateValue ? new Date(dateValue).toISOString() : '';
    
    // Search match
    const matchesSearch = !search || 
      name.includes(search) || 
      txn.includes(search) || 
      customer.includes(search) || 
      String(item.id || '').toLowerCase().includes(search);
      
    // Status match
    let matchesStatus = true;
    if (statusFilter !== 'all') {
      if (statusFilter === 'paid' || statusFilter === 'approved') {
        matchesStatus = isPaidOrder(item);
      } else if (statusFilter === 'pending') {
        matchesStatus = isPendingOrder(item);
      } else if (statusFilter === 'failed' || statusFilter === 'rejected') {
        matchesStatus = isFailedOrder(item);
      } else {
        matchesStatus = status === statusFilter;
      }
    }
    
    // Method match
    const matchesMethod = methodFilter === 'all' || method === methodFilter;
    
    // Date match
    let matchesDate = true;
    if (dateFilter === 'today') {
      matchesDate = dateStr.slice(0, 10) === todayStr;
    } else if (dateFilter === 'month') {
      matchesDate = dateStr.slice(0, 7) === thisMonthStr;
    }
    
    return matchesSearch && matchesStatus && matchesMethod && matchesDate;
  });

  const totals = {
    total: itemsWithScreenshot.length,
    pending: itemsWithScreenshot.filter(item => isPendingOrder(item)).length,
    paid: itemsWithScreenshot.filter(item => isPaidOrder(item)).length,
    failed: itemsWithScreenshot.filter(item => isFailedOrder(item)).length,
  };

  return `
    <style>
      .screenshots-gallery-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
        gap: 20px;
        margin-top: 20px;
        width: 100%;
      }
      .screenshot-card {
        border-radius: 18px;
        border: 1px solid var(--border);
        background: var(--panel-glass);
        backdrop-filter: blur(12px);
        overflow: hidden;
        display: flex;
        flex-direction: column;
        transition: transform 0.2s ease, box-shadow 0.2s ease;
      }
      .screenshot-card:hover {
        transform: translateY(-4px);
        box-shadow: 0 12px 30px rgba(0,0,0,0.4);
      }
      .screenshot-img-wrap {
        width: 100%;
        height: 240px;
        position: relative;
        overflow: hidden;
        background: #09090e;
        border-bottom: 1px solid var(--border);
      }
      .screenshot-img-wrap img {
        width: 100%;
        height: 100%;
        object-fit: contain;
        transition: transform 0.3s ease;
        cursor: pointer;
      }
      .screenshot-img-wrap img:hover {
        transform: scale(1.05);
      }
      .screenshot-card-content {
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 12px;
        flex-grow: 1;
      }
      .screenshot-card-title {
        font-size: 1.05rem;
        font-weight: 700;
        color: var(--text);
        margin: 0;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .screenshot-card-meta {
        display: flex;
        flex-direction: column;
        gap: 6px;
        font-size: 0.82rem;
        color: var(--muted);
      }
      .screenshot-meta-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .screenshot-meta-value {
        color: var(--text-bright);
        font-weight: 500;
      }
      .screenshot-actions {
        display: flex;
        gap: 8px;
        margin-top: auto;
        padding-top: 12px;
        border-top: 1px solid var(--border-light);
      }
      .screenshot-actions .btn {
        flex: 1;
        padding: 8px 12px;
        font-size: 0.8rem;
        height: auto;
      }
    </style>

    <div class="page active management-page-shell">
      <section class="panel glass management-page">
        <div class="panel-head management-page-head">
          <div>
            <div class="section-kicker">Payment Verification</div>
            <h2 class="section-title">Order Screenshots</h2>
            <p class="section-subtitle">Review payment screenshots and manage order statuses directly.</p>
          </div>
          <div class="toolbar management-actions">
            <button class="btn btn-ghost" type="button" data-action="goto" data-route="orders"><i data-lucide="receipt-text"></i> Orders List</button>
          </div>
        </div>
        <div class="management-summary-grid">
          ${renderManagementSummaryCard('Total Screenshots', totals.total, 'All uploaded proofs', 'primary')}
          ${renderManagementSummaryCard('Pending Review', totals.pending, 'Awaiting verification', 'warning')}
          ${renderManagementSummaryCard('Approved', totals.paid, 'Verified payments', 'success')}
          ${renderManagementSummaryCard('Rejected', totals.failed, 'Failed / rejected', 'danger')}
        </div>
      </section>

      ${renderFieldGroup('Search & Filters', 'Filter screenshots by status, payment method, and date.', `
        <div class="management-filterbar">
          <div class="field">
            <label for="orderSearch">Search</label>
            <input class="input" id="orderSearch" type="search" placeholder="Search product, customer, order or txn ID..." value="${escapeHtml(ui.management.search || '')}" />
          </div>
          <div class="field">
            <label for="orderStatusFilter">Status</label>
            <select class="select" id="orderStatusFilter">
              ${['all', 'pending', 'paid', 'failed', 'approved', 'rejected', 'expired'].map((status) => `<option value="${status}" ${ui.management.status === status ? 'selected' : ''}>${escapeHtml(status)}</option>`).join('')}
            </select>
          </div>
          <div class="field">
            <label for="orderMethodFilter">Payment Method</label>
            <select class="select" id="orderMethodFilter">
              <option value="all">All Methods</option>
              ${methods.map((method) => `<option value="${escapeHtml(method)}" ${ui.management.method === method ? 'selected' : ''}>${escapeHtml(method)}</option>`).join('')}
            </select>
          </div>
          <div class="field">
            <label for="orderDateFilter">Date</label>
            <select class="select" id="orderDateFilter">
              <option value="all" ${ui.management.date === 'all' ? 'selected' : ''}>All Time</option>
              <option value="today" ${ui.management.date === 'today' ? 'selected' : ''}>Today</option>
              <option value="month" ${ui.management.date === 'month' ? 'selected' : ''}>This Month</option>
            </select>
          </div>
        </div>
      `)}

      <div class="screenshots-gallery-grid">
        ${filteredItems.length ? filteredItems.map(item => {
          const proof = orderPaymentProof(item);
          const status = orderStatusValue(item);
          const resolvedProof = resolveMediaSource(proof) || proof;
          return `
            <div class="screenshot-card">
              <div class="screenshot-img-wrap">
                <img src="${escapeHtml(resolvedProof)}" alt="Payment proof" onclick="window.open('${escapeHtml(resolvedProof)}', '_blank')" title="Click to view full image" />
              </div>
              <div class="screenshot-card-content">
                <h3 class="screenshot-card-title">${escapeHtml(orderProductName(item))}</h3>
                <div class="screenshot-card-meta">
                  <div class="screenshot-meta-item">
                    <span>Order ID:</span>
                    <span class="screenshot-meta-value">${escapeHtml(item.id || '-')}</span>
                  </div>
                  <div class="screenshot-meta-item">
                    <span>Customer:</span>
                    <span class="screenshot-meta-value">${escapeHtml(orderCustomerLabel(item))}</span>
                  </div>
                  <div class="screenshot-meta-item">
                    <span>Amount:</span>
                    <span class="screenshot-meta-value">${escapeHtml(formatCurrencyCompact(item.amount))}</span>
                  </div>
                  <div class="screenshot-meta-item">
                    <span>Method:</span>
                    <span class="screenshot-meta-value">${escapeHtml(orderMethodLabel(item))}</span>
                  </div>
                  <div class="screenshot-meta-item">
                    <span>Txn / Ref:</span>
                    <span class="screenshot-meta-value">${escapeHtml(orderTransactionId(item))}</span>
                  </div>
                  <div class="screenshot-meta-item">
                    <span>Status:</span>
                    <span>${renderStatusBadge(status)}</span>
                  </div>
                  <div class="screenshot-meta-item">
                    <span>Date:</span>
                    <span class="screenshot-meta-value">${escapeHtml(formatDateTime(orderDateValue(item)))}</span>
                  </div>
                </div>
                <div class="screenshot-actions">
                  <button class="btn btn-ghost" type="button" data-action="open-order" data-id="${escapeHtml(item.id)}"><i data-lucide="eye"></i> Details</button>
                  ${isPendingOrder(item) ? `
                    <button class="btn btn-primary" type="button" data-action="approve-order" data-id="${escapeHtml(item.id)}"><i data-lucide="check"></i> Approve</button>
                    <button class="btn btn-danger" type="button" data-action="reject-order" data-id="${escapeHtml(item.id)}"><i data-lucide="x"></i> Reject</button>
                  ` : ''}
                </div>
              </div>
            </div>
          `;
        }).join('') : `<div style="grid-column: 1/-1;"><div class="empty-state">${itemsWithScreenshot.length ? 'No screenshots match the current filters.' : 'No uploaded screenshots found.'}</div></div>`}
      </div>
    </div>
  `;
}

const MEDIA_FOLDER_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'products', label: 'Products' },
  { value: 'categories', label: 'Categories' },
  { value: 'hero', label: 'Hero' },
  { value: 'banner', label: 'Banner' },
  { value: 'logos', label: 'Logos' },
  { value: 'other', label: 'Other' },
];

const MEDIA_TYPE_FILTERS = [
  { value: 'all', label: 'All Types' },
  { value: 'image', label: 'Images' },
  { value: 'video', label: 'Videos' },
  { value: 'other', label: 'Other' },
];

const MEDIA_SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' },
  { value: 'name-asc', label: 'Name A-Z' },
  { value: 'name-desc', label: 'Name Z-A' },
];

function mediaBucketKey(item = {}) {
  const raw = String(item.folder || item.path || '').toLowerCase();
  if (raw.includes('product')) return 'products';
  if (raw.includes('category')) return 'categories';
  if (raw.includes('hero')) return 'hero';
  if (raw.includes('banner')) return 'banner';
  if (raw.includes('logo')) return 'logos';
  return 'other';
}

function mediaBucketLabel(key) {
  return MEDIA_FOLDER_FILTERS.find((item) => item.value === key)?.label || 'Other';
}

function mediaKind(item = {}) {
  return mediaTypeFromPath(item.path || item.publicUrl || item.name || '');
}

function mediaSortValue(item = {}) {
  return Number(item.updatedAt || item.createdAt || 0);
}

function filterMediaItems(items = []) {
  const search = String(ui.media.search || '').trim().toLowerCase();
  const folder = String(ui.media.folder || 'all');
  const type = String(ui.media.type || 'all');
  return items.filter((item) => {
    const name = String(item.name || mediaFileName(item.path || item.publicUrl || '') || '').toLowerCase();
    const path = String(item.path || '').toLowerCase();
    const publicUrl = String(item.publicUrl || '').toLowerCase();
    const bucket = mediaBucketKey(item);
    const kind = mediaKind(item);
    if (folder !== 'all' && bucket !== folder) return false;
    if (type !== 'all' && kind !== type) return false;
    if (!search) return true;
    return name.includes(search) || path.includes(search) || publicUrl.includes(search) || String(item.folder || '').toLowerCase().includes(search);
  });
}

function sortMediaItems(items = []) {
  const sort = String(ui.media.sort || 'newest');
  const compareName = (a, b) => String(a.name || a.path || '').localeCompare(String(b.name || b.path || ''), undefined, { sensitivity: 'base' });
  return [...items].sort((a, b) => {
    if (sort === 'oldest') return mediaSortValue(a) - mediaSortValue(b) || compareName(a, b);
    if (sort === 'name-asc') return compareName(a, b) || (mediaSortValue(b) - mediaSortValue(a));
    if (sort === 'name-desc') return compareName(b, a) || (mediaSortValue(b) - mediaSortValue(a));
    return mediaSortValue(b) - mediaSortValue(a) || compareName(a, b);
  });
}

function mediaStats(items = []) {
  const folders = new Set();
  const kinds = { image: 0, video: 0, other: 0 };
  let latest = 0;
  items.forEach((item) => {
    folders.add(mediaBucketKey(item));
    kinds[mediaKind(item)] = (kinds[mediaKind(item)] || 0) + 1;
    latest = Math.max(latest, mediaSortValue(item));
  });
  return {
    count: items.length,
    folders: folders.size,
    images: kinds.image || 0,
    videos: kinds.video || 0,
    other: kinds.other || 0,
    latest,
  };
}

function renderMediaStatus(message = '') {
  return `
    <div class="media-status ${message ? 'visible' : ''}" data-role="media-status">
      ${escapeHtml(message || '')}
    </div>
  `;
}

function setMediaStatus(message = '') {
  ui.media.status = message || '';
  const el = document.querySelector('[data-role="media-status"]');
  if (el) el.textContent = ui.media.status;
}

function renderMediaPreviewModal(item = {}) {
  const src = resolveMediaSource(item.publicUrl || item.path || '');
  const bucket = mediaBucketLabel(mediaBucketKey(item));
  return `
    <div class="panel-head media-preview-head">
      <div>
        <h2 class="section-title">${escapeHtml(item.name || mediaFileName(item.path || item.publicUrl || '') || 'Media Preview')}</h2>
        <p class="section-subtitle">${escapeHtml(bucket)} · ${escapeHtml(mediaKind(item))} · ${escapeHtml(formatDateTime(item.updatedAt || item.createdAt))}</p>
      </div>
      <button class="btn btn-ghost" data-close-modal type="button"><i data-lucide="x"></i></button>
    </div>
    <div class="media-preview-modal">
      <div class="media-preview-figure">
        ${src ? `<img src="${escapeHtml(src)}" alt="${escapeHtml(item.name || 'Media preview')}" loading="eager" />` : '<div class="preview-fallback">No preview available</div>'}
      </div>
      <div class="media-preview-meta">
        <div class="media-preview-pill-row">
          <span class="badge">${escapeHtml(bucket)}</span>
          <span class="badge">${escapeHtml(mediaKind(item))}</span>
        </div>
        <div class="media-preview-details">
          <div><span>Filename</span><strong>${escapeHtml(item.name || mediaFileName(item.path || item.publicUrl || '') || '-')}</strong></div>
          <div><span>Folder</span><strong>${escapeHtml(item.folder || bucket)}</strong></div>
          <div class="full"><span>Path</span><strong>${escapeHtml(item.path || '-')}</strong></div>
          <div class="full"><span>Public URL</span><strong class="media-url">${escapeHtml(item.publicUrl || '-')}</strong></div>
        </div>
        <div class="toolbar media-preview-actions">
          <button class="btn btn-ghost" data-action="copy-url" data-url="${escapeHtml(item.publicUrl || '')}" type="button"><i data-lucide="copy"></i> Copy URL</button>
          <button class="btn btn-danger" data-action="delete-media" data-path="${escapeHtml(item.path || '')}" data-id="${escapeHtml(item.id || '')}" type="button"><i data-lucide="trash-2"></i> Delete</button>
        </div>
      </div>
    </div>
  `;
}

function renderMediaCard(item = {}) {
  const src = resolveMediaSource(item.publicUrl || item.path || '');
  const bucketKey = mediaBucketKey(item);
  const type = mediaKind(item);
  return `
    <article class="media-card glass">
      <button class="media-thumb media-thumb-button" type="button" data-action="preview-media" data-id="${escapeHtml(item.id || '')}">
        <span class="media-thumb-overlay">Open Preview</span>
        ${mediaPreview(item) || '<div class="preview-fallback">No preview</div>'}
      </button>
      <div class="media-body">
        <div class="media-card-head">
          <strong title="${escapeHtml(item.name || item.path || 'Media')}">${escapeHtml(item.name || item.path || 'Media')}</strong>
          <span class="badge">${escapeHtml(type)}</span>
        </div>
        <div class="media-card-meta">
          <span>${escapeHtml(mediaBucketLabel(bucketKey))}</span>
          <span>${escapeHtml(formatDateTime(item.updatedAt || item.createdAt))}</span>
        </div>
        <div class="media-path">${escapeHtml(item.path || item.folder || '-')}</div>
        <div class="toolbar media-card-actions">
          <button class="btn btn-ghost btn-sm" data-action="preview-media" data-id="${escapeHtml(item.id || '')}" type="button">Preview</button>
          <button class="btn btn-ghost btn-sm" data-action="copy-url" data-url="${escapeHtml(item.publicUrl || '')}" type="button">Copy URL</button>
          <button class="btn btn-danger btn-sm" data-action="delete-media" data-path="${escapeHtml(item.path || '')}" data-id="${escapeHtml(item.id || '')}" type="button">Delete</button>
        </div>
      </div>
    </article>
  `;
}

function renderMediaList(items = []) {
  return `
    <div class="media-table">
      <div class="media-table-head">
        <span>Preview</span>
        <span>Filename</span>
        <span>Folder</span>
        <span>Type</span>
        <span>Date</span>
        <span>Actions</span>
      </div>
      ${items.length ? items.map((item) => `
        <div class="media-table-row">
          <button class="media-table-preview" type="button" data-action="preview-media" data-id="${escapeHtml(item.id || '')}">
            ${mediaPreview(item) || '<div class="preview-fallback">No preview</div>'}
          </button>
          <div class="media-table-name">
            <strong>${escapeHtml(item.name || item.path || 'Media')}</strong>
            <span>${escapeHtml(item.path || '-')}</span>
          </div>
          <div>${escapeHtml(mediaBucketLabel(mediaBucketKey(item)))}</div>
          <div><span class="badge">${escapeHtml(mediaKind(item))}</span></div>
          <div>${escapeHtml(formatDateTime(item.updatedAt || item.createdAt))}</div>
          <div class="toolbar media-table-actions">
            <button class="btn btn-ghost btn-sm" data-action="preview-media" data-id="${escapeHtml(item.id || '')}" type="button">Preview</button>
            <button class="btn btn-ghost btn-sm" data-action="copy-url" data-url="${escapeHtml(item.publicUrl || '')}" type="button">Copy URL</button>
            <button class="btn btn-danger btn-sm" data-action="delete-media" data-path="${escapeHtml(item.path || '')}" data-id="${escapeHtml(item.id || '')}" type="button">Delete</button>
          </div>
        </div>
      `).join('') : '<div class="empty-state media-empty">No media matched your filters.</div>'}
    </div>
  `;
}

function renderMediaView(data) {
  const rawItems = Array.isArray(data) ? data : Object.entries(data || {}).map(([id, item]) => ({ id, ...(item || {}) }));
  const filteredItems = sortMediaItems(filterMediaItems(rawItems));
  const stats = mediaStats(rawItems);
  const folderCounts = MEDIA_FOLDER_FILTERS
    .filter((option) => option.value !== 'all')
    .map((option) => ({
      ...option,
      count: rawItems.filter((item) => mediaBucketKey(item) === option.value).length,
    }));
  return `
    <div class="page active">
      <section class="panel glass media-shell">
        <div class="panel-head media-head">
          <div>
            <div class="section-kicker">Media Library</div>
            <h2 class="section-title">Media</h2>
            <p class="section-subtitle">Manage files stored in the Supabase <strong>media</strong> bucket.</p>
          </div>
          <div class="toolbar media-actions">
            <button class="btn btn-success" data-action="sync-site-media" type="button"><i data-lucide="image-plus"></i> Import Site Images</button>
            <button class="btn btn-primary" data-action="upload-media" type="button"><i data-lucide="upload"></i> Upload</button>
          </div>
        </div>
        <div class="media-summary-grid">
          <div class="media-summary-card">
            <span>Total Assets</span>
            <strong>${escapeHtml(String(stats.count))}</strong>
          </div>
          <div class="media-summary-card">
            <span>Bucket</span>
            <strong>media</strong>
          </div>
          <div class="media-summary-card">
            <span>Folders</span>
            <strong>${escapeHtml(String(stats.folders))}</strong>
          </div>
          <div class="media-summary-card">
            <span>Images</span>
            <strong>${escapeHtml(String(stats.images))}</strong>
          </div>
          <div class="media-summary-card">
            <span>Last Updated</span>
            <strong>${stats.latest ? escapeHtml(formatDateTime(stats.latest)) : '—'}</strong>
          </div>
        </div>
        <div class="media-filter-panel glass">
          <div class="media-filter-row">
            <div class="field media-search-field">
              <label for="mediaSearch">Search</label>
              <input class="input" id="mediaSearch" type="search" placeholder="Search filename or path" value="${escapeHtml(ui.media.search || '')}" />
            </div>
            <div class="field">
              <label for="mediaFolderFilter">Folder</label>
              <select class="select" id="mediaFolderFilter">
                ${MEDIA_FOLDER_FILTERS.map((option) => `
                  <option value="${escapeHtml(option.value)}" ${ui.media.folder === option.value ? 'selected' : ''}>
                    ${escapeHtml(option.label)}${option.value !== 'all' ? ` (${folderCounts.find((item) => item.value === option.value)?.count || 0})` : ''}
                  </option>
                `).join('')}
              </select>
            </div>
            <div class="field">
              <label for="mediaTypeFilter">File Type</label>
              <select class="select" id="mediaTypeFilter">
                ${MEDIA_TYPE_FILTERS.map((option) => `<option value="${escapeHtml(option.value)}" ${ui.media.type === option.value ? 'selected' : ''}>${escapeHtml(option.label)}</option>`).join('')}
              </select>
            </div>
            <div class="field">
              <label for="mediaSortFilter">Sort</label>
              <select class="select" id="mediaSortFilter">
                ${MEDIA_SORT_OPTIONS.map((option) => `<option value="${escapeHtml(option.value)}" ${ui.media.sort === option.value ? 'selected' : ''}>${escapeHtml(option.label)}</option>`).join('')}
              </select>
            </div>
            <div class="field">
              <label>View</label>
              <div class="view-switch media-view-switch">
                <button class="view-switch-btn ${ui.media.view === 'grid' ? 'active' : ''}" type="button" data-action="set-media-view" data-view="grid">Grid</button>
                <button class="view-switch-btn ${ui.media.view === 'list' ? 'active' : ''}" type="button" data-action="set-media-view" data-view="list">List</button>
              </div>
            </div>
          </div>
        </div>
        ${renderMediaStatus(ui.media.status || '')}
      </section>
      <section class="panel glass media-results-panel">
        <div class="panel-head media-results-head">
          <div>
            <h3>${escapeHtml(ui.media.view === 'list' ? 'List View' : 'Grid View')}</h3>
            <p class="section-subtitle">${escapeHtml(String(filteredItems.length))} assets shown from ${escapeHtml(String(stats.count))} total.</p>
          </div>
          <div class="toolbar media-results-actions">
            <span class="badge">${escapeHtml(String(stats.count))} assets</span>
            <span class="badge">${escapeHtml(String(stats.folders))} folders</span>
          </div>
        </div>
        ${filteredItems.length ? (
          ui.media.view === 'list'
            ? renderMediaList(filteredItems)
            : `<div class="media-grid">${filteredItems.map((item) => renderMediaCard(item)).join('')}</div>`
        ) : `
          <div class="empty-state media-empty">
            <h3>No media matched your filters.</h3>
            <p>Try clearing the search or switching folder/type filters.</p>
          </div>
        `}
      </section>
    </div>
  `;
}

function renderOrdersView(data) {
  const items = Object.entries(data || {}).map(([id, item]) => ({ id, ...(item || {}) })).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  const filtered = ui.search ? items.filter((item) => JSON.stringify(item).toLowerCase().includes(ui.search.toLowerCase())) : items;
  return `
    <div class="page active">
      <section class="panel glass">
        <div class="panel-head">
          <div>
            <h2 class="section-title">Orders</h2>
            <p class="section-subtitle">Review, approve, reject, or delete incoming order records.</p>
          </div>
        </div>
        <div class="table-wrap">
          <table class="table">
            <thead>
              <tr>
                <th>Package</th>
                <th>Amount</th>
                <th>Method</th>
                <th>Status</th>
                <th>Time</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${filtered.length ? filtered.map((item) => `
                <tr>
                  <td>${escapeHtml(item.package || '-')}</td>
                  <td>${escapeHtml(item.amount || '-')}</td>
                  <td>${escapeHtml(item.method || '-')}</td>
                  <td>${collectionRowBadge(item)}</td>
                  <td>${escapeHtml(formatDateTime(item.timestamp))}</td>
                  <td>
                    <div class="item-actions">
                      <button class="icon-btn" data-action="approve-order" data-id="${escapeHtml(item.id)}"><i data-lucide="check-circle"></i> Approve</button>
                      <button class="icon-btn" data-action="reject-order" data-id="${escapeHtml(item.id)}"><i data-lucide="x-circle"></i> Reject</button>
                      <button class="icon-btn" data-action="view-order" data-id="${escapeHtml(item.id)}"><i data-lucide="eye"></i> View</button>
                      <button class="icon-btn" data-action="delete-order" data-id="${escapeHtml(item.id)}"><i data-lucide="trash-2"></i> Delete</button>
                    </div>
                  </td>
                </tr>
              `).join('') : '<tr><td colspan="6"><div class="empty-state">No orders found.</div></td></tr>'}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  `;
}

function renderAnalyticsView(data) {
  const summary = summarizeDashboard();
  const topProducts = buildTopProducts(summary).filter((item) => item.clicks > 0);
  return `
    <div class="page active">
      <section class="panel glass analytics-page-shell">
        <div class="panel-head analytics-page-head">
          <div>
            <h2 class="section-title">Analytics</h2>
            <p class="section-subtitle">Live visitor, click, and order insights from the selected period.</p>
          </div>
          <div class="toolbar analytics-toolbar">
            ${renderRangeSwitch()}
            <button class="btn btn-ghost" data-action="refresh" type="button"><i data-lucide="refresh-cw"></i> Refresh</button>
          </div>
        </div>
        ${renderAnalyticsKpis(summary, topProducts[0] || null)}
        <div class="analytics-chart-grid">
          ${renderAnalyticsChart({
            id: 'visitors',
            title: 'Visitor Trend',
            copy: 'Visitors over time for the selected range.',
            series: summary.visitorSeries,
            tone: 'primary',
            metricLabel: 'visitors',
          })}
          ${renderAnalyticsChart({
            id: 'clicks',
            title: 'Order Click Trend',
            copy: 'Product clicks over time for the selected range.',
            series: summary.clickSeries,
            tone: 'secondary',
            metricLabel: 'order clicks',
          })}
        </div>
        <div class="analytics-products-panel panel glass">
          <div class="panel-head analytics-products-head">
            <div>
              <h3>Top Clicked Products</h3>
              <p class="section-subtitle">Ranked by live click activity in the selected period.</p>
            </div>
            <div class="analytics-products-meta">
              <span class="badge">${escapeHtml(summary.range.toUpperCase())}</span>
              <span class="section-subtitle">${escapeHtml(formatNumber(summary.clicks))} total clicks</span>
            </div>
          </div>
          ${renderTopProductsAnalytics(topProducts, summary.clicks)}
        </div>
      </section>
    </div>
  `;
}

function renderView(data) {
  try {
    ui.data = data;
    sideNav.innerHTML = navMarkup();
    const current = ui.route;
    let html = '';
    if (current === 'dashboard') html = renderDashboard(data);
    else if (current === 'catalog' || current === 'products' || current === 'categories') html = renderCatalogView(data);
    else if (current === 'faq') html = renderCollection('faq', collectionSchemas.faq, listCollection('faq'));
    else if (current === 'testimonials') html = renderCollection('testimonials', collectionSchemas.testimonials, listCollection('testimonials'));
    else if (current === 'media') html = renderMediaView(listCollection('media'));
    else if (current === 'settings') html = renderSettingsManagementView(data.settings || {}, data || {});
    else if (current === 'payment') html = renderPaymentManagementView(data.payment || {}, data || {});
    else if (current === 'orders') html = renderOrdersManagementView(data.orders || {}, data || {});
    else if (current === 'screenshots') html = renderScreenshotsGalleryView(data.orders || {}, data || {});
    else if (current === 'analytics') html = renderAnalyticsView(data);
    else if (current === 'hero') html = renderSingleEditorPage('hero', singleEditors.hero, data.hero || {});
    else if (current === 'banner') html = renderSingleEditorPage('banner', singleEditors.banner, data.banner || {});
    else html = renderDashboard(data);
    viewRoot.innerHTML = html;
    if (window.lucide) lucide.createIcons();
    if (current === 'analytics') mountAnalyticsCharts();
    notifyCount.textContent = String(recentActivity(12).length);
  } catch (error) {
    viewRoot.innerHTML = `
      <div class="page active">
        <section class="panel glass">
          <h2 class="section-title">Render Error</h2>
          <p class="section-subtitle">${escapeHtml(error?.message || 'Unknown error')}</p>
        </section>
      </div>
    `;
  }
}

let _searchDebounceTimer = null;
function softUpdateCatalog() {
  // Update only catalog results + pagination without destroying the whole view
  // This keeps search input focused and cursor position intact
  const resultsEl = document.getElementById('catalogResultsGrid');
  const paginationEl = document.querySelector('.catalog-pagination');
  if (!resultsEl) {
    // Fallback: full render if not in catalog view
    renderView(ui.data || {});
    return;
  }
  const meta = getCatalogMeta();
  const nodeData = listCollection(meta.node);
  const items = filterItems(nodeData, meta.node);
  const pageSize = Math.max(4, Number(ui.catalogPageSize) || 8);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const page = Math.min(Math.max(1, ui.page), totalPages);
  const paged = items.slice((page - 1) * pageSize, page * pageSize);
  ui.page = page;
  const node = meta.node;
  const itemLabel = node === 'categories' ? 'categories' : 'products';
  const itemSingular = meta.schema?.label?.toLowerCase() || 'item';
  const isCatalog = node === 'products' || node === 'categories';

  if (paged.length) {
    resultsEl.className = `catalog-results ${ui.catalogView}`;
    resultsEl.innerHTML = paged.map((item) => (node === 'categories'
      ? renderCatalogCategoryCard(item, node)
      : renderCatalogProductCard(item, node))).join('');
  } else {
    resultsEl.className = `catalog-results ${ui.catalogView}`;
    resultsEl.innerHTML = `
      <div class="catalog-empty glass">
        <div class="catalog-empty-art">
          <div class="orb orb-a"></div>
          <div class="orb orb-b"></div>
          <i data-lucide="sparkles"></i>
        </div>
        <h3>No ${escapeHtml(itemLabel)} matched your search.</h3>
        <p>Try a different search term or reset filters.</p>
      </div>
    `;
  }
  if (paginationEl) {
    const visibleStart = items.length ? ((page - 1) * pageSize) + 1 : 0;
    const visibleEnd = Math.min(items.length, page * pageSize);
    const totalSelected = ui.selection.size;
    paginationEl.innerHTML = `
      <span class="section-subtitle">Showing ${escapeHtml(String(visibleStart))}-${escapeHtml(String(visibleEnd))} of ${escapeHtml(String(items.length))} ${escapeHtml(itemLabel)}${totalSelected ? ` · ${escapeHtml(String(totalSelected))} selected` : ''}</span>
      <div class="toolbar catalog-pagination-actions">
        <span class="chip">Rows ${escapeHtml(String(pageSize))}</span>
        <button class="btn btn-ghost" data-page="prev"><i data-lucide="chevron-left"></i></button>
        <span class="chip">Page ${escapeHtml(String(page))} / ${escapeHtml(String(totalPages))}</span>
        <button class="btn btn-ghost" data-page="next"><i data-lucide="chevron-right"></i></button>
      </div>
    `;
  }
  if (window.lucide) lucide.createIcons();
}

function applyRoute(path) {
  if (path === 'products') {
    ui.route = 'catalog';
    ui.catalogTab = 'products';
  } else if (path === 'categories') {
    ui.route = 'catalog';
    ui.catalogTab = 'categories';
  } else {
    ui.route = NAV_ITEMS.some((item) => item.key === path) ? path : 'dashboard';
  }
  ui.page = 1;
  renderView(ui.data || {});
}

function syncTopbar(user) {
  userName.textContent = user.displayName || 'Admin';
  userEmail.textContent = user.email || 'connected';
  userAvatar.textContent = (user.email || 'A').slice(0, 1).toUpperCase();
}

function initRouteHandling() {
  const updateRoute = () => {
    const path = window.location.hash.replace(/^#\/?/, '') || 'dashboard';
    applyRoute(path);
    if (!isMobileViewport()) closeSidebar();
  };
  window.addEventListener('hashchange', updateRoute);
  window.addEventListener('resize', () => {
    if (!isMobileViewport()) closeSidebar();
  });
  updateRoute();
}

function attachGlobalHandlers() {
  document.getElementById('themeBtn')?.addEventListener('click', toggleTheme);
  document.getElementById('sidebarThemeBtn')?.addEventListener('click', toggleTheme);
  document.getElementById('logoutBtn')?.addEventListener('click', logout);
  document.getElementById('sidebarLogoutBtn')?.addEventListener('click', logout);
  document.getElementById('mobileMenuBtn')?.addEventListener('click', toggleSidebar);
  sidebarCloseBtn?.addEventListener('click', closeSidebar);
  sidebarOverlay?.addEventListener('click', closeSidebar);
  notifyBtn?.addEventListener('click', () => {
    ui.notificationsOpen = !ui.notificationsOpen;
    openModal(renderNotificationsPanel());
  });
  commandInput?.addEventListener('input', (event) => {
    ui.commandSearch = event.target.value;
    if (paletteBackdrop.classList.contains('open')) renderPalette();
  });
  commandInput?.addEventListener('focus', openPalette);
  document.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      openPalette();
    }
    if (event.key === 'Escape') {
      closeSidebar();
      closeModal();
      closePalette();
    }
  });
  document.addEventListener('click', (event) => {
    const close = event.target.closest('[data-close-modal]');
    if (close) {
      closeModal();
      return;
    }
    const paletteClose = event.target.closest('[data-close-palette]');
    if (paletteClose) {
      closePalette();
    }
  });
  modalBackdrop.addEventListener('click', (event) => {
    if (event.target === modalBackdrop) closeModal();
  });
  paletteBackdrop.addEventListener('click', (event) => {
    if (event.target === paletteBackdrop) closePalette();
  });
  document.addEventListener('click', async (event) => {
    const routeBtn = event.target.closest('[data-route]');
    if (routeBtn) {
      event.preventDefault();
      const route = routeBtn.dataset.route;
      window.location.hash = `#/${route}`;
      applyRoute(route);
      if (isMobileViewport()) closeSidebar();
      return;
    }
    const actionBtn = event.target.closest('[data-action]');
    if (!actionBtn) return;
    const action = actionBtn.dataset.action;
    const node = actionBtn.dataset.node;
    const id = actionBtn.dataset.id;
    const target = actionBtn.dataset.target;
    closeCatalogActionMenus();
    if (action === 'goto') {
      const route = actionBtn.dataset.route;
      window.location.hash = `#/${route}`;
      applyRoute(route);
      return;
    }
    if (action === 'refresh') {
      renderView(ui.data || {});
      showToast('Dashboard refreshed');
      return;
    }
    if (action === 'set-range') {
      ui.dashboardRange = actionBtn.dataset.range || 'day';
      renderView(ui.data || {});
      return;
    }
    if (action === 'set-dashboard-metric') {
      ui.dashboardMetric = actionBtn.dataset.metric || 'visitors';
      renderView(ui.data || {});
      return;
    }
    if (action === 'toggle-catalog-filters') {
      ui.catalogFiltersOpen = !ui.catalogFiltersOpen;
      persistCatalogPrefs();
      renderView(ui.data || {});
      return;
    }
    if (action === 'catalog-reset-filters') {
      resetCatalogFilters();
      return;
    }
    if (action === 'catalog-apply-filters') {
      ui.catalogFiltersOpen = false;
      persistCatalogPrefs();
      renderView(ui.data || {});
      return;
    }
    if (action === 'open-notifications') {
      openModal(renderNotificationsPanel());
      return;
    }
    if (action === 'sync-site-catalog') {
      // DISABLED: Sync was overwriting Firebase data from HTML scraping, reverting admin changes.
      showToast('Sync disabled to prevent data loss. Manage products directly in the catalog.', 'warning');
      return;
    }
    if (action === 'sync-site-media') {
      await syncCurrentSiteMedia();
      return;
    }
    if (action === 'add') {
      openRecordEditor(node, collectionSchemas[node]);
      return;
    }
    if (action === 'switch-catalog') {
      ui.route = 'catalog';
      ui.catalogTab = actionBtn.dataset.tab || 'products';
      clearSelection();
      ui.page = 1;
      persistCatalogPrefs();
      renderView(ui.data || {});
      return;
    }
    if (action === 'set-catalog-view') {
      ui.catalogView = actionBtn.dataset.view === 'list' ? 'list' : 'grid';
      persistCatalogPrefs();
      renderView(ui.data || {});
      return;
    }
    if (action === 'edit') {
      openRecordEditor(node, collectionSchemas[node], getItem(node, id) || {});
      return;
    }
    if (action === 'preview') {
      openCatalogPreview(node, id);
      return;
    }
    if (action === 'view-products' && node === 'categories') {
      const category = getItem('categories', id);
      if (category) openCategoryProducts(category);
      return;
    }
    if (action === 'share-product') {
      openShareModal(node, id);
      return;
    }
    if (action === 'duplicate') {
      await duplicateRecord(node, id);
      showToast('Record duplicated');
      return;
    }
    if (action === 'toggle') {
      const record = getItem(node, id);
      await updateRecord(node, id, { status: record?.status === 'hidden' ? 'active' : 'hidden' });
      showToast('Visibility updated');
      return;
    }
    if (action === 'delete') {
      if (confirm('Delete this record?')) {
        await deleteRecord(node, id);
        showToast('Record deleted');
      }
      return;
    }
    if (action === 'move-up' && node === 'categories') {
      await reorderCategory(id, -1);
      return;
    }
    if (action === 'move-down' && node === 'categories') {
      await reorderCategory(id, 1);
      return;
    }
    if (action === 'edit-single') {
      const fallbackPayment = node === 'payment' ? {
        recommendedMethod: 'binancepay',
        upiId: 'Ritikane@ptyes',
        qrImage: '',
        telegramUrl: 'https://t.me/TRUSTED_BROTHER1234',
        telegramChannel: 'https://t.me/TRUSTED_BROTHER1234',
        bep20Address: '0x7186b11f8fD49fe472Af49Cda490f168e09Fef0a',
        ethAddress: '0x7186b11f8fD49fe472Af49Cda490f168e09Fef0a',
        binanceId: '969887942',
        binanceGiftCardUrl: 'https://www.g2a.com/binance-gift-card-205-usdt-key-i10000337768061',
        paypalLink: 'https://paypal.me/Johnguzman456',
        instructions: 'Pay exact order amount and submit screenshot for instant activation.',
        status: 'active',
      } : {};
      const currentVal = {
        ...fallbackPayment,
        ...(ui.data?.[node] || {}),
      };
      openSingleEditor(node, singleEditors[node], currentVal);
      return;
    }
    if (action === 'set-media-view') {
      ui.media.view = actionBtn.dataset.view === 'list' ? 'list' : 'grid';
      renderView(ui.data || {});
      return;
    }
    if (action === 'upload-media') {
      openMediaUpload();
      return;
    }
    if (action === 'preview-media') {
      const media = getItem('media', id) || listCollection('media').find((item) => item.id === id) || {};
      openModal(renderMediaPreviewModal(media));
      return;
    }
    if (action === 'copy-url') {
      await navigator.clipboard.writeText(actionBtn.dataset.url || '');
      showToast('Public URL copied');
      return;
    }
    if (action === 'select-visible') {
      const currentNode = ui.catalogTab === 'categories' ? 'categories' : 'products';
      const visibleItems = filterItems(getCatalogItems(currentNode), currentNode);
      const pageSize = Math.max(4, Number(ui.catalogPageSize) || 8);
      const page = Math.min(Math.max(1, ui.page), Math.max(1, Math.ceil(visibleItems.length / pageSize)));
      const pageItems = visibleItems.slice((page - 1) * pageSize, page * pageSize).map((item) => item.id);
      const allSelected = pageItems.length && pageItems.every((itemId) => ui.selection.has(itemId));
      if (allSelected) {
        selectSelection(pageItems, false);
      } else {
        selectSelection(pageItems, true);
      }
      renderView(ui.data || {});
      return;
    }
    if (action === 'bulk') {
      await applyBulkAction(actionBtn.dataset.bulkAction, node || (ui.catalogTab === 'categories' ? 'categories' : 'products'), ui.selection);
      return;
    }
    if (action === 'delete-media') {
      if (confirm('Delete uploaded media from Supabase Storage?')) {
        await deletePublicAsset(actionBtn.dataset.path || '');
        await deleteRecord('media', actionBtn.dataset.id);
        showToast('Media deleted');
        setMediaStatus('Media deleted.');
        closeModal();
        renderView(ui.data || {});
      }
      return;
    }
    if (action === 'add-payment-method') {
      openModal(renderPaymentMethodModal({}, false));
      return;
    }
    if (action === 'edit-payment-method') {
      const currentPayment = ui.data?.payment || {};
      const methods = getStandardPaymentMethods(currentPayment);
      const targetMethod = methods.find((m) => m.id === id) || { id };
      openModal(renderPaymentMethodModal(targetMethod, true));
      return;
    }
    if (action === 'toggle-payment-method') {
      const currentPayment = { ...(ui.data?.payment || {}) };
      const customMethods = { ...(currentPayment.customMethods || {}) };
      let disabledMethods = Array.isArray(currentPayment.disabledMethods) ? [...currentPayment.disabledMethods] : [];

      if (customMethods[id]) {
        customMethods[id].status = customMethods[id].status === 'disabled' ? 'active' : 'disabled';
        currentPayment.customMethods = customMethods;
      } else {
        if (disabledMethods.includes(id)) {
          disabledMethods = disabledMethods.filter((mId) => mId !== id);
        } else {
          disabledMethods.push(id);
        }
      }
      currentPayment.disabledMethods = disabledMethods;

      await updateRecord('payment', null, currentPayment);
      showToast('Payment method visibility updated live');
      return;
    }
    if (action === 'set-recommended-method') {
      const currentPayment = { ...(ui.data?.payment || {}) };
      currentPayment.recommendedMethod = id;
      if (Array.isArray(currentPayment.disabledMethods)) {
        currentPayment.disabledMethods = currentPayment.disabledMethods.filter((mId) => mId !== id);
      }
      await updateRecord('payment', null, currentPayment);
      showToast('⭐ Recommended payment method updated live');
      return;
    }
    if (action === 'delete-payment-method') {
      if (confirm('Are you sure you want to remove this payment method?')) {
        const currentPayment = { ...(ui.data?.payment || {}) };
        const customMethods = { ...(currentPayment.customMethods || {}) };
        if (customMethods[id]) {
          delete customMethods[id];
          currentPayment.customMethods = customMethods;
        } else {
          let disabledMethods = Array.isArray(currentPayment.disabledMethods) ? [...currentPayment.disabledMethods] : [];
          if (!disabledMethods.includes(id)) disabledMethods.push(id);
          currentPayment.disabledMethods = disabledMethods;
        }
        await updateRecord('payment', null, currentPayment);
        showToast('Payment method removed');
      }
      return;
    }
    if (action === 'copy-payment-val') {
      const val = actionBtn.dataset.val;
      if (val && val !== 'Not set') {
        await navigator.clipboard.writeText(val);
        showToast('Payment credential copied to clipboard');
      }
      return;
    }
    if (action === 'view-order' || action === 'open-order') {
      const order = getItem('orders', id);
      openModal(renderOrderDetailsModal(order || {}));
      return;
    }
    if (action === 'export-admin-snapshot') {
      const snapshot = buildAdminSnapshot(ui.data || {});
      downloadTextFile(`admin-snapshot-${new Date().toISOString().slice(0, 10)}.json`, `${JSON.stringify(snapshot, null, 2)}\n`);
      showToast('Snapshot exported');
      return;
    }
    if (action === 'import-admin-snapshot') {
      openAdminSnapshotImportModal();
      return;
    }
    if (action === 'approve-order') {
      await updateRecord('orders', id, {
        status: 'approved',
        orderStatus: 'approved',
        paymentStatus: 'approved',
        reviewedAt: Date.now(),
        reviewedBy: userEmail?.textContent || userName?.textContent || APP_CONFIG.appName,
      });
      showToast('Order approved');
      return;
    }
    if (action === 'reject-order') {
      await updateRecord('orders', id, {
        status: 'rejected',
        orderStatus: 'rejected',
        paymentStatus: 'rejected',
        reviewedAt: Date.now(),
        reviewedBy: userEmail?.textContent || userName?.textContent || APP_CONFIG.appName,
      });
      showToast('Order rejected');
      return;
    }
    if (action === 'delete-order') {
      if (confirm('Delete this order?')) {
        await deleteRecord('orders', id);
        showToast('Order deleted');
      }
      return;
    }
    if (action === 'quick') {
      if (target === 'products' || target === 'categories') {
        window.location.hash = '#/catalog';
        ui.catalogTab = target;
        ui.route = 'catalog';
        ui.page = 1;
        renderView(ui.data || {});
        setTimeout(() => openRecordEditor(target, collectionSchemas[target]), 50);
      } else if (target === 'media') {
        window.location.hash = '#/media';
        ui.route = 'media';
        ui.page = 1;
        renderView(ui.data || {});
        setTimeout(openMediaUpload, 50);
      } else {
        window.location.hash = `#/${target}`;
        applyRoute(target);
      }
      return;
    }
    if (action === 'palette') {
      const next = actionBtn.dataset.paletteAction;
      if (next.startsWith('goto:')) window.location.hash = `#/${next.split(':')[1]}`;
      if (next === 'logout') logout();
    }
  });

  document.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.target;
    if (form.id === 'paymentMethodForm') {
      const methodId = form.dataset.methodId || (`custom_${Date.now()}`);
      const isCustom = form.dataset.isCustom === 'true' || methodId.startsWith('custom_');
      
      const formData = new FormData(form);
      const name = (formData.get('name') || '').trim();
      const type = (formData.get('type') || 'crypto').trim();
      const identifier = (formData.get('identifier') || '').trim();
      const tag = (formData.get('tag') || 'ACTIVE').trim().toUpperCase();
      const qrImage = (formData.get('qrImage') || '').trim();
      const sub = (formData.get('sub') || '').trim();
      const instructions = (formData.get('instructions') || '').trim();
      const status = formData.get('status') || 'active';
      const isRecommended = form.querySelector('#pmIsRecommended')?.checked || false;

      const currentPayment = { ...(ui.data?.payment || {}) };
      const customMethods = { ...(currentPayment.customMethods || {}) };
      let disabledMethods = Array.isArray(currentPayment.disabledMethods) ? [...currentPayment.disabledMethods] : [];

      if (status === 'disabled') {
        if (!disabledMethods.includes(methodId)) disabledMethods.push(methodId);
      } else {
        disabledMethods = disabledMethods.filter((id) => id !== methodId);
      }

      const updatedPayment = { ...currentPayment, disabledMethods };

      if (isRecommended) {
        updatedPayment.recommendedMethod = methodId;
      }

      if (isCustom || !['binancepay', 'upi', 'bep20', 'eth', 'paypal', 'giftcard'].includes(methodId)) {
        customMethods[methodId] = {
          id: methodId,
          name,
          type,
          identifier,
          tag,
          qrImage,
          sub,
          instructions,
          status,
          updatedAt: Date.now(),
        };
        updatedPayment.customMethods = customMethods;
      } else {
        if (methodId === 'binancepay') updatedPayment.binanceId = identifier;
        else if (methodId === 'upi') {
          updatedPayment.upiId = identifier;
          if (qrImage) updatedPayment.qrImage = qrImage;
        } else if (methodId === 'bep20') updatedPayment.bep20Address = identifier;
        else if (methodId === 'eth') updatedPayment.ethAddress = identifier;
        else if (methodId === 'paypal') updatedPayment.paypalLink = identifier;
        else if (methodId === 'giftcard') updatedPayment.binanceGiftCardUrl = identifier;
      }

      try {
        await updateRecord('payment', null, updatedPayment);
        showToast(`Payment method "${name}" saved successfully!`, 'success');
        closeModal();
      } catch (err) {
        showToast(err?.message || 'Failed to save payment method', 'danger');
      }
      return;
    }
    if (form.id === 'recordForm') {
      const node = form.dataset.node;
      const id = form.dataset.id;
      const schema = collectionSchemas[node];
      const existingItems = listCollection(node);
      const existingRecord = id ? getItem(node, id) || {} : {};
      const beforeRefs = recordAssetRefs(existingRecord);
      let next = sanitizeRecordFromForm(form, schema.fields, id ? getItem(node, id) || {} : {});
      const duplicate = existingItems.find((item) => item.slug && item.slug === next.slug && item.id !== id);
      if (duplicate) {
        showToast('Duplicate slug detected', 'warning');
        return;
      }
      if (node === 'products' || node === 'categories') {
        next = await uploadRecordMedia(form, node, next);
      }
      try {
        if (id) await updateRecord(node, id, next);
        else await createRecord(node, next);
        const afterRefs = recordAssetRefs(next);
        const removedRefs = beforeRefs.filter((refValue) => !afterRefs.includes(normalizeAssetValue(refValue)));
        for (const refValue of removedRefs) {
          await deleteMediaIfUnused(refValue, { node, id });
        }
        showToast(`${schema.label} saved`);
      } catch (error) {
        showToast(error?.message || `Failed to save ${schema.label.toLowerCase()}`, 'danger');
        return;
      }
      closeModal();
    }
    if (form.id === 'singleForm') {
      const node = form.dataset.node;
      const schema = singleEditors[node];
      const statusEl = form.querySelector('#singleEditorStatus');
      try {
        if (statusEl) statusEl.textContent = 'Preparing save...';
        let next = sanitizeRecordFromForm(form, schema.fields, ui.data?.[node] || {});
        next = await uploadSingleEditorMedia(form, node, next, statusEl);
        if (statusEl) statusEl.textContent = 'Saving changes...';
        await updateRecord(node, null, next);
        if (statusEl) statusEl.textContent = `${schema.title} updated successfully.`;
        showToast(`${schema.title} updated`);
        closeModal();
      } catch (error) {
        const message = error?.message || `Failed to save ${schema.title.toLowerCase()}`;
        if (statusEl) statusEl.textContent = message;
        showToast(message, 'danger');
      }
      return;
    }
    if (form.id === 'mediaUploadForm') {
      await handleMediaUpload(form);
      return;
    }
    if (form.id === 'adminSnapshotImportForm') {
      await applyAdminSnapshotImport(form);
    }
  });

  document.addEventListener('click', (event) => {
    const close = event.target.closest('[data-close-modal]');
    if (close) closeModal();
    const palette = event.target.closest('[data-palette-action]');
    if (palette) {
      const action = palette.dataset.paletteAction;
      if (action.startsWith('goto:')) {
        const next = action.split(':')[1];
        if (next === 'products' || next === 'categories') {
          window.location.hash = '#/catalog';
          ui.catalogTab = next;
        } else {
          window.location.hash = `#/${next}`;
        }
      } else if (action.startsWith('create:')) {
        const node = action.split(':')[1];
        if (node === 'products' || node === 'categories') {
          ui.route = 'catalog';
          ui.catalogTab = node;
          renderView(ui.data || {});
        }
        openRecordEditor(node, collectionSchemas[node]);
      } else if (action === 'logout') {
        logout();
      }
      closePalette();
    }
    const pageBtn = event.target.closest('[data-page]');
    if (pageBtn) {
      ui.page = pageBtn.dataset.page === 'next' ? ui.page + 1 : Math.max(1, ui.page - 1);
      renderView(ui.data || {});
    }
    if (!event.target.closest('.catalog-card-menu')) {
      closeCatalogActionMenus();
    }
  });

  document.addEventListener('input', (event) => {
    if (event.target.id === 'collectionSearch') {
      ui.search = event.target.value;
      ui.page = 1;
      persistCatalogPrefs();
      // Debounced soft update — preserves focus and cursor position
      clearTimeout(_searchDebounceTimer);
      _searchDebounceTimer = setTimeout(() => softUpdateCatalog(), 180);
      return;
    }
    if (event.target.id === 'mediaSearch') {
      ui.media.search = event.target.value;
      renderView(ui.data || {});
      return;
    }
    if (event.target.id === 'paymentSearch' || event.target.id === 'orderSearch') {
      ui.management.search = event.target.value;
      renderView(ui.data || {});
    }
  });
  document.addEventListener('change', (event) => {
    if (event.target.id === 'categoryFilter') {
      ui.filters.category = event.target.value;
      ui.page = 1;
      persistCatalogPrefs();
      renderView(ui.data || {});
      return;
    }
    if (event.target.id === 'statusFilter') {
      ui.filters.status = event.target.value;
      ui.page = 1;
      persistCatalogPrefs();
      renderView(ui.data || {});
      return;
    }
    if (event.target.id === 'sortFilter') {
      ui.sort = event.target.value;
      ui.page = 1;
      persistCatalogPrefs();
      renderView(ui.data || {});
      return;
    }
    if (event.target.id === 'pageSizeFilter') {
      ui.catalogPageSize = Number(event.target.value) || 8;
      ui.page = 1;
      persistCatalogPrefs();
      renderView(ui.data || {});
      return;
    }
    if (event.target.id === 'mediaFolderFilter') {
      ui.media.folder = event.target.value || 'all';
      renderView(ui.data || {});
      return;
    }
    if (event.target.id === 'mediaTypeFilter') {
      ui.media.type = event.target.value || 'all';
      renderView(ui.data || {});
      return;
    }
    if (event.target.id === 'mediaSortFilter') {
      ui.media.sort = event.target.value || 'newest';
      renderView(ui.data || {});
      return;
    }
    if (event.target.id === 'paymentStatusFilter' || event.target.id === 'orderStatusFilter') {
      ui.management.status = event.target.value || 'all';
      renderView(ui.data || {});
      return;
    }
    if (event.target.id === 'paymentMethodFilter' || event.target.id === 'orderMethodFilter') {
      ui.management.method = event.target.value || 'all';
      renderView(ui.data || {});
      return;
    }
    if (event.target.id === 'paymentDateFilter' || event.target.id === 'orderDateFilter') {
      ui.management.date = event.target.value || 'all';
      renderView(ui.data || {});
      return;
    }
    if (event.target.matches?.('[data-action="toggle-select-item"]')) {
      toggleSelection(event.target.dataset.id);
      renderView(ui.data || {});
    }
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeCatalogActionMenus();
    }
    if (event.key === 'Escape' && ui.route === 'catalog' && ui.catalogFiltersOpen && isMobileViewport()) {
      ui.catalogFiltersOpen = false;
      persistCatalogPrefs();
      renderView(ui.data || {});
    }
  });
}

function openMediaUpload() {
  openModal(`
    <div class="panel-head">
      <div>
        <h2 class="section-title">Upload Media</h2>
        <p class="section-subtitle">Files are stored in Supabase Storage, metadata in Firebase RTDB.</p>
      </div>
      <button class="btn btn-ghost" data-close-modal type="button"><i data-lucide="x"></i></button>
    </div>
    <form id="mediaUploadForm">
      <div class="form-grid">
        <div class="field">
          <label>Folder</label>
          <select class="select" name="folder">
            <option value="images">images/</option>
            <option value="products">products/</option>
            <option value="categories">categories/</option>
            <option value="hero">hero/</option>
            <option value="banner">banner/</option>
            <option value="logos">logos/</option>
          </select>
        </div>
        <div class="field full">
          <label>File</label>
          <input class="input" type="file" name="file" accept="image/*,video/*" required />
        </div>
      </div>
      <div class="toolbar" style="margin-top:16px;justify-content:flex-end;">
        <button type="button" class="btn btn-ghost" data-close-modal>Cancel</button>
        <button type="submit" class="btn btn-primary">Upload</button>
      </div>
      <div class="section-subtitle" id="mediaProgress" style="margin-top:10px;"></div>
    </form>
  `);
}

async function handleMediaUpload(form) {
  const fileInput = form.querySelector('input[type="file"]');
  const folder = normalizeStorageFolder(form.querySelector('[name="folder"]').value);
  const progress = form.querySelector('#mediaProgress');
  const file = fileInput.files?.[0];
  if (!file) {
    showToast('Pick a file first', 'warning');
    return;
  }
  progress.textContent = 'Uploading... 0%';
  try {
    const result = await uploadAsset(file, folder, (value) => {
      progress.textContent = `Uploading... ${value}%`;
    });
    const mediaType = file.type.startsWith('video/') ? 'video' : 'image';
    try {
      await saveUploadedMediaRecord(file, result, folder, mediaType, 'manual-upload');
    } catch (metaError) {
      try {
        await deletePublicAsset(result.path);
      } catch (_) {
        // If cleanup fails, the upload still exists in Supabase and can be removed later.
      }
      throw metaError;
    }
    progress.textContent = 'Upload completed';
    setMediaStatus('Media uploaded.');
    showToast('Media uploaded');
    closeModal();
    renderView(ui.data || {});
  } catch (error) {
    progress.textContent = error?.message || 'Upload failed';
    setMediaStatus(error?.message || 'Upload failed');
    showToast(error?.message || 'Upload failed', 'danger');
  }
}

async function handleRecordMediaUpload(form, node, next) {
  try {
    const withMedia = await uploadRecordMedia(form, node, next);
    return withMedia;
  } catch (error) {
    throw error;
  }
}

async function initApp(user) {
  syncTopbar(user);
  initTheme();
  startRealtime();
  attachGlobalHandlers();
  initRouteHandling();
  subscribe((data) => {
    ui.data = data;
    renderView(data);
  });
  renderView(ui.data || {});
}

protectRoute(initApp);


