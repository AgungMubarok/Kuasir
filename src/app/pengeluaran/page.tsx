"use client";

import { useState, useEffect, useMemo } from "react";
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  where,
  Timestamp,
  doc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import withAuth from "@/hooks/withAuth";
import Swal from "sweetalert2";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  ColumnDef,
  PaginationState,
} from "@tanstack/react-table";
import Modal from "react-modal";

// Definisikan tipe data untuk pengeluaran
interface Expense {
  id: string;
  description: string;
  amount: number;
  timestamp: Timestamp;
}

// Atur elemen root untuk modal
Modal.setAppElement("body");

function PengeluaranPage() {
  // State untuk form
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

  // State untuk tabel
  const [dailyExpenses, setDailyExpenses] = useState<Expense[]>([]);
  const [{ pageIndex, pageSize }, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  // State untuk modal edit
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);

  // Mengambil data pengeluaran HARI INI secara real-time
  useEffect(() => {
    // Tentukan rentang waktu "hari bisnis" (dari jam 4 pagi ini sampai jam 4 pagi besok)
    const now = new Date();
    const businessDate = new Date(now.getTime() - 4 * 60 * 60 * 1000);

    const startOfDay = new Date(
      businessDate.getFullYear(),
      businessDate.getMonth(),
      businessDate.getDate(),
      4,
      0,
      0
    );
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

    const q = query(
      collection(db, "expenses"),
      where("timestamp", ">=", startOfDay),
      where("timestamp", "<", endOfDay),
      orderBy("timestamp", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const expensesData = snapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() } as Expense)
      );
      setDailyExpenses(expensesData);
    });
    return () => unsubscribe();
  }, []);

  // Fungsi untuk menambah pengeluaran
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !amount) {
      return Swal.fire({
        icon: "warning",
        title: "Oops...",
        text: "Harap isi semua kolom!",
      });
    }
    setLoading(true);
    try {
      await addDoc(collection(db, "expenses"), {
        description,
        amount: Number(amount),
        timestamp: new Date(),
      });
      setDescription("");
      setAmount("");
      Swal.fire({
        icon: "success",
        title: "Berhasil!",
        text: "Pengeluaran berhasil dicatat.",
      });
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Gagal!",
        text: "Gagal mencatat pengeluaran.",
      });
    } finally {
      setLoading(false);
    }
  };

  // Fungsi untuk Edit & Hapus
  const openEditModal = (expense: Expense) => {
    setSelectedExpense(expense);
    setModalIsOpen(true);
  };
  const closeEditModal = () => {
    setModalIsOpen(false);
    setSelectedExpense(null);
  };
  const handleUpdateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExpense) return;
    try {
      const expenseRef = doc(db, "expenses", selectedExpense.id);
      await updateDoc(expenseRef, {
        description: selectedExpense.description,
        amount: Number(selectedExpense.amount),
      });
      Swal.fire("Sukses!", "Pengeluaran berhasil diperbarui.", "success");
      closeEditModal();
    } catch (error) {
      Swal.fire("Gagal!", "Gagal memperbarui pengeluaran.", "error");
    }
  };
  const handleDeleteExpense = (expenseId: string) => {
    Swal.fire({
      title: "Apakah Anda yakin?",
      text: "Data yang dihapus tidak dapat dikembalikan!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonText: "Batal",
      confirmButtonText: "Ya, hapus!",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await deleteDoc(doc(db, "expenses", expenseId));
          Swal.fire("Terhapus!", "Pengeluaran berhasil dihapus.", "success");
        } catch (error) {
          Swal.fire("Gagal!", "Gagal menghapus pengeluaran.", "error");
        }
      }
    });
  };

  // Konfigurasi tabel pengeluaran
  const columns = useMemo<ColumnDef<Expense>[]>(
    () => [
      {
        accessorKey: "timestamp",
        header: "Waktu",
        cell: (info) =>
          info
            .getValue<Timestamp>()
            .toDate()
            .toLocaleTimeString("id-ID", {
              hour: "2-digit",
              minute: "2-digit",
            }),
      },
      { accessorKey: "description", header: "Keterangan" },
      {
        accessorKey: "amount",
        header: "Jumlah",
        cell: (info) => `Rp ${info.getValue<number>().toLocaleString("id-ID")}`,
      },
      {
        id: "aksi",
        header: "Aksi",
        cell: ({ row }) => (
          <div className="flex space-x-2">
            <button
              onClick={() => openEditModal(row.original)}
              className="text-yellow-600 hover:underline"
            >
              Edit
            </button>
            <button
              onClick={() => handleDeleteExpense(row.original.id)}
              className="text-red-600 hover:underline"
            >
              Hapus
            </button>
          </div>
        ),
      },
    ],
    []
  );

  const paginatedData = useMemo(() => {
    const start = pageIndex * pageSize;
    const end = start + pageSize;
    return dailyExpenses.slice(start, end);
  }, [dailyExpenses, pageIndex, pageSize]);

  const table = useReactTable({
    data: paginatedData,
    columns,
    pageCount: Math.ceil(dailyExpenses.length / pageSize),
    state: { pagination: { pageIndex, pageSize } },
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
  });

  return (
    <div className="container mx-auto p-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Kolom Kiri: Form Tambah Pengeluaran */}
        <div className="lg:col-span-1">
          <h1 className="text-3xl font-bold mb-6">Catat Pengeluaran</h1>
          <form
            onSubmit={handleSubmit}
            className="space-y-4 bg-white p-8 rounded-lg shadow-md"
          >
            <div>
              <label
                htmlFor="description"
                className="block text-sm font-medium text-gray-700"
              >
                Keterangan
              </label>
              <input
                type="text"
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g., Bayar Listrik"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                required
              />
            </div>
            <div>
              <label
                htmlFor="amount"
                className="block text-sm font-medium text-gray-700"
              >
                Jumlah (Rp)
              </label>
              <input
                type="number"
                id="amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g., 500000"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-blue-600 text-white font-semibold rounded-md shadow-sm hover:bg-blue-700 disabled:bg-gray-400"
            >
              {loading ? "Menyimpan..." : "Simpan Pengeluaran"}
            </button>
          </form>
        </div>

        {/* Kolom Kanan: Daftar Pengeluaran Hari Ini */}
        <div className="lg:col-span-2">
          <h2 className="text-2xl font-bold mb-6">
            Riwayat Pengeluaran Hari Ini
          </h2>
          <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
            <table className="w-full text-sm text-left text-gray-700">
              <thead className="text-xs text-gray-700 uppercase bg-gray-100">
                {table.getHeaderGroups().map((hg) => (
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
                {table.getRowModel().rows.length > 0 ? (
                  table.getRowModel().rows.map((row) => (
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
                    <td colSpan={columns.length} className="text-center p-6">
                      Belum ada pengeluaran hari ini.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-center gap-2 mt-4">
            <button
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
              className="p-2 border rounded"
            >
              {"<<"}
            </button>
            <button
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="p-2 border rounded"
            >
              {"<"}
            </button>
            <span className="gap-1">
              Hal <strong>{pageIndex + 1}</strong> dari{" "}
              <strong>{table.getPageCount()}</strong>
            </span>
            <button
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="p-2 border rounded"
            >
              {">"}
            </button>
            <button
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
              className="p-2 border rounded"
            >
              {">>"}
            </button>
          </div>
        </div>
      </div>

      {/* Modal untuk Edit Pengeluaran */}
      <Modal
        isOpen={modalIsOpen}
        onRequestClose={closeEditModal}
        contentLabel="Edit Pengeluaran"
        className="bg-white rounded-lg shadow-xl p-8 max-w-lg mx-auto mt-20"
        overlayClassName="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center"
      >
        {selectedExpense && (
          <form onSubmit={handleUpdateExpense}>
            <h2 className="text-2xl font-bold mb-6">Edit Pengeluaran</h2>
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="editDescription"
                  className="block text-sm font-medium text-gray-700"
                >
                  Keterangan
                </label>
                <input
                  type="text"
                  id="editDescription"
                  value={selectedExpense.description}
                  onChange={(e) =>
                    setSelectedExpense({
                      ...selectedExpense,
                      description: e.target.value,
                    })
                  }
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label
                  htmlFor="editAmount"
                  className="block text-sm font-medium text-gray-700"
                >
                  Jumlah (Rp)
                </label>
                <input
                  type="number"
                  id="editAmount"
                  value={selectedExpense.amount}
                  onChange={(e) =>
                    setSelectedExpense({
                      ...selectedExpense,
                      amount: Number(e.target.value),
                    })
                  }
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-4">
              <button
                type="button"
                onClick={closeEditModal}
                className="bg-gray-200 text-gray-800 px-4 py-2 rounded-md"
              >
                Batal
              </button>
              <button
                type="submit"
                className="bg-blue-600 text-white px-4 py-2 rounded-md"
              >
                Simpan Perubahan
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}

export default withAuth(PengeluaranPage, ["admin", "cashier"]);
