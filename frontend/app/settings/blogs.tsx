import React from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import { BlogManager } from '@/components/BlogManager';
import { useUserBlogs } from '@/hooks/useUserBlogs';

export default function ManageBlogsScreen() {
  const {
    blogs,
    suggestions,
    isLoading,
    addBlog,
    removeBlog,
    toggleBlog,
  } = useUserBlogs();

  return (
    <View style={styles.container}>
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
