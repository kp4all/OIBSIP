"use strict";

const STORAGE_KEY = "oibsip-todo-tasks";

const input = document.getElementById("task-input");
const addBtn = document.getElementById("add-btn");
const addError = document.getElementById("add-error");
const pendingList = document.getElementById("pending-list");
const doneList = document.getElementById("done-list");
const pendingCount = document.getElementById("pending-count");
const doneCount = document.getElementById("done-count");

let tasks = loadTasks();
let editingId = null;

/* ---------- Storage (bonus: tasks survive a refresh) ---------- */

function loadTasks() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(saved) ? saved : [];
  } catch (err) {
    return [];
  }
}

function saveTasks() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch (err) {
    // Storage can be blocked (private mode). The app still works for this session.
  }
}

/* ---------- Helpers ---------- */

function formatTime(timestamp) {
  return new Date(timestamp).toLocaleString([], {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function showError(message) {
  addError.textContent = message;
  addError.hidden = false;
}

function clearError() {
  addError.hidden = true;
}

/* ---------- Actions ---------- */

function addTask() {
  const text = input.value.trim();
  if (text === "") {
    showError("Type a task before adding it.");
    return;
  }
  clearError();

  tasks.unshift({
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    text,
    done: false,
    createdAt: Date.now(),
    completedAt: null,
  });

  input.value = "";
  input.focus();
  update();
}

function toggleTask(id) {
  const task = tasks.find((t) => t.id === id);
  if (!task) return;
  task.done = !task.done;
  task.completedAt = task.done ? Date.now() : null;
  update();
}

function deleteTask(id) {
  tasks = tasks.filter((t) => t.id !== id);
  if (editingId === id) editingId = null;
  update();
}

function saveEdit(id, newText) {
  const text = newText.trim();
  if (text === "") return; // keep editing until there is some text
  const task = tasks.find((t) => t.id === id);
  if (task) task.text = text;
  editingId = null;
  update();
}

function update() {
  saveTasks();
  render();
}

/* ---------- Rendering ---------- */

function button(label, className, onClick, ariaLabel) {
  const b = document.createElement("button");
  b.type = "button";
  b.textContent = label;
  if (className) b.className = className;
  if (ariaLabel) b.setAttribute("aria-label", ariaLabel);
  b.addEventListener("click", onClick);
  return b;
}

function buildTask(task) {
  const li = document.createElement("li");
  li.className = "task" + (task.done ? " done" : "");

  const check = document.createElement("input");
  check.type = "checkbox";
  check.checked = task.done;
  check.setAttribute("aria-label", task.done ? "Mark as pending" : "Mark complete");
  check.addEventListener("change", () => toggleTask(task.id));

  const body = document.createElement("div");
  const actions = document.createElement("div");
  actions.className = "actions";

  if (editingId === task.id) {
    // Inline edit mode
    const edit = document.createElement("input");
    edit.type = "text";
    edit.className = "edit-input";
    edit.value = task.text;
    edit.maxLength = 120;
    edit.setAttribute("aria-label", "Edit task text");
    edit.addEventListener("keydown", (e) => {
      if (e.key === "Enter") saveEdit(task.id, edit.value);
      if (e.key === "Escape") { editingId = null; render(); }
    });
    body.appendChild(edit);

    actions.append(
      button("Save", "save", () => saveEdit(task.id, edit.value)),
      button("Cancel", "", () => { editingId = null; render(); })
    );

    setTimeout(() => edit.focus(), 0);
  } else {
    const title = document.createElement("span");
    title.className = "task-title";
    title.textContent = task.text; // textContent keeps user input safe from HTML injection

    const time = document.createElement("small");
    time.className = "task-time";
    time.textContent = task.done
      ? "Added " + formatTime(task.createdAt) + " · Completed " + formatTime(task.completedAt)
      : "Added " + formatTime(task.createdAt);

    body.append(title, time);

    actions.append(
      button("Edit", "", () => { editingId = task.id; render(); }, "Edit task"),
      button("Delete", "delete", () => deleteTask(task.id), "Delete task")
    );
  }

  li.append(check, body, actions);
  return li;
}

function fillList(listEl, items, emptyMessage) {
  listEl.replaceChildren();
  if (items.length === 0) {
    const empty = document.createElement("li");
    empty.className = "empty";
    empty.textContent = emptyMessage;
    listEl.appendChild(empty);
    return;
  }
  items.forEach((task) => listEl.appendChild(buildTask(task)));
}

function render() {
  const pending = tasks.filter((t) => !t.done);
  const done = tasks.filter((t) => t.done);

  pendingCount.textContent = pending.length + " pending";
  doneCount.textContent = done.length + " completed";

  fillList(pendingList, pending, "Nothing pending. Add a task above to get started.");
  fillList(doneList, done, "No completed tasks yet. Tick a task when it is done.");
}

/* ---------- Events ---------- */

addBtn.addEventListener("click", addTask);
input.addEventListener("keydown", (e) => { if (e.key === "Enter") addTask(); });
input.addEventListener("input", clearError);

render();
