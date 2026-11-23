
/* =========================================
   ALL FOUNDATION GROUP
   TRADE ANALYTICS — GREEN EDITION
   Existing trading data and calculations
   preserved
========================================= */

let tradingAnalyticsRecords = [];

/* =========================================
   ANALYTICS DESIGN
========================================= */

function injectTradingAnalyticsStyles() {
    if (document.getElementById("taDesignStyles")) return;

    const style = document.createElement("style");
    style.id = "taDesignStyles";

    style.textContent = `
        #tradingAnalyticsContent {
            color: #203c36;
            font-family: Arial, sans-serif;
        }

        #tradingAnalyticsContent * {
            box-sizing: border-box;
        }

        .ta-heading {
            margin-bottom: 18px;
        }

        .ta-heading h2 {
            color: #10463d;
            font-size: 22px;
            margin: 0 0 6px;
        }

        .ta-heading p {
            color: #6d7e79;
            font-size: 13px;
            margin: 0;
        }

        .ta-section-title {
            color: #10463d;
            font-size: 16px;
            font-weight: 700;
            margin: 0 0 15px;
        }

        .ta-stats-grid {
            display: grid;
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 12px;
            margin-bottom: 16px;
        }

        .ta-stat-card {
            background: #fff;
            border: 1px solid #dce7e2;
            border-radius: 12px;
            padding: 16px;
            min-width: 0;
            box-shadow: 0 2px 7px rgba(16,70,61,.04);
        }

        .ta-stat-card p {
            color: #6d7e79;
            font-size: 12px;
            margin: 0 0 9px;
        }

        .ta-stat-card h3 {
            font-size: 20px;
            margin: 0;
            overflow-wrap: anywhere;
            color: #203c36;
        }

        .ta-stat-card small {
            display: block;
            margin-top: 7px;
            color: #81908b;
            font-size: 11px;
        }

        .ta-stat-green {
            background: #e8f5ed;
            border-color: #d1e9da;
        }

        .ta-stat-green h3 {
            color: #27815e;
        }

        .ta-stat-blue {
            background: #eaf2ff;
            border-color: #d9e6fa;
        }

        .ta-stat-blue h3 {
            color: #316eb5;
        }

        .ta-stat-purple {
            background: #f1eafa;
            border-color: #e6d9f4;
        }

        .ta-stat-purple h3 {
            color: #8651b8;
        }

        .ta-stat-orange {
            background: #fff3e3;
            border-color: #f4e3c9;
        }

        .ta-stat-orange h3 {
            color: #a96f1d;
        }

        .ta-stat-red {
            background: #fff0ef;
            border-color: #f3d9d7;
        }

        .ta-stat-red h3 {
            color: #b74343;
        }

        .ta-stat-teal {
            background: #e6f5f2;
            border-color: #d1e9e4;
        }

        .ta-stat-teal h3 {
            color: #247a70;
        }

        .ta-panel {
            background: #fff;
            border: 1px solid #dce7e2;
            border-radius: 12px;
            padding: 17px;
            margin-bottom: 15px;
            box-shadow: 0 2px 8px rgba(16,70,61,.045);
            min-width: 0;
        }

        .ta-panel-subtitle {
            color: #6d7e79;
            font-size: 12px;
            margin: -7px 0 14px;
            line-height: 1.5;
        }

        .ta-chart-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 14px;
        }

        .ta-chart-row {
            display: grid;
            grid-template-columns: 85px minmax(40px, 1fr) 90px;
            align-items: center;
            gap: 9px;
            margin: 12px 0;
        }

        .ta-chart-row small {
            color: #6d7e79;
            font-size: 11px;
            overflow-wrap: anywhere;
        }

        .ta-chart-row small:last-child {
            text-align: right;
            color: #203c36;
            font-weight: 600;
        }

        .ta-bar-track {
            background: #edf3f0;
            height: 13px;
            border-radius: 20px;
            overflow: hidden;
        }

        .ta-bar-fill {
            height: 100%;
            min-width: 3px;
            border-radius: 20px;
        }

        .ta-heatmap-controls {
            display: flex;
            flex-wrap: wrap;
            gap: 9px;
            margin-bottom: 16px;
        }

        .ta-heatmap-controls select,
        .ta-heatmap-controls input {
            background: #f7faf8;
            border: 1px solid #dce7e2;
            border-radius: 8px;
            padding: 10px;
            color: #203c36;
            font-size: 13px;
            min-width: 120px;
        }

        .ta-calendar {
            display: grid;
            grid-template-columns: repeat(7, minmax(0, 1fr));
            gap: 5px;
        }

        .ta-day {
            min-height: 36px;
            border-radius: 7px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            font-weight: 600;
            padding: 4px;
        }

        .ta-day-name {
            color: #81908b;
            text-align: center;
            font-size: 11px;
            padding: 5px 0;
        }

        .ta-empty {
            min-height: 30px;
        }

        .ta-profit {
            background: #d9f1e2;
            color: #176b43;
        }

        .ta-loss {
            background: #fbe1df;
            color: #b74343;
        }

        .ta-even {
            background: #fff0cf;
            color: #9a6b17;
        }

        .ta-no-trade {
            background: #edf1ef;
            color: #81908b;
        }

        .ta-legend {
            display: flex;
            flex-wrap: wrap;
            gap: 12px;
            margin-top: 13px;
        }

        .ta-legend-item {
            display: flex;
            align-items: center;
            gap: 5px;
            color: #6d7e79;
            font-size: 11px;
        }

        .ta-legend-dot {
            width: 10px;
            height: 10px;
            border-radius: 3px;
        }

        .ta-performance-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 12px;
            padding: 13px 0;
            border-bottom: 1px solid #edf2ef;
            font-size: 13px;
        }

        .ta-performance-row:last-child {
            border-bottom: 0;
        }

        .ta-performance-label {
            color: #6d7e79;
        }

        .ta-performance-value {
            color: #203c36;
            font-weight: 700;
            text-align: right;
            overflow-wrap: anywhere;
        }

        .ta-positive {
            color: #27815e;
        }

        .ta-negative {
            color: #b74343;
        }

        .ta-empty-state {
            text-align: center;
            padding: 28px 15px;
            color: #81908b;
            background: #f7faf8;
            border: 1px dashed #dce7e2;
            border-radius: 10px;
            font-size: 13px;
        }

        .ta-loading {
            padding: 20px;
            text-align: center;
            color: #6d7e79;
        }

        @media(max-width: 850px) {
            .ta-stats-grid {
                grid-template-columns: repeat(2, minmax(0, 1fr));
            }

            .ta-chart-grid {
                grid-template-columns: 1fr;
            }
        }

        @media(max-width: 480px) {
            .ta-stat-card {
                padding: 13px;
            }

            .ta-stat-card h3 {
                font-size: 17px;
            }

            .ta-panel {
                padding: 13px;
            }

            .ta-chart-row {
                grid-template-columns: 65px minmax(30px, 1fr) 75px;
                gap: 6px;
            }

            .ta-chart-row small {
                font-size: 10px;
            }

            .ta-day {
                min-height: 31px;
                font-size: 11px;
            }
        }
    `;

    document.head.appendChild(style);
}

