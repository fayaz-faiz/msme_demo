import { createSlice } from "@reduxjs/toolkit";


const locationSlice = createSlice({
  name: 'location',
  initialState: {
    selectAddress: {},
    selectedGps: '',
    currentLoc: {},
    verifiedStoresFromRedux: false,
    Category: 'Grocery',
    userDetail: [],
  },
  reducers: {
    logoutUserssSlice: (state) => {
      state.selectAddress = {}
      state.selectedGps = ''
      state.currentLoc = {}
    },
    selectedAddress: (state, action) => {
      state.selectAddress = action.payload; //INFO: Set the selected address data
    },
    clearSelectAddress: (state) => {
      state.selectAddress = ''; //INFO: Clear the selected address data
    },
    setselectedGps: (state, action) => {
      state.selectedGps = action.payload; //INFO: Set error state
    },
    setCurrentLoc: (state, action) => {
      state.currentLoc = action.payload; //INFO:set Current Location
    },
    setVerifiedStores: (state, action) => {
      state.verifiedStoresFromRedux = action.payload; //INFO: verifiles stores in the dashboard
    },
    setCategoryStores: (state, action) => {
      state.Category = action.payload; //INFO: verifiles stores in the dashboard
    },
    setUserDetail: (state, action) => {
      state.userDetail = action.payload;
    },
  },
});

export const { selectedAddress, clearSelectAddress,
  setselectedGps, setCurrentLoc, logoutUserssSlice, setVerifiedStores, setCategoryStores,
  setUserDetail
} = locationSlice.actions;
export default locationSlice.reducer;
