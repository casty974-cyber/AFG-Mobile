
/* =========================================
   DATA & JOURNAL HUB
   ENCRYPTED ATTACHMENTS MANAGER
========================================= */

const ATTACHMENT_MAX_SIZE = 5 * 1024 * 1024;

function attachmentEscape(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

function attachmentFormatSize(bytes) {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) {
        return (bytes / 1024).toFixed(1) + " KB";
    }
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}

/* ---------- FILE UPLOAD ---------- */

async function handleAttachmentUpload() {

    const input = document.getElementById(
        "attachmentFileInput"
    );

    const status = document.getElementById(
        "attachmentStatus"
    );

if (!input) {
    if (status) {
        status.textContent = "ERROR: File input was not found.";
    }
    return;
}

if (!input.files || !input.files.length) {
    status.textContent = "Please select a file first.";
    return;
}
  
    if (!isHubVaultUnlocked()) {
        status.textContent = "Unlock the vault first.";
        return;
    }

    const file = input.files[0];

    if (file.size > ATTACHMENT_MAX_SIZE) {
        status.textContent =
            "File is too large. Maximum size is 5 MB.";
        input.value = "";
        return;
    }

    const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/webp",
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "text/plain",
        "text/csv"
    ];

    if (!allowedTypes.includes(file.type)) {
        status.textContent = "This file type is not supported.";
        input.value = "";
        return;
    }

    status.textContent = "Encrypting and saving file...";

    try {

        const dataUrl = await new Promise((resolve, reject) => {

            const reader = new FileReader();

            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(
                new Error("Could not read this file.")
            );

            reader.readAsDataURL(file);
        });

        const relatedRecord = document.getElementById(
            "attachmentRelatedRecord"
        )?.value.trim() || "";
       const reason = document.getElementById(
    "attachmentReason"
)?.value.trim() || "";

      const attachmentData = {
    name: file.name,
    mimeType: file.type,
    size: file.size,
    dataUrl: dataUrl,
    relatedRecord: relatedRecord,
    reason: reason,
    createdAt: new Date().toISOString()
};

        await saveHubRecord(
            "attachment",
            attachmentData
        );

        input.value = "";

        status.textContent = "Attachment saved securely.";

        await loadAttachments();

    } catch (error) {

        status.textContent =
            "Upload failed: " + error.message;

    }
}

/* ---------- DISPLAY ATTACHMENTS ---------- */



async function loadAttachments() {

    const container = document.getElementById(
        "attachmentList"
    );

    if (!container) return;

    if (!isHubVaultUnlocked()) {
        container.innerHTML =
            '<div class="empty">Unlock the vault to view attachments.</div>';
        return;
    }

    try {

        const records = await listHubRecords("attachment");

        if (!records.length) {
            container.innerHTML =
                '<div class="empty">No attachments saved yet.</div>';
            return;
        }

        container.innerHTML = records.map(record => {

            const file = record.data;

            const attachedDate = new Date(
                file.createdAt || record.createdAt
            );

            const dateText = attachedDate.toLocaleDateString();
            const timeText = attachedDate.toLocaleTimeString();

            const reason = file.reason || "Not specified";

            return `
                <div style="
                    padding:14px;
                    border-bottom:1px solid var(--border);
                ">

                    <div style="
                        font-weight:600;
                        margin-bottom:8px;
                    ">
                        📄 ${attachmentEscape(file.name)}
                    </div>

                    <div style="
                        font-size:13px;
                        line-height:1.8;
                        color:var(--text-muted);
                    ">
                        <div>📅 Date: ${attachmentEscape(dateText)}</div>
                        <div>🕒 Time: ${attachmentEscape(timeText)}</div>
                        <div>📝 Reason: ${attachmentEscape(reason)}</div>
                    </div>

                    
<div style="
    display:flex;
    gap:8px;
    flex-wrap:wrap;
    margin-top:12px;
">

    <button
        onclick="viewAttachment('${record.id}')"
        type="button"
    >
        View
    </button>

    <button
        onclick="downloadAttachment('${record.id}')"
        type="button"
    >
        Download
    </button>

    <button
        onclick="deleteAttachment('${record.id}')"
        type="button"
        style="background:#dc3545;color:white;"
    >
        Delete
    </button>

</div>


                </div>
            `;

        }).join("");

    } catch (error) {

        container.innerHTML =
            '<div class="empty">Could not load attachments: ' +
            attachmentEscape(error.message) +
            '</div>';

    }
}



