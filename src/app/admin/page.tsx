import { redirect } from "next/navigation";

export default function AdminRootPage() {
  // Arahkan pengguna langsung ke halaman daftar produk secara default
  redirect("/admin/daftar");
}
