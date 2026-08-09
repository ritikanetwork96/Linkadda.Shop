import { slugify } from './utils.js';

function firstText(node, selector) {
  return node.querySelector(selector)?.textContent?.trim() || '';
}

function normalizePublicPath(path) {
  const value = String(path || '').trim();
  if (!value) return '';
  if (/^(https?:)?\/\//i.test(value) || value.startsWith('data:') || value.startsWith('blob:')) {
    return value;
  }
  return value.startsWith('/') ? value : `/${value}`;
}

function cleanPrice(text) {
  return String(text || '')
    .replace(/\s+/g, ' ')
    .replace(/[^\d$\/.,-]+/g, '')
    .trim();
}

function extractImages(card) {
  return [...card.querySelectorAll('.pcard-img, .fb-slide img')]
    .map((img) => normalizePublicPath(img.getAttribute('src') || ''))
    .filter(Boolean);
}

function extractVideo(card) {
  return card.querySelector('video')?.getAttribute('src') || '';
}

function extractFeatures(card) {
  return [...card.querySelectorAll('.pcard-features li, .vid-tier-item')]
    .map((li) => li.textContent.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

function buildProduct(card, index) {
  const title = firstText(card, '.pcard-title');
  const badge = firstText(card, '.pcard-pill');
  const creators = firstText(card, '.pcard-creators');
  const platforms = firstText(card, '.pcard-platforms');
  const priceINR = cleanPrice(firstText(card, '.pcard-price'));
  const priceUSD = cleanPrice(firstText(card, '.pcard-price-usd'));
  const images = extractImages(card);
  const orderLink = card.querySelector('a.btn-card')?.getAttribute('href') || '';

  return {
    id: slugify(`${title || badge || 'product'}-${index + 1}`),
    title,
    slug: slugify(title || badge || `product-${index + 1}`),
    category: badge || title,
    description: [creators, platforms].filter(Boolean).join(' | '),
    priceINR,
    priceUSD,
    badge,
    badgeStyle: badge && /gold/i.test(card.className) ? 'pcard-pill-gold' : '',
    badgeIcon: '',
    image: images[0] || '',
    galleryImages: images.slice(1),
    video: extractVideo(card),
    images,
    videos: extractVideo(card) ? [extractVideo(card)] : [],
    creators,
    platforms,
    features: extractFeatures(card),
    orderLink: normalizePublicPath(orderLink),
    status: 'active',
    displayOrder: index + 1,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

function buildCategory(card, index) {
  const title = firstText(card, '.pcard-pill') || firstText(card, '.pcard-title');
  const badge = firstText(card, '.pcard-pill');
  const titleFallback = firstText(card, '.pcard-title');
  const images = extractImages(card);
  const orderLink = card.querySelector('a.btn-card')?.getAttribute('href') || '';
  const features = extractFeatures(card);
  const video = extractVideo(card);

  return {
    id: slugify(`${title || titleFallback || 'category'}-${index + 1}`),
    title: title || titleFallback,
    slug: slugify(title || titleFallback || `category-${index + 1}`),
    description: titleFallback,
    badge,
    badgeStyle: /gold/i.test(card.className) ? 'pcard-pill-gold' : '',
    badgeIcon: '',
    image: images[0] || '',
    galleryImages: images.slice(1),
    video,
    images,
    videos: video ? [video] : [],
    creators: firstText(card, '.pcard-creators'),
    platforms: firstText(card, '.pcard-platforms'),
    features,
    orderLink: normalizePublicPath(orderLink),
    status: 'active',
    displayOrder: index + 1,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

export async function fetchCurrentSiteCatalog() {
  const response = await fetch('/index.html', { cache: 'no-store' });
  const html = await response.text();
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const cards = [...doc.querySelectorAll('.pcard')];
  const assets = [...new Set(cards.flatMap((card) => extractImages(card)).filter(Boolean))];
  const dedupe = (items) => {
    const seen = new Set();
    return items.filter((item) => {
      const key = item.slug || item.title || item.id;
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };
  const products = dedupe(cards.map(buildProduct));
  const categories = dedupe(cards.map(buildCategory));
  const items = dedupe(cards.map((card, index) => {
    const category = buildCategory(card, index);
    return {
      ...category,
      productRef: slugify(firstText(card, '.pcard-title') || category.title || category.slug),
    };
  }));

  return {
    items,
    products,
    categories,
    assets,
  };
}

export function normalizeCatalogRecords(records) {
  const seen = new Set();
  return (Array.isArray(records) ? records : [])
    .filter(Boolean)
    .map((item) => ({ ...item, id: item.id || slugify(item.title || 'item') }))
    .filter((item) => {
      const key = item.slug || item.title || item.id;
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}
