import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useNavigation } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '@/hooks/useTheme';
import { useSummary } from '@/context/SummaryContext';
import { useToast } from '@/context/ToastContext';

interface HeaderProps {
  title: string;
  subtitle: string;
  titleIcon?: React.ReactNode;
  unreadCount?: number;
}

export const Header: React.FC<HeaderProps> = ({ title, subtitle, titleIcon, unreadCount }) => {
  const colors = useTheme();
  const { allowanceRemaining, fetchAllowance } = useSummary();
  const { showToast } = useToast();
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);
  const navigation = useNavigation();

  const checkUnreadNotifications = async () => {
    try {
      const stored = await AsyncStorage.getItem('@notification_history');
      if (stored) {
        const history = JSON.parse(stored);
        const hasUnread = history.some((item: any) => !item.isRead);
        setHasUnreadNotifications(hasUnread);
      } else {
        setHasUnreadNotifications(false);
      }
    } catch (e) {
      console.error('Failed to check unread notifications:', e);
    }
  };

  useEffect(() => {
    checkUnreadNotifications();

    const { DeviceEventEmitter } = require('react-native');
    const sub = DeviceEventEmitter.addListener('notificationReceived', () => {
      checkUnreadNotifications();
    });

    const unsubscribeFocus = navigation.addListener('focus', () => {
      checkUnreadNotifications();
      fetchAllowance();
    });

    return () => {
      sub.remove();
      unsubscribeFocus();
    };
  }, [navigation]);

  return (
    <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
      <View style={styles.titleContainer}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {titleIcon}
          <Text style={[styles.headerTitle, { color: colors.text }]}>{title}</Text>
          {unreadCount !== undefined && unreadCount > 0 && (
            <View style={[styles.unreadBadge, { backgroundColor: colors.primary }]}>
              <Text style={styles.unreadBadgeText}>{unreadCount} NEW</Text>
            </View>
          )}
        </View>
        <Text style={[styles.headerSubtitle, { color: colors.primary }]}>{subtitle}</Text>
      </View>

      <View style={styles.headerRight}>
        <Pressable
          style={[styles.creditsBadge, { borderColor: colors.border, backgroundColor: colors.surfaceContainer }]}
          onPress={() => {
            showToast({
              message: allowanceRemaining !== null
                ? `You have ${allowanceRemaining} daily AI Summary credits remaining.`
                : 'Loading your daily AI Summary credits...',
              type: 'success'
            });
          }}
        >
          <Ionicons name="sparkles-outline" size={12} color={colors.primary} />
          <Text style={[styles.creditsText, { color: colors.text }]}>
            {allowanceRemaining !== null ? `${allowanceRemaining} AI SUMMARIES` : '...'}
          </Text>
        </Pressable>

        <Pressable
          style={styles.bellButton}
          onPress={() => router.push('/modal' as any)}
        >
          <Ionicons name="notifications-outline" size={24} color={colors.text} />
          {hasUnreadNotifications && (
            <View style={[styles.bellRedDot, { backgroundColor: colors.primary, borderColor: colors.background }]} />
          )}
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  titleContainer: {
    flexDirection: 'column',
    flex: 1,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    fontFamily: 'SpaceMono',
  },
  unreadBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 2,
  },
  unreadBadgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '700',
    fontFamily: 'SpaceMono',
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'SpaceMono',
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  creditsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderRadius: 2,
  },
  creditsText: {
    fontSize: 10,
    fontFamily: 'SpaceMono',
    fontWeight: '700',
  },
  bellButton: {
    padding: 6,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bellRedDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 9,
    height: 9,
    borderRadius: 4.5,
    borderWidth: 1.5,
  },
});