/* ---------- VIEW ATTACHMENT ---------- */



async function viewAttachment(id) {

    try {

        const record = await getHubRecord(id);

        if (!record || !record.data.dataUrl) {
            alert("Attachment could not be found.");
            return;
        }

        const file = record.data;

        const response = await fetch(file.dataUrl);
        const blob = await response.blob();

        const fileUrl = URL.createObjectURL(blob);

        const overlay = document.createElement("div");

        overlay.style.cssText = `
            position:fixed;
            inset:0;
            background:rgba(0,0,0,0.9);
            z-index:99999;
            display:flex;
            flex-direction:column;
            padding:15px;
        `;

        const header = document.createElement("div");

        header.style.cssText = `
            display:flex;
            justify-content:space-between;
            align-items:center;
            color:white;
            padding:12px;
        `;

        const title = document.createElement("span");
        title.textContent = file.name;

        const close = document.createElement("button");
        close.textContent = "Close";

        header.append(title, close);

        const content = document.createElement("div");

        content.style.cssText = `
            flex:1;
            background:white;
            overflow:auto;
            display:flex;
            align-items:center;
            justify-content:center;
        `;

        if (file.mimeType.startsWith("image/")) {

            const img = document.createElement("img");
            img.src = fileUrl;
            img.style.cssText = `
                max-width:100%;
                max-height:100%;
                object-fit:contain;
            `;

            content.appendChild(img);

        } else if (
            file.mimeType === "application/pdf"
        ) {

            const frame = document.createElement("iframe");
            frame.src = fileUrl;
            frame.style.cssText = `
                width:100%;
                height:100%;
                border:0;
            `;

            content.appendChild(frame);

        } else if (
            file.mimeType === "text/plain" ||
            file.mimeType === "text/csv"
        ) {

            const frame = document.createElement("iframe");
            frame.src = fileUrl;
            frame.style.cssText = `
                width:100%;
                height:100%;
                border:0;
            `;

            content.appendChild(frame);

        } else {

            content.textContent =
                "Preview is not supported for this document type. Use Download to open it in a compatible application.";

        }

        const download = document.createElement("button");

        download.textContent = "Download Attachment";

        download.style.margin = "12px";

        download.onclick = () => {
            downloadAttachment(id);
        };

        function closeViewer() {
            overlay.remove();
            URL.revokeObjectURL(fileUrl);
        }

        close.onclick = closeViewer;

        overlay.append(header, content, download);

        document.body.appendChild(overlay);

    } catch (error) {

        alert("Could not view attachment: " + error.message);

    }
}



/* ---------- DOWNLOAD ATTACHMENT ---------- */

async function downloadAttachment(id) {

    try {

        const record = await getHubRecord(id);

        if (!record || !record.data.dataUrl) {
            alert("Attachment could not be found.");
            return;
        }

        const file = record.data;

        const link = document.createElement("a");

        link.href = file.dataUrl;
        link.download = file.name;

        document.body.appendChild(link);

        link.click();

        link.remove();

    } catch (error) {

        alert("Download failed: " + error.message);

    }
}


/* ---------- DELETE ATTACHMENT ---------- */

async function deleteAttachment(id) {

    const confirmed = confirm(
        "Are you sure you want to permanently delete this attachment?"
    );

    if (!confirmed) return;

    try {

        await deleteHubRecord(id);

        alert("Attachment deleted successfully.");

        await loadAttachments();

    } catch (error) {

        alert(
            "Could not delete attachment: " +
            error.message
        );

    }
}
