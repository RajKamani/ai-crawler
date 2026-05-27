import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import { supabase } from '../utils/supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  isLoading: true,
  signOut: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const parseAndSetSession = async (url: string) => {
    try {
      let accessToken: string | null = null;
      let refreshToken: string | null = null;

      const parsedUrl = Linking.parse(url);
      if (parsedUrl.queryParams) {
        accessToken = parsedUrl.queryParams.access_token as string || null;
        refreshToken = parsedUrl.queryParams.refresh_token as string || null;
      }

      if (!accessToken || !refreshToken) {
        const hashIndex = url.indexOf('#');
        if (hashIndex !== -1) {
          const hash = url.substring(hashIndex + 1);
          const params = new URLSearchParams(hash);
          accessToken = params.get('access_token');
          refreshToken = params.get('refresh_token');
        }
      }

      if (!accessToken || !refreshToken) {
        const hashIndex = url.indexOf('#');
        if (hashIndex !== -1) {
          const hash = url.substring(hashIndex + 1);
          const parts = hash.split('&');
          const params: Record<string, string> = {};
          parts.forEach((part) => {
            const [key, value] = part.split('=');
            if (key && value) {
              params[key] = decodeURIComponent(value);
            }
          });
          accessToken = params['access_token'] || null;
          refreshToken = params['refresh_token'] || null;
        }
      }

      if (accessToken && refreshToken) {
        console.log('[AuthContext] Setting session from deep link:', url);
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (error) throw error;
        console.log('[AuthContext] Session set successfully from deep link!');
      }
    } catch (err) {
      console.error('[AuthContext] Error setting session from deep link:', err);
    }
  };

  useEffect(() => {
    // 1. Fetch current session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    }).catch((err) => {
      console.error('Error fetching Supabase session:', err);
      setIsLoading(false);
    });

    // 2. Listen to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    // 3. Listen to incoming deep links (when app is already running)
    const handleDeepLink = async (event: { url: string }) => {
      console.log('[AuthContext] Deep link received:', event.url);
      await parseAndSetSession(event.url);
    };
    const linkingSub = Linking.addEventListener('url', handleDeepLink);

    // 4. Check if the app was opened via a deep link initially
    Linking.getInitialURL().then(async (url) => {
      if (url) {
        console.log('[AuthContext] Initial deep link:', url);
        await parseAndSetSession(url);
      }
    }).catch(err => {
      console.error('Error getting initial URL:', err);
    });

    return () => {
      subscription.unsubscribe();
      linkingSub.remove();
    };
  }, []);

  const signOut = async () => {
    setIsLoading(true);
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Error during sign out:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, isLoading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
