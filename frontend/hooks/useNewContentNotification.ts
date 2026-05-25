import { useState, useEffect } from 'react';
import { API_BASE_URL, AUTH_HEADER } from '../constants/Config';

export const useNewContentNotification = (latestLocalPostId: string | null) => {
  const [newPostsAvailable, setNewPostsAvailable] = useState(false);

  useEffect(() => {
    if (!latestLocalPostId) {
      setNewPostsAvailable(false);
      return;
    }

    const checkForNewPosts = async () => {
      try {
        // Fetch the single most recent post
        const response = await fetch(`${API_BASE_URL}/posts/personalized?page=1&limit=1`, {
          headers: { ...AUTH_HEADER },
        });
        
        if (!response.ok) return;

        const data = await response.json();
        if (data.posts && data.posts.length > 0) {
          const latestServerPostId = data.posts[0].id;
          if (latestServerPostId !== latestLocalPostId) {
            setNewPostsAvailable(true);
          }
        }
      } catch (error) {
        console.error('Error checking for new posts:', error);
      }
    };

    // Run check initially after mount
    checkForNewPosts();

    // Set up polling interval every 30 seconds
    const intervalId = setInterval(checkForNewPosts, 30000);

    return () => clearInterval(intervalId);
  }, [latestLocalPostId]);

  return {
    newPostsAvailable,
    setNewPostsAvailable,
  };
};
