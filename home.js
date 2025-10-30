import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js";
import { firebaseConfig } from "./RH/firebase-config.js";

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const modal = document.getElementById("finance-modal");
const form = document.getElementById("finance-login-form");
const feedback = document.getElementById("finance-login-feedback");
const submitBtn = form?.querySelector("button[type='submit']");
const openTrigger = document.querySelector("[data-open-finance]");
const closeTriggers = modal?.querySelectorAll("[data-modal-close]") ?? [];

const ALLOWED_PROFILES = ["FINANCEIRO", "COMPRAS"];

const originalBtnText = submitBtn?.textContent ?? "Entrar";

function toggleModal(open) {
  if (!modal) return;
  modal.classList.toggle("is-open", open);
  modal.setAttribute("aria-hidden", String(!open));
  document.body.style.overflow = open ? "hidden" : "";
  if (!open) {
    form?.reset();
    setFeedback("");
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = originalBtnText;
    }
  } else {
    const firstInput = form?.querySelector("input");
    requestAnimationFrame(() => firstInput?.focus());
  }
}

function setFeedback(message, type = "error") {
  if (!feedback) return;
  feedback.textContent = message;
  feedback.classList.remove("modal__feedback--success");
  if (!message) {
    return;
  }
  if (type === "success") {
    feedback.classList.add("modal__feedback--success");
  }
}

openTrigger?.addEventListener("click", () => toggleModal(true));

closeTriggers.forEach((el) => {
  el.addEventListener("click", () => toggleModal(false));
});

modal?.addEventListener("click", (event) => {
  if (event.target === modal) {
    toggleModal(false);
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && modal?.classList.contains("is-open")) {
    toggleModal(false);
  }
});

form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!submitBtn) return;

  const formData = new FormData(form);
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "").trim();

  if (!email || !password) {
    setFeedback("Preencha e-mail e senha para continuar.");
    return;
  }

  try {
    submitBtn.disabled = true;
    submitBtn.textContent = "Verificando...";
    setFeedback("");

    const credentials = await signInWithEmailAndPassword(auth, email, password);
    const userDoc = await getDoc(doc(db, "users", credentials.user.uid));

    const profileRaw = userDoc.exists() ? userDoc.data().financeiro : undefined;
    const profile = typeof profileRaw === "string" ? profileRaw.trim().toUpperCase() : null;

    if (!profile || !ALLOWED_PROFILES.includes(profile)) {
      setFeedback("Seu perfil não possui acesso ao Financeiro. Procure o administrador.");
      await signOut(auth);
      submitBtn.disabled = false;
      submitBtn.textContent = originalBtnText;
      return;
    }

    setFeedback("Acesso concedido! Redirecionando...", "success");
    submitBtn.textContent = "Redirecionando...";

    window.location.href = "FINANCEIRO/index.html";
  } catch (error) {
    console.error("Falha no login do Financeiro", error);
    const message = translateAuthError(error);
    setFeedback(message);
    submitBtn.disabled = false;
    submitBtn.textContent = originalBtnText;
  }
});

function translateAuthError(error) {
  const map = {
    "auth/invalid-email": "E-mail inválido.",
    "auth/invalid-credential": "Credenciais inválidas. Verifique seus dados e tente novamente.",
    "auth/user-not-found": "Usuário não encontrado.",
    "auth/wrong-password": "Senha incorreta.",
    "auth/too-many-requests": "Muitas tentativas. Aguarde um instante e tente novamente.",
    "auth/network-request-failed": "Não foi possível conectar. Verifique sua internet.",
  };
  const code = typeof error === "string" ? error : error?.code;
  if (code && map[code]) return map[code];
  return "Não foi possível acessar. Tente novamente.";
}
