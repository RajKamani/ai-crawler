import { useEffect, useState, useCallback, useRef } from 'react';
import { Platform } from 'react-native';

let RewardedAd: any;
let RewardedAdEventType: any;
let AdEventType: any;
let TestIds: any = { REWARDED: 'test-ad-unit-id' };

if (Platform.OS !== 'web') {
  try {
    const GoogleMobileAds = require('react-native-google-mobile-ads');
    RewardedAd = GoogleMobileAds.RewardedAd;
    RewardedAdEventType = GoogleMobileAds.RewardedAdEventType;
    AdEventType = GoogleMobileAds.AdEventType;
    TestIds = GoogleMobileAds.TestIds;
  } catch (e) {
    console.warn('Google Mobile Ads could not be loaded', e);
  }
} else {
  RewardedAdEventType = { LOADED: 'LOADED', EARNED_REWARD: 'EARNED_REWARD' };
  AdEventType = { LOADED: 'LOADED', CLOSED: 'CLOSED', ERROR: 'ERROR' };
}

// AdMob Unit IDs (fallback to standard AdMob test unit IDs)
const adUnitId = Platform.select({
  android: __DEV__
    ? TestIds.REWARDED
    : (process.env.EXPO_PUBLIC_ADMOB_ANDROID_REWARDED_UNIT_ID || 'ca-app-pub-3940256099942544/5224354917'),
  ios: __DEV__
    ? TestIds.REWARDED
    : (process.env.EXPO_PUBLIC_ADMOB_IOS_REWARDED_UNIT_ID || 'ca-app-pub-3940256099942544/1712485313'),
  default: TestIds.REWARDED,
}) || TestIds.REWARDED;

export function useRewardedAd(onRewardedComplete: () => void, onAdFailed: (error: string) => void) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const rewardedAdRef = useRef<any>(null);
  const isLoadingRef = useRef(false);
  const onRewardedCompleteRef = useRef(onRewardedComplete);
  const onAdFailedRef = useRef(onAdFailed);

  // Sync callbacks to refs to avoid tearing down the ad instance on callback reference changes
  useEffect(() => {
    onRewardedCompleteRef.current = onRewardedComplete;
    onAdFailedRef.current = onAdFailed;
  }, [onRewardedComplete, onAdFailed]);

  const setIsLoadingState = (loading: boolean) => {
    setIsLoading(loading);
    isLoadingRef.current = loading;
  };

  // Load function
  const loadAd = useCallback(() => {
    if (Platform.OS === 'web' || !RewardedAd) {
      setIsLoaded(true);
      setIsLoadingState(false);
      return;
    }

    const ad = rewardedAdRef.current;
    if (ad) {
      // If native ad thinks it is already loaded, update React state and return
      if (ad.loaded) {
        setIsLoaded(true);
        setIsLoadingState(false);
        return;
      }
      
      // If we are already loading, do not trigger load() again
      if (isLoadingRef.current) {
        return;
      }

      setIsLoadingState(true);
      try {
        ad.load();
      } catch (err) {
        console.warn('Error loading rewarded ad:', err);
        setIsLoadingState(false);
      }
    }
  }, []);

  // Initialize the ad instance once on mount
  useEffect(() => {
    if (Platform.OS === 'web' || !RewardedAd) {
      setIsLoaded(true);
      return;
    }

    // Create a single stable ad instance for the lifecycle of this hook
    const rewardedAd = RewardedAd.createForAdRequest(adUnitId, {
      requestNonPersonalizedAdsOnly: true,
    });
    rewardedAdRef.current = rewardedAd;

    // Start initial load
    setIsLoadingState(true);
    try {
      rewardedAd.load();
    } catch (err) {
      console.warn('Initial load error:', err);
      setIsLoadingState(false);
    }

    // Subscribe to events using the unified listener
    const unsubscribe = rewardedAd.addAdEventsListener(({ type, payload }: any) => {
      switch (type) {
        case AdEventType.LOADED:
        case RewardedAdEventType.LOADED:
          setIsLoaded(true);
          setIsLoadingState(false);
          break;

        case RewardedAdEventType.EARNED_REWARD:
          setIsLoaded(false);
          setIsLoadingState(false);
          onRewardedCompleteRef.current();
          break;

        case AdEventType.CLOSED:
          setIsLoaded(false);
          setIsLoadingState(true);
          // Preload next ad immediately
          try {
            rewardedAd.load();
          } catch (err) {
            console.warn('Error preloading ad on close:', err);
            setIsLoadingState(false);
          }
          break;

        case AdEventType.ERROR:
          setIsLoaded(false);
          setIsLoadingState(false);
          onAdFailedRef.current(payload?.message || 'Failed to load ad');
          break;
      }
    });

    return () => {
      unsubscribe();
      rewardedAdRef.current = null;
    };
  }, []);

  const showAd = useCallback(() => {
    if (Platform.OS === 'web' || !RewardedAd) {
      onRewardedCompleteRef.current();
      return;
    }

    const ad = rewardedAdRef.current;
    
    // Check both React state and the native object's synchronous .loaded property
    if (ad && ad.loaded) {
      try {
        ad.show();
      } catch (err) {
        onAdFailedRef.current(err instanceof Error ? err.message : 'Failed to display ad');
        // Reload on failure
        setIsLoaded(false);
        setIsLoadingState(true);
        try {
          ad.load();
        } catch (loadErr) {
          setIsLoadingState(false);
        }
      }
    } else {
      onAdFailedRef.current('Ad not loaded yet, please try again.');
      // Force trigger reload if not loaded/loading
      loadAd();
    }
  }, [loadAd]);

  return { showAd, isLoaded, isLoading, reloadAd: loadAd };
}
