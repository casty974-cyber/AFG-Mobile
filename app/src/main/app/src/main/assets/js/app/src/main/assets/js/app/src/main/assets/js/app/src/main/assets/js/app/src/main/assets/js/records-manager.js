
let allManagedRecords = [];
let currentManagedRecord = null;

function rmEscape(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

async function loadManagedRecords() {
    const container = document.getElementById("recordsList");
    if (!container) return;

    container.innerHTML = "<p>Loading records...</p>";

    try {
        const records = await listHubRecords();

        allManagedRecords = (records || []).filter(record =>
            record.type === "journal" || record.type === "data"
        );

        renderManagedRecords();

    } catch (error) {
        console.error(error);
        container.innerHTML = "<p>Unable to load records.</p>";
    }
}

function renderManagedRecords() {
    const container = document.getElementById("recordsList");
    if (!container) return;

    const search = (
        document.getElementById("recordsSearch")?.value || ""
    ).toLowerCase();

    const filter =
        document.getElementById("recordsFilter")?.value || "all";

    const filtered = allManagedRecords.filter(record => {
        const data = record.data || {};
        return (
            (filter === "all" || record.type === filter) &&
            JSON.stringify(data).toLowerCase().includes(search)
        );
    });

    const count = document.getElementById("recordsCount");
    if (count) count.textContent = filtered.length;

    if (!filtered.length) {
        container.innerHTML = "<p>No matching records found.</p>";
        return;
    }

    container.innerHTML = filtered.map(record => {
        const data = record.data || {};

        const title =
            data.title ||
            data.formTitle ||
            data.activityName ||
            data.name ||
            (record.type === "journal"
                ? "Journal Entry"
                : "Data Submission");

        const date =
            data.date ||
            data.activityDate ||
            record.updatedAt ||
            record.createdAt ||
            "";

        return `
            <div class="panel" style="margin-bottom:12px;">
                <strong>${rmEscape(title)}</strong>

                <p style="font-size:12px;color:#888;">
                    ${record.type === "journal"
                        ? "Journal Entry"
                        : "Data Submission"}
                </p>

                <p style="font-size:12px;color:#888;">
                    ${rmEscape(date)}
                </p>

                <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;">

                    <button onclick="viewManagedRecord('${rmEscape(record.id)}')">
                        VIEW
                    </button>

                    <button onclick="editManagedRecord('${rmEscape(record.id)}')">
                        EDIT
                    </button>

                    <button onclick="removeManagedRecord('${rmEscape(record.id)}')">
                        DELETE
                    </button>

                </div>
            </div>
        `;
    }).join("");
}

async function viewManagedRecord(id) {
    try {
        const record = await getHubRecord(id);

        if (!record) {
            alert("Record not found.");
            return;
        }

        const data = record.data || {};

        const content = Object.entries(data)
            .map(([key, value]) => {
                if (typeof value === "object" && value !== null) {
                    value = JSON.stringify(value, null, 2);
                }

                return key + ":\n" + String(value ?? "");
            })
            .join("\n\n");

        alert(content || "No record details available.");

    } catch (error) {
        console.error(error);
        alert("Unable to open record.");
    }
}

async function editManagedRecord(id) {
    try {
        const record = await getHubRecord(id);

        if (!record) {
            alert("Record not found.");
            return;
        }

        currentManagedRecord = record;

        const data = record.data || {};

        const updatedText = prompt(
            "Edit record data in JSON format:",
            JSON.stringify(data, null, 2)
        );

        if (updatedText === null) return;

        let updatedData;

        try {
            updatedData = JSON.parse(updatedText);
        } catch {
            alert("Invalid JSON. Record was not changed.");
            return;
        }

        if (
            !updatedData ||
            typeof updatedData !== "object" ||
            Array.isArray(updatedData)
        ) {
            alert("Record must be a JSON object.");
            return;
        }

        await saveHubRecord(
            record.type,
            updatedData,
            record.id
        );

        currentManagedRecord = null;

        alert("Record updated successfully.");

        await loadManagedRecords();

    } catch (error) {
        console.error(error);
        alert("Unable to update record.");
    }
}

async function removeManagedRecord(id) {
    const confirmed = confirm(
        "Are you sure you want to delete this record? This action cannot be undone."
    );

    if (!confirmed) return;

    try {
        await deleteHubRecord(id);

        alert("Record deleted successfully.");

        await loadManagedRecords();

    } catch (error) {
        console.error(error);
        alert("Unable to delete record.");
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const search = document.getElementById("recordsSearch");
    const filter = document.getElementById("recordsFilter");

    search?.addEventListener("input", renderManagedRecords);
    filter?.addEventListener("change", renderManagedRecords);
});
