
let tradingAnalyticsRecords = [];

function taMoney(value) {
    return Number(value || 0).toLocaleString("en-UG") + " UGX";
}

function taEscape(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;",
        '"': "&quot;", "'": "&#39;"
    })[char]);
}

async function loadTradingAnalytics() {
    const container = document.getElementById("tradingAnalyticsContent");
    if (!container) return;

    container.innerHTML = "<p>Loading trading analytics...</p>";

    try {
        tradingAnalyticsRecords = await listHubRecords("trade") || [];
        renderTradingAnalytics();
    } catch (error) {
        container.innerHTML = "<p>Unable to load trading analytics.</p>";
        console.error(error);
    }
}

function renderTradingAnalytics() {
    const container = document.getElementById("tradingAnalyticsContent");
    if (!container) return;

    const trades = tradingAnalyticsRecords
        .map(record => record.data)
        .filter(trade => trade && trade.tradeDate)
        .sort((a, b) => {
            const dateCompare = a.tradeDate.localeCompare(b.tradeDate);
            return dateCompare || Number(a.tradeDay || 0) - Number(b.tradeDay || 0);
        });

  const closed = trades.filter(t =>
    t.status === "Closed"
);

const wins = closed.filter(t =>
    t.outcome === "Win" ||
    (!t.outcome && Number(t.profitLoss) > 0)
);

const losses = closed.filter(t =>
    t.outcome === "Loss" ||
    (!t.outcome && Number(t.profitLoss) < 0)
);

const breakEven = closed.filter(t =>
    t.outcome === "Break-even" ||
    (!t.outcome && Number(t.profitLoss) === 0)
).length;

const totalPnL = closed.reduce(
    (sum, t) => sum + Number(t.profitLoss || 0), 0
);

const winningTotal = wins.reduce(
    (sum, t) => sum + Number(t.profitLoss || 0), 0
);

const losingTotal = Math.abs(losses.reduce(
    (sum, t) => sum + Number(t.profitLoss || 0), 0
));

const profitFactor = losingTotal
    ? (winningTotal / losingTotal).toFixed(2)
    : (winningTotal > 0 ? "∞" : "0.00");

const winRate = closed.length
    ? (wins.length / closed.length * 100).toFixed(1)
    : "0.0";
    const days = {};
    closed.forEach(trade => {
        const date = trade.tradeDate;
        days[date] = (days[date] || 0) + Number(trade.profitLoss || 0);
    });

    const dailyValues = Object.entries(days).sort((a, b) => a[0].localeCompare(b[0]));
    const bestDay = dailyValues.length ?
        dailyValues.reduce((best, day) => day[1] > best[1] ? day : best) : null;
    const worstDay = dailyValues.length ?
        dailyValues.reduce((worst, day) => day[1] < worst[1] ? day : worst) : null;

    let equity = 0;
    let peak = 0;
    const equityPoints = closed.map(trade => {
        equity += Number(trade.profitLoss || 0);
        peak = Math.max(peak, equity);
        return {
            date: trade.tradeDate,
            equity,
            drawdown: equity - peak
        };
    });

    const maxDrawdown = equityPoints.length ?
        Math.min(...equityPoints.map(point => point.drawdown)) : 0;

    container.innerHTML = `
        <div class="stats">
            <div class="panel"><h3>${closed.length}</h3><p>Closed Trades</p></div>
          <div class="panel"><h3>${wins.length}</h3><p>Winning Trades</p></div>
<div class="panel"><h3>${losses.length}</h3><p>Losing Trades</p></div>
<div class="panel"><h3>${breakEven}</h3><p>Break-even Trades</p></div>
            <div class="panel"><h3>${winRate}%</h3><p>Win Rate</p></div>
            <div class="panel"><h3>${taMoney(totalPnL)}</h3><p>Net P&L</p></div>
            <div class="panel"><h3>${profitFactor}</h3><p>Profit Factor</p></div>
            <div class="panel"><h3>${taMoney(maxDrawdown)}</h3><p>Maximum Drawdown</p></div>
        </div>

        <div class="panel">
            <h3>Trading Days Heatmap</h3>
            <p>Green = profit | Red = loss | Yellow = break-even | grey = no trades</p>
            <div id="tradingHeatmap"></div>
        </div>

        <div class="panel">
            <h3>Daily Profit / Loss</h3>
            <div id="dailyPnLGraph"></div>
        </div>

        <div class="panel">
            <h3>Equity Curve</h3>
            <div id="equityGraph"></div>
        </div>

        <div class="panel">
            <h3>Drawdown Monitor</h3>
            <div id="drawdownGraph"></div>
        </div>

        <div class="panel">
            <h3>Best and Worst Trading Days</h3>
            <p>Best: ${bestDay ? taEscape(bestDay[0]) + " — " + taMoney(bestDay[1]) : "No data"}</p>
            <p>Worst: ${worstDay ? taEscape(worstDay[0]) + " — " + taMoney(worstDay[1]) : "No data"}</p>
        </div>
    `;

    renderTradingHeatmap(days);
    renderTradingBars("dailyPnLGraph", dailyValues, "pnl");
    renderTradingBars("equityGraph",
        equityPoints.map(point => [point.date, point.equity]), "equity");
    renderTradingBars("drawdownGraph",
        equityPoints.map(point => [point.date, point.drawdown]), "drawdown");
}


