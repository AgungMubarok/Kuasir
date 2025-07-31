"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function Header() {
  const [userRole, setUserRole] = useState<string | null>(null);
  const router = useRouter();

  // useEffect akan berjalan di sisi client untuk membaca localStorage
  useEffect(() => {
    const role = localStorage.getItem("userRole");
    setUserRole(role);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("userRole");
    // Arahkan ke halaman login setelah logout untuk keamanan
    router.push("/login");
  };

  // Jika peran belum termuat (saat server-side rendering), tampilkan header kosong
  if (userRole === null) {
    return (
      <header className="bg-gray-800 text-white shadow-md">
        <nav className="container mx-auto px-6 py-3 flex justify-between items-center">
          <div className="text-xl font-bold">Warkocap</div>
        </nav>
      </header>
    );
  }

  return (
    <header className="bg-gray-800 text-white shadow-md">
      <nav className="container mx-auto px-6 py-3 flex justify-between items-center">
        <Link href="/" className="text-xl font-bold hover:text-gray-300">
          Warkocap
        </Link>
        <div className="flex items-center space-x-4">
          {/* ============================================== */}
          {/* Logika Menu Berdasarkan Peran        */}
          {/* ============================================== */}

          {/* --- Tampilkan menu ini HANYA untuk Admin --- */}
          {userRole === "admin" && (
            <>
              <Link
                href="/admin/daftar"
                className="hover:text-gray-300 text-sm md:text-base"
              >
                Daftar Produk
              </Link>
              <Link
                href="/admin/tambah"
                className="hover:text-gray-300 text-sm md:text-base"
              >
                Tambah Produk
              </Link>
              <Link
                href="/recap"
                className="hover:text-gray-300 text-sm md:text-base"
              >
                Rekap Penjualan
              </Link>
            </>
          )}

          {/* --- Tampilkan menu ini HANYA untuk Kasir (jika ada) --- */}
          {userRole === "cashier" && (
            <>{/* Tambahkan link khusus kasir di sini jika perlu */}</>
          )}

          {/* --- Tombol Logout muncul untuk semua peran yang sudah login --- */}
          {userRole && (
            <button
              onClick={handleLogout}
              className="bg-red-500 hover:bg-red-600 px-3 py-1 rounded text-sm md:text-base"
            >
              Logout
            </button>
          )}
        </div>
      </nav>
    </header>
  );
}
