const state = {
  tasks: [],
  currentDate: new Date(),
  currentView: "calendar",
  dismissedAlertTaskIds: new Set()
};
const STORAGE_KEY = "schedule_manager_tasks";

const todayLabel = document.getElementById("todayLabel");
const todayTasks = document.getElementById("todayTasks");
const allTasks = document.getElementById("allTasks");
const taskModal = document.getElementById("taskModal");
const taskForm = document.getElementById("taskForm");
const modalTitle = document.getElementById("modalTitle");
const taskIdInput = document.getElementById("taskId");
const taskTitleInput = document.getElementById("taskTitle");
const taskDetailInput = document.getElementById("taskDetail");
const taskDateInput = document.getElementById("taskDate");
const taskPriorityInput = document.getElementById("taskPriority");
const calendarTitle = document.getElementById("calendarTitle");
const calendarGrid = document.getElementById("calendarGrid");
const printMonthBtn = document.getElementById("printMonthBtn");
const printMonthTitle = document.getElementById("printMonthTitle");
const printMonthCalendar = document.getElementById("printMonthCalendar");
const saveTaskBtn = document.getElementById("saveTaskBtn");
const deleteTaskBtn = document.getElementById("deleteTaskBtn");
const editTaskBtn = document.getElementById("editTaskBtn");
const completeTaskBtn = document.getElementById("completeTaskBtn");

const calendarViewBtn = document.getElementById("calendarViewBtn");
const listViewBtn = document.getElementById("listViewBtn");
const calendarView = document.getElementById("calendarView");
const listView = document.getElementById("listView");
const searchInput = document.getElementById("searchInput");
const statusFilter = document.getElementById("statusFilter");
const alertSection = document.getElementById("alertSection");
const emojiButtons = document.querySelectorAll(".emoji-btn");

document.getElementById("addTaskBtn").addEventListener("click", () => openModal());
document.getElementById("closeModalBtn").addEventListener("click", closeModal);
document.querySelector("[data-close='true']").addEventListener("click", closeModal);
document.getElementById("prevMonthBtn").addEventListener("click", () => changeMonth(-1));
document.getElementById("nextMonthBtn").addEventListener("click", () => changeMonth(1));

calendarViewBtn.addEventListener("click", () => setView("calendar"));
listViewBtn.addEventListener("click", () => setView("list"));
taskForm.addEventListener("submit", saveTask);
deleteTaskBtn.addEventListener("click", deleteCurrentTask);
editTaskBtn.addEventListener("click", enableEditMode);
completeTaskBtn.addEventListener("click", completeCurrentTask);
searchInput.addEventListener("input", renderAll);
statusFilter.addEventListener("change", renderAll);
emojiButtons.forEach((button) => {
  button.addEventListener("click", () => {
    insertEmoji(button.dataset.emoji || "");
  });
});
printMonthBtn.addEventListener("click", printCurrentMonth);

function insertEmoji(emoji) {
  if (!emoji) {
    return;
  }
  const target = taskTitleInput;
  const start = target.selectionStart ?? target.value.length;
  const end = target.selectionEnd ?? target.value.length;
  const before = target.value.slice(0, start);
  const after = target.value.slice(end);
  target.value = `${before}${emoji}${after}`;
  const nextPos = start + emoji.length;
  target.setSelectionRange(nextPos, nextPos);
  target.focus();
}

function loadTasks() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      return;
    }
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) {
      return;
    }
    state.tasks = parsed.map((task) => ({
      id: task.id,
      title: task.title || "",
      detail: task.detail || "",
      date: task.date || "",
      priority: task.priority || "medium",
      completed: Boolean(task.completed),
      completedAt: task.completedAt || null
    })).filter((task) => task.id && task.title && task.date);
  } catch (error) {
    console.error("저장된 일정을 불러오는 중 오류가 발생했습니다.", error);
  }
}

function persistTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.tasks));
}

function sortTasksByStatusAndOrder(tasks) {
  return [...tasks].sort((a, b) => {
    if (a.completed !== b.completed) {
      return a.completed ? 1 : -1;
    }

    if (!a.completed) {
      if (a.date !== b.date) {
        return a.date.localeCompare(b.date);
      }
      const score = { high: 0, medium: 1, low: 2 };
      return (score[a.priority] ?? 1) - (score[b.priority] ?? 1);
    }

    const aTime = a.completedAt ? new Date(a.completedAt).getTime() : 0;
    const bTime = b.completedAt ? new Date(b.completedAt).getTime() : 0;
    return bTime - aTime;
  });
}

