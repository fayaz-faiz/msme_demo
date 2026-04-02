"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { getCartLengthWeb, getRloesIds, postGuestLogin } from "@/api";
import { useAppDispatch, useAppSelector } from "@/features/cart/store/hooks";
import { clearCart } from "@/features/cart/store/cartSlice";
import { logout } from "@/features/auth/store/authSlice";
import { hydrateOrders } from "@/features/orders/store/ordersSlice";
import { useLocation } from "@/features/location/context/location-context";
import {
  logoutSlice,
  logoutUserSlice,
  logoutUsersSlice,
  logoutUserssSlice,
  loginNameSlice,
  setAccessToken,
  setCartLength,
  setIsLoggedIn,
  setRefreshToken,
  setUserType,
  userAuthDataSlice,
} from "@/redux/slices";
import { LocationPickerModal } from "@/features/location/components/LocationPickerModal";

export function AppHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const dispatch = useAppDispatch();
  const localCartCount = useAppSelector((state) =>
    state.cart.items.reduce((sum, item) => sum + item.quantity, 0),
  );
  const apiCartCount = useAppSelector((state) => state.apiResponse.cartLength);
  const loginName = useAppSelector((state) => state.authToken.loginName);
  const user = useAppSelector((state) => state.auth.user);
  const isAuthenticated = !!user || loginName === "USER";
  const { location, isResolving } = useLocation();
  const [locationPickerOpen, setLocationPickerOpen] = useState(false);
  const cartCount = apiCartCount > 0 ? apiCartCount : localCartCount;
  const currentQuery = searchParams?.toString();
  const nextPath = currentQuery ? `${pathname}?${currentQuery}` : pathname;

  const locationLabel = location
    ? `${location.city}, ${location.pincode}`
    : isResolving
      ? "Detecting location..."
      : "Choose location";
  const displayName = user?.name ?? null;
  const avatarLabel = displayName ? displayName.charAt(0).toUpperCase() : "U";

  async function getGuestLoginApi(guestRoleId: string) {
    const payload = { role: guestRoleId };
    const response: any = await postGuestLogin(payload);
    const isSuccess = response?.data?.statusCode === 200 || response?.data?.status === true;
    const tokenData = response?.data?.data;
    if (isSuccess && tokenData) {
      dispatch(setAccessToken(tokenData.accessToken ?? ""));
      dispatch(setRefreshToken(tokenData.refreshToken ?? ""));
      dispatch(loginNameSlice("GUEST"));
      dispatch(setUserType("GUEST"));
      dispatch(setIsLoggedIn(false));
      if (typeof window !== "undefined") {
        window.localStorage.setItem("nearshop_access_token", tokenData.accessToken ?? "");
        window.localStorage.setItem("nearshop_refresh_token", tokenData.refreshToken ?? "");
        window.localStorage.setItem("nearshop_login_role", "GUEST");
      }
    }
  }

  async function userAuth() {
    try {
      const response: any = await getRloesIds();
      const roles = response?.data ?? [];
      dispatch(userAuthDataSlice(roles));
      const guest = roles.find((item: { role?: string; _id?: string }) => item.role === "GUEST");
      if (guest?._id) {
        await getGuestLoginApi(guest._id);
      }
    } catch (error) {
      console.error(error);
    }
  }

  async function handleLogout() {
    const confirmed = window.confirm(
      "Log out? This will clear your cart, order history, profile session, and saved location data.",
    );

    if (!confirmed) {
      return;
    }

    dispatch(clearCart());
    dispatch(hydrateOrders([]));
    dispatch(logout());
    dispatch(logoutSlice());
    dispatch(logoutUserSlice());
    dispatch(logoutUsersSlice());
    dispatch(logoutUserssSlice());
    dispatch(setCartLength(0));
    window.localStorage.removeItem("msme-location");
    window.localStorage.removeItem("nearshop_access_token");
    window.localStorage.removeItem("nearshop_refresh_token");
    window.localStorage.removeItem("nearshop_login_role");
    await userAuth();
    router.push("/");
  }

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
        const result: any = await getCartLengthWeb();
        const length = Number(result?.data?.data ?? 0);
        dispatch(setCartLength(length));
      } catch (error) {
        console.error("getCartLength header error:", error);
      }
    };

    void fetchCartLength();
  }, [isAuthenticated, dispatch]);

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
              <span className="cart-count">{cartCount}</span>
            </Link>

            {isAuthenticated ? (
              <>
                <Link href="/profile" className="nav-profile">
                  Profile
                </Link>
                <div className="user-chip">
                  <span className="user-avatar" aria-hidden="true">
                    {avatarLabel}
                  </span>
                  <span className="user-name">{displayName}</span>
                  <button
                    type="button"
                    className="logout-button"
                    onClick={handleLogout}
                  >
                    Logout
                  </button>
                </div>
              </>
            ) : (
              <Link href="/auth/login" className="nav-login">
                Login
              </Link>
            )}
          </div>
        </div>
      </header>
      <LocationPickerModal open={locationPickerOpen} onClose={() => setLocationPickerOpen(false)} />
    </>
  );
}
