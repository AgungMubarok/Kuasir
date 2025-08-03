"use client";

import { useState, useEffect, useMemo } from "react";
import {
  collection,
  query,
  orderBy,
  getDocs,
  where,
  getCountFromServer,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  ColumnDef,
  SortingState,
  PaginationState,
} from "@tanstack/react-table";

// Definisikan tipe data produk yang lengkap
interface Product {
  id: string;
  namaProduk: string;
  hargaJual: number;
  hargaModal: number;
}

interface ProductDataTableProps {
  onAddToCart: (product: Product) => void;
}

export default function ProductDataTable({
  onAddToCart,
}: ProductDataTableProps) {
  // State untuk data dan UI
  const [products, setProducts] = useState<Product[]>([]);
  const [isFetching, setIsFetching] = useState(false);

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

      let productQuery = query(collection(db, "products"));
      let countQuery = query(collection(db, "products"));

      // 1. Terapkan Filter/Pencarian (Server-Side)
      if (globalFilter) {
        const endFilterText = globalFilter + "\uf8ff";
        productQuery = query(
          productQuery,
          where("namaProduk_lowercase", ">=", globalFilter),
          where("namaProduk_lowercase", "<=", endFilterText)
        );
        countQuery = query(
          countQuery,
          where("namaProduk_lowercase", ">=", globalFilter),
          where("namaProduk_lowercase", "<=", endFilterText)
        );
      }

      // Hitung total produk yang cocok untuk pagination
      try {
        const snapshot = await getCountFromServer(countQuery);
        const totalProducts = snapshot.data().count;
        setPageCount(Math.ceil(totalProducts / pageSize));
      } catch (error) {
        console.error("Error counting documents: ", error);
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
        productQuery = query(
          productQuery,
          orderBy("namaProduk_lowercase", "asc")
        );
      }

      // 3. Terapkan Pagination (Server-Side)
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

  // Definisi Kolom untuk TanStack Table
  const columns = useMemo<ColumnDef<Product>[]>(
    () => [
      { accessorKey: "namaProduk", header: "Nama Produk", enableSorting: true },
      {
        accessorKey: "hargaJual",
        header: "Harga",
        cell: (info) => `Rp ${info.getValue<number>().toLocaleString("id-ID")}`,
        enableSorting: true,
      },
      {
        id: "aksi",
        header: "Aksi",
        cell: ({ row }) => (
          <button
            onClick={() => onAddToCart(row.original)}
            className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
          >
            Tambah
          </button>
        ),
      },
    ],
    [onAddToCart]
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
    <div className="p-4 w-full flex flex-col h-full bg-white rounded-lg shadow">
      <div className="flex justify-between items-center mb-4">
        <input
          type="text"
          onChange={(e) => setGlobalFilter(e.target.value.toLowerCase())}
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

      <div className="overflow-auto rounded-lg border border-gray-200 flex-grow">
        <table className="w-full text-sm text-left text-gray-700">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50 sticky top-0">
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
    </div>
  );
}
