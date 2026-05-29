import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TextInput,
  ActivityIndicator,
  Pressable,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { API_BASE_URL, AUTH_HEADER } from '@/constants/Config';
import { PostType } from '@/components/PostCard';
import { InshortsCard } from '@/components/InshortsCard';
import { useViewedPosts } from '@/hooks/useViewedPosts';
import { useNewContentNotification } from '@/hooks/useNewContentNotification';

export default function HomeFeedScreen() {
  const [posts, setPosts] = useState<PostType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [sources, setSources] = useState<Array<{ id: string; name: string; type: string }>>([]);
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  
  // Height container measurement
  const [containerHeight, setContainerHeight] = useState(0);

  // Viewed posts and new data notification hooks
  const { viewedIds, markAsViewed } = useViewedPosts();
  const latestLocalPostId = posts.length > 0 ? posts[0].id : null;
  const { newPostsAvailable, setNewPostsAvailable } = useNewContentNotification(latestLocalPostId);

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

  // Fetch active sources on mount
  useEffect(() => {
    const fetchSources = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/posts/sources`, {
          headers: { ...AUTH_HEADER },
        });
        const data = await response.json();
        if (response.ok) {
          setSources(data.sources || []);
        }
      } catch (error) {
        console.error('Error fetching sources:', error);
      }
    };
    fetchSources();
  }, []);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reset feed on search query or selected source change
  useEffect(() => {
    setHasMore(true);
    fetchFeed(1, true);
  }, [debouncedQuery, selectedSourceId]);

  const fetchFeed = async (pageNum: number, shouldReset = false) => {
    if (isLoading) return;
    setIsLoading(true);
    if (shouldReset) {
      setPosts([]);
    }
    try {
      let url = `${API_BASE_URL}/posts/personalized?page=${pageNum}&limit=10`;
      if (selectedSourceId) {
        url += `&source_id=${selectedSourceId}`;
      }
      if (debouncedQuery.trim()) {
        url = `${API_BASE_URL}/posts?page=${pageNum}&limit=10&q=${encodeURIComponent(
          debouncedQuery
        )}`;
        if (selectedSourceId) {
          url += `&source_id=${selectedSourceId}`;
        }
      }

      const response = await fetch(url, {
        headers: { ...AUTH_HEADER },
      });
      
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
      console.error('Error fetching feed:', error);
      setHasMore(false);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    setHasMore(true);
    fetchFeed(1, true);
  };

  const handleLoadMore = () => {
    if (!isLoading && hasMore && posts.length > 0) {
      fetchFeed(page + 1);
    }
  };

  const handleToggleBookmark = async (postId: string, isBookmarked: boolean) => {
    // Optimistic UI state update
    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, is_bookmarked: !isBookmarked } : p))
    );

    try {
      const method = isBookmarked ? 'DELETE' : 'POST';
      const url = isBookmarked
        ? `${API_BASE_URL}/bookmarks/${postId}`
        : `${API_BASE_URL}/bookmarks`;
      const body = isBookmarked ? undefined : JSON.stringify({ post_id: postId });

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...AUTH_HEADER,
        },
        body,
      });

      if (!response.ok) {
        // Revert on failure
        setPosts((prev) =>
          prev.map((p) => (p.id === postId ? { ...p, is_bookmarked: isBookmarked } : p))
        );
      }
    } catch (error) {
      console.error('Error bookmarking post:', error);
      // Revert on failure
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, is_bookmarked: isBookmarked } : p))
      );
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
        // Cache summary in local state list
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
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header Area */}
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={styles.headerTitle}>AI CRAWLER</Text>
          <Text style={styles.headerSubtitle}>PERSONALIZED FEED // INSHORTS</Text>
        </View>
      </View>

      {/* New updates banner */}
      {newPostsAvailable && (
        <Pressable
          style={styles.newPostsBanner}
          onPress={() => {
            setNewPostsAvailable(false);
            handleRefresh();
          }}
        >
          <Ionicons name="alert-circle" size={16} color="#ffffff" style={styles.bannerIcon} />
          <Text style={styles.newPostsBannerText}>NEW FEED UPDATES RECEIVED // TAP TO RELOAD</Text>
        </Pressable>
      )}

      {/* Search Input */}
      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color="#1c1b1b" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="SEARCH TOPICS, LIBRARIES, IDEAS..."
          placeholderTextColor="#926f6a"
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCorrect={false}
        />
        {searchQuery ? (
          <Pressable onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color="#1c1b1b" />
          </Pressable>
        ) : null}
      </View>

      {/* Scrollable Provider Selection Chips */}
      {sources.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipsScrollView}
          contentContainerStyle={styles.chipsContent}
        >
          <Pressable
            style={[
              styles.chipButton,
              selectedSourceId === null && styles.chipActive,
            ]}
            onPress={() => setSelectedSourceId(null)}
          >
            <Text
              style={[
                styles.chipText,
                selectedSourceId === null && styles.chipActiveText,
              ]}
            >
              ALL FEED
            </Text>
          </Pressable>
          {sources.map((src) => {
            const isActive = selectedSourceId === src.id;
            return (
              <Pressable
                key={src.id}
                style={[
                  styles.chipButton,
                  isActive && styles.chipActive,
                ]}
                onPress={() => setSelectedSourceId(src.id)}
              >
                <Text
                  style={[
                    styles.chipText,
                    isActive && styles.chipActiveText,
                  ]}
                >
                  {src.name.toUpperCase()}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

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
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={viewabilityConfig}
            getItemLayout={(data, index) => ({
              length: containerHeight,
              offset: containerHeight * index,
              index,
            })}
            ListEmptyComponent={
              isLoading ? (
                <View style={styles.centerContainer}>
                  <ActivityIndicator size="large" color="#bc000a" />
                </View>
              ) : (
                <View style={styles.emptyContainer}>
                  <Ionicons name="newspaper-outline" size={48} color="#1c1b1b" />
                  <Text style={styles.emptyText}>NO POSTS AVAILABLE IN YOUR FEED.</Text>
                </View>
              )
            }
            ListFooterComponent={
              isLoading && posts.length > 0 ? (
                <View style={styles.footerLoader}>
                  <ActivityIndicator size="small" color="#bc000a" />
                  <Text style={styles.footerLoaderText}>LOADING MORE POSTS...</Text>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fcf9f8',
    borderBottomWidth: 1,
    borderBottomColor: '#1c1b1b',
  },
  titleContainer: {
    flexDirection: 'column',
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
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0eded',
    borderRadius: 0,
    marginHorizontal: 20,
    marginVertical: 12,
    paddingHorizontal: 12,
    height: 40,
    borderWidth: 1,
    borderColor: '#1c1b1b',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#1c1b1b',
    fontSize: 13,
    fontFamily: 'SpaceMono',
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
  chipsScrollView: {
    maxHeight: 40,
    marginHorizontal: 20,
    marginBottom: 8,
  },
  chipsContent: {
    gap: 8,
    paddingRight: 20,
    alignItems: 'center',
  },
  chipButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#1c1b1b',
    backgroundColor: '#fcf9f8',
    borderRadius: 0,
  },
  chipActive: {
    backgroundColor: '#bc000a',
    borderColor: '#bc000a',
  },
  chipText: {
    color: '#1c1b1b',
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'SpaceMono',
  },
  chipActiveText: {
    color: '#ffffff',
  },
  newPostsBanner: {
    backgroundColor: '#bc000a',
    borderWidth: 1,
    borderColor: '#1c1b1b',
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 0,
    flexDirection: 'row',
    gap: 8,
    borderRadius: 0,
  },
  newPostsBannerText: {
    fontFamily: 'SpaceMono',
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
  },
  bannerIcon: {
    marginTop: -1,
  },
});
