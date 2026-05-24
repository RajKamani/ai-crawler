import React from 'react';
import { StyleSheet, View, Text, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { BlogManager } from '@/components/BlogManager';
import { useUserBlogs } from '@/hooks/useUserBlogs';

export default function ManageBlogsScreen() {
  const router = useRouter();
  const {
    blogs,
    suggestions,
    isLoading,
    addBlog,
    removeBlog,
    toggleBlog,
  } = useUserBlogs();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Navigation Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </Pressable>
        <Text style={styles.headerTitle}>Manage Custom Blogs</Text>
      </View>

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
