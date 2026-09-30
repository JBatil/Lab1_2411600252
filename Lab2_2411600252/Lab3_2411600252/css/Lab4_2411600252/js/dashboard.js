let simulationTimer = null;
let simulationRunning = false;

document.addEventListener('DOMContentLoaded', async function () {
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    if (isLoggedIn !== 'true') {
        window.location.href = 'index.html';
        return;
    }

    const username = localStorage.getItem('user') || 'User';
    updateGreeting(username);
    const userNameSpan = document.getElementById('userName');
    if (userNameSpan) userNameSpan.textContent = username;

    setupLogout();

    try {
        await DataManager.initializeData();
        populateCategoryFilter();
        refreshDashboard();
        setupEventHandlers();
    } catch (error) {
        showLoadError();
    }
});

function updateGreeting(username) {
    const greetingElement = document.getElementById('greeting');
    if (!greetingElement) return;
    const hour = new Date().getHours();
    let timeOfDay = 'Good Morning';
    if (hour >= 12 && hour < 17) timeOfDay = 'Good Afternoon';
    else if (hour >= 17 && hour < 21) timeOfDay = 'Good Evening';
    else if (hour < 5 || hour >= 21) timeOfDay = 'Good Night';
    greetingElement.textContent = `${timeOfDay}, ${username}!`;
}

function setupLogout() {
    const logoutBtn = document.getElementById('logoutBtn');
    const logoutLink = document.getElementById('logoutLink');

    function performLogout(e) {
        e.preventDefault();
        stopSimulation();
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('user');
        window.location.href = 'index.html';
    }

    if (logoutBtn) logoutBtn.addEventListener('click', performLogout);
    if (logoutLink) logoutLink.addEventListener('click', performLogout);
}

function showLoadError() {
    const alertSection = document.getElementById('alertSection');
    if (alertSection) {
        alertSection.innerHTML = `
            <div class="alert alert-danger" role="alert">
                <i class="bi bi-exclamation-triangle-fill"></i>
                Unable to load inventory data. Please check that <code>js/products.json</code> is reachable and reload the page.
            </div>`;
    }
}

function populateCategoryFilter() {
    const select = document.getElementById('categoryFilter');
    if (!select) return;
    const categories = DataManager.getCategories();
    categories.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat;
        opt.textContent = cat;
        select.appendChild(opt);
    });
}

function refreshDashboard(filteredProducts = null) {
    const stats = DataManager.getStockStatistics();
    updateStatCards(stats);
    updateAlertBanner();
    ChartManager.renderAllCharts();
    renderInventoryTable(filteredProducts !== null ? filteredProducts : DataManager.getProducts());
}

function updateStatCards(stats) {
    setText('statTotalProducts', stats.totalProducts);
    setText('statTotalValue', `$${stats.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
    setText('statLowStock', stats.lowStockCount);
    setText('statOutOfStock', stats.outOfStockCount);
}

function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

function updateAlertBanner() {
    const alertSection = document.getElementById('alertSection');
    if (!alertSection) return;

    const lowStock = DataManager.getLowStockProducts();
    if (lowStock.length === 0) {
        alertSection.innerHTML = '';
        return;
    }

    const names = lowStock.slice(0, 5).map(p => p.name).join(', ');
    const extra = lowStock.length > 5 ? ` and ${lowStock.length - 5} more` : '';

    alertSection.innerHTML = `
        <div class="alert alert-warning d-flex align-items-start gap-2 mb-4" role="alert">
            <i class="bi bi-exclamation-triangle-fill fs-5"></i>
            <div>
                <strong>${lowStock.length} product${lowStock.length > 1 ? 's' : ''} need attention:</strong>
                ${names}${extra}.
            </div>
        </div>`;
}

function renderInventoryTable(products) {
    const tbody = document.getElementById('inventoryTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (products.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-3">No products match your filters.</td></tr>`;
    } else {
        products.forEach(p => {
            const row = document.createElement('tr');
            if (p.status === 'Low Stock') row.classList.add('table-warning');
            if (p.status === 'Out of Stock') row.classList.add('table-danger');

            row.innerHTML = `
                <td>${p.sku}</td>
                <td>${highlightMatch(p.name)}</td>
                <td>${p.category}</td>
                <td>${p.quantity}</td>
                <td>$${p.unit_price.toFixed(2)}</td>
                <td><span class="badge" style="background-color:${CONFIG.statusColors[p.status]}">${p.status}</span></td>
                <td>${p.supplier}</td>
            `;
            tbody.appendChild(row);
        });
    }

    const resultsCount = document.getElementById('resultsCount');
    if (resultsCount) {
        resultsCount.textContent = `Showing ${products.length} of ${DataManager.getProducts().length} products`;
    }
}

function highlightMatch(text) {
    const filters = DataManager.getActiveFilters();
    const q = filters.searchQuery;
    if (!q) return text;
    const regex = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'ig');
    return text.replace(regex, '<mark>$1</mark>');
}

