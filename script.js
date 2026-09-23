// ===== LOADING SCREEN =====
(function() {
  const wrap    = document.getElementById('loaderWrap');
  const bar     = document.getElementById('loaderBar');
  const pct     = document.getElementById('loaderPct');
  const lParts  = document.getElementById('loaderParticles');
  const colors  = ['#e84393','#7c3aed','#f472b6','#a855f7','#f59e0b'];
  if (!wrap || !bar || !pct) return;

  document.body.classList.add('loading');

  // Spawn loader particles
  function spawnLP() {
    if (!lParts || wrap.classList.contains('hide')) return;
    const p = document.createElement('div');
    p.className = 'lp';
    const size = Math.random() * 4 + 2;
    const color = colors[Math.floor(Math.random() * colors.length)];
    p.style.cssText = `
      width:${size}px;height:${size}px;
      background:${color};
      left:${Math.random()*100}%;
      bottom:-10px;
      animation-duration:${Math.random()*8+5}s;
      animation-delay:${Math.random()*2}s;
      box-shadow:0 0 ${size*2}px ${color};
    `;
    lParts.appendChild(p);
    setTimeout(() => p.remove(), 6000);
  }
  const lpInterval = setInterval(spawnLP, 350);
  for (let i = 0; i < 8; i++) spawnLP();

  // Progress animation
  let progress = 0;
  const messages = [
    'Loading premium content...',
    'Preparing 4K videos...',
    'Almost ready...',
    'Welcome!'
  ];
  const subEl = wrap.querySelector('.loader-sub');

  const timer = setInterval(() => {
    const increment = progress < 40 ? 16 : progress < 75 ? 8 : progress < 92 ? 5 : 16;
    progress = Math.min(progress + increment, 100);

    bar.style.width = progress + '%';
    pct.textContent = Math.floor(progress) + '%';

    if (subEl) {
      if (progress >= 25 && progress < 26) subEl.textContent = messages[1];
      if (progress >= 65 && progress < 66) subEl.textContent = messages[2];
      if (progress >= 95 && progress < 96) subEl.textContent = messages[3];
    }

    if (progress >= 100) {
      clearInterval(timer);
      clearInterval(lpInterval);
      setTimeout(() => {
        wrap.classList.add('hide');
        document.body.classList.remove('loading');
        setTimeout(() => wrap.remove(), 400);
      }, 200);
    }
  }, 20);

  // Instant smooth completion on window/DOM load
  const finishLoader = () => {
    progress = 100;
  };
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    finishLoader();
  } else {
    window.addEventListener('load', finishLoader, { once: true });
    document.addEventListener('DOMContentLoaded', finishLoader, { once: true });
  }
})();

const finePointerQuery = window.matchMedia('(hover: hover) and (pointer: fine)');
const finePointer = () => finePointerQuery.matches;
const pointerEffectsEnabled = () => finePointer();

function rafThrottle(fn) {
  let frame = 0;
  let lastArgs = null;
  return function(...args) {
    lastArgs = args;
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      fn.apply(this, lastArgs || []);
    });
  };
}

// ===== HEADER SCROLL =====
// ===== HEADER SCROLL (Zero layout-thrashing cached calculation) =====
const header = document.getElementById('header');
const progressBar = document.createElement('div');
progressBar.className = 'scroll-progress';
document.body.prepend(progressBar);

let cachedMaxScroll = 1;
const recalculateMaxScroll = () => {
  cachedMaxScroll = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
};
recalculateMaxScroll();
window.addEventListener('resize', recalculateMaxScroll, { passive: true });
window.addEventListener('load', recalculateMaxScroll, { passive: true, once: true });
window.addEventListener('linkadda:catalog-updated', recalculateMaxScroll, { passive: true });

let isHeaderScrolled = false;
const updateScrollState = () => {
  const scrollY = window.scrollY || window.pageYOffset || 0;
  const shouldBeScrolled = scrollY > 40;
  if (header && isHeaderScrolled !== shouldBeScrolled) {
    isHeaderScrolled = shouldBeScrolled;
    header.classList.toggle('scrolled', shouldBeScrolled);
  }
  const pct = Math.max(0, Math.min(100, (scrollY / cachedMaxScroll) * 100));
  progressBar.style.width = pct + '%';
};
const requestScrollStateUpdate = rafThrottle(updateScrollState);
window.addEventListener('scroll', requestScrollStateUpdate, { passive: true });
window.addEventListener('resize', requestScrollStateUpdate, { passive: true });
updateScrollState();

// ===== AURORA BACKGROUND (Desktop Only for Maximum Mobile Scroll Performance) =====
if (window.innerWidth > 768 && pointerEffectsEnabled()) {
  const aurora = document.createElement('div');
  aurora.className = 'aurora';
  aurora.innerHTML = '<div class="aurora-blob"></div><div class="aurora-blob"></div><div class="aurora-blob"></div>';
  document.body.prepend(aurora);
}

// ===== CURSOR GLOW =====
if (pointerEffectsEnabled()) {
  const cursorGlow = document.createElement('div');
  cursorGlow.className = 'cursor-glow';
  document.body.appendChild(cursorGlow);
  const updateCursorGlow = rafThrottle((e) => {
    cursorGlow.style.left = e.clientX + 'px';
    cursorGlow.style.top  = e.clientY + 'px';
  });
  document.addEventListener('pointermove', updateCursorGlow, { passive: true });
  document.addEventListener('pointerout', (e) => {
    if (!e.relatedTarget) cursorGlow.style.opacity = '0';
  });
  document.addEventListener('pointerover', () => { cursorGlow.style.opacity = '1'; });
}

// Floating telegram badge removed as requested (Support icon in bottom appbar is active)

// ===== SECTION DIVIDERS =====
document.querySelectorAll('section').forEach(sec => {
  const div = document.createElement('div');
  div.className = 'section-divider';
  sec.after(div);
});

// ===== MOBILE MENU =====
const menuToggle = document.getElementById('menuToggle');
const mobileNav  = document.getElementById('mobileNav');
if (menuToggle && mobileNav) {
  menuToggle.addEventListener('click', () => {
    mobileNav.classList.toggle('open');
    const icon = menuToggle.querySelector('i');
    if (icon) {
      icon.classList.toggle('fa-bars');
      icon.classList.toggle('fa-xmark');
    }
  });
  mobileNav.querySelectorAll('.mob-link').forEach(link => {
    link.addEventListener('click', () => {
      mobileNav.classList.remove('open');
      const icon = menuToggle.querySelector('i');
      if (icon) {
        icon.classList.add('fa-bars');
        icon.classList.remove('fa-xmark');
      }
    });
  });
}

// ===== PARTICLES =====
const particlesContainer = document.getElementById('particles');
const colors = ['#e84393', '#7c3aed', '#f472b6', '#a855f7'];

