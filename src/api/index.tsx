import { getAPIHelper, postAPIHelper } from "./apiHelpers"
import {
  GET_TERMS_CONDITION, GET_ROLES_API, POST_GENERATE_API, POST_SEARCH_BY_ID_API,
  POST_ACCESS_TOKEN_API, GET_USER_PROFILE_API, EDIT_PROFILE_API, SEARCH_STORE_BY_LOCATION_API,
  POST_ADD_UPDATE_CART_API, POST_LOGIN_API, GET_CATEGORIES_API, GET_SAVED_ADDRESS_API, CART_LENGTH,
  POST_ADD_ADDRESS_API,
  INITIALIZE_CART_API,
  VERIFY_CART_API,
  CONFIRM_ORDER_API,
  POST_MY_ORDERS_API,
  POST_CART_BY_ID_API,
  GET_MULTI_CART_API,
  GUEST_LOGIN,
  GET_ADDRESS_API, POST_SEARCH_API, SEARCH_ITEM_BY_NAME_AND_CATEGORY,
  POST_DELETE_CART, DELETE_ADDRESS_API,
  SEARCH_BY_IMAGE, SEARCH_STORE_BY_ITEMS_API, POST_ISSUE_CREATE_API, POST_ISSUE_BY_ID, POST_MY_ISSUES_API, POST_ISSUE_CLOSED,
  POST_ISSUE_STATUS, POST_IGM_ISSUE_IMAGE_UPLOAD, POST_ISSUE_BY_ORDER_ID, POST_CHECK_ISSUE,
  POST_SUB_CATEGORIES_API,
  POST_ORDER_BY_ID_API,
  GET_ISSUE_CATEGORIES_API,
  POST_ISSUE_SUB_CATEGORIES_API,
  POST_LOGOUT,
  POST_ORDER_DETAILS_API,
  UPDATE_ADDRESS_API, GET_CANCEL_REASON, ORDERS_CANCEL_ORDER, GET_RETURN_REASON, ORDERS_RETURN_ORDER, PAYMENT_GW_API,
  POST_TRACK_ORDER,
  POST_STORENAME_WITH_SUBCATEOGORY, GET_CANCELLATION_TERMS,
  POST_ORDER_STATUS_API,
  CONTACT_US_API,
  REPEAT_ORDER,
  UPLOAD_PROFILE,
  LATEST_ORDER,
  GET_ABOUT_US,
  GET_PRIVACY_POLICY
} from './apiConstants'

const getTermsAndConditions = async () => {
  try {
    const result = await getAPIHelper(GET_TERMS_CONDITION);
    return result;
  } catch (error) {
    throw error;
  }
};
const getRloesIds = async () => {
  try {
    const result = await getAPIHelper(GET_ROLES_API);
    return result;
  } catch (error) {
    throw error;
  }
};

const postGenerateOtp = async (data: any) => {
  try {
    const result = await postAPIHelper(POST_GENERATE_API, data);
    return result;
  } catch (error) {
    throw error;
  }
};

const postLogin = async (data: any) => {
  try {
    const result = await postAPIHelper(POST_LOGIN_API, data);

    return result;
  } catch (error) {
    throw error;
  }
};

const getCategoryData = async () => {
  try {
    const result = await getAPIHelper(GET_CATEGORIES_API);
    return result;
  } catch (error) {
    throw error;
  }
};


const postSearchStoreByLocation = async (data: any) => {

  try {
    const result = await postAPIHelper(SEARCH_STORE_BY_LOCATION_API, data);
    return result;
  } catch (error) {
    throw error;
  }
};
const postSearchStoreByLocationWeb = async (data: any) => {
  try {
    const result = await postAPIHelper(SEARCH_STORE_BY_LOCATION_API, data);
    return result;
  } catch (error) {
    throw error;
  }
};
const getUserProfileData = async () => {
  try {
    const result = await getAPIHelper(GET_USER_PROFILE_API);
    return result;
  } catch (error) {
    throw error;
  }
};
const editProfile = async (data: any) => {
  try {
    const result = await postAPIHelper(EDIT_PROFILE_API, data);
    return result;
  } catch (error) {
    throw error;
  }
};
const getAddress = async () => {
  try {
    const result = await getAPIHelper(GET_SAVED_ADDRESS_API);
    return result;
  } catch (error) {
    throw error;
  }
};


