/* ============================================================
   STATE — everything the app needs, kept in memory + localStorage
   ============================================================ */
let expenses = JSON.parse(localStorage.getItem("expenses")) || [
  { id: 1, name: "Coffee", category: "Food", amount: 150, date: "2026-08-14", notes: "" },
  { id: 2, name: "Milk", category: "Shopping", amount: 100, date: "2026-08-14", notes: "" },
  { id: 3, name: "Bus Ticket", category: "Transport", amount: 80, date: "2026-08-14", notes: "" },
  { id: 4, name: "Electricity Bill", category: "Bills", amount: 750, date: "2026-08-13", notes: "" },
  { id: 5, name: "Lunch", category: "Food", amount: 120, date: "2026-08-13", notes: "" },
  { id: 6, name: "Online Shopping", category: "Shopping", amount: 650, date: "2026-08-12", notes: "" },
  { id: 7, name: "Fuel", category: "Transport", amount: 400, date: "2026-08-12", notes: "" },
  { id: 8, name: "Movie Tickets", category: "Others", amount: 300, date: "2026-08-11", notes: "" }
];

let nextId = expenses.length ? Math.max(...expenses.map(e => e.id)) + 1 : 1;
let currentFilter = "All";
let currentSearch = "";
let currentSort = "newest";
let currentPage = 1;
const rowsPerPage = 5;
let editingId = null;
let deletingId = null;
const monthlyBudget = 3000;

let lineChart, doughnutChart;

/* ============================================================
   LOCALSTORAGE HELPERS
   ============================================================ */
function saveExpenses() {
  localStorage.setItem("expenses", JSON.stringify(expenses));
}

/* ============================================================
   TOASTS
   ============================================================ */
function showToast(message, type = "success") {
  const container = document.getElementById("toastContainer");
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

/* ============================================================
   AUTH VIEW SWITCHING (UI only — no real backend)
   ============================================================ */
const loginView = document.getElementById("loginView");
const registerView = document.getElementById("registerView");
const appView = document.getElementById("appView");

document.getElementById("goRegister").addEventListener("click", (e) => {
  e.preventDefault();
  loginView.classList.add("hidden");
  registerView.classList.remove("hidden");
});
document.getElementById("goLogin").addEventListener("click", (e) => {
  e.preventDefault();
  registerView.classList.add("hidden");
  loginView.classList.remove("hidden");
});

document.getElementById("loginForm").addEventListener("submit", (e) => {
  e.preventDefault();
  loginView.classList.add("hidden");
  appView.classList.remove("hidden");
  renderAll();
});
document.getElementById("registerForm").addEventListener("submit", (e) => {
  e.preventDefault();
  registerView.classList.add("hidden");
  appView.classList.remove("hidden");
  renderAll();
});
document.getElementById("logoutBtn").addEventListener("click", () => {
  appView.classList.add("hidden");
  loginView.classList.remove("hidden");
});

// show/hide password
document.querySelectorAll(".toggle-pass").forEach(icon => {
  icon.addEventListener("click", () => {
    const target = document.getElementById(icon.dataset.target);
    target.type = target.type === "password" ? "text" : "password";
    icon.classList.toggle("fa-eye");
    icon.classList.toggle("fa-eye-slash");
  });
});

/* ============================================================
   SIDEBAR NAVIGATION
   ============================================================ */
document.querySelectorAll(".nav-item[data-page]").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".nav-item").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
    document.getElementById(btn.dataset.page).classList.add("active");
    document.getElementById("pageTitle").textContent = btn.textContent.trim();
    document.getElementById("sidebar").classList.remove("open"); // close on mobile after click
  });
});

document.getElementById("hamburger").addEventListener("click", () => {
  document.getElementById("sidebar").classList.toggle("open");
});

/* ============================================================
   DARK MODE
   ============================================================ */
const darkToggle = document.getElementById("darkToggle");
function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  darkToggle.innerHTML = theme === "dark" ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
  localStorage.setItem("theme", theme);
}
applyTheme(localStorage.getItem("theme") || "light");
darkToggle.addEventListener("click", () => {
  const current = document.documentElement.getAttribute("data-theme");
  applyTheme(current === "dark" ? "light" : "dark");
});

