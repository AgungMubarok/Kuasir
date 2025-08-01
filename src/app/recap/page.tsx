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
  PaginationState,
} from "@tanstack/react-table";
import Swal from "sweetalert2";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

// --- INTERFACE DATA ---
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
interface AggregatedProduct {
  namaProduk: string;
  totalQuantity: number;
  totalRevenue: number;
}

// --- FUNGSI BANTUAN ---
const formatDateForInput = (date: Date) => {
  if (!date || isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  return `${year}-${month}-${day}`;
};

function RecapPage() {
  // --- STATE ---
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [filter, setFilter] = useState<"daily" | "monthly" | "yearly">("daily");
  const [selectedDate, setSelectedDate] = useState(new Date());

  // State untuk melacak baris mana yang sedang diperluas (expanded)
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  const [{ pageIndex: txPageIndex, pageSize: txPageSize }, setTxPagination] =
    useState<PaginationState>({
      pageIndex: 0,
      pageSize: 5,
    });

  const [
    { pageIndex: productPageIndex, pageSize: productPageSize },
    setProductPagination,
  ] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  // --- FETCH DATA ---
  useEffect(() => {
    const fetchTransactions = async () => {
      const querySnapshot = await getDocs(collection(db, "transactions"));
      const transData = querySnapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() } as Transaction)
      );
      setAllTransactions(transData);
    };
    fetchTransactions();
  }, []);

  // --- LOGIKA UTAMA (FILTER & KALKULASI) ---
  const {
    filteredTransactions,
    grossProfit,
    totalModal,
    netProfit,
    cashTotal,
    qrisTotal,
    hutangTotal,
    aggregatedProducts,
  } = useMemo(() => {
    const filtered = allTransactions.filter((t) => {
      if (!t.timestamp) return false;
      const txDate = t.timestamp.toDate();
      const now = selectedDate;
      if (filter === "daily") {
        const businessDate = new Date(txDate.getTime() - 4 * 60 * 60 * 1000);
        const selectedBusinessDate = new Date(
          now.getTime() - 4 * 60 * 60 * 1000
        );
        return (
          businessDate.toDateString() === selectedBusinessDate.toDateString()
        );
      }
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

    const grossProfit = filtered.reduce((sum, t) => sum + t.totalBelanja, 0);
    const totalModal = filtered.reduce(
      (sum, t) => sum + (t.totalModal || 0),
      0
    );
    const netProfit = grossProfit - totalModal;
    const cashTotal = filtered
      .filter((t) => t.paymentMethod === "cash")
      .reduce((sum, t) => sum + t.totalBelanja, 0);
    const qrisTotal = filtered
      .filter((t) => t.paymentMethod === "qris")
      .reduce((sum, t) => sum + t.totalBelanja, 0);
    const hutangTotal = filtered
      .filter((t) => t.paymentMethod === "hutang")
      .reduce((sum, t) => sum + t.totalBelanja, 0);

    const productSales = new Map<
      string,
      { totalQuantity: number; totalRevenue: number }
    >();
    filtered.forEach((transaction) => {
      if (transaction.items) {
        transaction.items.forEach((item) => {
          const current = productSales.get(item.namaProduk) || {
            totalQuantity: 0,
            totalRevenue: 0,
          };
          current.totalQuantity += item.quantity;
          current.totalRevenue += item.quantity * item.hargaSatuan;
          productSales.set(item.namaProduk, current);
        });
      }
    });
    const aggregatedProducts: AggregatedProduct[] = Array.from(
      productSales.entries()
    )
      .map(([namaProduk, data]) => ({
        namaProduk,
        ...data,
      }))
      .sort((a, b) => b.totalQuantity - a.totalQuantity);

    return {
      filteredTransactions: filtered,
      grossProfit,
      totalModal,
      netProfit,
      cashTotal,
      qrisTotal,
      hutangTotal,
      aggregatedProducts,
    };
  }, [allTransactions, filter, selectedDate]);

  const paginatedTxData = useMemo(() => {
    const start = txPageIndex * txPageSize;
    const end = start + txPageSize;
    return filteredTransactions.slice(start, end);
  }, [filteredTransactions, txPageIndex, txPageSize]);

  const paginatedProductData = useMemo(() => {
    const start = productPageIndex * productPageSize;
    const end = start + productPageSize;
    return aggregatedProducts.slice(start, end);
  }, [aggregatedProducts, productPageIndex, productPageSize]);

  // --- KONFIGURASI TABEL TRANSAKSI (DENGAN FITUR COLLAPSE) ---
  const txColumns = useMemo<ColumnDef<Transaction>[]>(
    () => [
      {
        accessorKey: "timestamp",
        header: "Waktu",
        cell: (info) =>
          info
            .getValue<Timestamp>()
            .toDate()
            .toLocaleString("id-ID", {
              day: "2-digit",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            }),
      },
      {
        accessorKey: "paymentMethod",
        header: "Metode",
        cell: (info) => (
          <span
            className={`px-2 py-1 text-xs font-semibold rounded-full ${
              info.getValue() === "cash"
                ? "bg-blue-200 text-blue-800"
                : info.getValue() === "qris"
                ? "bg-purple-200 text-purple-800"
                : "bg-yellow-200 text-yellow-800"
            }`}
          >
            {String(info.getValue()).toUpperCase()}
          </span>
        ),
      },
      {
        accessorKey: "items",
        header: "Detail Item",
        cell: ({ row }) => {
          const items = row.original.items || [];
          const isExpanded = expandedRows[row.original.id];
          const canCollapse = items.length > 1;

          if (items.length === 0) return "N/A";

          return (
            <div>
              {isExpanded ? (
                <ul className="list-disc list-inside text-xs space-y-1">
                  {items.map((item, i) => (
                    <li key={i}>
                      {item.namaProduk} ({item.quantity}x)
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs">
                  {items[0].namaProduk} ({items[0].quantity}x)
                </p>
              )}
              {canCollapse && (
                <button
                  onClick={() =>
                    setExpandedRows((prev) => ({
                      ...prev,
                      [row.original.id]: !prev[row.original.id],
                    }))
                  }
                  className="text-blue-600 text-xs mt-1 hover:underline font-medium"
                >
                  {isExpanded
                    ? "Sembunyikan"
                    : `+ ${items.length - 1} lainnya...`}
                </button>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "totalBelanja",
        header: "Total",
        cell: (info) => `Rp ${info.getValue<number>().toLocaleString("id-ID")}`,
      },
    ],
    [expandedRows]
  ); // Tambahkan expandedRows sebagai dependency

  const txTable = useReactTable({
    data: paginatedTxData,
    columns: txColumns,
    pageCount: Math.ceil(filteredTransactions.length / txPageSize),
    state: { pagination: { pageIndex: txPageIndex, pageSize: txPageSize } },
    onPaginationChange: setTxPagination,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
  });

  // --- KONFIGURASI TABEL PRODUK TERJUAL ---
  const productColumns = useMemo<ColumnDef<AggregatedProduct>[]>(
    () => [
      { accessorKey: "namaProduk", header: "Nama Produk" },
      {
        accessorKey: "totalQuantity",
        header: "Jml Terjual",
        cell: (info) => `${info.getValue()} pcs`,
      },
      {
        accessorKey: "totalRevenue",
        header: "Pendapatan",
        cell: (info) => `Rp ${info.getValue<number>().toLocaleString("id-ID")}`,
      },
    ],
    []
  );

  const productTable = useReactTable({
    data: paginatedProductData,
    columns: productColumns,
    pageCount: Math.ceil(aggregatedProducts.length / productPageSize),
    state: {
      pagination: { pageIndex: productPageIndex, pageSize: productPageSize },
    },
    onPaginationChange: setProductPagination,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
  });

  // --- FUNGSI HANDLER ---
  const handleFilterTypeChange = (
    newFilter: "daily" | "monthly" | "yearly"
  ) => {
    setFilter(newFilter);
    setTxPagination((prev) => ({ ...prev, pageIndex: 0 }));
    setProductPagination((prev) => ({ ...prev, pageIndex: 0 }));
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dateString = e.target.value;
    if (dateString) {
      const localDate = new Date(dateString.replace(/-/g, "/"));
      setSelectedDate(localDate);
      setTxPagination((prev) => ({ ...prev, pageIndex: 0 }));
      setProductPagination((prev) => ({ ...prev, pageIndex: 0 }));
    }
  };

  const handleExport = () => {
    if (filteredTransactions.length === 0) {
      Swal.fire({
        icon: "info",
        title: "Info",
        text: "Tidak ada data untuk diekspor.",
      });
      return;
    }
    interface SummaryRow {
      "Waktu Transaksi": string;
      "Metode Pembayaran": string;
      "Item Dibeli (Qty)": string;
      "Total Penjualan (Kotor)": number;
      "Total Modal": number;
      "Laba Bersih": number;
      "Total Item": number;
    }
    const transactionSummaryData: SummaryRow[] = filteredTransactions.map(
      (t) => ({
        "Waktu Transaksi": t.timestamp
          .toDate()
          .toLocaleString("id-ID", {
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
    const allItemsData = filteredTransactions.flatMap((t) =>
      t.items.map((item) => ({
        "Waktu Transaksi": t.timestamp
          .toDate()
          .toLocaleString("id-ID", {
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
    transactionSummaryData.push({
      "Waktu Transaksi": "TOTAL",
      "Metode Pembayaran": "",
      "Item Dibeli (Qty)": "",
      "Total Penjualan (Kotor)": grossProfit,
      "Total Modal": totalModal,
      "Laba Bersih": netProfit,
      "Total Item": allItemsData.reduce((sum, item) => sum + item.Kuantitas, 0),
    });
    const wsSummary = XLSX.utils.json_to_sheet(transactionSummaryData);
    const wsItems = XLSX.utils.json_to_sheet(allItemsData);
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
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsSummary, "Ringkasan Transaksi");
    XLSX.utils.book_append_sheet(wb, wsItems, "Detail Item Terjual");
    const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const data = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8",
    });
    const fileName = `Rekap Penjualan - ${formatDateForInput(
      selectedDate
    )}.xlsx`;
    saveAs(data, fileName);
  };

  return (
    <div className="container mx-auto p-8">
      {/* --- Header & Filter --- */}
      <h1 className="text-3xl font-bold mb-6">Rekap Penjualan</h1>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 p-4 bg-white rounded-lg shadow">
        <div className="flex flex-wrap items-center gap-4">
          <button
            onClick={() => handleFilterTypeChange("daily")}
            className={`px-4 py-2 rounded ${
              filter === "daily" ? "bg-blue-600 text-white" : "bg-gray-200"
            }`}
          >
            Harian
          </button>
          <button
            onClick={() => handleFilterTypeChange("monthly")}
            className={`px-4 py-2 rounded ${
              filter === "monthly" ? "bg-blue-600 text-white" : "bg-gray-200"
            }`}
          >
            Bulanan
          </button>
          <button
            onClick={() => handleFilterTypeChange("yearly")}
            className={`px-4 py-2 rounded ${
              filter === "yearly" ? "bg-blue-600 text-white" : "bg-gray-200"
            }`}
          >
            Tahunan
          </button>
          <input
            type="date"
            value={formatDateForInput(selectedDate)}
            onChange={handleDateChange}
            className="p-2 border rounded"
          />
        </div>
        <button
          onClick={handleExport}
          disabled={filteredTransactions.length === 0}
          className="bg-emerald-600 text-white font-bold py-2 px-4 rounded hover:bg-emerald-700 disabled:bg-gray-400"
        >
          Download Excel
        </button>
      </div>

      {/* --- Ringkasan --- */}
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

      {/* --- Dua Tabel Berdampingan --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* --- Tabel Detail Transaksi --- */}
        <div>
          <h2 className="text-2xl font-bold mb-4">Detail Transaksi</h2>
          <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
            <table className="w-full text-sm text-left text-gray-700">
              <thead className="text-xs text-gray-700 uppercase bg-gray-100">
                {txTable.getHeaderGroups().map((hg) => (
                  <tr key={hg.id}>
                    {hg.headers.map((h) => (
                      <th key={h.id} className="px-6 py-3">
                        {flexRender(h.column.columnDef.header, h.getContext())}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {txTable.getRowModel().rows.length > 0 ? (
                  txTable.getRowModel().rows.map((row) => (
                    <tr key={row.id} className="border-b hover:bg-gray-50">
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
                    <td colSpan={txColumns.length} className="text-center p-6">
                      Tidak ada data.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-center gap-2 mt-4">
            <button
              onClick={() => txTable.setPageIndex(0)}
              disabled={!txTable.getCanPreviousPage()}
              className="p-2 border rounded"
            >
              {"<<"}
            </button>
            <button
              onClick={() => txTable.previousPage()}
              disabled={!txTable.getCanPreviousPage()}
              className="p-2 border rounded"
            >
              {"<"}
            </button>
            <span className="gap-1">
              Hal <strong>{txPageIndex + 1}</strong> dari{" "}
              <strong>{txTable.getPageCount()}</strong>
            </span>
            <button
              onClick={() => txTable.nextPage()}
              disabled={!txTable.getCanNextPage()}
              className="p-2 border rounded"
            >
              {">"}
            </button>
            <button
              onClick={() => txTable.setPageIndex(txTable.getPageCount() - 1)}
              disabled={!txTable.getCanNextPage()}
              className="p-2 border rounded"
            >
              {">>"}
            </button>
          </div>
        </div>

        {/* --- Tabel Produk Terjual --- */}
        <div>
          <h2 className="text-2xl font-bold mb-4">Ringkasan Produk Terjual</h2>
          <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
            <table className="w-full text-sm text-left text-gray-700">
              <thead className="text-xs text-gray-700 uppercase bg-gray-100">
                {productTable.getHeaderGroups().map((hg) => (
                  <tr key={hg.id}>
                    {hg.headers.map((h) => (
                      <th key={h.id} className="px-6 py-3">
                        {flexRender(h.column.columnDef.header, h.getContext())}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {productTable.getRowModel().rows.length > 0 ? (
                  productTable.getRowModel().rows.map((row) => (
                    <tr key={row.id} className="border-b hover:bg-gray-50">
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
                      colSpan={productColumns.length}
                      className="text-center p-6"
                    >
                      Tidak ada data.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-center gap-2 mt-4">
            <button
              onClick={() => productTable.setPageIndex(0)}
              disabled={!productTable.getCanPreviousPage()}
              className="p-2 border rounded"
            >
              {"<<"}
            </button>
            <button
              onClick={() => productTable.previousPage()}
              disabled={!productTable.getCanPreviousPage()}
              className="p-2 border rounded"
            >
              {"<"}
            </button>
            <span className="gap-1">
              Hal <strong>{productPageIndex + 1}</strong> dari{" "}
              <strong>{productTable.getPageCount()}</strong>
            </span>
            <button
              onClick={() => productTable.nextPage()}
              disabled={!productTable.getCanNextPage()}
              className="p-2 border rounded"
            >
              {">"}
            </button>
            <button
              onClick={() =>
                productTable.setPageIndex(productTable.getPageCount() - 1)
              }
              disabled={!productTable.getCanNextPage()}
              className="p-2 border rounded"
            >
              {">>"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default withAuth(RecapPage, ["admin"]);
