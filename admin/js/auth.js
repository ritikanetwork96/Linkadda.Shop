import {
  auth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
} from './firebase.js';
import { APP_CONFIG } from './config.js';
import { escapeHtml } from './utils.js';

export function mountLoginPage(root) {
  if (!root) return;
  root.innerHTML = `
    <div class="auth-shell">
      <div class="auth-card glass">
        <div class="auth-brand">
          <div class="auth-mark">L</div>
          <div>
            <h1>${escapeHtml(APP_CONFIG.appName)}</h1>
            <p>Secure admin access</p>
          </div>
        </div>
        <form id="loginForm" class="auth-form">
          <label>
            <span>Email</span>
            <input type="email" id="adminEmail" placeholder="admin@example.com" autocomplete="username" required />
          </label>
          <label>
            <span>Password</span>
            <input type="password" id="adminPassword" placeholder="Enter password" autocomplete="current-password" required />
          </label>
          <button type="submit" class="btn btn-primary btn-block">Sign In</button>
          <button type="button" id="forgotBtn" class="btn btn-ghost btn-block">Forgot Password</button>
          <p class="auth-note" id="authNote">Use your Firebase Auth admin account.</p>
        </form>
      </div>
    </div>
  `;

  const form = root.querySelector('#loginForm');
  const forgotBtn = root.querySelector('#forgotBtn');
  const note = root.querySelector('#authNote');

  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const email = root.querySelector('#adminEmail').value.trim();
    const password = root.querySelector('#adminPassword').value;
    note.textContent = 'Signing in...';
    try {
      await signInWithEmailAndPassword(auth, email, password);
      window.location.href = '/admin/';
    } catch (error) {
      note.textContent = error?.message || 'Login failed';
    }
  });

  forgotBtn?.addEventListener('click', async () => {
    const email = root.querySelector('#adminEmail').value.trim();
    if (!email) {
      note.textContent = 'Enter your email first.';
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      note.textContent = 'Password reset email sent.';
    } catch (error) {
      note.textContent = error?.message || 'Unable to send reset email';
    }
  });
}

export function protectRoute(onReady) {
  onAuthStateChanged(auth, (user) => {
    if (!user) {
      if (!/\/login(?:\.html)?\/?$/i.test(window.location.pathname)) {
        window.location.href = '/admin/login';
      }
      return;
    }
    if (typeof onReady === 'function') onReady(user);
  });
}

export async function logout() {
  await signOut(auth);
  window.location.href = '/admin/login';
}

export function whenAuthenticated(callback) {
  onAuthStateChanged(auth, (user) => {
    if (typeof callback === 'function') callback(user);
  });
}
