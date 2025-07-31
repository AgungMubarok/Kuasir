"use client";

import { useState } from "react";
import Cart, { CartItem } from "@/components/Cart"; // <-- Import CartItem
import withAuth from "@/hooks/withAuth";
import ProductDataTable from "@/components/ProductDataTable";

// Definisikan tipe data produk yang lengkap
interface Product {
  id: string;
  namaProduk: string;
  hargaJual: number;
  hargaModal: number;
}

function HomePage() {
  const [cart, setCart] = useState<CartItem[]>([]);

  const handleAddToCart = (product: Product) => {
    setCart((prevCart) => {
      const existingItem = prevCart.find((item) => item.id === product.id);
      if (existingItem) {
        // Jika item sudah ada, tambah quantity
        return prevCart.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        // Jika item baru, tambahkan ke keranjang dengan quantity 1
        return [...prevCart, { ...product, quantity: 1 }];
      }
    });
  };

  // Fungsi baru untuk mengupdate seluruh keranjang
  const handleUpdateCart = (newCart: CartItem[]) => {
    setCart(newCart);
  };

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <div className="w-full md:w-2/3">
        <ProductDataTable onAddToCart={handleAddToCart} />
      </div>
      <Cart cart={cart} onUpdateCart={handleUpdateCart} />
    </div>
  );
}

export default withAuth(HomePage, ["cashier", "admin"]);
