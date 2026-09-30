const DataManager = (function () {
    let allProducts = [];      
    let activeFilters = {
        category: 'all',
        stockStatus: 'all',
        minPrice: null,
        maxPrice: null,
        searchQuery: ''
    };

    async function initializeData() {
        try {
            const response = await fetch(CONFIG.dataUrl);
            if (!response.ok) {
                throw new Error(`Failed to load product data (status ${response.status})`);
            }
            const rawProducts = await response.json();
            allProducts = rawProducts.map(p => ({ ...p, status: getStockStatus(p) }));
            return allProducts;
        } catch (error) {
            console.error('initializeData error:', error);
            allProducts = [];
            throw error;
        }
    }

    function getProducts() {
        return allProducts;
    }

    function getProductById(id) {
        return allProducts.find(p => p.id === Number(id)) || null;
    }

    function getProductsByCategory(category) {
        if (category === 'all') return allProducts;
        return allProducts.filter(p => p.category === category);
    }

    function getLowStockProducts() {
        return allProducts.filter(p => p.status === 'Low Stock' || p.status === 'Out of Stock');
    }

    function getStockStatistics() {
        const totalProducts = allProducts.length;
        const totalValue = allProducts.reduce((sum, p) => sum + p.quantity * p.unit_price, 0);
        const lowStockCount = allProducts.filter(p => p.status === 'Low Stock').length;
        const outOfStockCount = allProducts.filter(p => p.status === 'Out of Stock').length;
        const totalUnits = allProducts.reduce((sum, p) => sum + p.quantity, 0);

        return { totalProducts, totalValue, lowStockCount, outOfStockCount, totalUnits };
    }

    function getCategorySummary() {
        const summary = {};
        allProducts.forEach(p => {
            if (!summary[p.category]) {
                summary[p.category] = { category: p.category, totalValue: 0, totalQuantity: 0, productCount: 0 };
            }
            summary[p.category].totalValue += p.quantity * p.unit_price;
            summary[p.category].totalQuantity += p.quantity;
            summary[p.category].productCount += 1;
        });
        return Object.values(summary);
    }

    function getTopProductsByValue(limit = 5) {
        return [...allProducts]
            .sort((a, b) => (b.quantity * b.unit_price) - (a.quantity * a.unit_price))
            .slice(0, limit);
    }

    function getCategories() {
        return [...new Set(allProducts.map(p => p.category))].sort();
    }

    function filterByCategory(category) {
        activeFilters.category = category;
        return applyFilters();
    }

    function filterByStockStatus(status) {
        activeFilters.stockStatus = status;
        return applyFilters();
    }

    function filterByPriceRange(min, max) {
        activeFilters.minPrice = min;
        activeFilters.maxPrice = max;
        return applyFilters();
    }

    function setSearchQuery(query) {
        activeFilters.searchQuery = (query || '').trim().toLowerCase();
        return applyFilters();
    }

    function resetFilters() {
        activeFilters = { category: 'all', stockStatus: 'all', minPrice: null, maxPrice: null, searchQuery: '' };
        return applyFilters();
    }

    function getActiveFilters() {
        return { ...activeFilters };
    }

    function applyFilters() {
        let result = allProducts;

        if (activeFilters.category !== 'all') {
            result = result.filter(p => p.category === activeFilters.category);
        }
        if (activeFilters.stockStatus !== 'all') {
            result = result.filter(p => p.status === activeFilters.stockStatus);
        }
        if (activeFilters.minPrice !== null && !isNaN(activeFilters.minPrice)) {
            result = result.filter(p => p.unit_price >= activeFilters.minPrice);
        }
        if (activeFilters.maxPrice !== null && !isNaN(activeFilters.maxPrice)) {
            result = result.filter(p => p.unit_price <= activeFilters.maxPrice);
        }
        if (activeFilters.searchQuery) {
            const q = activeFilters.searchQuery;
            result = result.filter(p =>
                p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)
            );
        }
        return result;
    }

    function searchProducts(query) {
        const q = (query || '').trim().toLowerCase();
        if (!q) return allProducts;
        return allProducts.filter(p =>
            p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)
        );
    }

    function simulateInventoryChange() {
        if (allProducts.length === 0) return null;
        const index = Math.floor(Math.random() * allProducts.length);
        const product = allProducts[index];
        const delta = Math.floor(Math.random() * 11) - 5; // -5..+5
        product.quantity = Math.max(0, product.quantity + delta);
        product.status = getStockStatus(product);
        return { product, delta };
    }

    function exportToCSV(data) {
        const rows = data && data.length ? data : allProducts;
        if (!rows.length) return '';

        const headers = ['SKU', 'Name', 'Category', 'Quantity', 'Unit Price', 'Reorder Level', 'Status', 'Supplier'];
        const lines = [headers.join(',')];

        rows.forEach(p => {
            const line = [
                p.sku,
                `"${p.name.replace(/"/g, '""')}"`,
                p.category,
                p.quantity,
                p.unit_price.toFixed(2),
                p.reorder_level,
                p.status,
                `"${p.supplier.replace(/"/g, '""')}"`
            ].join(',');
            lines.push(line);
        });

        return lines.join('\n');
    }

    function downloadCSV(csvContent, filename) {
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', filename || 'inventory_export.csv');
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    return {
        initializeData,
        getProducts,
        getProductById,
        getProductsByCategory,
        getLowStockProducts,
        getStockStatistics,
        getCategorySummary,
        getTopProductsByValue,
        getCategories,
        filterByCategory,
        filterByStockStatus,
        filterByPriceRange,
        setSearchQuery,
        resetFilters,
        getActiveFilters,
        applyFilters,
        searchProducts,
        simulateInventoryChange,
        exportToCSV,
        downloadCSV
    };
})();