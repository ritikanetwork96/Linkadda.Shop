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

  // Instant smooth completion on window load
  window.addEventListener('load', () => {
    progress = Math.max(progress, 90);
  }, { once: true });
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
const header = document.getElementById('header');
const progressBar = document.createElement('div');
progressBar.className = 'scroll-progress';
document.body.prepend(progressBar);
const updateScrollState = () => {
  const scrollY = window.scrollY || window.pageYOffset || 0;
  if (header) {
    header.classList.toggle('scrolled', scrollY > 40);
  }
  const maxScroll = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
  const pct = Math.max(0, Math.min(100, (scrollY / maxScroll) * 100));
  progressBar.style.width = pct + '%';
};
const requestScrollStateUpdate = rafThrottle(updateScrollState);
window.addEventListener('scroll', requestScrollStateUpdate, { passive: true });
window.addEventListener('resize', requestScrollStateUpdate, { passive: true });
updateScrollState();

// ===== AURORA BACKGROUND =====
const aurora = document.createElement('div');
aurora.className = 'aurora';
aurora.innerHTML = '<div class="aurora-blob"></div><div class="aurora-blob"></div><div class="aurora-blob"></div>';
document.body.prepend(aurora);

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

// ===== FLOATING TELEGRAM BADGE =====
const badge = document.createElement('a');
badge.href = 'https://t.me/TRUSTED_BROTHER1234';
badge.target = '_blank';
badge.className = 'floating-badge';
badge.innerHTML = '<i class="fa-brands fa-telegram"></i>';
badge.title = 'DM on Telegram';
document.body.appendChild(badge);

// ===== SECTION DIVIDERS =====
document.querySelectorAll('section').forEach(sec => {
  const div = document.createElement('div');
  div.className = 'section-divider';
  sec.after(div);
});

// ===== MOBILE MENU =====
const menuToggle = document.getElementById('menuToggle');
const mobileNav  = document.getElementById('mobileNav');
menuToggle.addEventListener('click', () => {
  mobileNav.classList.toggle('open');
  const icon = menuToggle.querySelector('i');
  icon.classList.toggle('fa-bars');
  icon.classList.toggle('fa-xmark');
});
mobileNav.querySelectorAll('.mob-link').forEach(link => {
  link.addEventListener('click', () => {
    mobileNav.classList.remove('open');
    const icon = menuToggle.querySelector('i');
    icon.classList.add('fa-bars');
    icon.classList.remove('fa-xmark');
  });
});

// ===== PARTICLES =====
const particlesContainer = document.getElementById('particles');
const colors = ['#e84393', '#7c3aed', '#f472b6', '#a855f7'];

function createParticle() {
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
const particleInterval = finePointer() ? 1200 : 2000;
setInterval(createParticle, particleInterval);
const particleBurstCount = finePointer() ? 10 : 5;
for (let i = 0; i < particleBurstCount; i++) createParticle();

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
  '.why-card, .cat-card, .pcard, .testi-card, .contact-card, .section-head, .hero-stats, .pb-content'
);
revealEls.forEach(el => el.classList.add('reveal'));
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry, idx) => {
    if (entry.isIntersecting) {
      setTimeout(() => entry.target.classList.add('visible'), idx * 80);
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.1 });
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

// ===== MARQUEE TICKER =====
const marqueeItems = [
  { icon: 'fa-solid fa-fire-flame-curved', text: '1,14,000+ Videos' },
  { icon: 'fa-solid fa-gem',               text: 'Cheapest Price Ever' },
  { icon: 'fa-solid fa-shield-halved',     text: 'Trusted Since 3 Years' },
  { icon: 'fa-solid fa-bolt',              text: 'Instant Delivery' },
  { icon: 'fa-brands fa-telegram',         text: '24/7 Telegram Support' },
  { icon: 'fa-solid fa-4k',                text: '4K Quality Content' },
  { icon: 'fa-solid fa-star',              text: '500+ Happy Customers' },
  { icon: 'fa-solid fa-lock',              text: '100% Trusted Seller' },
];
function buildMarquee() {
  const wrap = document.createElement('div');
  wrap.className = 'marquee-wrap';
  const track = document.createElement('div');
  track.className = 'marquee-track';
  // duplicate for seamless loop
  [...marqueeItems, ...marqueeItems].forEach(item => {
    const el = document.createElement('span');
    el.className = 'marquee-item';
    el.innerHTML = `<i class="${item.icon}"></i>${item.text}<span class="marquee-dot"></span>`;
    track.appendChild(el);
  });
  wrap.appendChild(track);
  // Insert after hero section
  const hero = document.querySelector('.hero');
  if (hero) hero.after(wrap);
}
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