/* ============================================================
   ADD EXPENSE
   ============================================================ */
document.getElementById("expenseForm").addEventListener("submit", (e) => {
  e.preventDefault();

  const name = document.getElementById("expName").value.trim();
  const amount = parseFloat(document.getElementById("expAmount").value);
  const date = document.getElementById("expDate").value || new Date().toISOString().split("T")[0];
  const category = document.getElementById("expCategory").value;
  const notes = document.getElementById("expNotes").value.trim();

  // validation
  document.getElementById("err-expName").textContent = "";
  document.getElementById("err-expAmount").textContent = "";
  let valid = true;
  if (name === "") { document.getElementById("err-expName").textContent = "Name is required"; valid = false; }
  if (isNaN(amount) || amount <= 0) { document.getElementById("err-expAmount").textContent = "Enter a valid amount"; valid = false; }
  if (!valid) return;

  expenses.push({ id: nextId++, name, category, amount, date, notes });
  saveExpenses();
  showToast("Expense added successfully!", "success");
  e.target.reset();
  renderAll();
});

document.getElementById("emptyAddBtn").addEventListener("click", () => {
  document.querySelector('[data-page="addPage"]').click();
});

/* ============================================================
   EXPENSE TABLE — filtering, searching, sorting, pagination
   ============================================================ */
function getFilteredExpenses() {
  let result = [...expenses];

  if (currentFilter !== "All") {
    result = result.filter(e => e.category === currentFilter);
  }
  if (currentSearch.trim() !== "") {
    result = result.filter(e => e.name.toLowerCase().includes(currentSearch.toLowerCase()));
  }

  if (currentSort === "newest") result.sort((a, b) => new Date(b.date) - new Date(a.date));
  if (currentSort === "oldest") result.sort((a, b) => new Date(a.date) - new Date(b.date));
  if (currentSort === "high") result.sort((a, b) => b.amount - a.amount);
  if (currentSort === "low") result.sort((a, b) => a.amount - b.amount);

  return result;
}

