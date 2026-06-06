import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  Animated,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { API_BASE_URL, AUTH_HEADER } from '@/constants/Config';
import { PostType } from '@/components/PostCard';
import { InshortsCard } from '@/components/InshortsCard';
import { useViewedPosts } from '@/hooks/useViewedPosts';
import { useTheme } from '@/hooks/useTheme';
import { Header } from '@/components/Header';
import { SkeletonCard } from '@/components/SkeletonCard';
import { FeedErrorState } from '@/components/FeedErrorState';
import { useHaptics } from '@/hooks/useHaptics';

export default function BookmarksScreen() {
  const colors = useTheme();
  const [posts, setPosts] = useState<PostType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [containerHeight, setContainerHeight] = useState(0);
  const [activePostId, setActivePostId] = useState<string | null>(null);

  const { viewedIds, markAsViewed } = useViewedPosts();
  const { triggerLight, triggerMedium } = useHaptics();

  useEffect(() => {
    fetchBookmarks();
  }, []);

  // Set first post as active on load/reset
  useEffect(() => {
    if (posts.length > 0 && !activePostId) {
      setActivePostId(posts[0].id);
    }
  }, [posts, activePostId]);

  const fetchBookmarks = async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/bookmarks`, {
        headers: { ...AUTH_HEADER },
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setPosts(data.posts || []);
    } catch (error: any) {
      console.error('Error fetching bookmarks:', error);
      setFetchError(error.message || 'Failed to load bookmarks');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    triggerLight();
    setIsRefreshing(true);
    fetchBookmarks();
  };

  const handleToggleBookmark = async (postId: string, isBookmarked: boolean) => {
    triggerMedium();
    // Optimistically remove it from bookmarks view
    setPosts((prev) => prev.filter((p) => p.id !== postId));

    try {
      const url = `${API_BASE_URL}/bookmarks/${postId}`;
      const response = await fetch(url, {
        method: 'DELETE',
        headers: { ...AUTH_HEADER },
      });
      if (!response.ok) {
        throw new Error('Failed to remove bookmark');
      }
    } catch (error) {
      console.error('Error removing bookmark:', error);
      // Re-fetch to restore list on error
      fetchBookmarks();
    }
  };

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems && viewableItems.length > 0) {
      const activePost = viewableItems[0].item;
      if (activePost && activePost.id) {
        markAsViewed(activePost.id);
        setActivePostId(activePost.id);
      }
    }
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  const renderItem = useCallback(
    ({ item }: { item: PostType }) => {
      if (containerHeight === 0) return null;
      // Force is_bookmarked to true here since these are bookmarks
      const bookmarkedItem = { ...item, is_bookmarked: true };
      return (
        <InshortsCard
          post={bookmarkedItem}
          containerHeight={containerHeight}
          onToggleBookmark={handleToggleBookmark}
          isViewed={viewedIds.has(item.id)}
          isActive={activePostId === item.id}
        />
      );
    },
    [containerHeight, viewedIds, activePostId]
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <Header
        title="BOOKMARKS"
        subtitle="SAVED STORIES // READ LATER"
      />

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
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={viewabilityConfig}
            getItemLayout={(data, index) => ({
              length: containerHeight,
              offset: containerHeight * index,
              index,
            })}
            ListEmptyComponent={
              isLoading ? (
                <View style={{ flex: 1, height: containerHeight }}>
                  <SkeletonCard containerHeight={containerHeight} />
                </View>
              ) : fetchError ? (
                <FeedErrorState
                  message={fetchError.toUpperCase()}
                  onRetry={handleRefresh}
                />
              ) : (
                <View style={[styles.emptyContainer, { backgroundColor: colors.background }]}>
                  <View style={[styles.emptyIconBox, { borderColor: colors.border, backgroundColor: colors.surfaceContainer }]}>
                    <Ionicons name="bookmark-outline" size={40} color={colors.primary} />
                  </View>
                  <Text style={[styles.emptyTitle, { color: colors.text }]}>NO BOOKMARKS SAVED</Text>
                  <Text style={[styles.emptySubtitle, { color: colors.tabIconDefault }]}>
                    Tap the bookmark icon on any card{`\n`}to save articles for offline reading.
                  </Text>
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
    backgroundColor: '#fcf9f8',
  },
  feedWrapper: {
    flex: 1,
    width: '100%',
    backgroundColor: '#fcf9f8',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 120,
    paddingHorizontal: 32,
    gap: 16,
    backgroundColor: '#fcf9f8',
  },
  emptyIconBox: {
    width: 72,
    height: 72,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'SpaceMono',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 12,
    fontFamily: 'SpaceMono',
    textAlign: 'center',
    lineHeight: 18,
  },
});
