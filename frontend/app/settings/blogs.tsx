import React from 'react';
import { StyleSheet, View, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { BlogManager } from '@/components/BlogManager';
import { useUserBlogs } from '@/hooks/useUserBlogs';
import { useTheme } from '@/hooks/useTheme';

export default function ManageBlogsScreen() {
  const colors = useTheme();
  const {
    blogs,
    suggestions,
    isLoading,
    addBlog,
    removeBlog,
    toggleBlog,
  } = useUserBlogs();

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <BlogManager
            blogs={blogs}
            suggestions={suggestions}
            isLoading={isLoading}
            onAddBlog={addBlog}
            onRemoveBlog={removeBlog}
            onToggleBlog={toggleBlog}
          />
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
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