// ===== TOAST NOTIFICATIONS =====
const toastMessages = [
  { icon: 'fa-solid fa-fire-flame-curved', msg: 'New order received just now!' },
  { icon: 'fa-solid fa-star',              msg: 'Someone just left a 5-star review!' },
  { icon: 'fa-brands fa-telegram',         msg: '3 people DM\'d on Telegram today!' },
  { icon: 'fa-solid fa-bolt',              msg: 'Mega Pack claimed by a buyer!' },
];
let toastIdx = 0;
function showToast() {
  const drawer = document.getElementById('cartDrawer');
  if (drawer && drawer.classList.contains('open')) {
    return; // Don't show toast popups when cart drawer is open
  }
  const data = toastMessages[toastIdx % toastMessages.length];
  toastIdx++;
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<i class="${data.icon}"></i><span>${data.msg}</span>`;
  document.body.appendChild(toast);
  requestAnimationFrame(() => { requestAnimationFrame(() => { toast.classList.add('show'); }); });
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 500);
  }, 3500);
}
setTimeout(() => {
  showToast();
  setInterval(showToast, finePointer() ? 7000 : 10000);
}, 4000);

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
  // Don't show again in same session if already seen
  if (sessionStorage.getItem('exitShown')) return;

  // Build popup HTML
  const overlay = document.createElement('div');
  overlay.className = 'exit-overlay';
  overlay.innerHTML = `
    <div class="exit-popup">
      <button class="exit-close" id="exitClose"><i class="fa-solid fa-xmark"></i></button>
      <span class="exit-popup-icon">
        <i class="fa-solid fa-gem" style="background:linear-gradient(135deg,#f59e0b,#e84393);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;"></i>
      </span>
      <h2>Wait! Don't <span class="gradient-text">Miss This</span></h2>
      <p>You're leaving without grabbing the best deal in the market. Mega Pack — 1,14,000+ videos at an unbeatable price. Only for today!</p>
      <div class="exit-discount-box">
        <div class="old-price">Original Price: ₹10,900 / $392</div>
        <div class="new-price">₹4,399 <span style="font-size:1.1rem;opacity:0.8;">/ $109</span></div>
        <div class="save-tag">You save ₹6,501 — Cheapest in the market!</div>
      </div>
      <a href="https://t.me/TRUSTED_BROTHER1234" target="_blank" class="btn-primary">
        <i class="fa-brands fa-telegram"></i> Claim Deal on Telegram
      </a>
      <button class="exit-skip" id="exitSkip">No thanks, I'll pay full price later</button>
    </div>
  `;
  document.body.appendChild(overlay);

  function showExitPopup() {
    if (sessionStorage.getItem('exitShown')) return;
    overlay.classList.add('active');
    sessionStorage.setItem('exitShown', '1');
  }

  function closeExitPopup() {
    overlay.classList.remove('active');
  }

  // Trigger on mouse leaving to top of page
  document.addEventListener('mouseleave', (e) => {
    if (e.clientY <= 10) showExitPopup();
  });

  // Close buttons
  document.getElementById('exitClose').addEventListener('click', closeExitPopup);
  document.getElementById('exitSkip').addEventListener('click', closeExitPopup);

  // Close on overlay click outside popup
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeExitPopup();
  });

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