"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { MultiCartList } from "@/features/cart/components/MultiCartList";
import { useAppSelector } from "@/features/cart/store/hooks";

export default function CartPage() {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAppSelector((state) => state.auth.user);
  const loginName = useAppSelector((state) => state.authToken.loginName);
  const isAuthenticated = !!user || loginName === "USER";

  useEffect(() => {
    if (isAuthenticated) {
      return;
    }

    const allowRedirect = window.confirm(
      "Please login first to view cart. Go to login now?",
    );
    if (allowRedirect) {
      router.replace(
        `/auth/login?next=${encodeURIComponent(pathname || "/cart")}`,
      );
    } else {
      router.replace("/");
    }
  }, [isAuthenticated, router, pathname]);

  if (!isAuthenticated) {
    return null;
  }

  return (
    <section className="page">
      <h1>Multi Cart</h1>
      {/* <p className="page-intro">
        Manage carts by store. View a cart or remove it from your multi-cart list.
      </p> */}
      <MultiCartList />
    </section>
  );
}
