"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { MultiCartList } from "@/features/cart/components/MultiCartList";
import { useAppSelector } from "@/features/cart/store/hooks";
import { BackButton } from "@/shared/ui/BackButton";

export default function CartPage() {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAppSelector((state) => state.auth.user);
  const isHydrated = useAppSelector((state) => state.auth.isHydrated);
  const loginName = useAppSelector((state) => state.authToken.loginName);
  const isAuthenticated = !!user || loginName === "USER";

  useEffect(() => {
    if (!isHydrated || isAuthenticated) {
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
  }, [isHydrated, isAuthenticated, router, pathname]);

  if (!isHydrated || !isAuthenticated) {
    return null;
  }

  return (
    <section className="page">
      <BackButton href="/" />
      <h1>Multi Cart</h1>
      {/* <p className="page-intro">
        Manage carts by store. View a cart or remove it from your multi-cart list.
      </p> */}
      <MultiCartList />
    </section>
  );
}
