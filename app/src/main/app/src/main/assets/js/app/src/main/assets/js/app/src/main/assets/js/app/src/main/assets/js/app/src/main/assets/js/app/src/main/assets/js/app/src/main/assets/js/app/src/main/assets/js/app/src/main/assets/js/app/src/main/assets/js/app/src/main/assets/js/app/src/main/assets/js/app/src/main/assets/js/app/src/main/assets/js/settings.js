
/* =========================================
   DATA & JOURNAL HUB
   SETTINGS MANAGEMENT ENGINE
========================================= */

const HUB_SETTINGS_KEY = "DJH_WORKSPACE_SETTINGS";

function getWorkspaceSettings() {
    try {
        return JSON.parse(
            localStorage.getItem(HUB_SETTINGS_KEY)
        ) || {};
    } catch (error) {
        return {};
    }
}

/* ---------- SAVE SETTINGS ---------- */

function saveWorkspaceSettings(settings) {
    const current = getWorkspaceSettings();

    const updated = {
        ...current,
        ...settings
    };

    localStorage.setItem(
        HUB_SETTINGS_KEY,
        JSON.stringify(updated)
    );

    return updated;
}

/* ---------- WORKSPACE PROFILE ---------- */

function saveWorkspaceProfile() {
 
  const name = document.getElementById(
        "settingWorkspaceName"
    ).value.trim();

    const description = document.getElementById(
        "settingWorkspaceDescription"
    ).value.trim();

    if (!name) {
        alert("Please enter a workspace name.");
        return;
    }

    saveWorkspaceSettings({
        workspaceName: name,
        workspaceDescription: description
    });

    document.getElementById("settingsStatus").textContent =
        "Workspace profile saved successfully.";
}

/* ---------- APPEARANCE ---------- */



function applyAppearanceSettings() {
    const settings = getWorkspaceSettings();

    const theme = settings.theme || "light";
    const accent = settings.accent || "#2864dc";

    const root = document.documentElement;

    root.dataset.hubTheme = theme;

    const dark = theme === "dark";

    const colors = {
        bg: dark ? "#101827" : "#f3f5f9",
        surface: dark ? "#1c293b" : "#ffffff",
        text: dark ? "#f1f5f9" : "#202b3c",
        muted: dark ? "#aab7c8" : "#8490a2",
        border: dark ? "#34445a" : "#e8ecf2",
        input: dark ? "#26364b" : "#ffffff"
    };

    root.style.setProperty("--bg", colors.bg);
    root.style.setProperty("--white", colors.surface);
    root.style.setProperty("--text", colors.text);
    root.style.setProperty("--muted", colors.muted);
    root.style.setProperty("--border", colors.border);
    root.style.setProperty("--primary", accent);

    let style = document.getElementById("hubAppearanceStyles");

    if (!style) {
        style = document.createElement("style");
        style.id = "hubAppearanceStyles";
        document.head.appendChild(style);
    }

    style.textContent = `
        body,
        .main {
            background: ${colors.bg} !important;
            color: ${colors.text} !important;
        }

        .panel,
        .stat-card,
        .account-card,
        .profile,
        .action {
            background: ${colors.surface} !important;
            color: ${colors.text} !important;
            border-color: ${colors.border} !important;
        }

        h1, h2, h3, h4, label,
        .panel p,
        .stat-card p {
            color: ${colors.text} !important;
        }

        .section-heading p,
        .topbar p,
        .stat-card small {
            color: ${colors.muted} !important;
        }

        input,
        select,
        textarea {
            background: ${colors.input} !important;
            color: ${colors.text} !important;
            border: 1px solid ${colors.border} !important;
        }

        button:not(.danger):not(.delete) {
            background: ${accent} !important;
            border-color: ${accent} !important;
            color: #ffffff !important;
        }

        .sidebar {
            background: #101b2d !important;
        }

        [data-hub-theme="dark"] .empty {
            color: ${colors.muted} !important;
        }

        [data-hub-theme="dark"] .sidebar,
        [data-hub-theme="dark"] .sidebar * {
            color: #ffffff;
        }
    `;
}



