
/* ==================================
   DATA & JOURNAL HUB
   PIN AUTHENTICATION
================================== */

const authScreen = document.getElementById("authScreen");
const authTitle = document.getElementById("authTitle");
const authMessage = document.getElementById("authMessage");
const pinInput = document.getElementById("pinInput");
const authButton = document.getElementById("authButton");

let authMode = "login";
let firstPin = "";
let failedAttempts = 0;
let lockUntil = 0;

function showAuthScreen(mode) {

    authMode = mode;

    authScreen.style.display = "flex";

    document.querySelector(".app").style.display = "none";

    pinInput.value = "";
    authMessage.textContent = "";

    if (mode === "setup") {

        authTitle.textContent = "Create Your PIN";
        authMessage.textContent =
            "Create a private PIN of at least 6 digits.";

        authButton.textContent = "Continue";

    } else if (mode === "confirm") {

        authTitle.textContent = "Confirm Your PIN";
        authMessage.textContent =
            "Enter your PIN again to confirm.";

        authButton.textContent = "Confirm PIN";

    } else {

        authTitle.textContent = "Welcome Back";
        authMessage.textContent =
            "Enter PIN to unlock your workspace.";

        authButton.textContent = "Unlock Workspace";
    }
updateForgotPinButton();
}

/* ---------- OFFER RECOVERY SETUP ---------- */

async function offerHubRecoverySetup(pin) {

    const saved = localStorage.getItem(HUB_CONFIG);

    if (!saved) return;

    const config = JSON.parse(saved);

    if (config.version === 2) return;

    if (!confirm(
        "Protect your workspace with a recovery phrase now?"
    )) {
        return;
    }

    const phrase = prompt(
        "Create a private recovery phrase (at least 12 characters). Store it somewhere safe."
    );

    if (phrase === null) return;

    const confirmation = prompt(
        "Enter your recovery phrase again to confirm."
    );

    if (confirmation === null) return;

    if (
        phrase.trim().toLowerCase() !==
        confirmation.trim().toLowerCase()
    ) {
        authMessage.textContent =
            "Recovery phrases did not match. You can set one up after logging in.";

        return;
    }

    try {

        await enableHubRecovery(pin, phrase);

        authMessage.textContent =
            "Recovery protection configured successfully.";

    } catch (error) {

        authMessage.textContent =
            "Recovery setup failed: " + error.message;
    }
}


async function handleAuthentication() {

    const pin = pinInput.value.trim();

    if (Date.now() < lockUntil) {

        const seconds = Math.ceil(
            (lockUntil - Date.now()) / 1000
        );

        authMessage.textContent =
            "Please wait " + seconds + " seconds.";

        return;
    }

    if (!/^\d{6,}$/.test(pin)) {

        authMessage.textContent =
            "Enter at least 6 digits.";

        return;
    }

    authButton.disabled = true;

    try {

        if (authMode === "setup") {

            firstPin = pin;

            showAuthScreen("confirm");

        } else if (authMode === "confirm") {

            if (pin !== firstPin) {

                firstPin = "";

                authMessage.textContent =
                    "PINs do not match. Start again.";

                showAuthScreen("setup");

                return;
            }

            await setupHubVault(pin);

await offerHubRecoverySetup(pin);

firstPin = "";

openWorkspace();

        } else {

            await unlockHubVault(pin);

failedAttempts = 0;

openWorkspace();
        }

    } catch (error) {

        if (authMode === "login") {

            failedAttempts++;

            authMessage.textContent =
                "Incorrect PIN. Attempt " +
                failedAttempts + " of 5.";

            if (failedAttempts >= 5) {

                failedAttempts = 0;

                lockUntil = Date.now() + 30000;

                authMessage.textContent =
                    "Too many attempts. Wait 30 seconds.";
            }

        } else {

            authMessage.textContent =
                error.message || "Authentication failed.";
        }

    } finally {

        authButton.disabled = false;
        pinInput.value = "";
    }

}

function openWorkspace() {
   authScreen.style.display = "none";

    document.querySelector(".app").style.display = "flex";

    startAutoLock();

    if (typeof loadJournalEntries === "function") {
        loadJournalEntries();
    }
   if (typeof loadDataForms === "function") {
    loadDataForms();
  }
      if (typeof loadMainDashboard === "function") {
        loadMainDashboard();
    }
}

function startAutoLock() {

    clearTimeout(window.hubLockTimer);

    window.hubLockTimer = setTimeout(() => {

        lockWorkspace();

    }, 5 * 60 * 1000);

}

function lockWorkspace() {

    clearTimeout(window.hubLockTimer);

    lockHubVault();

    showAuthScreen("login");

}

/* AUTHENTICATION BUTTON */

authButton.addEventListener(
    "click",
    handleAuthentication
);

/* ENTER KEY SUPPORT */

pinInput.addEventListener("keydown", event => {

    if (event.key === "Enter") {
        handleAuthentication();
    }

});

/* AUTO LOCK ON APP BACKGROUND */

document.addEventListener("visibilitychange", () => {

    if (document.hidden && isHubVaultUnlocked()) {

        lockWorkspace();

    }

});

/* START APPLICATION */

window.addEventListener("DOMContentLoaded", () => {

    if (isHubVaultConfigured()) {

        showAuthScreen("login");

    } else {

        showAuthScreen("setup");

    }

});

/* ---------- SHOW / HIDE PIN ---------- */

function togglePinVisibility(button) {

    if (pinInput.type === "password") {

        pinInput.type = "text";
        button.textContent = "🙈 Hide PIN";

    } else {

        pinInput.type = "password";
        button.textContent = "⚽️ Show PIN";

    }

}


function updateForgotPinButton() {

    const button = document.getElementById("forgotPinButton");

    if (!button) return;

    const saved = localStorage.getItem(HUB_CONFIG);

    if (!saved) {
        button.style.display = "none";
        return;
    }

    const config = JSON.parse(saved);

    button.style.display =
        config.version === 2 ? "block" : "none";
}


/* ---------- FORGOT PIN BUTTON ---------- */

function addForgotPinButton() {

    if (document.getElementById("forgotPinButton")) {
        return;
    }

    const button = document.createElement("button");

    button.id = "forgotPinButton";
    button.type = "button";
    button.textContent = "Forgot PIN? Recover Workspace";

    button.style.cssText = `
        width:100%;
        margin-top:14px;
        padding:13px;
        border:1px solid #2563eb;
        border-radius:10px;
        background:transparent;
        color:#2563eb;
        font-weight:600;
        cursor:pointer;
    `;

    button.onclick = async function () {

        const phrase = prompt(
            "Enter your private recovery phrase:"
        );

        if (phrase === null) return;

        const newPin = prompt(
            "Enter your new PIN (at least 6 digits):"
        );

        if (newPin === null) return;

        const confirmPin = prompt(
            "Enter your new PIN again:"
        );

        if (confirmPin === null) return;

        if (newPin !== confirmPin) {
            authMessage.textContent =
                "The new PINs do not match.";
            return;
        }

        button.disabled = true;

        try {

            await recoverHubVault(phrase, newPin);

            failedAttempts = 0;

            authMessage.textContent =
                "PIN recovered successfully.";

            openWorkspace();

        } catch (error) {

            authMessage.textContent = error.message;

        } finally {

            button.disabled = false;
        }
    };

    authButton.insertAdjacentElement("afterend", button);
updateForgotPinButton();
}

window.addEventListener("DOMContentLoaded", () => {
    addForgotPinButton();
});