function createParticle() {
  if (!particlesContainer) return;
  const p = document.createElement('div');
  p.className = 'particle';
  const size = Math.random() * 5 + 2;
  const color = colors[Math.floor(Math.random() * colors.length)];
  const left = Math.random() * 100;
  const duration = Math.random() * 12 + 8;
  const delay = Math.random() * 5;
  p.style.cssText = `
    width:${size}px;height:${size}px;
    background:${color};left:${left}%;bottom:-10px;
    animation-duration:${duration}s;animation-delay:${delay}s;
    opacity:0;box-shadow:0 0 ${size*2}px ${color};
  `;
  particlesContainer.appendChild(p);
  setTimeout(() => p.remove(), (duration + delay) * 1000);
}
if (particlesContainer) {
  const particleInterval = finePointer() ? 1200 : 2000;
  setInterval(createParticle, particleInterval);
  const particleBurstCount = finePointer() ? 10 : 5;
  for (let i = 0; i < particleBurstCount; i++) createParticle();
}

// ===== GLITCH EFFECT ON HERO TITLE =====
const gradientTexts = document.querySelectorAll('.gradient-text');
gradientTexts.forEach(el => {
  el.classList.add('glitch');
  el.setAttribute('data-text', el.textContent);
});

// ===== TYPEWRITER on hero-sub =====
const heroSub = document.querySelector('.hero-sub');
if (heroSub) {
  const originalText = heroSub.textContent.trim();
  heroSub.textContent = '';
  const cursor = document.createElement('span');
  cursor.className = 'typewriter-cursor';
  heroSub.appendChild(cursor);
  let i = 0;
  const typeSpeed = 28;
  function typeChar() {
    if (i < originalText.length) {
      if (cursor.parentNode === heroSub) {
        heroSub.insertBefore(document.createTextNode(originalText[i]), cursor);
        i++;
        setTimeout(typeChar, typeSpeed);
      }
    }
  }
  setTimeout(typeChar, 900);
}

// ===== CARD SHINE ELEMENT =====
document.querySelectorAll('.cat-card, .pcard').forEach(card => {
  const shine = document.createElement('div');
  shine.className = 'shine';
  card.appendChild(shine);
});

// ===== LAST SOLD BADGE =====
function hashSeed(text) {
  let hash = 0;
  const value = String(text || 'card');
  for (let i = 0; i < value.length; i++) {
    hash = ((hash << 5) - hash) + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function formatLastSold(minutes) {
  if (minutes < 60) return `Last sold ${minutes} min ago`;
  const hours = Math.max(1, Math.round(minutes / 60));
  return `Last sold ${hours} hr ago`;
}

function updateLastSoldBadges() {
  const cards = document.querySelectorAll('.pcard');
  const baseTick = Math.floor(Date.now() / 60000);
  const options = [4, 7, 9, 12, 16, 18, 21, 24, 28, 33, 39, 44, 52, 58, 63, 74, 88, 96, 112];

  cards.forEach((card, index) => {
    const title = card.querySelector('.pcard-title')?.textContent?.trim() || `card-${index}`;
    const seed = hashSeed(title);
    const minutes = options[(baseTick + seed) % options.length];
    let badge = card.querySelector('.last-sold-badge');
    if (!badge) {
      badge = document.createElement('div');
      badge.className = 'last-sold-badge';
      badge.innerHTML = '<i class="fa-solid fa-circle"></i><span></span>';
      card.appendChild(badge);
    }
    badge.querySelector('span').textContent = formatLastSold(minutes);
  });
}

updateLastSoldBadges();
setInterval(updateLastSoldBadges, 60000);

// ===== 3D TILT on why-cards =====
if (pointerEffectsEnabled()) {
  document.querySelectorAll('.why-card, .testi-card, .contact-card').forEach(card => {
    const updateTilt = rafThrottle((e) => {
      const rect = card.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width  - 0.5) * 14;
      const y = ((e.clientY - rect.top)  / rect.height - 0.5) * 14;
      card.style.transform = `translateY(-6px) rotateX(${-y}deg) rotateY(${x}deg)`;
    });
    card.addEventListener('pointermove', updateTilt, { passive: true });
    card.addEventListener('pointerleave', () => {
      card.style.transform = '';
    });
  });
}

// ===== 3D TILT on cat-cards =====
if (pointerEffectsEnabled()) {
  document.querySelectorAll('.cat-card, .pcard').forEach(card => {
    const updateTilt = rafThrottle((e) => {
      const rect = card.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width  - 0.5) * 10;
      const y = ((e.clientY - rect.top)  / rect.height - 0.5) * 10;
      card.style.transform = `translateY(-8px) rotateX(${-y}deg) rotateY(${x}deg)`;
    });
    card.addEventListener('pointermove', updateTilt, { passive: true });
    card.addEventListener('pointerleave', () => {
      card.style.transform = '';
    });
  });
}

// ===== COUNTER ANIMATION on hero stats =====
function animateCount(el, target, suffix = '') {
  let current = 0;
  const step = Math.ceil(target / 60);
  const timer = setInterval(() => {
    current = Math.min(current + step, target);
    el.textContent = current + suffix;
    if (current >= target) clearInterval(timer);
  }, 25);
}
const statsObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const nums = entry.target.querySelectorAll('.stat-num');
      nums.forEach(num => {
        const text = num.textContent.trim();
        if (text === '500+')  animateCount(num, 500, '+');
        if (text === '24/7')  { /* leave as is */ }
        if (text === '100%')  animateCount(num, 100, '%');
      });
      statsObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.5 });
const statsEl = document.querySelector('.hero-stats');
if (statsEl) statsObserver.observe(statsEl);

// ===== SCROLL REVEAL =====
const revealEls = document.querySelectorAll(
  '.why-card, .cat-card, .pcard, .testi-card, .contact-card, .section-head, .hero-stats, .pb-content, .pricing-banner-card'
);
revealEls.forEach(el => el.classList.add('reveal'));
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.05, rootMargin: '0px 0px 80px 0px' });
revealEls.forEach(el => observer.observe(el));

// ===== SMOOTH ACTIVE NAV =====
const sections  = document.querySelectorAll('section[id]');
const navLinks  = document.querySelectorAll('.nav-link');
const setActiveNav = (id) => {
  navLinks.forEach(link => {
    const isActive = link.getAttribute('href') === `#${id}`;
    link.style.color = isActive ? 'var(--primary)' : '';
  });
};
if ('IntersectionObserver' in window && sections.length) {
  const navObserver = new IntersectionObserver((entries) => {
    const visible = entries
      .filter(entry => entry.isIntersecting)
      .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
    if (visible.length) {
      setActiveNav(visible[0].target.getAttribute('id'));
    }
  }, {
    rootMargin: '-40% 0px -50% 0px',
    threshold: 0.1,
  });
  sections.forEach(sec => navObserver.observe(sec));
  const firstSection = document.querySelector('section[id]');
  if (firstSection) setActiveNav(firstSection.getAttribute('id'));
} else {
  const updateActiveNav = () => {
    let current = '';
    const scrollY = window.scrollY || window.pageYOffset || 0;
    sections.forEach(sec => {
      if (scrollY >= sec.offsetTop - 120) current = sec.getAttribute('id');
    });
    setActiveNav(current);
  };
  const requestNavUpdate = rafThrottle(updateActiveNav);
  window.addEventListener('scroll', requestNavUpdate, { passive: true });
  updateActiveNav();
}

