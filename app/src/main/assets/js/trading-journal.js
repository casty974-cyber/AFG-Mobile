
/* =========================================
   DATA & JOURNAL HUB - TRADING JOURNAL
   Offline encrypted trade records
========================================= */

let tradingRecords = [];
let editingTradeId = null;

function tjEscape(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

function tjToday() {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - offset)
        .toISOString().slice(0, 10);
}

function calculateTradeR(direction, entry, stopLoss, exit) {
    entry = Number(entry);
    stopLoss = Number(stopLoss);
    exit = Number(exit);

    if (!entry || !stopLoss || !exit) return "";

    let risk;
    let reward;

    if (direction === "Buy") {
        risk = entry - stopLoss;
        reward = exit - entry;
    } else {
        risk = stopLoss - entry;
        reward = entry - exit;
    }

    if (risk <= 0) return "";

    return Number((reward / risk).toFixed(2));
}

async function loadTradingJournal() {
    const container = document.getElementById("tradingHistory");
    if (!container) return;

    container.innerHTML = "<p>Loading trades...</p>";

    try {
    tradingRecords = await listHubRecords("trade") || [];

    container.innerHTML = `
        <div class="panel">
            <h3>Trading Journal Diagnostic</h3>
            <p>Records loaded: ${tradingRecords.length}</p>
            <p>Database: ${hubDatabase ? "Connected" : "Not connected"}</p>
            <p>Vault: ${hubEncryptionKey ? "Unlocked" : "Locked"}</p>
        </div>
    `;

    renderTradingJournal();

} catch (error) {
    console.error("Trading Journal:", error);
    container.innerHTML = "<p>Unable to load trades.</p>";
}
}

async function getNextTradeDay(date) {
    const existing = await listHubRecords("trade") || [];

    const sameDate = existing.find(record =>
        record.data?.tradeDate === date
    );

    if (sameDate) {
        return sameDate.data.tradeDay;
    }

    const highest = existing.reduce((max, record) => {
        return Math.max(max, Number(record.data?.tradeDay) || 0);
    }, 0);

    return highest + 1;
}