function renderTradingHeatmap(days) {
    const target = document.getElementById("tradingHeatmap");
    if (!target) return;

    const today = new Date();
    const todayString =
        today.getFullYear() + "-" +
        String(today.getMonth() + 1).padStart(2, "0") + "-" +
        String(today.getDate()).padStart(2, "0");

    target.innerHTML = `
        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:15px;">
            <select id="taHeatmapMode" style="padding:10px;border-radius:8px;">
                <option value="day">Day</option>
                <option value="week">Week</option>
                <option value="month" selected>Month</option>
                <option value="year">Year</option>
            </select>

            <input type="date" id="taHeatmapDate"
                value="${todayString}"
                style="padding:10px;border-radius:8px;">
        </div>

        <div id="taHeatmapDisplay"></div>
    `;

    const mode = document.getElementById("taHeatmapMode");
    const dateInput = document.getElementById("taHeatmapDate");

    function draw() {
        renderSelectedHeatmap(
            days,
            mode.value,
            dateInput.value
        );
    }

    mode.addEventListener("change", draw);
    dateInput.addEventListener("change", draw);

    draw();
}

function renderSelectedHeatmap(days, mode, selectedDate) {
    const display = document.getElementById("taHeatmapDisplay");
    if (!display || !selectedDate) return;

    const parts = selectedDate.split("-").map(Number);
    const selected = new Date(parts[0], parts[1] - 1, parts[2]);

    const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    function dateString(date) {
        return date.getFullYear() + "-" +
            String(date.getMonth() + 1).padStart(2, "0") + "-" +
            String(date.getDate()).padStart(2, "0");
    }

    function dayCell(date) {
        const key = dateString(date);
        const hasTrades = Object.prototype.hasOwnProperty.call(days, key);
        const value = days[key];

        let color = "ta-no-trade";

        if (hasTrades && value > 0) color = "ta-profit";
        else if (hasTrades && value < 0) color = "ta-loss";
        else if (hasTrades && value === 0) color = "ta-even";

        const detail = hasTrades ? taMoney(value) : "No trades";

        return `
            <div class="ta-day ${color}"
                title="${key}: ${detail}"
                style="min-height:35px;display:flex;align-items:center;justify-content:center;">
                ${date.getDate()}
            </div>
        `;
    }

    function monthCalendar(year, month, small = false) {
        const firstDay = new Date(year, month, 1).getDay();
        const totalDays = new Date(year, month + 1, 0).getDate();

        let html = `
            <div style="margin-bottom:15px;min-width:0;">
                <h4 style="margin-bottom:8px;">
                    ${new Date(year, month, 1).toLocaleString("en", {month:"long"})}
                </h4>
                <div class="ta-calendar"
                    style="display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:4px;">
        `;

        names.forEach(name => {
            html += `
                <div class="ta-day-name"
                    style="font-size:${small ? "9px" : "12px"};text-align:center;">
                    ${name}
                </div>
            `;
        });

        for (let i = 0; i < firstDay; i++) {
            html += `<div class="ta-empty"></div>`;
        }

        for (let day = 1; day <= totalDays; day++) {
            html += dayCell(new Date(year, month, day));
        }

        html += `</div></div>`;
        return html;
    }

    if (mode === "day") {
        const key = dateString(selected);
        const hasTrades = Object.prototype.hasOwnProperty.call(days, key);
        const value = days[key];

        display.innerHTML = `
            <h4>${key}</h4>
            <div class="ta-day ${
                !hasTrades ? "ta-no-trade" :
                value > 0 ? "ta-profit" :
                value < 0 ? "ta-loss" : "ta-even"
            }" style="padding:25px;text-align:center;margin-top:10px;">
                ${hasTrades ? taMoney(value) : "No trades on this date"}
            </div>
        `;
        return;
    }

    if (mode === "week") {
        const start = new Date(selected);
        start.setDate(start.getDate() - ((start.getDay() + 6) % 7));

        const end = new Date(start);
        end.setDate(start.getDate() + 6);

        let html = `
            <h4>Week: ${dateString(start)} to ${dateString(end)}</h4>
            <div class="ta-calendar"
                style="display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:5px;">
        `;

        for (let i = 0; i < 7; i++) {
            const date = new Date(start);
            date.setDate(start.getDate() + i);

            html += `
                <div style="text-align:center;">
                    <small>${names[date.getDay()]}</small>
                    ${dayCell(date)}
                </div>
            `;
        }

        display.innerHTML = html + "</div>";
        return;
    }

    if (mode === "month") {
        display.innerHTML = monthCalendar(
            selected.getFullYear(),
            selected.getMonth()
        );
        return;
    }

    if (mode === "year") {
        const year = selected.getFullYear();
        let html = `<h4>Trading Heatmap — ${year}</h4>
            <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;">`;

        for (let month = 0; month < 12; month++) {
            html += monthCalendar(year, month, true);
        }

        display.innerHTML = html + "</div>";
    }
}


