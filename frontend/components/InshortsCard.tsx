import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  Linking,
  ScrollView,
  ActivityIndicator,
  Share,
} from 'react-native';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { PostType } from './PostCard';
import { MarkdownRenderer } from './MarkdownRenderer';
import { useTheme } from '@/hooks/useTheme';


interface InshortsCardProps {
  post: PostType;
  containerHeight: number;
  onToggleBookmark: (postId: string, isBookmarked: boolean) => void;
  onSummarize: (postId: string) => Promise<string | null>;
  isViewed?: boolean;
}

const getMediaUrl = (post: PostType) => {
  // 1. Direct thumbnail_url if available
  if (post.thumbnail_url && post.thumbnail_url.startsWith('http')) {
    return post.thumbnail_url;
  }

  // 2. Check if post.url itself is an image
  if (post.url && /\.(jpeg|jpg|gif|png|webp|svg)(?:\?.*)?$/i.test(post.url)) {
    return post.url;
  }

  // 3. Check Reddit raw_data thumbnail
  if (post.raw_data && typeof post.raw_data === 'object') {
    const raw: any = post.raw_data;
    if (raw.thumbnail_url && typeof raw.thumbnail_url === 'string' && raw.thumbnail_url.startsWith('http')) {
      return raw.thumbnail_url;
    }
    if (raw.thumbnail && typeof raw.thumbnail === 'string' && raw.thumbnail.startsWith('http')) {
      return raw.thumbnail;
    }
  }

  // 4. Try to find an image URL in the content body
  if (post.content) {
    const imgRegex = /https?:\/\/[^\s"'<>]+\.(?:jpeg|jpg|gif|png|webp|svg)(?:\?[^\s"'<>]+)?/i;
    const match = post.content.match(imgRegex);
    if (match) {
      return match[0];
    }
  }

  return null;
};

export const InshortsCard: React.FC<InshortsCardProps> = ({
  post,
  containerHeight,
  onToggleBookmark,
  onSummarize,
  isViewed = false,
}) => {
  const colors = useTheme();
  const isDark = colors.background === '#141313';
  const [showSummary, setShowSummary] = useState(false);
  const [summaryText, setSummaryText] = useState<string | null>(post.ai_summary || null);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);

  const sourceType = post.sources?.type || 'blog';
  const sourceName = post.sources?.name || post.author || 'Blog';

  // Format date
  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const getDomain = (urlStr: string) => {
    try {
      const matches = urlStr.match(/^https?:\/\/([^/?#]+)(?:[/?#]|$)/i);
      return matches && matches[1] ? matches[1].replace('www.', '') : 'source';
    } catch {
      return 'link';
    }
  };

  // Get source styles
  const getSourceStyles = () => {
    switch (sourceType) {
      case 'reddit':
        return {
          accentColor: isDark ? '#ff6b6b' : '#aa352b',
          icon: 'reddit',
          placeholderBg: isDark ? '#2c2b2b' : '#f0eded',
        };
      case 'github':
        return {
          accentColor: isDark ? '#68d3fc' : '#00647f',
          icon: 'github',
          placeholderBg: isDark ? '#2c2b2b' : '#f0eded',
        };
      case 'blog':
      default:
        return {
          accentColor: isDark ? '#ff4f4f' : '#bc000a',
          icon: 'rss',
          placeholderBg: isDark ? '#2c2b2b' : '#f0eded',
        };
    }
  };

  const theme = getSourceStyles();

  const handleShare = async () => {
    try {
      await Share.share({
        message: `${post.title}\n\n${post.content || ''}\n\nRead more at: ${post.url}`,
        title: post.title,
        url: post.url,
      });
    } catch (error: any) {
      console.error('Error sharing post:', error);
    }
  };

  const handleToggleSummary = async () => {
    if (showSummary) {
      setShowSummary(false);
      return;
    }

    setShowSummary(true);
    if (!summaryText) {
      setIsLoadingSummary(true);
      try {
        const fetched = await onSummarize(post.id);
        if (fetched) {
          setSummaryText(fetched);
        } else {
          setSummaryText('Unable to retrieve AI summary.');
        }
      } catch (err) {
        setSummaryText('Error loading AI summary.');
      } finally {
        setIsLoadingSummary(false);
      }
    }
  };

  // Calculate layout heights based on containerHeight
  const headerHeight = Math.floor(containerHeight * 0.28);
  const footerHeight = 56;
  const contentHeight = containerHeight - headerHeight - footerHeight;

  const mediaUrl = getMediaUrl(post);

  return (
    <View style={[styles.card, { height: containerHeight, backgroundColor: colors.background }]}>
      {/* Header Visual Section */}
      <View style={[styles.headerContainer, { height: headerHeight, backgroundColor: colors.surfaceContainer }]}>
        {mediaUrl ? (
          <>
            <Image
              source={{ uri: mediaUrl }}
              style={styles.headerImage}
              resizeMode="cover"
            />
            <View style={styles.imageOverlay} />
          </>
        ) : (
          <View style={[styles.headerPlaceholder, { backgroundColor: theme.placeholderBg }]}>
            <FontAwesome5 name={theme.icon} size={48} color={`${theme.accentColor}30`} />
          </View>
        )}

        {/* Source Badge overlay */}
        <View style={styles.badgeOverlay}>
          <View style={[styles.sourceBadge, { borderColor: `${theme.accentColor}60`, backgroundColor: colors.background }]}>
            <FontAwesome5 name={theme.icon} size={11} color={theme.accentColor} />
            <Text style={[styles.sourceText, { color: theme.accentColor }]}>{sourceName}</Text>
          </View>
          <Text style={[styles.dateText, { color: colors.text }]}>{formatDate(post.published_at)}</Text>
          {isViewed && (
            <View style={styles.viewedBadge}>
              <Text style={styles.viewedText}>READ</Text>
            </View>
          )}
        </View>

        {/* Top Floating Actions */}
        <View style={styles.floatingActions}>
          <Pressable
            style={[styles.floatingBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
            onPress={handleShare}
          >
            <Ionicons
              name="share-social-outline"
              size={20}
              color={colors.text}
            />
          </Pressable>
          <Pressable
            style={[styles.floatingBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
            onPress={() => onToggleBookmark(post.id, post.is_bookmarked)}
          >
            <Ionicons
              name={post.is_bookmarked ? 'bookmark' : 'bookmark-outline'}
              size={20}
              color={post.is_bookmarked ? colors.primary : colors.text}
            />
          </Pressable>
        </View>
      </View>

      {/* Main Body Section */}
      <View style={[styles.bodyContainer, { height: contentHeight, backgroundColor: colors.background, borderColor: colors.border }]}>
        {/* Post Title */}
        <Text style={[styles.title, { color: colors.text }, isViewed && (isDark ? { color: '#8f807e' } : styles.titleViewed)]} numberOfLines={2}>
          {post.title}
        </Text>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled={true}
          {...({
            onWheel: (e: any) => {
              e.stopPropagation();
            },
          } as any)}
        >
          {showSummary ? (
            <View style={styles.summaryArea}>
              <View style={styles.summaryTitleRow}>
                <Ionicons name="sparkles" size={14} color={colors.primary} />
                <Text style={[styles.summaryTitle, { color: colors.primary }]}>AI Bullet Summary</Text>
              </View>
              {isLoadingSummary ? (
                <View style={styles.loaderContainer}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={[styles.loaderText, { color: colors.text }]}>Llama 3 summarizing...</Text>
                </View>
              ) : (
                <View style={styles.bulletsContainer}>
                  {summaryText ? (
                    <MarkdownRenderer content={summaryText} />
                  ) : (
                    <Text style={[styles.summaryText, { color: colors.text }]}>No summary available.</Text>
                  )}
                </View>
              )}
            </View>
          ) : (
            <View>
              {post.sources?.type === 'github' && post.raw_data && (
                <View style={[styles.githubStatsRow, { backgroundColor: colors.surfaceContainer, borderColor: colors.border }]}>
                  <View style={styles.gitStat}>
                    <Ionicons name="star" size={14} color={colors.primary} />
                    <Text style={[styles.gitStatText, { color: colors.text }]}>{(post.raw_data.stars ?? 0).toLocaleString()} stars</Text>
                  </View>
                  <View style={styles.gitStat}>
                    <FontAwesome5 name="code-branch" size={12} color={colors.text} />
                    <Text style={[styles.gitStatText, { color: colors.text }]}>{(post.raw_data.forks ?? 0).toLocaleString()} forks</Text>
                  </View>
                  <View style={styles.gitStat}>
                    <Ionicons name="code-slash" size={14} color={theme.accentColor} />
                    <Text style={[styles.gitStatText, { color: colors.text }]}>{post.raw_data.language ?? 'Unknown'}</Text>
                  </View>
                </View>
              )}

              {post.sources?.type === 'reddit' && post.raw_data && (
                <View style={[styles.redditStatsRow, { backgroundColor: isDark ? '#2b1b1b' : '#fcf0ef', borderColor: theme.accentColor }]}>
                  <View style={styles.redditStat}>
                    <Ionicons name="arrow-up" size={14} color={theme.accentColor} />
                    <Text style={[styles.redditStatText, { color: theme.accentColor }]}>{(post.raw_data.score ?? 0).toLocaleString()} upvotes</Text>
                  </View>
                  <View style={styles.redditStat}>
                    <Ionicons name="chatbox-ellipses" size={14} color={colors.text} />
                    <Text style={[styles.redditStatText, { color: theme.accentColor }]}>{(post.raw_data.num_comments ?? 0).toLocaleString()} comments</Text>
                  </View>
                </View>
              )}

              <Text style={[styles.bodyText, { color: colors.text }]}>
                {post.content ? post.content.replace(/\n+/g, '\n\n') : 'No content preview available.'}
              </Text>

              {post.sources?.type === 'reddit' && post.raw_data?.comments && post.raw_data.comments.length > 0 && (
                <View style={[styles.commentsContainer, { borderTopColor: colors.border }]}>
                  <Text style={[styles.commentsHeader, { color: theme.accentColor }]}>TOP COMMENTS</Text>
                  {post.raw_data.comments.map((comment: any, idx: number) => (
                    <View key={idx} style={[styles.commentItem, { backgroundColor: colors.surfaceContainer, borderColor: colors.border }]}>
                      <View style={styles.commentMeta}>
                        <Text style={[styles.commentAuthor, { color: theme.accentColor }]}>u/{comment.author}</Text>
                        <Text style={[styles.commentScore, { color: colors.tabIconDefault }]}>• {comment.score} upvotes</Text>
                      </View>
                      <Text style={[styles.commentBody, { color: colors.text }]}>{comment.body}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}
        </ScrollView>

        {/* Floating Sparkle Action button inside the text card */}
        <Pressable
          style={[
            styles.actionButton,
            { borderColor: colors.border },
            showSummary ? { backgroundColor: colors.primary, borderColor: colors.primary } : null,
          ]}
          onPress={handleToggleSummary}
        >
          <Ionicons
            name="sparkles"
            size={15}
            color={showSummary ? '#FFFFFF' : colors.text}
          />
          <Text style={[styles.actionBtnText, { color: showSummary ? '#FFFFFF' : colors.text }]}>
            {showSummary ? 'Show Original' : 'AI Aggregated takeaways'}
          </Text>
        </Pressable>
      </View>

      {/* Footer Bottom Sheet Bar */}
      <Pressable
        style={[styles.footerContainer, { height: footerHeight, backgroundColor: colors.surfaceContainer, borderTopColor: colors.border }]}
        onPress={() => Linking.openURL(post.url)}
      >
        <View style={styles.footerContent}>
          <Text style={[styles.footerText, { color: colors.text }]} numberOfLines={1}>
            read more at <Text style={[styles.footerDomain, { color: colors.primary }]}>{getDomain(post.url)}</Text>
          </Text>
          <Ionicons name="chevron-forward-outline" size={14} color={colors.primary} />
        </View>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fcf9f8',
    width: '100%',
    overflow: 'hidden',
  },
  headerContainer: {
    width: '100%',
    position: 'relative',
    backgroundColor: '#f0eded',
  },
  headerImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  headerPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeOverlay: {
    position: 'absolute',
    left: 16,
    bottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sourceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 0,
    borderWidth: 1,
    borderColor: '#1c1b1b',
    backgroundColor: '#fcf9f8',
    gap: 6,
  },
  sourceText: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'SpaceMono',
  },
  dateText: {
    color: '#1c1b1b',
    fontSize: 11,
    fontWeight: '500',
    fontFamily: 'SpaceMono',
  },
  floatingActions: {
    position: 'absolute',
    right: 16,
    bottom: 12,
    flexDirection: 'row',
    gap: 8,
  },
  floatingBtn: {
    width: 36,
    height: 36,
    borderRadius: 0,
    backgroundColor: '#fcf9f8',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#1c1b1b',
  },
  bodyContainer: {
    padding: 20,
    backgroundColor: '#fcf9f8',
    borderRadius: 0,
    marginTop: 0,
    borderWidth: 1,
    borderColor: '#1c1b1b',
    zIndex: 2,
    flexDirection: 'column',
  },
  title: {
    color: '#1c1b1b',
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 24,
    marginBottom: 10,
    fontFamily: 'SpaceMono',
  },
  divider: {
    height: 1,
    backgroundColor: '#1c1b1b',
    marginBottom: 14,
  },
  scrollArea: {
    flex: 1,
    marginBottom: 14,
  },
  scrollContent: {
    paddingBottom: 10,
  },
  bodyText: {
    color: '#1c1b1b',
    fontSize: 14,
    lineHeight: 22,
    fontFamily: 'SpaceMono',
  },
  githubStatsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
    backgroundColor: '#f0eded',
    padding: 8,
    borderRadius: 0,
    borderWidth: 1,
    borderColor: '#1c1b1b',
  },
  gitStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  gitStatText: {
    color: '#1c1b1b',
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'SpaceMono',
  },
  summaryArea: {
    gap: 12,
  },
  summaryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  summaryTitle: {
    color: '#bc000a',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    fontFamily: 'SpaceMono',
  },
  bulletsContainer: {
    gap: 10,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  bulletIcon: {
    marginTop: 4,
  },
  summaryText: {
    color: '#1c1b1b',
    fontSize: 14,
    lineHeight: 21,
    flex: 1,
    fontFamily: 'SpaceMono',
  },
  loaderContainer: {
    paddingVertical: 30,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loaderText: {
    color: '#1c1b1b',
    fontSize: 12,
    fontFamily: 'SpaceMono',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 44,
    borderRadius: 0,
    borderWidth: 1,
    width: '100%',
    alignSelf: 'center',
  },
  actionActive: {
    backgroundColor: '#bc000a',
    borderColor: '#bc000a',
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'SpaceMono',
  },
  footerContainer: {
    backgroundColor: '#f0eded',
    borderTopWidth: 1,
    borderTopColor: '#1c1b1b',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  footerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  footerText: {
    color: '#1c1b1b',
    fontSize: 12,
    fontWeight: '500',
    fontFamily: 'SpaceMono',
  },
  footerDomain: {
    color: '#bc000a',
    fontWeight: '700',
    fontFamily: 'SpaceMono',
  },
  viewedBadge: {
    backgroundColor: '#926f6a',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: '#1c1b1b',
    borderRadius: 0,
  },
  viewedText: {
    fontFamily: 'SpaceMono',
    fontSize: 9,
    fontWeight: '700',
    color: '#ffffff',
  },
  titleViewed: {
    color: '#926f6a',
  },
  redditStatsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
    backgroundColor: '#fcf0ef',
    padding: 8,
    borderRadius: 0,
    borderWidth: 1,
    borderColor: '#aa352b',
  },
  redditStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  redditStatText: {
    color: '#aa352b',
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'SpaceMono',
  },
  commentsContainer: {
    marginTop: 18,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#1c1b1b',
  },
  commentsHeader: {
    fontSize: 12,
    fontWeight: '800',
    color: '#aa352b',
    fontFamily: 'SpaceMono',
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  commentItem: {
    backgroundColor: '#f0eded',
    borderWidth: 1,
    borderColor: '#1c1b1b',
    padding: 10,
    marginBottom: 8,
  },
  commentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 6,
  },
  commentAuthor: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'SpaceMono',
    color: '#aa352b',
  },
  commentScore: {
    fontSize: 10,
    fontFamily: 'SpaceMono',
    color: '#555555',
  },
  commentBody: {
    fontSize: 12,
    lineHeight: 18,
    fontFamily: 'SpaceMono',
    color: '#1c1b1b',
  },
});
