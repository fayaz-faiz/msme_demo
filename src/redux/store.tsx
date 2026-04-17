import { configureStore } from "@reduxjs/toolkit";
import { persistReducer, persistStore } from "redux-persist";
import storage from "redux-persist/lib/storage";
import {
  addressReducer,
  apiResponseReducer,
  authTokenReducer,
  deviceReducer,
  locationReducer,
} from "./slices";
import { cartReducer } from "@/features/cart/store/cartSlice";
import { authReducer } from "@/features/auth/store/authSlice";
import { ordersReducer } from "@/features/orders/store/ordersSlice";

const locationPersistConfig = {
  key: "location",
  storage,
};

const authTokenPersistConfig = {
  key: "authToken",
  storage,
};

const apiResponsePersistConfig = {
  key: "apiResponse",
  storage,
  whitelist: ["accessToken", "userType", "cartLength", "roleToken"],
};

const persistedLocationReducer = persistReducer(locationPersistConfig, locationReducer);
const persistedAuthTokenReducer = persistReducer(authTokenPersistConfig, authTokenReducer);
const persistedApiResponseReducer = persistReducer(apiResponsePersistConfig, apiResponseReducer);

export const makeStore = () =>
  configureStore({
    reducer: {
      cart: cartReducer,
      auth: authReducer,
      orders: ordersReducer,
      allAddress: addressReducer,
      location: persistedLocationReducer,
      apiResponse: persistedApiResponseReducer,
      authToken: persistedAuthTokenReducer,
      deviceInfo: deviceReducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: {
          ignoredActions: [
            "persist/PERSIST",
            "persist/REHYDRATE",
            "persist/PAUSE",
            "persist/PURGE",
            "persist/REGISTER",
            "persist/FLUSH",
          ],
        },
      }),
  });

export const store = makeStore();
export const persistor = persistStore(store);

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
