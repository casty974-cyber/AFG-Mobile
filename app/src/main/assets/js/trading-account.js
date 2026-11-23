
/* =========================================
   DATA & JOURNAL HUB
   TRADING ACCOUNT MANAGEMENT
========================================= */
let editingAccountTransactionId = null;
function accountMoney(value) {
    return Number(value || 0).toLocaleString("en-UG", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }) + " UGX";
}

function accountEscape(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

async function saveAccountTransaction() {
    const type = document.getElementById("accountTransactionType").value;
    const amount = Number(document.getElementById("accountTransactionAmount").value);
    const date = document.getElementById("accountTransactionDate").value;
    const notes = document.getElementById("accountTransactionNotes").value.trim();

    if (!Number.isFinite(amount) || amount <= 0 || !date) {
        alert("Enter a valid amount and transaction date.");
        return;
    }

    try {
        await saveHubRecord("accountTransaction", {
            type,
            amount,
            date,
            notes,
            currency: "UGX",
            createdAt: new Date().toISOString()
}, editingAccountTransactionId);

editingAccountTransactionId = null;
        
        document.getElementById("accountTransactionAmount").value = "";
        document.getElementById("accountTransactionNotes").value = "";
        document.getElementById("accountTransactionDate").value = "";

        alert(type + " saved successfully.");

        await loadTradingAccountOverview();

    } catch (error) {
        console.error("Transaction save error:", error);
        alert("Unable to save transaction.");
    }
}

async function loadTradingAccountOverview() {
    const container = document.getElementById("tradingAccountContent");
    if (!container) return;

    container.innerHTML = "<p>Loading account overview...</p>";

    try {
        const records = await listHubRecords("trade") || [];
        const transactions = await listHubRecords("accountTransaction") || [];

        const trades = records
            .map(record => record.data || {})
            .filter(trade => trade.status === "Closed");

        const deposits = transactions
            .filter(record => record.data?.type === "Deposit");

        const withdrawals = transactions
            .filter(record => record.data?.type === "Withdrawal");

        const totalDeposits = deposits.reduce(
            (sum, record) => sum + Number(record.data.amount || 0), 0
        );

        const totalWithdrawals = withdrawals.reduce(
            (sum, record) => sum + Number(record.data.amount || 0), 0
        );

        const totalPnL = trades.reduce(
            (sum, trade) => sum + Number(trade.profitLoss || 0), 0
        );

        const startingBalance = 0;

        const currentBalance =
            startingBalance + totalPnL + totalDeposits - totalWithdrawals;

        const growth = startingBalance > 0
            ? (totalPnL / startingBalance) * 100
            : 0;

        const riskLimit = currentBalance * 0.06;

      const latestTrade = [...trades].sort((a, b) =>
    String(b.updatedAt || b.createdAt || "")
        .localeCompare(String(a.updatedAt || a.createdAt || ""))
)[0];

const latestTradeBalance = latestTrade
    ? Number(latestTrade.balanceAfter || 0)
    : 0;

const reconciliationDifference =
    currentBalance - latestTradeBalance;
        const history = [...transactions].sort((a, b) =>
            String(b.data?.date || "").localeCompare(String(a.data?.date || ""))
        );

        container.innerHTML = `
            <div class="account-overview-grid">

                <div class="account-card">
                    <h3>Current Balance</h3>
                    <h2>${accountMoney(currentBalance)}</h2>
                </div>

                <div class="account-card">
                    <h3>Total Net P&L</h3>
                    <h2>${accountMoney(totalPnL)}</h2>
                </div>

                <div class="account-card">
                    <h3>Account Growth</h3>
                    <h2>${growth.toFixed(2)}%</h2>
                </div>

                <div class="account-card">
                    <h3>6% Risk Limit</h3>
                    <h2>${accountMoney(riskLimit)}</h2>
                </div>

                <div class="account-card">
                    <h3>Total Deposits</h3>
                    <h2>${accountMoney(totalDeposits)}</h2>
                </div>

                <div class="account-card">
                    <h3>Total Withdrawals</h3>
                    <h2>${accountMoney(totalWithdrawals)}</h2>
                </div>

                <div class="account-card">
                    <h3>Closed Trades</h3>
                    <h2>${trades.length}</h2>
                </div>

            </div>

            <div class="panel">
                <h3>Transaction History</h3>

                ${history.length ? history.map(record => {
                    const t = record.data || {};
                    return `
                        <div style="padding:12px 0;border-bottom:1px solid #e8ecf2;">
                            <strong>${accountEscape(t.type)}</strong>
<p>${accountMoney(t.amount)}</p>
<small>${accountEscape(t.date)}</small>
<p>${accountEscape(t.notes || "")}</p>

<div style="display:flex;gap:10px;margin-top:10px;">

    <button
        onclick="editAccountTransaction('${accountEscape(record.id)}')"
        style="background:#2563eb;color:white;padding:8px 16px;border:0;border-radius:6px;">
        Edit
    </button>

    <button
        onclick="removeAccountTransaction('${accountEscape(record.id)}')"
        style="background:#dc2626;color:white;padding:8px 16px;border:0;border-radius:6px;">
        Delete
    </button>

</div>
                        </div>
                    `;
                }).join("") : "<p>No account transactions recorded yet.</p>"}
            </div>

            <p>Currency: UGX</p>
            <p>Balance calculation uses the first recorded trade balance, closed-trade P&L and saved deposits/withdrawals.</p>
        `;

    } catch (error) {
        console.error("Account overview error:", error);
        container.innerHTML = "<p>Unable to load trading account overview.</p>";
    }
}
