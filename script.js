const form = document.getElementById("transactionForm");
const descriptionInput = document.getElementById("description");
const amountInput = document.getElementById("amount");
const typeInput = document.getElementById("type");
const categoryInput = document.getElementById("category");
const dateInput = document.getElementById("date");
const transactionList = document.getElementById("transactionList");
const searchInput = document.getElementById("searchInput");
const filterType = document.getElementById("filterType");
const filterMonth = document.getElementById("filterMonth");
const budgetInput = document.getElementById("budgetInput");
const setBudgetBtn = document.getElementById("setBudgetBtn");
const submitBtn = document.getElementById("submitBtn");
const cancelEditBtn = document.getElementById("cancelEditBtn");
const reportMonthInput = document.getElementById("reportMonth");
const downloadReportBtn = document.getElementById("downloadReportBtn");

let transactions = [];
let editingId = null;

// Load saved transactions
try {
    const saved = JSON.parse(localStorage.getItem("blueBudgetTransactions"));
    if (Array.isArray(saved)) {
        transactions = saved;
    }
} catch (error) {
    transactions = [];
}

// Load saved budget
let budget = Number(localStorage.getItem("blueBudgetLimit")) || 10000;

// Date and currency functions
function getLocalDate() {
    const now = new Date();

    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function formatCurrency(amount) {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        minimumFractionDigits: 2
    }).format(amount);
}

function formatDate(date) {
    const [year, month, day] = date.split("-");
    return new Date(year, month - 1, day).toLocaleDateString("en-IN");
}

function getMonthKey(date) {
    return date.substring(0, 7);
}

function isCurrentMonth(date) {
    return getMonthKey(date) === getMonthKey(getLocalDate());
}

// Initial values
dateInput.value = getLocalDate();
dateInput.max = getLocalDate();
reportMonthInput.value = getMonthKey(getLocalDate());

document.getElementById("todayDate").textContent =
    new Date().toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric"
    });

// Sidebar navigation
document.querySelectorAll(".nav-link").forEach(link => {
    link.addEventListener("click", () => {
        document.querySelectorAll(".nav-link").forEach(item =>
            item.classList.remove("active")
        );

        link.classList.add("active");
    });
});

// Save transactions
function saveTransactions() {
    localStorage.setItem(
        "blueBudgetTransactions",
        JSON.stringify(transactions)
    );
}

function saveBudget() {
    localStorage.setItem("blueBudgetLimit", String(budget));
}

// Add or update transaction
form.addEventListener("submit", function(event) {
    event.preventDefault();

    const description = descriptionInput.value.trim();
    const amount = Number(amountInput.value);
    const type = typeInput.value;
    const category = categoryInput.value;
    const date = dateInput.value;

    if (
        !description ||
        !Number.isFinite(amount) ||
        amount <= 0 ||
        !date ||
        date > getLocalDate()
    ) {
        alert("Please enter valid transaction details.");
        return;
    }

    if (editingId) {
        const index = transactions.findIndex(
            item => item.id === editingId
        );

        if (index !== -1) {
            transactions[index] = {
                ...transactions[index],
                description,
                amount,
                type,
                category,
                date
            };
        }

        editingId = null;
    } else {
        transactions.push({
            id: crypto.randomUUID(),
            description,
            amount,
            type,
            category,
            date
        });
    }

    saveTransactions();
    resetTransactionForm();
    refreshApp();
});

// Reset form
function resetTransactionForm() {
    editingId = null;
    form.reset();

    dateInput.value = getLocalDate();
    submitBtn.textContent = "＋ Add Transaction";
    cancelEditBtn.classList.add("hidden");
}

// Edit transaction
function editTransaction(id) {
    const item = transactions.find(
        transaction => transaction.id === id
    );

    if (!item) return;

    editingId = id;

    descriptionInput.value = item.description;
    amountInput.value = item.amount;
    typeInput.value = item.type;
    categoryInput.value = item.category;
    dateInput.value = item.date;

    submitBtn.textContent = "Update Transaction";
    cancelEditBtn.classList.remove("hidden");

    document.getElementById("add-transaction")
        .scrollIntoView({ behavior: "smooth" });
}

cancelEditBtn.addEventListener("click", resetTransactionForm);

// Delete transaction
function deleteTransaction(id) {
    if (!confirm("Are you sure you want to delete this transaction?")) {
        return;
    }

    if (editingId === id) {
        resetTransactionForm();
    }

    transactions = transactions.filter(
        item => item.id !== id
    );

    saveTransactions();
    refreshApp();
}

