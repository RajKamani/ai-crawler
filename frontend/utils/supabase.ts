import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// In-memory storage helper for SSR/Node.js environments where AsyncStorage/window is not available
class MemoryStorage {
  private storage = new Map<string, string>();

  async getItem(key: string): Promise<string | null> {
    return this.storage.get(key) || null;
  }

  async setItem(key: string, value: string): Promise<void> {
    this.storage.set(key, value);
  }

  async removeItem(key: string): Promise<void> {
    this.storage.delete(key);
  }
}

const isServer = typeof window === 'undefined';
const authStorage = isServer ? new MemoryStorage() : AsyncStorage;

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://mjpzmokwiwtrjpeexevk.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qcHptb2t3aXd0cmpwZWV4ZXZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk2MTU2NTEsImV4cCI6MjA5NTE5MTY1MX0.Q-fVgO0NCNMtYN5Z01wiMKXYnEVTpE67mwtzHKpbx2Q';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: authStorage as any,
    autoRefreshToken: !isServer,
    persistSession: !isServer,
    detectSessionInUrl: false,
  },
});

// Track processed refresh tokens to prevent duplicate setSession calls (Supabase Token Reuse Detection)
const processedRefreshTokens = new Set<string>();

export const isRefreshTokenProcessed = (token: string): boolean => {
  if (processedRefreshTokens.has(token)) {
    return true;
  }
  processedRefreshTokens.add(token);
  // Auto-clean after 10 seconds to prevent memory build-up
  setTimeout(() => {
    processedRefreshTokens.delete(token);
  }, 10000);
  return false;
};
