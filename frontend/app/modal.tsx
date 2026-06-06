import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  Pressable,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { Stack, router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '@/hooks/useTheme';
import { NotificationHistoryItem } from '@/hooks/usePushNotifications';
import { useToast } from '@/context/ToastContext';
import { useSummary } from '@/context/SummaryContext';

export default function NotificationsModalScreen() {
  const colors = useTheme();
  const isDark = colors.isDark;
  const { showToast } = useToast();
  const { requestSummary } = useSummary();

  const [notifications, setNotifications] = useState<NotificationHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadNotifications = async () => {
    setIsLoading(true);
    try {
      const stored = await AsyncStorage.getItem('@notification_history');
      if (stored) {
        setNotifications(JSON.parse(stored));
      } else {
        setNotifications([]);
      }
    } catch (e) {
      console.error('Failed to load notifications history:', e);
      showToast({ message: 'Failed to load notifications history', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const markAsRead = async (id: string) => {
    try {
      const updated = notifications.map((item) => {
        if (item.id === id) {
          return { ...item, isRead: true };
        }
        return item;
      });
      setNotifications(updated);
      await AsyncStorage.setItem('@notification_history', JSON.stringify(updated));

      // Emit local event so Home screen bell badge updates in real-time
      const { DeviceEventEmitter } = require('react-native');
      DeviceEventEmitter.emit('notificationReceived');
    } catch (e) {
      console.error('Failed to mark notification as read:', e);
      showToast({ message: 'Error marking notification read', type: 'error' });
    }
  };

  const handleClearAll = async () => {
    try {
      setNotifications([]);
      await AsyncStorage.removeItem('@notification_history');

      const { DeviceEventEmitter } = require('react-native');
      DeviceEventEmitter.emit('notificationReceived');
      showToast({ message: 'All notifications cleared', type: 'success' });
    } catch (e) {
      console.error('Failed to clear notifications:', e);
      showToast({ message: 'Failed to clear notifications', type: 'error' });
    }
  };

  const handleItemPress = async (item: NotificationHistoryItem) => {
    await markAsRead(item.id);
    router.dismiss();
    if (item.data && item.data.post_id) {
      router.replace('/(tabs)' as any);
      setTimeout(() => {
        requestSummary(String(item.data.post_id), item.body || item.title);
      }, 100);
    } else {
      router.push('/(tabs)/digest' as any);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const renderItem = ({ item }: { item: NotificationHistoryItem }) => {
    const isUnread = !item.isRead;
    const isReddit = item.data?.source_type === 'reddit';
    const isGithub = item.data?.source_type === 'github';

    let iconName: any = 'newspaper-outline';
    let iconColor = colors.primary;
    if (isReddit) {
      iconName = 'logo-reddit';
      iconColor = isDark ? '#ff6b6b' : '#aa352b';
    } else if (isGithub) {
      iconName = 'logo-github';
      iconColor = isDark ? '#68d3fc' : '#00647f';
    }

    return (
      <Pressable
        style={[
          styles.itemCard,
          {
            backgroundColor: colors.surfaceContainer,
            borderColor: colors.border,
          },
          isUnread && {
            backgroundColor: isDark ? '#231514' : '#fff0ef',
            borderColor: colors.primary,
            borderWidth: 1.5,
          },
        ]}
        onPress={() => handleItemPress(item)}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.iconBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Ionicons name={iconName} size={18} color={iconColor} />
          </View>
          <View style={styles.metaBox}>
            <Text style={[styles.timeText, { color: colors.tabIconDefault }]}>
              {formatDate(item.receivedAt)}
            </Text>
            {isUnread && (
              <View style={[styles.unreadBadge, { backgroundColor: colors.primary }]}>
                <Text style={styles.unreadBadgeText}>NEW</Text>
              </View>
            )}
          </View>
        </View>

        <Text style={[styles.itemTitle, { color: colors.text }, isUnread && { fontWeight: '800' }]} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={[styles.itemBody, { color: colors.text }]} numberOfLines={2}>
          {item.body}
        </Text>

        <View style={styles.actionRow}>
          <Text style={[styles.tapText, { color: colors.primary }]}>TAP TO OPEN STORIES</Text>
          <Ionicons name="chevron-forward" size={12} color={colors.primary} />
        </View>
      </Pressable>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Set dynamic stack header options */}
      <Stack.Screen
        options={{
          title: 'NOTIFICATIONS',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerTitleStyle: { fontFamily: 'SpaceMono', fontWeight: '800', fontSize: 16 },
          headerShadowVisible: false,
        }}
      />

      <StatusBar style={Platform.OS === 'ios' ? 'light' : 'auto'} />

      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.centerContainer}>
          <View style={[styles.emptyIconContainer, { backgroundColor: colors.surfaceContainer, borderColor: colors.border }]}>
            <Ionicons name="notifications-off-outline" size={40} color={colors.tabIconDefault} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>NO NOTIFICATIONS</Text>
          <Text style={[styles.emptySubtitle, { color: colors.tabIconDefault }]}>
            Alerts about new articles, blog updates, or reddit posts will appear here.
          </Text>
        </View>
      ) : (
        <View style={styles.mainContent}>
          <View style={styles.actionsBar}>
            <Text style={[styles.trayTitle, { color: colors.text }]}>
              RECENT ALERTS ({notifications.length})
            </Text>
            <Pressable
              style={[styles.clearBtn, { borderColor: colors.border, backgroundColor: colors.surfaceContainer }]}
              onPress={handleClearAll}
            >
              <Ionicons name="trash-outline" size={14} color={colors.primary} />
              <Text style={[styles.clearBtnText, { color: colors.primary }]}>CLEAR ALL</Text>
            </Pressable>
          </View>

          <FlatList
            data={notifications}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 12,
  },
  mainContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  actionsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 8,
  },
  trayTitle: {
    fontSize: 12,
    fontWeight: '800',
    fontFamily: 'SpaceMono',
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 0,
  },
  clearBtnText: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'SpaceMono',
  },
  listContent: {
    gap: 16,
    paddingBottom: 40,
  },
  itemCard: {
    borderWidth: 1,
    padding: 16,
    borderRadius: 0,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderWidth: 0.75,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeText: {
    fontSize: 11,
    fontFamily: 'SpaceMono',
  },
  unreadBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 2,
  },
  unreadBadgeText: {
    color: '#ffffff',
    fontSize: 8,
    fontWeight: '800',
    fontFamily: 'SpaceMono',
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 18,
    fontFamily: 'SpaceMono',
    marginBottom: 4,
  },
  itemBody: {
    fontSize: 12,
    lineHeight: 18,
    fontFamily: 'SpaceMono',
    opacity: 0.85,
    marginBottom: 12,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tapText: {
    fontSize: 9,
    fontWeight: '800',
    fontFamily: 'SpaceMono',
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    fontFamily: 'SpaceMono',
  },
  emptySubtitle: {
    fontSize: 12,
    fontFamily: 'SpaceMono',
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 280,
  },
});
