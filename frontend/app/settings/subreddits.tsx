import React from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import { SubredditManager } from '@/components/SubredditManager';
import { useUserSubreddits } from '@/hooks/useUserSubreddits';

export default function ManageSubredditsScreen() {
  const {
    subreddits,
    suggestions,
    isLoading,
    addSubreddit,
    removeSubreddit,
    toggleSubreddit,
  } = useUserSubreddits();

  return (
    <View style={styles.container}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fcf9f8',
  },
  scrollContent: {
    padding: 20,
  },
});
