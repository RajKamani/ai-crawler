import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { API_BASE_URL, AUTH_HEADER } from '@/constants/Config';
import { PostType } from '@/components/PostCard';
import { InshortsCard } from '@/components/InshortsCard';

export default function GitHubScreen() {
  const [posts, setPosts] = useState<PostType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Height container measurement
  const [containerHeight, setContainerHeight] = useState(0);

  useEffect(() => {
    fetchPosts(1, true);
  }, []);

  const fetchPosts = async (pageNum: number, shouldReset = false) => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/posts?type=github&page=${pageNum}&limit=10`,
        { headers: { ...AUTH_HEADER } }
      );
      const data = await response.json();

      if (response.ok) {
        const newPosts = data.posts || [];
        if (shouldReset) {
          setPosts(newPosts);
        } else {
          setPosts((prev) => [...prev, ...newPosts]);
        }
        setPage(pageNum);
        setHasMore(newPosts.length === 10);
      }
    } catch (error) {
      console.error('Error fetching GitHub trending:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchPosts(1, true);
  };

  const handleLoadMore = () => {
    if (!isLoading && hasMore) {
      fetchPosts(page + 1);
    }
  };

  const handleToggleBookmark = async (postId: string, isBookmarked: boolean) => {
    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, is_bookmarked: !isBookmarked } : p))
    );

    try {
      const method = isBookmarked ? 'DELETE' : 'POST';
      const url = isBookmarked
        ? `${API_BASE_URL}/bookmarks/${postId}`
        : `${API_BASE_URL}/bookmarks`;
      const body = isBookmarked ? undefined : JSON.stringify({ post_id: postId });

      await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...AUTH_HEADER,
        },
        body,
      });
    } catch (error) {
      console.error('Error bookmarking:', error);
    }
  };

  const handleSummarize = async (postId: string): Promise<string | null> => {
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
        setPosts((prev) =>
          prev.map((p) => (p.id === postId ? { ...p, ai_summary: data.summary } : p))
        );
        return data.summary;
      }
      return null;
    } catch (error) {
      console.error('Error summarization:', error);
      return null;
    }
  };

  const renderItem = useCallback(
    ({ item }: { item: PostType }) => {
      if (containerHeight === 0) return null;
      return (
        <InshortsCard
          post={item}
          containerHeight={containerHeight}
          onToggleBookmark={handleToggleBookmark}
          onSummarize={handleSummarize}
        />
      );
    },
    [containerHeight]
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>GitHub Trending</Text>
        <Text style={styles.headerSubtitle}>Active AI & LLM Repositories (Last 7 Days)</Text>
      </View>

      {/* Main Snapping Area */}
      <View
        style={styles.feedWrapper}
        onLayout={(e) => setContainerHeight(e.nativeEvent.layout.height)}
      >
        {containerHeight > 0 && (
          <FlatList
            data={posts}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            pagingEnabled={true}
            decelerationRate="fast"
            snapToInterval={containerHeight}
            snapToAlignment="start"
            showsVerticalScrollIndicator={false}
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.5}
            getItemLayout={(data, index) => ({
              length: containerHeight,
              offset: containerHeight * index,
              index,
            })}
            ListEmptyComponent={
              isLoading ? (
                <View style={styles.centerContainer}>
                  <ActivityIndicator size="large" color="#58A6FF" />
                </View>
              ) : (
                <View style={styles.emptyContainer}>
                  <Ionicons name="logo-github" size={48} color="#3A3A42" />
                  <Text style={styles.emptyText}>No repositories available.</Text>
                </View>
              )
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E1E24',
    backgroundColor: '#000000',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
  },
  headerSubtitle: {
    color: '#58A6FF',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  feedWrapper: {
    flex: 1,
    width: '100%',
    backgroundColor: '#000000',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 100,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 100,
    gap: 12,
  },
  emptyText: {
    color: '#8E8E93',
    fontSize: 14,
    textAlign: 'center',
  },
});
