
/* =========================================
   DATA & JOURNAL HUB
   MAIN DASHBOARD ENGINE
========================================= */

function dashboardMoney(value) {
    return Number(value || 0).toLocaleString("en-UG", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }) + " UGX";
}
/* =========================================
   DASHBOARD DATE FILTER
========================================= */

let dashboardPeriodMode = "month";
let dashboardSelectedDate = new Date().toISOString().slice(0, 10);

function getDashboardDateRange() {
    const selected = new Date(
        dashboardSelectedDate + "T12:00:00"
    );

    let start = new Date(selected);
    let end = new Date(selected);

    if (dashboardPeriodMode === "week") {
        const day = start.getDay();
        const difference = day === 0 ? 6 : day - 1;

        start.setDate(start.getDate() - difference);
        end = new Date(start);
        end.setDate(start.getDate() + 6);

    } else if (dashboardPeriodMode === "month") {
        start = new Date(
            selected.getFullYear(),
            selected.getMonth(),
            1
        );

        end = new Date(
            selected.getFullYear(),
            selected.getMonth() + 1,
            0
        );

    } else if (dashboardPeriodMode === "year") {
        start = new Date(selected.getFullYear(), 0, 1);
        end = new Date(selected.getFullYear(), 11, 31);
    }

    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    return { start, end };
}

function dashboardDateMatches(value) {
    if (!value) return false;

    const date = new Date(value);
    if (isNaN(date.getTime())) return false;

    const range = getDashboardDateRange();

    return date >= range.start && date <= range.end;
}

function setupDashboardDateFilter() {
    const mode = document.getElementById("dashboardPeriodMode");
    const date = document.getElementById("dashboardPeriodDate");

    if (!mode || !date) return;

    date.value = dashboardSelectedDate;

    mode.addEventListener("change", function () {
        dashboardPeriodMode = mode.value;
        loadMainDashboard();
    });

    date.addEventListener("change", function () {
        if (!date.value) return;

        dashboardSelectedDate = date.value;
        loadMainDashboard();
    });
}

function dashboardSet(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
}

async function loadMainDashboard() {
    if (!isHubVaultUnlocked()) return;

    try {

        console.log("Vault unlocked:", isHubVaultUnlocked());

        console.log(
            "All saved records:",
            await listHubRecords()
        );

        const [
            allRecords,
            journals,
            forms,
            collectedData,
            tasks,
            tradeRecords
        ] = await Promise.all([
            listHubRecords(),
            listHubRecords("journal"),
            listHubRecords("form"),
            listHubRecords("data"),
            listHubRecords("task"),
            listHubRecords("trade")
        ]);
      
        /* DATA MANAGEMENT */

        dashboardSet("dashTotalRecords", allRecords.length);
        dashboardSet("dashJournalCount", journals.length);
        dashboardSet("dashFormCount", forms.length);
        dashboardSet("dashDataCount", collectedData.length);

        /* TASK MANAGEMENT */

        const completed = tasks.filter(
            r => r.data?.status === "Completed"
        ).length;

        const pending = tasks.filter(
            r => r.data?.status === "Pending"
        ).length;

        const inProgress = tasks.filter(
            r => r.data?.status === "In Progress"
        ).length;

        dashboardSet("dashTaskTotal", tasks.length);
        dashboardSet("dashTaskPending", pending);
        dashboardSet("dashTaskProgress", inProgress);
        dashboardSet("dashTaskCompleted", completed);

        /* TRADING OVERVIEW */

        const trades = tradeRecords
            .map(record => record.data || {})
            .filter(trade => trade.status === "Closed");

        const totalPnL = trades.reduce(
            (sum, trade) => sum + Number(trade.profitLoss || 0), 0
        );

        const earliestTrade = [...trades].sort((a, b) =>
            String(a.tradeDate || a.createdAt || "")
                .localeCompare(String(b.tradeDate || b.createdAt || ""))
        )[0];

        const startingBalance = earliestTrade
            ? Number(earliestTrade.balanceBefore || 0)
            : 0;

        const transactions = await listHubRecords("accountTransaction") || [];

        const deposits = transactions
            .filter(r => r.data?.type === "Deposit")
            .reduce((sum, r) => sum + Number(r.data?.amount || 0), 0);

        const withdrawals = transactions
            .filter(r => r.data?.type === "Withdrawal")
            .reduce((sum, r) => sum + Number(r.data?.amount || 0), 0);

        const currentBalance =
            startingBalance + totalPnL + deposits - withdrawals;

        const growth = startingBalance > 0
            ? (totalPnL / startingBalance) * 100
            : 0;

        dashboardSet("dashTradingBalance", dashboardMoney(currentBalance));
        dashboardSet("dashTradingPnL", dashboardMoney(totalPnL));
        dashboardSet("dashTradingGrowth", growth.toFixed(2) + "%");
        dashboardSet("dashClosedTrades", trades.length);

/* DASHBOARD INSIGHTS */

const taskRate = tasks.length > 0
    ? (completed / tasks.length) * 100
    : 0;

dashboardSet(
    "dashInsightTaskRate",
    taskRate.toFixed(1) + "%"
);

dashboardSet(
    "dashInsightTrading",
    totalPnL >= 0
        ? "Profit: " + dashboardMoney(totalPnL)
        : "Loss: " + dashboardMoney(Math.abs(totalPnL))
);

dashboardSet(
    "dashInsightRecords",
    allRecords.length + " records"
);
      
      /* UPDATE DASHBOARD CHARTS */

renderDashboardCharts(
    journals,
    collectedData,
    tasks,
    trades,
    startingBalance
);
        /* RECENT ACTIVITIES */

        const activities = [
            ...journals.map(r => ({
                title: r.data?.title || "Journal entry",
                category: "Journal",
                date: r.data?.date || r.createdAt || ""
            })),

            ...collectedData.map(r => ({
                title: r.data?.formName || "Collected information",
                category: "Data Collection",
                date: r.data?.submittedAt || r.createdAt || ""
            })),

            ...tasks.map(r => ({
                title: r.data?.title || "Task",
                category: "Task • " + (r.data?.status || "Pending"),
                date: r.data?.updatedAt || r.createdAt || ""
            }))
                ].filter(item =>
            dashboardDateMatches(item.date)
        ).sort((a, b) =>
            String(b.date).localeCompare(String(a.date))
        ).slice(0, 8);

/* LATEST DASHBOARD INSIGHT */

const latestActivity = activities.length
    ? activities[0].title
    : "No activity yet";

dashboardSet(
    "dashInsightLatest",
    latestActivity
);
      
        const recentContainer =
            document.getElementById("dashboardRecentActivities");

        if (recentContainer) {

            recentContainer.innerHTML = activities.length
                ? activities.map(item => `
                    <div style="
                        padding:12px 0;
                        border-bottom:1px solid #e8ecf2;
                    ">
                        <strong>${dashboardEscape(item.title)}</strong>
                        <p style="font-size:12px;color:#8490a2;">
                            ${dashboardEscape(item.category)}
                        </p>
                        <small>${dashboardEscape(item.date)}</small>
                    </div>
                `).join("")
                : "<p>No recent activities yet.</p>";
        }

    } catch (error) {

    console.error("Dashboard loading error:", error);

    alert(
        "DASHBOARD ERROR: " + error.message
    );

}
}