function saveAppearanceSettings() {
    const theme = document.getElementById(
        "settingTheme"
    ).value;

    const accent = document.getElementById(
        "settingAccent"
    ).value;

    saveWorkspaceSettings({
        theme,
        accent
    });

    applyAppearanceSettings();

    document.getElementById("settingsStatus").textContent =
        "Appearance settings saved successfully.";
}

/* ---------- LOAD SETTINGS ---------- */

function loadWorkspaceSettings() {
    const settings = getWorkspaceSettings();

    document.getElementById(
        "settingWorkspaceName"
    ).value = settings.workspaceName || "ALL FOUNDATION GROUP";

    document.getElementById(
        "settingWorkspaceDescription"
    ).value = settings.workspaceDescription ||
        "Data & Journal Management Hub";

    document.getElementById(
        "settingTheme"
    ).value = settings.theme || "light";

    document.getElementById(
        "settingAccent"
    ).value = settings.accent || "#2864dc";

    applyAppearanceSettings();
}

/* ---------- STORAGE INFORMATION ---------- */

async function loadSettingsStorageInfo() {
  
  console.log("Storage refresh started");

console.log("Vault unlocked:", isHubVaultUnlocked());

console.log("Database function:", typeof listHubRecords);
  const container = document.getElementById(
        "settingsStorageInfo"
    );

    try {
        if (typeof isHubVaultUnlocked === "function" &&
            !isHubVaultUnlocked()) {
            container.textContent =
                "Unlock your workspace to view storage information.";
            return;
        }

        const records = await listHubRecords();

        const total = records.length;

        const categories = {};

        records.forEach(record => {
            const type = record.type || "other";

            categories[type] = (categories[type] || 0) + 1;
        });

        container.innerHTML = `
            <h4>Total Stored Records: ${total}</h4>

            <div style="margin-top:12px;">
                ${Object.entries(categories).map(([type, count]) => `
                    <p style="padding:7px 0;border-bottom:1px solid #ddd;">
                        <strong>${reportSafeSettingsText(type)}</strong>:
                        ${count}
                    </p>
                `).join("")}
            </div>

            <p style="margin-top:12px;font-size:12px;">
                Your records are stored in this device's local database.
            </p>
        `;

    } catch (error) {
        console.error("Storage information error:", error);

        container.textContent =
            "Could not load storage information.";
    }
}

function reportSafeSettingsText(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

/* ---------- CHANGE PIN ---------- */

async function openChangePinSettings() {

    if (!isHubVaultUnlocked()) {
        alert("Unlock your workspace first.");
        return;
    }

    const currentPin = prompt("Enter your current PIN:");

    if (currentPin === null) return;

    const newPin = prompt("Enter your new PIN (at least 6 digits):");

    if (newPin === null) return;

    if (!/^\d{6,}$/.test(newPin)) {
        alert("Your new PIN must contain at least 6 digits.");
        return;
    }

    const confirmPin = prompt("Confirm your new PIN:");

    if (confirmPin === null) return;

    if (newPin !== confirmPin) {
        alert("The new PINs do not match.");
        return;
    }

    if (currentPin === newPin) {
        alert("Your new PIN must be different.");
        return;
    }

    try {
        await changeHubVaultPin(currentPin, newPin);

        document.getElementById("settingsStatus").textContent =
            "Workspace PIN changed successfully.";

        alert("Your workspace PIN has been changed successfully.");

    } catch (error) {
        console.error("PIN change error:", error);
        alert("PIN change failed: " + error.message);
    }
}

/* ---------- INITIALIZE ---------- */

document.addEventListener("DOMContentLoaded", function () {
    loadWorkspaceSettings();
});
