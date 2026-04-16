"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { getCartLengthWeb } from "@/api";
import { AppNoticeType } from "@/shared/lib/notify";
import { useAppDispatch, useAppSelector } from "@/features/cart/store/hooks";
import { useLocation } from "@/features/location/context/location-context";
import {
  setCartLength,
} from "@/redux/slices";
import { LocationPickerModal } from "@/features/location/components/LocationPickerModal";

export function AppHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const dispatch = useAppDispatch();
  const apiCartCount = useAppSelector((state) => state.apiResponse.cartLength);
  const loginName = useAppSelector((state) => state.authToken.loginName);
  const user = useAppSelector((state) => state.auth.user);
  const isAuthenticated = !!user || loginName === "USER";
  const { location, isResolving } = useLocation();
  const [locationPickerOpen, setLocationPickerOpen] = useState(false);
  const [navSearch, setNavSearch] = useState("");
  const [notice, setNotice] = useState<{ open: boolean; message: string; type: AppNoticeType }>({
    open: false,
    message: "",
    type: "error",
  });
  const cartCount = Math.max(0, Number(apiCartCount || 0));
  const currentQuery = searchParams?.toString();
  const nextPath = currentQuery ? `${pathname}?${currentQuery}` : pathname;

  const locationLabel = location
    ? `${location.city}, ${location.pincode}`
    : isResolving
      ? "Detecting location..."
      : "Choose location";
  const displayName = user?.name?.trim() || user?.mobileNumber || (loginName === "USER" ? "User" : null);
  const avatarLabel = displayName ? displayName.charAt(0).toUpperCase() : "U";
  const avatarImg = user?.profilePic?.trim() || "";

  function handleCartClick(event: React.MouseEvent<HTMLAnchorElement>) {
    if (isAuthenticated) {
      return;
    }

    event.preventDefault();
    const allowRedirect = window.confirm("Please login first to view cart. Go to login now?");
    if (allowRedirect) {
      router.push(`/auth/login?next=${encodeURIComponent(nextPath)}`);
    }
  }

  useEffect(() => {
    const fetchCartLength = async () => {
      if (!isAuthenticated) {
        dispatch(setCartLength(0));
        return;
      }
      try {
        const result = await getCartLengthWeb() as { data?: { data?: unknown } };
        const length = Number(result?.data?.data ?? 0);
        dispatch(setCartLength(length));
      } catch (error) {
        console.error("getCartLength header error:", error);
      }
    };

    void fetchCartLength();
  }, [isAuthenticated, dispatch]);

  useEffect(() => {
    let timer: number | null = null;

    const onNotice = (event: Event) => {
      const customEvent = event as CustomEvent<{ message?: string; type?: AppNoticeType }>;
      const message = String(customEvent?.detail?.message || "").trim();
      if (!message) {
        return;
      }
      const type = customEvent?.detail?.type || "error";
      setNotice({ open: true, message, type });
      if (timer) {
        window.clearTimeout(timer);
      }
      timer = window.setTimeout(() => {
        setNotice((current) => ({ ...current, open: false }));
      }, 3000);
    };

    window.addEventListener("app-notice", onNotice as EventListener);
    return () => {
      window.removeEventListener("app-notice", onNotice as EventListener);
      if (timer) {
        window.clearTimeout(timer);
      }
    };
  }, []);

  const handleNavSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const searchText = navSearch.trim();
    const target = searchText ? `/?q=${encodeURIComponent(searchText)}#shops` : "/#shops";
    router.push(target);

    if (pathname === "/") {
      window.dispatchEvent(
        new CustomEvent("shops-search", {
          detail: { query: searchText },
        }),
      );
      window.requestAnimationFrame(() => {
        const shopsSection = document.getElementById("shops");
        if (shopsSection) {
          shopsSection.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      });
    }
  };

  const handleNavSearchChange = (value: string) => {
    setNavSearch(value);
    if (value.trim() !== "") {
      return;
    }

    const target = "/#shops";
    router.push(target);
    window.dispatchEvent(
      new CustomEvent("shops-search", {
        detail: { query: "" },
      }),
    );
  };

  return (
    <>
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand-location">
            <Link href="/" className="brand">
              MSME
            </Link>
            <button
              type="button"
              className="location-pill"
              onClick={() => setLocationPickerOpen(true)}
            >
              <span className="location-dot" aria-hidden="true" />
              <span className="location-copy">Deliver to {locationLabel}</span>
            </button>
          </div>

          <div className="header-actions">
            <form className="nav-search" onSubmit={handleNavSearchSubmit} role="search" aria-label="Search shops">
              <input
                type="search"
                value={navSearch}
                onChange={(event) => handleNavSearchChange(event.target.value)}
                placeholder="Search shops by name"
                aria-label="Search shops by name"
              />
              <button type="submit">Search</button>
            </form>
            <Link
              href="/cart"
              onClick={handleCartClick}
              className="nav-cart"
              aria-label={`Cart with ${cartCount} items`}
            >
              <svg className="cart-icon" aria-hidden="true" viewBox="0 0 24 24" role="img">
                <path
                  d="M4 5h2l2.2 9.1a2 2 0 0 0 2 1.5h6.9a2 2 0 0 0 2-1.5L21 8H7.3"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="10" cy="20" r="1.25" fill="currentColor" />
                <circle cx="18" cy="20" r="1.25" fill="currentColor" />
              </svg>
              <span>Cart</span>
              {cartCount > 0 ? <span className="cart-count">{cartCount}</span> : null}
            </Link>

            {isAuthenticated ? (
                <div className="user-chip">
                  <Link href="/profile" className="user-avatar-link" aria-label="Go to profile">
                    <span className="user-avatar" aria-hidden="true">
                      {avatarImg ? (
                        <img src={avatarImg} alt={displayName || "User avatar"} className="user-avatar-image" />
                      ) : (
                        avatarLabel
                      )}
                    </span>
                  </Link>
                  <span className="user-name">{displayName}</span>
                  <Link href="/profile" className="logout-button">
                    Profile
                  </Link>
                </div>
            ) : (
              <Link href="/auth/login" className="nav-login">
                Login
              </Link>
            )}
          </div>
        </div>
      </header>
      <LocationPickerModal open={locationPickerOpen} onClose={() => setLocationPickerOpen(false)} />
      {notice.open ? (
        <div
          className={`global-notice ${
            notice.type === "success"
              ? "global-notice-success"
              : notice.type === "warning"
                ? "global-notice-warning"
                : notice.type === "info"
                  ? "global-notice-info"
                  : "global-notice-error"
          }`}
          role="status"
          aria-live="polite"
        >
          {notice.message}
        </div>
      ) : null}
    </>
  );
}
