"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// HOC ini akan "membungkus" halaman yang ingin dilindungi
const withAuth = (
  WrappedComponent: React.ComponentType,
  allowedRoles: string[]
) => {
  const AuthComponent = (props: any) => {
    const router = useRouter();

    useEffect(() => {
      const userRole = localStorage.getItem("userRole");

      // Jika tidak ada peran (belum login) ATAU perannya tidak diizinkan
      if (!userRole || !allowedRoles.includes(userRole)) {
        router.replace("/login"); // Arahkan paksa ke halaman login
      }
    }, [router]);

    // Jika sudah login dan peran sesuai, tampilkan halamannya
    return <WrappedComponent {...props} />;
  };

  return AuthComponent;
};

export default withAuth;
