const STORAGE_KEY = "todo-app-tasks";
const form = document.querySelector("#add-form");
const input = document.querySelector("#task-input");
const taskList = document.querySelector("#task-list");
const emptyState = document.querySelector("#empty-state");
const taskCount = document.querySelector("#task-count");
const remainingCount = document.querySelector("#remaining-count");
const clearCompletedButton = document.querySelector("#clear-completed");
const storageNotice = document.querySelector("#storage-notice");
const today = document.querySelector("#today");
const filterButtons = document.querySelectorAll(".filter");

let tasks = loadTasks();
let currentFilter = "all";

today.textContent = new Intl.DateTimeFormat(undefined, {
  weekday: "short",
  month: "short",
  day: "numeric"
}).format(new Date());

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = input.value.trim();
  if (!text) {
    input.focus();
    return;
  }

  tasks.unshift({ id: createId(), text, completed: false });
  input.value = "";
  saveAndRender();
  input.focus();
});

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    currentFilter = button.dataset.filter;
    filterButtons.forEach((filterButton) => {
      const selected = filterButton === button;
      filterButton.classList.toggle("active", selected);
      filterButton.setAttribute("aria-pressed", String(selected));
    });
    render();
  });
});

clearCompletedButton.addEventListener("click", () => {
  tasks = tasks.filter((task) => !task.completed);
  saveAndRender();
});

function createId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function loadTasks() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) throw new Error("Saved tasks have an invalid format.");
    return parsed.filter((task) =>
      task &&
      typeof task.id === "string" &&
      typeof task.text === "string" &&
      typeof task.completed === "boolean"
    );
  } catch (error) {
    storageNotice.hidden = false;
    storageNotice.textContent = "Could not load saved tasks. Your new tasks may not be saved.";
    console.error("Unable to load saved tasks:", error);
    return [];
  }
}

function saveAndRender() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    storageNotice.hidden = true;
  } catch (error) {
    storageNotice.hidden = false;
    storageNotice.textContent = "Could not save your tasks. They may be lost when you close this page.";
    console.error("Unable to save tasks:", error);
  }
  render();
}

function render() {
  taskList.replaceChildren();
  const visibleTasks = tasks.filter((task) => {
    if (currentFilter === "active") return !task.completed;
    if (currentFilter === "completed") return task.completed;
    return true;
  });

  visibleTasks.forEach((task) => taskList.append(createTaskElement(task)));
  emptyState.hidden = visibleTasks.length > 0;
  taskCount.textContent = String(tasks.length);

  const remaining = tasks.filter((task) => !task.completed).length;
  remainingCount.textContent = `${remaining} ${remaining === 1 ? "task" : "tasks"} left`;
  clearCompletedButton.disabled = !tasks.some((task) => task.completed);
}

function createTaskElement(task) {
  const item = document.createElement("li");
  item.className = `task-item${task.completed ? " completed" : ""}`;

  const toggleButton = document.createElement("button");
  toggleButton.className = "task-check";
  toggleButton.type = "button";
  toggleButton.setAttribute("aria-label", task.completed ? "Mark task active" : "Complete task");
  toggleButton.setAttribute("aria-pressed", String(task.completed));
  if (task.completed) {
    const check = document.createElement("span");
    check.textContent = "✓";
    toggleButton.append(check);
  }
  toggleButton.addEventListener("click", () => {
    task.completed = !task.completed;
    saveAndRender();
  });

  const text = document.createElement("span");
  text.className = "task-text";
  text.textContent = task.text;

  const actions = document.createElement("div");
  actions.className = "task-actions";

  const editButton = createIconButton("Edit task", "✎", () => beginEdit(item, task));
  const deleteButton = createIconButton("Delete task", "×", () => {
    tasks = tasks.filter((currentTask) => currentTask.id !== task.id);
    saveAndRender();
  });
  deleteButton.classList.add("delete");
  actions.append(editButton, deleteButton);
  item.append(toggleButton, text, actions);
  return item;
}

function createIconButton(label, icon, onClick) {
  const button = document.createElement("button");
  button.className = "icon-button";
  button.type = "button";
  button.setAttribute("aria-label", label);
  button.textContent = icon;
  button.addEventListener("click", onClick);
  return button;
}

function beginEdit(item, task) {
  const editor = document.createElement("input");
  editor.className = "edit-input";
  editor.type = "text";
  editor.maxLength = 160;
  editor.value = task.text;
  editor.setAttribute("aria-label", "Edit task");

  const finishEdit = (save) => {
    if (!editor.isConnected) return;
    const text = editor.value.trim();
    if (save && text) {
      task.text = text;
      saveAndRender();
    } else {
      render();
    }
  };

  editor.addEventListener("keydown", (event) => {
    if (event.key === "Enter") finishEdit(true);
    if (event.key === "Escape") finishEdit(false);
  });
  editor.addEventListener("blur", () => finishEdit(true));
  item.replaceChildren(item.firstElementChild, editor);
  editor.focus();
  editor.select();
}

render();