// Dashboard
function updateDashboard() {
    const current = transactions.filter(
        item => isCurrentMonth(item.date)
    );

    const income = current
        .filter(item => item.type === "income")
        .reduce((sum, item) => sum + item.amount, 0);

    const expenses = current
        .filter(item => item.type === "expense")
        .reduce((sum, item) => sum + item.amount, 0);

    const allIncome = transactions
        .filter(item => item.type === "income")
        .reduce((sum, item) => sum + item.amount, 0);

    const allExpenses = transactions
        .filter(item => item.type === "expense")
        .reduce((sum, item) => sum + item.amount, 0);

    document.getElementById("totalBalance").textContent =
        formatCurrency(allIncome - allExpenses);

    document.getElementById("totalIncome").textContent =
        formatCurrency(income);

    document.getElementById("totalExpense").textContent =
        formatCurrency(expenses);
}

// Month filter
function populateMonthFilter() {
    const months = new Set(
        transactions.map(item => getMonthKey(item.date))
    );

    months.add(getMonthKey(getLocalDate()));

    const selected = filterMonth.value || "all";

    filterMonth.innerHTML =
        '<option value="all">All months</option>';

    [...months].sort().reverse().forEach(month => {
        const [year, monthNumber] = month.split("-");

        const option = document.createElement("option");
        option.value = month;

        option.textContent = new Date(
            Number(year),
            Number(monthNumber) - 1,
            1
        ).toLocaleDateString("en-IN", {
            month: "long",
            year: "numeric"
        });

        filterMonth.appendChild(option);
    });

    filterMonth.value = [...filterMonth.options].some(
        option => option.value === selected
    ) ? selected : "all";
}

// Display transactions
function displayTransactions() {
    const searchText = searchInput.value.toLowerCase().trim();
    const selectedType = filterType.value;
    const selectedMonth = filterMonth.value;

    const filtered = transactions.filter(item => {
        const matchesSearch =
            item.description.toLowerCase().includes(searchText) ||
            item.category.toLowerCase().includes(searchText);

        const matchesType =
            selectedType === "all" || item.type === selectedType;

        const matchesMonth =
            selectedMonth === "all" ||
            getMonthKey(item.date) === selectedMonth;

        return matchesSearch && matchesType && matchesMonth;
    }).sort((a, b) => b.date.localeCompare(a.date));

    transactionList.replaceChildren();

    if (filtered.length === 0) {
        const row = document.createElement("tr");
        const cell = document.createElement("td");

        cell.colSpan = 6;
        cell.className = "empty-state";
        cell.textContent = "No matching transactions found.";

        row.appendChild(cell);
        transactionList.appendChild(row);
        return;
    }

    filtered.forEach(item => {
        const row = document.createElement("tr");

        const nameCell = document.createElement("td");
        nameCell.textContent = item.description;

        const categoryCell = document.createElement("td");
        const tag = document.createElement("span");
        tag.className = "category-tag";
        tag.textContent = item.category;
        categoryCell.appendChild(tag);

        const dateCell = document.createElement("td");
        dateCell.textContent = formatDate(item.date);

        const typeCell = document.createElement("td");
        typeCell.textContent = item.type;
        typeCell.className = "type-badge";

        const amountCell = document.createElement("td");
        amountCell.textContent =
            (item.type === "income" ? "+ " : "- ") +
            formatCurrency(item.amount);

        amountCell.className =
            item.type === "income"
                ? "amount-income"
                : "amount-expense";

        const actionCell = document.createElement("td");
        const actions = document.createElement("div");
        actions.className = "action-buttons";

        const editButton = document.createElement("button");
        editButton.textContent = "Edit";
        editButton.className = "edit-btn";
        editButton.addEventListener("click", () =>
            editTransaction(item.id)
        );

        const deleteButton = document.createElement("button");
        deleteButton.textContent = "Delete";
        deleteButton.className = "delete-btn";
        deleteButton.addEventListener("click", () =>
            deleteTransaction(item.id)
        );

        actions.append(editButton, deleteButton);
        actionCell.appendChild(actions);

        row.append(
            nameCell,
            categoryCell,
            dateCell,
            typeCell,
            amountCell,
            actionCell
        );

        transactionList.appendChild(row);
    });
}

searchInput.addEventListener("input", displayTransactions);
filterType.addEventListener("change", displayTransactions);
filterMonth.addEventListener("change", displayTransactions);

// Monthly budget
function updateBudget() {
    const spent = transactions
        .filter(item =>
            item.type === "expense" && isCurrentMonth(item.date)
        )
        .reduce((sum, item) => sum + item.amount, 0);

    const percentage = (spent / budget) * 100;
    const remaining = budget - spent;

    document.getElementById("budgetAmount").textContent =
        formatCurrency(budget);

    document.getElementById("budgetSpent").textContent =
        formatCurrency(spent);

    document.getElementById("budgetPercentage").textContent =
        Math.round(percentage) + "% used";

    document.getElementById("budgetRemaining").textContent =
        remaining >= 0
            ? formatCurrency(remaining) + " remaining"
            : formatCurrency(Math.abs(remaining)) + " over budget";

    const progress = document.getElementById("budgetProgress");

    progress.style.width = Math.min(percentage, 100) + "%";
    progress.classList.toggle("over-budget", percentage > 100);

    const message = document.getElementById("budgetMessage");
    message.className = "budget-message";

    if (percentage > 100) {
        message.textContent =
            "You have exceeded your monthly budget.";
        message.classList.add("danger");
    } else if (percentage >= 80) {
        message.textContent =
            "You are approaching your budget limit.";
        message.classList.add("warning");
    } else {
        message.textContent =
            "You're doing great! Keep tracking your expenses.";
    }
}

