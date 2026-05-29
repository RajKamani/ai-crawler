import { useState, useEffect } from 'react';
import { API_BASE_URL, AUTH_HEADER } from '../constants/Config';
import { getErrorMessage } from '../utils/error';

export interface BlogFeed {
  id: string;
  blog_name: string;
  blog_url: string;
  is_active: boolean;
  added_at: string;
  last_crawled_at?: string;
}

export const useUserBlogs = () => {
  const [blogs, setBlogs] = useState<BlogFeed[]>([]);
  const [suggestions, setSuggestions] = useState<Array<{ name: string; url: string }>>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchBlogs = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/me/blogs`, {
        headers: { ...AUTH_HEADER },
      });
      const data = await response.json();
      if (response.ok) {
        setBlogs(data.blogs || []);
      }
    } catch (error) {
      console.error('Error fetching blogs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSuggestions = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/blogs/popular`, {
        headers: { ...AUTH_HEADER },
      });
      const data = await response.json();
      if (response.ok) {
        setSuggestions(data.suggestions || []);
      }
    } catch (error) {
      console.error('Error fetching popular blogs:', error);
    }
  };

  const addBlog = async (name: string, url: string) => {
    const response = await fetch(`${API_BASE_URL}/me/blogs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...AUTH_HEADER,
      },
      body: JSON.stringify({ name, url }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(getErrorMessage(data, 'Failed to add blog feed'));
    }

    setBlogs((prev) => [data.blog, ...prev]);
  };

  const removeBlog = async (id: string) => {
    const response = await fetch(`${API_BASE_URL}/me/blogs/${id}`, {
      method: 'DELETE',
      headers: { ...AUTH_HEADER },
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(getErrorMessage(data, 'Failed to remove blog'));
    }

    setBlogs((prev) => prev.filter((blog) => blog.id !== id));
  };

  const toggleBlog = async (id: string, isActive: boolean) => {
    const response = await fetch(`${API_BASE_URL}/me/blogs/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...AUTH_HEADER,
      },
      body: JSON.stringify({ is_active: isActive }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(getErrorMessage(data, 'Failed to toggle blog'));
    }

    setBlogs((prev) =>
      prev.map((blog) => (blog.id === id ? { ...blog, is_active: isActive } : blog))
    );
  };

  useEffect(() => {
    fetchBlogs();
    fetchSuggestions();
  }, []);

  return {
    blogs,
    suggestions,
    isLoading,
    refresh: fetchBlogs,
    addBlog,
    removeBlog,
    toggleBlog,
  };
};
