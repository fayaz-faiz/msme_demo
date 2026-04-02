import { createSlice } from "@reduxjs/toolkit";

const addressSlice = createSlice({
  name: 'address',
  initialState: {
    allAddress: [],
    loading: false,
    searchQuery:"",
    error: null,
    selectedIndex:0,
    profileTitle:'My Profile',
    profileTitleIndexValue: 1,
  },
  reducers: {
    logoutUsersSlice: (state) => {
      state.allAddress= []
      state.loading= false
      state.error= null
      state.searchQuery = ""
      
    },
    setAddresses: (state, action) => {
      state.allAddress = action.payload; //INFO: Set the address data
    },
    clearAddresses: (state) => {
      state.allAddress = []; //INFO: Clear the address data
    },
    setLoading: (state, action) => {
      state.loading = action.payload; //INFO: Set loading state
    },
    setError: (state, action) => {
      state.error = action.payload; //INFO: Set error state
    },
    setSearchQuery:(state, action)=>{
      state.searchQuery = action.payload
    },
    clearSearchQuery:(state)=>{
      state.searchQuery = ''
    },
    setSelectedIndex:(state, action)=>{
      state.selectedIndex = action.payload
    },
    clearselectedIndex:(state)=>{
      state.selectedIndex = 0
    },
    setProfileTitle:(state, action)=>{
      state.profileTitle = action.payload
    },
    setProfileTitleIndexValue:(state, action)=>{
      state.profileTitleIndexValue = action.payload
    },
  },
});

export const { setAddresses, clearAddresses, setLoading, setError,logoutUsersSlice, setSearchQuery, 
  clearSearchQuery, setSelectedIndex, clearselectedIndex, setProfileTitle, setProfileTitleIndexValue
 } = addressSlice.actions;
export default addressSlice.reducer;