setBudgetBtn.addEventListener("click", () => {
    const newBudget = Number(budgetInput.value);

    if (!Number.isFinite(newBudget) || newBudget <= 0) {
        alert("Please enter a valid budget amount.");
        return;
    }

    budget = newBudget;
    saveBudget();

    budgetInput.value = "";
    updateBudget();
});

// Monthly expense chart
function updateMonthlyChart() {
    const chart = document.getElementById("monthlyChart");
    chart.replaceChildren();

    const now = new Date();
    const months = [];

    for (let i = 5; i >= 0; i--) {
        const date = new Date(
            now.getFullYear(),
            now.getMonth() - i,
            1
        );

        const key =
            date.getFullYear() + "-" +
            String(date.getMonth() + 1).padStart(2, "0");

        const total = transactions
            .filter(item =>
                item.type === "expense" &&
                getMonthKey(item.date) === key
            )
            .reduce((sum, item) => sum + item.amount, 0);

        months.push({
            label: date.toLocaleDateString("en-IN", {
                month: "short"
            }),
            total
        });
    }

    const maximum = Math.max(
        ...months.map(item => item.total),
        1
    );

    months.forEach(item => {
        const group = document.createElement("div");
        group.className = "bar-group";

        const value = document.createElement("span");
        value.className = "bar-value";
        value.textContent = "₹" + Math.round(item.total);

        const bar = document.createElement("div");
        bar.className = "bar";
        bar.style.height =
            Math.max((item.total / maximum) * 125, 3) + "px";

        const label = document.createElement("span");
        label.className = "bar-label";
        label.textContent = item.label;

        group.append(value, bar, label);
        chart.appendChild(group);
    });
}

// Category-wise expenses
function updateCategoryChart() {
    const chart = document.getElementById("categoryChart");
    chart.replaceChildren();

    const totals = {};

    transactions.forEach(item => {
        if (item.type === "expense" && isCurrentMonth(item.date)) {
            totals[item.category] =
                (totals[item.category] || 0) + item.amount;
        }
    });

    const categories = Object.entries(totals)
        .sort((a, b) => b[1] - a[1]);

    if (categories.length === 0) {
        const empty = document.createElement("div");
        empty.className = "empty-state";
        empty.textContent = "No expense data available yet.";
        chart.appendChild(empty);
        return;
    }

    const total = categories.reduce(
        (sum, item) => sum + item[1], 0
    );

    categories.forEach(([name, amount]) => {
        const row = document.createElement("div");
        row.className = "category-row";

        const categoryName = document.createElement("span");
        categoryName.textContent = name;

        const track = document.createElement("div");
        track.className = "category-track";

        const fill = document.createElement("div");
        fill.className = "category-fill";
        fill.style.width = (amount / total) * 100 + "%";

        track.appendChild(fill);

        const categoryAmount = document.createElement("span");
        categoryAmount.className = "category-amount";
        categoryAmount.textContent = formatCurrency(amount);

        row.append(categoryName, track, categoryAmount);
        chart.appendChild(row);
    });
}

