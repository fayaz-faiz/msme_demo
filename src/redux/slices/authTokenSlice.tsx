
import { createSlice } from "@reduxjs/toolkit";
const authTokenSlice = createSlice({
  name: 'authToken',
  initialState: {
    refreshToken: '',
    loginName:'GUEST',
    isLoggedIn: false,

  },
  reducers: {
    logoutUserSlice: (state) => {
        state.refreshToken= '',
        state.isLoggedIn= false,
        state.loginName= 'GUEST'

      },
      setIsLoggedIn: (state, action) => {
        state.isLoggedIn = action.payload;
      },
      setRefreshToken: (state, action) => {
        state.refreshToken = action.payload;
      },
      clearIsLoggedIn: (state) => {
        state.isLoggedIn = false;
      },
      clearRefreshToken: (state) => {
        state.refreshToken = '';
      },
      loginNameSlice: (state,action) => {
        state.loginName = action.payload;
      },
  },
});

export const { 
    
    setRefreshToken,
    clearRefreshToken,
    logoutUserSlice, setIsLoggedIn,
    clearIsLoggedIn,loginNameSlice } = authTokenSlice.actions;
export default authTokenSlice.reducer;