function renderTradingBars(targetId, values, type) {
    const target = document.getElementById(targetId);
    if (!target) return;

    if (!values.length) {
        target.innerHTML = "<p>No closed-trade data yet.</p>";
        return;
    }

    const recent = values.slice(-15);
    const max = Math.max(1, ...recent.map(item => Math.abs(Number(item[1]))));

    target.innerHTML = recent.map(item => {
        const value = Number(item[1]);
        const width = Math.max(3, Math.abs(value) / max * 100);

        let color = value >= 0 ? "#16a34a" : "#dc2626";
        if (type === "drawdown") color = "#dc2626";

        return `
            <div class="ta-chart-row">
                <small>${taEscape(item[0])}</small>
                <div class="ta-bar-track">
                    <div style="width:${width}%;background:${color};height:14px;border-radius:5px"></div>
                </div>
                <small>${taEscape(value.toFixed(2))}</small>
            </div>
        `;
    }).join("");
}

function updateTradeRiskMonitor() {
    const balance = Number(document.getElementById("tradeBalanceBefore")?.value || 0);
    const percent = Number(document.getElementById("tradeRiskPercent")?.value || 6);

    const amountField = document.getElementById("tradeRiskAmount");
    const monitor = document.getElementById("tradeRiskMonitor");

    if (!amountField || !monitor) return;

    if (balance <= 0 || percent <= 0 || percent > 100) {
        amountField.value = "";
        monitor.textContent = "Enter a valid balance and risk percentage.";
        return;
    }

    const riskAmount = balance * percent / 100;
    amountField.value = riskAmount.toFixed(2);

    monitor.textContent =
        percent + "% risk limit: " + taMoney(riskAmount);
}

document.addEventListener("DOMContentLoaded", () => {
    ["tradeBalanceBefore", "tradeRiskPercent"].forEach(id => {
        const field = document.getElementById(id);
        if (field) {
            field.addEventListener("input", updateTradeRiskMonitor);
        }
    });

    updateTradeRiskMonitor();
});



async function getLatestTradingBalance(excludeTradeId = null) {
    const records = await listHubRecords("trade") || [];

    const completed = records
        .filter(record =>
            record.id !== excludeTradeId &&
            record.data?.status === "Closed" &&
            record.data?.balanceAfter !== null &&
            record.data?.balanceAfter !== "" &&
            Number.isFinite(Number(record.data?.balanceAfter))
        )
        .sort((a, b) => {
            const dateA = a.data?.updatedAt || a.createdAt || "";
            const dateB = b.data?.updatedAt || b.createdAt || "";
            return String(dateB).localeCompare(String(dateA));
        });

    if (!completed.length) return null;

    return Number(completed[0].data.balanceAfter);
}