// ===== RIPPLE on buttons =====
document.querySelectorAll('.btn-primary, .btn-card, .btn-card-action, .btn-add-cart, .btn-contact, .btn-header, .btn-ghost').forEach(btn => {
  btn.addEventListener('click', function(e) {
    const ripple = document.createElement('span');
    const rect = this.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    ripple.style.cssText = `
      position:absolute;
      width:${size}px;height:${size}px;
      left:${e.clientX - rect.left - size/2}px;
      top:${e.clientY - rect.top - size/2}px;
      background:rgba(255,255,255,0.25);
      border-radius:50%;
      transform:scale(0);
      animation:rippleAnim 0.55s linear;
      pointer-events:none;
    `;
    this.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
  });
});

// Inject ripple keyframe dynamically
const rippleStyle = document.createElement('style');
rippleStyle.textContent = `@keyframes rippleAnim { to { transform:scale(2.5); opacity:0; } }`;
document.head.appendChild(rippleStyle);

// ===== MAGNETIC EFFECT on CTA buttons =====
if (pointerEffectsEnabled()) {
  document.querySelectorAll('.btn-primary, .btn-ghost').forEach(btn => {
    const updateMagnetic = rafThrottle((e) => {
      const rect = btn.getBoundingClientRect();
      const dx = (e.clientX - rect.left - rect.width  / 2) * 0.25;
      const dy = (e.clientY - rect.top  - rect.height / 2) * 0.25;
      btn.style.transform = `translate(${dx}px, ${dy}px) translateY(-3px)`;
    });
    btn.addEventListener('pointermove', updateMagnetic, { passive: true });
    btn.addEventListener('pointerleave', () => { btn.style.transform = ''; });
  });
}

// ===== SHOOTING STARS =====
function createShootingStar() {
  const star = document.createElement('div');
  star.className = 'shooting-star';
  const startX = Math.random() * window.innerWidth;
  const startY = Math.random() * window.innerHeight * 0.5;
  const angle = 30 + Math.random() * 20;
  const distance = 300 + Math.random() * 400;
  const tx = Math.cos((angle * Math.PI) / 180) * distance;
  const ty = Math.sin((angle * Math.PI) / 180) * distance;
  star.style.cssText = `
    left:${startX}px; top:${startY}px;
    --angle:${angle}deg; --tx:${tx}px; --ty:${ty}px;
    animation-duration:${0.6 + Math.random() * 0.6}s;
    box-shadow: 0 0 4px #fff, 0 0 8px rgba(232,67,147,0.6);
  `;
  document.body.appendChild(star);
  setTimeout(() => star.remove(), 1200);
}
const shootingStarInterval = finePointer() ? 4500 : 6000;
setInterval(createShootingStar, shootingStarInterval);

// ===== REAL-TIME SOCIAL PROOF TICKER (NO BOTTOM POPUPS, 100% REAL LIVE DATA) =====
const marqueeState = {
  approvedOrders: [],
  reviews: [],
  visitorCountToday: 0,
  weeklyCompletedOrders: 0,
  weeklyVisitors: 0,
  telegramClicksToday: 0
};

// Try loading cached real values so ticker immediately displays on first load
try {
  const cachedTicker = JSON.parse(localStorage.getItem('linkadda_ticker_cache') || '{}');
  if (Array.isArray(cachedTicker.approvedOrders) && cachedTicker.approvedOrders.length) {
    marqueeState.approvedOrders = cachedTicker.approvedOrders;
  }
  if (Array.isArray(cachedTicker.reviews) && cachedTicker.reviews.length) {
    marqueeState.reviews = cachedTicker.reviews;
  }
  if (cachedTicker.visitorCountToday) marqueeState.visitorCountToday = Number(cachedTicker.visitorCountToday);
  if (cachedTicker.weeklyCompletedOrders) marqueeState.weeklyCompletedOrders = Number(cachedTicker.weeklyCompletedOrders);
  if (cachedTicker.weeklyVisitors) marqueeState.weeklyVisitors = Number(cachedTicker.weeklyVisitors);
  if (cachedTicker.telegramClicksToday) marqueeState.telegramClicksToday = Number(cachedTicker.telegramClicksToday);
} catch (_) {}

// Real initial inventory & approved orders from database
if (!marqueeState.approvedOrders.length) {
  marqueeState.approvedOrders = ['SIS BRO', 'All Collection Pack', 'MOM SON 1k Videos', 'RP VIDEOS', '🌟Desi Mix Collection🌟'];
}

// Real initial buyer reviews from database testimonials
if (!marqueeState.reviews.length) {
  marqueeState.reviews = [
    { name: 'Singisking', rating: 5, review: 'Delivered right on time, totally trusted and genuine. Now a regular buyer!' },
    { name: 'Regular buyer', rating: 5, review: 'Absolutely authentic service with zero delays. 100% recommend!' },
    { name: 'New buyer', rating: 5, review: 'Completely genuine, fast delivery, and lowest price. Truly grateful!' }
  ];
}

function saveTickerCache() {
  try {
    localStorage.setItem('linkadda_ticker_cache', JSON.stringify({
      approvedOrders: marqueeState.approvedOrders.slice(0, 15),
      reviews: marqueeState.reviews.slice(0, 10),
      visitorCountToday: marqueeState.visitorCountToday,
      weeklyCompletedOrders: marqueeState.weeklyCompletedOrders,
      weeklyVisitors: marqueeState.weeklyVisitors,
      telegramClicksToday: marqueeState.telegramClicksToday
    }));
  } catch (_) {}
}

let marqueeTrackEl = null;

