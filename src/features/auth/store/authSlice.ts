import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { AuthUser } from "@/features/auth/domain/auth-user";

type AuthState = {
  user: AuthUser | null;
  isHydrated: boolean;
};

const initialState: AuthState = {
  user: null,
  isHydrated: false,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    hydrateUser(_state, action: PayloadAction<AuthUser | null>) {
      return {
        user: action.payload,
        isHydrated: true,
      };
    },
    loginSuccess(state, action: PayloadAction<AuthUser>) {
      state.user = action.payload;
    },
    logout(state) {
      state.user = null;
    },
  },
});

export const { hydrateUser, loginSuccess, logout } = authSlice.actions;
export const authReducer = authSlice.reducer;
