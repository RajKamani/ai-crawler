import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  Pressable,
  Linking,
  Share,
  Image,
  Dimensions,
  FlatList,
} from 'react-native';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { API_BASE_URL, AUTH_HEADER } from '@/constants/Config';
import { PostType } from '@/components/PostCard';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import { useViewedPosts } from '@/hooks/useViewedPosts';
import { useTheme } from '@/hooks/useTheme';
import { useToast } from '@/context/ToastContext';

const { width: screenWidth } = Dimensions.get('window');
const CARD_WIDTH = screenWidth - 40;

export default function MorningDigestScreen() {
  const colors = useTheme();
  const isDark = colors.isDark;
  const { showToast } = useToast();
  
  const [digestText, setDigestText] = useState<string>('');
  const [posts, setPosts] = useState<PostType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [markedAllRead, setMarkedAllRead] = useState(false);

  const { viewedIds, markAsViewed } = useViewedPosts();

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
        setDigestText('Failed to generate daily digest briefing. Pull down to try again.');
        showToast({ message: 'Failed to generate briefing', type: 'error' });
      }
    } catch (error) {
      console.error('Error fetching daily digest:', error);
      setDigestText('Connection error. Could not retrieve morning brief.');
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
      } else {
        showToast({
          message: isBookmarked ? 'Removed from bookmarks' : 'Added to bookmarks',
          type: 'success',
        });
      }
    } catch (error) {
      console.error('Error bookmarking digest post:', error);
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, is_bookmarked: isBookmarked } : p))
      );
      showToast({ message: 'Error updating bookmark status', type: 'error' });
    }
  };

  const handleShare = async (post: PostType) => {
    try {
      await Share.share({
        message: `${post.title}\n\nRead more at: ${post.url}`,
        title: post.title,
        url: post.url,
      });
      showToast({ message: 'Link shared successfully', type: 'success' });
    } catch (error: any) {
      console.error('Error sharing post:', error);
      showToast({ message: 'Failed to share story', type: 'error' });
    }
  };

  const handleMarkAllRead = async () => {
    try {
      for (const post of posts) {
        if (!viewedIds.has(post.id)) {
          await markAsViewed(post.id);
        }
      }
      setMarkedAllRead(true);
      showToast({ message: 'All stories marked read', type: 'success' });
    } catch (error) {
      console.error('Failed to mark all as read:', error);
      showToast({ message: 'Failed to mark stories read', type: 'error' });
    }
  };

  const getMediaUrl = (post: PostType) => {
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

  const renderPostItem = ({ item }: { item: PostType }) => {
    const mediaUrl = getMediaUrl(item);
    const isPostViewed = viewedIds.has(item.id);
    const sourceType = item.sources?.type || 'blog';
    const sourceName = item.sources?.name || item.author || 'Blog';

    const getThemeStyles = () => {
      switch (sourceType) {
        case 'reddit':
          return { accent: isDark ? '#ff6b6b' : '#aa352b', icon: 'reddit' };
        case 'github':
          return { accent: isDark ? '#68d3fc' : '#00647f', icon: 'github' };
        case 'blog':
        default:
          return { accent: isDark ? '#ff4f4f' : '#bc000a', icon: 'rss' };
      }
    };
    const themeStyles = getThemeStyles();

    return (
      <View style={[styles.cardItem, { backgroundColor: colors.surfaceContainer, borderColor: colors.border }]}>
        {mediaUrl ? (
          <View style={styles.cardImageContainer}>
            <Image source={{ uri: mediaUrl }} style={styles.cardImage} resizeMode="cover" />
          </View>
        ) : (
          <View style={[styles.cardPlaceholder, { backgroundColor: isDark ? '#2c2c2c' : '#e3dfde' }]}>
            <FontAwesome5 name={themeStyles.icon} size={32} color={`${themeStyles.accent}25`} />
          </View>
        )}

        <View style={styles.cardBody}>
          <View style={styles.cardMetaRow}>
            <View style={[styles.sourceBadge, { borderColor: `${themeStyles.accent}60` }]}>
              <FontAwesome5 name={themeStyles.icon} size={9} color={themeStyles.accent} />
              <Text style={[styles.sourceNameText, { color: themeStyles.accent }]}>{sourceName}</Text>
            </View>
            {isPostViewed && (
              <View style={[styles.readBadge, { backgroundColor: isDark ? '#2b2b2b' : '#e3dfde' }]}>
                <Text style={[styles.readBadgeText, { color: colors.text }]}>READ</Text>
              </View>
            )}
          </View>

          <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={2}>
            {item.title}
          </Text>

          <Text style={[styles.cardExcerpt, { color: colors.text }]} numberOfLines={2}>
            {item.content || 'No content preview.'}
          </Text>

          <View style={[styles.cardDivider, { backgroundColor: colors.border }]} />

          <View style={styles.cardActionRow}>
            <Pressable
              style={[styles.cardActionBtn, { borderColor: colors.border }]}
              onPress={() => Linking.openURL(item.url)}
            >
              <Ionicons name="open-outline" size={14} color={colors.text} />
              <Text style={[styles.cardActionBtnText, { color: colors.text }]}>READ STORY</Text>
            </Pressable>

            <View style={styles.cardRightActions}>
              <Pressable onPress={() => handleShare(item)} style={styles.iconActionBtn}>
                <Ionicons name="share-social-outline" size={16} color={colors.text} />
              </Pressable>
              <Pressable onPress={() => handleToggleBookmark(item.id, item.is_bookmarked)} style={styles.iconActionBtn}>
                <Ionicons
                  name={item.is_bookmarked ? 'bookmark' : 'bookmark-outline'}
                  size={16}
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
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={styles.headerTitleRow}>
          <Ionicons name="sunny" size={24} color={colors.primary} />
          <Text style={[styles.headerTitle, { color: colors.text }]}>MORNING DIGEST</Text>
        </View>
        <Text style={[styles.headerSubtitle, { color: colors.primary }]}>Your Daily AI-Curated Briefing</Text>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.text }]}>Generating your morning briefing...</Text>
          <Text style={[styles.loadingSubText, { color: colors.tabIconDefault }]}>Synthesizing feed data with Llama 3</Text>
        </View>
      ) : (
        <ScrollView style={styles.contentContainer} showsVerticalScrollIndicator={false}>
          {/* Briefing Box */}
          <View style={[
            styles.briefBox,
            { 
              backgroundColor: isDark ? '#1a1818' : '#fff9f8', 
              borderColor: colors.primary,
              shadowColor: colors.primary
            }
          ]}>
            <View style={styles.briefHeader}>
              <Ionicons name="sparkles" size={16} color={colors.primary} />
              <Text style={[styles.briefHeaderText, { color: colors.primary }]}>AI MORNING BRIEFING</Text>
            </View>
            <MarkdownRenderer content={digestText} />
          </View>

          {/* Featured Posts list */}
          {posts.length > 0 && (
            <View style={styles.featuredContainer}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>FEATURED STORIES TODAY</Text>
              
              <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                data={posts}
                keyExtractor={(item) => item.id}
                renderItem={renderPostItem}
                snapToInterval={CARD_WIDTH + 16}
                decelerationRate="fast"
                contentContainerStyle={styles.featuredListContent}
              />
            </View>
          )}

          {/* Mark all as read action */}
          {posts.length > 0 && (
            <View style={styles.actionContainer}>
              {markedAllRead ? (
                <View style={[styles.successBox, { backgroundColor: isDark ? '#1b2c1f' : '#f0faf2', borderColor: '#2b8a3e' }]}>
                  <Ionicons name="checkmark-circle" size={20} color="#2b8a3e" />
                  <Text style={[styles.successText, { color: '#2b8a3e' }]}>All digest stories marked as read!</Text>
                </View>
              ) : (
                <Pressable
                  style={[styles.markReadBtn, { backgroundColor: colors.primary, borderColor: colors.border }]}
                  onPress={handleMarkAllRead}
                >
                  <Ionicons name="checkmark-done" size={18} color="#ffffff" />
                  <Text style={styles.markReadBtnText}>MARK ALL AS READ</Text>
                </Pressable>
              )}
            </View>
          )}

          <View style={styles.bottomGap} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    fontFamily: 'SpaceMono',
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'SpaceMono',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 12,
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
  contentContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  briefBox: {
    borderWidth: 1.5,
    padding: 16,
    borderRadius: 4,
    marginBottom: 24,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  briefHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(188, 0, 10, 0.15)',
    paddingBottom: 8,
  },
  briefHeaderText: {
    fontSize: 13,
    fontWeight: '800',
    fontFamily: 'SpaceMono',
    letterSpacing: 1,
  },
  featuredContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    fontFamily: 'SpaceMono',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  featuredListContent: {
    gap: 16,
    paddingRight: 20,
  },
  cardItem: {
    width: CARD_WIDTH,
    borderWidth: 1,
    borderRadius: 0,
    overflow: 'hidden',
  },
  cardImageContainer: {
    width: '100%',
    height: 120,
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardPlaceholder: {
    width: '100%',
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: {
    padding: 14,
  },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sourceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 0.75,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  sourceNameText: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'SpaceMono',
  },
  readBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1.5,
  },
  readBadgeText: {
    fontSize: 8,
    fontWeight: '700',
    fontFamily: 'SpaceMono',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 18,
    fontFamily: 'SpaceMono',
    marginBottom: 6,
  },
  cardExcerpt: {
    fontSize: 11,
    lineHeight: 16,
    fontFamily: 'SpaceMono',
    opacity: 0.8,
    marginBottom: 12,
  },
  cardDivider: {
    height: 0.5,
    marginBottom: 10,
  },
  cardActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  cardActionBtnText: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'SpaceMono',
  },
  cardRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconActionBtn: {
    padding: 2,
  },
  actionContainer: {
    marginBottom: 20,
    alignItems: 'center',
  },
  markReadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    height: 48,
    borderWidth: 1,
  },
  markReadBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
    fontFamily: 'SpaceMono',
  },
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    height: 48,
    borderWidth: 1,
    borderRadius: 2,
  },
  successText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'SpaceMono',
  },
  bottomGap: {
    height: 40,
  },
});