// Monthly transaction report
function createMonthlyReport() {
    const monthKey = reportMonthInput.value;

    if (!monthKey) {
        alert("Please select a month.");
        return;
    }

    const monthTransactions = transactions
        .filter(item => getMonthKey(item.date) === monthKey)
        .sort((a, b) => a.date.localeCompare(b.date));

    // Calculate credit and debit
    const totalCredit = monthTransactions
        .filter(item => item.type === "income")
        .reduce((sum, item) => sum + item.amount, 0);

    const totalDebit = monthTransactions
        .filter(item => item.type === "expense")
        .reduce((sum, item) => sum + item.amount, 0);

    // Total transaction volume and net savings
    const transactionVolume = totalCredit + totalDebit;
    const savings = totalCredit - totalDebit;

    const savingsRate = totalCredit > 0
        ? (savings / totalCredit) * 100
        : 0;

    // Category-wise expenses
    const categoryTotals = {};

    monthTransactions
        .filter(item => item.type === "expense")
        .forEach(item => {
            categoryTotals[item.category] =
                (categoryTotals[item.category] || 0) + item.amount;
        });

    const categoryRows = Object.entries(categoryTotals)
        .sort((a, b) => b[1] - a[1])
        .map(([name, amount]) =>
            `<tr>
                <td>${name}</td>
                <td>${formatCurrency(amount)}</td>
            </tr>`
        ).join("");

    // Separate credit and debit columns
    const transactionRows = monthTransactions.length
        ? monthTransactions.map(item => `
            <tr>
                <td>${formatDate(item.date)}</td>
                <td>${item.description}</td>
                <td>${item.category}</td>
                <td class="income">
                    ${item.type === "income"
                        ? formatCurrency(item.amount)
                        : "—"}
                </td>
                <td class="expense">
                    ${item.type === "expense"
                        ? formatCurrency(item.amount)
                        : "—"}
                </td>
                <td>${formatCurrency(item.amount)}</td>
            </tr>
        `).join("")
        : `<tr><td colspan="6">No transactions recorded.</td></tr>`;

    const monthLabel = new Date(
        Number(monthKey.slice(0, 4)),
        Number(monthKey.slice(5, 7)) - 1,
        1
    ).toLocaleDateString("en-IN", {
        month: "long",
        year: "numeric"
    });

    const reportWindow = window.open("", "_blank");

    if (!reportWindow) {
        alert("Please allow pop-ups to download the report.");
        return;
    }

    reportWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>BlueBudget Report - ${monthLabel}</title>

            <style>
                body {
                    font-family: Arial, sans-serif;
                    margin: 35px;
                    color: #17243b;
                }

                h1 { color: #2864d7; }
                h2 { margin-top: 28px; }

                .summary {
                    display: flex;
                    gap: 15px;
                    margin: 25px 0;
                }

                .card {
                    flex: 1;
                    padding: 15px;
                    border: 1px solid #ddd;
                    border-radius: 8px;
                }

                .card p {
                    color: #777;
                    font-size: 13px;
                }

                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 12px;
                }

                th, td {
                    padding: 11px;
                    border-bottom: 1px solid #ddd;
                    text-align: left;
                }

                th {
                    background: #edf3ff;
                }

                .income { color: green; }
                .expense { color: #d64e5b; }

                .total-row {
                    font-weight: bold;
                    background: #edf3ff;
                }

                @media print {
                    body { margin: 15px; }
                }
            </style>
        </head>

        <body>
            <h1>BlueBudget</h1>
            <h2>Monthly Financial Report - ${monthLabel}</h2>

            <p>Generated on:
                ${new Date().toLocaleDateString("en-IN")}
            </p>

            <div class="summary">
                <div class="card">
                    <p>Total Credit</p>
                    <h3>${formatCurrency(totalCredit)}</h3>
                </div>

                <div class="card">
                    <p>Total Debit</p>
                    <h3>${formatCurrency(totalDebit)}</h3>
                </div>

                <div class="card">
                    <p>Net Savings</p>
                    <h3>${formatCurrency(savings)}</h3>
                </div>
            </div>

            <div class="summary">
                <div class="card">
                    <p>Total Transaction Volume</p>
                    <h3>${formatCurrency(transactionVolume)}</h3>
                </div>

                <div class="card">
                    <p>Savings Rate</p>
                    <h3>${totalCredit > 0
                        ? savingsRate.toFixed(1) + "%"
                        : "N/A"}</h3>
                </div>

                <div class="card">
                    <p>Total Transactions</p>
                    <h3>${monthTransactions.length}</h3>
                </div>
            </div>

            <h2>Category-wise Expenses</h2>

            <table>
                <tr>
                    <th>Category</th>
                    <th>Amount</th>
                </tr>

                ${categoryRows ||
                    "<tr><td colspan='2'>No expenses recorded.</td></tr>"}
            </table>

            <h2>All Transactions</h2>

            <table>
                <tr>
                    <th>Date</th>
                    <th>Description</th>
                    <th>Category</th>
                    <th>Credit (₹)</th>
                    <th>Debit (₹)</th>
                    <th>Amount (₹)</th>
                </tr>

                ${transactionRows}

                <tr class="total-row">
                    <td colspan="3">Total</td>
                    <td>${formatCurrency(totalCredit)}</td>
                    <td>${formatCurrency(totalDebit)}</td>
                    <td>${formatCurrency(transactionVolume)}</td>
                </tr>
            </table>

            <script>
                window.onload = function() {
                    setTimeout(() => window.print(), 300);
                };
            <\/script>
        </body>
        </html>
    `);

    reportWindow.document.close();
}
downloadReportBtn.addEventListener("click", createMonthlyReport);

// Refresh all sections
function refreshApp() {
    populateMonthFilter();
    updateDashboard();
    displayTransactions();
    updateBudget();
    updateMonthlyChart();
    updateCategoryChart();
}

refreshApp();
