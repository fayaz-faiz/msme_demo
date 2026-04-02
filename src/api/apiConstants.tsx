const GET_TERMS_CONDITION = '/static/terms-condition'
const GET_ROLES_API = '/auth/roles';
const POST_GENERATE_API = '/auth/generateOtp';
const POST_LOGIN_API = '/auth/login';
const POST_ACCESS_TOKEN_API = '/auth/getAccessToken';
const POST_ADD_ADDRESS_API = '/addresses/addAddress';
const GET_CATEGORIES_API = '/static/getCategories';
const SEARCH_STORE_BY_LOCATION_API = '/search/searchStoresByLocation';
const POST_SUB_CATEGORIES_API = '/static/getSubCategoriesByCategory';


const EDIT_PROFILE_API = '/users/editProfile';
const GET_USER_PROFILE_API = '/users/profile';
const POST_MY_ORDERS_API = '/orders/myOrders';
const POST_SEARCH_BY_ID_API = '/search/searchById';
const GUEST_LOGIN = '/auth/GuestLogin'
const GET_SAVED_ADDRESS_API = '/addresses/getAddress';
const CART_LENGTH = '/cart/myCartLength';
const POST_ADD_UPDATE_CART_API = '/cart/addOrUpdateCart';
const CONFIRM_ORDER_API = '/cart/confirmOrder';
const INITIALIZE_CART_API = '/cart/initializeCart';
const VERIFY_CART_API = '/cart/verifyCart';
const POST_CART_BY_ID_API = '/cart/cartById';
const GET_MULTI_CART_API = '/cart/myCarts';
const GET_ADDRESS_API = '/addresses/getAddress';
const DELETE_ADDRESS_API = '/addresses/deleteAddress';
const POST_SEARCH_API = '/search';
const SEARCH_ITEM_BY_NAME_AND_CATEGORY = '/search/searchByItemNameAndCategoryId';
const POST_DELETE_CART = '/cart/deleteCart';
const SEARCH_BY_IMAGE = '/search/searchByItemImage';
const SEARCH_STORE_BY_ITEMS_API = '/search/searchStoreByItems';
const POST_STORENAME_WITH_SUBCATEOGORY = '/search/searchProvider';

const POST_ORDER_DETAILS_API = '/orders/orderById';
const POST_TRACK_ORDER = '/orders/trackOrder';

const UPDATE_ADDRESS_API = '/addresses/updateAddress';
const POST_ISSUE_CREATE_API = '/issue/create';
const POST_MY_ISSUES_API = '/issue/myIssues';
const POST_ISSUE_BY_ID = '/issue/issueById';
const POST_ISSUE_CLOSED = '/issue/close';
const POST_ISSUE_STATUS = '/issue/issue_status';
const POST_IGM_ISSUE_IMAGE_UPLOAD = '/issue/issueImageUpload';
const POST_ISSUE_BY_ORDER_ID = '/issue/orderIssues';
const POST_CHECK_ISSUE = '/issue/checkOrderIssues';

const POST_ORDER_BY_ID_API = '/orders/orderById';
const POST_ORDER_STATUS_API = '/orders/orderStatus';
const GET_CANCEL_REASON = '/static/getCancelReasons';
const ORDERS_CANCEL_ORDER = '/orders/cancelOrder';
const GET_RETURN_REASON = '/static/getReturnReasons';
const ORDERS_RETURN_ORDER = '/orders/updateOrder';
const REPEAT_ORDER = '/orders/repeatOrder';
const PAYMENT_GW_API = '/payment/payment_gw';
const GET_ISSUE_CATEGORIES_API = '/static/getIssueCategories';
const POST_ISSUE_SUB_CATEGORIES_API = '/static/getIssueSubCategoriesByCategory';
const POST_LOGOUT = '/auth/logout';
const GET_CANCELLATION_TERMS = '/static/cancellation-terms';
const CONTACT_US_API = "/static/contactUs";
const UPLOAD_PROFILE = "/users/uploadUserProfile";
const LATEST_ORDER = '/orders/myLatestOrder'

export {
    GET_TERMS_CONDITION, GET_ROLES_API, POST_GENERATE_API, POST_LOGIN_API, POST_ACCESS_TOKEN_API,
    POST_MY_ORDERS_API, VERIFY_CART_API, INITIALIZE_CART_API, CONFIRM_ORDER_API, POST_CART_BY_ID_API,
    GET_USER_PROFILE_API, GET_CATEGORIES_API, EDIT_PROFILE_API, SEARCH_STORE_BY_LOCATION_API, POST_SEARCH_BY_ID_API,
    GET_SAVED_ADDRESS_API, SEARCH_ITEM_BY_NAME_AND_CATEGORY, CART_LENGTH, POST_ADD_UPDATE_CART_API, GET_MULTI_CART_API,
    SEARCH_BY_IMAGE, GUEST_LOGIN, POST_ADD_ADDRESS_API, GET_ADDRESS_API, POST_SEARCH_API, POST_DELETE_CART,
    DELETE_ADDRESS_API, SEARCH_STORE_BY_ITEMS_API, POST_ISSUE_CREATE_API, POST_ISSUE_BY_ID, POST_MY_ISSUES_API,
    POST_ISSUE_CLOSED, POST_ISSUE_STATUS, POST_IGM_ISSUE_IMAGE_UPLOAD, POST_ISSUE_BY_ORDER_ID, POST_CHECK_ISSUE,
    POST_LOGOUT, POST_SUB_CATEGORIES_API, POST_ORDER_BY_ID_API, GET_ISSUE_CATEGORIES_API, POST_ISSUE_SUB_CATEGORIES_API,
    POST_ORDER_DETAILS_API, UPDATE_ADDRESS_API, POST_ORDER_STATUS_API, GET_CANCEL_REASON, ORDERS_CANCEL_ORDER,
    GET_RETURN_REASON, ORDERS_RETURN_ORDER, PAYMENT_GW_API, POST_TRACK_ORDER, POST_STORENAME_WITH_SUBCATEOGORY,
    GET_CANCELLATION_TERMS, CONTACT_US_API, REPEAT_ORDER, UPLOAD_PROFILE, LATEST_ORDER,
}