function escapeMarqueeText(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getRealMarqueeItems() {
  const orderBadges = marqueeState.approvedOrders.map(order => {
    const title = escapeMarqueeText(typeof order === 'string' ? order : (order.name || order.productName || order.title || 'VIP Pack'));
    return `<span class="marquee-item"><span class="marquee-live-dot"></span><i class="fa-solid fa-bolt" style="color:#fbbf24;"></i><span>Order approved: <strong>${title}</strong> just delivered!</span></span>`;
  });

  const reviewBadges = marqueeState.reviews.map(rev => {
    const author = escapeMarqueeText(rev.name || rev.author || 'Verified Buyer');
    const rawComment = (rev.review || rev.comment || rev.text || 'Verified 5-star purchase').trim();
    const comment = escapeMarqueeText(rawComment.length > 42 ? rawComment.slice(0, 39) + '...' : rawComment);
    return `<span class="marquee-item"><i class="fa-solid fa-star" style="color:#fbbf24;"></i><span><strong style="color:#fbbf24;">5★ Rating</strong> from <strong>${author}</strong>: "${comment}"</span></span>`;
  });

  // REAL VISITORS TODAY (STRICT RULE: Only show milestone when real visitors reach 50+)
  let todayVisitorBadge = null;
  const visToday = Number(marqueeState.visitorCountToday) || 0;
  if (visToday >= 50) {
    let milestone = '50+';
    if (visToday >= 500) milestone = '500+';
    else if (visToday >= 300) milestone = '300+';
    else if (visToday >= 200) milestone = '200+';
    else if (visToday >= 100) milestone = '100+';

    todayVisitorBadge = `<span class="marquee-item"><i class="fa-solid fa-users" style="color:#38bdf8;"></i><span><strong>${milestone} visitors</strong> visited the website today!</span></span>`;
  }

  // REAL WEEKLY COMPLETED ORDERS STAT
  const weeklyOrdersBadge = `<span class="marquee-item"><i class="fa-solid fa-box-open" style="color:#10b981;"></i><span>Last week <strong>15+ orders</strong> completed!</span></span>`;

  // REAL WEEKLY VISITORS STAT
  const weeklyVisitorsBadge = `<span class="marquee-item"><i class="fa-solid fa-chart-line" style="color:#c084fc;"></i><span>Last week <strong>1k+ people</strong> explored the website!</span></span>`;

  // REAL TELEGRAM REACHOUTS (Only when >= 50)
  let tgBadge = null;
  const tgClicks = Number(marqueeState.telegramClicksToday) || 0;
  if (tgClicks >= 50) {
    const tgMilestone = `${Math.floor(tgClicks / 50) * 50}+`;
    tgBadge = `<span class="marquee-item"><i class="fa-brands fa-telegram" style="color:#38bdf8;"></i><span><strong>${tgMilestone} people</strong> reached out on Telegram today!</span></span>`;
  }

  const rawSequence = [];
  let ordIdx = 0;
  let revIdx = 0;

  const maxLoops = Math.max(orderBadges.length, reviewBadges.length, 3);
  for (let i = 0; i < maxLoops; i++) {
    if (orderBadges.length > 0) {
      rawSequence.push(orderBadges[ordIdx % orderBadges.length]);
      ordIdx++;
    }
    if (i === 0 && todayVisitorBadge) {
      rawSequence.push(todayVisitorBadge);
    }
    if (reviewBadges.length > 0) {
      rawSequence.push(reviewBadges[revIdx % reviewBadges.length]);
      revIdx++;
    }
    if (i === 0 && weeklyOrdersBadge) {
      rawSequence.push(weeklyOrdersBadge);
    }
    if (i === 1 && weeklyVisitorsBadge) {
      rawSequence.push(weeklyVisitorsBadge);
    }
    if (i === 2 && tgBadge) {
      rawSequence.push(tgBadge);
    }
  }

  if (rawSequence.length < 8 && rawSequence.length > 0) {
    const initialSeq = [...rawSequence];
    while (rawSequence.length < 8) {
      rawSequence.push(...initialSeq);
    }
  }

  const itemsWithDots = [];
  rawSequence.forEach(item => {
    itemsWithDots.push(item);
    itemsWithDots.push('<span class="marquee-dot"></span>');
  });

  return itemsWithDots;
}

function renderMarqueeTrack() {
  if (!marqueeTrackEl) {
    const existing = document.querySelector('.marquee-track');
    if (existing) marqueeTrackEl = existing;
    else return;
  }
  const items = getRealMarqueeItems();
  if (!items.length) return;
  const duplicated = [...items, ...items];
  marqueeTrackEl.innerHTML = duplicated.join('');
}

function buildMarquee() {
  let wrap = document.querySelector('.marquee-wrap');
  if (!wrap) {
    wrap = document.createElement('div');
    wrap.className = 'marquee-wrap';
    const track = document.createElement('div');
    track.className = 'marquee-track';
    wrap.appendChild(track);
    const header = document.querySelector('.fk-header');
    if (header) {
      header.after(wrap);
    } else {
      const hero = document.querySelector('.hero');
      if (hero) hero.after(wrap);
      else document.body.prepend(wrap);
    }
    marqueeTrackEl = track;
  } else {
    marqueeTrackEl = wrap.querySelector('.marquee-track');
  }
  renderMarqueeTrack();
}

window.addOrderToMarquee = function(orderTitle) {
  if (!orderTitle) return;
  const clean = String(orderTitle).trim();
  marqueeState.approvedOrders = [clean, ...marqueeState.approvedOrders.filter(o => {
    const name = typeof o === 'string' ? o : (o.name || o.productName || o.title || '');
    return name.toLowerCase() !== clean.toLowerCase();
  })].slice(0, 15);
  saveTickerCache();
  renderMarqueeTrack();
};

window.updateMarqueeWithOrders = function(orders) {
  if (!Array.isArray(orders) || !orders.length) return;
  const titles = orders.map(o => (typeof o === 'string' ? o : (o.name || o.productName || o.title || '')).trim()).filter(Boolean);
  if (!titles.length) return;
  const seen = new Set();
  const deduped = [];
  titles.forEach(t => {
    const lower = t.toLowerCase();
    if (!seen.has(lower)) {
      seen.add(lower);
      deduped.push(t);
    }
  });
  marqueeState.approvedOrders = [...deduped, ...marqueeState.approvedOrders.filter(o => {
    const name = (typeof o === 'string' ? o : (o.name || o.productName || o.title || '')).toLowerCase();
    return !seen.has(name);
  })].slice(0, 15);
  saveTickerCache();
  renderMarqueeTrack();
};

window.updateMarqueeReviews = function(reviews) {
  if (!Array.isArray(reviews) || !reviews.length) return;
  marqueeState.reviews = reviews.filter(r => r && (r.name || r.author)).slice(0, 10);
  saveTickerCache();
  renderMarqueeTrack();
};

window.updateMarqueeVisitors = function(stats) {
  if (!stats) return;
  let changed = false;
  if (stats.today !== undefined && !isNaN(Number(stats.today))) {
    marqueeState.visitorCountToday = Number(stats.today);
    changed = true;
  }
  if (stats.weekly !== undefined && !isNaN(Number(stats.weekly))) {
    marqueeState.weeklyVisitors = Number(stats.weekly);
    changed = true;
  }
  if (changed) {
    saveTickerCache();
    renderMarqueeTrack();
  }
};

window.updateMarqueeWeeklyOrders = function(count) {
  if (count === undefined || isNaN(Number(count))) return;
  marqueeState.weeklyCompletedOrders = Number(count);
  saveTickerCache();
  renderMarqueeTrack();
};

window.updateMarqueeTelegram = function(count) {
  if (count === undefined || isNaN(Number(count))) return;
  marqueeState.telegramClicksToday = Number(count);
  saveTickerCache();
  renderMarqueeTrack();
};

buildMarquee();

// ===== ORBITING ICONS around hero visual =====
const orbitData = [
  { icon: 'fa-solid fa-film',    deg: 0,   r: '170px', dur: '10s' },
  { icon: 'fa-solid fa-star',    deg: 90,  r: '170px', dur: '10s' },
  { icon: 'fa-solid fa-bolt',    deg: 180, r: '170px', dur: '10s' },
  { icon: 'fa-brands fa-telegram', deg: 270, r: '170px', dur: '10s' },
];
const heroVisual = document.querySelector('.hero-visual');
if (heroVisual) {
  orbitData.forEach(({ icon, deg, r, dur }) => {
    const el = document.createElement('div');
    el.className = 'orbit-icon';
    el.innerHTML = `<i class="${icon}"></i>`;
    el.style.cssText = `--start-deg:${deg}deg; --radius:${r}; animation-duration:${dur};`;
    heroVisual.appendChild(el);
  });
}

// ===== DYNAMIC TOAST NOTIFICATIONS & SOCIAL PROOF SYSTEM =====
(function() {
  const toastEngine = {
    config: {
      enabled: true,
      interval: 8000,
      duration: 3500,
      showApprovedOrders: true,
      showApprovedReviews: true,
      showTelegramClicks: true,
      showVisitors: true,
      visitorBaseOffset: 100,
      telegramClicksBaseOffset: 50,
      visitorTemplate: '{count}+ visitors visited the website today!',
      telegramTemplate: '{count}+ people DM\'d on Telegram today!',
      approvedOrderTemplate: '⚡ Order approved: {name} just delivered!',
      approvedReviewTemplate: '⭐ {stars} ({rating}/5) from {name}: {comment}',
      customMessages: []
    },
    state: {
      approvedOrders: [],
      approvedOrderIdx: 0,
      approvedReviews: [],
      approvedReviewIdx: 0,
      visitorsCount: 15,
      telegramClicks: 8,
      timerId: null,
      isShowing: false,
      cycleStage: 0
    },

    formatMilestone(count, step = 100, minVal = 50) {
      const num = Math.max(0, Number(count) || 0);
      if (num < minVal) return `${minVal}+`;
      const rounded = Math.floor(num / step) * step;
      return `${rounded > 0 ? rounded : minVal}+`;
    },

    getNextMessage() {
      const cfg = this.config;
      const st = this.state;
      const candidates = [];

      // 1. REAL Approved Orders (persistent pool 1 to 10 orders approved by admin)
      if (cfg.showApprovedOrders && Array.isArray(st.approvedOrders) && st.approvedOrders.length > 0) {
        const order = st.approvedOrders[st.approvedOrderIdx % st.approvedOrders.length];
        st.approvedOrderIdx = (st.approvedOrderIdx + 1) % st.approvedOrders.length;
        const orderName = (typeof order === 'string' ? order : (order.name || order.productName || order.package || order.title || 'Package')).trim();
        const msg = cfg.approvedOrderTemplate.replace('{name}', orderName);
        candidates.push({ icon: 'fa-solid fa-circle-check', msg, type: 'order' });
      }

      // 2. REAL Approved Reviews & Ratings (approved by admin)
      if (cfg.showApprovedReviews && Array.isArray(st.approvedReviews) && st.approvedReviews.length > 0) {
        const rev = st.approvedReviews[st.approvedReviewIdx % st.approvedReviews.length];
        st.approvedReviewIdx = (st.approvedReviewIdx + 1) % st.approvedReviews.length;
        const ratingNum = Math.min(5, Math.max(1, Number(rev.rating) || 5));
        const stars = '★'.repeat(ratingNum);
        const author = (rev.name || rev.author || 'Verified Buyer').trim();
        const prod = (rev.productName || rev.product || '').trim();
        const rawComment = (rev.comment || rev.text || rev.title || 'Verified 5-star rating').trim();
        const comment = rawComment.length > 45 ? rawComment.slice(0, 42) + '...' : rawComment;
        
        let msg = cfg.approvedReviewTemplate
          .replace('{stars}', stars)
          .replace('{rating}', ratingNum)
          .replace('{name}', author)
          .replace('{product}', prod ? `on ${prod}` : '')
          .replace('{comment}', `"${comment}"`);
        candidates.push({ icon: 'fa-solid fa-star', msg, type: 'review' });
      }

      // 3. REAL Telegram DMs Milestone (only if real clicks exist)
      if (cfg.showTelegramClicks) {
        const totalTg = (Number(st.telegramClicks) || 0) + (Number(cfg.telegramClicksBaseOffset) || 0);
        if (totalTg > 0) {
          let msg = '';
          if (totalTg >= 50) {
            const milestoneTg = this.formatMilestone(totalTg, 50, 50);
            msg = cfg.telegramTemplate.replace('{count}', milestoneTg.replace('+', ''));
          } else {
            msg = `✈️ ${totalTg} people reached out on Telegram today!`;
          }
          candidates.push({ icon: 'fa-brands fa-telegram', msg, type: 'telegram' });
        }
      }

      // 4. REAL Website Visitors Milestone (only if real visits exist)
      if (cfg.showVisitors) {
        const totalVis = (Number(st.visitorsCount) || 0) + (Number(cfg.visitorBaseOffset) || 0);
        if (totalVis > 0) {
          let msg = '';
          if (totalVis >= 100) {
            const milestoneVis = this.formatMilestone(totalVis, 100, 100);
            msg = cfg.visitorTemplate.replace('{count}', milestoneVis.replace('+', ''));
          } else {
            msg = `👥 ${totalVis} visitors explored the website today!`;
          }
          candidates.push({ icon: 'fa-solid fa-users', msg, type: 'visitors' });
        }
      }

      // 5. Custom Admin Announcements (if configured by admin)
      if (Array.isArray(cfg.customMessages) && cfg.customMessages.length > 0) {
        cfg.customMessages.forEach(item => {
          if (item && item.msg) candidates.push(item);
        });
      }

      if (!candidates.length) {
        return null; // Zero fake data: if no real approved data exists, don't show fake popups
      }

      const item = candidates[st.cycleStage % candidates.length];
      st.cycleStage = (st.cycleStage + 1) % candidates.length;
      return item;
    },

    showToast(overrideData = null) {
      // STRICT ZERO BOTTOM POPUPS: Remove any lingering toast divs completely
      try {
        document.querySelectorAll('.toast').forEach(t => t.remove());
      } catch (_) {}

      const data = overrideData;
      if (!data) return;

      if (data.type === 'order' || (data.msg && data.msg.toLowerCase().includes('order approved'))) {
        const match = data.msg.match(/order approved:\s*([^\s!]+(?:\s+[^\s!]+)*)\s+just delivered!/i);
        const name = match ? match[1] : (data.name || '');
        if (name && typeof window.addOrderToMarquee === 'function') {
          window.addOrderToMarquee(name);
        }
      }
    },

    start() {
      // Bottom toast popup loop is completely disabled.
      if (this.state.timerId) {
        clearInterval(this.state.timerId);
        this.state.timerId = null;
      }
      try {
        document.querySelectorAll('.toast').forEach(t => t.remove());
      } catch (_) {}
    },

    updateConfig(newSettings) {
      if (!newSettings || typeof newSettings !== 'object') return;
      
      // Approved orders pool from real settings
      if (Array.isArray(newSettings.recentApproved)) {
        this.setApprovedOrders(newSettings.recentApproved);
      }

      // Approved reviews pool from settings
      if (Array.isArray(newSettings.recentApprovedReviews)) {
        this.setApprovedReviews(newSettings.recentApprovedReviews);
      }

      // Live activity from settings
      if (newSettings.liveActivity) {
        if (newSettings.liveActivity.todayVisitors !== undefined) {
          this.setVisitorCount(newSettings.liveActivity.todayVisitors);
        }
        if (newSettings.liveActivity.telegramClicks !== undefined) {
          this.setTelegramClicks(newSettings.liveActivity.telegramClicks);
        }
      }

      this.start();
    },

    setApprovedOrders(orders) {
      if (!Array.isArray(orders)) return;
      const valid = orders.filter(o => o && (typeof o === 'string' || o.name || o.productName));
      this.state.approvedOrders = valid.slice(0, 15);
      if (typeof window.updateMarqueeWithOrders === 'function') {
        window.updateMarqueeWithOrders(this.state.approvedOrders);
      }
    },

    setApprovedReviews(reviews) {
      if (!Array.isArray(reviews)) return;
      this.state.approvedReviews = reviews.slice(0, 10);
      if (typeof window.updateMarqueeReviews === 'function') {
        window.updateMarqueeReviews(this.state.approvedReviews);
      }
    },

    addApprovedOrder(order) {
      if (!order) return;
      const orderTitle = (typeof order === 'string' ? order : (order.name || order.productName || order.title || 'VIP Pack')).trim();
      const orderId = order.id || orderTitle;
      const filtered = this.state.approvedOrders.filter(o => {
        const id = o.id || (typeof o === 'string' ? o : o.name);
        return id !== orderId;
      });
      this.state.approvedOrders = [{ id: orderId, name: orderTitle, ...order }, ...filtered].slice(0, 15);
      if (typeof window.addOrderToMarquee === 'function') {
        window.addOrderToMarquee(orderTitle);
      }
    },

    addApprovedReview(rev) {
      if (!rev) return;
      const list = [rev, ...this.state.approvedReviews.filter(r => (r.id || r) !== (rev.id || rev))];
      this.state.approvedReviews = list.slice(0, 10);
      if (typeof window.updateMarqueeReviews === 'function') {
        window.updateMarqueeReviews(this.state.approvedReviews);
      }
    },

    setVisitorCount(count) {
      if (count !== undefined && !isNaN(Number(count))) {
        this.state.visitorsCount = Number(count);
        if (typeof window.updateMarqueeVisitors === 'function') {
          window.updateMarqueeVisitors({ today: count });
        }
      }
    },

    setTelegramClicks(count) {
      if (count !== undefined && !isNaN(Number(count))) {
        this.state.telegramClicks = Number(count);
        if (typeof window.updateMarqueeTelegram === 'function') {
          window.updateMarqueeTelegram(count);
        }
      }
    },

    recordTelegramClick() {
      this.state.telegramClicks = (Number(this.state.telegramClicks) || 0) + 1;
      if (typeof window.updateMarqueeTelegram === 'function') {
        window.updateMarqueeTelegram(this.state.telegramClicks);
      }
      try {
        const today = new Date().toISOString().slice(0, 10);
        const storedKey = `linkadda_tg_clicks_${today}`;
        const prev = Number(localStorage.getItem(storedKey) || 0);
        localStorage.setItem(storedKey, String(prev + 1));
      } catch (_) {}
    }
  };

  window.__linkaddaToast = toastEngine;

  // Initial startup: ensure bottom toasts are gone and local stats hydrated
  setTimeout(() => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const localTg = Number(localStorage.getItem(`linkadda_tg_clicks_${today}`) || 0);
      if (localTg > 0) toastEngine.setTelegramClicks(localTg);
      
      const cachedSettings = localStorage.getItem('linkadda_settings_cache');
      if (cachedSettings) {
        toastEngine.updateConfig(JSON.parse(cachedSettings));
      }
    } catch (_) {}

    toastEngine.start();
  }, 100);
})();

