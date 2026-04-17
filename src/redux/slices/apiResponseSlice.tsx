import { createSlice, PayloadAction } from "@reduxjs/toolkit";

const apiResponseSlice = createSlice({
  name: 'apiResponse',
  initialState: {
    category: '',
    id: '',
    pageSize: '',
    parentItemId: '',
    providerId: '',
    providerLocationId: '',
    subCategoryName: '',
    userType: '',
    loading: false,
    error: null,
    cartLength: 0,
    roleToken: '',
    accessToken: '',
  },
  reducers: {
    logoutSlice: (state) => {
      state.category= ''
      state.id= ''
      state.pageSize= ''
      state.parentItemId= ''
      state.providerId= ''
      state.providerLocationId= ''
      state.subCategoryName= ''
      state.userType= ''
      state.loading= false
      state.error= null
      state.cartLength = 0
      state.roleToken= ''
      state.accessToken=''
    },
    setAccessToken: (state, action) => {
      state.accessToken = action.payload;
    },
    clearAccessToken: (state) => {
      state.accessToken = '';
    }, 
    setCategory: (state, action) => {
      state.category = action.payload;
    },
    clearCategory: (state) => {
      state.category = '';
    },
    setId: (state, action) => {
      state.id = action.payload;
    },
    clearId: (state) => {
      state.id = '';
    },
    setPageSize: (state, action) => {
      state.pageSize = action.payload;
    },
    clearPageSize: (state) => {
      state.pageSize = '';
    },
    setParentItemId: (state, action) => {
      state.parentItemId = action.payload;
    },
    clearParentItemId: (state) => {
      state.parentItemId = '';
    },
    setProviderId: (state, action) => {
      state.providerId = action.payload;
    },
    clearProviderId: (state) => {
      state.providerId = '';
    },
    setProviderLocationId: (state, action) => {
      state.providerLocationId = action.payload;
    },
    clearProviderLocationId: (state) => {
      state.providerLocationId = '';
    },
    setSubCategoryName: (state, action) => {
      state.subCategoryName = action.payload;
    },
    clearSubCategoryName: (state) => {
      state.subCategoryName = '';
    },
    setUserType: (state, action) => {
      state.userType = action.payload;
    },
    clearUserType: (state) => {
      state.userType = '';
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    
    setCartLength: (state, action: PayloadAction<number>) => {
      state.cartLength = action.payload; 
    },
    userAuthDataSlice: (state, action) => {
      state.roleToken = action.payload;
    },
    clearRoleToken: (state) => {
      state.roleToken = '';
    }
  },
});

export const {
  setAccessToken,
  clearAccessToken,
  setCategory,
  clearCategory,
  setId,
  clearId,
  setPageSize,
  clearPageSize,
  setParentItemId,
  clearParentItemId,
  setProviderId,
  clearProviderId,
  setProviderLocationId,
  clearProviderLocationId,
  setSubCategoryName,
  clearSubCategoryName,
  setUserType,
  clearUserType,
  setLoading,
  setError,
  clearError,logoutSlice,setCartLength,
  userAuthDataSlice,clearRoleToken
} = apiResponseSlice.actions;

export default apiResponseSlice.reducer;
