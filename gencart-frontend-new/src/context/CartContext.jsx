import React, { createContext, useContext, useState, useEffect } from 'react';
import { message } from 'antd';
import { triggerInventoryRefresh } from '../utils/inventoryEvents';

// Create the cart context
const CartContext = createContext();

// Custom hook to use the cart context
export const useCart = () => {
  return useContext(CartContext);
};

// Cart provider component
export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState([]);
  const [cartCount, setCartCount] = useState(0);
  const [cartTotal, setCartTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  // Fetch cart from backend if user is logged in
  const fetchCartFromBackend = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) return false;

    try {
      setLoading(true);
      const response = await fetch('http://localhost:8000/api/cart/my_cart/', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();

        // Convert backend cart items to frontend format
        const formattedItems = data.items.map(item => ({
          id: item.product.id,
          name: item.product.name,
          price: parseFloat(item.product.price),
          discount_price: item.product.discount_price ? parseFloat(item.product.discount_price) : null,
          image: item.product.primary_image || item.product.image_url,
          primary_image: item.product.primary_image,
          quantity: item.quantity,
          cart_item_id: item.id
        }));

        setCartItems(formattedItems);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error fetching cart from backend:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Load cart on initial render and when auth state changes
  useEffect(() => {
    const loadCart = async () => {
      // Try to fetch from backend first
      const backendSuccess = await fetchCartFromBackend();

      // If backend fetch failed or user is not logged in, load from localStorage
      if (!backendSuccess) {
        const storedCart = localStorage.getItem('cart');
        if (storedCart) {
          try {
            const parsedCart = JSON.parse(storedCart);
            setCartItems(parsedCart);
          } catch (error) {
            console.error('Error parsing cart from localStorage:', error);
            setCartItems([]);
          }
        }
      }
    };

    loadCart();

    // Listen for auth state changes
    const handleStorageChange = (e) => {
      if (e.key === 'access_token') {
        loadCart();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Update cart count and total whenever cartItems changes
  useEffect(() => {
    // Calculate total items in cart
    const itemCount = cartItems.reduce((total, item) => total + item.quantity, 0);
    setCartCount(itemCount);

    // Calculate total price
    const total = cartItems.reduce((sum, item) => {
      const price = item.discount_price || item.price;
      return sum + (price * item.quantity);
    }, 0);
    setCartTotal(total);

    // Save to localStorage
    localStorage.setItem('cart', JSON.stringify(cartItems));
  }, [cartItems]);

  // Sync cart with backend
  const syncCartWithBackend = async (product, quantity, action) => {
    const token = localStorage.getItem('access_token');
    if (!token) return false;

    try {
      let endpoint, method, body;

      switch (action) {
        case 'add':
          endpoint = 'add_item';
          method = 'POST';
          body = { product_id: product.id, quantity };
          break;
        case 'update':
          // Find the cart_item_id for this product
          const cartItem = cartItems.find(item => item.id === product);
          if (!cartItem || !cartItem.cart_item_id) {
            // If we don't have a cart_item_id, fall back to add
            endpoint = 'add_item';
            method = 'POST';
            body = { product_id: product, quantity };
          } else {
            endpoint = 'update_item';
            method = 'POST';
            body = { cart_item_id: cartItem.cart_item_id, quantity };
          }
          break;
        case 'remove':
          // Find the cart_item_id for this product
          const itemToRemove = cartItems.find(item => item.id === product);
          if (!itemToRemove || !itemToRemove.cart_item_id) return false;

          endpoint = 'remove_item';
          method = 'POST';
          body = { cart_item_id: itemToRemove.cart_item_id };
          break;
        case 'clear':
          endpoint = 'clear';
          method = 'POST';
          body = {};
          break;
        default:
          return false;
      }

      const response = await fetch(`http://localhost:8000/api/cart/${endpoint}/`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        // Refresh cart from backend
        await fetchCartFromBackend();
        return true;
      }
      return false;
    } catch (error) {
      console.error(`Error ${action} cart:`, error);
      return false;
    }
  };

  // Add item to cart
  const addToCart = async (product, quantity = 1) => {
    // Try to sync with backend first
    const token = localStorage.getItem('access_token');
    let syncSuccess = false;

    if (token) {
      syncSuccess = await syncCartWithBackend(product, quantity, 'add');
      
      // If backend sync was successful, trigger inventory refresh for this product
      if (syncSuccess) {
        triggerInventoryRefresh(product.id);
      }
    }

    // If backend sync failed or user is not logged in, update local cart
    if (!syncSuccess) {
      setCartItems(prevItems => {
        // Check if item already exists in cart
        const existingItemIndex = prevItems.findIndex(item => item.id === product.id);

        if (existingItemIndex !== -1) {
          // Item exists, update quantity
          const updatedItems = [...prevItems];
          updatedItems[existingItemIndex] = {
            ...updatedItems[existingItemIndex],
            quantity: updatedItems[existingItemIndex].quantity + quantity
          };
          return updatedItems;
        } else {
          // Item doesn't exist, add new item
          return [...prevItems, { ...product, quantity }];
        }
      });
    }
  };

  // Remove item from cart
  const removeFromCart = async (productId) => {
    // Try to sync with backend first
    const token = localStorage.getItem('access_token');
    let syncSuccess = false;

    if (token) {
      syncSuccess = await syncCartWithBackend(productId, 0, 'remove');
    }

    // If backend sync failed or user is not logged in, update local cart
    if (!syncSuccess) {
      setCartItems(prevItems => prevItems.filter(item => item.id !== productId));
    }
  };

  // Update item quantity
  const updateQuantity = async (productId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }

    // Try to sync with backend first
    const token = localStorage.getItem('access_token');
    let syncSuccess = false;

    if (token) {
      syncSuccess = await syncCartWithBackend(productId, quantity, 'update');
    }

    // If backend sync failed or user is not logged in, update local cart
    if (!syncSuccess) {
      setCartItems(prevItems =>
        prevItems.map(item =>
          item.id === productId ? { ...item, quantity } : item
        )
      );
    }
  };

  // Clear cart
  const clearCart = async () => {
    // Try to sync with backend first
    const token = localStorage.getItem('access_token');
    let syncSuccess = false;

    if (token) {
      syncSuccess = await syncCartWithBackend(null, 0, 'clear');
    }

    // Always clear local cart
    setCartItems([]);
  };

  // Context value
  const value = {
    cartItems,
    cartCount,
    cartTotal,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};
