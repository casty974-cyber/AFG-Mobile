
/* =========================================
   DATA & JOURNAL HUB
   OFFLINE JOURNAL MANAGEMENT ENGINE
========================================= */

let editingJournalId = null;
let journalCache = [];

function journalEscape(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

function journalLocalDateTime() {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;

    return new Date(now.getTime() - offset)
        .toISOString()
        .slice(0, 16);
}

function journalReference() {
    return "JRN-" +
        Date.now().toString().slice(-9);
}

function resetJournalForm() {

    document.getElementById("journalForm").reset();

    document.getElementById("journalDate").value =
        journalLocalDateTime();

    document.getElementById("journalEditId").value = "";

    editingJournalId = null;

    document.getElementById("journalSaveButton")
        .textContent = "SAVE JOURNAL ENTRY";

}

async function saveJournalEntry(event) {

    event.preventDefault();

    if (!isHubVaultUnlocked()) {
        alert("Please unlock your workspace first.");
        return;
    }

    const saveButton =
        document.getElementById("journalSaveButton");

    saveButton.disabled = true;

    try {

        const id =
            document.getElementById("journalEditId").value || null;

        const existing = id
            ? await getHubRecord(id)
            : null;

        const data = {

            reference: existing?.data.reference ||
                journalReference(),

            date: document.getElementById("journalDate").value,

            category: document.getElementById("journalCategory").value,

            title: document.getElementById("journalTitle").value.trim(),

            description: document.getElementById("journalDescription").value.trim(),

            activities: document.getElementById("journalActivities").value.trim(),

            observations: document.getElementById("journalObservations").value.trim(),

            challenges: document.getElementById("journalChallenges").value.trim(),

            decisions: document.getElementById("journalDecisions").value.trim(),

            followUp: document.getElementById("journalFollowUp").value.trim(),

            status: document.getElementById("journalStatus").value

        };

        if (!data.title || !data.date || !data.category) {
            throw new Error("Complete all required fields.");
        }

        const recordId = await saveHubRecord(
            "journal",
            data,
            id
        );

        alert(
            existing
                ? "Journal entry updated successfully."
                : "Journal entry saved successfully."
        );

        resetJournalForm();

        await loadJournalEntries();

    } catch (error) {

        alert(error.message || "Unable to save journal entry.");

    } finally {

        saveButton.disabled = false;

    }

}

/* ---------- LOAD JOURNAL HISTORY ---------- */

async function loadJournalEntries() {

    if (!isHubVaultUnlocked()) return;

    try {

        journalCache = await listHubRecords("journal");

        renderJournalEntries();

    } catch (error) {

        console.error("Journal loading error:", error);

    }

}

/* ---------- DISPLAY JOURNAL ENTRIES ---------- */

function renderJournalEntries() {

    const container =
        document.getElementById("journalHistory");

    if (!container) return;

    const search =
        document.getElementById("journalSearch")
        .value.trim().toLowerCase();

    const filtered = journalCache.filter(entry => {

        const data = entry.data;

        return [
            data.title,
            data.category,
            data.description,
            data.activities,
            data.observations,
            data.challenges
        ].join(" ").toLowerCase().includes(search);

    });

    document.getElementById("journalTotal").textContent =
        journalCache.length;

    if (!filtered.length) {

        container.innerHTML = `
            <div class="empty">
                ${journalCache.length
                    ? "No matching journal entries found."
                    : "No journal entries yet. Create your first entry."}
            </div>
        `;

        return;
    }

    container.innerHTML = filtered.map(entry => {

        const data = entry.data;

        return `
            <div class="panel" style="margin-bottom:12px;">

                <div style="
                    display:flex;
                    justify-content:space-between;
                    gap:10px;
                    flex-wrap:wrap;
                ">

                    <div>

                        <small style="color:#8490a2;">
                            ${journalEscape(data.reference)}
                        </small>

                        <h3 style="margin:7px 0;">
                            ${journalEscape(data.title)}
                        </h3>

                        <small style="color:#8490a2;">
                            ${journalEscape(data.date)}
                            •
                            ${journalEscape(data.category)}
                        </small>

                    </div>

                    <button
                        onclick="editJournalEntry('${entry.id}')"
                        style="
                            padding:9px 14px;
                            border:1px solid #dce2eb;
                            background:white;
                            border-radius:7px;
                            height:36px;
                        ">
                        EDIT
                    </button>

                </div>

                <p style="
                    font-size:12px;
                    margin-top:15px;
                    line-height:1.7;
                    white-space:pre-wrap;
                ">
                    ${journalEscape(data.description)}
                </p>

                <div style="
                    margin-top:12px;
                    font-size:11px;
                    color:#8490a2;
                ">
                    STATUS: ${journalEscape(data.status)}
                </div>

            </div>
        `;

    }).join("");

}

/* ---------- EDIT JOURNAL ENTRY ---------- */

async function editJournalEntry(id) {

    try {

        const entry = await getHubRecord(id);

        if (!entry || entry.type !== "journal") {
            throw new Error("Journal entry not found.");
        }

        const data = entry.data;

        editingJournalId = id;

        document.getElementById("journalEditId").value = id;

        document.getElementById("journalDate").value = data.date;

        document.getElementById("journalCategory").value = data.category;

        document.getElementById("journalTitle").value = data.title;

        document.getElementById("journalDescription").value = data.description;

        document.getElementById("journalActivities").value = data.activities;

        document.getElementById("journalObservations").value = data.observations;

        document.getElementById("journalChallenges").value = data.challenges;

        document.getElementById("journalDecisions").value = data.decisions;

        document.getElementById("journalFollowUp").value = data.followUp;

        document.getElementById("journalStatus").value = data.status;

        document.getElementById("journalSaveButton")
            .textContent = "UPDATE JOURNAL ENTRY";

        document.getElementById("journalForm")
            .scrollIntoView({ behavior: "smooth" });

    } catch (error) {

        alert(error.message);

    }

}

/* ---------- INITIALIZE JOURNAL ---------- */

function initializeJournal() {

    const form = document.getElementById("journalForm");

    if (!form) return;

    form.addEventListener("submit", saveJournalEntry);

    document.getElementById("journalSearch")
        .addEventListener("input", renderJournalEntries);

    document.getElementById("journalNewButton")
        .addEventListener("click", resetJournalForm);

    resetJournalForm();

}

document.addEventListener("DOMContentLoaded", () => {
    initializeJournal();
});
