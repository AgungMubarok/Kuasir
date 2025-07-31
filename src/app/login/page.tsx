"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();

    const adminPasscode = process.env.NEXT_PUBLIC_ADMIN_PASSCODE;
    const cashierPasscode = process.env.NEXT_PUBLIC_CASHIER_PASSCODE;

    if (passcode === adminPasscode) {
      // Jika kode benar untuk admin
      localStorage.setItem("userRole", "admin"); // Simpan peran di localStorage
      router.push("/admin"); // Arahkan ke halaman admin
    } else if (passcode === cashierPasscode) {
      // Jika kode benar untuk kasir
      localStorage.setItem("userRole", "cashier"); // Simpan peran di localStorage
      router.push("/"); // Arahkan ke halaman kasir (halaman utama)
    } else {
      // Jika kode salah
      setError("Kode sandi salah!");
    }
  };

  return (
    <main className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-center text-gray-900">
          Selamat Datang
        </h1>
        <p className="text-center text-gray-600">
          Masukkan kode sandi untuk melanjutkan
        </p>
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <input
              type="password"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              placeholder="Kode Sandi"
              className="w-full px-4 py-2 text-lg text-center border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          {error && <p className="text-sm text-center text-red-500">{error}</p>}
          <div>
            <button
              type="submit"
              className="w-full py-2 px-4 font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Masuk
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
