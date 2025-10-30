const processedAttr = "data-help-bound";

function createHelpIcon(message) {
  const icon = document.createElement("button");
  icon.type = "button";
  icon.className = "help-icon";
  icon.textContent = "?";
  icon.setAttribute("aria-label", `Ajuda: ${message}`);
  icon.setAttribute("data-tooltip", message);
  icon.setAttribute("tabindex", "0");
  icon.addEventListener("click", () => {
    icon.classList.toggle("active");
  });
  icon.addEventListener("blur", () => {
    icon.classList.remove("active");
  });
  return icon;
}

function wrapField(field) {
  const message = field.getAttribute("data-help");
  if (!message) return;
  if (field.hasAttribute(processedAttr)) return;
  field.setAttribute(processedAttr, "true");

  const wrapper = document.createElement("div");
  wrapper.className = "field-help";

  const icon = createHelpIcon(message);

  const parent = field.parentElement;
  if (!parent) return;

  const labelSibling = field.previousElementSibling;
  if (labelSibling && labelSibling.tagName === "LABEL" && !labelSibling.classList.contains("field-help-label")) {
    labelSibling.classList.add("field-help-label");
  }

  parent.insertBefore(wrapper, field);
  wrapper.appendChild(field);
  wrapper.appendChild(icon);
}

export function setupHelpTooltips(scope = document) {
  scope.querySelectorAll("input[data-help], select[data-help], textarea[data-help]").forEach((field) => {
    wrapField(field);
  });
}

function initObserver() {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (!(node instanceof HTMLElement)) return;
        setupHelpTooltips(node);
      });
    });
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

document.addEventListener("DOMContentLoaded", () => {
  setupHelpTooltips();
  initObserver();
});

if (typeof window !== "undefined") {
  window.setupHelpTooltips = setupHelpTooltips;
}
