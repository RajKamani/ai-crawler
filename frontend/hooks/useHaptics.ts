import { Platform, Vibration } from 'react-native';
import Constants from 'expo-constants';

const isExpoGo = Constants.appOwnership === 'expo';
const isWeb = Platform.OS === 'web';

/**
 * Lightweight haptic feedback hook using React Native Vibration API.
 * No expo-haptics dependency needed. Falls back to no-op on unsupported platforms.
 */
export function useHaptics() {
  const canVibrate = !isWeb; // Vibration works in Expo Go on Android/iOS

  const triggerLight = () => {
    if (canVibrate) {
      Vibration.vibrate(10);
    }
  };

  const triggerMedium = () => {
    if (canVibrate) {
      Vibration.vibrate(25);
    }
  };

  const triggerHeavy = () => {
    if (canVibrate) {
      Vibration.vibrate(50);
    }
  };

  return { triggerLight, triggerMedium, triggerHeavy };
}
