
import { setAddresses, setLoading, setError,logoutUsersSlice, setSearchQuery, clearSearchQuery, setSelectedIndex, clearselectedIndex } from './addressSlice'
import { setCartLength, setCartSummary, logoutSlice,userAuthDataSlice,
    clearRoleToken,
    setAccessToken,
    clearAccessToken,
    setUserType,} from './apiResponseSlice'
import {
    
    setRefreshToken,
    clearRefreshToken,
    logoutUserSlice, loginNameSlice ,setIsLoggedIn,
    clearIsLoggedIn } from './authTokenSlice'
import {selectedAddress, setselectedGps, setCurrentLoc,logoutUserssSlice} from './locationSlice';
import { setDeviceInfo } from './deviceSlice'
import addressReducer from './addressSlice';
import apiResponseReducer from './apiResponseSlice';
import authTokenReducer from './authTokenSlice';
import locationReducer from './locationSlice'
import deviceReducer from './deviceSlice';

export {selectedAddress, setselectedGps, setCurrentLoc, setAddresses, setLoading, setError,clearRefreshToken, 
    loginNameSlice, setAccessToken, setIsLoggedIn,setRefreshToken,logoutSlice,logoutUserSlice,logoutUsersSlice,
    logoutUserssSlice, userAuthDataSlice, setCartLength, setCartSummary, clearIsLoggedIn, clearAccessToken, clearRoleToken,
    setUserType,
    addressReducer,  apiResponseReducer,authTokenReducer, locationReducer,deviceReducer, setSearchQuery, clearSearchQuery, 
    setSelectedIndex, clearselectedIndex, setDeviceInfo };
