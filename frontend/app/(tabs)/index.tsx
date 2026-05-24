import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TextInput,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { API_BASE_URL, AUTH_HEADER } from '@/constants/Config';
import { PostType } from '@/components/PostCard';
import { InshortsCard } from '@/components/InshortsCard';

export default function HomeFeedScreen() {
  const [posts, setPosts] = useState<PostType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  
  // Height container measurement
  const [containerHeight, setContainerHeight] = useState(0);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reset feed on search query change
  useEffect(() => {
    fetchFeed(1, true);
  }, [debouncedQuery]);

  const fetchFeed = async (pageNum: number, shouldReset = false) => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      let url = `${API_BASE_URL}/posts/personalized?page=${pageNum}&limit=10`;
      if (debouncedQuery.trim()) {
        url = `${API_BASE_URL}/posts?page=${pageNum}&limit=10&q=${encodeURIComponent(
          debouncedQuery
        )}`;
      }

      const response = await fetch(url, {
        headers: { ...AUTH_HEADER },
      });
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
      console.error('Error fetching feed:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchFeed(1, true);
  };

  const handleLoadMore = () => {
    if (!isLoading && hasMore) {
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
        />
      );
    },
    [containerHeight]
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header Area */}
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={styles.headerTitle}>AI Crawler</Text>
          <Text style={styles.headerSubtitle}>Personalized Inshorts Feed</Text>
        </View>
      </View>

      {/* Search Input */}
      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color="#8E8E93" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search topics, libraries, ideas..."
          placeholderTextColor="#8E8E93"
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCorrect={false}
        />
        {searchQuery ? (
          <Pressable onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color="#8E8E93" />
          </Pressable>
        ) : null}
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
                  <ActivityIndicator size="large" color="#9F62FF" />
                </View>
              ) : (
                <View style={styles.emptyContainer}>
                  <Ionicons name="newspaper-outline" size={48} color="#3A3A42" />
                  <Text style={styles.emptyText}>No posts available in your feed.</Text>
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
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  titleContainer: {
    flexDirection: 'column',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    color: '#9F62FF',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 1,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16161A',
    borderRadius: 12,
    marginHorizontal: 20,
    marginVertical: 8,
    paddingHorizontal: 12,
    height: 40,
    borderWidth: 1,
    borderColor: '#2A2A32',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
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
