import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { AuthUser } from "@/features/auth/domain/auth-user";

type AuthState = {
  user: AuthUser | null;
};

const initialState: AuthState = {
  user: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    hydrateUser(_state, action: PayloadAction<AuthUser | null>) {
      return {
        user: action.payload,
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