const postSearchById = async (data: any) => {
  try {
    const result = await postAPIHelper(POST_SEARCH_BY_ID_API, data);
    return result;
  } catch (error) {
    throw error;
  }
};

const postSearchByIdWeb = async (data: any) => {
  try {
    const result = await postAPIHelper(POST_SEARCH_BY_ID_API, data);
    return result;
  } catch (error) {
    throw error;
  }
};

const postAddUpdateCart = async (data: any) => {
  try {
    const result = await postAPIHelper(POST_ADD_UPDATE_CART_API, data);
    return result;
  } catch (error) {
    throw error;
  }
};
const getCartLengthWeb = async () => {
  try {
    const result = await getAPIHelper(CART_LENGTH);
    return result;
  } catch (error) {
    throw error;
  }
};

const postConfirmOrderWeb = async (data: any) => {
  try {
    const result = await postAPIHelper(CONFIRM_ORDER_API, data);
    return result;
  } catch (error) {
    throw error;
  }
};

const initializeCartWeb = async (data: any) => {
  try {
    const result = await postAPIHelper(INITIALIZE_CART_API, data);
    return result;
  } catch (error) {
    throw error;
  }
};

const verifyCartWeb = async (data: any) => {
  try {
    const result = await postAPIHelper(VERIFY_CART_API, data);
    return result;
  } catch (error) {
    throw error;
  }
};

const getUserProfileDataWeb = async () => {
  try {
    const result = await getAPIHelper(GET_USER_PROFILE_API);
    return result;
  } catch (error) {
    throw error;
  }
};

const editProfileWeb = async (data: any) => {
  try {
    const result = await postAPIHelper(EDIT_PROFILE_API, data);
    return result;
  } catch (error) {
    throw error;
  }
};

const postMyOrdersApiData = async (data: any) => {
  try {
    const result = await postAPIHelper(POST_MY_ORDERS_API, data);
    return result;
  } catch (error) {
    throw error;
  }
};

const postRepeatOrdersApiData = async (data: any) => {
  try {
    const result = await postAPIHelper(REPEAT_ORDER, data);
    return result;
  } catch (error) {
    throw error;
  }
};

const postCartByIdWeb = async (data: any) => {
  try {
    const result = await postAPIHelper(POST_CART_BY_ID_API, data);
    return result;
  } catch (error) {
    throw error;
  }
};

const getMultiCrtData = async () => {
  try {
    const result = await getAPIHelper(GET_MULTI_CART_API);
    return result;
  } catch (error) {
    throw error;
  }
};
const getAddressWeb = async () => {
  try {
    const result = await getAPIHelper(GET_ADDRESS_API);
    return result;
  } catch (error) {
    throw error;
  }
};
const postGuestLogin = async (data: any) => {
  try {
    const result = await postAPIHelper(GUEST_LOGIN, data);
    return result;
  } catch (error) {
    throw error;
  }
};
const postAccessTokenWeb = async (data: any) => {
  try {
    const result = await postAPIHelper(POST_ACCESS_TOKEN_API, data);
    return result;
  } catch (error) {
    throw error;
  }
};
const postAccessToken = async (data: any) => {
  try {
    const result = await postAPIHelper(POST_ACCESS_TOKEN_API, data);
    return result;
  } catch (error) {
    throw error;
  }
};
const searchStoreByItems = async (data: any) => {
  try {
    const result = await postAPIHelper(SEARCH_STORE_BY_ITEMS_API, data);
    return result;
  } catch (error) {
    throw error;
  }
};
const postAddAddress = async (data: any) => {
  try {
    const result = await postAPIHelper(POST_ADD_ADDRESS_API, data);
    return result;
  } catch (error) {
    throw error;
  }
};
const postSearch = async (data: any) => {
  try {
    const result = await postAPIHelper(POST_SEARCH_API, data);
    console.log(result)
    return result;
  } catch (error) {
    throw error;
  }
};

