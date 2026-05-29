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
import { useViewedPosts } from '@/hooks/useViewedPosts';
import { useTheme } from '@/hooks/useTheme';

export default function BlogsScreen() {
  const colors = useTheme();
  const [posts, setPosts] = useState<PostType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Height container measurement
  const [containerHeight, setContainerHeight] = useState(0);

  const { viewedIds, markAsViewed } = useViewedPosts();

  const onViewableItemsChanged = React.useRef(({ viewableItems }: any) => {
    if (viewableItems && viewableItems.length > 0) {
      const activePost = viewableItems[0].item;
      if (activePost && activePost.id) {
        markAsViewed(activePost.id);
      }
    }
  }).current;

  const viewabilityConfig = React.useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  useEffect(() => {
    fetchPosts(1, true);
  }, []);

  const fetchPosts = async (pageNum: number, shouldReset = false) => {
    if (isLoading) return;
    setIsLoading(true);
    if (shouldReset) {
      setPosts([]);
    }
    try {
      const response = await fetch(
        `${API_BASE_URL}/posts?type=blog&page=${pageNum}&limit=10`,
        { headers: { ...AUTH_HEADER } }
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const newPosts = data.posts || [];
      if (shouldReset) {
        setPosts(newPosts);
      } else {
        setPosts((prev) => [...prev, ...newPosts]);
      }
      setPage(pageNum);
      setHasMore(newPosts.length === 10);
    } catch (error) {
      console.error('Error fetching blogs:', error);
      setHasMore(false);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    setHasMore(true);
    fetchPosts(1, true);
  };

  const handleLoadMore = () => {
    if (!isLoading && hasMore && posts.length > 0) {
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
          isViewed={viewedIds.has(item.id)}
        />
      );
    },
    [containerHeight, viewedIds]
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>AI BLOGS</Text>
        <Text style={[styles.headerSubtitle, { color: colors.primary }]}>LATEST CORPORATE & CUSTOM RSS FEEDS</Text>
      </View>

      {/* Main Snapping Area */}
      <View
        style={[styles.feedWrapper, { backgroundColor: colors.background }]}
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
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={viewabilityConfig}
            getItemLayout={(data, index) => ({
              length: containerHeight,
              offset: containerHeight * index,
              index,
            })}
            ListEmptyComponent={
              isLoading ? (
                <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
                  <ActivityIndicator size="large" color={colors.primary} />
                </View>
              ) : (
                <View style={[styles.emptyContainer, { backgroundColor: colors.background }]}>
                  <Ionicons name="reader-outline" size={48} color={colors.text} />
                  <Text style={[styles.emptyText, { color: colors.tabIconDefault }]}>NO BLOG POSTS AVAILABLE.</Text>
                </View>
              )
            }
            ListFooterComponent={
              isLoading && posts.length > 0 ? (
                <View style={[styles.footerLoader, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={[styles.footerLoaderText, { color: colors.primary }]}>LOADING MORE BLOGS...</Text>
                </View>
              ) : null
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
    backgroundColor: '#fcf9f8',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1c1b1b',
    backgroundColor: '#fcf9f8',
  },
  headerTitle: {
    color: '#1c1b1b',
    fontSize: 22,
    fontWeight: '700',
    fontFamily: 'SpaceMono',
  },
  headerSubtitle: {
    color: '#bc000a',
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'SpaceMono',
    marginTop: 2,
  },
  feedWrapper: {
    flex: 1,
    width: '100%',
    backgroundColor: '#fcf9f8',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 100,
    backgroundColor: '#fcf9f8',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 100,
    gap: 12,
    backgroundColor: '#fcf9f8',
  },
  emptyText: {
    color: '#926f6a',
    fontSize: 13,
    textAlign: 'center',
    fontFamily: 'SpaceMono',
  },
  footerLoader: {
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fcf9f8',
    borderTopWidth: 1,
    borderTopColor: '#1c1b1b',
    flexDirection: 'row',
    gap: 8,
  },
  footerLoaderText: {
    color: '#bc000a',
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'SpaceMono',
  },
});
