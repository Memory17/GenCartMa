// Inventory refresh event system
class InventoryEventManager {
  constructor() {
    this.listeners = [];
  }

  // Subscribe to inventory refresh events
  subscribe(callback) {
    this.listeners.push(callback);
    console.log(`InventoryEvents: Added subscriber. Total listeners: ${this.listeners.length}`);
    return () => {
      this.listeners = this.listeners.filter(listener => listener !== callback);
      console.log(`InventoryEvents: Removed subscriber. Total listeners: ${this.listeners.length}`);
    };
  }

  // Trigger inventory refresh for specific products
  refreshProduct(productId) {
    console.log(`InventoryEvents: Triggering product refresh for product ${productId}. Notifying ${this.listeners.length} listeners.`);
    this.listeners.forEach(listener => {
      try {
        listener({ type: 'PRODUCT_REFRESH', productId });
      } catch (error) {
        console.error('Error in inventory event listener:', error);
      }
    });
  }

  // Trigger inventory refresh for all products
  refreshAll() {
    console.log(`InventoryEvents: Triggering refresh for all products. Notifying ${this.listeners.length} listeners.`);
    this.listeners.forEach(listener => {
      try {
        listener({ type: 'ALL_REFRESH' });
      } catch (error) {
        console.error('Error in inventory event listener:', error);
      }
    });
  }

  // Trigger inventory refresh for products in a specific category
  refreshCategory(categoryId) {
    this.listeners.forEach(listener => {
      try {
        listener({ type: 'CATEGORY_REFRESH', categoryId });
      } catch (error) {
        console.error('Error in inventory event listener:', error);
      }
    });
  }
}

// Create a singleton instance
export const inventoryEvents = new InventoryEventManager();

// Helper function to refresh inventory after successful cart/order operations
export const triggerInventoryRefresh = (productIds = null) => {
  console.log('triggerInventoryRefresh called with:', productIds);
  if (productIds && Array.isArray(productIds)) {
    // Refresh specific products
    console.log('Refreshing specific products:', productIds);
    productIds.forEach(productId => {
      inventoryEvents.refreshProduct(productId);
    });
  } else if (productIds) {
    // Refresh single product
    console.log('Refreshing single product:', productIds);
    inventoryEvents.refreshProduct(productIds);
  } else {
    // Refresh all products
    console.log('Refreshing all products');
    inventoryEvents.refreshAll();
  }
}; 