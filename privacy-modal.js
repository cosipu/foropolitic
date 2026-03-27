(function initializePrivacyModal() {
  const STORAGE_KEY = "foropolitic.privacy.notice.v1";
  const waiters = [];
  let isInitialized = false;

  function getElements() {
    return {
      modal: document.getElementById("privacy-modal"),
      acceptButton: document.getElementById("privacy-modal-accept")
    };
  }

  function hasAccepted() {
    try {
      return window.sessionStorage.getItem(STORAGE_KEY) === "accepted";
    } catch (error) {
      return false;
    }
  }

  function markAccepted() {
    try {
      window.sessionStorage.setItem(STORAGE_KEY, "accepted");
    } catch (error) {
      return;
    }
  }

  function setVisible(isVisible) {
    const { modal, acceptButton } = getElements();
    if (!modal) {
      return;
    }

    modal.classList.toggle("is-hidden", !isVisible);
    modal.classList.toggle("is-visible", isVisible);
    modal.setAttribute("aria-hidden", String(!isVisible));
    document.body.classList.toggle("privacy-modal-open", isVisible);

    if (isVisible) {
      window.requestAnimationFrame(() => {
        acceptButton?.focus();
      });
    }
  }

  function resolveWaiters(value) {
    while (waiters.length > 0) {
      const resolve = waiters.shift();
      resolve(value);
    }
  }

  function initialize() {
    if (isInitialized) {
      return;
    }

    const { acceptButton } = getElements();
    if (!acceptButton) {
      return;
    }

    // El aviso bloquea la interfaz hasta que la sesión actual quede marcada como aceptada.
    acceptButton.addEventListener("click", () => {
      markAccepted();
      setVisible(false);
      resolveWaiters(true);
    });

    isInitialized = true;
  }

  async function ensureAccepted() {
    initialize();

    if (hasAccepted()) {
      return true;
    }

    const { modal } = getElements();
    if (!modal) {
      return true;
    }

    // Cualquier publicación pendiente espera esta promesa antes de continuar.
    setVisible(true);
    return new Promise((resolve) => {
      waiters.push(resolve);
    });
  }

  function promptIfNeeded() {
    if (!hasAccepted()) {
      void ensureAccepted();
    }
  }

  window.ForoPrivacy = {
    ensureAccepted,
    hasAccepted,
    promptIfNeeded
  };

  initialize();
})();