function getFilteredTasks(tasks) {
  const keyword = searchInput.value.trim().toLowerCase();
  const status = statusFilter.value;
  return tasks.filter((task) => {
    const statusMatch = status === "all"
      || (status === "todo" && !task.completed)
      || (status === "done" && task.completed);
    const text = `${task.title} ${task.detail}`.toLowerCase();
    const keywordMatch = !keyword || text.includes(keyword);
    return statusMatch && keywordMatch;
  });
}

function priorityLabel(priority) {
  if (priority === "high") {
    return "높음";
  }
  if (priority === "low") {
    return "낮음";
  }
  return "보통";
}

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getHolidayMap(year) {
  return new Map([
    [`${year}-01-01`, "신정"],
    [`${year}-03-01`, "삼일절"],
    [`${year}-05-05`, "어린이날"],
    [`${year}-06-06`, "현충일"],
    [`${year}-08-15`, "광복절"],
    [`${year}-10-03`, "개천절"],
    [`${year}-10-09`, "한글날"],
    [`${year}-12-25`, "성탄절"]
  ]);
}

function displayDateKorean(dateText) {
  const date = new Date(dateText);
  if (Number.isNaN(date.getTime())) {
    return dateText;
  }
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
}

function setTodayLabel() {
  const today = new Date();
  const weekday = ["일", "월", "화", "수", "목", "금", "토"][today.getDay()];
  todayLabel.textContent = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일 (${weekday})`;
}

function setView(view) {
  state.currentView = view;
  const isCalendar = view === "calendar";
  calendarViewBtn.classList.toggle("active", isCalendar);
  listViewBtn.classList.toggle("active", !isCalendar);
  calendarView.classList.toggle("active", isCalendar);
  listView.classList.toggle("active", !isCalendar);
}

function setFormDisabled(disabled) {
  taskTitleInput.disabled = disabled;
  taskDetailInput.disabled = disabled;
  taskDateInput.disabled = disabled;
  taskPriorityInput.disabled = disabled;
}

function setActionButtons(mode, task) {
  const isCreate = mode === "create";
  const isView = mode === "view";
  const isEdit = mode === "edit";

  deleteTaskBtn.style.display = isCreate ? "none" : "inline-block";
  editTaskBtn.style.display = isCreate ? "none" : "inline-block";
  completeTaskBtn.style.display = isCreate ? "none" : "inline-block";
  saveTaskBtn.style.display = isView ? "none" : "inline-block";

  setFormDisabled(isView);
  modalTitle.textContent = isCreate ? "새 일정 추가" : "일정 확인";

  if (!isCreate && task && task.completed) {
    completeTaskBtn.textContent = "완료됨";
  } else {
    completeTaskBtn.textContent = "완료";
  }

  if (isEdit) {
    modalTitle.textContent = "일정 수정";
  }
}

function openModal(task, mode = "create") {
  const isExisting = Boolean(task && task.id);
  taskIdInput.value = isExisting ? task.id : "";
  taskTitleInput.value = task ? task.title || "" : "";
  taskDetailInput.value = task ? task.detail || "" : "";
  taskDateInput.value = task ? task.date || formatDate(new Date()) : formatDate(new Date());
  taskPriorityInput.value = task ? task.priority || "medium" : "medium";

  if (isExisting) {
    setActionButtons(mode, task);
  } else {
    setActionButtons("create");
  }

  taskModal.classList.remove("hidden");
}

function closeModal() {
  taskModal.classList.add("hidden");
  taskForm.reset();
  setFormDisabled(false);
}

function saveTask(event) {
  event.preventDefault();

  const id = taskIdInput.value;
  const taskData = {
    id: id || crypto.randomUUID(),
    title: taskTitleInput.value.trim(),
    detail: taskDetailInput.value.trim(),
    date: taskDateInput.value,
    priority: taskPriorityInput.value,
    completed: false,
    completedAt: null
  };

  if (!taskData.title || !taskData.date) {
    return;
  }

  if (id) {
    const index = state.tasks.findIndex((task) => task.id === id);
    if (index > -1) {
      taskData.completed = state.tasks[index].completed;
      taskData.completedAt = state.tasks[index].completedAt || null;
      state.tasks[index] = taskData;
    }
  } else {
    state.tasks.push(taskData);
  }

  persistTasks();
  closeModal();
  renderAll();
}

function taskItemTemplate(task) {
  const li = document.createElement("li");
  li.className = "task-item";
  const titleClass = task.completed ? "task-title completed" : "task-title";
  const badgeClass = `priority-badge priority-${task.priority}`;
  li.innerHTML = `<strong class="${titleClass}">${task.title}<span class="${badgeClass}">${priorityLabel(task.priority)}</span></strong><small>${task.date}${task.detail ? ` · ${task.detail}` : ""}</small>`;
  li.addEventListener("click", () => openModal(task, "view"));
  return li;
}

function renderTodayTasks() {
  const today = formatDate(new Date());
  const filtered = sortTasksByStatusAndOrder(
    getFilteredTasks(state.tasks.filter((task) => task.date === today))
  );
  todayTasks.innerHTML = "";

  if (filtered.length === 0) {
    todayTasks.innerHTML = '<li class="empty-message">오늘 등록된 일정이 없습니다.</li>';
    return;
  }

  filtered.forEach((task) => {
    todayTasks.appendChild(taskItemTemplate(task));
  });
}

function renderListView() {
  allTasks.innerHTML = "";
  const sorted = sortTasksByStatusAndOrder(getFilteredTasks(state.tasks));

  if (sorted.length === 0) {
    allTasks.innerHTML = '<li class="empty-message">등록된 일정이 없습니다.</li>';
    return;
  }

  sorted.forEach((task) => {
    allTasks.appendChild(taskItemTemplate(task));
  });
}

function changeMonth(diff) {
  state.currentDate = new Date(
    state.currentDate.getFullYear(),
    state.currentDate.getMonth() + diff,
    1
  );
  renderCalendar();
}

function renderCalendar() {
  const year = state.currentDate.getFullYear();
  const month = state.currentDate.getMonth();
  const holidayMap = getHolidayMap(year);
  calendarTitle.textContent = `${year}년 ${month + 1}월`;

  calendarGrid.innerHTML = "";
  const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
  weekdays.forEach((day, dayIndex) => {
    const dayName = document.createElement("div");
    dayName.className = "day-name";
    if (dayIndex === 1) {
      dayName.classList.add("monday");
    }
    dayName.textContent = day;
    calendarGrid.appendChild(dayName);
  });

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  for (let i = 0; i < firstDay; i += 1) {
    const emptyCell = document.createElement("div");
    emptyCell.className = "day-cell muted";
    if (i === 1) {
      emptyCell.classList.add("monday");
    }
    calendarGrid.appendChild(emptyCell);
  }

  for (let date = 1; date <= daysInMonth; date += 1) {
    const cell = document.createElement("div");
    cell.className = "day-cell";
    const dateValue = formatDate(new Date(year, month, date));
    const dayOfWeek = new Date(year, month, date).getDay();
    const holidayName = holidayMap.get(dateValue);
    if (holidayName) {
      cell.classList.add("holiday");
    }
    if (dayOfWeek === 1) {
      cell.classList.add("monday");
    }
    const tasks = sortTasksByStatusAndOrder(
      getFilteredTasks(state.tasks.filter((task) => task.date === dateValue))
    );

    const number = document.createElement("div");
    number.className = "day-number";
    number.textContent = String(date);
    cell.appendChild(number);

    if (holidayName) {
      const holidayText = document.createElement("div");
      holidayText.className = "holiday-name";
      holidayText.textContent = holidayName;
      cell.appendChild(holidayText);
    }

    if (dayOfWeek === 1) {
      const mondayText = document.createElement("div");
      mondayText.className = "monday-note";
      mondayText.textContent = "휴관";
      cell.appendChild(mondayText);
    }

    tasks.forEach((task) => {
      const itemBtn = document.createElement("button");
      itemBtn.className = task.completed ? "day-task-dot completed" : "day-task-dot";
      itemBtn.textContent = `[${priorityLabel(task.priority)}] ${task.title}`;
      itemBtn.addEventListener("click", (event) => {
        event.stopPropagation();
        openModal(task, "view");
      });
      cell.appendChild(itemBtn);
    });

    cell.addEventListener("dblclick", () => {
      openModal({ title: "", detail: "", date: dateValue }, "create");
    });
    calendarGrid.appendChild(cell);
  }
}

function renderPrintMonthContent() {
  const year = state.currentDate.getFullYear();
  const month = state.currentDate.getMonth();
  const holidayMap = getHolidayMap(year);
  const monthTasks = state.tasks.filter((task) => {
    const taskDate = new Date(task.date);
    return taskDate.getFullYear() === year && taskDate.getMonth() === month;
  });

  printMonthTitle.textContent = `${year}년 ${month + 1}월 월간 일정표`;
  printMonthCalendar.innerHTML = "";

  const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
  weekdays.forEach((day, dayIndex) => {
    const dayName = document.createElement("div");
    dayName.className = "day-name";
    if (dayIndex === 1) {
      dayName.classList.add("monday");
    }
    dayName.textContent = day;
    printMonthCalendar.appendChild(dayName);
  });

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  for (let i = 0; i < firstDay; i += 1) {
    const emptyCell = document.createElement("div");
    emptyCell.className = "day-cell muted";
    if (i === 1) {
      emptyCell.classList.add("monday");
    }
    printMonthCalendar.appendChild(emptyCell);
  }

  for (let date = 1; date <= daysInMonth; date += 1) {
    const cell = document.createElement("div");
    cell.className = "day-cell";
    const dateValue = formatDate(new Date(year, month, date));
    const dayOfWeek = new Date(year, month, date).getDay();
    const holidayName = holidayMap.get(dateValue);
    if (holidayName) {
      cell.classList.add("holiday");
    }
    if (dayOfWeek === 1) {
      cell.classList.add("monday");
    }

    const number = document.createElement("div");
    number.className = "day-number";
    number.textContent = String(date);
    cell.appendChild(number);

    if (holidayName) {
      const holidayText = document.createElement("div");
      holidayText.className = "holiday-name";
      holidayText.textContent = holidayName;
      cell.appendChild(holidayText);
    }

    if (dayOfWeek === 1) {
      const mondayText = document.createElement("div");
      mondayText.className = "monday-note";
      mondayText.textContent = "휴관";
      cell.appendChild(mondayText);
    }

    const dayTasks = sortTasksByStatusAndOrder(
      monthTasks.filter((task) => task.date === dateValue)
    );
    dayTasks.forEach((task) => {
      const item = document.createElement("div");
      item.className = task.completed ? "day-task-dot completed print-task-item" : "day-task-dot print-task-item";
      item.textContent = `[${priorityLabel(task.priority)}] ${task.title}`;
      cell.appendChild(item);
    });

    printMonthCalendar.appendChild(cell);
  }
}

function printCurrentMonth() {
  renderPrintMonthContent();
  window.print();
}

function deleteCurrentTask() {
  const id = taskIdInput.value;
  if (!id) {
    return;
  }
  state.tasks = state.tasks.filter((task) => task.id !== id);
  persistTasks();
  closeModal();
  renderAll();
}

function enableEditMode() {
  const id = taskIdInput.value;
  if (!id) {
    return;
  }
  const task = state.tasks.find((item) => item.id === id);
  if (!task) {
    return;
  }
  setActionButtons("edit", task);
}

function completeCurrentTask() {
  const id = taskIdInput.value;
  if (!id) {
    return;
  }
  const target = state.tasks.find((task) => task.id === id);
  if (!target) {
    return;
  }
  if (!target.completed) {
    target.completed = true;
    target.completedAt = new Date().toISOString();
  }
  persistTasks();
  completeTaskBtn.textContent = "완료됨";
  renderAll();
}

function renderAlerts() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueSoon = state.tasks.filter((task) => {
    if (task.completed) {
      return false;
    }
    const taskDate = new Date(task.date);
    taskDate.setHours(0, 0, 0, 0);
    const diffDays = (taskDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays >= 0 && diffDays <= 1;
  });

  alertSection.innerHTML = "";
  dueSoon
    .filter((task) => !state.dismissedAlertTaskIds.has(task.id))
    .slice(0, 3)
    .forEach((task) => {
    const item = document.createElement("div");
    item.className = "alert-item";
    const text = document.createElement("span");
    text.textContent = `알림: ${task.date} 일정 '${task.title}' 을(를) 확인하세요.`;
    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "alert-close-btn";
    closeBtn.setAttribute("aria-label", "알림 닫기");
    closeBtn.textContent = "X";
    closeBtn.addEventListener("click", () => {
      state.dismissedAlertTaskIds.add(task.id);
      renderAlerts();
    });
    item.appendChild(text);
    item.appendChild(closeBtn);
    alertSection.appendChild(item);
  });
}

function renderAll() {
  renderAlerts();
  renderTodayTasks();
  renderListView();
  renderCalendar();
  renderPrintMonthContent();
}

setTodayLabel();
loadTasks();
setView("calendar");
renderAll();
