
let analyticsRecords = [];
let analyticsPeriod = "7";

async function loadAnalytics() {
    const container = document.getElementById("analyticsContent");
    if (!container) return;

    container.innerHTML = "<p>Loading analytics...</p>";

    try {
        const types = ["task", "journal", "data"];
        const results = await Promise.all(
            types.map(type => listHubRecords(type))
        );

        analyticsRecords = results.flat();
        renderAnalytics();

    } catch (error) {
        console.error("Analytics error:", error);
        container.innerHTML = "<p>Unable to load analytics.</p>";
    }
}

function analyticsDate(record) {
    const data = record.data || {};
    const raw =
        data.date ||
        data.activityDate ||
        record.updatedAt ||
        record.createdAt;

    if (!raw) return null;

    const date = new Date(raw);

    return isNaN(date.getTime()) ? null : date;
}

function analyticsEscape(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

function renderAnalytics() {
    const container = document.getElementById("analyticsContent");
    if (!container) return;

    const now = new Date();
    const period = analyticsPeriod;

    let startDate = null;

    if (period === "today") {
        startDate = new Date(now);
        startDate.setHours(0, 0, 0, 0);
    } else if (period !== "all") {
        startDate = new Date(now);
        startDate.setDate(now.getDate() - Number(period) + 1);
        startDate.setHours(0, 0, 0, 0);
    }

    const records = analyticsRecords.filter(record => {
        const date = analyticsDate(record);

        return !startDate || (date && date >= startDate && date <= now);
    });

    const tasks = records.filter(r => r.type === "task");
    const journals = records.filter(r => r.type === "journal");
    const submissions = records.filter(r => r.type === "data");

    const completed = tasks.filter(r =>
        r.data?.status === "Completed"
    ).length;

    const pending = tasks.filter(r =>
        r.data?.status === "Pending"
    ).length;

    const inProgress = tasks.filter(r =>
        r.data?.status === "In Progress"
    ).length;

    const cancelled = tasks.filter(r =>
        r.data?.status === "Cancelled"
    ).length;

    const completionRate = tasks.length
        ? Math.round(completed / tasks.length * 100)
        : 0;

    const categories = {};

    tasks.forEach(record => {
        const category = record.data?.category || "Other";
        categories[category] = (categories[category] || 0) + 1;
    });

    const statusData = [
        { name: "Completed", value: completed },
        { name: "Pending", value: pending },
        { name: "In Progress", value: inProgress },
        { name: "Cancelled", value: cancelled }
    ];

    const statusTotal = tasks.length || 1;

    const statusBars = statusData.map(item => {
        const percentage = Math.round(item.value / statusTotal * 100);

        return `
            <div style="margin:12px 0;">
                <div style="display:flex;justify-content:space-between;">
                    <strong>${item.name}</strong>
                    <span>${item.value} (${percentage}%)</span>
                </div>
                <div style="height:10px;background:#ddd;border-radius:8px;overflow:hidden;">
                    <div style="height:100%;width:${percentage}%;background:#2563eb;"></div>
                </div>
            </div>
        `;
    }).join("");

    const categoryBars = Object.entries(categories).map(([name, value]) => {
        const percentage = Math.round(value / (tasks.length || 1) * 100);

        return `
            <div style="margin:12px 0;">
                <div style="display:flex;justify-content:space-between;">
                    <strong>${analyticsEscape(name)}</strong>
                    <span>${value}</span>
                </div>
                <div style="height:10px;background:#ddd;border-radius:8px;overflow:hidden;">
                    <div style="height:100%;width:${percentage}%;background:#0d9488;"></div>
                </div>
            </div>
        `;
    }).join("");

    const dailyData = [];

    for (let i = 6; i >= 0; i--) {
        const day = new Date(now);
        day.setDate(now.getDate() - i);
        day.setHours(0, 0, 0, 0);

        const nextDay = new Date(day);
        nextDay.setDate(day.getDate() + 1);

        const dayTasks = tasks.filter(record => {
            const date = analyticsDate(record);
            return date && date >= day && date < nextDay;
        });

        dailyData.push({
            label: day.toLocaleDateString(undefined, { weekday: "short" }),
            completed: dayTasks.filter(r =>
                r.data?.status === "Completed"
            ).length,
            total: dayTasks.length
        });
    }

    const maxValue = Math.max(
        1,
        ...dailyData.map(day => day.total)
    );

    const dailyBars = dailyData.map(day => {
        const height = Math.max(4, day.total / maxValue * 100);
        const doneHeight = day.total
            ? day.completed / day.total * height
            : 0;

        return `
            <div style="flex:1;text-align:center;min-width:0;">
                <div style="height:120px;display:flex;align-items:flex-end;justify-content:center;">
                    <div style="width:65%;height:${height}%;background:#cbd5e1;border-radius:5px 5px 0 0;position:relative;overflow:hidden;">
                        <div style="position:absolute;bottom:0;width:100%;height:${day.total ? day.completed / day.total * 100 : 0}%;background:#0d9488;"></div>
                    </div>
                </div>
                <small>${day.label}</small>
                <div style="font-size:11px;">${day.completed}/${day.total}</div>
            </div>
        `;
    }).join("");

    container.innerHTML = `
        <div class="stats">
            <div class="panel">
                <h3>${tasks.length}</h3>
                <p>Total Tasks</p>
            </div>

            <div class="panel">
                <h3>${completed}</h3>
                <p>Completed Tasks</p>
            </div>

            <div class="panel">
                <h3>${completionRate}%</h3>
                <p>Completion Rate</p>
            </div>

            <div class="panel">
                <h3>${journals.length}</h3>
                <p>Journal Entries</p>
            </div>

            <div class="panel">
                <h3>${submissions.length}</h3>
                <p>Data Submissions</p>
            </div>

            <div class="panel">
                <h3>${inProgress}</h3>
                <p>In Progress</p>
            </div>
        </div>

        <div class="panel">
            <h3>Daily Productivity</h3>
            <p>Completed tasks compared with total tasks.</p>

            <div style="display:flex;gap:8px;align-items:flex-end;margin-top:20px;">
                ${dailyBars}
            </div>

            <p style="font-size:12px;margin-top:12px;">
                Lower section: completed tasks. Full bar: all tasks.
            </p>
        </div>

        <div class="panel">
            <h3>Task Status Distribution</h3>
            ${statusBars}
        </div>

        <div class="panel">
            <h3>Activities by Category</h3>
            ${categoryBars || "<p>No task categories recorded yet.</p>"}
        </div>

        <div class="panel">
            <h3>Record Overview</h3>
            <p>Journal Entries: ${journals.length}</p>
            <p>Data Submissions: ${submissions.length}</p>
            <p>Pending Tasks: ${pending}</p>
            <p>Cancelled Tasks: ${cancelled}</p>
        </div>
    `;
}

document.addEventListener("DOMContentLoaded", () => {
    const periodSelect = document.getElementById("analyticsPeriod");

    periodSelect?.addEventListener("change", () => {
        analyticsPeriod = periodSelect.value;
        renderAnalytics();
    });
});