function renderTable() {
  const filtered = getFilteredExpenses();
  const tbody = document.getElementById("expenseTableBody");
  const emptyState = document.getElementById("emptyState");
  tbody.innerHTML = "";

  if (filtered.length === 0) {
    emptyState.classList.remove("hidden");
    document.getElementById("expenseTable").classList.add("hidden");
    document.getElementById("pagination").innerHTML = "";
    return;
  }
  emptyState.classList.add("hidden");
  document.getElementById("expenseTable").classList.remove("hidden");

  // pagination math
  const totalPages = Math.ceil(filtered.length / rowsPerPage);
  if (currentPage > totalPages) currentPage = totalPages;
  const start = (currentPage - 1) * rowsPerPage;
  const pageItems = filtered.slice(start, start + rowsPerPage);

  pageItems.forEach(exp => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${formatDate(exp.date)}</td>
      <td>${exp.name}</td>
      <td>${exp.category}</td>
      <td>₹${exp.amount.toFixed(2)}</td>
      <td>
        <button class="action-btn edit" title="Edit"><i class="fa-solid fa-pen"></i></button>
        <button class="action-btn delete" title="Delete"><i class="fa-solid fa-trash"></i></button>
      </td>
    `;
    tr.querySelector(".edit").addEventListener("click", () => openEditModal(exp.id));
    tr.querySelector(".delete").addEventListener("click", () => openDeleteModal(exp.id));
    tbody.appendChild(tr);
  });

  // render pagination buttons
  const pag = document.getElementById("pagination");
  pag.innerHTML = "";
  for (let i = 1; i <= totalPages; i++) {
    const btn = document.createElement("button");
    btn.textContent = i;
    if (i === currentPage) btn.classList.add("active");
    btn.addEventListener("click", () => { currentPage = i; renderTable(); });
    pag.appendChild(btn);
  }
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

document.getElementById("searchInput").addEventListener("input", (e) => {
  currentSearch = e.target.value;
  currentPage = 1;
  renderTable();
});
document.getElementById("sortSelect").addEventListener("change", (e) => {
  currentSort = e.target.value;
  renderTable();
});
document.querySelectorAll(".chip").forEach(chip => {
  chip.addEventListener("click", () => {
    document.querySelectorAll(".chip").forEach(c => c.classList.remove("active"));
    chip.classList.add("active");
    currentFilter = chip.dataset.cat;
    currentPage = 1;
    renderTable();
  });
});

/* ============================================================
   EDIT MODAL
   ============================================================ */
const editModal = document.getElementById("editModal");

function openEditModal(id) {
  const exp = expenses.find(e => e.id === id);
  editingId = id;
  document.getElementById("editName").value = exp.name;
  document.getElementById("editAmount").value = exp.amount;
  document.getElementById("editDate").value = exp.date;
  document.getElementById("editCategory").value = exp.category;
  document.getElementById("editNotes").value = exp.notes || "";
  editModal.classList.remove("hidden");
}
function closeEditModal() { editModal.classList.add("hidden"); editingId = null; }

document.getElementById("editModalClose").addEventListener("click", closeEditModal);
document.getElementById("editCancelBtn").addEventListener("click", closeEditModal);
editModal.addEventListener("click", (e) => { if (e.target === editModal) closeEditModal(); });

document.getElementById("editForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const exp = expenses.find(x => x.id === editingId);
  exp.name = document.getElementById("editName").value.trim();
  exp.amount = parseFloat(document.getElementById("editAmount").value);
  exp.date = document.getElementById("editDate").value;
  exp.category = document.getElementById("editCategory").value;
  exp.notes = document.getElementById("editNotes").value.trim();
  saveExpenses();
  closeEditModal();
  showToast("Expense updated successfully!", "success");
  renderAll();
});

/* ============================================================
   DELETE MODAL
   ============================================================ */
const deleteModal = document.getElementById("deleteModal");

function openDeleteModal(id) {
  deletingId = id;
  deleteModal.classList.remove("hidden");
}
function closeDeleteModal() { deleteModal.classList.add("hidden"); deletingId = null; }

document.getElementById("deleteCancelBtn").addEventListener("click", closeDeleteModal);
deleteModal.addEventListener("click", (e) => { if (e.target === deleteModal) closeDeleteModal(); });

document.getElementById("deleteConfirmBtn").addEventListener("click", () => {
  expenses = expenses.filter(e => e.id !== deletingId);
  saveExpenses();
  closeDeleteModal();
  showToast("Expense deleted successfully!", "error");
  renderAll();
});

// ESC key closes any open modal
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") { closeEditModal(); closeDeleteModal(); }
});

/* ============================================================
   CATEGORIES PAGE
   ============================================================ */
function renderCategories() {
  const categories = ["Food", "Shopping", "Transport", "Bills", "Others"];
  const tbody = document.getElementById("categoryTableBody");
  tbody.innerHTML = "";

  categories.forEach(cat => {
    const catExpenses = expenses.filter(e => e.category === cat);
    const total = catExpenses.reduce((sum, e) => sum + e.amount, 0);
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${cat}</td>
      <td>${catExpenses.length}</td>
      <td>₹${total.toFixed(2)}</td>
      <td><button class="action-btn edit"><i class="fa-solid fa-pen"></i></button>
          <button class="action-btn delete"><i class="fa-solid fa-trash"></i></button></td>
    `;
    tbody.appendChild(tr);
  });
}

document.getElementById("addCategoryBtn").addEventListener("click", () => {
  showToast("Category management is UI-only in this demo.", "info");
});

/* ============================================================
   REPORTS — CSV download + Print
   ============================================================ */
document.getElementById("downloadCsvBtn").addEventListener("click", () => {
  let csv = "Date,Name,Category,Amount,Notes\n";
  expenses.forEach(e => {
    csv += `${e.date},${e.name},${e.category},${e.amount},${(e.notes || "").replace(/,/g, " ")}\n`;
  });
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "expenses.csv";
  a.click();
  URL.revokeObjectURL(url);
  showToast("CSV downloaded!", "success");
});

document.getElementById("printBtn").addEventListener("click", () => window.print());

