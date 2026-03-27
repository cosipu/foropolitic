const PRIVACY_STORAGE_KEY = "foropolitic.privacy.notice.v1";
const privacyWaiters = [];
let privacyInitialized = false;

function getPrivacyElements() {
  return {
    modal: document.getElementById("privacy-modal"),
    acceptButton: document.getElementById("privacy-modal-accept")
  };
}

function hasAcceptedPrivacyNotice() {
  try {
    return window.sessionStorage.getItem(PRIVACY_STORAGE_KEY) === "accepted";
  } catch (error) {
    return false;
  }
}

function markPrivacyNoticeAccepted() {
  try {
    window.sessionStorage.setItem(PRIVACY_STORAGE_KEY, "accepted");
  } catch (error) {
    return;
  }
}

function setPrivacyModalVisibility(isVisible) {
  const { modal, acceptButton } = getPrivacyElements();
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

function initializePrivacyModal() {
  if (privacyInitialized) {
    return;
  }

  const { acceptButton } = getPrivacyElements();
  if (!acceptButton) {
    return;
  }

  // El aviso se confirma una sola vez por sesión y libera cualquier envío pendiente.
  acceptButton.addEventListener("click", () => {
    markPrivacyNoticeAccepted();
    setPrivacyModalVisibility(false);

    while (privacyWaiters.length > 0) {
      const resolve = privacyWaiters.shift();
      resolve(true);
    }
  });

  privacyInitialized = true;
}

function ensurePrivacyNoticeAccepted() {
  initializePrivacyModal();

  if (hasAcceptedPrivacyNotice()) {
    return Promise.resolve(true);
  }

  const { modal } = getPrivacyElements();
  if (!modal) {
    return Promise.resolve(true);
  }

  // Los formularios esperan esta promesa antes de enviar contenido al backend.
  setPrivacyModalVisibility(true);
  return new Promise((resolve) => {
    privacyWaiters.push(resolve);
  });
}

function getFormStatusElement(form) {
  return form.querySelector(".form-status");
}

function setStatus(form, message, isError) {
  const status = getFormStatusElement(form);

  if (!status) {
    return;
  }

  status.textContent = message || "";
  status.dataset.state = isError ? "error" : "ok";
}

function updateChallengeText(scope, challengeQuestion) {
  if (!challengeQuestion) {
    return;
  }

  scope.querySelectorAll("[data-challenge-label]").forEach((element) => {
    element.textContent = challengeQuestion;
  });
}

async function submitAsyncForm(event) {
  const form = event.target;
  event.preventDefault();

  const privacyAccepted = await ensurePrivacyNoticeAccepted();
  if (!privacyAccepted) {
    return;
  }

  const submitButton = form.querySelector("button[type='submit']");
  const formData = new FormData(form);
  const payload = Object.fromEntries(formData.entries());

  if (submitButton) {
    submitButton.disabled = true;
  }

  setStatus(form, "Enviando...", false);

  try {
    const response = await fetch(form.action, {
      method: form.method || "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    updateChallengeText(form, result.challengeQuestion);
    form.querySelectorAll("input[name='challengeAnswer']").forEach((input) => {
      input.value = "";
    });

    if (!response.ok) {
      setStatus(form, result.error || "No se pudo completar la solicitud.", true);
      return;
    }

    setStatus(form, "Publicado.", false);

    if (result.redirectTo) {
      window.location.assign(result.redirectTo);
      return;
    }

    window.location.reload();
  } catch (error) {
    setStatus(form, "Fallo de red o del servidor.", true);
  } finally {
    if (submitButton) {
      submitButton.disabled = false;
    }
  }
}

function attachReplyShortcuts() {
  const replyForm = document.querySelector("[data-reply-input]")?.closest("form");
  const replyInput = document.querySelector("[data-reply-input]");
  const replyTextarea = replyForm?.querySelector("textarea[name='content']");

  document.querySelectorAll("[data-reply-target]").forEach((button) => {
    button.addEventListener("click", () => {
      if (!replyInput || !replyTextarea) {
        return;
      }

      const targetId = button.getAttribute("data-reply-target");
      replyInput.value = targetId;

      if (!replyTextarea.value.includes(`>>${targetId}`)) {
        replyTextarea.value = `${replyTextarea.value}${replyTextarea.value ? "\n" : ""}>>${targetId}\n`;
      }

      replyTextarea.focus();
      replyTextarea.setSelectionRange(replyTextarea.value.length, replyTextarea.value.length);
      setStatus(replyForm, `Respuesta referenciada a >>${targetId}.`, false);
    });
  });
}

async function deletePost(postId) {
  const password = window.prompt("Contrasena de moderador:");

  if (!password) {
    return;
  }

  const basePath = document.body.dataset.basePath || "";
  const response = await fetch(`${basePath}/api/posts/${postId}`, {
    method: "DELETE",
    headers: {
      Accept: "application/json",
      "x-mod-password": password
    }
  });

  const result = await response.json();

  if (!response.ok) {
    window.alert(result.error || "No se pudo borrar el post.");
    return;
  }

  if (result.result?.wasOp) {
    window.location.assign(basePath || "/");
    return;
  }

  window.location.reload();
}

function attachDeleteButtons() {
  document.querySelectorAll("[data-delete-post]").forEach((button) => {
    button.addEventListener("click", async () => {
      const postId = button.getAttribute("data-delete-post");
      if (!postId) {
        return;
      }

      try {
        await deletePost(postId);
      } catch (error) {
        window.alert("No se pudo completar la moderacion.");
      }
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initializePrivacyModal();
  if (!hasAcceptedPrivacyNotice()) {
    void ensurePrivacyNoticeAccepted();
  }

  document.querySelectorAll("form[data-async-form]").forEach((form) => {
    form.addEventListener("submit", submitAsyncForm);
  });

  attachReplyShortcuts();
  attachDeleteButtons();
});