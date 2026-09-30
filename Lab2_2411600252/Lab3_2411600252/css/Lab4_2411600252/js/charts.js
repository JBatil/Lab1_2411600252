const ChartManager = (function () {
    let categoryValueChart = null;
    let stockStatusChart = null;
    let topProductsChart = null;

    const baseOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { labels: { font: { size: 11 } } }
        }
    };

    function renderCategoryValueChart(categorySummary) {
        const ctx = document.getElementById('categoryValueChart');
        if (!ctx) return;

        const labels = categorySummary.map(c => c.category);
        const values = categorySummary.map(c => Number(c.totalValue.toFixed(2)));

        if (categoryValueChart) categoryValueChart.destroy();
        categoryValueChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: 'Inventory Value ($)',
                    data: values,
                    backgroundColor: CONFIG.chartPalette,
                    borderRadius: 6
                }]
            },
            options: {
                ...baseOptions,
                plugins: { ...baseOptions.plugins, legend: { display: false } },
                scales: { y: { beginAtZero: true } }
            }
        });
    }

    function renderStockStatusChart(stats) {
        const ctx = document.getElementById('stockStatusChart');
        if (!ctx) return;

        const inStock = stats.totalProducts - stats.lowStockCount - stats.outOfStockCount;
        const labels = ['In Stock', 'Low Stock', 'Out of Stock'];
        const data = [inStock, stats.lowStockCount, stats.outOfStockCount];
        const colors = labels.map(l => CONFIG.statusColors[l]);

        if (stockStatusChart) stockStatusChart.destroy();
        stockStatusChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels,
                datasets: [{ data, backgroundColor: colors, borderWidth: 2, borderColor: '#fff' }]
            },
            options: { ...baseOptions, cutout: '65%' }
        });
    }

    function renderTopProductsChart(topProducts) {
        const ctx = document.getElementById('topProductsChart');
        if (!ctx) return;

        const labels = topProducts.map(p => p.name);
        const values = topProducts.map(p => Number((p.quantity * p.unit_price).toFixed(2)));

        if (topProductsChart) topProductsChart.destroy();
        topProductsChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: 'Inventory Value ($)',
                    data: values,
                    backgroundColor: CONFIG.chartPalette[1],
                    borderRadius: 6
                }]
            },
            options: {
                ...baseOptions,
                indexAxis: 'y',
                plugins: { ...baseOptions.plugins, legend: { display: false } },
                scales: { x: { beginAtZero: true } }
            }
        });
    }

    function renderAllCharts() {
        renderCategoryValueChart(DataManager.getCategorySummary());
        renderStockStatusChart(DataManager.getStockStatistics());
        renderTopProductsChart(DataManager.getTopProductsByValue(5));
    }

    return { renderAllCharts, renderCategoryValueChart, renderStockStatusChart, renderTopProductsChart };
})();