/* ============================================================
   SETTINGS TABS
   ============================================================ */
document.querySelectorAll(".tab-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById(btn.dataset.tab).classList.add("active");
  });
});
["saveProfileBtn", "savePrefBtn", "saveSecBtn"].forEach(id => {
  document.getElementById(id)?.addEventListener("click", (e) => {
    e.preventDefault();
    showToast("Settings saved!", "success");
  });
});

/* ============================================================
   DASHBOARD STATS + CHARTS
   ============================================================ */
function renderDashboard() {
  const total = expenses.reduce((sum, e) => sum + e.amount, 0);
  const count = expenses.length;

  // highest category
  const catTotals = {};
  expenses.forEach(e => { catTotals[e.category] = (catTotals[e.category] || 0) + e.amount; });
  let topCat = "-", topAmt = 0;
  for (const cat in catTotals) {
    if (catTotals[cat] > topAmt) { topAmt = catTotals[cat]; topCat = cat; }
  }

  // daily average — based on number of distinct days with expenses
  const uniqueDays = new Set(expenses.map(e => e.date)).size || 1;
  const avg = total / uniqueDays;

  document.getElementById("statTotal").textContent = total.toFixed(2);
  document.getElementById("statCount").textContent = count;
  document.getElementById("statTopCat").textContent = topCat;
  document.getElementById("statTopCatAmt").textContent = `₹${topAmt.toFixed(2)}`;
  document.getElementById("statAvg").textContent = avg.toFixed(2);

  // budget progress
  const percent = Math.min((total / monthlyBudget) * 100, 100);
  document.getElementById("budgetTotal").textContent = monthlyBudget;
  document.getElementById("budgetProgress").style.width = percent + "%";
  document.getElementById("budgetRemaining").textContent =
    `₹${Math.max(monthlyBudget - total, 0).toFixed(2)} Left`;

  // this month vs last month (simplified using current dataset)
  document.getElementById("thisMonthAmt").textContent = `₹${total.toFixed(2)}`;
  document.getElementById("lastMonthAmt").textContent = `₹${(total * 0.85).toFixed(2)}`; // placeholder comparison

  // recent activity — last 4 expenses added
  const activityList = document.getElementById("activityList");
  activityList.innerHTML = "";
  [...expenses].slice(-4).reverse().forEach(e => {
    const li = document.createElement("li");
    li.innerHTML = `<span>${e.name}</span><span>₹${e.amount}</span>`;
    activityList.appendChild(li);
  });

  renderCharts(catTotals);
}

function renderCharts(catTotals) {
  // ---- Doughnut: expenses by category ----
  const dCtx = document.getElementById("doughnutChart").getContext("2d");
  const labels = Object.keys(catTotals);
  const data = Object.values(catTotals);
  if (doughnutChart) doughnutChart.destroy();
  doughnutChart = new Chart(dCtx, {
    type: "doughnut",
    data: {
      labels,
      datasets: [{ data, backgroundColor: ["#16a34a", "#f59e0b", "#2563eb", "#9333ea", "#e74c3c"] }]
    },
    options: { responsive: true, plugins: { legend: { position: "bottom" } } }
  });

  // ---- Line: expenses over time (grouped by date) ----
  const dateTotals = {};
  expenses.forEach(e => { dateTotals[e.date] = (dateTotals[e.date] || 0) + e.amount; });
  const sortedDates = Object.keys(dateTotals).sort();

  const lCtx = document.getElementById("lineChart").getContext("2d");
  if (lineChart) lineChart.destroy();
  lineChart = new Chart(lCtx, {
    type: "line",
    data: {
      labels: sortedDates.map(formatDate),
      datasets: [{
        label: "Spend",
        data: sortedDates.map(d => dateTotals[d]),
        borderColor: "#16a34a",
        backgroundColor: "rgba(22,163,74,0.1)",
        fill: true,
        tension: 0.3
      }]
    },
    options: { responsive: true, plugins: { legend: { display: false } } }
  });
}

/* ============================================================
   MASTER RENDER — call this after any data change
   ============================================================ */
function renderAll() {
  renderDashboard();
  renderTable();
  renderCategories();
}

renderAll();