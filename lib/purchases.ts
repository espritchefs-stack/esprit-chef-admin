import Purchases, { LOG_LEVEL } from 'react-native-purchases';
import { Platform } from 'react-native';

const API_KEYS = {
  apple: "appl_api_key_placeholder", // Replace with actual RevenueCat Apple API Key
  google: "goog_WvTuZIybAZUyEXRdsQoQiFGovou", 
};

export const setupPurchases = async () => {
  if (Platform.OS === 'web') return;
  
  Purchases.setLogLevel(LOG_LEVEL.DEBUG);

  if (Platform.OS === 'ios') {
    Purchases.configure({ apiKey: API_KEYS.apple });
  } else if (Platform.OS === 'android') {
    Purchases.configure({ apiKey: API_KEYS.google });
  }
};

export const getOfferings = async () => {
  try {
    const offerings = await Purchases.getOfferings();
    if (offerings.current !== null && offerings.current.availablePackages.length !== 0) {
       return offerings.current.availablePackages;
    }
  } catch (e: any) {
    console.warn("Error getting offerings:", e.message);
  }
  return [];
};

export const purchasePackage = async (pack: any) => {
  try {
    const { customerInfo } = await Purchases.purchasePackage(pack);
    if (typeof customerInfo.entitlements.active['Premium'] !== "undefined") {
      return true;
    }
  } catch (e: any) {
    if (!e.userCancelled) {
      console.warn("Purchase error:", e.message);
    }
  }
  return false;
};
