import { db, ref, onValue, get, set, update, remove, push } from './firebase.js';
import { RTDB_NODES } from './config.js';
import { safeJson, slugify, uid } from './utils.js';

const CACHE_KEY = 'linkadda_admin_store_cache_v2';

function loadCachedStore() {
  const initial = {
    hero: {},
    categories: {},
    products: {},
    events: {},
    banner: {},
    faq: {},
    testimonials: {},
    settings: {},
    payment: {},
    orders: {},
    analytics: {},
    media: {},
    visitors: {},
  };
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return { ...initial, ...parsed };
      }
    }
  } catch (_) {}
  return initial;
}

const STORE = loadCachedStore();
const subscribers = new Set();
let listening = false;
let emitTimer = null;

function saveStoreCache() {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(STORE));
  } catch (_) {}
}

function emit() {
  if (emitTimer) cancelAnimationFrame(emitTimer);
  emitTimer = requestAnimationFrame(() => {
    saveStoreCache();
    const snapshot = getSnapshot();
    subscribers.forEach((fn) => {
      try {
        fn(snapshot);
      } catch (err) {
        console.error('Subscriber error:', err);
      }
    });
  });
}

export function getSnapshot() {
  return safeJson(STORE);
}

export function subscribe(fn) {
  subscribers.add(fn);
  fn(getSnapshot());
  return () => subscribers.delete(fn);
}

function attachNode(key, mode = 'collection') {
  const nodeName = RTDB_NODES[key];
  if (!nodeName) return;
  onValue(ref(db, nodeName), (snap) => {
    STORE[key] = snap.val() || (mode === 'singleton' ? {} : {});
    emit();
  });
}

export async function fetchAllInitialData() {
  const nodeKeys = Object.keys(RTDB_NODES);
  try {
    const promises = nodeKeys.map(async (key) => {
      const nodeName = RTDB_NODES[key];
      try {
        const snap = await get(ref(db, nodeName));
        return { key, val: snap.val() };
      } catch (e) {
        return { key, val: null };
      }
    });

    const results = await Promise.allSettled(promises);
    results.forEach((res) => {
      if (res.status === 'fulfilled' && res.value && res.value.val !== null) {
        STORE[res.value.key] = res.value.val;
      }
    });
    emit();
  } catch (err) {
    console.warn('Initial parallel fetch warning:', err);
  }
}

export function startRealtime() {
  // Fast parallel bulk load
  fetchAllInitialData();

  if (listening) return;
  listening = true;
  attachNode('hero', 'singleton');
  attachNode('categories');
  attachNode('products');
  attachNode('events');
  attachNode('banner', 'singleton');
  attachNode('faq');
  attachNode('testimonials');
  attachNode('settings', 'singleton');
  attachNode('payment', 'singleton');
  attachNode('orders');
  attachNode('analytics', 'singleton');
  attachNode('media');
  attachNode('visitors');
}

function isSingleton(node) {
  return ['hero', 'banner', 'settings', 'payment', 'analytics'].includes(node);
}

function nodeRef(node, id = null) {
  if (!RTDB_NODES[node]) throw new Error(`Unknown node: ${node}`);
  return id ? ref(db, `${RTDB_NODES[node]}/${id}`) : ref(db, RTDB_NODES[node]);
}

export async function saveRecord(node, id, data) {
  const payload = {
    ...data,
    id: id || data.id || uid(node),
    updatedAt: Date.now(),
  };
  if (!payload.createdAt) payload.createdAt = Date.now();
  if (isSingleton(node)) {
    await set(nodeRef(node), payload);
    return payload;
  }
  await set(nodeRef(node, payload.id), payload);
  return payload;
}

