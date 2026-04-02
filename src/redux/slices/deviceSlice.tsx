import { createSlice } from "@reduxjs/toolkit";
 
const initialState = {
  manufacturer: "",
  brand: "",
  modelName: "",
  modelId: "",
  osName: "",
  osVersion: "",
  deviceName: "",
  deviceType: "",
  isDevice: false,
  platformApiLevel: null,
  androidId: "",
};
 
const deviceSlice = createSlice({
  name: "device",
  initialState,
  reducers: {
    setDeviceInfo: (state, action) => {
      return { ...state, ...action.payload };
    },
  },
});
 
export const { setDeviceInfo } = deviceSlice.actions;
export default deviceSlice.reducer;
 