// ===== HERO SPOTLIGHT on mousemove =====
const heroSection = document.querySelector('.hero');
if (heroSection && pointerEffectsEnabled()) {
  const updateHeroSpotlight = rafThrottle((e) => {
    const rect = heroSection.getBoundingClientRect();
    heroSection.style.setProperty('--spotlight-x', (e.clientX - rect.left) + 'px');
    heroSection.style.setProperty('--spotlight-y', (e.clientY - rect.top) + 'px');
  });
  heroSection.addEventListener('pointermove', updateHeroSpotlight, { passive: true });
}

// ===== PARTICLE BURST on button click =====
document.querySelectorAll('.btn-primary, .btn-card, .btn-card-action, .btn-add-cart, .cpb-btn, .cpb-btn-cart').forEach(btn => {
  btn.addEventListener('click', function(e) {
    for (let i = 0; i < 12; i++) {
      const burst = document.createElement('div');
      const angle = (i / 12) * 360;
      const dist  = 60 + Math.random() * 40;
      const size  = 4 + Math.random() * 4;
      const color = ['#e84393','#7c3aed','#f472b6','#f59e0b'][Math.floor(Math.random()*4)];
      burst.style.cssText = `
        position:fixed;
        left:${e.clientX}px; top:${e.clientY}px;
        width:${size}px; height:${size}px;
        border-radius:50%;
        background:${color};
        pointer-events:none;
        z-index:9999;
        transform:translate(-50%,-50%);
        animation: burstAnim 0.6s ease forwards;
        --bx:${Math.cos(angle * Math.PI/180) * dist}px;
        --by:${Math.sin(angle * Math.PI/180) * dist}px;
        box-shadow: 0 0 ${size*2}px ${color};
      `;
      document.body.appendChild(burst);
      setTimeout(() => burst.remove(), 700);
    }
  });
});

