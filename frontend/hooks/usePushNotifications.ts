import { useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { API_BASE_URL, AUTH_HEADER } from '@/constants/Config';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface NotificationHistoryItem {
  id: string;
  title: string;
  body: string;
  receivedAt: string;
  isRead: boolean;
  data?: any;
}

// Detect if we are running in the Expo Go client
const isExpoGo = Constants.appOwnership === 'expo';

// Only configure the foreground notification handler outside Expo Go
if (!isExpoGo) {
  try {
    const Notifications = require('expo-notifications');
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  } catch (e) {
    console.warn('Failed to initialize Notifications handler:', e);
  }
}

export const saveNotificationToHistory = async (notifId: string, title: string, body: string, data?: any) => {
  try {
    const stored = await AsyncStorage.getItem('@notification_history');
    let history: NotificationHistoryItem[] = [];
    if (stored) {
      history = JSON.parse(stored);
    }

    if (history.some(item => item.id === notifId)) {
      return; // Already recorded
    }

    const newItem: NotificationHistoryItem = {
      id: notifId,
      title,
      body,
      receivedAt: new Date().toISOString(),
      isRead: false,
      data,
    };

    history = [newItem, ...history].slice(0, 50);
    await AsyncStorage.setItem('@notification_history', JSON.stringify(history));
    
    // Emit local event so views can update badges in real-time
    const { DeviceEventEmitter } = require('react-native');
    DeviceEventEmitter.emit('notificationReceived');
  } catch (e) {
    console.error('Failed to save notification to history:', e);
  }
};

export const usePushNotifications = () => {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [notification, setNotification] = useState<any>(null);
  const notificationListener = useRef<any>(null);
  const responseListener = useRef<any>(null);

  const registerForPushNotifications = async () => {
    if (isExpoGo) {
      console.log('[Push] Remote push notifications are disabled in Expo Go. Use a development build.');
      return null;
    }

    try {
      const Device = require('expo-device');
      const Notifications = require('expo-notifications');

      if (!Device.isDevice) {
        console.log('Must use physical device for Push Notifications');
        return null;
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Failed to get push token for push notification!');
        return null;
      }

      // Read project ID from Expo configuration
      const projectId =
        Constants.easConfig?.projectId ||
        Constants.expoConfig?.extra?.eas?.projectId;

      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId,
      });
      const token = tokenData.data;

      // Save push token to backend
      const response = await fetch(`${API_BASE_URL}/notifications/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...AUTH_HEADER,
        },
        body: JSON.stringify({
          expo_push_token: token,
          device_name: Device.modelName || 'Unknown Device',
        }),
      });

      if (response.ok) {
        setExpoPushToken(token);
        await AsyncStorage.setItem('@expo_push_token', token);
        await AsyncStorage.setItem('@push_enabled', 'true');
        console.log('Expo Push Token registered successfully:', token);
      } else {
        console.error('Failed to register push token on backend:', response.status);
      }

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }

      return token;
    } catch (error) {
      console.error('Error registering for push notifications:', error);
      return null;
    }
  };

  const unregisterForPushNotifications = async () => {
    if (isExpoGo) return;
    try {
      const Device = require('expo-device');
      const token = await AsyncStorage.getItem('@expo_push_token');
      if (token) {
        await fetch(`${API_BASE_URL}/notifications/unregister`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...AUTH_HEADER,
          },
          body: JSON.stringify({
            expo_push_token: token,
            device_name: Device.modelName || 'Unknown Device',
          }),
        });
      }
      setExpoPushToken(null);
      await AsyncStorage.removeItem('@expo_push_token');
      await AsyncStorage.setItem('@push_enabled', 'false');
      console.log('Expo Push Token unregistered successfully');
    } catch (error) {
      console.error('Error unregistering push notifications:', error);
    }
  };

  useEffect(() => {
    if (isExpoGo) {
      return;
    }

    try {
      const Notifications = require('expo-notifications');

      const checkPreviousRegistration = async () => {
        const isEnabled = await AsyncStorage.getItem('@push_enabled');
        if (isEnabled === 'true') {
          await registerForPushNotifications();
        }
      };
      checkPreviousRegistration();

      // Listener for foreground notifications
      notificationListener.current = Notifications.addNotificationReceivedListener(
        (notif: any) => {
          setNotification(notif);
          const notifId = notif.request.identifier || Math.random().toString(36).substring(2, 9);
          const title = notif.request.content.title || 'New Alert';
          const body = notif.request.content.body || '';
          const data = notif.request.content.data || null;
          saveNotificationToHistory(notifId, title, body, data);
        }
      );

      // Listener for when user taps the notification
      responseListener.current = Notifications.addNotificationResponseReceivedListener(
        (response: any) => {
          const notif = response.notification;
          const notifId = notif.request.identifier || Math.random().toString(36).substring(2, 9);
          const title = notif.request.content.title || 'New Alert';
          const body = notif.request.content.body || '';
          const data = notif.request.content.data || null;
          saveNotificationToHistory(notifId, title, body, data);
          
          router.push('/(tabs)/digest' as any);
        }
      );
    } catch (e) {
      console.warn('Failed to register notification listeners:', e);
    }

    return () => {
      try {
        if (notificationListener.current) {
          notificationListener.current.remove();
        }
        if (responseListener.current) {
          responseListener.current.remove();
        }
      } catch (e) {
        // ignore
      }
    };
  }, []);

  return {
    expoPushToken,
    notification,
    registerForPushNotifications,
    unregisterForPushNotifications,
  };
};