function setupEventHandlers() {
    const categoryFilter = document.getElementById('categoryFilter');
    const stockStatusFilter = document.getElementById('stockStatusFilter');
    const minPriceFilter = document.getElementById('minPriceFilter');
    const maxPriceFilter = document.getElementById('maxPriceFilter');
    const resetBtn = document.getElementById('resetFiltersBtn');
    const searchInput = document.getElementById('searchInput');
    const exportBtn = document.getElementById('exportCsvBtn');
    const toggleSimBtn = document.getElementById('toggleSimBtn');

    if (categoryFilter) {
        categoryFilter.addEventListener('change', () => {
            const filtered = DataManager.filterByCategory(categoryFilter.value);
            renderInventoryTable(filtered);
        });
    }

    if (stockStatusFilter) {
        stockStatusFilter.addEventListener('change', () => {
            const filtered = DataManager.filterByStockStatus(stockStatusFilter.value);
            renderInventoryTable(filtered);
        });
    }

    function applyPriceRange() {
        const min = minPriceFilter.value !== '' ? parseFloat(minPriceFilter.value) : null;
        const max = maxPriceFilter.value !== '' ? parseFloat(maxPriceFilter.value) : null;
        const filtered = DataManager.filterByPriceRange(min, max);
        renderInventoryTable(filtered);
    }
    if (minPriceFilter) minPriceFilter.addEventListener('input', debounce(applyPriceRange, 300));
    if (maxPriceFilter) maxPriceFilter.addEventListener('input', debounce(applyPriceRange, 300));

    if (searchInput) {
        searchInput.addEventListener('input', debounce(() => {
            const filtered = DataManager.setSearchQuery(searchInput.value);
            renderInventoryTable(filtered);
        }, 200));
    }

    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            categoryFilter.value = 'all';
            stockStatusFilter.value = 'all';
            minPriceFilter.value = '';
            maxPriceFilter.value = '';
            searchInput.value = '';
            const filtered = DataManager.resetFilters();
            renderInventoryTable(filtered);
        });
    }

    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            const currentData = DataManager.applyFilters();
            const csv = DataManager.exportToCSV(currentData);
            if (!csv) {
                showToast('Nothing to export', 'warning');
                return;
            }
            const filename = `inventory_export_${new Date().toISOString().slice(0, 10)}.csv`;
            DataManager.downloadCSV(csv, filename);
            showToast(`Exported ${currentData.length} products to ${filename}`, 'success');
        });
    }

    if (toggleSimBtn) {
        toggleSimBtn.addEventListener('click', toggleSimulation);
    }
}

function debounce(fn, delay) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
    };
}

function toggleSimulation() {
    simulationRunning ? stopSimulation() : startSimulation();
}

function startSimulation() {
    simulationRunning = true;
    const btn = document.getElementById('toggleSimBtn');
    if (btn) btn.innerHTML = '<i class="bi bi-pause-fill"></i> Stop Live Updates';
    setText('lastUpdated', 'Live • updating');

    simulationTimer = setInterval(() => {
        const result = DataManager.simulateInventoryChange();
        if (!result) return;
        logInventoryChange(result.product, result.delta);
        const filtered = DataManager.applyFilters();
        refreshDashboard(filtered);
        showToast(`${result.product.name}: ${result.delta >= 0 ? '+' : ''}${result.delta} units`, result.delta >= 0 ? 'success' : 'warning');
    }, CONFIG.simulationIntervalMs);
}

function stopSimulation() {
    simulationRunning = false;
    clearInterval(simulationTimer);
    const btn = document.getElementById('toggleSimBtn');
    if (btn) btn.innerHTML = '<i class="bi bi-play-fill"></i> Start Live Updates';
    setText('lastUpdated', 'Live');
}

function logInventoryChange(product, delta) {
    const tbody = document.getElementById('activityTableBody');
    if (!tbody) return;

    if (tbody.children.length === 1 && tbody.children[0].children.length === 1) {
        tbody.innerHTML = '';
    }

    const row = document.createElement('tr');
    const time = new Date().toLocaleTimeString();
    const direction = delta >= 0 ? 'received' : 'sold/adjusted';
    let badgeClass = 'bg-success';
    if (product.status === 'Low Stock') badgeClass = 'bg-warning text-dark';
    if (product.status === 'Out of Stock') badgeClass = 'bg-danger';

    row.innerHTML = `
        <td>${time}</td>
        <td>${product.name} (${product.sku}) ${direction} ${Math.abs(delta)} units &mdash; now ${product.quantity} in stock</td>
        <td><span class="badge ${badgeClass}">${product.status}</span></td>
    `;
    tbody.insertBefore(row, tbody.firstChild);

    while (tbody.children.length > 10) {
        tbody.removeChild(tbody.lastChild);
    }
}

function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toastEl = document.createElement('div');
    toastEl.className = `toast align-items-center text-white bg-${type === 'success' ? 'success' : type === 'warning' ? 'warning' : 'danger'} border-0`;
    toastEl.setAttribute('role', 'alert');
    toastEl.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">${message}</div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
        </div>`;
    container.appendChild(toastEl);

    const toast = new bootstrap.Toast(toastEl, { delay: 4000 });
    toast.show();
    toastEl.addEventListener('hidden.bs.toast', () => toastEl.remove());
}