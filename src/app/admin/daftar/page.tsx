"use client";

import { useState, useEffect, useMemo } from "react";
import {
  collection,
  query,
  orderBy,
  getDocs,
  where,
  doc,
  updateDoc,
  deleteDoc,
  getCountFromServer,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import withAuth from "@/hooks/withAuth";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  ColumnDef,
  SortingState,
  PaginationState,
} from "@tanstack/react-table";
import Link from "next/link";
import Modal from "react-modal";
import Swal from "sweetalert2";

// Definisikan tipe data untuk produk
interface Product {
  id: string;
  namaProduk: string;
  hargaJual: number;
  hargaModal: number;
}

// Atur elemen root untuk modal (untuk aksesibilitas)
Modal.setAppElement("body");

function DaftarProdukPage() {
  // State untuk data dan UI
  const [products, setProducts] = useState<Product[]>([]);
  const [isFetching, setIsFetching] = useState(false);

  // State untuk Edit Modal
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // State untuk Server-Side Processing
  const [globalFilter, setGlobalFilter] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [{ pageIndex, pageSize }, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [pageCount, setPageCount] = useState(0);

  // Fetch data dari Firestore dengan logika server-side
  useEffect(() => {
    const fetchData = async () => {
      setIsFetching(true);

      // Query dasar
      let productQuery = query(collection(db, "products"));
      let countQuery = query(collection(db, "products"));

      // 1. Terapkan Filter/Pencarian (Server-Side)
      if (globalFilter) {
        const endFilterText = globalFilter + "\uf8ff";
        productQuery = query(
          productQuery,
          where("namaProduk", ">=", globalFilter),
          where("namaProduk", "<=", endFilterText)
        );
        countQuery = query(
          countQuery,
          where("namaProduk", ">=", globalFilter),
          where("namaProduk", "<=", endFilterText)
        );
      }

      // Hitung total produk yang cocok untuk pagination
      try {
        const snapshot = await getCountFromServer(countQuery);
        const totalProducts = snapshot.data().count;
        setPageCount(Math.ceil(totalProducts / pageSize));
      } catch (error) {
        console.error("Error counting documents: ", error);
        // Jika gagal menghitung, fallback ke 0
        setPageCount(0);
      }

      // 2. Terapkan Sorting (Server-Side)
      if (sorting.length > 0) {
        const sortConfig = sorting[0];
        productQuery = query(
          productQuery,
          orderBy(sortConfig.id, sortConfig.desc ? "desc" : "asc")
        );
      } else {
        // Default sort jika tidak ada sorting yang dipilih
        productQuery = query(productQuery, orderBy("namaProduk", "asc"));
      }

      // 3. Terapkan Pagination (Server-Side)
      // Ini adalah simplifikasi. Untuk data sangat besar (>100rb), arsitektur cursor dengan startAfter/endBefore lebih direkomendasikan.
      // Untuk saat ini, kita fetch semua yang terfilter lalu slice di client sebagai kompromi.
      const querySnapshot = await getDocs(productQuery);
      const allFilteredProducts = querySnapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() } as Product)
      );
      const offset = pageIndex * pageSize;
      setProducts(allFilteredProducts.slice(offset, offset + pageSize));

      setIsFetching(false);
    };

    fetchData();
  }, [pageIndex, pageSize, globalFilter, sorting]);

  // Fungsi untuk membuka modal edit
  const openEditModal = (product: Product) => {
    setSelectedProduct(product);
    setModalIsOpen(true);
  };

  // Fungsi untuk menutup modal edit
  const closeEditModal = () => {
    setModalIsOpen(false);
    setSelectedProduct(null);
  };

  // Fungsi untuk mengirim data update produk
  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    const productRef = doc(db, "products", selectedProduct.id);
    try {
      await updateDoc(productRef, {
        namaProduk: selectedProduct.namaProduk,
        hargaJual: Number(selectedProduct.hargaJual),
        hargaModal: Number(selectedProduct.hargaModal),
      });
      Swal.fire({
        icon: "success",
        title: "Berhasil!",
        text: "Produk berhasil diperbarui.",
      });
      closeEditModal();
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Gagal!",
        text: "Gagal memperbarui produk.",
      });
    }
  };

  // Fungsi untuk menghapus produk
  const handleDeleteProduct = (productId: string) => {
    Swal.fire({
      title: "Apakah Anda yakin?",
      text: "Produk yang dihapus tidak dapat dikembalikan!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Ya, hapus!",
      cancelButtonText: "Batal",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await deleteDoc(doc(db, "products", productId));
          Swal.fire("Terhapus!", "Produk berhasil dihapus.", "success");
        } catch (error) {
          Swal.fire("Gagal!", "Gagal menghapus produk.", "error");
        }
      }
    });
  };

  // Definisi Kolom untuk TanStack Table
  const columns = useMemo<ColumnDef<Product>[]>(
    () => [
      { accessorKey: "namaProduk", header: "Nama Produk", enableSorting: true },
      {
        accessorKey: "hargaJual",
        header: "Harga Jual",
        cell: (info) => `Rp ${info.getValue<number>().toLocaleString("id-ID")}`,
        enableSorting: true,
      },
      {
        accessorKey: "hargaModal",
        header: "Harga Modal",
        cell: (info) => `Rp ${info.getValue<number>().toLocaleString("id-ID")}`,
        enableSorting: true,
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
              onClick={() => handleDeleteProduct(row.original.id)}
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

  // Inisialisasi React Table
  const table = useReactTable({
    data: products,
    columns,
    pageCount,
    state: { sorting, pagination: { pageIndex, pageSize } },
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="container mx-auto p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Daftar Produk</h1>
        <Link
          href="/admin/tambah"
          className="bg-blue-600 text-white font-bold py-2 px-4 rounded hover:bg-blue-700"
        >
          + Tambah Produk
        </Link>
      </div>

      <div className="flex justify-between items-center mb-4">
        <input
          type="text"
          onChange={(e) => setGlobalFilter(e.target.value)}
          placeholder="Cari produk..."
          className="p-2 border border-gray-300 rounded-md w-full md:w-1/2"
        />
        <select
          value={table.getState().pagination.pageSize}
          onChange={(e) => {
            table.setPageSize(Number(e.target.value));
          }}
          className="p-2 border border-gray-300 rounded-md"
        >
          {[10, 20, 30, 50].map((size) => (
            <option key={size} value={size}>
              Tampil {size}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-auto rounded-lg border border-gray-200 bg-white h-[60vh]">
        <table className="w-full text-sm text-left text-gray-700">
          <thead className="text-xs text-gray-700 uppercase bg-gray-100 sticky top-0">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    scope="col"
                    className="px-6 py-3 cursor-pointer"
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext()
                    )}
                    {{ asc: " 🔼", desc: " 🔽" }[
                      header.column.getIsSorted() as string
                    ] ?? ""}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {isFetching ? (
              <tr>
                <td colSpan={columns.length} className="text-center p-4">
                  Memuat data...
                </td>
              </tr>
            ) : (
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
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-center gap-2 mt-4">
        <button
          onClick={() => table.setPageIndex(0)}
          disabled={!table.getCanPreviousPage()}
          className="px-2 py-1 border rounded"
        >
          {"<<"}
        </button>
        <button
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
          className="px-2 py-1 border rounded"
        >
          {"<"}
        </button>
        <span className="flex items-center gap-1">
          <div>Halaman</div>
          <strong>
            {table.getState().pagination.pageIndex + 1} dari{" "}
            {table.getPageCount()}
          </strong>
        </span>
        <button
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
          className="px-2 py-1 border rounded"
        >
          {">"}
        </button>
        <button
          onClick={() => table.setPageIndex(table.getPageCount() - 1)}
          disabled={!table.getCanNextPage()}
          className="px-2 py-1 border rounded"
        >
          {">>"}
        </button>
      </div>

      <Modal
        isOpen={modalIsOpen}
        onRequestClose={closeEditModal}
        contentLabel="Edit Produk"
        className="bg-white rounded-lg shadow-xl p-8 max-w-lg mx-auto mt-20"
        overlayClassName="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center"
      >
        {selectedProduct && (
          <form onSubmit={handleUpdateProduct}>
            <h2 className="text-2xl font-bold mb-6">Edit Produk</h2>
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="editNamaProduk"
                  className="block text-sm font-medium text-gray-700"
                >
                  Nama Produk
                </label>
                <input
                  type="text"
                  id="editNamaProduk"
                  value={selectedProduct.namaProduk}
                  onChange={(e) =>
                    setSelectedProduct({
                      ...selectedProduct,
                      namaProduk: e.target.value,
                    })
                  }
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label
                  htmlFor="editHargaJual"
                  className="block text-sm font-medium text-gray-700"
                >
                  Harga Jual
                </label>
                <input
                  type="number"
                  id="editHargaJual"
                  value={selectedProduct.hargaJual}
                  onChange={(e) =>
                    setSelectedProduct({
                      ...selectedProduct,
                      hargaJual: Number(e.target.value),
                    })
                  }
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label
                  htmlFor="editHargaModal"
                  className="block text-sm font-medium text-gray-700"
                >
                  Harga Modal <span className="text-gray-400">(Opsional)</span>
                </label>
                <input
                  type="number"
                  id="editHargaModal"
                  value={selectedProduct.hargaModal || ""}
                  onChange={(e) =>
                    setSelectedProduct({
                      ...selectedProduct,
                      hargaModal: Number(e.target.value),
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

export default withAuth(DaftarProdukPage, ["admin"]);
