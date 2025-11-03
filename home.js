import { auth, db } from './FINANCEIRO/firebase-config.js';
import { signInWithEmailAndPassword, signOut } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js';
import { ALLOWED_PROFILES, extractFinanceProfiles, hasFinanceAccess } from './shared/finance-access.js';

const modal = document.getElementById('financeiro-modal');
const openBtn = document.getElementById('financeiro-card');
const form = document.getElementById('financeiro-login-form');
const emailInput = document.getElementById('financeiro-email');
const passwordInput = document.getElementById('financeiro-password');
const submitBtn = document.getElementById('financeiro-submit');
const feedback = document.getElementById('financeiro-feedback');
const closeControls = modal ? modal.querySelectorAll('[data-close-modal]') : [];

let lastFocusedElement = null;
const allowedProfilesText = ALLOWED_PROFILES
  .map((perfil) => `${perfil.charAt(0)}${perfil.slice(1).toLowerCase()}`)
  .join(' ou ');

const setFeedback = (message, type = 'info') => {
  if (!feedback) return;
  feedback.textContent = message;
  feedback.dataset.type = type;
  feedback.style.color = type === 'error' ? '#dc2626' : type === 'success' ? '#047857' : 'var(--muted)';
};

function toggleModal(open) {
  if (!modal) return;
  if (open) {
    lastFocusedElement = document.activeElement;
    modal.classList.add('is-open');
    setTimeout(() => emailInput?.focus(), 50);
  } else {
    modal.classList.remove('is-open');
    form?.reset();
    setFeedback('');
    if (submitBtn) submitBtn.disabled = false;
    if (lastFocusedElement) {
      lastFocusedElement.focus();
    }
  }
}

openBtn?.addEventListener('click', () => toggleModal(true));
closeControls?.forEach((ctrl) => ctrl.addEventListener('click', () => toggleModal(false)));

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && modal?.classList.contains('is-open')) {
    toggleModal(false);
  }
});

form?.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!emailInput || !passwordInput) return;

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password) {
    setFeedback('Preencha e-mail e senha para continuar.', 'error');
    return;
  }

  if (submitBtn) submitBtn.disabled = true;
  setFeedback('Validando credenciais...', 'info');

  try {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    setFeedback('Verificando permissões...', 'info');

    const profileRef = doc(db, 'users', credential.user.uid);
    const profileSnap = await getDoc(profileRef);

    if (!profileSnap.exists()) {
      throw new Error('Perfil não localizado. Solicite acesso ao administrador.');
    }

    const data = profileSnap.data() || {};
    const profiles = extractFinanceProfiles(data);
    console.debug('Perfis do usuário para Financeiro:', profiles);
    const isAuthorized = hasFinanceAccess(data);

    if (!isAuthorized) {
      await signOut(auth);
      throw new Error(`Acesso restrito. Este usuário não possui perfil ${allowedProfilesText}.`);
    }

    setFeedback('Acesso liberado! Redirecionando...', 'success');
    window.location.href = './FINANCEIRO/index.html';
  } catch (error) {
    console.error('Erro de login no Financeiro:', error);
    const message = error?.message || 'Não foi possível entrar. Verifique suas credenciais.';
    setFeedback(message, 'error');
  } finally {
    if (submitBtn) submitBtn.disabled = false;
  }
});