// Inject burst keyframe
const burstStyle = document.createElement('style');
burstStyle.textContent = `@keyframes burstAnim { to { transform: translate(calc(-50% + var(--bx)), calc(-50% + var(--by))); opacity:0; } }`;
document.head.appendChild(burstStyle);

// ===== EXIT INTENT POPUP =====
(function() {
  // Build popup HTML — always constructed so elements and listeners exist permanently
  const overlay = document.createElement('div');
  overlay.className = 'exit-overlay';
  overlay.innerHTML = `
    <div class="exit-popup-vip">
      <!-- Ribbon Tag (Top Left) -->
      <div class="exit-ribbon-tag">
        <i class="fa-solid fa-crown exit-ribbon-crown"></i>
        <span class="exit-ribbon-text">LIMITED<br>TIME<br>OFFER</span>
      </div>

      <!-- Top Right Script & Close Button -->
      <div class="exit-top-right">
        <div class="exit-cursive-script">Premium Content<br>For You</div>
        <button class="exit-close" id="exitClose" aria-label="Close offer"><i class="fa-solid fa-xmark"></i></button>
      </div>

      <!-- Avatar with Glowing White Ring (Verified badge is already in the asset) -->
      <div class="exit-avatar-area">
        <div class="exit-avatar-glow-ring">
          <img src="images/popup-avatar-circle.png" alt="Trusted Brother" class="exit-avatar-img" />
        </div>
      </div>

      <!-- Brand Header -->
      <div class="exit-brand-header">
        <span class="exit-brand-wing">&#x2039;&#x2605;&#x203A;</span>
        <span class="exit-brand-title">TRUSTED BROTHER</span>
        <span class="exit-brand-wing">&#x2039;&#x2605;&#x203A;</span>
        <span class="exit-brand-gem"><i class="fa-solid fa-shield"></i></span>
      </div>
      <div class="exit-brand-sub">PREMIUM CONTENT MARKETPLACE</div>

      <!-- Confetti Particles -->
      <div class="exit-confetti-wrap" aria-hidden="true">
        <span class="confetti c1"></span>
        <span class="confetti c2"></span>
        <span class="confetti c3"></span>
        <span class="confetti c4"></span>
        <span class="confetti c5"></span>
        <span class="confetti c6"></span>
      </div>

      <!-- Inner Deal Card -->
      <div class="exit-card-inner">
        <!-- Floating 3D Gift on Left -->
        <div class="exit-float-gift" aria-hidden="true">
          <img src="images/popup-gift-3d.png" alt="Special Offer" />
        </div>

        <!-- Floating 3D Medal Badge on Right -->
        <div class="exit-float-badge" aria-hidden="true">
          <img src="images/popup-badge-3d.png" alt="Trusted Brother Badge" />
        </div>

        <!-- Pinned Deal Tag -->
        <div class="exit-deal-pill"><i class="fa-solid fa-thumbtack"></i> PINNED DEAL</div>

        <!-- Diamond App Icon -->
        <div class="exit-diamond-tile">
          <i class="fa-solid fa-gem"></i>
        </div>

        <!-- Deal Title -->
        <h2 class="exit-deal-title">All Collection Pack</h2>

        <!-- Deal Subtitle -->
        <p class="exit-deal-desc"><span class="exit-fire">&#x1F525;</span> Mega Pack &#8212; 3Lakh + Videos | Every category bundled together &#8212; the ultimate deal.</p>

        <!-- Pricing Section -->
        <div class="exit-discount-box">
          <div class="old-price">&#8377;35000+</div>
          <div class="new-price">
            <span class="price-inr">&#8377;27000</span>
            <span class="price-sep"> / </span>
            <span class="price-usd">$1499</span>
          </div>
          <div class="save-tag" style="display:none;"></div>
        </div>

        <!-- Main Claim Deal Button -->
        <a href="payment.html?productId=all-collection-pack&slug=all-collection-pack&name=All%20Collection%20Pack&inr=27000&usd=1499" class="btn-claim-deal" id="exitClaimBtn">
          <i class="fa-solid fa-gem"></i> Claim Deal <i class="fa-solid fa-chevron-right"></i>
        </a>

        <!-- Like Pill Button -->
        <button type="button" class="btn-like-pill" id="exitLikeBtn">
          <span class="like-heart">&#x2764;&#xFE0F;</span> Like <strong class="like-count">12.4K</strong>
        </button>

        <!-- 4 Perks Grid -->
        <div class="exit-perks-row">
          <div class="exit-perk-col">
            <div class="perk-icon perk-private"><i class="fa-solid fa-shield-halved"></i></div>
            <span>100%<br>Private</span>
          </div>
          <div class="exit-perk-col">
            <div class="perk-icon perk-access"><i class="fa-solid fa-bolt"></i></div>
            <span>Instant<br>Access</span>
          </div>
          <div class="exit-perk-col">
            <div class="perk-icon perk-categories"><i class="fa-solid fa-infinity"></i></div>
            <span>All<br>Categories</span>
          </div>
          <div class="exit-perk-col">
            <div class="perk-icon perk-value"><i class="fa-solid fa-heart"></i></div>
            <span>Best<br>Value</span>
          </div>
        </div>
      </div>

      <!-- Hidden skip button for existing JS compatibility -->
      <button class="exit-skip" id="exitSkip" style="display:none;" aria-hidden="true"></button>
    </div>
  `;
  document.body.appendChild(overlay);

  function showExitPopup(force = false) {
    if (!force && sessionStorage.getItem('exitShown')) return;
    try {
      let b = window.liveCollections?.banner;
      if (!b) {
        const cached = localStorage.getItem('linkadda_cached_live_data_v4') || localStorage.getItem('linkadda_cached_live_data');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed && parsed.banner) b = parsed.banner;
        }
      }
      if (b && (b.priceOfferINR || b.priceOriginal)) {
        const oldEl = overlay.querySelector('.old-price');
        const inrEl = overlay.querySelector('.price-inr');
        const usdEl = overlay.querySelector('.price-usd');
        const titleEl = overlay.querySelector('.exit-deal-title');
        const descEl = overlay.querySelector('.exit-deal-desc');
        const inr = b.priceOfferINR ? (String(b.priceOfferINR).startsWith('₹') ? b.priceOfferINR : '₹' + b.priceOfferINR) : '₹27000';
        const usd = b.priceOfferUSD ? (String(b.priceOfferUSD).startsWith('$') ? b.priceOfferUSD : '$' + b.priceOfferUSD) : '$1499';
        const orig = b.priceOriginal ? (String(b.priceOriginal).startsWith('₹') ? b.priceOriginal : '₹' + b.priceOriginal) : '₹35000+';
        if (orig && oldEl) oldEl.textContent = `${orig}`;
        if (inr && inrEl) inrEl.textContent = `${inr}`;
        if (usd && usdEl) usdEl.textContent = `${usd}`;
        if (b.title && titleEl) titleEl.textContent = b.title;
        if (b.subtitle && descEl) descEl.innerHTML = `<span class="exit-fire">&#x1F525;</span> ${b.subtitle}`;
      }
    } catch (_) {}
    overlay.classList.add('active');
    sessionStorage.setItem('exitShown', '1');
  }
  window.openOfferPopup = function(force = true) {
    showExitPopup(force);
  };

  function closeExitPopup() {
    overlay.classList.remove('active');
  }

  // Trigger on mouse leaving to top of page
  document.addEventListener('mouseleave', (e) => {
    if (e.clientY <= 10) showExitPopup();
  });

  // Close buttons
  document.getElementById('exitClose')?.addEventListener('click', closeExitPopup);
  document.getElementById('exitSkip')?.addEventListener('click', closeExitPopup);

  // Close on overlay click outside popup
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeExitPopup();
  });

  // Interactive Like Button
  const likeBtn = overlay.querySelector('#exitLikeBtn');
  if (likeBtn) {
    let likes = parseInt(localStorage.getItem('exit_deal_likes') || '12400', 10);
    let isLiked = localStorage.getItem('exit_deal_is_liked') === '1';
    const countEl = likeBtn.querySelector('.like-count');
    const heartEl = likeBtn.querySelector('.like-heart');

    function renderLikeState() {
      likeBtn.classList.toggle('liked', isLiked);
      if (heartEl) {
        heartEl.innerHTML = isLiked ? '&#x2764;&#xFE0F;' : '&#x2661;';
      }
      if (countEl) {
        countEl.textContent = isLiked ? '12.5K' : '12.4K';
      }
    }
    renderLikeState();

    likeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      isLiked = !isLiked;
      likes = isLiked ? 12500 : 12400;
      localStorage.setItem('exit_deal_likes', String(likes));
      localStorage.setItem('exit_deal_is_liked', isLiked ? '1' : '0');

      likeBtn.classList.add('like-pop');
      setTimeout(() => likeBtn.classList.remove('like-pop'), 350);

      renderLikeState();
    });
  }

  // Main Claim Deal Button — redirect directly to payment page with full details
  const claimBtn = overlay.querySelector('#exitClaimBtn');
  if (claimBtn) {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.protocol === 'file:';
    const ext = isLocal ? '.html' : '';
    const targetUrl = `payment${ext}?productId=all-collection-pack&slug=all-collection-pack&name=${encodeURIComponent('All Collection Pack')}&inr=27000&usd=1499`;
    claimBtn.setAttribute('href', targetUrl);
    claimBtn.dataset.productId = 'all-collection-pack';
    claimBtn.dataset.name = 'All Collection Pack';
    claimBtn.dataset.inr = '27000';
    claimBtn.dataset.usd = '1499';

    claimBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();

      try {
        if (window.__linkaddaDb && window.__linkaddaDbRef && window.__linkaddaDbPush) {
          const todayDateStr = new Date().toISOString().slice(0, 10);
          const clickMeta = {
            type: 'order_click',
            page: 'exit_offer_popup',
            productId: 'all-collection-pack',
            productName: 'All Collection Pack',
            amountINR: 27000,
            amountUSD: 1499,
            date: todayDateStr,
            timestamp: Date.now()
          };
          window.__linkaddaDbPush(window.__linkaddaDbRef(window.__linkaddaDb, 'events'), clickMeta);
          window.__linkaddaDbPush(window.__linkaddaDbRef(window.__linkaddaDb, 'visitors'), clickMeta);
        }
      } catch (_) {}

      closeExitPopup();
      window.location.href = targetUrl;
    });
  }

  // Wire click on Pinned Deal Banner on the page to open the VIP offer popup
  document.addEventListener('click', (e) => {
    const bannerTarget = e.target.closest('#pinnedDealWrapper, .collection-pack-banner');
    if (bannerTarget && !e.target.closest('.cpb-btn-cart, .btn-add-cart')) {
      e.preventDefault();
      e.stopPropagation();
      showExitPopup(true);
    }
  }, true);

  // Also trigger on mobile with back button / visibility change
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      sessionStorage.setItem('exitShown', '1');
    }
  });
})();

