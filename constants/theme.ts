/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

// Esprit Chef brand palette — aligned with espritchefs.com
// Prussian Blue: #0A2342  |  Gold: #CAA876 / #C9A96E  |  Pale Oak: #E2D1B3
const tintColorLight = '#0A2342';
const tintColorDark  = '#CAA876';   // gold-300

export const Colors = {
  light: {
    text:            '#0A2342',   // Prussian Blue
    background:      '#FFFFFF',
    tint:            tintColorLight,
    icon:            '#5A5656',   // charcoal
    tabIconDefault:  '#999999',
    tabIconSelected: tintColorLight,
    card:            '#F5F0E8',   // pale oak warm
    border:          '#E2D1B3',   // pale oak border
  },
  dark: {
    text:            '#FFFFFF',
    background:      '#0A2342',   // dark-950 Prussian Blue
    tint:            tintColorDark,
    icon:            '#CAA876',   // gold-300
    tabIconDefault:  'rgba(255,255,255,0.30)',
    tabIconSelected: tintColorDark,
    card:            '#0C1D36',   // dark-900
    border:          'rgba(255,255,255,0.08)', // subtle glass border
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
