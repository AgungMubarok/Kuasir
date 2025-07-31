"use client";

import { useState, useEffect, useMemo } from "react";
import { collection, getDocs, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import withAuth from "@/hooks/withAuth";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  ColumnDef,
} from "@tanstack/react-table";
import Swal from "sweetalert2";

// Import library untuk Excel
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

// Definisikan tipe data untuk transaksi
interface TransactionItem {
  namaProduk: string;
  hargaSatuan: number;
  hargaModal: number;
  quantity: number;
}
interface Transaction {
  id: string;
  totalBelanja: number;
  totalModal: number;
  timestamp: Timestamp;
  items: TransactionItem[];
  paymentMethod: "cash" | "qris" | "hutang";
}

const formatDateForInput = (date: Date) => {
  const year = date.getFullYear();
  // getMonth() 0-indexed, jadi tambah 1. padStart memastikan ada 2 digit (misal: 07)
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  return `${year}-${month}-${day}`;
};

function RecapPage() {
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [filter, setFilter] = useState<"daily" | "monthly" | "yearly">("daily");
  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => {
    const fetchTransactions = async () => {
      const querySnapshot = await getDocs(collection(db, "transactions"));
      const transData = querySnapshot.docs.map(
        (doc) =>
          ({
            id: doc.id,
            ...doc.data(),
          } as Transaction)
      );
      setAllTransactions(transData);
    };
    fetchTransactions();
  }, []);

  const {
    filteredTransactions,
    grossProfit,
    totalModal,
    netProfit,
    cashTotal,
    qrisTotal,
    hutangTotal,
  } = useMemo(() => {
    const filtered = allTransactions.filter((t) => {
      if (!t.timestamp) return false;
      const txDate = t.timestamp.toDate();
      const now = selectedDate;

      // Logika untuk filter harian diubah di sini
      if (filter === "daily") {
        // --- PERUBAHAN DI SINI ---
        // Buat tanggal "bisnis" dengan mengurangi 4 jam dari waktu transaksi
        const businessDate = new Date(txDate.getTime() - 4 * 60 * 60 * 1000);

        // Lakukan hal yang sama untuk tanggal yang dipilih di kalender agar perbandingannya adil
        const selectedBusinessDate = new Date(
          now.getTime() - 4 * 60 * 60 * 1000
        );

        // Bandingkan tanggal "bisnis" nya
        return (
          businessDate.toDateString() === selectedBusinessDate.toDateString()
        );
      }

      // Logika untuk bulanan dan tahunan tidak perlu diubah
      if (filter === "monthly") {
        return (
          txDate.getMonth() === now.getMonth() &&
          txDate.getFullYear() === now.getFullYear()
        );
      }
      if (filter === "yearly") {
        return txDate.getFullYear() === now.getFullYear();
      }
      return false;
    });
    // Kalkulasi Grand Total
    const grossProfit = filtered.reduce((sum, t) => sum + t.totalBelanja, 0);
    const totalModal = filtered.reduce(
      (sum, t) => sum + (t.totalModal || 0),
      0
    );
    const netProfit = grossProfit - totalModal;

    // Kalkulasi per Metode Pembayaran
    const cashTotal = filtered
      .filter((t) => t.paymentMethod === "cash")
      .reduce((sum, t) => sum + t.totalBelanja, 0);
    const qrisTotal = filtered
      .filter((t) => t.paymentMethod === "qris")
      .reduce((sum, t) => sum + t.totalBelanja, 0);
    const hutangTotal = filtered
      .filter((t) => t.paymentMethod === "hutang")
      .reduce((sum, t) => sum + t.totalBelanja, 0);

    return {
      filteredTransactions: filtered,
      grossProfit,
      totalModal,
      netProfit,
      cashTotal,
      qrisTotal,
      hutangTotal,
    };
  }, [allTransactions, filter, selectedDate]);

  const columns = useMemo<ColumnDef<Transaction>[]>(
    () => [
      {
        accessorKey: "timestamp",
        header: "Waktu Transaksi",
        cell: (info) =>
          info.getValue<Timestamp>().toDate().toLocaleString("id-ID"),
      },
      {
        accessorKey: "items",
        header: "Detail Item",
        cell: (info) =>
          info
            .getValue<TransactionItem[]>()
            ?.map((item) => item.namaProduk)
            .join(", ") || "N/A",
      },
      {
        accessorKey: "totalBelanja",
        header: "Total",
        cell: (info) => `Rp ${info.getValue<number>().toLocaleString("id-ID")}`,
      },
    ],
    []
  );

  const table = useReactTable({
    data: filteredTransactions,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const handleExport = () => {
    if (filteredTransactions.length === 0) {
      Swal.fire({
        icon: "info",
        title: "Info",
        text: "Tidak ada data untuk diekspor.",
      });
      return;
    }

    // Definisikan tipe data untuk rekap agar TypeScript tidak error
    interface SummaryRow {
      "Waktu Transaksi": string;
      "Metode Pembayaran": string;
      "Item Dibeli (Qty)": string;
      "Total Penjualan (Kotor)": number;
      "Total Modal": number;
      "Laba Bersih": number;
      "Total Item": number;
    }

    // 1. Siapkan data untuk Sheet 1: Ringkasan Transaksi
    const transactionSummaryData: SummaryRow[] = filteredTransactions.map(
      (t) => ({
        "Waktu Transaksi": t.timestamp.toDate().toLocaleString("id-ID", {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
        "Metode Pembayaran": t.paymentMethod.toUpperCase(),
        "Item Dibeli (Qty)": t.items
          .map((item) => `${item.namaProduk} (${item.quantity})`)
          .join(", "),
        "Total Penjualan (Kotor)": t.totalBelanja,
        "Total Modal": t.totalModal || 0,
        "Laba Bersih": t.totalBelanja - (t.totalModal || 0),
        "Total Item": t.items.reduce((sum, item) => sum + item.quantity, 0),
      })
    );

    // 2. Siapkan data untuk Sheet 2: Detail Semua Item
    const allItemsData = filteredTransactions.flatMap((t) =>
      t.items.map((item) => ({
        "Waktu Transaksi": t.timestamp.toDate().toLocaleString("id-ID", {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
        "Metode Pembayaran": t.paymentMethod.toUpperCase(),
        "Nama Produk": item.namaProduk,
        Kuantitas: item.quantity,
        "Harga Jual Satuan": item.hargaSatuan,
        "Harga Modal Satuan": item.hargaModal || 0,
      }))
    );

    // 3. Tambahkan baris total
    transactionSummaryData.push({
      "Waktu Transaksi": "TOTAL",
      "Metode Pembayaran": "",
      "Item Dibeli (Qty)": "",
      "Total Penjualan (Kotor)": grossProfit,
      "Total Modal": totalModal,
      "Laba Bersih": netProfit,
      "Total Item": allItemsData.reduce((sum, item) => sum + item.Kuantitas, 0),
    });

    // 4. Buat Worksheet dari data
    const wsSummary = XLSX.utils.json_to_sheet(transactionSummaryData);
    const wsItems = XLSX.utils.json_to_sheet(allItemsData);

    // Atur lebar kolom agar lebih mudah dibaca
    wsSummary["!cols"] = [
      { wch: 20 },
      { wch: 18 },
      { wch: 50 },
      { wch: 20 },
      { wch: 20 },
      { wch: 20 },
      { wch: 15 },
    ];
    wsItems["!cols"] = [
      { wch: 20 },
      { wch: 18 },
      { wch: 30 },
      { wch: 10 },
      { wch: 20 },
      { wch: 20 },
    ];

    // 5. Buat Workbook dan tambahkan kedua sheet
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsSummary, "Ringkasan Transaksi");
    XLSX.utils.book_append_sheet(wb, wsItems, "Detail Item Terjual");

    // 6. Generate file .xlsx dan trigger download
    const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const data = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8",
    });

    const fileName = `Rekap Penjualan - ${
      selectedDate.toISOString().split("T")[0]
    }.xlsx`;
    saveAs(data, fileName);
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dateString = e.target.value;
    if (dateString) {
      const localDate = new Date(dateString.replace(/-/g, "/"));
      setSelectedDate(localDate);
    }
  };

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">Rekap Penjualan</h1>
      <div className="flex flex-wrap items-center gap-4 mb-6 p-4 bg-white rounded-lg shadow">
        <div className="flex flex-wrap items-center gap-4">
          <button
            onClick={() => setFilter("daily")}
            className={`px-4 py-2 rounded ${
              filter === "daily" ? "bg-blue-600 text-white" : "bg-gray-200"
            }`}
          >
            Harian
          </button>
          <button
            onClick={() => setFilter("monthly")}
            className={`px-4 py-2 rounded ${
              filter === "monthly" ? "bg-blue-600 text-white" : "bg-gray-200"
            }`}
          >
            Bulanan
          </button>
          <button
            onClick={() => setFilter("yearly")}
            className={`px-4 py-2 rounded ${
              filter === "yearly" ? "bg-blue-600 text-white" : "bg-gray-200"
            }`}
          >
            Tahunan
          </button>
        </div>

        {/* --- PERBAIKAN 2: Tambahkan pengecekan sebelum memanggil .toISOString() --- */}
        <input
          type="date"
          value={selectedDate ? formatDateForInput(selectedDate) : ""}
          onChange={handleDateChange}
          className="p-2 border rounded"
        />
        <button
          onClick={handleExport}
          disabled={filteredTransactions.length === 0}
          className="bg-emerald-600 text-white font-bold py-2 px-4 rounded hover:bg-emerald-700 disabled:bg-gray-400"
        >
          Download Excel
        </button>
      </div>
      <h2 className="text-xl font-semibold mb-4 text-gray-700">
        Ringkasan Metode Pembayaran
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-blue-100 border-l-4 border-blue-500 p-6 rounded-lg shadow-lg">
          <p className="font-semibold text-blue-800">Total Cash</p>
          <p className="text-3xl font-bold mt-2 text-blue-900">
            Rp {cashTotal.toLocaleString("id-ID")}
          </p>
        </div>
        <div className="bg-purple-100 border-l-4 border-purple-500 p-6 rounded-lg shadow-lg">
          <p className="font-semibold text-purple-800">Total QRIS</p>
          <p className="text-3xl font-bold mt-2 text-purple-900">
            Rp {qrisTotal.toLocaleString("id-ID")}
          </p>
        </div>
        <div className="bg-yellow-100 border-l-4 border-yellow-500 p-6 rounded-lg shadow-lg">
          <p className="font-semibold text-yellow-800">Total Hutang</p>
          <p className="text-3xl font-bold mt-2 text-yellow-900">
            Rp {hutangTotal.toLocaleString("id-ID")}
          </p>
        </div>
      </div>

      <h2 className="text-xl font-semibold mb-4 text-gray-700">
        Ringkasan Profit
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gray-100 p-6 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-800">Laba Kotor</p>
          <p className="text-3xl font-bold mt-2 text-gray-900">
            Rp {grossProfit.toLocaleString("id-ID")}
          </p>
        </div>
        <div className="bg-red-100 p-6 rounded-lg shadow-lg">
          <p className="font-semibold text-red-800">Total Modal</p>
          <p className="text-3xl font-bold mt-2 text-red-900">
            Rp {totalModal.toLocaleString("id-ID")}
          </p>
        </div>
        <div className="bg-green-100 p-6 rounded-lg shadow-lg">
          <p className="font-semibold text-green-800">Laba Bersih</p>
          <p className="text-3xl font-bold mt-2 text-green-900">
            Rp {netProfit.toLocaleString("id-ID")}
          </p>
        </div>
      </div>

      <h2 className="text-2xl font-bold mb-4">Detail Transaksi</h2>
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        {/* ... Tabel tidak berubah ... */}
        <table className="w-full text-sm text-left text-gray-700">
          <thead className="text-xs text-gray-700 uppercase bg-gray-100">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th key={header.id} scope="col" className="px-6 py-3">
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext()
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="bg-white border-b hover:bg-gray-50">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-6 py-4">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={columns.length}
                  className="text-center p-6 text-gray-500"
                >
                  Tidak ada data transaksi untuk periode ini.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default withAuth(RecapPage, ["admin"]);
