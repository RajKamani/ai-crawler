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
import { router } from 'expo-router';
import { API_BASE_URL, AUTH_HEADER } from '@/constants/Config';
import { PostType } from '@/components/PostCard';
import { InshortsCard } from '@/components/InshortsCard';
import { useViewedPosts } from '@/hooks/useViewedPosts';
import { useNewContentNotification } from '@/hooks/useNewContentNotification';
import { useTheme } from '@/hooks/useTheme';

export default function HomeFeedScreen() {
  const colors = useTheme();
  const [posts, setPosts] = useState<PostType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [sources, setSources] = useState<Array<{ id: string; name: string; type: string }>>([]);
  const [sourcesLoaded, setSourcesLoaded] = useState(false);
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  
  // Height container measurement
  const [containerHeight, setContainerHeight] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnreadCount = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/posts/unread/count`, {
        headers: { ...AUTH_HEADER }
      });
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(data.unread_count || 0);
      }
    } catch (e) {
      console.error('Error fetching unread count:', e);
    }
  };

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
      } finally {
        setSourcesLoaded(true);
      }
    };
    fetchSources();
  }, []);

  // Fetch unread count on mount and when viewedIds size changes
  useEffect(() => {
    fetchUnreadCount();
  }, [viewedIds.size]);

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
      let url = `${API_BASE_URL}/posts?page=${pageNum}&limit=10`;
      if (selectedSourceId) {
        url += `&source_id=${selectedSourceId}`;
      }
      if (debouncedQuery.trim()) {
        url += `&q=${encodeURIComponent(debouncedQuery)}`;
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
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header Area */}
      <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <View style={styles.titleContainer}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>AI CRAWLER</Text>
            {unreadCount > 0 && (
              <View style={[styles.unreadBadge, { backgroundColor: colors.primary }]}>
                <Text style={styles.unreadBadgeText}>{unreadCount} NEW</Text>
              </View>
            )}
          </View>
          <Text style={[styles.headerSubtitle, { color: colors.primary }]}>PERSONALIZED FEED // INSHORTS</Text>
        </View>
      </View>

      {/* New updates banner */}
      {newPostsAvailable && (
        <Pressable
          style={[styles.newPostsBanner, { backgroundColor: colors.primary, borderColor: colors.border }]}
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
      <View style={[styles.searchBar, { backgroundColor: colors.surfaceContainer, borderColor: colors.border }]}>
        <Ionicons name="search" size={18} color={colors.text} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="SEARCH TOPICS, LIBRARIES, IDEAS..."
          placeholderTextColor={colors.tabIconDefault}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCorrect={false}
        />
        {searchQuery ? (
          <Pressable onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color={colors.text} />
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
              { borderColor: colors.border, backgroundColor: colors.background },
              selectedSourceId === null && { backgroundColor: colors.primary, borderColor: colors.primary },
            ]}
            onPress={() => setSelectedSourceId(null)}
          >
            <Text
              style={[
                styles.chipText,
                { color: colors.text },
                selectedSourceId === null && { color: '#ffffff' },
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
                  { borderColor: colors.border, backgroundColor: colors.background },
                  isActive && { backgroundColor: colors.primary, borderColor: colors.primary },
                ]}
                onPress={() => setSelectedSourceId(src.id)}
              >
                <Text
                  style={[
                    styles.chipText,
                    { color: colors.text },
                    isActive && { color: '#ffffff' },
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
              ) : sourcesLoaded && sources.length === 0 ? (
                // No sources selected at all — guide user to add some
                <View style={[styles.noSourcesContainer, { backgroundColor: colors.background }]}>
                  <View style={[styles.noSourcesIconBox, { borderColor: colors.border, backgroundColor: colors.surfaceContainer }]}>
                    <Ionicons name="add-circle-outline" size={40} color={colors.primary} />
                  </View>
                  <Text style={[styles.noSourcesTitle, { color: colors.text }]}>YOUR FEED IS EMPTY</Text>
                  <Text style={[styles.noSourcesSubtitle, { color: colors.tabIconDefault }]}>
                    You haven't added any sources yet.{`\n`}Follow subreddits or RSS blogs to start seeing personalised content.
                  </Text>
                  <Pressable
                    style={[styles.addSourcesBtn, { backgroundColor: colors.primary, borderColor: colors.border }]}
                    onPress={() => router.push('/settings')}
                  >
                    <Ionicons name="settings-outline" size={16} color="#ffffff" />
                    <Text style={styles.addSourcesBtnText}>GO TO SETTINGS → ADD SOURCES</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.addSourcesSecondaryBtn, { borderColor: colors.border, backgroundColor: colors.surfaceContainer }]}
                    onPress={() => router.push('/settings/subreddits')}
                  >
                    <Ionicons name="logo-reddit" size={14} color={colors.text} />
                    <Text style={[styles.addSourcesSecondaryText, { color: colors.text }]}>BROWSE POPULAR SUBREDDITS</Text>
                  </Pressable>
                </View>
              ) : (
                // Sources exist but no posts yet (crawl pending)
                <View style={[styles.emptyContainer, { backgroundColor: colors.background }]}>
                  <Ionicons name="hourglass-outline" size={48} color={colors.text} />
                  <Text style={[styles.emptyText, { color: colors.tabIconDefault }]}>CRAWLING YOUR SOURCES...</Text>
                  <Text style={[styles.emptySubText, { color: colors.tabIconDefault }]}>Posts will appear here shortly. Pull down to refresh.</Text>
                </View>
              )
            }
            ListFooterComponent={
              isLoading && posts.length > 0 ? (
                <View style={[styles.footerLoader, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={[styles.footerLoaderText, { color: colors.primary }]}>LOADING MORE POSTS...</Text>
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
  unreadBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 2,
  },
  unreadBadgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '700',
    fontFamily: 'SpaceMono',
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
    paddingVertical: 80,
    gap: 12,
    backgroundColor: '#fcf9f8',
    paddingHorizontal: 32,
  },
  emptyText: {
    color: '#926f6a',
    fontSize: 13,
    textAlign: 'center',
    fontFamily: 'SpaceMono',
  },
  emptySubText: {
    color: '#926f6a',
    fontSize: 11,
    textAlign: 'center',
    fontFamily: 'SpaceMono',
    lineHeight: 17,
  },
  noSourcesContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
    gap: 16,
    backgroundColor: '#fcf9f8',
  },
  noSourcesIconBox: {
    width: 72,
    height: 72,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  noSourcesTitle: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'SpaceMono',
    textAlign: 'center',
  },
  noSourcesSubtitle: {
    fontSize: 12,
    fontFamily: 'SpaceMono',
    textAlign: 'center',
    lineHeight: 18,
  },
  addSourcesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderWidth: 1,
    marginTop: 4,
    width: '100%',
    justifyContent: 'center',
  },
  addSourcesBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'SpaceMono',
  },
  addSourcesSecondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderWidth: 1,
    width: '100%',
    justifyContent: 'center',
  },
  addSourcesSecondaryText: {
    fontSize: 11,
    fontWeight: '700',
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
