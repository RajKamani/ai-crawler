import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Animated,
  Dimensions,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';

type ToastType = 'success' | 'error' | 'info';

interface ToastOptions {
  message: string;
  type?: ToastType;
  duration?: number;
}

interface ToastContextType {
  showToast: (options: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const colors = useTheme();
  const isDark = colors.isDark;

  const [toast, setToast] = useState<ToastOptions | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismissToast = useCallback(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 20,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setToast(null);
    });
  }, [fadeAnim, slideAnim]);

  const showToast = useCallback(
    ({ message, type = 'info', duration = 3000 }: ToastOptions) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      setToast({ message, type, duration });
      
      // Reset animations
      fadeAnim.setValue(0);
      slideAnim.setValue(30);

      // Animate in
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();

      // Schedule dismiss
      timerRef.current = setTimeout(() => {
        dismissToast();
      }, duration);
    },
    [fadeAnim, slideAnim, dismissToast]
  );

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // Determine styles depending on ToastType
  const getToastStyles = () => {
    if (!toast) return { accentColor: colors.primary, icon: 'information-circle-outline' as const };
    switch (toast.type) {
      case 'success':
        return {
          accentColor: '#2b8a3e',
          icon: 'checkmark-circle-outline' as const,
        };
      case 'error':
        return {
          accentColor: '#bc000a',
          icon: 'alert-circle-outline' as const,
        };
      case 'info':
      default:
        return {
          accentColor: isDark ? colors.primary : '#00647f',
          icon: 'information-circle-outline' as const,
        };
    }
  };

  const { accentColor, icon } = getToastStyles();

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast && (
        <Animated.View
          style={[
            styles.toastContainer,
            {
              backgroundColor: isDark ? '#1a1a1a' : '#ffffff',
              borderColor: colors.border,
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={[styles.borderIndicator, { backgroundColor: accentColor }]} />
          <View style={styles.toastContent}>
            <Ionicons name={icon} size={20} color={accentColor} style={styles.toastIcon} />
            <Text style={[styles.toastText, { color: colors.text }]} numberOfLines={3}>
              {toast.message.toUpperCase()}
            </Text>
            <Pressable onPress={dismissToast} style={styles.closeBtn}>
              <Ionicons name="close" size={16} color={colors.tabIconDefault} />
            </Pressable>
          </View>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
};

const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    bottom: 80, // Positioned above bottom tab bar
    left: 20,
    right: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 9999,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 0,
    overflow: 'hidden',
  },
  borderIndicator: {
    width: 4,
    height: '100%',
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
  },
  toastContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 16,
    paddingRight: 10,
    paddingVertical: 12,
  },
  toastIcon: {
    marginRight: 10,
  },
  toastText: {
    flex: 1,
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'SpaceMono',
    lineHeight: 15,
  },
  closeBtn: {
    padding: 4,
    marginLeft: 8,
  },
});
