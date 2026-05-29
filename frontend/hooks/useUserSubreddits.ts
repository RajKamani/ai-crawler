import { useState, useEffect } from 'react';
import { API_BASE_URL, AUTH_HEADER } from '../constants/Config';
import { getErrorMessage } from '../utils/error';

export interface Subreddit {
  id: string;
  subreddit_name: string;
  is_active: boolean;
  added_at: string;
  last_crawled_at?: string;
}

export const useUserSubreddits = () => {
  const [subreddits, setSubreddits] = useState<Subreddit[]>([]);
  const [suggestions, setSuggestions] = useState<Array<{ name: string; description: string }>>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchSubreddits = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/me/subreddits`, {
        headers: { ...AUTH_HEADER },
      });
      const data = await response.json();
      if (response.ok) {
        setSubreddits(data.subreddits || []);
      }
    } catch (error) {
      console.error('Error fetching subreddits:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSuggestions = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/subreddits/popular`, {
        headers: { ...AUTH_HEADER },
      });
      const data = await response.json();
      if (response.ok) {
        setSuggestions(data.suggestions || []);
      }
    } catch (error) {
      console.error('Error fetching popular subreddits:', error);
    }
  };

  const addSubreddit = async (name: string) => {
    const response = await fetch(`${API_BASE_URL}/me/subreddits`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...AUTH_HEADER,
      },
      body: JSON.stringify({ subreddit_name: name }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(getErrorMessage(data, 'Failed to add subreddit'));
    }

    setSubreddits((prev) => [data.subreddit, ...prev]);
  };

  const removeSubreddit = async (id: string) => {
    const response = await fetch(`${API_BASE_URL}/me/subreddits/${id}`, {
      method: 'DELETE',
      headers: { ...AUTH_HEADER },
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(getErrorMessage(data, 'Failed to remove subreddit'));
    }

    setSubreddits((prev) => prev.filter((sub) => sub.id !== id));
  };

  const toggleSubreddit = async (id: string, isActive: boolean) => {
    const response = await fetch(`${API_BASE_URL}/me/subreddits/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...AUTH_HEADER,
      },
      body: JSON.stringify({ is_active: isActive }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(getErrorMessage(data, 'Failed to toggle subreddit'));
    }

    setSubreddits((prev) =>
      prev.map((sub) => (sub.id === id ? { ...sub, is_active: isActive } : sub))
    );
  };

  useEffect(() => {
    fetchSubreddits();
    fetchSuggestions();
  }, []);

  return {
    subreddits,
    suggestions,
    isLoading,
    refresh: fetchSubreddits,
    addSubreddit,
    removeSubreddit,
    toggleSubreddit,
  };
};
