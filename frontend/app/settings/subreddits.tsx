import React from 'react';
import { StyleSheet, View, Text, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SubredditManager } from '@/components/SubredditManager';
import { useUserSubreddits } from '@/hooks/useUserSubreddits';

export default function ManageSubredditsScreen() {
  const router = useRouter();
  const {
    subreddits,
    suggestions,
    isLoading,
    addSubreddit,
    removeSubreddit,
    toggleSubreddit,
  } = useUserSubreddits();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Navigation Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </Pressable>
        <Text style={styles.headerTitle}>Manage Subreddits</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <SubredditManager
          subreddits={subreddits}
          suggestions={suggestions}
          isLoading={isLoading}
          onAddSubreddit={addSubreddit}
          onRemoveSubreddit={removeSubreddit}
          onToggleSubreddit={toggleSubreddit}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121214',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E1E24',
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1E1E24',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#2A2A32',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  scrollContent: {
    padding: 20,
  },
});