export async function createRecord(node, data) {
  const payload = {
    ...data,
    id: data.id || uid(node),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  if (isSingleton(node)) {
    await set(nodeRef(node), payload);
    return payload;
  }
  await set(nodeRef(node, payload.id), payload);
  return payload;
}

export async function updateRecord(node, id, data) {
  if (isSingleton(node)) {
    const next = { ...(STORE[node] || {}), ...data, updatedAt: Date.now() };
    await set(nodeRef(node), next);
    return next;
  }
  await update(nodeRef(node, id), { ...data, updatedAt: Date.now() });
  return { id, ...data };
}

export async function updateRecordsBatch(node, batchMap) {
  const nodeName = RTDB_NODES[node];
  if (!nodeName) throw new Error(`Unknown node: ${node}`);
  await update(ref(db, nodeName), batchMap);
}

export async function deleteRecord(node, id) {
  if (isSingleton(node)) {
    await set(nodeRef(node), null);
    return;
  }
  await remove(nodeRef(node, id));
}

export async function duplicateRecord(node, id) {
  const source = getItem(node, id);
  if (!source) throw new Error('Record not found');
  const clone = safeJson(source);
  clone.slug = `${slugify(clone.slug || clone.title || id)}-copy`;
  clone.title = clone.title ? `${clone.title} Copy` : clone.title;
  clone.id = uid(node);
  clone.createdAt = Date.now();
  clone.updatedAt = Date.now();
  if (isSingleton(node)) {
    await set(nodeRef(node), clone);
    return clone;
  }
  await set(nodeRef(node, clone.id), clone);
  return clone;
}

export function listCollection(node) {
  const value = STORE[node] || {};
  return Object.entries(value).map(([id, item]) => ({ ...(item || {}), id }));
}

export function getItem(node, id) {
  return STORE[node]?.[id] || null;
}

export function stats() {
  const products = listCollection('products').filter((item) => item.status !== 'deleted').length;
  const categories = listCollection('categories').filter((item) => item.status !== 'deleted').length;
  const orders = listCollection('orders');
  const visitors = listCollection('visitors');
  const events = listCollection('events');
  const today = new Date().toISOString().slice(0, 10);
  const todaysOrders = orders.filter((item) => String(item.date || '').slice(0, 10) === today).length;
  const todaysVisitors = visitors.filter((item) => String(item.date || '').slice(0, 10) === today).length;
  const todaysClicks = events.filter((item) => String(item.date || '').slice(0, 10) === today && String(item.type || '').includes('click')).length;
  return {
    products,
    categories,
    orders: orders.length,
    todaysOrders,
    visitors: visitors.length,
    todaysVisitors,
    clicks: events.filter((item) => String(item.type || '').includes('click')).length,
    todaysClicks,
  };
}

export function recentOrders(limit = 6) {
  return listCollection('orders')
    .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
    .slice(0, limit);
}

export function recentProducts(limit = 6) {
  return listCollection('products')
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
    .slice(0, limit);
}

export function recentActivity(limit = 10) {
  const prettyPage = (page) => {
    const value = String(page || 'Visit').toLowerCase();
    if (value === 'index' || value === 'home' || value === 'homepage') return 'Homepage';
    return page || 'Visit';
  };
  const orders = recentOrders(limit).map((item) => ({
    type: 'order',
    title: item.package || item.title || 'Order',
    meta: item.status || 'pending',
    timestamp: item.timestamp || item.updatedAt || Date.now(),
  }));
  const events = listCollection('events')
    .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
    .slice(0, limit)
    .map((item) => ({
      type: item.type || 'event',
      title: item.package || item.title || item.label || 'Event',
      meta: item.page || item.source || item.path || '',
      timestamp: item.timestamp || Date.now(),
    }));
  const visitors = listCollection('visitors')
    .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
    .slice(0, limit)
    .map((item) => ({
      type: 'visitor',
      title: prettyPage(item.page),
      meta: item.date || '',
      timestamp: item.timestamp || Date.now(),
    }));
  return [...orders, ...events, ...visitors]
    .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
    .slice(0, limit);
}