const postSearchByNameAndCategory = async (data: any) => {
  try {
    const result = await postAPIHelper(SEARCH_ITEM_BY_NAME_AND_CATEGORY, data);
    return result;
  } catch (error) {
    throw error;
  }
};

const postDeleteCart = async (body: any) => {
  try {
    const result = await postAPIHelper(POST_DELETE_CART, body);
    return result;
  } catch (error) {
    throw error;
  }
};


const deleteAddressDataWeb = async (data: any) => {
  try {
    const result = await postAPIHelper(DELETE_ADDRESS_API, data);
    return result;
  } catch (error) {
    throw error;
  }
};

const postSearchByImage = async (body: any) => {
  try {
    const result = await postAPIHelper(SEARCH_BY_IMAGE, body);
    return result;
  } catch (error) {
    throw error;
  }
};

const postCheckIssueByOrderId = async (data: any) => {
  try {
    const result = await postAPIHelper(POST_CHECK_ISSUE, data);
    return result;
  } catch (error) {
    throw error;
  }
};
const postIssueByOrderId = async (data: any) => {
  try {
    const result = await postAPIHelper(POST_ISSUE_BY_ORDER_ID, data);
    return result;
  } catch (error) {
    throw error;
  }
};
const postIgmUploadImage = async (body: any) => {
  try {
    const result = await postAPIHelper(POST_IGM_ISSUE_IMAGE_UPLOAD, body);
    return result;
  } catch (error) {
    throw error;
  }
};
const postIssueStatuts = async (data: any) => {
  try {
    const result = await postAPIHelper(POST_ISSUE_STATUS, data);
    return result;
  } catch (error) {
    throw error;
  }
};
const postIssueCloseById = async (data: any) => {
  try {
    const result = await postAPIHelper(POST_ISSUE_CLOSED, data);
    return result;
  } catch (error) {
    throw error;
  }
};
const postIssueById = async (data: any) => {
  try {
    const result = await postAPIHelper(POST_ISSUE_BY_ID, data);
    return result;
  } catch (error) {
    throw error;
  }
};
const postCreateIssueData = async (data: any) => {
  try {
    const result = await postAPIHelper(POST_ISSUE_CREATE_API, data);
    return result;
  } catch (error) {
    throw error;
  }
};
const postMyIssuesData = async (data: any) => {
  try {
    const result = await postAPIHelper(POST_MY_ISSUES_API, data);
    return result;
  } catch (error) {
    throw error;
  }
};
const postSubCategoryData = async (data: any) => {
  try {
    const result = await postAPIHelper(POST_SUB_CATEGORIES_API, data);
    return result;
  } catch (error) {
    throw error;
  }
};
const postOrderbyIdData = async (data: any) => {
  try {
    const result = await postAPIHelper(POST_ORDER_BY_ID_API, data);
    return result;
  } catch (error) {
    throw error;
  }
};
const getIssueCategoryData = async () => {
  try {
    const result = await getAPIHelper(GET_ISSUE_CATEGORIES_API);
    return result;
  } catch (error) {
    throw error;
  }
};
const postIssueSubCategoryData = async (data: any) => {
  try {
    const result = await postAPIHelper(POST_ISSUE_SUB_CATEGORIES_API, data);
    return result;
  } catch (error) {
    throw error;
  }
};
/// Get About Us
const getAboutUs = async () => {
  try {
    const result = await getAPIHelper(GET_ABOUT_US);
    return result;
  } catch (error) {
    throw error;
  }
};

// Get Privacy Policy
const getPrivacyPolicy = async () => {
  try {
    const result = await getAPIHelper(GET_PRIVACY_POLICY);
    return result;
  } catch (error) {
    throw error;
  }
};

const postOrderDertailsById = async (data: any) => {
  try {
    const result = await postAPIHelper(POST_ORDER_DETAILS_API, data);
    return result;
  } catch (error) {
    throw error;
  }
};

const updateAddress = async (data: any) => {
  try {
    const result = await postAPIHelper(UPDATE_ADDRESS_API, data);
    return result;
  } catch (error) {
    throw error;
  }
};
const getCancelReasons = async () => {
  try {
    const result = await getAPIHelper(GET_CANCEL_REASON);
    return result;
  } catch (error) {
    throw error;
  }
};

