import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { API_BASE_URL, AUTH_HEADER } from '@/constants/Config';
import { PostCard, PostType } from '@/components/PostCard';
import { GitHubRepoCard } from '@/components/GitHubRepoCard';
import { SummarizeSheet } from '@/components/SummarizeSheet';
import { useTheme } from '@/hooks/useTheme';

export default function BookmarksScreen() {
  const colors = useTheme();
  const [posts, setPosts] = useState<PostType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // AI Summary Sheet states
  const [sheetVisible, setSheetVisible] = useState(false);
  const [activePostTitle, setActivePostTitle] = useState('');
  const [activeSummary, setActiveSummary] = useState<string | null>(null);
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);

  useEffect(() => {
    fetchBookmarks();
  }, []);

  const fetchBookmarks = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/bookmarks`, {
        headers: { ...AUTH_HEADER },
      });
      const data = await response.json();
      if (response.ok) {
        setPosts(data.posts || []);
      }
    } catch (error) {
      console.error('Error fetching bookmarks:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchBookmarks();
  };

  const handleToggleBookmark = async (postId: string, isBookmarked: boolean) => {
    // Since this is the bookmarks screen, untoggling a bookmark should remove it from the list!
    setPosts((prev) => prev.filter((p) => p.id !== postId));

    try {
      const url = `${API_BASE_URL}/bookmarks/${postId}`;
      await fetch(url, {
        method: 'DELETE',
        headers: { ...AUTH_HEADER },
      });
    } catch (error) {
      console.error('Error removing bookmark:', error);
      // Fetch list again on error to revert state
      fetchBookmarks();
    }
  };

  const handleSummarize = async (postId: string) => {
    const post = posts.find((p) => p.id === postId);
    if (!post) return;

    setActivePostTitle(post.title);
    setSheetVisible(true);
    setIsSummaryLoading(true);
    setActiveSummary(null);

    try {
      const response = await fetch(`${API_BASE_URL}/summary`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...AUTH_HEADER,
        },
        body: JSON.stringify({ post_id: postId }),
      });
      const data = await response.json();
      if (response.ok) {
        setActiveSummary(data.summary);
      } else {
        setActiveSummary('Failed to retrieve summary.');
      }
    } catch (error) {
      console.error('Error summarization:', error);
      setActiveSummary('Network error occurred during AI summary.');
    } finally {
      setIsSummaryLoading(false);
    }
  };

  const renderItem = useCallback(({ item }: { item: PostType }) => {
    if (item.sources?.type === 'github') {
      return (
        <GitHubRepoCard
          post={item}
          onSummarize={handleSummarize}
          onToggleBookmark={handleToggleBookmark}
        />
      );
    }
    return (
      <PostCard
        post={item}
        onSummarize={handleSummarize}
        onToggleBookmark={handleToggleBookmark}
      />
    );
  }, [posts]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* List */}
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshing={isRefreshing}
        onRefresh={handleRefresh}
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
          ) : (
            <View style={[styles.emptyContainer, { backgroundColor: colors.background }]}>
              <Ionicons name="bookmark-outline" size={48} color={colors.text} />
              <Text style={[styles.emptyText, { color: colors.tabIconDefault }]}>NO SAVED BOOKMARKS YET.</Text>
            </View>
          )
        }
      />

      {/* AI Summary Sheet */}
      <SummarizeSheet
        isVisible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        postTitle={activePostTitle}
        summary={activeSummary}
        isLoading={isSummaryLoading}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fcf9f8',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    gap: 12,
    backgroundColor: '#fcf9f8',
  },
  emptyText: {
    color: '#926f6a',
    fontSize: 13,
    textAlign: 'center',
    fontFamily: 'SpaceMono',
  },
});
