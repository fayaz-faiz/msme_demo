import axios, {AxiosInstance } from 'axios';
import { postAccessTokenWeb } from './../api';
import { setAccessToken, setRefreshToken } from '../redux/slices';

const apiInstance: AxiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_BASE_URL,
  timeout: parseInt(process.env.NEXT_PUBLIC_API_URL_TIMEOUT || "30000", 10),
});

let store: any;

export const injectStore = (_store: any) => {
  store = _store;
};

apiInstance.interceptors.request.use((config: any) => {
  const accessToken = store?.getState?.()?.apiResponse?.accessToken;
  if (accessToken) {
    config.headers['Authorization'] = `Bearer ${accessToken}`;
  }
  return config;
});

apiInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    //INFO: If no response or not an axios error, just reject
    if (!error.response) {
      return Promise.reject(error);
    }

    const status = error.response.status;
    const refreshToken = store?.getState?.()?.authToken?.refreshToken;

    //INFO: Only try refresh if refreshToken exists and not already retried
    if (status === 401 && refreshToken && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const response = await postAccessTokenWeb({ refreshToken });

        const newAccessToken = response?.data?.data;
        if (newAccessToken) {
          await store.dispatch(setAccessToken(newAccessToken));
          originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
          return apiInstance(originalRequest);
        } else {
          //INFO: If no valid token, clear everything
          await store.dispatch(setAccessToken(null));
          await store.dispatch(setRefreshToken(null));
          return Promise.reject(error);
        }
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        await store.dispatch(setAccessToken(null));
        await store.dispatch(setRefreshToken(null));
        return Promise.reject(refreshError);
      }
    }

    //INFO: If refreshToken is null or undefined, don’t retry — just clear tokens
    if (status === 401 && (!refreshToken || refreshToken === 'null' || refreshToken === 'undefined')) {
      await store.dispatch(setAccessToken(null));
      await store.dispatch(setRefreshToken(null));
      return Promise.reject(error);
    }

    return Promise.reject(error);
  }
);

export default apiInstance;

//INFO: Previous code before refactor, once testing will be done it will be removed
// import {axios,AxiosInstance } from '../imports';

// import { postAccessTokenWeb } from './../api';
// import { setAccessToken, setRefreshToken } from '../redux/slices';

// const apiInstance: AxiosInstance = axios.create({
//   baseURL: process.env.REACT_APP_BASE_URL,
//   timeout: parseInt(process.env.REACT_APP_API_URL_TIMEOUT || "30000", 10)
// });

// let store:any;

// export const injectStore = (_store:any) => {
//   store = _store;
// };

// apiInstance.interceptors.request.use((config: any) => {
//  const accessToken = store.getState().apiResponse.accessToken;
 
//   if (accessToken) {
//     config.headers['Authorization'] = `Bearer ${accessToken}`;
//   }
//   return config;
// });

// apiInstance.interceptors.response.use(
//   (response) => response,
//   async (error) => {
//     const originalRequest = error.config;
//     const refreshToken = store.getState().authToken.refreshToken;
//     if (error.response?.status === 401 && refreshToken && !originalRequest._retry) {
//       originalRequest._retry = true;
//       try {
  
//         const refToken = {
//           refreshToken
//         };
//         const response = await postAccessTokenWeb(refToken);
//         const newAccessToken = response?.data?.data;
//         originalRequest.headers['Authorization'] = `Bearer ${response?.data?.data}`;
//         await store.dispatch(setAccessToken( newAccessToken));
//         return apiInstance(originalRequest);
//       } catch (refreshError) {
//         await store.dispatch(setAccessToken({ accessToken: null }));
//         await store.dispatch(setRefreshToken({ refreshToken: null }));
        
//       }
//     }

//     return Promise.reject(error);
//   }
// );

// export default apiInstance;
