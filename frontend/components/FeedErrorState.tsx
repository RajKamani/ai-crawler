import React from 'react';
import { StyleSheet, View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';

interface FeedErrorStateProps {
  message?: string;
  onRetry: () => void;
}

/**
 * Branded full-screen error state with brutalist design.
 * Used inside FlatList ListEmptyComponent when API calls fail.
 */
export const FeedErrorState: React.FC<FeedErrorStateProps> = ({
  message = 'CONNECTION ERROR — UNABLE TO REACH SERVER',
  onRetry,
}) => {
  const colors = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.iconBox,
          {
            borderColor: colors.primary,
            backgroundColor: colors.surfaceContainer,
          },
        ]}
      >
        <Ionicons name="warning-outline" size={40} color={colors.primary} />
      </View>

      <Text style={[styles.title, { color: colors.text }]}>SOMETHING WENT WRONG</Text>
      <Text style={[styles.message, { color: colors.tabIconDefault }]}>
        {message}
      </Text>

      <Pressable
        style={[
          styles.retryButton,
          {
            backgroundColor: colors.primary,
            borderColor: colors.border,
          },
        ]}
        onPress={onRetry}
      >
        <Ionicons name="refresh" size={16} color="#ffffff" />
        <Text style={styles.retryText}>RETRY CONNECTION</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
    gap: 16,
  },
  iconBox: {
    width: 72,
    height: 72,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    fontFamily: 'SpaceMono-Bold',
    textAlign: 'center',
  },
  message: {
    fontSize: 11,
    fontFamily: 'SpaceMono',
    textAlign: 'center',
    lineHeight: 17,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderWidth: 1,
    marginTop: 8,
  },
  retryText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'SpaceMono-Bold',
    letterSpacing: 0.5,
  },
});
