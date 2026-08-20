import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from "axios";
import { postAccessTokenWeb } from "./../api";
import {
  clearAccessToken,
  clearIsLoggedIn,
  clearRefreshToken,
  clearRoleToken,
  logoutSlice,
  logoutUserSlice,
  logoutUsersSlice,
  logoutUserssSlice,
  setAccessToken,
  setIsLoggedIn,
  setUserType,
} from "../redux/slices";
import { clearCart } from "@/features/cart/store/cartSlice";
import { logout } from "@/features/auth/store/authSlice";
import { hydrateOrders } from "@/features/orders/store/ordersSlice";
import type { AppDispatch, RootState } from "@/redux/store";

const apiInstance: AxiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_BASE_URL,
  timeout: parseInt(process.env.NEXT_PUBLIC_API_URL_TIMEOUT || "30000", 10),
});

type InjectedStore = {
  dispatch: AppDispatch;
  getState: () => RootState;
};

let store: InjectedStore | null = null;
let isForceLoggingOut = false;

export const injectStore = (_store: InjectedStore) => {
  store = _store;
};

const forceLogout = async () => {
  if (isForceLoggingOut || !store) {
    return;
  }

  isForceLoggingOut = true;

  try {
    await store.dispatch(clearCart());
    await store.dispatch(hydrateOrders([]));
    await store.dispatch(logout());
    await store.dispatch(logoutSlice());
    await store.dispatch(logoutUserSlice());
    await store.dispatch(logoutUsersSlice());
    await store.dispatch(logoutUserssSlice());
    await store.dispatch(clearAccessToken());
    await store.dispatch(clearRefreshToken());
    await store.dispatch(clearIsLoggedIn());
    await store.dispatch(setIsLoggedIn(false));
    await store.dispatch(clearRoleToken());
    await store.dispatch(setUserType(""));

    if (typeof window !== "undefined") {
      window.localStorage.removeItem("nearshop_access_token");
      window.localStorage.removeItem("nearshop_refresh_token");
      window.localStorage.removeItem("nearshop_login_role");
      window.localStorage.removeItem("msme-location");
      window.localStorage.removeItem("msme-auth-user");
      window.localStorage.removeItem("msme-cart");
      window.localStorage.removeItem("msme-orders");
    }
  } finally {
    if (typeof window !== "undefined" && window.location.pathname !== "/auth/login") {
      window.location.replace("/auth/login");
    }
  }
};

apiInstance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const accessToken = store?.getState?.()?.apiResponse?.accessToken;
  if (accessToken) {
    config.headers["Authorization"] = `Bearer ${accessToken}`;
  }
  return config;
});

apiInstance.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;

    if (!error.response) {
      return Promise.reject(error);
    }

    const status = error.response.status;
    const refreshToken = store?.getState?.()?.authToken?.refreshToken;

    if (status === 401 && refreshToken && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const response = await postAccessTokenWeb({ refreshToken });
        const refreshResponse = response?.data;
        const refreshSucceeded = refreshResponse?.status === true || refreshResponse?.statusCode === 200;
        const newAccessToken = refreshResponse?.data;

        if (refreshSucceeded && newAccessToken) {
          await store.dispatch(setAccessToken(newAccessToken));
          originalRequest.headers["Authorization"] = `Bearer ${newAccessToken}`;
          return apiInstance(originalRequest);
        }

        await forceLogout();
        return Promise.reject(error);
      } catch (refreshError) {
        console.error("Token refresh failed:", refreshError);
        await forceLogout();
        return Promise.reject(refreshError);
      }
    }

    if (status === 401 && (!refreshToken || refreshToken === "null" || refreshToken === "undefined")) {
      await forceLogout();
      return Promise.reject(error);
    }

    return Promise.reject(error);
  },
);

export default apiInstance;
