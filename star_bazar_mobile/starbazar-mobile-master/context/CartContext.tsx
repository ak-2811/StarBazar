import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const CartContext = createContext<any>(null);

export const CartProvider = ({ children }: any) => {
  const [cart, setCart] = useState({});

  useEffect(() => {
    AsyncStorage.getItem("cart").then((raw) => {
      if (raw) setCart(JSON.parse(raw));
    });
  }, []);

  useEffect(() => {
    AsyncStorage.setItem("cart", JSON.stringify(cart));
  }, [cart]);

  const increaseQty = (p: any) => {
    const key = p.item_code;

    setCart((prev: any) => ({
      ...prev,
      [key]: {
        item: p,
        qty: (prev[key]?.qty || 0) + 1,
      },
    }));
  };

  const decreaseQty = (p: any) => {
    const key = p.item_code;

    setCart((prev: any) => {
      const qty = prev[key]?.qty || 0;

      if (qty <= 1) {
        const copy = { ...prev };
        delete copy[key];
        return copy;
      }

      return {
        ...prev,
        [key]: {
          ...prev[key],
          qty: qty - 1,
        },
      };
    });
  };
  // ✅ remove item completely
  const removeFromCart = (item_code: string) => {
    setCart((prev: any) => {
      const copy = { ...prev };
      delete copy[item_code];
      return copy;
    });
  };

  // ✅ clear entire cart (useful after order)
  const clearCart = () => {
    setCart({});
  };

  return (
    <CartContext.Provider value={{ cart, setCart, increaseQty, decreaseQty, removeFromCart, clearCart}}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);