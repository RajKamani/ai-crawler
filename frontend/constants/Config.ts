import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Production backend URL (deployed on Render)
const PRODUCTION_API_URL = 'https://ai-content-crawler-backend.onrender.com/api/v1';

// Local development backend URL
// If testing locally on a physical device, set HOST to your machine's LAN IP (e.g., '192.168.1.64').
// Run backend locally with: uvicorn app.main:app --reload --host 0.0.0.0
const HOST = Platform.select({
  android: '192.168.1.64', // Change to '10.0.2.2' if using emulator without adb reverse
  ios: 'localhost',
  default: 'localhost',
});
const LOCAL_API_URL = `http://${HOST}:8000/api/v1`;

// Determine if we are running in a standalone build (EAS preview/production APK/IPA)
// vs. Expo Go / dev client (npm run start). In standalone builds, .env files are NOT
// available unless baked in via eas.json env, so we must default to the production URL.
const isStandaloneBuild = Constants.executionEnvironment === 'standalone' ||
  Constants.appOwnership === null ||
  Constants.appOwnership === undefined;

// Priority: EXPO_PUBLIC env var > standalone detection > local dev fallback
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  (isStandaloneBuild ? PRODUCTION_API_URL : LOCAL_API_URL);

// Mock User Token for authentication (since we bypass full signup for simplicity)
// In a production app, this would be retrieved from Supabase Auth Session
export const AUTH_HEADER = {
  Authorization: 'Bearer mock-user-session-token-12345',
};

