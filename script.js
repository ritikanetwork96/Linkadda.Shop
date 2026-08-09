// ===== LOADING SCREEN =====
(function() {
  const wrap    = document.getElementById('loaderWrap');
  const bar     = document.getElementById('loaderBar');
  const pct     = document.getElementById('loaderPct');
  const lParts  = document.getElementById('loaderParticles');
  const colors  = ['#e84393','#7c3aed','#f472b6','#a855f7','#f59e0b'];
  document.body.classList.add('loading');

  // Spawn loader particles
  function spawnLP() {
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
    setTimeout(() => p.remove(), 10000);
  }
  const lpInterval = setInterval(spawnLP, 300);
  for (let i = 0; i < 15; i++) spawnLP();

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
    // Fast at first, slow in middle, fast at end
    const increment = progress < 30 ? 3 : progress < 70 ? 1.2 : progress < 90 ? 0.8 : 3;
    progress = Math.min(progress + increment, 100);

    bar.style.width = progress + '%';
    pct.textContent = Math.floor(progress) + '%';

    // Change message at checkpoints
    if (progress >= 25  && progress < 26)  subEl.textContent = messages[1];
    if (progress >= 65  && progress < 66)  subEl.textContent = messages[2];
    if (progress >= 95  && progress < 96)  subEl.textContent = messages[3];

    if (progress >= 100) {
      clearInterval(timer);
      clearInterval(lpInterval);
      setTimeout(() => {
        wrap.classList.add('hide');
        document.body.classList.remove('loading');
        setTimeout(() => wrap.remove(), 700);
      }, 400);
    }
  }, 30);
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
const particleInterval = finePointer() ? 420 : 700;
setInterval(createParticle, particleInterval);
const particleBurstCount = finePointer() ? 20 : 10;
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
      heroSub.insertBefore(document.createTextNode(originalText[i]), cursor);
      i++;
      setTimeout(typeChar, typeSpeed);
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
document.querySelectorAll('.btn-primary, .btn-card, .btn-contact, .btn-header, .btn-ghost').forEach(btn => {
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
const shootingStarInterval = finePointer() ? 2200 : 3200;
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
document.querySelectorAll('.btn-primary, .btn-card, .cpb-btn').forEach(btn => {
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

// ===== CARD SLIDESHOW (auto-sliding) =====
(function () {
  const INTERVAL = 3000;

  function initSlideshow(wrap) {
    const slides = Array.from(wrap.querySelectorAll('.pslide'));
    if (slides.length <= 1) return;
    const dotsWrap = wrap.querySelector('.pslide-dots');
    if (!dotsWrap) return;

    slides.forEach((_, i) => {
      const d = document.createElement('span');
      d.className = 'pslide-dot' + (i === 0 ? ' active' : '');
      dotsWrap.appendChild(d);
    });

    let current = 0;
    let timer = null;

    function goTo(idx) {
      slides[current].classList.remove('pslide-active');
      dotsWrap.querySelectorAll('.pslide-dot')[current].classList.remove('active');
      current = (idx + slides.length) % slides.length;
      slides[current].classList.add('pslide-active');
      dotsWrap.querySelectorAll('.pslide-dot')[current].classList.add('active');
    }

    function startAuto() { timer = setInterval(() => goTo(current + 1), INTERVAL); }
    function stopAuto()  { clearInterval(timer); }

    startAuto();
    wrap.addEventListener('mouseenter', stopAuto);
    wrap.addEventListener('mouseleave', startAuto);

    wrap._ssGoTo      = goTo;
    wrap._ssGetCurrent = function() { return current; };
    wrap._ssGetSlides  = function() { return slides; };
  }

  function initAll() {
    document.querySelectorAll('.pcard-slideshow').forEach(function(wrap) {
      if (wrap.dataset.ssInit) return;
      wrap.dataset.ssInit = '1';
      initSlideshow(wrap);
    });
  }

  initAll();
  setTimeout(initAll, 1000);
})();

// ===== LIGHTBOX =====
(function () {
  const overlay  = document.getElementById('lightboxOverlay');
  const content  = document.getElementById('lightboxContent');
  const caption  = document.getElementById('lightboxCaption');
  const closeBtn = document.getElementById('lightboxClose');
  const canFullscreen = Boolean(document.fullscreenEnabled || overlay.requestFullscreen || document.documentElement.requestFullscreen);

  const hint = document.createElement('div');
  hint.className = 'lightbox-hint';
  hint.textContent = 'Swipe, use arrows, or tap outside to close';
  overlay.appendChild(hint);

  const prevBtn = document.createElement('button');
  prevBtn.className = 'lb-arrow lb-arrow-prev';
  prevBtn.innerHTML = '<i class="fa-solid fa-chevron-left"></i>';
  overlay.appendChild(prevBtn);

  const nextBtn = document.createElement('button');
  nextBtn.className = 'lb-arrow lb-arrow-next';
  nextBtn.innerHTML = '<i class="fa-solid fa-chevron-right"></i>';
  overlay.appendChild(nextBtn);

  const controls = document.createElement('div');
  controls.className = 'lb-controls';

  const zoomOutBtn = document.createElement('button');
  zoomOutBtn.className = 'lb-tool';
  zoomOutBtn.type = 'button';
  zoomOutBtn.title = 'Zoom out';
  zoomOutBtn.setAttribute('aria-label', 'Zoom out');
  zoomOutBtn.innerHTML = '<i class="fa-solid fa-magnifying-glass-minus"></i>';

  const zoomResetBtn = document.createElement('button');
  zoomResetBtn.className = 'lb-tool';
  zoomResetBtn.type = 'button';
  zoomResetBtn.title = 'Reset zoom';
  zoomResetBtn.setAttribute('aria-label', 'Reset zoom');
  zoomResetBtn.innerHTML = '<i class="fa-solid fa-rotate-left"></i>';

  const zoomInBtn = document.createElement('button');
  zoomInBtn.className = 'lb-tool';
  zoomInBtn.type = 'button';
  zoomInBtn.title = 'Zoom in';
  zoomInBtn.setAttribute('aria-label', 'Zoom in');
  zoomInBtn.innerHTML = '<i class="fa-solid fa-magnifying-glass-plus"></i>';

  const fullscreenBtn = document.createElement('button');
  fullscreenBtn.className = 'lb-tool';
  fullscreenBtn.type = 'button';
  fullscreenBtn.title = 'Fullscreen';
  fullscreenBtn.setAttribute('aria-label', 'Fullscreen');
  fullscreenBtn.innerHTML = '<i class="fa-solid fa-expand"></i>';
  fullscreenBtn.style.display = canFullscreen ? '' : 'none';

  controls.appendChild(zoomOutBtn);
  controls.appendChild(zoomResetBtn);
  controls.appendChild(zoomInBtn);
  controls.appendChild(fullscreenBtn);
  overlay.appendChild(controls);

  const lbDotsWrap = document.createElement('div');
  lbDotsWrap.className = 'lb-dots';
  overlay.appendChild(lbDotsWrap);

  let lbImages  = [];
  let lbCurrent = 0;
  let lbSlides  = [];
  let lbScale   = 1;
  const MIN_SCALE = 1;
  const MAX_SCALE = 2.5;
  const SCALE_STEP = 0.25;
  let dragStartX = 0;
  let dragStartY = 0;
  let dragActive = false;

  function buildLightboxSlides() {
    content.innerHTML  = '';
    lbDotsWrap.innerHTML = '';
    lbSlides = [];

    lbImages.forEach(function(src, i) {
      const slide = document.createElement('div');
      slide.className = 'lb-slide' + (i === 0 ? ' lb-active' : '');
      const img = document.createElement('img');
      img.src = src;
      img.alt = '';
      img.draggable = false;
      slide.appendChild(img);
      content.appendChild(slide);
      lbSlides.push(slide);

      const dot = document.createElement('span');
      dot.className = 'lb-dot' + (i === 0 ? ' active' : '');
      (function(idx) { dot.addEventListener('click', function() { lbGoTo(idx); }); })(i);
      lbDotsWrap.appendChild(dot);
    });

    const multi = lbImages.length > 1;
    prevBtn.style.display    = multi ? '' : 'none';
    nextBtn.style.display    = multi ? '' : 'none';
    lbDotsWrap.style.display = multi ? '' : 'none';
    setZoom(1);
  }

  function setZoom(value) {
    lbScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, value));
    content.style.setProperty('--lb-scale', String(lbScale));
    content.classList.toggle('lb-zoomed', lbScale > 1);
  }

  function lbGoTo(idx, keepZoom) {
    if (!lbSlides.length) return;
    lbSlides[lbCurrent].classList.remove('lb-active');
    lbDotsWrap.querySelectorAll('.lb-dot')[lbCurrent].classList.remove('active');
    lbCurrent = (idx + lbSlides.length) % lbSlides.length;
    lbSlides[lbCurrent].classList.add('lb-active');
    lbDotsWrap.querySelectorAll('.lb-dot')[lbCurrent].classList.add('active');
    if (!keepZoom) setZoom(1);
  }

  function toggleFullscreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen?.().catch(function () {});
      return;
    }
    if (overlay.requestFullscreen) {
      overlay.requestFullscreen().catch(function () {});
    } else if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(function () {});
    }
  }

  function syncFullscreenIcon() {
    if (!canFullscreen) return;
    fullscreenBtn.innerHTML = document.fullscreenElement
      ? '<i class="fa-solid fa-compress"></i>'
      : '<i class="fa-solid fa-expand"></i>';
  }

  function openLightbox(imgWrap) {
    if (imgWrap.classList.contains('pcard-slideshow')) {
      lbImages  = Array.from(imgWrap.querySelectorAll('.pslide img')).map(function(img) { return img.src; });
      lbCurrent = imgWrap._ssGetCurrent ? imgWrap._ssGetCurrent() : 0;
    } else {
      const img = imgWrap.querySelector('img');
      lbImages  = img ? [img.src] : [];
      lbCurrent = 0;
    }

    buildLightboxSlides();

    if (lbCurrent > 0) {
      lbSlides[0].classList.remove('lb-active');
      lbDotsWrap.querySelectorAll('.lb-dot')[0].classList.remove('active');
      lbSlides[lbCurrent].classList.add('lb-active');
      lbDotsWrap.querySelectorAll('.lb-dot')[lbCurrent].classList.add('active');
    }

    var card  = imgWrap.closest('.pcard');
    var title = card ? card.querySelector('.pcard-title') : null;
    caption.textContent = title ? title.textContent.trim() : '';

    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
    setZoom(1);
  }

  function closeLightbox() {
    if (document.fullscreenElement) {
      document.exitFullscreen?.().catch(function () {});
    }
    overlay.classList.remove('active');
    document.body.style.overflow = '';
  }

  prevBtn.addEventListener('click', function(e) { e.stopPropagation(); lbGoTo(lbCurrent - 1); });
  nextBtn.addEventListener('click', function(e) { e.stopPropagation(); lbGoTo(lbCurrent + 1); });
  closeBtn.addEventListener('click', closeLightbox);
  zoomOutBtn.addEventListener('click', function(e) { e.stopPropagation(); setZoom(lbScale - SCALE_STEP); });
  zoomResetBtn.addEventListener('click', function(e) { e.stopPropagation(); setZoom(1); });
  zoomInBtn.addEventListener('click', function(e) { e.stopPropagation(); setZoom(lbScale + SCALE_STEP); });
  fullscreenBtn.addEventListener('click', function(e) { e.stopPropagation(); toggleFullscreen(); });
  overlay.addEventListener('click', function(e) { if (e.target === overlay) closeLightbox(); });
  document.addEventListener('fullscreenchange', syncFullscreenIcon);

  document.addEventListener('keydown', function(e) {
    if (!overlay.classList.contains('active')) return;
    if (e.key === 'Escape')      closeLightbox();
    if (e.key === 'ArrowLeft')   lbGoTo(lbCurrent - 1);
    if (e.key === 'ArrowRight')  lbGoTo(lbCurrent + 1);
    if (e.key === '+' || e.key === '=') setZoom(lbScale + SCALE_STEP);
    if (e.key === '-' || e.key === '_') setZoom(lbScale - SCALE_STEP);
    if (e.key === '0') setZoom(1);
  });

  var touchStartX = 0;
  overlay.addEventListener('touchstart', function(e) {
    touchStartX = e.touches[0].clientX;
  }, { passive: true });
  overlay.addEventListener('touchend', function(e) {
    var dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) > 50) lbGoTo(lbCurrent + (dx < 0 ? 1 : -1));
  });

  content.addEventListener('pointerdown', function(e) {
    dragActive = true;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
  });

  content.addEventListener('pointerup', function(e) {
    if (!dragActive) return;
    dragActive = false;
    var dx = e.clientX - dragStartX;
    var dy = e.clientY - dragStartY;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.15) {
      lbGoTo(lbCurrent + (dx < 0 ? 1 : -1));
    }
  });

  content.addEventListener('pointerleave', function() {
    dragActive = false;
  });

  function initLightbox() {
    document.querySelectorAll('.pcard .pcard-img-wrap').forEach(function(wrap) {
      if (wrap.dataset.lightboxBound) return;
      wrap.dataset.lightboxBound = '1';
      wrap.addEventListener('click', function() { openLightbox(wrap); });
      wrap.addEventListener('dblclick', function(e) {
        e.preventDefault();
        openLightbox(wrap);
      });
    });
  }

  initLightbox();
  setTimeout(initLightbox, 1500);
})();
// ===== VIDEO TIER SELECTOR =====
(function () {
  const tierLists = document.querySelectorAll('.vid-tier-list');
  tierLists.forEach(function (list) {
    const btnId = list.id.replace('vidTier', 'vidBtn');
    const btn = document.getElementById(btnId);
    const items = list.querySelectorAll('.vid-tier-item');

    items.forEach(function (item) {
      item.addEventListener('click', function () {
        items.forEach(function (i) { i.classList.remove('vid-tier-selected'); });
        item.classList.add('vid-tier-selected');

        const vids = item.dataset.vids;
        const inr  = item.dataset.inr;
        const usd  = item.dataset.usd;
        const name = btn.dataset.name;

        btn.textContent = '';
        const icon = document.createElement('i');
        icon.className = 'fa-brands fa-telegram';
        btn.appendChild(icon);
        btn.appendChild(document.createTextNode(' Buy Now – ' + vids + ' Videos ₹' + inr));
        btn.href = 'payment.html';
      });
    });
  });
})();