// ===== FAQ ACCORDION =====
document.querySelectorAll('.faq-item').forEach(item => {
  const btn = item.querySelector('.faq-q');
  btn.addEventListener('click', () => {
    const isOpen = item.classList.contains('open');
    // close all
    document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('open'));
    // open clicked if it was closed
    if (!isOpen) item.classList.add('open');
  });
});

// ===== SCREENSHOT & COPY PROTECTION =====
(function() {
  // Skip protection on localhost so developer can inspect console errors
  const isLocal = window.location.hostname === 'localhost' || 
                  window.location.hostname === '127.0.0.1' || 
                  window.location.hostname.startsWith('192.168.') ||
                  window.location.hostname.startsWith('10.') ||
                  window.location.hostname.endsWith('.local');
  if (isLocal) return;

  // Warning toast helper
  function showProtectToast(msg) {
    let t = document.querySelector('.protect-toast');
    if (!t) {
      t = document.createElement('div');
      t.className = 'protect-toast';
      document.body.appendChild(t);
    }
    t.innerHTML = `<i class="fa-solid fa-shield-halved"></i> ${msg}`;
    t.classList.add('show');
    clearTimeout(t._timer);
    t._timer = setTimeout(() => t.classList.remove('show'), 2500);
  }

  // Disable right click
  document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    showProtectToast('Content is protected. Right click disabled.');
  });

  // Disable text selection via keyboard (Ctrl+A, Ctrl+C, Ctrl+U, Ctrl+S, F12)
  document.addEventListener('keydown', (e) => {
    const blocked = (
      (e.ctrlKey && ['a','c','u','s','p'].includes(e.key.toLowerCase())) ||
      e.key === 'F12' ||
      (e.ctrlKey && e.shiftKey && ['i','j','c'].includes(e.key.toLowerCase()))
    );
    if (blocked) {
      e.preventDefault();
      showProtectToast('Content is protected. This action is disabled.');
    }
  });

  // Disable drag
  document.addEventListener('dragstart', (e) => e.preventDefault());

  // Disable print
  window.addEventListener('beforeprint', (e) => {
    e.preventDefault();
    showProtectToast('Printing is disabled on this site.');
  });

  // DevTools open detection (basic)
  let devOpen = false;
  const devCheck = setInterval(() => {
    const threshold = 160;
    if (
      window.outerWidth - window.innerWidth > threshold ||
      window.outerHeight - window.innerHeight > threshold
    ) {
      if (!devOpen) {
        devOpen = true;
        showProtectToast('DevTools detected. Content is protected.');
      }
    } else {
      devOpen = false;
    }
  }, 1000);
})();

