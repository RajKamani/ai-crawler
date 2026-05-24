import { Platform } from 'react-native';

// In Android emulator, 10.0.2.2 maps to the host machine's localhost.
// In iOS simulator or web, localhost works fine.
// Set to your LAN IP (e.g. 192.168.1.X) if testing on a physical device.
const HOST = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';

export const API_BASE_URL = `http://${HOST}:8000/api/v1`;

// Mock User Token for authentication (since we bypass full signup for simplicity)
// In a production app, this would be retrieved from Supabase Auth Session
export const AUTH_HEADER = {
  Authorization: 'Bearer mock-user-session-token-12345'
};