async function saveTradingRecord() {
    const instrument = document.getElementById("tradeInstrument").value.trim();
    const direction = document.getElementById("tradeDirection").value;
    const tradeDate = document.getElementById("tradeDate").value;
    const lotSize = document.getElementById("tradeLotSize").value;
    const session = document.getElementById("tradeSession").value;
    const strategy = document.getElementById("tradeStrategy").value;

    const entry = document.getElementById("tradeEntry").value;
    const stopLoss = document.getElementById("tradeStopLoss").value;
    const target = document.getElementById("tradeTarget").value;
    const exit = document.getElementById("tradeExit").value;

    const status = document.getElementById("tradeStatus").value;
let balanceBefore;

if (editingTradeId) {

    // Preserve the original balance when editing a trade.
    balanceBefore =
        document.getElementById("tradeBalanceBefore").value;

} else {

    // Always fetch the latest account balance for a new trade.
    balanceBefore = await getLatestTradingBalance();

    document.getElementById("tradeBalanceBefore").value =
        balanceBefore;
}
  if (typeof updateTradeRiskMonitor === "function") {
    updateTradeRiskMonitor();
}
    const profitLoss = document.getElementById("tradePnL").value;
    const emotion = document.getElementById("tradeEmotion").value;
    const discipline = document.getElementById("tradeDiscipline").value;
    const notes = document.getElementById("tradeNotes").value.trim();

    if (!instrument || !tradeDate || !entry || !stopLoss) {
        alert("Enter instrument, date, entry and stop loss.");
        return;
    }

    if (
        !Number.isFinite(Number(entry)) ||
        !Number.isFinite(Number(stopLoss)) ||
        (target && !Number.isFinite(Number(target))) ||
        (exit && !Number.isFinite(Number(exit))) ||
        (lotSize && !Number.isFinite(Number(lotSize))) ||
        (profitLoss && !Number.isFinite(Number(profitLoss)))
    ) {
        alert("Please enter valid numerical values.");
        return;
    }

    try {
        let previous = null;

        if (editingTradeId) {
            previous = await getHubRecord(editingTradeId);
        }

        const tradeDay = previous?.data?.tradeDay ??
            await getNextTradeDay(tradeDate);

        const rMultiple = status === "Closed"
            ? calculateTradeR(direction, entry, stopLoss, exit)
            : "";

        const outcome = document.getElementById("tradeOutcome").value;
const pnlInput = Math.abs(
    Number(document.getElementById("tradePnL").value || 0)
);

if (status === "Open") {
    if (outcome !== "Pending") {
        alert("An open trade must have Pending outcome.");
        return;
    }
}

if (status === "Closed" && outcome === "Pending") {
    alert("Select Win, Loss, or Break-even for a closed trade.");
    return;
}

const pnl = outcome === "Win" ? pnlInput :
    outcome === "Loss" ? -pnlInput :
    outcome === "Break-even" ? 0 : 0;

        const startingBalance = balanceBefore === ""
            ? null
            : Number(balanceBefore);

        const trade = {
            tradeDay,
            tradeDate,
            instrument,
            direction,
            lotSize: lotSize === "" ? null : Number(lotSize),
            session,
            strategy,
            entry: Number(entry),
            stopLoss: Number(stopLoss),
            target: target === "" ? null : Number(target),
            exit: exit === "" ? null : Number(exit),
            status,
            balanceBefore: startingBalance,
            riskPercent: Number(
    document.getElementById("tradeRiskPercent")?.value || 6
),

riskAmount: Number(
    document.getElementById("tradeRiskAmount")?.value || 0
),
          profitLoss: pnl,
          outcome,
            balanceAfter: startingBalance === null
                ? null
                : Number((startingBalance + pnl).toFixed(2)),
            currency: "UGX",
            rMultiple,
            emotion,
            discipline,
            notes,
            updatedAt: new Date().toISOString(),
            createdAt: previous?.data?.createdAt ||
                new Date().toISOString()
        };

        await saveHubRecord("trade", trade, editingTradeId || null);

        alert(editingTradeId
            ? "Trade updated successfully."
            : "Trade saved successfully.");

        resetTradingForm();
        await loadTradingJournal();

    } catch (error) {
        console.error(error);
        alert("Unable to save trade. Check the database and try again.");
    }
}

function resetTradingForm() {
    const ids = [
        "tradeInstrument", "tradeLotSize",
        "tradeEntry", "tradeStopLoss",
        "tradeTarget", "tradeExit",
        "tradeBalanceBefore", "tradePnL",
        "tradeNotes"
    ];

    ids.forEach(id => {
        const field = document.getElementById(id);
        if (field) field.value = "";
    });

    document.getElementById("tradeDate").value = tjToday();
    document.getElementById("tradeDirection").value = "Buy";
    document.getElementById("tradeSession").value = "London";
    document.getElementById("tradeStrategy").value = "Breakouts";
    document.getElementById("tradeStatus").value = "Pending";
    document.getElementById("tradeEmotion").value = "Neutral";
    document.getElementById("tradeDiscipline").value = "Followed Plan";

    editingTradeId = null;

    const button = document.getElementById("tradeSaveButton");
    if (button) button.textContent = "SAVE TRADE";
}

