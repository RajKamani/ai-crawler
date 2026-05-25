import { Platform } from 'react-native';

// If testing locally on a physical device, set HOST to your machine's LAN IP (e.g., '192.168.1.64').
// Run backend locally with: uvicorn app.main:app --reload --host 0.0.0.0
const HOST = Platform.select({
  android: '192.168.1.64', // Change to '10.0.2.2' if using emulator without adb reverse
  ios: 'localhost',
  default: 'localhost',
});

const LOCAL_API_URL = `http://${HOST}:8000/api/v1`;

// When backend is deployed to Render, paste your deployed URL here (e.g., 'https://your-service.onrender.com/api/v1')
const DEPLOYED_RENDER_URL = '';

export const API_BASE_URL = DEPLOYED_RENDER_URL || process.env.EXPO_PUBLIC_API_URL || LOCAL_API_URL;

// Mock User Token for authentication (since we bypass full signup for simplicity)
// In a production app, this would be retrieved from Supabase Auth Session
export const AUTH_HEADER = {
  Authorization: 'Bearer mock-user-session-token-12345'
};
