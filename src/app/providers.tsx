"use client";

import { ReactNode, useEffect, useRef } from "react";
import { Provider } from "react-redux";
import { getRloesIds, getUserProfileDataWeb, postGuestLogin } from "@/api";
import { injectStore } from "@/api/apiInstance";
import { hydrateCart } from "@/features/cart/store/cartSlice";
import { loadCartFromStorage, saveCartToStorage } from "@/features/cart/store/cart-storage";
import { hydrateUser } from "@/features/auth/store/authSlice";
import { loadAuthFromStorage, saveAuthToStorage } from "@/features/auth/store/auth-storage";
import { hydrateOrders } from "@/features/orders/store/ordersSlice";
import { loadOrdersFromStorage, saveOrdersToStorage } from "@/features/orders/store/orders-storage";
import { LocationProvider } from "@/features/location/context/location-context";
import { makeStore } from "@/redux/store";
import {
  setIsLoggedIn,
  loginNameSlice,
  setUserType,
  setRefreshToken,
  setAccessToken,
  userAuthDataSlice,
  setDeviceInfo,
} from "@/redux/slices";

type ProvidersProps = {
  children: ReactNode;
};

export function Providers({ children }: ProvidersProps) {
  const storeRef = useRef<ReturnType<typeof makeStore> | null>(null);
  const authBootstrappedRef = useRef(false);

  if (!storeRef.current) {
    storeRef.current = makeStore();
    injectStore(storeRef.current);
  }

  useEffect(() => {
    const store = storeRef.current;

    if (!store) {
      return;
    }

    store.dispatch(hydrateCart(loadCartFromStorage()));
    store.dispatch(hydrateUser(loadAuthFromStorage()));
    store.dispatch(hydrateOrders(loadOrdersFromStorage()));

    const unsubscribe = store.subscribe(() => {
      saveCartToStorage(store.getState().cart.items);
      saveAuthToStorage(store.getState().auth.user);
      saveOrdersToStorage(store.getState().orders.items);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    const store = storeRef.current;

    if (!store || authBootstrappedRef.current) {
      return;
    }

    authBootstrappedRef.current = true;

    const ROLE_USER = "USER";
    const ROLE_GUEST = "GUEST";

    const fetchAndHydrateUserProfile = async () => {
      try {
        const response = await getUserProfileDataWeb();
        const profile = (response as {
          data?: { full_name?: string; mobile_number?: string };
          full_name?: string;
          mobile_number?: string;
        })?.data || (response as { full_name?: string; mobile_number?: string });
        const fullName = String(profile?.full_name || "").trim();
        const mobileNumber = String(profile?.mobile_number || "").trim();

        if (!fullName && !mobileNumber) {
          return;
        }

        store.dispatch(
          hydrateUser({
            name: fullName || "User",
            mobileNumber: mobileNumber || "",
          }),
        );
      } catch (error) {
        console.error("Profile bootstrap fetch failed:", error);
      }
    };

    const getGuestLoginApi = async (guestRoleId: string) => {
      const payload = { role: guestRoleId };
      const response = await postGuestLogin(payload);
      const isSuccess = response?.data?.statusCode === 200 || response?.data?.status === true;
      const tokenData = response?.data?.data;

      if (isSuccess && tokenData) {
        const loginName = store.getState().authToken?.loginName;

        if (loginName !== ROLE_USER) {
          store.dispatch(setAccessToken(tokenData.accessToken ?? ""));
          store.dispatch(setRefreshToken(tokenData.refreshToken ?? ""));
          store.dispatch(loginNameSlice(ROLE_GUEST));
        }
      }
    };

    const userAuth = async () => {
      try {
        if (typeof window !== "undefined") {
          const accessToken = window.localStorage.getItem("nearshop_access_token") || "";
          const refreshToken = window.localStorage.getItem("nearshop_refresh_token") || "";
          const loginRole = window.localStorage.getItem("nearshop_login_role") || "";
          if (accessToken && loginRole === ROLE_USER) {
            store.dispatch(setAccessToken(accessToken));
            store.dispatch(setRefreshToken(refreshToken));
            store.dispatch(loginNameSlice(ROLE_USER));
            store.dispatch(setUserType(ROLE_USER));
            store.dispatch(setIsLoggedIn(true));
            await fetchAndHydrateUserProfile();
            return;
          }
        }

        const response = await getRloesIds();
        const roles = response?.data ?? [];

        store.dispatch(userAuthDataSlice(roles));

        const loginName = store.getState().authToken?.loginName;
        if (loginName !== ROLE_USER) {
          const guest = roles.find((item: { role?: string; _id?: string }) => item.role === ROLE_GUEST);
          if (guest?._id) {
            await getGuestLoginApi(guest._id);
          }
        }
      } catch (error) {
        console.error("Guest login bootstrap failed:", error);
      }
    };

    void userAuth();
  }, []);

  useEffect(() => {
    const store = storeRef.current;
    if (!store || typeof window === "undefined") {
      return;
    }

    const DEVICE_ID_KEY = "nearshop-device-unique-id";

    const detectOs = () => {
      const ua = window.navigator.userAgent.toLowerCase();
      if (ua.includes("windows")) {
        return "WINDOWS";
      }
      if (ua.includes("android")) {
        return "ANDROID";
      }
      if (ua.includes("iphone") || ua.includes("ipad") || ua.includes("ios")) {
        return "IOS";
      }
      if (ua.includes("mac os") || ua.includes("macintosh")) {
        return "MACOS";
      }
      if (ua.includes("linux")) {
        return "LINUX";
      }
      return "UNKNOWN";
    };

    const detectOsVersion = () => {
      const ua = window.navigator.userAgent;
      const windowsMatch = ua.match(/Windows NT ([0-9.]+)/i);
      if (windowsMatch?.[1]) {
        return windowsMatch[1];
      }
      const androidMatch = ua.match(/Android ([0-9.]+)/i);
      if (androidMatch?.[1]) {
        return androidMatch[1];
      }
      const iosMatch = ua.match(/OS ([0-9_]+)/i);
      if (iosMatch?.[1]) {
        return iosMatch[1].replace(/_/g, ".");
      }
      return "5.0";
    };

    const detectDeviceType = () => {
      const ua = window.navigator.userAgent.toLowerCase();
      if (ua.includes("ipad") || ua.includes("tablet")) {
        return "TABLET";
      }
      if (ua.includes("mobile") || ua.includes("android") || ua.includes("iphone")) {
        return "PHONE";
      }
      return "DESKTOP";
    };

    const platform = window.navigator.platform || "Unknown";
    const manufacturer = `Unknown (${platform})`;
    const savedId = window.localStorage.getItem(DEVICE_ID_KEY);
    const androidId = savedId || window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;

    if (!savedId) {
      window.localStorage.setItem(DEVICE_ID_KEY, androidId);
    }

    store.dispatch(
      setDeviceInfo({
        manufacturer,
        brand: manufacturer,
        modelName: "UNKNOWN",
        modelId: "UNKNOWN",
        osName: detectOs(),
        osVersion: detectOsVersion(),
        deviceName: "UNKNOWN",
        deviceType: detectDeviceType(),
        isDevice: "REAL",
        platformApiLevel: 0,
        androidId,
      }),
    );
  }, []);

  return (
    <Provider store={storeRef.current}>
      <LocationProvider>{children}</LocationProvider>
    </Provider>
  );
}
