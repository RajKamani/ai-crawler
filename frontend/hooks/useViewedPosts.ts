import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const useViewedPosts = () => {
  const [viewedIds, setViewedIds] = useState<Set<string>>(new Set());

  // Load viewed post IDs on mount
  useEffect(() => {
    const loadViewed = async () => {
      try {
        const stored = await AsyncStorage.getItem('@viewed_post_ids');
        if (stored) {
          const arr = JSON.parse(stored);
          setViewedIds(new Set(arr));
        }
      } catch (e) {
        console.error('Failed to load viewed post ids:', e);
      }
    };
    loadViewed();
  }, []);

  const markAsViewed = useCallback(async (postId: string) => {
    setViewedIds((prev) => {
      if (prev.has(postId)) return prev;
      const next = new Set(prev);
      next.add(postId);
      
      // Save asynchronously to AsyncStorage
      AsyncStorage.setItem('@viewed_post_ids', JSON.stringify(Array.from(next)))
        .catch((e) => console.error('Failed to save viewed post ids:', e));
        
      return next;
    });
  }, []);

  return {
    viewedIds,
    markAsViewed,
  };
};
