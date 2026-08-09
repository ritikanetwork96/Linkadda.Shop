import { readFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const ENV_PATH = path.join(ROOT, '.env');

function parseEnv(text) {
  const result = {};
  String(text || '')
    .split(/\r?\n/)
    .forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const index = trimmed.indexOf('=');
      if (index < 0) return;
      const key = trimmed.slice(0, index).trim();
      const value = trimmed.slice(index + 1).trim().replace(/^['"]|['"]$/g, '');
      result[key] = value;
    });
  return result;
}

const FAQ_ITEMS = [
  {
    question: "Kya yeh safe hai? Scam toh nahi?",
    answer: "Bilkul safe hai bhai. Main 2022 se sell kar raha hoon, 1,200+ orders complete ho chuke hain. Ek bhi scam case nahi. Tum pehle review dekh sakte ho, phir order karo.",
    status: "active",
    displayOrder: 1
  },
  {
    question: "Order karne ke baad kitne time mein milega?",
    answer: "Payment ke baad mostly 5–15 minutes ke andar Telegram pe deliver ho jaata hai. Kabhi kabhi zyada load ho toh max 1 ghanta lag sakta.",
    status: "active",
    displayOrder: 2
  },
  {
    question: "Payment kaise karni hai?",
    answer: "UPI, Paytm, GPay, PhonePe — sab accept karta hoon. International ke liye crypto ya other methods bhi available hain. Telegram pe DM karo, sab bata dunga.",
    status: "active",
    displayOrder: 3
  },
  {
    question: "Content ki quality kaisi hogi?",
    answer: "Premium 4K quality videos hain. Koi low-quality ya blurry content nahi. Jo dikhaya wahi milega — full HD aur 4K resolution mein.",
    status: "active",
    displayOrder: 4
  },
  {
    question: "Ek baar kharida toh lifetime access milega?",
    answer: "Haan, jo content kharidoge woh tumhara permanently rahega. Koi expiry nahi, koi renewal nahi. Ek baar pay karo, hamesha ke liye apna.",
    status: "active",
    displayOrder: 5
  },
  {
    question: "All Collection Pack mein kya kya milega?",
    answer: "Sabhi 23 categories ka full content ek saath milega — total 1,14,000+ videos. Yeh sabse best value deal hai. Alag alag kharido toh ₹10,900 lagenge, pack mein sirf ₹4,399.",
    status: "active",
    displayOrder: 6
  },
  {
    question: "Support kaise milega order ke baad?",
    answer: "24/7 Telegram pe available hoon. Koi bhi problem ho — delivery issue, quality concern — seedha DM karo, resolve kar dunga.",
    status: "active",
    displayOrder: 7
  }
];

const TESTIMONIAL_ITEMS = [
  {
    name: "New Buyer",
    rating: 5,
    photo: "",
    review: "Pehle bahut dar lag raha tha, socha tha yeh bhi scam kar lega baaki logo ki tarah. But bhai ne time pe deliver kiya, ekdum trusted hai. Ab regularly leta hoon!",
    status: "active",
    displayOrder: 1
  },
  {
    name: "New User",
    rating: 5,
    photo: "",
    review: "Sach mein pehle bahut doubt tha, itne saste mein kaisa hoga. But yeh bhai real deal hai — scam bilkul nahi, seedha kaam karta hai. 100% recommend!",
    status: "active",
    displayOrder: 2
  },
  {
    name: "Regular Buyer",
    rating: 5,
    photo: "",
    review: "Maine pehle dusre sellers se scam khaya tha toh trust nahi tha. Iss bhai ko try kiya toh maan gaya — bilkul genuine, fast delivery, aur price bhi market se kam. Thanks bhai!",
    status: "active",
    displayOrder: 3
  }
];

const HERO_DEFAULT = {
  title: "TRUSTED BROTHER\nCONTENT SELLER",
  subtitle: "Premium 4K quality videos at the cheapest price in the market. Trusted by thousands — fast delivery, zero compromise on quality.",
  primaryButtonText: "Browse Services",
  primaryButtonLink: "index.html#services",
  secondaryButtonText: "DM Now",
  secondaryButtonLink: "https://t.me/TRUSTED_BROTHER1234",
  stat1: "500+",
  stat2: "24/7",
  stat3: "100%",
  backgroundImage: "",
  status: "active",
  updatedAt: Date.now()
};

const BANNER_DEFAULT = {
  title: "All Prices in <span class=\"gradient-text\">Indian Rupees (&#8377;)</span>",
  offer: "No hidden fees. No foreign charges. Pay via UPI, Paytm, GPay, PhonePe & more.",
  buttonText: "Place an Order",
  link: "https://t.me/TRUSTED_BROTHER1234",
  image: "",
  status: "active",
  updatedAt: Date.now()
};

async function main() {
  const rawEnv = await readFile(ENV_PATH, 'utf8');
  const env = parseEnv(rawEnv);
  
  const firebaseApiKey = env.FIREBASE_API_KEY || env.apiKey || 'AIzaSyCD_cZXyfYd01FNg-DmRpyKKBIGR3NqeT4';
  const firebaseDbUrl = env.FIREBASE_DATABASE_URL || env.databaseURL || 'https://linkadda-cd1da-default-rtdb.firebaseio.com';
  const firebaseEmail = env.admin || env.ADMIN_EMAIL;
  const firebasePassword = env.password || env.ADMIN_PASSWORD;

  // Login
  const loginRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${firebaseApiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: firebaseEmail, password: firebasePassword, returnSecureToken: true }),
  });
  const loginData = await loginRes.json();
  if (!loginData.idToken) throw new Error('Firebase login failed');

  const auth = loginData.idToken;

  console.log('Seeding initial data into Firebase...');

  // 1. Seed Hero
  const heroRef = `${firebaseDbUrl}/hero.json?auth=${auth}`;
  const hr = await fetch(heroRef, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(HERO_DEFAULT)
  });
  console.log('Seeded Hero settings:', hr.status);

  // 2. Seed Banner
  const bannerRef = `${firebaseDbUrl}/banner.json?auth=${auth}`;
  const br = await fetch(bannerRef, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(BANNER_DEFAULT)
  });
  console.log('Seeded Banner settings:', br.status);

  // 3. Seed FAQ Items
  for (let i = 0; i < FAQ_ITEMS.length; i++) {
    const item = FAQ_ITEMS[i];
    const id = `faq_${i + 1}`;
    const faqItemRef = `${firebaseDbUrl}/faq/${id}.json?auth=${auth}`;
    const fr = await fetch(faqItemRef, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...item, id, createdAt: Date.now(), updatedAt: Date.now() })
    });
    console.log(`Seeded FAQ [${id}]:`, fr.status);
  }

  // 4. Seed Testimonials
  for (let i = 0; i < TESTIMONIAL_ITEMS.length; i++) {
    const item = TESTIMONIAL_ITEMS[i];
    const id = `testi_${i + 1}`;
    const testiItemRef = `${firebaseDbUrl}/testimonials/${id}.json?auth=${auth}`;
    const tr = await fetch(testiItemRef, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...item, id, createdAt: Date.now(), updatedAt: Date.now() })
    });
    console.log(`Seeded Testimonial [${id}]:`, tr.status);
  }

  console.log('Successfully completed data seeding.');
}

main().catch(console.error);