function renderTradingJournal() {
    const container = document.getElementById("tradingHistory");
    if (!container) return;

    const search = (
        document.getElementById("tradeSearch")?.value || ""
    ).toLowerCase();

    const filter = (
        document.getElementById("tradeFilter")?.value || "all"
    );

    const filtered = tradingRecords.filter(record => {
        const trade = record.data || {};

        return (
            (filter === "all" || trade.status === filter) &&
            JSON.stringify(trade).toLowerCase().includes(search)
        );
    });

    const closed = tradingRecords.filter(r =>
        r.data?.status === "Closed"
    );

    const wins = closed.filter(r =>
        Number(r.data?.profitLoss) > 0
    ).length;

    const losses = closed.filter(r =>
        Number(r.data?.profitLoss) < 0
    ).length;

    const net = closed.reduce((sum, r) =>
        sum + (Number(r.data?.profitLoss) || 0), 0
    );

    const winRate = closed.length
        ? Math.round(wins / closed.length * 100)
        : 0;

    const set = (id, value) => {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
    };

    set("tradeTotal", tradingRecords.length);
    set("tradeWins", wins);
    set("tradeLosses", losses);
    set("tradeWinRate", winRate + "%");
    set("tradeNetPnL", net.toLocaleString() + " UGX");

    if (!filtered.length) {
        container.innerHTML = "<p>No matching trades found.</p>";
        return;
    }

    container.innerHTML = filtered.map(record => {
        const t = record.data || {};

        return `
            <div class="panel" style="margin-bottom:12px;">
                <h3>${tjEscape(t.instrument)}</h3>

                <p>Trade Day: ${tjEscape(t.tradeDay)}</p>
                <p>Date: ${tjEscape(t.tradeDate)}</p>
                <p>Direction: ${tjEscape(t.direction)}</p>
                <p>Lot Size: ${tjEscape(t.lotSize)}</p>
                <p>Strategy: ${tjEscape(t.strategy)}</p>
                <p>Session: ${tjEscape(t.session)}</p>
                <p>Status: <strong>${tjEscape(t.status)}</strong></p>
               <p>Outcome: <strong>${tjEscape(t.outcome || "Pending")}</strong></p>
                <p>R-Multiple: ${t.rMultiple === "" ? "Pending" : tjEscape(t.rMultiple)}</p>
                <p>Net P&L: ${Number(t.profitLoss || 0).toLocaleString()} UGX</p>
                <p>Balance Before: ${t.balanceBefore === null ? "Not recorded" : Number(t.balanceBefore).toLocaleString() + " UGX"}</p>
                <p>Balance After: ${t.balanceAfter === null ? "Not recorded" : Number(t.balanceAfter).toLocaleString() + " UGX"}</p>
                <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;">
                    <button onclick="editTradingRecord('${tjEscape(record.id)}')">EDIT</button>
                    <button onclick="deleteTradingRecord('${tjEscape(record.id)}')">DELETE</button>
                </div>
            </div>
        `;
    }).join("");
}

async function editTradingRecord(id) {
    const record = await getHubRecord(id);
    if (!record) return alert("Trade not found.");

    const t = record.data || {};

    const fields = {
        tradeInstrument: t.instrument,
        tradeDate: t.tradeDate,
        tradeDirection: t.direction,
        tradeLotSize: t.lotSize,
        tradeSession: t.session,
        tradeStrategy: t.strategy,
        tradeEntry: t.entry,
        tradeStopLoss: t.stopLoss,
        tradeTarget: t.target,
        tradeExit: t.exit,
        tradeStatus: t.status,
        tradeOutcome: t.outcome || "Pending",
        tradeBalanceBefore: t.balanceBefore,
        tradePnL: t.profitLoss,
        tradeEmotion: t.emotion,
        tradeDiscipline: t.discipline,
        tradeNotes: t.notes
    };

    Object.entries(fields).forEach(([id, value]) => {
        const field = document.getElementById(id);
        if (field) field.value = value ?? "";
    });

    editingTradeId = id;

    document.getElementById("tradeSaveButton").textContent = "UPDATE TRADE";

    document.getElementById("tradeInstrument")
        .scrollIntoView({ behavior: "smooth" });
}

async function deleteTradingRecord(id) {
    if (!confirm("Permanently delete this trading record?")) return;

    try {
        await deleteHubRecord(id);
        await loadTradingJournal();
        alert("Trading record deleted.");
    } catch (error) {
        console.error(error);
        alert("Unable to delete trading record.");
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const date = document.getElementById("tradeDate");

    if (date && !date.value) date.value = tjToday();

    ["tradeSearch", "tradeFilter"].forEach(id => {
        document.getElementById(id)?.addEventListener(
            "input", renderTradingJournal
        );

        document.getElementById(id)?.addEventListener(
            "change", renderTradingJournal
        );
    });
});
