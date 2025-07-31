"use client";

import { useState } from "react";
import { collection, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import withAuth from "@/hooks/withAuth";
import Link from "next/link";
import Swal from "sweetalert2";

function TambahProdukPage() {
  const [namaProduk, setNamaProduk] = useState("");
  const [hargaJual, setHargaJual] = useState("");
  const [hargaModal, setHargaModal] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!namaProduk || !hargaJual)
      return Swal.fire({
        icon: "info",
        title: "Warning!",
        text: "Harap isi semua kolom!",
      });
    setLoading(true);
    try {
      await addDoc(collection(db, "products"), {
        namaProduk,
        hargaJual: Number(hargaJual),
        hargaModal: Number(hargaModal),
      });
      setNamaProduk("");
      setHargaJual("");
      setHargaModal("");
      Swal.fire({
        icon: "success",
        title: "Berhasil!",
        text: "Produk berhasil ditambahkan!",
      });
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Gagal!",
        text: "Gagal menambahkan produk!",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-8 max-w-lg">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Tambah Produk Baru</h1>
        <Link href="/admin/daftar" className="text-blue-600 hover:underline">
          Lihat Daftar Produk →
        </Link>
      </div>
      <form
        onSubmit={handleSubmit}
        className="space-y-4 bg-white p-8 rounded-lg shadow-md"
      >
        <div>
          <label
            htmlFor="namaProduk"
            className="block text-sm font-medium text-gray-700"
          >
            Nama Produk
          </label>
          <input
            type="text"
            id="namaProduk"
            value={namaProduk}
            onChange={(e) => setNamaProduk(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
            required
          />
        </div>
        <div>
          <label
            htmlFor="hargaJual"
            className="block text-sm font-medium text-gray-700"
          >
            Harga Jual (Rp)
          </label>
          <input
            type="number"
            id="hargaJual"
            value={hargaJual}
            onChange={(e) => setHargaJual(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
            required
          />
        </div>
        <div>
          <label
            htmlFor="hargaModal"
            className="block text-sm font-medium text-gray-700"
          >
            Harga Modal (Rp)
          </label>
          <input
            type="number"
            id="hargaModal"
            value={hargaModal}
            onChange={(e) => setHargaModal(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 px-4 bg-blue-600 text-white font-semibold rounded-md shadow-sm hover:bg-blue-700 disabled:bg-gray-400"
        >
          {loading ? "Menyimpan..." : "Tambah Produk"}
        </button>
      </form>
    </div>
  );
}

export default withAuth(TambahProdukPage, ["admin"]);