const orderCancelOrder = async (data: any) => {
  try {
    const result = await postAPIHelper(ORDERS_CANCEL_ORDER, data);
    return result;
  } catch (error) {
    throw error;
  }
};

const getReturnReasons = async () => {
  try {
    const result = await getAPIHelper(GET_RETURN_REASON);
    return result;
  } catch (error) {
    throw error;
  }
};

const orderReturnOrder = async (data: any) => {
  try {
    const result = await postAPIHelper(ORDERS_RETURN_ORDER, data);
    return result;
  } catch (error) {
    throw error;
  }
};

const payemntGw = async (data: any) => {
  try {
    const result = await postAPIHelper(PAYMENT_GW_API, data);
    return result;
  } catch (error) {
    throw error;
  }
};

const postTrackOrder = async (data: any) => {
  try {
    const result = await postAPIHelper(POST_TRACK_ORDER, data);
    return result;
  } catch (error) {
    throw error;
  }
};

const postStoreSubcatApi = async (data: any) => {
  try {
    const result = await postAPIHelper(POST_STORENAME_WITH_SUBCATEOGORY, data);
    return result;
  } catch (error) {
    throw error;
  }
};

const getCancellationAndreturn = async () => {
  try {
    const result = await getAPIHelper(GET_CANCELLATION_TERMS);
    return result;
  } catch (error) {
    throw error;
  }
};

const postOrderStatusById = async (data: any) => {
  try {
    const result = await postAPIHelper(POST_ORDER_STATUS_API, data);
    return result;
  } catch (error) {
    throw error;
  }
};

const getCantactDetails = async () => {
  try {
    const result = await getAPIHelper(CONTACT_US_API);
    return result;
  } catch (error) {
    throw error;
  }
};

const postUploadProfile = async (data: any) => {
  try {
    const result = await postAPIHelper(UPLOAD_PROFILE, data);
    return result;
  } catch (error) {
    throw error;
  }
};

const getLatestOrder = async () => {
  try {
    const result = await getAPIHelper(LATEST_ORDER);
    return result;
  } catch (error) {
    throw error;
  }
};


const postLogout = async (data: any) => {
  try {
    const result = await postAPIHelper(POST_LOGOUT, data);
    return result;
  } catch (error) {
    throw error;
  }
};

const deleteAddress = async (data: any) => {
  try {
    const result = await postAPIHelper(DELETE_ADDRESS_API, data);
    return result;
  } catch (error) {
    throw error;
  }
};

export {
  getTermsAndConditions, getRloesIds, postGenerateOtp, getUserProfileData, postAddUpdateCart, postSearchById,
  postSearchByIdWeb, postAccessToken, postLogin, getCategoryData, postSearchStoreByLocation, postSearchStoreByLocationWeb,
  getAddress, getCartLengthWeb, verifyCartWeb, initializeCartWeb, postConfirmOrderWeb, getUserProfileDataWeb,
  editProfileWeb, postMyOrdersApiData, postCartByIdWeb, getMultiCrtData, postGuestLogin, getAddressWeb, postSearch,
  postSearchByNameAndCategory, postDeleteCart, postSearchByImage, postAccessTokenWeb, postAddAddress,
  deleteAddressDataWeb, searchStoreByItems, postCheckIssueByOrderId, postIssueByOrderId, postIgmUploadImage,
  postIssueStatuts, postIssueCloseById, postIssueById, postCreateIssueData, postMyIssuesData, postSubCategoryData,
  postOrderbyIdData, getIssueCategoryData, postIssueSubCategoryData, postOrderDertailsById, updateAddress,
  getCancelReasons, orderCancelOrder, getReturnReasons, orderReturnOrder, payemntGw, postTrackOrder, postStoreSubcatApi,
  getCancellationAndreturn, postOrderStatusById, getCantactDetails, postRepeatOrdersApiData, postUploadProfile, getLatestOrder,
  getAboutUs, getPrivacyPolicy, postLogout, deleteAddress,
}





