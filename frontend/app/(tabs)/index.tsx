import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TextInput,
  ActivityIndicator,
  Pressable,
  ScrollView,
  Animated,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useNavigation } from 'expo-router';
import { API_BASE_URL, AUTH_HEADER } from '@/constants/Config';
import { PostType } from '@/components/PostCard';
import { InshortsCard } from '@/components/InshortsCard';
import { useViewedPosts } from '@/hooks/useViewedPosts';
import { useNewContentNotification } from '@/hooks/useNewContentNotification';
import { useTheme } from '@/hooks/useTheme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useToast } from '@/context/ToastContext';
import { useSummary } from '@/context/SummaryContext';
import { Header } from '@/components/Header';
import { SkeletonCard } from '@/components/SkeletonCard';
import { FeedErrorState } from '@/components/FeedErrorState';
import { useHaptics } from '@/hooks/useHaptics';

export default function HomeFeedScreen() {
  const colors = useTheme();
  const navigation = useNavigation();
  const { showToast } = useToast();
  const { allowanceRemaining, fetchAllowance } = useSummary();
  const [posts, setPosts] = useState<PostType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [sources, setSources] = useState<Array<{ id: string; name: string; type: string }>>([]);
  const [sourcesLoaded, setSourcesLoaded] = useState(false);
  const [selectedSourceIds, setSelectedSourceIds] = useState<string[]>([]);
  const [tempSelectedSourceIds, setTempSelectedSourceIds] = useState<string[]>([]);
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
  const [filterSearchQuery, setFilterSearchQuery] = useState('');

  useEffect(() => {
    if (isFilterModalVisible) {
      setTempSelectedSourceIds(selectedSourceIds);
    }
  }, [isFilterModalVisible, selectedSourceIds]);

  // Height container measurement
  const [containerHeight, setContainerHeight] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);

  const [fetchError, setFetchError] = useState<string | null>(null);
  const { triggerLight, triggerMedium } = useHaptics();
  const [isPreseeded, setIsPreseeded] = useState(false);
  const [activePostId, setActivePostId] = useState<string | null>(null);

  // Micro-animations for source chips selection
  const chipScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    chipScale.setValue(0.95);
    Animated.spring(chipScale, {
      toValue: 1.0,
      useNativeDriver: true,
      friction: 4,
      tension: 40,
    }).start();
  }, [selectedSourceIds]);

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
        setActivePostId(activePost.id);
      }
    }
  }).current;

  const viewabilityConfig = React.useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  // Fetch active sources on mount & focus
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

  useEffect(() => {
    fetchSources();

    const unsubscribe = navigation.addListener('focus', () => {
      fetchSources();
    });

    return unsubscribe;
  }, [navigation]);

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
  }, [debouncedQuery, selectedSourceIds]);

  // Set first post as active on load/reset
  useEffect(() => {
    if (posts.length > 0 && !activePostId) {
      setActivePostId(posts[0].id);
    }
  }, [posts, activePostId]);

  const fetchFeed = async (pageNum: number, shouldReset = false) => {
    if (isLoading) return;
    setIsLoading(true);
    if (shouldReset) {
      setPosts([]);
      setIsPreseeded(false);
    }
    try {
      setFetchError(null);
      let url = `${API_BASE_URL}/posts?page=${pageNum}&limit=10`;
      if (selectedSourceIds.length > 0) {
        url += `&source_id=${selectedSourceIds.join(',')}`;
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
      let newPosts = data.posts || [];

      // Fetch preseed fallback on page 1 if feed is empty
      if (newPosts.length === 0 && pageNum === 1 && selectedSourceIds.length === 0 && !debouncedQuery) {
        const preseedRes = await fetch(`${API_BASE_URL}/posts/preseed?limit=15`, {
          headers: { ...AUTH_HEADER },
        });
        if (preseedRes.ok) {
          const preseedData = await preseedRes.json();
          newPosts = preseedData.posts || [];
          if (newPosts.length > 0) {
            setIsPreseeded(true);
          }
        }
      }

      if (shouldReset) {
        setPosts(newPosts);
      } else {
        setPosts((prev) => [...prev, ...newPosts]);
      }
      setPage(pageNum);
      setHasMore(newPosts.length === 10 && !isPreseeded);
    } catch (error: any) {
      console.error('Error fetching feed:', error);
      setFetchError(error.message || 'Failed to fetch news feed');
      setHasMore(false);
      showToast({ message: 'Failed to fetch news feed', type: 'error' });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    triggerLight();
    setIsRefreshing(true);
    setHasMore(true);
    fetchFeed(1, true);
    fetchAllowance();
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
        showToast({ message: 'Failed to update bookmark', type: 'error' });
      } else {
        showToast({
          message: isBookmarked ? 'Removed from bookmarks' : 'Added to bookmarks',
          type: 'success',
        });
      }
    } catch (error) {
      console.error('Error bookmarking post:', error);
      // Revert on failure
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, is_bookmarked: isBookmarked } : p))
      );
      showToast({ message: 'Error updating bookmark status', type: 'error' });
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
          isViewed={viewedIds.has(item.id)}
          isActive={activePostId === item.id}
        />
      );
    },
    [containerHeight, viewedIds, activePostId]
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header Area */}
      <Header
        title="CONTEXTIQ"
        subtitle={isPreseeded ? "TRENDING // WHILE FEED LOADS" : "PERSONALIZED FEED // INSHORTS"}
        unreadCount={unreadCount}
      />

      {/* New updates banner */}
      {newPostsAvailable && (
        <Pressable
          style={[styles.newPostsBanner, { backgroundColor: colors.primary, borderColor: colors.border }]}
          onPress={() => {
            triggerLight();
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
          placeholder="SEARCH TOPICS, LIBRARIES, IDEAS…"
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
        <View style={styles.chipsContainer}>
          <Pressable
            style={[styles.filterIconButton, { borderColor: colors.border, backgroundColor: colors.surfaceContainer }]}
            onPress={() => {
              triggerLight();
              setIsFilterModalVisible(true);
            }}
            accessibilityRole="button"
            accessibilityLabel="Filter feed sources"
          >
            <Ionicons name="funnel-outline" size={13} color={colors.text} />
          </Pressable>

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
                selectedSourceIds.length === 0 && { backgroundColor: colors.primary, borderColor: colors.primary },
              ]}
              onPress={() => {
                triggerLight();
                setSelectedSourceIds([]);
              }}
            >
              <Animated.View style={selectedSourceIds.length === 0 ? { transform: [{ scale: chipScale }] } : undefined}>
                <Text
                  style={[
                    styles.chipText,
                    { color: colors.text },
                    selectedSourceIds.length === 0 && { color: '#ffffff' },
                  ]}
                >
                  ALL FEED
                </Text>
              </Animated.View>
            </Pressable>
            {sources.map((src) => {
              const isActive = selectedSourceIds.includes(src.id);
              return (
                <Pressable
                  key={src.id}
                  style={[
                    styles.chipButton,
                    { borderColor: colors.border, backgroundColor: colors.background },
                    isActive && { backgroundColor: colors.primary, borderColor: colors.primary },
                  ]}
                  onPress={() => {
                    triggerLight();
                    setSelectedSourceIds((prev) => {
                      if (prev.includes(src.id)) {
                        return prev.filter((id) => id !== src.id);
                      } else {
                        return [...prev, src.id];
                      }
                    });
                  }}
                >
                  <Animated.View style={isActive ? { transform: [{ scale: chipScale }] } : undefined}>
                    <Text
                      style={[
                        styles.chipText,
                        { color: colors.text },
                        isActive && { color: '#ffffff' },
                      ]}
                    >
                      {src.name.toUpperCase()}
                    </Text>
                  </Animated.View>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Source Filter Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isFilterModalVisible}
        onRequestClose={() => setIsFilterModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable style={styles.modalDismissArea} onPress={() => setIsFilterModalVisible(false)} />
          <View style={[styles.modalCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <View style={[styles.modalHeader, { borderColor: colors.border }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="funnel-sharp" size={18} color={colors.primary} />
                <Text style={[styles.modalTitleText, { color: colors.text }]}>FILTER SOURCES</Text>
              </View>
              <Pressable onPress={() => setIsFilterModalVisible(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={22} color={colors.text} />
              </Pressable>
            </View>

            {/* Filter Search Input */}
            <View style={[styles.modalSearchInputBox, { borderColor: colors.border, backgroundColor: colors.surfaceContainer }]}>
              <Ionicons name="search" size={16} color={colors.text} />
              <TextInput
                style={[styles.modalSearchInput, { color: colors.text }]}
                placeholder="SEARCH SOURCES..."
                placeholderTextColor={colors.tabIconDefault}
                value={filterSearchQuery}
                onChangeText={setFilterSearchQuery}
                autoCorrect={false}
                autoCapitalize="none"
              />
              {filterSearchQuery ? (
                <Pressable onPress={() => setFilterSearchQuery('')}>
                  <Ionicons name="close-circle" size={16} color={colors.text} />
                </Pressable>
              ) : null}
            </View>

            {/* Scrollable list of sources */}
            <ScrollView style={styles.modalSourcesScroll} showsVerticalScrollIndicator={false}>
              {/* All Feed Option */}
              <Pressable
                style={[
                  styles.modalSourceItem,
                  { borderColor: colors.border, backgroundColor: colors.surfaceContainer },
                  tempSelectedSourceIds.length === 0 && { backgroundColor: colors.primary, borderColor: colors.primary }
                ]}
                onPress={() => {
                  triggerLight();
                  setTempSelectedSourceIds([]);
                }}
              >
                <Ionicons name="apps-outline" size={18} color={tempSelectedSourceIds.length === 0 ? '#ffffff' : colors.primary} />
                <Text style={[styles.modalSourceText, { color: colors.text }, tempSelectedSourceIds.length === 0 && { color: '#ffffff', fontWeight: '800' }]}>
                  ALL FEED
                </Text>
                {tempSelectedSourceIds.length === 0 && <Ionicons name="checkmark-circle" size={18} color="#ffffff" style={{ marginLeft: 'auto' }} />}
              </Pressable>

              {/* Dynamic list */}
              {sources
                .filter(src => src.name.toLowerCase().includes(filterSearchQuery.toLowerCase()))
                .map((src) => {
                  const isActive = tempSelectedSourceIds.includes(src.id);
                  let iconName: any = 'document-text-outline';
                  let iconColor = colors.primary;
                  if (src.type === 'reddit') {
                    iconName = 'logo-reddit';
                    iconColor = '#ff6b6b';
                  } else if (src.type === 'github') {
                    iconName = 'logo-github';
                    iconColor = '#68d3fc';
                  }

                  return (
                    <Pressable
                      key={src.id}
                      style={[
                        styles.modalSourceItem,
                        { borderColor: colors.border, backgroundColor: colors.background },
                        isActive && { backgroundColor: colors.primary, borderColor: colors.primary }
                      ]}
                      onPress={() => {
                        triggerLight();
                        setTempSelectedSourceIds((prev) => {
                          if (prev.includes(src.id)) {
                            return prev.filter((id) => id !== src.id);
                          } else {
                            return [...prev, src.id];
                          }
                        });
                      }}
                    >
                      <Ionicons name={iconName} size={18} color={isActive ? '#ffffff' : iconColor} />
                      <Text style={[styles.modalSourceText, { color: colors.text }, isActive && { color: '#ffffff', fontWeight: '800' }]} numberOfLines={1}>
                        {src.name.toUpperCase()}
                      </Text>
                      {isActive && <Ionicons name="checkmark-circle" size={18} color="#ffffff" style={{ marginLeft: 'auto' }} />}
                    </Pressable>
                  );
                })}
            </ScrollView>

            {/* Modal Actions */}
            <View style={[styles.modalFooter, { borderColor: colors.border }]}>
              <Pressable
                style={[styles.modalResetBtn, { borderColor: colors.border, backgroundColor: colors.surfaceContainer }]}
                onPress={() => {
                  triggerLight();
                  setTempSelectedSourceIds([]);
                }}
              >
                <Text style={[styles.modalResetText, { color: colors.text }]}>CLEAR ALL</Text>
              </Pressable>

              <Pressable
                style={[styles.modalApplyBtn, { backgroundColor: colors.primary, borderColor: colors.border }]}
                onPress={() => {
                  triggerMedium();
                  setSelectedSourceIds(tempSelectedSourceIds);
                  setIsFilterModalVisible(false);
                }}
              >
                <Text style={styles.modalApplyText}>APPLY FILTERS</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Main Snapping Area */}
      <View
        style={[
          styles.feedWrapper,
          {
            backgroundColor: colors.background,
          }
        ]}
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
                <View style={{ flex: 1, height: containerHeight }}>
                  <SkeletonCard containerHeight={containerHeight} />
                </View>
              ) : fetchError ? (
                <FeedErrorState
                  message={fetchError.toUpperCase()}
                  onRetry={handleRefresh}
                />
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
                    onPress={() => {
                      triggerLight();
                      router.push('/settings');
                    }}
                  >
                    <Ionicons name="settings-outline" size={16} color="#ffffff" />
                    <Text style={styles.addSourcesBtnText}>GO TO SETTINGS → ADD SOURCES</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.addSourcesSecondaryBtn, { borderColor: colors.border, backgroundColor: colors.surfaceContainer }]}
                    onPress={() => {
                      triggerLight();
                      router.push('/settings/subreddits');
                    }}
                  >
                    <Ionicons name="logo-reddit" size={14} color={colors.text} />
                    <Text style={[styles.addSourcesSecondaryText, { color: colors.text }]}>BROWSE POPULAR SUBREDDITS</Text>
                  </Pressable>
                </View>
              ) : (
                // Sources exist but no posts yet (crawl pending)
                <View style={[styles.emptyContainer, { backgroundColor: colors.background }]}>
                  <Ionicons name="hourglass-outline" size={48} color={colors.text} />
                  <Text style={[styles.emptyText, { color: colors.tabIconDefault }]}>CRAWLING YOUR SOURCES…</Text>
                  <Text style={[styles.emptySubText, { color: colors.tabIconDefault }]}>Posts will appear here shortly. Pull down to refresh.</Text>
                </View>
              )
            }
            ListFooterComponent={
              isLoading && posts.length > 0 ? (
                <View style={[styles.footerLoader, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={[styles.footerLoaderText, { color: colors.primary }]}>LOADING MORE POSTS…</Text>
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
  chipsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 8,
    gap: 8,
  },
  filterIconButton: {
    width: 28,
    height: 28,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipsScrollView: {
    flex: 1,
    maxHeight: 36,
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalDismissArea: {
    flex: 1,
  },
  modalCard: {
    borderTopWidth: 2,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 0,
    height: '60%',
    padding: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    paddingBottom: 12,
    marginBottom: 16,
  },
  modalTitleText: {
    fontFamily: 'SpaceMono-Bold',
    fontSize: 16,
    letterSpacing: 0.5,
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalSearchInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingHorizontal: 10,
    height: 38,
    gap: 8,
    marginBottom: 16,
  },
  modalSearchInput: {
    flex: 1,
    fontFamily: 'SpaceMono',
    fontSize: 12,
  },
  modalSourcesScroll: {
    flex: 1,
  },
  modalSourceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    marginBottom: 10,
    gap: 10,
  },
  modalSourceText: {
    fontFamily: 'SpaceMono',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    borderTopWidth: 1,
    paddingTop: 16,
    marginTop: 12,
  },
  modalResetBtn: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalResetText: {
    fontFamily: 'SpaceMono-Bold',
    fontSize: 12,
  },
  modalApplyBtn: {
    flex: 2,
    height: 44,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalApplyText: {
    fontFamily: 'SpaceMono-Bold',
    fontSize: 12,
    color: '#ffffff',
  },
});
