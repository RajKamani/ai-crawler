import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://mjpzmokwiwtrjpeexevk.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qcHptb2t3aXd0cmpwZWV4ZXZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk2MTU2NTEsImV4cCI6MjA5NTE5MTY1MX0.Q-fVgO0NCNMtYN5Z01wiMKXYnEVTpE67mwtzHKpbx2Q';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage as any,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
