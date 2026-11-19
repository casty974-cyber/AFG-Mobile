
/* =========================================
   DATA & JOURNAL HUB
   WORKSPACE REPORTS ENGINE
========================================= */

let currentWorkspaceReport = null;

/* ---------- HELPERS ---------- */

function reportEscape(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

function reportDateValue(record) {
    const data = record.data || {};

    return (
        data.tradeDate ||
        data.transactionDate ||
        data.submittedAt ||
        data.date ||
        record.createdAt ||
        record.updatedAt ||
        ""
    );
}

function reportFormatDate(value) {
    if (!value) return "N/A";

    const date = new Date(value);

    if (isNaN(date.getTime())) {
        return String(value);
    }

    return date.toLocaleDateString();
}

function reportGetTitle(record) {
    const data = record.data || {};

    return (
        data.title ||
        data.formName ||
        data.description ||
        data.instrument ||
        data.type ||
        record.type ||
        "Untitled Record"
    );
}

function reportGetDetails(record) {
    const data = record.data || {};

    return Object.entries(data)
        .map(([key, value]) => {
            if (value === null || value === undefined) return "";

            const textValue =
                typeof value === "object"
                    ? JSON.stringify(value)
                    : String(value);

            return key + ": " + textValue;
        })
        .filter(Boolean)
        .join(" | ");
}

function reportCategoryMatches(record, category) {
    if (category === "all") return true;

    const type = String(record.type || "").toLowerCase();

    const groups = {
    journal: ["journal"],
    data: ["data", "form"],
    task: ["task"],
    trade: ["trade"],
    accountTransaction: ["accounttransaction"]
};

    return (groups[category] || []).includes(type);
}

/* ---------- DATE FILTER ---------- */

function reportDateMatches(record, startDate, endDate) {
    const value = reportDateValue(record);

    if (!value) return false;

    const date = new Date(value);

    if (isNaN(date.getTime())) return false;

    const start = new Date(startDate + "T00:00:00");
    const end = new Date(endDate + "T23:59:59.999");

    return date >= start && date <= end;
}

/* ---------- GENERATE REPORT ---------- */

async function generateWorkspaceReport() {
    const summary = document.getElementById("reportSummary");
    const details = document.getElementById("reportDetails");
    const status = document.getElementById("reportStatus");

    const category = document.getElementById("reportCategory").value;
    const startDate = document.getElementById("reportStartDate").value;
    const endDate = document.getElementById("reportEndDate").value;

    if (!startDate || !endDate) {
        alert("Please select both report dates.");
        return;
    }

    if (startDate > endDate) {
        alert("Start date cannot be later than end date.");
        return;
    }

    if (typeof isHubVaultUnlocked === "function" &&
        !isHubVaultUnlocked()) {
        alert("Please unlock your workspace first.");
        return;
    }

    summary.innerHTML = "Generating report...";
    details.innerHTML = "";

    try {
        const records = await listHubRecords();

        const filtered = records.filter(record =>
            reportCategoryMatches(record, category) &&
            reportDateMatches(record, startDate, endDate)
        );

        currentWorkspaceReport = {
            category,
            startDate,
            endDate,
            records: filtered
        };

        const total = filtered.length;

        const trades = filtered.filter(record =>
            String(record.type).toLowerCase() === "trade"
        );

        const totalProfitLoss = trades.reduce((sum, record) => {
            const value = Number(
                record.data?.profitLoss ??
                record.data?.pnl ??
                0
            );

            return sum + (isFinite(value) ? value : 0);
        }, 0);

        summary.innerHTML = `
            <div class="dashboard-grid">
                <div class="stat-card">
                    <h3>${total}</h3>
                    <p>Records Found</p>
                </div>

                <div class="stat-card">
                    <h3>${trades.length}</h3>
                    <p>Trading Records</p>
                </div>

                <div class="stat-card">
                    <h3>${totalProfitLoss.toLocaleString()}</h3>
                    <p>Trading P&L</p>
                </div>
            </div>

            <p style="margin-top:15px;">
                <strong>Period:</strong>
                ${reportEscape(startDate)} to
                ${reportEscape(endDate)}
            </p>

            <p>
                <strong>Report Type:</strong>
                ${reportEscape(category)}
            </p>
        `;

        if (total === 0) {
            details.innerHTML = `
                <div class="empty">
                    No records were found for this report period.
                </div>
            `;
        } else {
            details.innerHTML = `
                <div style="overflow-x:auto;">
                    <table style="width:100%;border-collapse:collapse;">
                        <thead>
                            <tr>
                                <th style="padding:10px;text-align:left;">Date</th>
                                <th style="padding:10px;text-align:left;">Category</th>
                                <th style="padding:10px;text-align:left;">Title</th>
                                <th style="padding:10px;text-align:left;">Details</th>
                            </tr>
                        </thead>

                        <tbody>
                            ${filtered.map(record => `
                                <tr>
                                    <td style="padding:10px;border-top:1px solid #ddd;">
                                        ${reportEscape(reportFormatDate(reportDateValue(record)))}
                                    </td>

                                    <td style="padding:10px;border-top:1px solid #ddd;">
                                        ${reportEscape(record.type)}
                                    </td>

                                    <td style="padding:10px;border-top:1px solid #ddd;">
                                        ${reportEscape(reportGetTitle(record))}
                                    </td>

                                    <td style="padding:10px;border-top:1px solid #ddd;">
                                        ${reportEscape(reportGetDetails(record))}
                                    </td>
                                </tr>
                            `).join("")}
                        </tbody>
                    </table>
                </div>
            `;
        }

        status.textContent = "Report generated successfully.";

    } catch (error) {
        console.error("Report generation error:", error);

        summary.innerHTML = `
            <div class="empty">
                Could not generate the report.
            </div>
        `;

        status.textContent = "Error: " + error.message;
    }
}

/* ---------- EXPORT CSV ---------- */

function exportWorkspaceReportCSV() {
    if (!currentWorkspaceReport) {
        alert("Generate a report before exporting.");
        return;
    }

    const rows = [
        ["Date", "Category", "Title", "Details"]
    ];

    currentWorkspaceReport.records.forEach(record => {
        rows.push([
            reportFormatDate(reportDateValue(record)),
            record.type || "",
            reportGetTitle(record),
            reportGetDetails(record)
        ]);
    });

    const csv = rows.map(row =>
        row.map(value =>
            '"' + String(value ?? "").replace(/"/g, '""') + '"'
        ).join(",")
    ).join("\r\n");

    const blob = new Blob(
        ["\uFEFF" + csv],
        { type: "text/csv;charset=utf-8;" }
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "workspace-report.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);

    document.getElementById("reportStatus").textContent =
        "CSV report exported.";
}

/* ---------- PRINT / PDF ---------- */

function printWorkspaceReport() {
    if (!currentWorkspaceReport) {
        alert("Generate a report before printing.");
        return;
    }

    const records = currentWorkspaceReport.records;

    const rows = records.map(record => `
        <tr>
            <td>${reportEscape(reportFormatDate(reportDateValue(record)))}</td>
            <td>${reportEscape(record.type)}</td>
            <td>${reportEscape(reportGetTitle(record))}</td>
            <td>${reportEscape(reportGetDetails(record))}</td>
        </tr>
    `).join("");

    const printWindow = window.open("", "_blank");

    if (!printWindow) {
        alert("Allow pop-ups in your browser to print this report.");
        return;
    }

    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Workspace Report</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">

            <style>
                body {
                    font-family: Arial, sans-serif;
                    padding: 20px;
                    color: #222;
                }

                h1 {
                    margin-bottom: 5px;
                }

                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 20px;
                }

                th, td {
                    border: 1px solid #ccc;
                    padding: 8px;
                    text-align: left;
                    font-size: 12px;
                    word-break: break-word;
                }

                th {
                    background: #eee;
                }

                @media print {
                    button {
                        display: none;
                    }
                }
            </style>
        </head>

        <body>
            <h1>ALL FOUNDATION GROUP</h1>
            <h2>Workspace Report</h2>

            <p>
                Period: ${reportEscape(currentWorkspaceReport.startDate)}
                to ${reportEscape(currentWorkspaceReport.endDate)}
            </p>

            <p>Total Records: ${records.length}</p>

            <table>
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Category</th>
                        <th>Title</th>
                        <th>Details</th>
                    </tr>
                </thead>

                <tbody>
                    ${rows}
                </tbody>
            </table>

            <script>
                window.onload = function() {
                    window.print();
                };
            <\/script>
        </body>
        </html>
    `);

    printWindow.document.close();
}
