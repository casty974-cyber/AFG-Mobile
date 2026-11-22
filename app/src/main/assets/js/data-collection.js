
/* =========================================
   DATA & JOURNAL HUB
   CUSTOM DATA COLLECTION ENGINE
========================================= */

let dataFormsCache = [];
let builderFields = [];
let activeDataForm = null;

function dcEscape(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

/* ---------- FIELD BUILDER ---------- */

function addCollectionField() {

    const label = document.getElementById("fieldLabel")
        .value.trim();

    const type = document.getElementById("fieldType").value;

    const required = document.getElementById("fieldRequired").checked;

    if (!label) {
        alert("Enter a field name first.");
        return;
    }

    builderFields.push({
        label,
        type,
        required
    });

    document.getElementById("fieldLabel").value = "";

    document.getElementById("fieldRequired").checked = false;

    renderBuilderFields();
}

function removeCollectionField(index) {

    builderFields.splice(index, 1);

    renderBuilderFields();
}

function renderBuilderFields() {

    const container = document.getElementById("builderFieldList");

    if (!container) return;

    if (!builderFields.length) {
        container.innerHTML =
            '<div class="empty">No fields added yet.</div>';
        return;
    }

    container.innerHTML = builderFields.map((field, index) => `
        <div style="
            padding:12px;
            margin-bottom:8px;
            border:1px solid #e8ecf2;
            border-radius:8px;
            display:flex;
            justify-content:space-between;
            align-items:center;
            gap:10px;
        ">
            <div>
                <strong>${dcEscape(field.label)}</strong>
                <div style="font-size:11px;color:#8490a2;">
                    ${dcEscape(field.type)}
                    ${field.required ? " • Required" : " • Optional"}
                </div>
            </div>

            <button type="button"
                onclick="removeCollectionField(${index})">
                Remove
            </button>
        </div>
    `).join("");
}

/* ---------- SAVE FORM DEFINITION ---------- */

async function saveDataForm(event) {

    event.preventDefault();

    if (!isHubVaultUnlocked()) {
        alert("Unlock your workspace first.");
        return;
    }

    const name = document.getElementById("formName")
        .value.trim();

    const description = document.getElementById("formDescription")
        .value.trim();

    if (!name) {
        alert("Enter a form name.");
        return;
    }

    if (!builderFields.length) {
        alert("Add at least one field.");
        return;
    }

    const button = document.getElementById("createFormButton");

    button.disabled = true;

    try {

        await saveHubRecord("form", {
            name,
            description,
            fields: builderFields.map(field => ({...field})),
            createdAt: new Date().toISOString()
        });

        alert("Custom form created successfully.");

        document.getElementById("formBuilder").reset();

        builderFields = [];

        renderBuilderFields();

        await loadDataForms();

    } catch (error) {

        alert(error.message || "Unable to create form.");

    } finally {

        button.disabled = false;

    }
}

/* ---------- LOAD CREATED FORMS ---------- */

async function loadDataForms() {

    if (!isHubVaultUnlocked()) return;

    try {

        dataFormsCache = await listHubRecords("form");

        renderDataForms();

    } catch (error) {

        console.error("Form loading error:", error);

    }
}

function renderDataForms() {

    const container = document.getElementById("createdForms");

    if (!container) return;

    document.getElementById("formTotal").textContent =
        dataFormsCache.length;

    if (!dataFormsCache.length) {

        container.innerHTML =
            '<div class="empty">No custom forms created yet.</div>';

        return;
    }

    container.innerHTML = dataFormsCache.map(form => {

        const data = form.data;

        return `
            <div class="panel" style="margin-bottom:12px;">

                <h3>${dcEscape(data.name)}</h3>

                <p style="font-size:12px;color:#8490a2;margin-bottom:12px;">
                    ${dcEscape(data.description)}
                </p>

                <p style="font-size:11px;color:#8490a2;margin-bottom:12px;">
                    ${data.fields.length} custom fields
                </p>

                <div style="
    display:flex;
    gap:10px;
    flex-wrap:wrap;
">

    <button type="button"
        onclick="openDataForm('${dcEscape(form.id)}')"
        style="
            padding:12px 16px;
            background:#2864dc;
            color:white;
            border:0;
            border-radius:7px;
        ">
        COLLECT INFORMATION
    </button>

    <button type="button"
        onclick="deleteDataForm('${form.id}')"
        style="
            padding:12px 16px;
            background:#dc3545;
            color:white;
            border:0;
            border-radius:7px;
        ">
        DELETE FORM
    </button>

</div>

            </div>
        `;

    }).join("");
}

/* ---------- OPEN DYNAMIC DATA FORM ---------- */

async function openDataForm(id) {

    try {

        const record = await getHubRecord(id);

        if (!record || record.type !== "form") {
            throw new Error("Custom form not found.");
        }

        activeDataForm = record;

        const data = record.data;

        const container = document.getElementById("dataEntryArea");

        const fieldsHTML = data.fields.map((field, index) => {

            const label = dcEscape(field.label);

            const required = field.required ? "required" : "";

            if (field.type === "textarea") {

                return `
                    <label>${label}${field.required ? " *" : ""}</label>
                    <textarea
                        data-field-index="${index}"
                        rows="4"
                        ${required}
                        style="width:100%;padding:12px;margin:8px 0 16px;"
                    ></textarea>
                `;

            }

            return `
                <label>${label}${field.required ? " *" : ""}</label>
                <input
                    type="${["text","number","date"].includes(field.type) ? field.type : "text"}"
                    data-field-index="${index}"
                    ${required}
                    style="width:100%;padding:12px;margin:8px 0 16px;"
                >
            `;

        }).join("");

        container.innerHTML = `
            <div class="panel">

                <h3>${dcEscape(data.name)}</h3>

                <p style="font-size:12px;color:#8490a2;margin-bottom:18px;">
                    ${dcEscape(data.description)}
                </p>

                <form id="dynamicDataEntryForm">

                    ${fieldsHTML}

                    <button type="submit"
                        style="
                            width:100%;
                            padding:15px;
                            background:#2864dc;
                            color:white;
                            border:0;
                            border-radius:8px;
                            font-weight:bold;
                        ">
                        SAVE INFORMATION
                    </button>

                    <button type="button"
                        id="closeDataEntry"
                        style="
                            width:100%;
                            padding:13px;
                            margin-top:9px;
                            border:0;
                            border-radius:8px;
                        ">
                        CLOSE FORM
                    </button>

                </form>

            </div>
        `;

        container.scrollIntoView({behavior:"smooth"});

        document.getElementById("dynamicDataEntryForm")
            .addEventListener("submit", saveDataSubmission);

        document.getElementById("closeDataEntry")
            .addEventListener("click", () => {
                activeDataForm = null;
                container.innerHTML = "";
            });

    } catch (error) {

        alert(error.message || "Unable to open form.");

    }
}

/* ---------- SAVE COLLECTED INFORMATION ---------- */

async function saveDataSubmission(event) {

    event.preventDefault();

    if (!activeDataForm || !isHubVaultUnlocked()) {
        alert("Please unlock your workspace first.");
        return;
    }

    const button = event.target.querySelector(
        'button[type="submit"]'
    );

    button.disabled = true;

    try {

        const values = {};

        activeDataForm.data.fields.forEach((field, index) => {

            const input = event.target.querySelector(
                `[data-field-index="${index}"]`
            );

            values[field.label] = input.value.trim();

        });

        await saveHubRecord("data", {

            formId: activeDataForm.id,

            formName: activeDataForm.data.name,

            values,

            submittedAt: new Date().toISOString()

        });

        alert("Information saved successfully.");

        event.target.reset();

    } catch (error) {

        alert(error.message || "Unable to save information.");

    } finally {

        button.disabled = false;

    }
}

/* ---------- INITIALIZE ---------- */

function initializeDataCollection() {

    const builder = document.getElementById("formBuilder");

    if (!builder) return;

    builder.addEventListener("submit", saveDataForm);

    document.getElementById("addFieldButton")
        .addEventListener("click", addCollectionField);

    renderBuilderFields();

}

document.addEventListener("DOMContentLoaded", () => {
    initializeDataCollection();
});

/* ---------- DELETE CUSTOM FORM ---------- */

async function deleteDataForm(id) {

    const confirmed = confirm(
        "Are you sure you want to permanently delete this custom form?"
    );

    if (!confirmed) return;

    if (!isHubVaultUnlocked()) {
        alert("Unlock your workspace first.");
        return;
    }

    try {

        await deleteHubRecord(id);

        alert("Custom form deleted successfully.");

        if (activeDataForm && activeDataForm.id === id) {
            activeDataForm = null;

            document.getElementById(
                "dataEntryArea"
            ).innerHTML = "";
        }

        await loadDataForms();

    } catch (error) {

        alert(
            "Could not delete form: " + error.message
        );

    }
}
