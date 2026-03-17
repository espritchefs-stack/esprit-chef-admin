import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';

// Optional: Warm up the browser for faster instantiation (Android only)
export const warmUpBrowser = () => {
  WebBrowser.warmUpAsync();
};

export const coolDownBrowser = () => {
  WebBrowser.coolDownAsync();
};

/**
 * Initializes a Polar checkout flow using an elegant in-app browser.
 * 
 * @param productId The Polar Product ID you want the user to subscribe to
 * @returns true if the checkout was ostensibly successful/completed, false if canceled
 */
export const openPolarCheckout = async (productId: string = 'product_default_tier'): Promise<boolean> => {
  // Construct the Return URL so Polar knows where to send the user back.
  // This taps into Expo Router's deep linking configuration.
  const returnUrl = Linking.createURL('/recipe/success');

  // Hardcode the Polar Product URL (or dynamically fetch it from your backend).
  // Replace this with your actual Polar.sh sandbox or production checkout URL.
  // Example format: https://polar.sh/checkout/prod_xxxx?success_url=...
  const polarStorefrontUrl = `https://sandbox.polar.sh/esprit-chef/products/test-michelin-premium`;

  // We append the redirect URI to the checkout URL if Polar supports `success_url` as a param,
  // or just use `openBrowserAsync` directly.
  try {
    const result = await WebBrowser.openBrowserAsync(polarStorefrontUrl, {
      presentationStyle: WebBrowser.WebBrowserPresentationStyle.FORM_SHEET,
      controlsColor: '#ffffff',
      toolbarColor: '#000000',
    });

    if (result.type === 'cancel') {
      console.log('User cancelled the checkout');
      return false;
    }
    
    // In a complete integration, you'd handle deep link parsing here or in a useEffect 
    // to detect if they landed on the exact success URL.
    return true;
  } catch (error) {
    console.error('Failed to open Polar checkout:', error);
    return false;
  }
};