function dashboardEscape(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}


/* =========================================
   DASHBOARD CHART RENDERING ENGINE
========================================= */

function dashboardChartBar(label, value, maximum, color) {
    const percentage = maximum > 0
        ? Math.max(0, value / maximum * 100)
        : 0;

    return `
        <div style="margin:12px 0;">
            <div style="
                display:flex;
                justify-content:space-between;
                gap:8px;
                font-size:12px;
                margin-bottom:5px;
            ">
                <span>${dashboardEscape(label)}</span>
                <strong>${value}</strong>
            </div>

            <div style="
                height:11px;
                background:#e9edf3;
                border-radius:10px;
                overflow:hidden;
            ">
                <div style="
                    width:${percentage}%;
                    height:100%;
                    background:${color};
                    border-radius:10px;
                "></div>
            </div>
        </div>
    `;
}

function dashboardChartDate(date) {
    if (!date) return "";

    const value = String(date).slice(0, 10);

    return /^\d{4}-\d{2}-\d{2}$/.test(value)
        ? value
        : "";
}

function renderDashboardCharts(
    journals,
    collectedData,
    tasks,
    trades,
    startingBalance
) {


        /* 1. ACTIVITY CHART */

    const activityContainer =
        document.getElementById("dashboardActivityChart");

    if (activityContainer) {

        const range = getDashboardDateRange();
        const activityDays = [];

        let current = new Date(range.start);

        while (current <= range.end) {

            const date = [
                current.getFullYear(),
                String(current.getMonth() + 1).padStart(2, "0"),
                String(current.getDate()).padStart(2, "0")
            ].join("-");

            activityDays.push(date);

            current.setDate(current.getDate() + 1);
        }

        const activityData = activityDays.map(date => {

            const journalCount = journals.filter(r =>
                dashboardChartDate(r.data?.date) === date
            ).length;

            const collectionCount = collectedData.filter(r =>
                dashboardChartDate(
                    r.data?.submittedAt || r.createdAt
                ) === date
            ).length;

            return {
                date,
                journalCount,
                collectionCount
            };
        });

        const maximum = Math.max(
            1,
            ...activityData.map(d =>
                d.journalCount + d.collectionCount
            )
        );

        activityContainer.innerHTML = activityData.map(day => `
            <div style="margin-bottom:15px;">
                <strong style="font-size:12px;">
                    ${dashboardEscape(day.date)}
                </strong>

                ${dashboardChartBar(
                    "Journal Entries",
                    day.journalCount,
                    maximum,
                    "#2864dc"
                )}

                ${dashboardChartBar(
                    "Collected Information",
                    day.collectionCount,
                    maximum,
                    "#16a085"
                )}
            </div>
        `).join("") +
        `<small style="color:#8490a2;">
            Blue: Journal • Green: Collected Information
        </small>`;
    }

    /* 2. TASK PROGRESS CHART */

    const taskContainer =
        document.getElementById("dashboardTaskChart");

    if (taskContainer) {

        const completed = tasks.filter(
            r => r.data?.status === "Completed"
        ).length;

        const pending = tasks.filter(
            r => r.data?.status === "Pending"
        ).length;

        const inProgress = tasks.filter(
            r => r.data?.status === "In Progress"
        ).length;

        const maximum = Math.max(
            1,
            completed,
            pending,
            inProgress
        );

        taskContainer.innerHTML = `
            ${dashboardChartBar(
                "Completed",
                completed,
                maximum,
                "#16a085"
            )}

            ${dashboardChartBar(
                "Pending",
                pending,
                maximum,
                "#e6a23c"
            )}

            ${dashboardChartBar(
                "In Progress",
                inProgress,
                maximum,
                "#2864dc"
            )}
        `;
    }

    /* 3. TRADING P&L CHART */

    const pnlContainer =
        document.getElementById("dashboardPnLChart");

    if (pnlContainer) {

        const recentTrades = trades
    .filter(trade =>
        dashboardDateMatches(
            trade.tradeDate || trade.createdAt
        )
    )
    .sort((a, b) =>
        String(a.tradeDate || a.createdAt || "")
            .localeCompare(
                String(b.tradeDate || b.createdAt || "")
            )
    );

        if (!recentTrades.length) {

            pnlContainer.innerHTML =
                "<p>No closed trades available yet.</p>";

        } else {

            pnlContainer.innerHTML = recentTrades.map((trade, index) => {

                const pnl = Number(trade.profitLoss || 0);

                const color = pnl >= 0
                    ? "#16a085"
                    : "#dc3545";

                return `
                    <div style="
                        display:flex;
                        justify-content:space-between;
                        align-items:center;
                        gap:10px;
                        padding:11px 0;
                        border-bottom:1px solid #e8ecf2;
                    ">
                        <span style="font-size:12px;">
                            Trade ${index + 1}
                            <br>
                            <small>${dashboardEscape(
                                trade.tradeDate || "Date unavailable"
                            )}</small>
                        </span>

                        <strong style="color:${color};">
                            ${pnl >= 0 ? "+" : ""}
                            ${dashboardMoney(pnl)}
                        </strong>
                    </div>
                `;
            }).join("");
        }
    }

    /* 4. ACCOUNT BALANCE TREND */

    const balanceContainer =
        document.getElementById("dashboardBalanceChart");

    if (balanceContainer) {

        const chronologicalTrades = trades
    .filter(trade =>
        dashboardDateMatches(
            trade.tradeDate || trade.createdAt
        )
    )
    .sort((a, b) =>
        String(a.tradeDate || a.createdAt || "")
            .localeCompare(
                String(b.tradeDate || b.createdAt || "")
            )
    );

        if (!chronologicalTrades.length) {

            balanceContainer.innerHTML =
                "<p>No closed trade balance history available yet.</p>";

        } else {

            let runningBalance = Number(startingBalance || 0);

            const balanceData = chronologicalTrades.map(trade => {

                const pnl = Number(trade.profitLoss || 0);

                if (
                    trade.balanceAfter !== null &&
                    trade.balanceAfter !== undefined &&
                    trade.balanceAfter !== ""
                ) {
                    runningBalance = Number(trade.balanceAfter);
                } else {
                    runningBalance += pnl;
                }

                return {
                    date: trade.tradeDate || "Date unavailable",
                    balance: runningBalance
                };
            });

            const minimum = Math.min(
                ...balanceData.map(item => item.balance)
            );

            const maximum = Math.max(
                ...balanceData.map(item => item.balance)
            );

            const range = maximum - minimum;

            balanceContainer.innerHTML = balanceData.map(
                (item, index) => {

                    const percentage = range > 0
                        ? ((item.balance - minimum) / range) * 100
                        : 50;

                    return `
                        <div style="margin-bottom:15px;">
                            <div style="
                                display:flex;
                                justify-content:space-between;
                                gap:8px;
                                font-size:12px;
                                margin-bottom:5px;
                            ">
                                <span>Trade ${index + 1}</span>
                                <strong>${dashboardMoney(item.balance)}</strong>
                            </div>

                            <div style="
                                height:12px;
                                background:#e9edf3;
                                border-radius:10px;
                                overflow:hidden;
                            ">
                                <div style="
                                    width:${Math.max(2, percentage)}%;
                                    height:100%;
                                    background:#2864dc;
                                    border-radius:10px;
                                "></div>
                            </div>

                            <small style="color:#8490a2;">
                                ${dashboardEscape(item.date)}
                            </small>
                        </div>
                    `;
                }
            ).join("");
        }
    }
}
document.addEventListener("DOMContentLoaded", function () {
    setupDashboardDateFilter();
});
