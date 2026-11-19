
let plannerTasks = [];

function tpEscape(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

function initializeTaskPlanner() {
    const dateField = document.getElementById("taskDate");

    if (dateField && !dateField.value) {
        dateField.value = new Date().toISOString().slice(0, 10);
    }

    loadPlannerTasks();
}

async function savePlannerTask() {
    const title = document.getElementById("taskTitle").value.trim();
    const category = document.getElementById("taskCategory").value;
    const date = document.getElementById("taskDate").value;
    const startTime = document.getElementById("taskStartTime").value;
    const deadline = document.getElementById("taskDeadline").value;
    const priority = document.getElementById("taskPriority").value;
    const description = document.getElementById("taskDescription").value.trim();
    const status = document.getElementById("taskStatus").value;
    const editId = document.getElementById("taskEditId").value;

    if (!title || !date) {
        alert("Please enter a task title and date.");
        return;
    }

    const task = {
        title,
        category,
        date,
        startTime,
        deadline,
        priority,
        description,
        status,
        updatedAt: new Date().toISOString()
    };

    try {
        await saveHubRecord("task", task, editId || null);

        alert(editId ? "Task updated successfully." : "Task saved successfully.");

        resetPlannerForm();
        await loadPlannerTasks();

    } catch (error) {
        console.error(error);
        alert("Unable to save task. Please try again.");
    }
}

function resetPlannerForm() {
    document.getElementById("taskTitle").value = "";
    document.getElementById("taskCategory").value = "Personal";
    document.getElementById("taskDate").value = new Date().toISOString().slice(0, 10);
    document.getElementById("taskStartTime").value = "";
    document.getElementById("taskDeadline").value = "";
    document.getElementById("taskPriority").value = "Medium";
    document.getElementById("taskDescription").value = "";
    document.getElementById("taskStatus").value = "Pending";
    document.getElementById("taskEditId").value = "";

    document.getElementById("taskSaveButton").textContent = "SAVE TASK";
}

async function loadPlannerTasks() {
    const container = document.getElementById("plannerTaskList");
    if (!container) return;

    try {
        plannerTasks = await listHubRecords("task") || [];
        renderPlannerTasks();
    } catch (error) {
        console.error(error);
        container.innerHTML = "<p>Unable to load tasks.</p>";
    }
}

function renderPlannerTasks() {
    const container = document.getElementById("plannerTaskList");
    if (!container) return;

    const selectedDate = document.getElementById("plannerFilterDate")?.value || "";
    const selectedStatus = document.getElementById("plannerFilterStatus")?.value || "all";
    const search = (document.getElementById("plannerSearch")?.value || "").toLowerCase();

    const filtered = plannerTasks.filter(record => {
        const task = record.data || {};

        return (!selectedDate || task.date === selectedDate) &&
            (selectedStatus === "all" || task.status === selectedStatus) &&
            JSON.stringify(task).toLowerCase().includes(search);
    });

    const total = plannerTasks.length;
    const completed = plannerTasks.filter(r => r.data?.status === "Completed").length;
    const pending = plannerTasks.filter(r => r.data?.status === "Pending").length;
    const inProgress = plannerTasks.filter(r => r.data?.status === "In Progress").length;

    document.getElementById("plannerTotal").textContent = total;
    document.getElementById("plannerCompleted").textContent = completed;
    document.getElementById("plannerPending").textContent = pending;
    document.getElementById("plannerInProgress").textContent = inProgress;

    const progress = total ? Math.round(completed / total * 100) : 0;
    document.getElementById("plannerProgress").textContent = progress + "%";

    if (!filtered.length) {
        container.innerHTML = "<p>No matching tasks found.</p>";
        return;
    }

    container.innerHTML = filtered.map(record => {
        const task = record.data || {};

        return `
            <div class="panel" style="margin-bottom:12px;">
                <h3>${tpEscape(task.title)}</h3>

                <p>Category: ${tpEscape(task.category)}</p>
                <p>Date: ${tpEscape(task.date)}</p>
                <p>Time: ${tpEscape(task.startTime || "Not set")}</p>
                <p>Deadline: ${tpEscape(task.deadline || "Not set")}</p>
                <p>Priority: ${tpEscape(task.priority)}</p>
                <p>Status: <strong>${tpEscape(task.status)}</strong></p>
                <p>${tpEscape(task.description)}</p>

                <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;">
                    <button onclick="editPlannerTask('${tpEscape(record.id)}')">EDIT</button>
                    <button onclick="completePlannerTask('${tpEscape(record.id)}')">COMPLETE</button>
                    <button onclick="deletePlannerTask('${tpEscape(record.id)}')">DELETE</button>
                </div>
            </div>
        `;
    }).join("");
}

async function editPlannerTask(id) {
    const record = await getHubRecord(id);
    if (!record) return alert("Task not found.");

    const task = record.data || {};

    document.getElementById("taskTitle").value = task.title || "";
    document.getElementById("taskCategory").value = task.category || "Personal";
    document.getElementById("taskDate").value = task.date || "";
    document.getElementById("taskStartTime").value = task.startTime || "";
    document.getElementById("taskDeadline").value = task.deadline || "";
    document.getElementById("taskPriority").value = task.priority || "Medium";
    document.getElementById("taskDescription").value = task.description || "";
    document.getElementById("taskStatus").value = task.status || "Pending";
    document.getElementById("taskEditId").value = id;

    document.getElementById("taskSaveButton").textContent = "UPDATE TASK";

    document.getElementById("taskTitle").scrollIntoView({ behavior: "smooth" });
}

async function completePlannerTask(id) {
    const record = await getHubRecord(id);
    if (!record) return;

    const task = record.data || {};

    task.status = "Completed";
    task.completedAt = new Date().toISOString();
    task.updatedAt = new Date().toISOString();

    await saveHubRecord("task", task, id);
    await loadPlannerTasks();
}

async function deletePlannerTask(id) {
    if (!confirm("Delete this task permanently?")) return;

    try {
        await deleteHubRecord(id);
        await loadPlannerTasks();
        alert("Task deleted.");
    } catch (error) {
        console.error(error);
        alert("Unable to delete task.");
    }
}

document.addEventListener("DOMContentLoaded", () => {
    initializeTaskPlanner();

    ["plannerFilterDate", "plannerFilterStatus", "plannerSearch"].forEach(id => {
        document.getElementById(id)?.addEventListener("input", renderPlannerTasks);
        document.getElementById(id)?.addEventListener("change", renderPlannerTasks);
    });
});