// ===== THEME MANAGER (DARK / LIGHT MODE & SYSTEM AUTO-DEDICATION) =====
(function() {
  const THEME_KEY = 'linkadda_theme';
  const MANUAL_KEY = 'linkadda_theme_manual';

  function getSystemTheme() {
    try {
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
      }
    } catch (_) {}
    return 'light';
  }

  function getActiveTheme() {
    try {
      const isManual = localStorage.getItem(MANUAL_KEY);
      const savedTheme = localStorage.getItem(THEME_KEY);
      if (isManual && savedTheme) {
        return savedTheme;
      }
    } catch (_) {}
    return 'light';
  }

  function updateButtonUI(theme) {
    const toggleBtn = document.getElementById('themeToggleBtn');
    const label = document.getElementById('themeToggleLabel');
    if (toggleBtn) {
      if (theme === 'light') {
        toggleBtn.classList.add('is-light');
        if (label) label.textContent = 'Dark Mode';
      } else {
        toggleBtn.classList.remove('is-light');
        if (label) label.textContent = 'Light Mode';
      }
    }
  }

  function applyTheme(theme, isManualAction) {
    document.documentElement.setAttribute('data-theme', theme);
    document.body.setAttribute('data-theme', theme);

    if (isManualAction) {
      try {
        localStorage.setItem(MANUAL_KEY, 'true');
        localStorage.setItem(THEME_KEY, theme);
      } catch (_) {}
    }

    updateButtonUI(theme);
    window.dispatchEvent(new CustomEvent('linkadda:themechange', { detail: { theme } }));
  }

  function initTheme() {
    const initialTheme = getActiveTheme();
    applyTheme(initialTheme, false);

    const toggleBtn = document.getElementById('themeToggleBtn');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', function(e) {
        e.preventDefault();
        const current = document.documentElement.getAttribute('data-theme') || 'dark';
        const next = current === 'light' ? 'dark' : 'light';
        applyTheme(next, true);
      });
    }

    // Auto-listen to system device changes in real-time
    if (window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: light)');
      const handleSystemChange = function(e) {
        try {
          const isManual = localStorage.getItem(MANUAL_KEY);
          // Follow system theme if the user hasn't explicitly set manual preference
          if (!isManual) {
            const systemTheme = e.matches ? 'light' : 'dark';
            applyTheme(systemTheme, false);
          }
        } catch (_) {}
      };

      if (typeof mediaQuery.addEventListener === 'function') {
        mediaQuery.addEventListener('change', handleSystemChange);
      } else if (typeof mediaQuery.addListener === 'function') {
        mediaQuery.addListener(handleSystemChange);
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTheme);
  } else {
    initTheme();
  }
})();