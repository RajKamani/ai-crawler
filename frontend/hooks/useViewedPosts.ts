import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL, AUTH_HEADER } from '@/constants/Config';

export const useViewedPosts = () => {
  const [viewedIds, setViewedIds] = useState<Set<string>>(new Set());

  // Load viewed post IDs on mount and sync with backend
  useEffect(() => {
    const loadAndSyncViewed = async () => {
      try {
        // 1. Load local viewed IDs
        const stored = await AsyncStorage.getItem('@viewed_post_ids');
        let localIds: string[] = [];
        if (stored) {
          localIds = JSON.parse(stored);
        }

        // 2. Fetch backend viewed IDs
        const response = await fetch(`${API_BASE_URL}/posts/views`, {
          headers: { ...AUTH_HEADER }
        });
        
        let mergedIds = new Set<string>(localIds);
        if (response.ok) {
          const data = await response.json();
          const backendIds: string[] = data.viewed_post_ids || [];
          backendIds.forEach(id => mergedIds.add(id));
        }

        setViewedIds(mergedIds);
        
        // 3. Save merged IDs back to storage
        await AsyncStorage.setItem('@viewed_post_ids', JSON.stringify(Array.from(mergedIds)));
      } catch (e) {
        console.error('Failed to sync viewed post ids:', e);
      }
    };
    loadAndSyncViewed();
  }, []);

  const markAsViewed = useCallback(async (postId: string) => {
    setViewedIds((prev) => {
      if (prev.has(postId)) return prev;
      const next = new Set(prev);
      next.add(postId);
      
      // Save asynchronously to AsyncStorage
      AsyncStorage.setItem('@viewed_post_ids', JSON.stringify(Array.from(next)))
        .catch((e) => console.error('Failed to save viewed post ids:', e));
        
      // Sync to backend
      fetch(`${API_BASE_URL}/posts/views`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...AUTH_HEADER,
        },
        body: JSON.stringify({ post_id: postId })
      }).catch(err => console.error('Failed to sync viewed post to backend:', err));
        
      return next;
    });
  }, []);

  return {
    viewedIds,
    markAsViewed,
  };
};
