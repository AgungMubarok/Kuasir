"use client"; // Wajib ada karena kita menggunakan hooks (useState, useEffect)

import { useState, useEffect } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase"; // Import koneksi firestore

// Definisikan tipe data untuk produk
interface Product {
  id: string;
  namaProduk: string;
  hargaJual: number;
  hargaModal: number;
}

// Props untuk komponen ini adalah fungsi untuk menambah item ke keranjang
interface ProductListProps {
  onAddToCart: (product: Product) => void;
}

export default function ProductList({ onAddToCart }: ProductListProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // onSnapshot akan "mendengarkan" perubahan data di koleksi 'products' secara real-time
    const unsubscribe = onSnapshot(collection(db, "products"), (snapshot) => {
      const productsData = snapshot.docs.map(
        (doc) =>
          ({
            id: doc.id,
            ...doc.data(),
          } as Product)
      );
      setProducts(productsData);
      setLoading(false);
    });

    // Membersihkan listener saat komponen di-unmount
    return () => unsubscribe();
  }, []);

  if (loading) {
    return <div className="text-center p-10">Memuat produk...</div>;
  }

  return (
    <div className="w-full md:max-w-5xl p-4">
      <h2 className="text-2xl font-bold mb-4">Daftar Produk</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {products.map((product) => (
          <div
            key={product.id}
            className="border rounded-lg p-4 flex flex-col justify-between shadow-sm"
          >
            <div>
              <h3 className="font-semibold text-lg">{product.namaProduk}</h3>
              <p className="text-gray-600">
                Rp {product.hargaJual.toLocaleString("id-ID")}
              </p>
            </div>
            <button
              onClick={() => onAddToCart(product)}
              className="mt-4 bg-blue-500 text-white py-2 rounded-md hover:bg-blue-600 transition-colors"
            >
              Tambah
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
