"use client";

import { useState } from "react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Swal from "sweetalert2";
import Modal from "react-modal";

// Definisikan tipe data untuk item di keranjang
export interface CartItem {
  id: string;
  namaProduk: string;
  hargaJual: number;
  hargaModal: number;
  quantity: number;
}

interface CartProps {
  cart: CartItem[];
  onUpdateCart: (newCart: CartItem[]) => void;
}

Modal.setAppElement("body");

export default function Cart({ cart, onUpdateCart }: CartProps) {
  const [modalIsOpen, setModalIsOpen] = useState(false);

  const handleQuantityChange = (productId: string, amount: number) => {
    const newCart = cart.map((item) => {
      if (item.id === productId) {
        return { ...item, quantity: Math.max(1, item.quantity + amount) };
      }
      return item;
    });
    onUpdateCart(newCart);
  };

  const handleDeleteItem = (productId: string) => {
    const newCart = cart.filter((item) => item.id !== productId);
    onUpdateCart(newCart);
  };

  const handleCheckout = async (paymentMethod: "cash" | "qris") => {
    if (cart.length === 0) return;
    closeModal();

    const totalBelanja = cart.reduce(
      (sum, item) => sum + item.hargaJual * item.quantity,
      0
    );
    const totalModal = cart.reduce(
      (sum, item) => sum + item.hargaModal * item.quantity,
      0
    );

    const result = await Swal.fire({
      title: "Konfirmasi Pembayaran",
      html: `
        <p>Metode: <b>${paymentMethod.toUpperCase()}</b></p>
        <p>Total Belanja: <b>Rp ${totalBelanja.toLocaleString("id-ID")}</b></p>
        <p>Yakin ingin melanjutkan transaksi ini?</p>
      `,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Ya, simpan transaksi",
      cancelButtonText: "Batal",
      reverseButtons: true,
    });

    if (!result.isConfirmed) {
      Swal.fire({
        icon: "info",
        title: "Dibatalkan",
        text: "Transaksi dibatalkan.",
        timer: 1500,
        showConfirmButton: false,
      });
      return;
    }

    const transactionData = {
      timestamp: serverTimestamp(),
      paymentMethod, // Simpan metode pembayaran
      totalBelanja,
      totalModal,
      items: cart.map((item) => ({
        productId: item.id,
        namaProduk: item.namaProduk,
        hargaSatuan: item.hargaJual,
        hargaModal: item.hargaModal,
        quantity: item.quantity,
      })),
    };

    try {
      await addDoc(collection(db, "transactions"), transactionData);
      Swal.fire({
        icon: "success",
        title: "Berhasil!",
        text: "Transaksi berhasil disimpan.",
      });
      onUpdateCart([]); // Kosongkan keranjang
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Gagal!",
        text: "Gagal menyimpan transaksi.",
      });
    }
  };

  const openModal = () => setModalIsOpen(true);
  const closeModal = () => setModalIsOpen(false);

  const total = cart.reduce(
    (sum, item) => sum + item.hargaJual * item.quantity,
    0
  );

  return (
    <>
      <div className="w-full md:w-1/3 p-4 bg-gray-50 border-l flex flex-col">
        <h2 className="text-2xl font-bold mb-4">Keranjang</h2>
        <div className="flex-grow overflow-y-auto mb-4">
          {cart.length === 0 ? (
            <p className="text-gray-500 text-center mt-10">
              Keranjang masih kosong.
            </p>
          ) : (
            cart.map((item) => (
              <div
                key={item.id}
                className="flex items-center mb-3 p-2 bg-white rounded-md shadow-sm"
              >
                <div className="flex-grow">
                  <p className="font-semibold">{item.namaProduk}</p>
                  <p className="text-sm text-gray-600">
                    Rp {item.hargaJual.toLocaleString("id-ID")}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleQuantityChange(item.id, -1)}
                    className="bg-gray-200 w-6 h-6 rounded"
                  >
                    -
                  </button>
                  <span>{item.quantity}</span>
                  <button
                    onClick={() => handleQuantityChange(item.id, 1)}
                    className="bg-gray-200 w-6 h-6 rounded"
                  >
                    +
                  </button>
                </div>
                <button
                  onClick={() => handleDeleteItem(item.id)}
                  className="ml-4 text-red-500 hover:text-red-700"
                >
                  &#x1F5D1; {/* Ikon tong sampah */}
                </button>
              </div>
            ))
          )}
        </div>
        <div className="border-t pt-4">
          <div className="flex justify-between items-center text-xl font-bold mb-4">
            <span>Total:</span>
            <span>Rp {total.toLocaleString("id-ID")}</span>
          </div>
          <button
            onClick={openModal}
            disabled={cart.length === 0}
            className="w-full bg-green-500 text-white py-3 rounded-md disabled:bg-gray-400 hover:bg-green-600 transition-colors"
          >
            Pilih Metode Pembayaran
          </button>
        </div>
      </div>

      {/* Modal untuk Metode Pembayaran */}
      <Modal
        isOpen={modalIsOpen}
        onRequestClose={closeModal}
        contentLabel="Metode Pembayaran"
        className="bg-white rounded-lg shadow-xl p-8 max-w-sm mx-auto mt-20"
        overlayClassName="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center"
      >
        <h2 className="text-2xl font-bold mb-6 text-center">
          Pilih Pembayaran
        </h2>
        <div className="space-y-4">
          <button
            onClick={() => handleCheckout("cash")}
            className="w-full py-3 px-4 bg-blue-600 text-white font-semibold rounded-md shadow-sm hover:bg-blue-700"
          >
            Bayar Cash
          </button>
          <button
            onClick={() => handleCheckout("qris")}
            className="w-full py-3 px-4 bg-purple-600 text-white font-semibold rounded-md shadow-sm hover:bg-purple-700"
          >
            Bayar QRIS
          </button>
        </div>
        <button
          onClick={closeModal}
          className="w-full mt-6 text-center text-gray-600 hover:underline"
        >
          Batal
        </button>
      </Modal>
    </>
  );
}
