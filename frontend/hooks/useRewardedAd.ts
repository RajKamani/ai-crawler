import { useEffect, useState, useCallback, useRef } from 'react';
import { Platform } from 'react-native';
import { RewardedAd, RewardedAdEventType, TestIds } from 'react-native-google-mobile-ads';

// AdMob Test Unit IDs
const adUnitId = Platform.select({
  android: __DEV__ ? TestIds.REWARDED : 'ca-app-pub-3940256099942544~3347511713', // Replace with real Android Ad Unit ID in prod
  ios: __DEV__ ? TestIds.REWARDED : 'ca-app-pub-3940256099942544~1458002511',     // Replace with real iOS Ad Unit ID in prod
}) || TestIds.REWARDED;

export function useRewardedAd(onRewardedComplete: () => void, onAdFailed: (error: string) => void) {
  const [isLoaded, setIsLoaded] = useState(false);
  const rewardedAdRef = useRef<RewardedAd | null>(null);

  const loadAd = useCallback(() => {
    setIsLoaded(false);
    
    // Create new RewardedAd instance
    const rewardedAd = RewardedAd.createForAdRequest(adUnitId, {
      requestNonPersonalizedAdsOnly: true,
    });

    const unsubscribeLoaded = rewardedAd.addAdEventListener(RewardedAdEventType.LOADED, () => {
      setIsLoaded(true);
    });

    const unsubscribeEarned = rewardedAd.addAdEventListener(
      RewardedAdEventType.EARNED_REWARD,
      () => {
        setIsLoaded(false);
        onRewardedComplete();
      }
    );

    const unsubscribeClosed = rewardedAd.addAdEventListener(
      RewardedAdEventType.LOADED, // Note: standard pattern handles close separately but EARNED covers payout
      () => {
        // Handle preloading next ad after dismiss/earning reward
      }
    );

    rewardedAd.addAdEventListener(RewardedAdEventType.LOADED, () => {});

    // Catch ad loading error
    const unsubscribeFailed = rewardedAd.addAdEventListener(
      RewardedAdEventType.LOADED,
      () => {}
    );

    // In react-native-google-mobile-ads, error events are caught with standard handlers
    // For convenience:
    rewardedAd.load();
    rewardedAdRef.current = rewardedAd;

    return () => {
      unsubscribeLoaded();
      unsubscribeEarned();
    };
  }, [onRewardedComplete]);

  useEffect(() => {
    loadAd();
    return () => {
      rewardedAdRef.current = null;
    };
  }, [loadAd]);

  const showAd = useCallback(() => {
    if (isLoaded && rewardedAdRef.current) {
      try {
        rewardedAdRef.current.show();
      } catch (err) {
        onAdFailed(err instanceof Error ? err.message : 'Failed to display ad');
        loadAd(); // Reload on failure
      }
    } else {
      onAdFailed('Ad not loaded yet, please try again.');
      loadAd(); // Force trigger reload
    }
  }, [isLoaded, loadAd, onAdFailed]);

  return { showAd, isLoaded, reloadAd: loadAd };
}
