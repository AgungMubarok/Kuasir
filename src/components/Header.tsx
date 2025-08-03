"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function Header() {
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);

  // Mengambil peran dari localStorage saat komponen dimuat di client
  useEffect(() => {
    const role = localStorage.getItem("userRole");
    setUserRole(role);
  }, []);

  // Efek untuk menutup menu saat klik di luar area menu
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    // Tambahkan event listener saat menu terbuka
    if (isMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    // Hapus event listener saat komponen dibersihkan atau menu tertutup
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isMenuOpen]);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleLinkClick = () => {
    setIsMenuOpen(false); // Tutup menu setelah link diklik
  };

  const handleLogout = () => {
    setIsMenuOpen(false);
    localStorage.removeItem("userRole");
    router.push("/login");
  };

  return (
    <header className="bg-gray-800 text-white shadow-md sticky top-0 z-50">
      <nav className="container mx-auto px-4 py-3 flex justify-between items-center">
        <Link
          href="/"
          className="text-xl font-bold hover:text-gray-300"
          onClick={handleLinkClick}
        >
          Warkocap
        </Link>

        {/* Tombol Hamburger hanya muncul jika sudah login */}
        {userRole && (
          <div className="relative" ref={menuRef}>
            <button
              onClick={toggleMenu}
              className="p-2 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-white"
            >
              {/* Ikon Hamburger */}
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16m-7 6h7"
                />
              </svg>
            </button>

            {/* Panel Menu Dropdown */}
            {isMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg py-1 z-50 text-gray-800">
                {/* Menu untuk Admin */}
                {userRole === "admin" && (
                  <>
                    <Link
                      href="/admin/daftar"
                      className="block px-4 py-2 text-sm hover:bg-gray-100"
                      onClick={handleLinkClick}
                    >
                      Daftar Produk
                    </Link>
                    <Link
                      href="/admin/tambah"
                      className="block px-4 py-2 text-sm hover:bg-gray-100"
                      onClick={handleLinkClick}
                    >
                      Tambah Produk
                    </Link>
                    <Link
                      href="/recap"
                      className="block px-4 py-2 text-sm hover:bg-gray-100"
                      onClick={handleLinkClick}
                    >
                      Rekap Penjualan
                    </Link>
                    <div className="border-t border-gray-100 my-1"></div>
                  </>
                )}
                {/* Menu untuk Semua Role yang Login */}
                <Link
                  href="/pengeluaran"
                  className="block px-4 py-2 text-sm hover:bg-gray-100"
                  onClick={handleLinkClick}
                >
                  Catat Pengeluaran
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full text-left block px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        )}
      </nav>
    </header>
  );
}
