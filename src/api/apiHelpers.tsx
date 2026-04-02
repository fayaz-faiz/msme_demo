import apiInstance from './apiInstance';
import { AxiosRequestConfig } from "axios";

//INFO: Don't change helper functions (until if really needed !!!)
const getAPIHelper = async (api: string) => {
  try {
    const config: AxiosRequestConfig = {
      headers: {
        'Content-Type': 'application/json',
      },
    };
    const response = await apiInstance.get(api, config);
    return response.data;
  } catch (error) {
    throw error;
  }
};
const getAPIParamsHelper = async (api: string, params: any) => {
  const config = {
    headers: {
      'Content-Type': 'application/json',
    },
    params,
  };
  try {
    const response = await apiInstance.get(api, config);
    return response;
  } catch (error) {
    throw error;
  }
};
const postAPIHelper = async (api: string, data: any) => {
  try {
    const config: AxiosRequestConfig = {
      headers: {
        'Content-Type': 'application/json',
      },
    };
    const response = await apiInstance.post(api, data, config);
    return response;
  } catch (error) {
    throw error;
  }
};

const postAPIFormHelper = async (api: string, data: any) => {
  const config: AxiosRequestConfig = {
    headers: { 'Content-Type': 'multipart/form-data' },
  };
  try {
    const response = await apiInstance.post(api, data, config);
    return response;
  } catch (error) {
    throw error;
  }
};
const postAPIParamsHelper = async (api: string, data: any, params: any) => {
  const config = {
    params,
  };
  try {
    const response = await apiInstance.post(api, data, config);
    return response;
  } catch (error) {
    throw error;
  }
};
const putAPIHelper = async (api: string, data: any) => {
  try {
    const response = await apiInstance.put(api, data);
    return response;
  } catch (error) {
    throw error;
  }
};
const putAPIParamsHelper = async (api: string, data: string, params: any) => {
  const config = {
    params,
  };
  try {
    const response = await apiInstance.put(api, data, config);
    return response;
  } catch (error) {
    throw error;
  }
};
const deleteAPIHelper = async (api: string) => {
  try {
    const response = await apiInstance.delete(api);
    return response;
  } catch (error) {
    throw error;
  }
};
const deleteAPIParamsHelper = async (api: string, params: any) => {
  const config = {
    params,
  };
  try {
    const response = await apiInstance.delete(api, config.params);
    return response;
  } catch (error) {
    throw error;
  }
};


export {
  getAPIHelper,
  getAPIParamsHelper,
  postAPIHelper,
  postAPIFormHelper,
  postAPIParamsHelper,
  putAPIHelper,
  putAPIParamsHelper,
  deleteAPIHelper,
  deleteAPIParamsHelper,
};
