"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { CartDetailApi } from "@/features/cart/components/CartDetailApi";
import { useAppSelector } from "@/features/cart/store/hooks";

export default function CartViewPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const user = useAppSelector((state) => state.auth.user);
  const loginName = useAppSelector((state) => state.authToken.loginName);
  const isAuthenticated = !!user || loginName === "USER";
  const cartId = searchParams.get("cartId") || "";

  useEffect(() => {
    if (isAuthenticated) {
      return;
    }

    const allowRedirect = window.confirm("Please login first to view cart. Go to login now?");
    if (allowRedirect) {
      router.replace(`/auth/login?next=${encodeURIComponent(pathname || "/cart/view")}`);
    } else {
      router.replace("/");
    }
  }, [isAuthenticated, router, pathname]);

  if (!isAuthenticated) {
    return null;
  }

  return (
    <section className="page">
      <h1>Your Cart</h1>
      <p className="page-intro">
        Review selected products, update quantities, and head to checkout when you are ready.
      </p>
      <CartDetailApi cartId={cartId} />
    </section>
  );
}
