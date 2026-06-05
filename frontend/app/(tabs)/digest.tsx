import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ActivityIndicator,
  Pressable,
  Linking,
  Share,
  Image,
  Dimensions,
  FlatList,
  ScrollView,
} from 'react-native';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { API_BASE_URL, AUTH_HEADER } from '@/constants/Config';
import { PostType } from '@/components/PostCard';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import { useViewedPosts } from '@/hooks/useViewedPosts';
import { useTheme } from '@/hooks/useTheme';
import { useToast } from '@/context/ToastContext';
import { Header } from '@/components/Header';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface DigestPost extends PostType {
  digest_takeaway?: string;
}

export default function MorningDigestScreen() {
  const colors = useTheme();
  const isDark = colors.isDark;
  const { showToast } = useToast();

  const [digestText, setDigestText] = useState<string>('');
  const [posts, setPosts] = useState<DigestPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [layoutWidth, setLayoutWidth] = useState(screenWidth);
  const [layoutHeight, setLayoutHeight] = useState(0);

  const { viewedIds, markAsViewed } = useViewedPosts();
  const flatListRef = useRef<FlatList>(null);

  const fetchDigest = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/posts/digest`, {
        headers: { ...AUTH_HEADER },
      });
      if (response.ok) {
        const data = await response.json();
        setDigestText(data.digest_text || '');
        setPosts(data.posts || []);
      } else {
        setDigestText('Failed to load your digest. Try again later.');
        showToast({ message: 'Failed to generate briefing', type: 'error' });
      }
    } catch (error) {
      console.error('Error fetching daily digest:', error);
      setDigestText('Connection error.');
      showToast({ message: 'Connection error', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDigest();
  }, []);

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

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...AUTH_HEADER,
        },
        body,
      });

      if (!response.ok) {
        setPosts((prev) =>
          prev.map((p) => (p.id === postId ? { ...p, is_bookmarked: isBookmarked } : p))
        );
        showToast({ message: 'Failed to update bookmark', type: 'error' });
      }
    } catch (error) {
      console.error('Error bookmarking digest post:', error);
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, is_bookmarked: isBookmarked } : p))
      );
    }
  };

  const handleShare = async (post: DigestPost) => {
    try {
      await Share.share({
        message: `${post.title}\n\nRead more at: ${post.url}`,
        title: post.title,
        url: post.url,
      });
    } catch (error: any) {
      console.error('Error sharing post:', error);
    }
  };

  const getMediaUrl = (post: DigestPost) => {
    if (post.thumbnail_url && post.thumbnail_url.startsWith('http')) {
      return post.thumbnail_url;
    }
    if (post.url && /\.(jpeg|jpg|gif|png|webp|svg)(?:\?.*)?$/i.test(post.url)) {
      return post.url;
    }
    if (post.raw_data && typeof post.raw_data === 'object') {
      const raw: any = post.raw_data;
      if (raw.thumbnail_url && typeof raw.thumbnail_url === 'string' && raw.thumbnail_url.startsWith('http')) {
        return raw.thumbnail_url;
      }
      if (raw.thumbnail && typeof raw.thumbnail === 'string' && raw.thumbnail.startsWith('http')) {
        return raw.thumbnail;
      }
    }
    return null;
  };

  const getSourceStyles = (sourceType: string) => {
    switch (sourceType) {
      case 'reddit':
        return { accent: isDark ? '#ff6b6b' : '#aa352b', icon: 'reddit' as const };
      case 'github':
        return { accent: isDark ? '#68d3fc' : '#00647f', icon: 'github' as const };
      case 'blog':
      default:
        return { accent: colors.primary, icon: 'rss' as const };
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const onViewableItemsChanged = useCallback(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setActiveIndex(viewableItems[0].index ?? 0);
    }
  }, []);

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const renderDigestCard = ({ item, index }: { item: DigestPost; index: number }) => {
    const mediaUrl = getMediaUrl(item);
    const sourceType = item.sources?.type || 'blog';
    const sourceName = item.sources?.name || item.author || 'Blog';
    const theme = getSourceStyles(sourceType);
    const isPostViewed = viewedIds.has(item.id);

    return (
      <View style={[styles.digestCard, { width: layoutWidth, height: layoutHeight }]}>
        <View style={[styles.cardInner, { backgroundColor: colors.background, borderColor: colors.border }]}>

          {/* Image Section */}
          <View style={[styles.imageSection, { backgroundColor: colors.surfaceContainer }]}>
            {mediaUrl ? (
              <>
                <Image source={{ uri: mediaUrl }} style={styles.cardImage} resizeMode="cover" />
                <View style={styles.imageOverlay} />
              </>
            ) : (
              <View style={[styles.imagePlaceholder, { backgroundColor: isDark ? '#2c2b2b' : '#f0eded' }]}>
                <FontAwesome5 name={theme.icon} size={40} color={`${theme.accent}25`} />
              </View>
            )}

            {/* Card counter badge */}
            <View style={[styles.counterBadge, { backgroundColor: isDark ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.85)' }]}>
              <Text style={[styles.counterText, { color: isDark ? '#fff' : '#1c1b1b' }]}>
                {index + 1} / {posts.length}
              </Text>
            </View>
          </View>

          {/* Content Section — Scrollable */}
          <ScrollView
            style={styles.contentScroll}
            contentContainerStyle={styles.contentScrollInner}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled={true}
          >
            {/* Source Citation Row */}
            <View style={styles.citationRow}>
              <View style={[styles.sourceBadge, { borderColor: `${theme.accent}60` }]}>
                <FontAwesome5 name={theme.icon} size={10} color={theme.accent} />
                <Text style={[styles.sourceText, { color: theme.accent }]}>{sourceName}</Text>
              </View>
              <Text style={[styles.dateText, { color: colors.tabIconDefault }]}>
                {formatDate(item.published_at)}
              </Text>
              {isPostViewed && (
                <View style={[styles.readBadge, { backgroundColor: isDark ? '#2b2b2b' : '#e3dfde' }]}>
                  <Text style={[styles.readBadgeText, { color: colors.tabIconDefault }]}>READ</Text>
                </View>
              )}
            </View>

            {/* Title */}
            <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={3}>
              {item.title}
            </Text>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            {/* AI Takeaway */}
            {item.digest_takeaway ? (
              <View style={[styles.takeawayBox, { backgroundColor: isDark ? '#1a1818' : '#fff9f8', borderColor: `${colors.primary}30` }]}>
                <View style={styles.takeawayHeader}>
                  <Ionicons name="sparkles" size={14} color={colors.primary} />
                  <Text style={[styles.takeawayLabel, { color: colors.primary }]}>AI TAKEAWAY</Text>
                </View>
                <MarkdownRenderer content={item.digest_takeaway} />
              </View>
            ) : (
              <View style={styles.takeawayBox}>
                <Text style={[styles.takeawayText, { color: colors.tabIconDefault }]}>
                  No AI takeaway available for this post.
                </Text>
              </View>
            )}
          </ScrollView>

          {/* Actions Row — Fixed at bottom */}
          <View style={[styles.actionsRow, { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12 }]}>
              <Pressable
                style={[styles.readBtn, { borderColor: colors.border }]}
                onPress={() => {
                  markAsViewed(item.id);
                  Linking.openURL(item.url);
                }}
              >
                <Ionicons name="open-outline" size={14} color={colors.text} />
                <Text style={[styles.readBtnText, { color: colors.text }]}>READ FULL STORY</Text>
              </Pressable>

              <View style={styles.rightActions}>
                <Pressable onPress={() => handleShare(item)} style={[styles.iconBtn, { borderColor: colors.border }]}>
                  <Ionicons name="share-social-outline" size={18} color={colors.text} />
                </Pressable>
                <Pressable
                  onPress={() => handleToggleBookmark(item.id, item.is_bookmarked)}
                  style={[styles.iconBtn, { borderColor: colors.border }]}
                >
                  <Ionicons
                    name={item.is_bookmarked ? 'bookmark' : 'bookmark-outline'}
                    size={18}
                    color={item.is_bookmarked ? colors.primary : colors.text}
                  />
                </Pressable>
              </View>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <Header
        title="DAILY DIGEST"
        subtitle="AI-Curated Briefing"
        titleIcon={<Ionicons name="sunny" size={24} color={colors.primary} />}
      />

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.text }]}>Generating your digest...</Text>
          <Text style={[styles.loadingSubText, { color: colors.tabIconDefault }]}>Analyzing top stories with AI</Text>
        </View>
      ) : posts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="newspaper-outline" size={48} color={colors.tabIconDefault} />
          <Text style={[styles.emptyText, { color: colors.text }]}>{digestText}</Text>
        </View>
      ) : (
        <View style={styles.mainContent}>
          {/* Greeting */}
          <View style={styles.greetingContainer}>
            <Text style={[styles.greetingText, { color: colors.text }]}>{digestText}</Text>
            <Text style={[styles.swipeHint, { color: colors.tabIconDefault }]}>
              Swipe to browse • {posts.length} stories
            </Text>
          </View>

          {/* Swipeable Cards Container */}
          <View
            style={{ flex: 1 }}
            onLayout={(e) => {
              const { width, height } = e.nativeEvent.layout;
              setLayoutWidth(width);
              setLayoutHeight(height);
            }}
          >
            {layoutHeight > 0 && (
              <FlatList
                ref={flatListRef}
                horizontal
                pagingEnabled={true}
                showsHorizontalScrollIndicator={false}
                data={posts}
                keyExtractor={(item) => item.id}
                renderItem={renderDigestCard}
                onViewableItemsChanged={onViewableItemsChanged}
                viewabilityConfig={viewabilityConfig}
                decelerationRate="fast"
                snapToInterval={layoutWidth}
                snapToAlignment="start"
                style={styles.flatList}
                getItemLayout={(data, index) => ({
                  length: layoutWidth,
                  offset: layoutWidth * index,
                  index,
                })}
              />
            )}
          </View>

          {/* Dot Pagination */}
          <View style={styles.pagination}>
            {posts.map((_, idx) => (
              <View
                key={idx}
                style={[
                  styles.dot,
                  {
                    backgroundColor: idx === activeIndex ? colors.primary : (isDark ? '#444' : '#ccc'),
                    width: idx === activeIndex ? 20 : 8,
                  },
                ]}
              />
            ))}
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 10,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'SpaceMono',
    textAlign: 'center',
    marginTop: 8,
  },
  loadingSubText: {
    fontSize: 12,
    fontFamily: 'SpaceMono',
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    gap: 16,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'SpaceMono',
    textAlign: 'center',
    lineHeight: 20,
  },
  mainContent: {
    flex: 1,
  },
  flatList: {
    flex: 1,
  },
  greetingContainer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  greetingText: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'SpaceMono',
    lineHeight: 22,
  },
  swipeHint: {
    fontSize: 11,
    fontFamily: 'SpaceMono',
    marginTop: 4,
  },
  digestCard: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  cardInner: {
    flex: 1,
    borderWidth: 1,
    overflow: 'hidden',
  },
  imageSection: {
    width: '100%',
    height: 180,
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 3,
  },
  counterText: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'SpaceMono',
  },
  contentScroll: {
    flex: 1,
  },
  contentScrollInner: {
    padding: 16,
    paddingBottom: 4,
  },
  citationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  sourceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  sourceText: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'SpaceMono',
  },
  dateText: {
    fontSize: 10,
    fontWeight: '500',
    fontFamily: 'SpaceMono',
  },
  readBadge: {
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  readBadgeText: {
    fontSize: 8,
    fontWeight: '700',
    fontFamily: 'SpaceMono',
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '800',
    lineHeight: 23,
    fontFamily: 'SpaceMono',
    marginBottom: 12,
  },
  divider: {
    height: 1,
    marginBottom: 12,
  },
  takeawayBox: {
    borderWidth: 1,
    borderColor: 'transparent',
    padding: 12,
    marginBottom: 16,
    borderRadius: 2,
  },
  takeawayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  takeawayLabel: {
    fontSize: 11,
    fontWeight: '800',
    fontFamily: 'SpaceMono',
    letterSpacing: 0.5,
  },
  takeawayText: {
    fontSize: 13,
    lineHeight: 20,
    fontFamily: 'SpaceMono',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  readBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  readBtnText: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'SpaceMono',
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 16,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
});
