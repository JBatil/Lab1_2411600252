const CONFIG = {
    dataUrl: 'data/products.json',
    simulationIntervalMs: 8000, 
    statusColors: {
        'In Stock': '#10B981',
        'Low Stock': '#f3a712',
        'Out of Stock': '#dc3545'
    },
    chartPalette: [
        '#4F46E5', '#6366F1', '#10B981', '#f3a712',
        '#17a2b8', '#dc3545', '#0EA5E9', '#8B5CF6'
    ]
};

function getStockStatus(product) {
    if (product.quantity <= 0) return 'Out of Stock';
    if (product.quantity <= product.reorder_level) return 'Low Stock';
    return 'In Stock';
}