/* =========================================
   GENERAL HELPERS
========================================= */

function taMoney(value) {
    return Number(value || 0).toLocaleString("en-UG") + " UGX";
}

function taEscape(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

/* =========================================
   LOAD ANALYTICS
========================================= */
async function loadTradingAnalytics() {
    const container = document.getElementById("tradingAnalyticsContent");

    if (!container) return;

    injectTradingAnalyticsStyles();

    container.innerHTML = `
        <div class="ta-loading">
            Loading your saved trading records...
        </div>
    `;

    try {
        tradingAnalyticsRecords = await listHubRecords("trade") || [];

        renderTradingAnalytics();

    } catch (error) {
        console.error("Trading Analytics loading error:", error);

        container.innerHTML = `
            <div class="ta-empty-state">
                Unable to load trading records.<br>
                ${taEscape(error.message || "Unknown error")}
            </div>
        `;
    }
}

function renderTradingAnalytics() {
    const container = document.getElementById("tradingAnalyticsContent");
    if (!container) return;

    injectTradingAnalyticsStyles();

    // Read every saved trade without discarding records
    // simply because a date field is missing.
    const trades = tradingAnalyticsRecords
        .filter(record => record && record.data &&
            typeof record.data === "object")
        .map(record => {
            const trade = { ...record.data };

            trade.tradeDate = String(
                trade.tradeDate ||
                trade.createdAt ||
                record.createdAt ||
                record.updatedAt ||
                ""
            ).slice(0, 10);

            return trade;
        })
        .sort((a, b) =>
            String(a.tradeDate).localeCompare(String(b.tradeDate)) ||
            Number(a.tradeDay || 0) - Number(b.tradeDay || 0)
        );

    const closed = trades.filter(t => t.status === "Closed");

    const wins = closed.filter(t =>
        t.outcome === "Win" || Number(t.profitLoss) > 0
    );

    const losses = closed.filter(t =>
        t.outcome === "Loss" || Number(t.profitLoss) < 0
    );

    const breakEven = closed.filter(t =>
        t.outcome === "Break-even" ||
        (!t.outcome && Number(t.profitLoss) === 0)
    ).length;

    const totalPnL = closed.reduce(
        (sum, t) => sum + (Number(t.profitLoss) || 0), 0
    );

    const winningTotal = wins.reduce(
        (sum, t) => sum + (Number(t.profitLoss) || 0), 0
    );

    const losingTotal = Math.abs(losses.reduce(
        (sum, t) => sum + (Number(t.profitLoss) || 0), 0
    ));

    const profitFactor = losingTotal
        ? (winningTotal / losingTotal).toFixed(2)
        : (winningTotal > 0 ? "∞" : "0.00");

    const winRate = closed.length
        ? (wins.length / closed.length * 100).toFixed(1)
        : "0.0";

    const averageWin = wins.length
        ? winningTotal / wins.length : 0;

    const averageLoss = losses.length
        ? losingTotal / losses.length : 0;

    const days = {};

    closed.forEach(trade => {
        if (!trade.tradeDate) return;

        days[trade.tradeDate] =
            (days[trade.tradeDate] || 0) +
            (Number(trade.profitLoss) || 0);
    });

    const dailyValues = Object.entries(days)
        .sort((a, b) => a[0].localeCompare(b[0]));

    const bestDay = dailyValues.length
    ? dailyValues.reduce((best, day) =>
        day[1] > best[1] ? day : best)
    : null;

const otherDays = bestDay
    ? dailyValues.filter(day => day !== bestDay)
    : [];

const worstDay = otherDays.length
    ? otherDays.reduce((worst, day) =>
        day[1] < worst[1] ? day : worst)
    : null;

    let equity = 0;
    let peak = 0;

    const equityPoints = closed.map(trade => {
        equity += Number(trade.profitLoss) || 0;
        peak = Math.max(peak, equity);

        return {
            date: trade.tradeDate || "Undated",
            equity,
            drawdown: equity - peak
        };
    });

    const maxDrawdown = equityPoints.length
        ? Math.min(...equityPoints.map(point => point.drawdown))
        : 0;

    const pnlCardClass =
        totalPnL >= 0 ? "ta-stat-green" : "ta-stat-red";

    container.innerHTML = `
        <div class="ta-heading">
            <h2>Trading Performance</h2>
            <p>Your trading statistics, consistency and risk performance</p>
        </div>

        <div class="ta-stats-grid">
            <div class="ta-stat-card ta-stat-blue">
                <p>Total Saved Trades</p>
                <h3>${trades.length}</h3>
                <small>All recorded trades</small>
            </div>

            <div class="ta-stat-card ta-stat-green">
                <p>Winning Trades</p>
                <h3>${wins.length}</h3>
                <small>Profitable closed trades</small>
            </div>

            <div class="ta-stat-card ta-stat-red">
                <p>Losing Trades</p>
                <h3>${losses.length}</h3>
                <small>Loss-making closed trades</small>
            </div>

            <div class="ta-stat-card ta-stat-orange">
                <p>Open Trades</p>
                <h3>${trades.filter(t => t.status === "Open").length}</h3>
                <small>Currently open</small>
            </div>

            <div class="ta-stat-card ta-stat-purple">
                <p>Win Rate</p>
                <h3>${winRate}%</h3>
                <small>Wins divided by closed trades</small>
            </div>

            <div class="ta-stat-card ${pnlCardClass}">
                <p>Net P&amp;L</p>
                <h3>${taMoney(totalPnL)}</h3>
                <small>Overall closed-trade result</small>
            </div>

            <div class="ta-stat-card ta-stat-teal">
                <p>Profit Factor</p>
                <h3>${profitFactor}</h3>
                <small>Gross profit / gross loss</small>
            </div>

            <div class="ta-stat-card ta-stat-red">
                <p>Maximum Drawdown</p>
                <h3>${taMoney(maxDrawdown)}</h3>
                <small>Largest decline from equity peak</small>
            </div>
        </div>

        <div class="ta-panel">
            <h3 class="ta-section-title">Trading Performance Summary</h3>

            <div class="ta-performance-row">
                <span class="ta-performance-label">Closed Trades</span>
                <span class="ta-performance-value">${closed.length}</span>
            </div>

            <div class="ta-performance-row">
                <span class="ta-performance-label">Break-even Trades</span>
                <span class="ta-performance-value">${breakEven}</span>
            </div>

            <div class="ta-performance-row">
                <span class="ta-performance-label">Average Winning Trade</span>
                <span class="ta-performance-value ta-positive">${taMoney(averageWin)}</span>
            </div>

            <div class="ta-performance-row">
                <span class="ta-performance-label">Average Losing Trade</span>
                <span class="ta-performance-value ta-negative">${taMoney(averageLoss)}</span>
            </div>

            <div class="ta-performance-row">
                <span class="ta-performance-label">Gross Profit</span>
                <span class="ta-performance-value ta-positive">${taMoney(winningTotal)}</span>
            </div>

            <div class="ta-performance-row">
                <span class="ta-performance-label">Gross Loss</span>
                <span class="ta-performance-value ta-negative">${taMoney(-losingTotal)}</span>
            </div>
        </div>

        <div class="ta-panel">
            <h3 class="ta-section-title">Trading Days Heatmap</h3>
            <p class="ta-panel-subtitle">
                Green = profit, red = loss, yellow = break-even and grey = no trades.
            </p>
            <div id="tradingHeatmap"></div>
        </div>

        <div class="ta-chart-grid">
            <div class="ta-panel">
                <h3 class="ta-section-title">Daily Profit / Loss</h3>
                <p class="ta-panel-subtitle">Daily closed-trade results</p>
                <div id="dailyPnLGraph"></div>
        
            </div>
      <div class="ta-panel">
    <h3 class="ta-section-title">Profit / Loss Distribution</h3>
    <p class="ta-panel-subtitle">Gross winning trades versus gross losing trades</p>
    <div id="profitLossPieChart" style="width:100%;min-height:240px;"></div>
</div>

            <div class="ta-panel">
    <h3 class="ta-section-title">Equity Curve</h3>
    <p class="ta-panel-subtitle">Cumulative profit and loss</p>
    <div id="equityGraph" style="width:100%;min-height:240px;"></div>
</div>

            <div class="ta-panel">
                <h3 class="ta-section-title">Drawdown Monitor</h3>
                <p class="ta-panel-subtitle">Distance below your previous equity peak</p>
                <div id="drawdownGraph"></div>
            </div>

            <div class="ta-panel">
                <h3 class="ta-section-title">Best and Worst Trading Days</h3>

                <div class="ta-performance-row">
                    <span class="ta-performance-label">Best Trading Day</span>
                    <span class="ta-performance-value ta-positive">
                        ${bestDay
                            ? taEscape(bestDay[0]) + " — " + taMoney(bestDay[1])
                            : "No data"}
                    </span>
                </div>

                <div class="ta-performance-row">
                    <span class="ta-performance-label">Worst Trading Day</span>
                    <span class="ta-performance-value ta-negative">
                        ${worstDay
                            ? taEscape(worstDay[0]) + " — " + taMoney(worstDay[1])
                            : "No data"}
                    </span>
                </div>
            </div>
        </div>
    `;

    renderTradingHeatmap(days);
    renderTradingBars("dailyPnLGraph", dailyValues, "pnl");
renderProfitLossPie(winningTotal, losingTotal);
    renderEquityCurve(equityPoints);

    renderTradingBars(
        "drawdownGraph",
        equityPoints.map(point => [point.date, point.drawdown]),
        "drawdown"
    );
}


/* =========================================
   TRADING HEATMAP
========================================= */

function renderTradingHeatmap(days) {
    const target = document.getElementById("tradingHeatmap");
    if (!target) return;

    const today = new Date();

    const todayString =
        today.getFullYear() + "-" +
        String(today.getMonth() + 1).padStart(2, "0") + "-" +
        String(today.getDate()).padStart(2, "0");

    target.innerHTML = `
        <div class="ta-heatmap-controls">
            <select id="taHeatmapMode">
                <option value="day">Day</option>
                <option value="week">Week</option>
                <option value="month" selected>Month</option>
                <option value="year">Year</option>
            </select>

            <input type="date" id="taHeatmapDate"
                value="${todayString}">
        </div>

        <div id="taHeatmapDisplay"></div>

        <div class="ta-legend">
            <div class="ta-legend-item">
                <span class="ta-legend-dot" style="background:#d9f1e2"></span>
                Profit
            </div>

            <div class="ta-legend-item">
                <span class="ta-legend-dot" style="background:#fbe1df"></span>
                Loss
            </div>

            <div class="ta-legend-item">
                <span class="ta-legend-dot" style="background:#fff0cf"></span>
                Break-even
            </div>

            <div class="ta-legend-item">
                <span class="ta-legend-dot" style="background:#edf1ef"></span>
                No trades
            </div>
        </div>
    `;

    const mode = document.getElementById("taHeatmapMode");
    const dateInput = document.getElementById("taHeatmapDate");

    function draw() {
        renderSelectedHeatmap(days, mode.value, dateInput.value);
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
                title="${key}: ${taEscape(detail)}">
                ${date.getDate()}
            </div>
        `;
    }

    function monthCalendar(year, month, small = false) {
        const firstDay = new Date(year, month, 1).getDay();
        const totalDays = new Date(year, month + 1, 0).getDate();

        let html = `
            <div style="margin-bottom:15px;min-width:0;">
                <h4 style="color:#10463d;margin-bottom:8px;">
                    ${new Date(year, month, 1).toLocaleString("en", {
                        month: "long"
                    })}
                </h4>

                <div class="ta-calendar">
        `;

        names.forEach(name => {
            html += `
                <div class="ta-day-name"
                    style="font-size:${small ? "9px" : "12px"}">
                    ${name}
                </div>
            `;
        });

        for (let i = 0; i < firstDay; i++) {
            html += '<div class="ta-empty"></div>';
        }

        for (let day = 1; day <= totalDays; day++) {
            html += dayCell(new Date(year, month, day));
        }

        html += "</div></div>";

        return html;
    }

    if (mode === "day") {
        const key = dateString(selected);
        const hasTrades = Object.prototype.hasOwnProperty.call(days, key);
        const value = days[key];

        display.innerHTML = `
            <h4 style="color:#10463d">${key}</h4>

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

        start.setDate(
            start.getDate() - ((start.getDay() + 6) % 7)
        );

        const end = new Date(start);
        end.setDate(start.getDate() + 6);

        let html = `
            <h4 style="color:#10463d">
                Week: ${dateString(start)} to ${dateString(end)}
            </h4>

            <div class="ta-calendar">
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

        let html = `
            <h4 style="color:#10463d;margin-bottom:14px;">
                Trading Heatmap — ${year}
            </h4>

            <div style="
                display:grid;
                grid-template-columns:repeat(2,minmax(0,1fr));
                gap:12px;
            ">
        `;

        for (let month = 0; month < 12; month++) {
            html += monthCalendar(year, month, true);
        }

        display.innerHTML = html + "</div>";
    }
}

/* =========================================
   PROFIT / LOSS PIE CHART
========================================= */

function renderProfitLossPie(grossProfit, grossLoss) {
    const target = document.getElementById("profitLossPieChart");
    if (!target) return;

    const profit = Math.max(0, Number(grossProfit) || 0);
    const loss = Math.max(0, Number(grossLoss) || 0);
    const total = profit + loss;

    if (total === 0) {
        target.innerHTML =
            '<div class="ta-empty-state">No profit/loss data available yet.</div>';
        return;
    }

    const radius = 75;
    const circumference = 2 * Math.PI * radius;

    const profitLength = profit / total * circumference;
    const lossLength = loss / total * circumference;

    const profitPercent = (profit / total * 100).toFixed(1);
    const lossPercent = (loss / total * 100).toFixed(1);

    target.innerHTML = `
        <div style="
            display:flex;
            flex-wrap:wrap;
            align-items:center;
            justify-content:center;
            gap:25px;
        ">
            <svg viewBox="0 0 200 200"
                width="190" height="190"
                role="img"
                aria-label="Profit and loss distribution pie chart">

                <circle cx="100" cy="100" r="${radius}"
                    fill="none"
                    stroke="#edf1ef"
                    stroke-width="30"/>

                <circle cx="100" cy="100" r="${radius}"
                    fill="none"
                    stroke="#27815e"
                    stroke-width="30"
                    stroke-dasharray="${profitLength} ${circumference}"
                    transform="rotate(-90 100 100)"/>

                <circle cx="100" cy="100" r="${radius}"
                    fill="none"
                    stroke="#b74343"
                    stroke-width="30"
                    stroke-dasharray="${lossLength} ${circumference}"
                    stroke-dashoffset="${-profitLength}"
                    transform="rotate(-90 100 100)"/>

                <text x="100" y="96"
                    text-anchor="middle"
                    font-size="12" fill="#6d7e79">
                    Total
                </text>

                <text x="100" y="115"
                    text-anchor="middle"
                    font-size="15" font-weight="bold"
                    fill="#203c36">
                    ${taEscape(taMoney(total))}
                </text>
            </svg>

            <div style="min-width:150px;">
                <div class="ta-performance-row">
                    <span class="ta-performance-label">
                        <span style="color:#27815e">●</span> Profit
                    </span>
                    <span class="ta-performance-value ta-positive">
                        ${profitPercent}%
                    </span>
                </div>

                <div class="ta-performance-row">
                    <span class="ta-performance-label">
                        <span style="color:#b74343">●</span> Loss
                    </span>
                    <span class="ta-performance-value ta-negative">
                        ${lossPercent}%
                    </span>
                </div>

                <p style="font-size:12px;color:#6d7e79;margin-top:12px;">
                    Gross profit: ${taMoney(profit)}<br>
                    Gross loss: ${taMoney(loss)}
                </p>
            </div>
        </div>
    `;
}
/* =========================================
   ANALYTICS BAR CHARTS
========================================= */

/* =========================================
   YELLOW EQUITY CURVE LINE GRAPH
========================================= */

function renderEquityCurve(points) {
    const target = document.getElementById("equityGraph");
    if (!target) return;

    if (!points || !points.length) {
        target.innerHTML =
            '<div class="ta-empty-state">No equity data yet.</div>';
        return;
    }

    const width = 700;
    const height = 240;
    const left = 55;
    const right = 20;
    const top = 20;
    const bottom = 35;

    const values = points.map(point => Number(point.equity) || 0);

    let min = Math.min(...values);
    let max = Math.max(...values);

    if (min === max) {
        min -= 1;
        max += 1;
    }

    const range = max - min;

    const coordinates = values.map((value, index) => {
        const x = points.length === 1
            ? width / 2
            : left + index / (points.length - 1) *
                (width - left - right);

        const y = top +
            (max - value) / range *
            (height - top - bottom);

        return { x, y, value };
    });

    const line = coordinates
        .map(point => `${point.x},${point.y}`)
        .join(" ");

    const grid = [0, 1, 2, 3, 4].map(index => {
        const y = top + index *
            (height - top - bottom) / 4;

        const value = max - index * range / 4;

        return `
            <line x1="${left}" y1="${y}"
                x2="${width - right}" y2="${y}"
                stroke="#e6ece9" stroke-width="1"/>

            <text x="${left - 8}" y="${y + 4}"
                text-anchor="end"
                font-size="11" fill="#6d7e79">
                ${value.toFixed(0)}
            </text>
        `;
    }).join("");

    const dots = coordinates.map(point => `
        <circle cx="${point.x}" cy="${point.y}"
            r="3.5" fill="#e5b52e"
            stroke="#ffffff" stroke-width="1.5">
            <title>${point.value.toFixed(2)} UGX</title>
        </circle>
    `).join("");

    const firstDate = taEscape(points[0].date);
    const lastDate = taEscape(points[points.length - 1].date);

    target.innerHTML = `
        <div style="width:100%;overflow:hidden;">
            <svg viewBox="0 0 ${width} ${height}"
                width="100%" role="img"
                aria-label="Yellow cumulative equity curve">

                ${grid}

                <polyline
                    points="${line}"
                    fill="none"
                    stroke="#e5b52e"
                    stroke-width="4"
                    stroke-linecap="round"
                    stroke-linejoin="round"/>

                ${dots}

                <text x="${left}" y="${height - 8}"
                    font-size="10" fill="#6d7e79">
                    ${firstDate}
                </text>

                <text x="${width - right}"
                    y="${height - 8}"
                    text-anchor="end"
                    font-size="10" fill="#6d7e79">
                    ${lastDate}
                </text>
            </svg>
        </div>
    `;
}

function renderTradingBars(targetId, values, type) {
    const target = document.getElementById(targetId);
    if (!target) return;

    if (!values.length) {
        target.innerHTML =
            '<div class="ta-empty-state">No closed-trade data yet.</div>';
        return;
    }

    const recent = values.slice(-15);

    const max = Math.max(
        1,
        ...recent.map(item => Math.abs(Number(item[1])))
    );

    target.innerHTML = recent.map(item => {
        const value = Number(item[1]);

        const width = Math.max(
            3,
            Math.abs(value) / max * 100
        );

        let color = value >= 0 ? "#27815e" : "#b74343";

        if (type === "drawdown") {
            color = "#b74343";
        }

        if (type === "equity") {
            color = value >= 0 ? "#247a70" : "#b74343";
        }

        return `
            <div class="ta-chart-row">
                <small>${taEscape(item[0])}</small>

                <div class="ta-bar-track">
                    <div class="ta-bar-fill"
                        style="width:${width}%;background:${color}">
                    </div>
                </div>

                <small>${taEscape(value.toFixed(2))}</small>
            </div>
        `;
    }).join("");
}

/* =========================================
   TRADE RISK MONITOR
========================================= */

function updateTradeRiskMonitor() {
    const balance = Number(
        document.getElementById("tradeBalanceBefore")?.value || 0
    );

    const percent = Number(
        document.getElementById("tradeRiskPercent")?.value || 6
    );

    const amountField = document.getElementById("tradeRiskAmount");
    const monitor = document.getElementById("tradeRiskMonitor");

    if (!amountField || !monitor) return;

    if (balance <= 0 || percent <= 0 || percent > 100) {
        amountField.value = "";
        monitor.textContent =
            "Enter a valid balance and risk percentage.";
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

/* =========================================
   LATEST TRADING BALANCE
========================================= */


async function getLatestTradingBalance(excludeTradeId = null) {

    // Starting capital is always UGX 0.
    const STARTING_BALANCE = 0;

    // Load saved trading records and account transactions.
    const trades = await listHubRecords("trade") || [];
    const transactions = await listHubRecords("accountTransaction") || [];

    // Calculate all closed-trade profit and loss.
    const totalPnL = trades
        .filter(record =>
            record.id !== excludeTradeId &&
            record.data?.status === "Closed"
        )
        .reduce((sum, record) => {
            return sum + (Number(record.data?.profitLoss) || 0);
        }, 0);

    // Calculate all deposits.
    const totalDeposits = transactions
        .filter(record => record.data?.type === "Deposit")
        .reduce((sum, record) => {
            return sum + (Number(record.data?.amount) || 0);
        }, 0);

    // Calculate all withdrawals.
    const totalWithdrawals = transactions
        .filter(record => record.data?.type === "Withdrawal")
        .reduce((sum, record) => {
            return sum + (Number(record.data?.amount) || 0);
        }, 0);

    // Calculate the actual account balance.
    const currentBalance =
        STARTING_BALANCE +
        totalDeposits -
        totalWithdrawals +
        totalPnL;

    return Number(currentBalance.toFixed(2));
}

